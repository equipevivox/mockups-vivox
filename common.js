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
  // Landing pages abrem na revisão ao vivo (/lp/SLUG); os demais tipos no visualizador (/m/SLUG).
  function viewerUrl(slug, comentar=false, type){
    const local=["localhost","127.0.0.1","[::1]"].includes(window.location.hostname);
    const encoded=encodeURIComponent(slug);
    const landing=type==="landing";
    const base=local ? (landing?"/lp.html?m=":"/viewer.html?m=")+encoded : (landing?"/lp/":"/m/")+encoded;
    return base+(comentar?(local?"&":"?")+"comment=1":"");
  }
  const esc = (s)=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  const TYPE_LABEL = { revista:"Revista", mockup:"Mockup", folder:"Folder", apresentacao:"Apresentação", landing:"Landing Page" };
  const normType = (t)=> (t==="mockup"||t==="folder"||t==="apresentacao"||t==="landing") ? t : "revista";

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

  // ---- landing pages: endereço e páginas ficam em {slug}/landing.json no Storage ----
  function normalizeLandingUrl(value){
    let raw=String(value||"").trim();
    if(raw && !/^https?:\/\//i.test(raw)) raw="https://"+raw;
    let u; try{ u=new URL(raw); }catch(e){ throw new Error("Informe o endereço completo da landing page, ex.: https://site.com.br/"); }
    if(!["http:","https:"].includes(u.protocol) || !u.hostname.includes(".")) throw new Error("Use um endereço público começando com https://");
    return u.origin+"/";
  }
  function normalizeLandingPages(list){
    const seen=new Set(), out=[];
    (Array.isArray(list)?list:[]).forEach(p=>{
      let path=String(p&&p.path||"").trim();
      if(!path) return;
      try{ const u=new URL(path,"https://x.invalid"); path=u.pathname||"/"; }catch(e){ return; }
      if(!path.startsWith("/")) path="/"+path;
      if(seen.has(path)) return; seen.add(path);
      const title=String(p.title||"").trim().replace(/\s+/g," ").slice(0,80);
      out.push({ path, title: title || (path==="/"?"Home":path) });
    });
    return out.slice(0,40);
  }
  async function landingConfig(slug){
    const r=await fetch(publicUrl(`${slug}/landing.json`)+"?t="+Date.now(),{ cache:"no-store" });
    if(!r.ok) return null;
    const data=await r.json().catch(()=>null);
    if(!data) return null;
    try{ return { url:normalizeLandingUrl(data.url), pages:normalizeLandingPages(data.pages) }; }
    catch(e){ return null; }
  }
  async function saveLandingConfig(slug, cfg){
    const body=JSON.stringify({ url:normalizeLandingUrl(cfg.url), pages:normalizeLandingPages(cfg.pages), updated_at:new Date().toISOString() });
    const put=(type)=>sb.storage.from(BUCKET).upload(`${slug}/landing.json`, new Blob([body],{type}),
      { contentType:type, upsert:true, cacheControl:"60" });
    let { error } = await put("application/json");
    // O bucket aceita só imagens: o JSON vai rotulado como image/png (o conteúdo continua sendo
    // texto JSON e é lido com fetch().json()). Liberar application/json no bucket dispensa isso.
    if(error && /mime type/i.test(String(error.message||""))) ({ error } = await put("image/png"));
    if(error) throw error;
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
    if(c.w!=null || c.h!=null) throw first.error; // Nunca descartar silenciosamente a marcação de uma área.
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
  // remove do Storage fotos já enviadas (ex.: quando a gravação do comentário falha)
  async function removePhotos(urls){
    const paths = (Array.isArray(urls)?urls:[]).map(u=>String(u).split("/public/"+BUCKET+"/")[1]).filter(Boolean);
    if(paths.length){ try{ await sb.storage.from(BUCKET).remove(paths); }catch(e){} }
  }
  async function deleteComment(c){
    // as respostas são apagadas em cascata pelo banco; suas fotos precisam sair do Storage antes
    let replyPhotos=[];
    try{ const { data } = await sb.from("comments").select("photos").eq("parent_id",c.id);
      replyPhotos=(data||[]).flatMap(r=>Array.isArray(r.photos)?r.photos:[]); }catch(e){}
    await removePhotos([...(Array.isArray(c.photos)?c.photos:[]), ...replyPhotos]);
    const { error } = await sb.from("comments").delete().eq("id",c.id);
    if(error) throw error;
  }
  async function uploadPhoto(slug, file){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const rnd=(crypto.randomUUID&&crypto.randomUUID())||(Date.now()+"-"+Math.random().toString(16).slice(2));
    const path=`${slug}/photos/${rnd}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType:file.type||"image/jpeg" });
    if(error) throw error;
    return publicUrl(path);
  }

  return { cfg, BUCKET, sb, $, publicUrl, pageUrl, viewerUrl, esc, toast, fmtDate, nextFrame, preloadImages,
           makeSlug, TYPE_LABEL, normType, listMockups, listPublicMockups, notifyMaterialsChanged, getMockup, normalizeMaterialName, renameMockup,
           listComments, addComment, addReply, setResolved, deleteComment, uploadPhoto, removePhotos,
           normalizeLandingUrl, normalizeLandingPages, landingConfig, saveLandingConfig };
})();
