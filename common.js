/* VIVOX · utilidades compartilhadas (portfólio, viewer e admin) */
window.VX = (function(){
  "use strict";
  const cfg = window.VIVOX_CFG;
  const BUCKET = cfg.BUCKET;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  const $ = (id)=>document.getElementById(id);
  const publicUrl = (path)=>`${cfg.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const pageUrl = (slug,i)=>publicUrl(`${slug}/pages/${i}.jpg`);
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
  async function getMockup(id){
    const { data, error } = await sb.from("mockups").select("*").eq("id",id).maybeSingle();
    if(error) throw error;
    return data ? { ...data, type:normType(data.type) } : null;
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
    const photos = Array.isArray(c.photos)?c.photos:[];
    const paths = photos.map(u=>{ const p=u.split("/public/"+BUCKET+"/")[1]; return p; }).filter(Boolean);
    if(paths.length){ try{ await sb.storage.from(BUCKET).remove(paths); }catch(e){} }
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

  return { cfg, BUCKET, sb, $, publicUrl, pageUrl, esc, toast, fmtDate, nextFrame, preloadImages,
           makeSlug, TYPE_LABEL, normType, listMockups, getMockup,
           listComments, addComment, addReply, setResolved, deleteComment, uploadPhoto };
})();
