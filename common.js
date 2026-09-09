/* VIVOX · utilidades compartilhadas (portfólio, viewer e admin) */
window.VX = (function(){
  "use strict";
  const cfg = window.VIVOX_CFG;
  const BUCKET = cfg.BUCKET;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  const $ = (id)=>document.getElementById(id);
  const publicUrl = (path)=>`${cfg.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const pageUrl = (slug,i,version)=>publicUrl(`${slug}/pages/${i}.jpg`)
    +(version ? "?cacheNonce="+encodeURIComponent(version) : "");
  function materialPageUrl(material, index, fallbackVersion){
    const prefix=material.r2_prefix;
    if(prefix && /^materials\/[A-Z0-9_]+\/[a-f0-9-]{36}$/.test(prefix) && prefix.split("/")[1]===material.id){
      return cfg.R2_PUBLIC_URL+"/"+prefix+"/pages/"+index+".jpg";
    }
    return pageUrl(encodeURIComponent(material.id),index,material.cover_version||fallbackVersion);
  }
  async function storageRequest(action, data={}){
    const response=await fetch("/api/storage",{method:"POST",credentials:"same-origin",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,action})});
    let result;
    try{ result=await response.json(); }catch(e){ throw new Error("Não foi possível acessar o serviço de arquivos. Tente novamente."); }
    if(!response.ok) throw new Error(result.error||"Não foi possível acessar os arquivos.");
    return result;
  }
  async function putFile(url, file){
    // A URL vale por dez minutos e autoriza somente este arquivo, tipo e tamanho.
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await fetch(url,{method:"PUT",headers:{"Content-Type":file.type,
          "Cache-Control":"public, max-age=31536000, immutable"},body:file,signal:AbortSignal.timeout(120000)});
        if(response.ok) return;
        if(response.status<500) throw new Error("O envio não foi autorizado. Entre novamente e tente enviar o arquivo.");
      }catch(error){ if(attempt===2) throw new Error("Não foi possível enviar a imagem. Confira a conexão e tente novamente."); }
      await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
    }
    throw new Error("Não foi possível enviar a imagem. Tente novamente.");
  }
  const esc = (s)=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  const TYPE_LABEL = { revista:"Revista", mockup:"Mockup", folder:"Folder" };
  const normType = (t)=> (t==="mockup"||t==="folder") ? t : "revista";

  // slug do nome do arquivo: MAIÚSCULAS, sem acento, espaços -> "_"
  function makeSlug(name){
    let s = String(name||"").replace(/\.pdf$/i,"");
    s = s.normalize("NFD").replace(/[̀-ͯ]/g,"");
    s = s.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");
    return s || "MATERIAL";
  }

  // toast simples (precisa de um #toast no documento)
  function toast(msg, err){
    const el=$("toast"); if(!el){ console.log(msg); return; }
    el.textContent=msg; el.classList.toggle("err",!!err); el.classList.add("show");
    clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("show"), 5000);
  }

  function fmtDate(iso){
    try{ return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
    catch(e){ return "—"; }
  }

  // resolve no próximo frame, com fallback (rAF não dispara em aba não renderizada)
  function nextFrame(){
    return new Promise(r=>{ let done=false; const fin=()=>{ if(!done){done=true;r();} };
      requestAnimationFrame(()=>requestAnimationFrame(fin)); setTimeout(fin,60); });
  }

  // pré-carrega imagens (turn.js precisa das páginas já carregadas)
  function preloadImages(list){
    return Promise.all((list||[]).map(src=>new Promise(res=>{
      const im=new Image(); im.onload=im.onerror=res; im.src=src; setTimeout(res,8000);
    })));
  }

  // ---- materiais ----
  async function listMockups(){
    const { data, error } = await sb.from("mockups").select("*").order("created_at",{ascending:false});
    if(error) throw error;
    return (data||[]).map(m=>({ ...m, type:normType(m.type) }));
  }
  async function listPublicMockups(){
    const { data, error } = await sb.from("mockups").select("*")
      .eq("is_public",true).order("created_at",{ascending:false});
    if(error) throw error;
    return (data||[]).map(m=>({ ...m, type:normType(m.type) }));
  }
  function notifyMaterialsChanged(id){
    // A outra aba atualiza após publicação, exclusão, envio ou mudança de nome.
    try{ localStorage.setItem("vivox_materials_changed",JSON.stringify({id,version:Date.now()})); }
    catch(e){ /* O portfólio também se atualiza por consulta periódica. */ }
  }
  async function getMockup(id){
    const { data, error } = await sb.from("mockups").select("*").eq("id",id).maybeSingle();
    if(error) throw error;
    return data ? { ...data, type:normType(data.type) } : null;
  }
  function normalizeMaterialName(value){
    const name=String(value||"").trim().replace(/\.pdf$/i,"").replace(/\s+/g," ").trim();
    if(!name) throw new Error("Digite um nome para o material.");
    if(name.length>120) throw new Error("Use até 120 caracteres no nome.");
    return name;
  }
  async function renameMockup(id, value){
    const name=normalizeMaterialName(value);
    // Retorna a linha para confirmar a gravação, sem alterar slug, páginas ou links.
    const { data, error } = await sb.from("mockups").update({name}).eq("id",id).select("id,name").single();
    if(error) throw error;
    if(!data || data.id!==id) throw new Error("O material não foi encontrado. Atualize a lista e tente novamente.");
    return data;
  }

  // ---- comentários ----
  async function listComments(mockupId){
    const { data, error } = await sb.from("comments").select("*").eq("mockup_id",mockupId)
      .order("created_at",{ascending:true});
    if(error) throw error;
    return data||[];
  }
  // grava com posição (x,y). Se as colunas ainda não existirem no banco,
  // regrava sem posição para não perder o comentário.
  async function addComment(c){
    const first = await sb.from("comments").insert(c);
    if(!first.error) return { positioned:true };
    const { x, y, ...rest } = c;
    const second = await sb.from("comments").insert(rest);
    if(second.error) throw first.error;
    return { positioned:false };
  }
  // resposta dentro de uma thread (sem posição própria)
  async function addReply(parentId, c){
    const { error } = await sb.from("comments").insert({ ...c, parent_id:parentId });
    if(error) throw error;
  }
  // marca a thread como entregue/resolvida
  async function setResolved(id, val){
    const { error } = await sb.from("comments").update({ resolved: !!val }).eq("id", id);
    if(error) throw error;
  }
  async function deleteComment(c){
    await storageRequest("comment-delete",{slug:c.mockup_id,id:c.id});
  }
  async function uploadPhoto(slug, file){
    const signed=await storageRequest("photo-sign",{slug,size:file.size,type:file.type});
    await putFile(signed.uploadUrl,file);
    return signed.url;
  }

  return { cfg, BUCKET, sb, $, publicUrl, pageUrl, materialPageUrl, storageRequest, putFile, esc, toast, fmtDate, nextFrame, preloadImages,
           makeSlug, TYPE_LABEL, normType, listMockups, listPublicMockups, notifyMaterialsChanged, getMockup, normalizeMaterialName, renameMockup,
           listComments, addComment, addReply, setResolved, deleteComment, uploadPhoto };
})();
