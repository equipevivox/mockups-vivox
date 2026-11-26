/* VIVOX · Revisão de landing page (/lp/SLUG) — site ao vivo pelo proxy /api/lp e comentários
 *
 * Coordenadas dos comentários (sem migração no banco):
 *   page_index = índice da página × 2 + dispositivo (0 = computador, 1 = celular)
 *   x = posição relativa à largura do site (0..1)
 *   y = posição em px no documento, na largura do dispositivo
 *   w = largura relativa; h = altura em px ÷ 10000 (o banco limita h a 0..1)
 */
(function(){
  "use strict";
  const VX = window.VX, $ = VX.$;
  const DEVICES = { desktop:{ w:1440, h:900, label:"Computador" }, mobile:{ w:390, h:844, label:"Celular" } };
  const H_SCALE = 10000;
  const DEV_ICON = {
    desktop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    mobile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>'
  };

  const viewer=$("viewer"), frame=$("lpFrame"), canvas=$("lpCanvas"), deviceEl=$("lpDevice"), stage=$("lpStage");
  const docEl=$("lpDoc"), pinsEl=$("lpPins"), catchEl=$("lpCatch"), overviewEl=$("lpOverview"), pagesEl=$("lpPages");
  const bubble=$("bubble"), drawer=$("cmtDrawer"), drawerBody=$("cmtDrawerBody"), drawerBg=$("drawerBackdrop");
  const loader=$("loader"), progressBar=$("progressBar");

  const state = { id:null, name:"", pages:[], pageIdx:0, extraPath:null, device:"desktop", scale:1, vh:900,
    lp:{ scrollY:0, docH:0 }, ready:false, waiters:[], comments:[], commentMode:false, overview:false,
    showDone:false, drawerFilter:"abertos", hideMarks: localStorage.getItem("vivox_hide_marks")==="1" };

  const pageKey = (idx,dev)=>idx*2+(dev==="mobile"?1:0);
  const fromKey = (k)=>({ idx:Math.floor((k||0)/2), device:(k||0)%2 ? "mobile" : "desktop" });
  const normPath = (p)=>{ const s=String(p||"/").split(/[?#]/)[0]; return s.length>1 ? s.replace(/\/+$/,"") : "/"; };
  const proxyUrl = (path)=>"/api/lp?m="+encodeURIComponent(state.id)+"&p="+encodeURIComponent(path||"/");
  const post = (msg)=>{ try{ frame.contentWindow.postMessage(Object.assign({ vx:"grid" },msg),"*"); }catch(e){} };
  const currentPath = ()=> state.pageIdx>=0 ? (state.pages[state.pageIdx]||{}).path : state.extraPath;

  function getSlug(){
    const m=location.pathname.match(/^\/lp\/([^\/]+)\/?$/);
    if(m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get("m");
  }

  // ---- identidade: o mesmo nome salvo do visualizador de PDFs ----
  const savedAuthor = ()=> (localStorage.getItem("vivox_author")||"").trim();
  function identityHtml(){
    const who=savedAuthor();
    return who
      ? `<div class="b-ident">Comentando como <b>${VX.esc(who)}</b>
           <button type="button" class="b-changeid">trocar</button>
           <input class="b-author" type="hidden" value="${VX.esc(who)}"></div>`
      : `<input class="b-author" type="text" placeholder="Seu nome (obrigatório)" autocomplete="name">`;
  }
  function wireIdentity(box){
    const btn=box.querySelector(".b-changeid"); if(!btn) return;
    btn.addEventListener("click",()=>{
      localStorage.removeItem("vivox_author");
      box.querySelector(".b-ident").outerHTML='<input class="b-author" type="text" placeholder="Seu nome (obrigatório)" autocomplete="name">';
      const inp=box.querySelector(".b-author"); if(inp) inp.focus();
    });
  }
  function requireAuthor(box){
    const inp=box.querySelector(".b-author"), who=(inp&&inp.value||"").trim();
    if(!who){ VX.toast("Informe seu nome para comentar."); if(inp&&inp.type!=="hidden") inp.focus(); return null; }
    localStorage.setItem("vivox_author",who); return who;
  }

  // ================= carregar =================
  (async function init(){
    const slug=getSlug();
    if(!slug){ fail("Material não informado."); return; }
    try{
      const mk=await VX.getMockup(slug);
      if(!mk){ fail("Este material não existe."); return; }
      if(mk.type!=="landing"){ location.replace(VX.viewerUrl(slug)); return; }
      state.id=slug; state.name=(mk.name||slug).replace(/\.pdf$/i,"");
      $("docName").textContent=state.name; document.title="VIVOX · "+state.name;
      progressBar.style.width="40%";
      const cfg=await VX.landingConfig(slug);
      if(!cfg){ fail("Configuração da landing page não encontrada."); return; }
      state.pages = cfg.pages.length ? cfg.pages : [{ path:"/", title:"Home" }];
      const q=new URLSearchParams(location.search);
      const p=parseInt(q.get("p"),10);
      state.pageIdx = Number.isInteger(p) && p>=0 && p<state.pages.length ? p : 0;
      setDevice(q.get("d")==="mobile" ? "mobile" : "desktop", false);
      renderPages();
      loadPage(state.pageIdx);
      await loadComments();
      if(q.get("comment")==="1") waitReady().then(()=>setCommentMode(true));
    }catch(err){ console.error(err); fail(err.message||String(err)); }
  })();

  function fail(msg){
    loader.classList.remove("show");
    VX.toast("Não foi possível abrir — "+msg, true);
    $("docName").textContent="Material indisponível";
  }

  // ================= dispositivo e escala =================
  function layout(){
    const d=DEVICES[state.device];
    const sw=Math.max(200, stage.clientWidth-32), sh=Math.max(240, stage.clientHeight-24);
    let scale, vh;
    if(state.device==="mobile"){ vh=d.h; scale=Math.min(1, sw/d.w, (sh-20)/d.h); }
    else { scale=Math.min(1, sw/d.w); vh=Math.max(480, Math.min(1200, Math.floor(sh/scale))); } // altura de monitor real
    state.scale=scale; state.vh=vh;
    canvas.style.width=d.w+"px"; canvas.style.height=vh+"px"; canvas.style.transform=`scale(${scale})`;
    deviceEl.style.width=Math.round(d.w*scale)+"px"; deviceEl.style.height=Math.round(vh*scale)+"px";
    viewer.style.setProperty("--lp-inv", String(1/scale));
    if(!bubble.hidden && state.commentMode===false) closeBubble();
  }
  function setDevice(dev, rerender=true){
    state.device = dev==="mobile" ? "mobile" : "desktop";
    viewer.dataset.device=state.device;
    document.querySelectorAll(".lp-seg-btn").forEach(b=>{
      const on=b.dataset.device===state.device; b.classList.toggle("is-on",on); b.setAttribute("aria-pressed",String(on));
    });
    layout(); syncUrl();
    if(rerender){ closeBubble(); renderPins(); renderPages(); if(state.overview) buildOverview(); }
  }
  document.querySelectorAll(".lp-seg-btn").forEach(b=>b.addEventListener("click",()=>setDevice(b.dataset.device)));
  let rt; window.addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(()=>{ layout(); if(state.overview) sizeThumbs(); },120); });

  function syncUrl(){
    if(!state.id) return;
    const q=new URLSearchParams(location.search);
    q.set("p",String(Math.max(0,state.pageIdx))); q.set("d",state.device); q.delete("comment");
    try{ history.replaceState(null,"",location.pathname+"?"+q.toString()); }catch(e){}
  }

  // ================= páginas =================
  function openCount(idx){
    return threads().filter(t=>!isDone(t) && fromKey(t.root.page_index).idx===idx).length;
  }
  function renderPages(){
    pagesEl.innerHTML='<div class="lp-pages-title">Páginas</div>';
    state.pages.forEach((p,i)=>{
      const b=document.createElement("button"); b.type="button";
      b.className="lp-page"+(i===state.pageIdx?" is-on":""); b.setAttribute("aria-current",i===state.pageIdx?"page":"false");
      const n=openCount(i);
      b.innerHTML=`<span class="lp-page-dot"></span><span class="lp-page-name">${VX.esc(p.title||p.path)}<span class="lp-page-path">${VX.esc(p.path)}</span></span><span class="lp-page-n">${n||""}</span>`;
      b.addEventListener("click",()=>{ if(state.overview) setOverview(false); loadPage(i); });
      pagesEl.appendChild(b);
    });
    if(state.pageIdx<0 && state.extraPath){
      const b=document.createElement("button"); b.type="button"; b.className="lp-page is-on"; b.disabled=true;
      b.innerHTML=`<span class="lp-page-dot"></span><span class="lp-page-name">Fora da lista<span class="lp-page-path">${VX.esc(state.extraPath)}</span></span>`;
      pagesEl.appendChild(b);
    }
  }

  let readyTimer=0, firstLoad=true;
  function loadPage(idx, opts={}){
    closeBubble();
    if(idx>=0){ state.pageIdx=idx; state.extraPath=null; }
    else { state.pageIdx=-1; state.extraPath=opts.path||"/"; if(state.commentMode) setCommentMode(false); }
    state.ready=false; state.lp={ scrollY:0, docH:0 }; state.pendingHash=opts.hash||"";
    applyScroll(); renderPins(); renderPages(); syncUrl();
    frame.src=proxyUrl(currentPath());
    clearTimeout(readyTimer);
    readyTimer=setTimeout(()=>{ if(!state.ready) markReady(false); },15000);
  }
  frame.addEventListener("load",()=>{
    // Página sem o script de revisão (erro do proxy, por exemplo): não prende o carregamento.
    setTimeout(()=>{ if(!state.ready) markReady(false); },3000);
  });
  function markReady(withScript){
    state.ready=true;
    if(firstLoad){ firstLoad=false; progressBar.style.width="100%"; loader.classList.remove("show"); }
    if(!withScript) VX.toast("A página abriu sem o script de revisão; os comentários podem não acompanhar a rolagem.", true);
    state.waiters.splice(0).forEach(fn=>fn());
  }
  function waitReady(){
    return state.ready ? Promise.resolve() : new Promise(res=>state.waiters.push(res));
  }

  // mensagens do script de revisão (somente do iframe principal)
  window.addEventListener("message",(e)=>{
    if(e.source!==frame.contentWindow) return;
    const m=e.data; if(!m || m.vx!=="lp") return;
    if(m.type==="state"){
      state.lp.scrollY=Math.max(0,+m.scrollY||0); state.lp.docH=Math.max(0,+m.docH||0);
      applyScroll();
      if(!state.ready){
        markReady(true);
        if(state.pendingHash){ post({ type:"hash", hash:state.pendingHash }); state.pendingHash=""; }
      }
    }else if(m.type==="hello"){
      post({ type:"ping" });
    }else if(m.type==="navigate"){
      const target=normPath(m.path);
      const i=state.pages.findIndex(p=>normPath(p.path)===target);
      if(i>=0) loadPage(i,{ hash:m.hash });
      else { loadPage(-1,{ path:m.path, hash:m.hash }); VX.toast("Esta página não está na lista da landing page; os comentários ficam desativados nela."); }
    }
  });
  function applyScroll(){
    docEl.style.height=Math.max(state.lp.docH, state.vh)+"px";
    docEl.style.transform=`translateY(${-state.lp.scrollY}px)`;
  }

  // ================= visão geral (quadros lado a lado) =================
  function setOverview(on){
    state.overview=on;
    viewer.classList.toggle("is-overview",on);
    overviewEl.hidden=!on;
    $("overviewBtn").classList.toggle("is-on",on); $("overviewBtn").setAttribute("aria-pressed",String(on));
    if(on){ if(state.commentMode) setCommentMode(false); closeBubble(); buildOverview(); }
    else overviewEl.innerHTML="";
  }
  $("overviewBtn").addEventListener("click",()=>setOverview(!state.overview));
  function buildOverview(){
    const d=DEVICES[state.device];
    overviewEl.classList.toggle("is-mobile",state.device==="mobile");
    overviewEl.innerHTML="";
    state.pages.forEach((p,i)=>{
      const card=document.createElement("button"); card.type="button"; card.className="lp-frame-card";
      card.innerHTML=`<span class="lp-frame-head"><span class="lp-page-dot"></span>${VX.esc(p.title||p.path)}<span class="lp-page-n">${openCount(i)||""}</span></span><span class="lp-thumb"></span>`;
      const ifr=document.createElement("iframe");
      ifr.src=proxyUrl(p.path); ifr.loading="lazy"; ifr.tabIndex=-1; ifr.title="Miniatura: "+(p.title||p.path);
      ifr.setAttribute("sandbox","allow-scripts"); ifr.setAttribute("aria-hidden","true");
      ifr.style.width=d.w+"px";
      card.querySelector(".lp-thumb").appendChild(ifr);
      card.addEventListener("click",()=>{ setOverview(false); if(i!==state.pageIdx) loadPage(i); });
      overviewEl.appendChild(card);
    });
    sizeThumbs();
  }
  function sizeThumbs(){
    const d=DEVICES[state.device];
    overviewEl.querySelectorAll(".lp-thumb").forEach(t=>{
      const ifr=t.querySelector("iframe"), s=t.clientWidth/d.w;
      ifr.style.height=Math.ceil(t.clientHeight/s)+"px"; ifr.style.transform=`scale(${s})`;
    });
  }

  // ================= comentários =================
  function threads(){
    const byParent={};
    state.comments.forEach(c=>{ if(c.parent_id) (byParent[c.parent_id]=byParent[c.parent_id]||[]).push(c); });
    return state.comments.filter(c=>!c.parent_id).map(r=>({ root:r, replies:byParent[r.id]||[] }));
  }
  const isDone=(t)=>t.root.resolved===true;
  const initial=(name)=>(String(name||"A").trim()[0]||"A").toUpperCase();
  const whereLabel=(c)=>{
    const k=fromKey(c.page_index), p=state.pages[k.idx];
    return `<span class="lp-dev" title="${DEVICES[k.device].label}">${DEV_ICON[k.device]}</span>${VX.esc(p ? (p.title||p.path) : "Página "+(k.idx+1))}`;
  };

  async function loadComments(){
    try{ state.comments=await VX.listComments(state.id); }
    catch(err){ console.warn("comentários:",err); state.comments=[]; }
    const open=threads().filter(t=>!isDone(t)).length;
    const badge=$("cmtCount"); badge.textContent=open; badge.hidden=open===0;
    renderPins(); renderDrawer(); renderPages();
  }

  let activeThread=null;
  function highlightArea(id){
    document.querySelectorAll(".comment-region").forEach(el=>el.classList.toggle("is-active",el.dataset.tid===id));
  }
  function renderPins(){
    pinsEl.innerHTML="";
    if(state.pageIdx<0) return;
    const key=pageKey(state.pageIdx,state.device);
    threads().forEach(t=>{
      const c=t.root;
      if(c.page_index!==key || c.x==null || c.y==null) return;
      if(isDone(t) && !state.showDone) return;
      const pin=pinEl(t); pin.style.left=(c.x*100)+"%"; pin.style.top=c.y+"px";
      if(c.w>0 && c.h>0){
        const region=document.createElement("div"); region.className="comment-region"; region.dataset.tid=c.id;
        const rect=document.createElement("div"); rect.className="comment-area";
        Object.assign(rect.style,{ left:c.x*100+"%", top:c.y+"px", width:c.w*100+"%", height:(c.h*H_SCALE)+"px" });
        region.append(rect,pin); pinsEl.appendChild(region);
        pin.addEventListener("mouseenter",()=>region.classList.add("is-hover"));
        pin.addEventListener("mouseleave",()=>region.classList.remove("is-hover"));
        pin.addEventListener("focus",()=>region.classList.add("is-hover"));
        pin.addEventListener("blur",()=>region.classList.remove("is-hover"));
        region.classList.toggle("is-active",activeThread===c.id);
      }else pinsEl.appendChild(pin);
    });
  }
  function pinEl(t){
    const c=t.root, b=document.createElement("button");
    b.className="pin"+(isDone(t)?" pin--done":""); b.type="button"; b.dataset.tid=c.id;
    b.title=(c.author||"Anônimo")+": "+String(c.body||"").slice(0,90);
    const ini=document.createElement("span"); ini.className="pin-ini"; ini.textContent=initial(c.author); b.appendChild(ini);
    if(t.replies.length){ const n=document.createElement("i"); n.className="pin-n"; n.textContent=t.replies.length+1; b.appendChild(n); }
    b.addEventListener("mousedown",e=>e.stopPropagation());
    b.addEventListener("click",(e)=>{ e.stopPropagation(); e.preventDefault(); openThread(t,b); });
    return b;
  }

  // ---- modo comentário: uma camada por cima do site captura clique/arraste ----
  function setCommentMode(on){
    if(on && state.pageIdx<0){ VX.toast("Comentários só nas páginas da lista da landing page."); return; }
    if(on && state.overview) setOverview(false);
    if(on && state.hideMarks) setHideMarks(false);
    state.commentMode=on;
    document.body.classList.toggle("cmt-mode",on);
    $("cmtTool").classList.toggle("is-on",on);
    $("cmtHint").hidden=!on; catchEl.hidden=!on;
    if(!on) closeBubble();
  }
  $("cmtTool").addEventListener("click",()=>setCommentMode(!state.commentMode));

  function setHideMarks(on){
    state.hideMarks=on;
    document.body.classList.toggle("marks-off",on);
    $("hideBtn").classList.toggle("is-on",on);
    $("hideBtn").title = on ? "Mostrar comentários" : "Ocultar comentários";
    $("hideLbl").textContent = on ? "Mostrar" : "Ocultar";
    localStorage.setItem("vivox_hide_marks", on?"1":"0");
    if(on && state.commentMode) setCommentMode(false);
  }
  $("hideBtn").addEventListener("click",()=>setHideMarks(!state.hideMarks));
  setHideMarks(state.hideMarks);

  document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape"){ if(state.commentMode) setCommentMode(false); closeBubble(); closeDrawer(); if(state.overview) setOverview(false); return; }
    if(e.target.closest && e.target.closest("textarea,input,select,[contenteditable]")) return;
    if(e.key==="c"||e.key==="C") setCommentMode(!state.commentMode);
  });

  // a roda do mouse sobre a camada continua rolando o site
  catchEl.addEventListener("wheel",(e)=>{
    e.preventDefault();
    const unit = e.deltaMode===1 ? 40 : e.deltaMode===2 ? state.vh : 1;
    post({ type:"scrollBy", dy:(e.deltaY*unit)/state.scale });
  },{ passive:false });

  (function wireAreaSelection(){
    let drag=null;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const point=(e)=>{
      const r=catchEl.getBoundingClientRect();
      return { x:clamp((e.clientX-r.left)/r.width), y:Math.max(0, state.lp.scrollY + (e.clientY-r.top)/state.scale) };
    };
    const clear=()=>{ if(drag){ drag.rect.remove(); drag=null; } };
    catchEl.addEventListener("pointerdown",(e)=>{
      if(!state.commentMode || e.button!==0 || !e.isPrimary) return;
      e.preventDefault(); closeBubble();
      const rect=document.createElement("div"); rect.className="comment-area area-draft"; pinsEl.appendChild(rect);
      drag={ id:e.pointerId, start:point(e), cx:e.clientX, cy:e.clientY, rect };
      catchEl.setPointerCapture(e.pointerId);
    });
    catchEl.addEventListener("pointermove",(e)=>{
      if(!drag || drag.id!==e.pointerId) return;
      e.preventDefault();
      const p=point(e), a=drag.start;
      Object.assign(drag.rect.style,{ left:Math.min(a.x,p.x)*100+"%", top:Math.min(a.y,p.y)+"px",
        width:Math.abs(a.x-p.x)*100+"%", height:Math.abs(a.y-p.y)+"px" });
    });
    catchEl.addEventListener("pointerup",(e)=>{
      if(!drag || drag.id!==e.pointerId) return;
      e.preventDefault();
      const d=drag, p=point(e); drag=null;
      const w=Math.abs(p.x-d.start.x), hPx=Math.min(H_SCALE, Math.abs(p.y-d.start.y));
      const isArea=Math.hypot(e.clientX-d.cx,e.clientY-d.cy)>=6 && w>0 && hPx>0;
      if(!isArea) d.rect.remove();
      const x=isArea?Math.min(p.x,d.start.x):d.start.x, y=isArea?Math.min(p.y,d.start.y):d.start.y;
      const r=catchEl.getBoundingClientRect();
      openComposer(x, y, r.left+x*r.width, r.top+(y-state.lp.scrollY)*state.scale, isArea?{ w, h:hPx/H_SCALE }:null);
    });
    catchEl.addEventListener("pointercancel",clear);
    catchEl.addEventListener("lostpointercapture",()=>{ if(drag) clear(); });
  })();

  // Evita que um arquivo solto fora do compositor navegue para outra página.
  document.addEventListener("dragover",e=>{ if(!bubble.hidden && Array.from(e.dataTransfer?.types||[]).includes("Files")) e.preventDefault(); });
  document.addEventListener("drop",e=>{ if(!bubble.hidden && !bubble.contains(e.target) && Array.from(e.dataTransfer?.types||[]).includes("Files")){ e.preventDefault(); VX.toast("Solte as imagens dentro do comentário para anexar."); } });

  function wireAttachments(box){
    const files=[];
    const fileIn=document.createElement("input"); fileIn.type="file"; fileIn.accept="image/*"; fileIn.multiple=true; fileIn.hidden=true; box.appendChild(fileIn);
    const hint=document.createElement("small"); hint.className="attachment-hint"; hint.textContent="Cole uma imagem (Ctrl+V) ou arraste arquivos aqui."; box.appendChild(hint);
    function addFiles(incoming){
      for(const file of incoming){
        if(!file.type.startsWith("image/")) continue;
        if(files.length>=5){ VX.toast("Máximo de 5 imagens por comentário."); break; }
        files.push(file);
        const th=document.createElement("div"); th.className="th";
        const img=document.createElement("img"), url=URL.createObjectURL(file); img.src=url; img.alt=file.name;
        img.onload=img.onerror=()=>URL.revokeObjectURL(url);
        const remove=document.createElement("button"); remove.type="button"; remove.textContent="×"; remove.setAttribute("aria-label","Remover imagem");
        remove.addEventListener("click",()=>{ files.splice(files.indexOf(file),1); th.remove(); });
        th.append(img,remove); box.querySelector(".b-thumbs").appendChild(th);
      }
      placeBubble((parseFloat(bubble.style.left)||12)-14,(parseFloat(bubble.style.top)||12)+10);
    }
    box.querySelector(".b-attach").addEventListener("click",()=>fileIn.click());
    fileIn.addEventListener("change",()=>{ addFiles(fileIn.files); fileIn.value=""; });
    box.addEventListener("paste",e=>{
      const images=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith("image/"));
      if(!images.length) return;
      e.preventDefault();
      const text=e.clipboardData.getData("text/plain");
      if(text && e.target.tagName==="TEXTAREA"){ e.target.setRangeText(text,e.target.selectionStart,e.target.selectionEnd,"end"); e.target.dispatchEvent(new Event("input",{bubbles:true})); }
      addFiles(images);
    });
    box.addEventListener("dragover",e=>{ e.preventDefault(); box.classList.add("is-dragover"); });
    box.addEventListener("dragleave",e=>{ if(!box.contains(e.relatedTarget)) box.classList.remove("is-dragover"); });
    box.addEventListener("drop",e=>{ e.preventDefault(); e.stopPropagation(); box.classList.remove("is-dragover"); addFiles(e.dataTransfer.files); });
    return { files };
  }

  // ---- balão ----
  function placeBubble(cx,cy){
    bubble.hidden=false;
    const w=bubble.offsetWidth||300, h=bubble.offsetHeight||220;
    let l=cx+14, t=cy-10;
    if(l+w>window.innerWidth-12) l=cx-w-14;
    if(t+h>window.innerHeight-12) t=window.innerHeight-h-12;
    bubble.style.left=Math.max(12,l)+"px"; bubble.style.top=Math.max(12,t)+"px";
  }
  function closeBubble(){ bubble.hidden=true; bubble.innerHTML=""; activeThread=null; highlightArea(null); document.querySelectorAll(".area-draft").forEach(el=>el.remove()); }
  document.addEventListener("mousedown",(e)=>{
    if(bubble.hidden) return;
    if(!bubble.contains(e.target) && !e.target.closest(".pin") && !e.target.closest("#lpCatch")) closeBubble();
  });

  function missingColumn(err,column){
    return ["PGRST204","42703"].includes(err?.code) && new RegExp("\\b"+column+"\\b","i").test(String(err.message||""));
  }
  // URLs externas e valores inesperados do banco nunca viram imagens ou links.
  function safePhotoUrl(value){
    if(typeof value!=="string") return null;
    try{
      const url=new URL(value), base=new URL(VX.publicUrl(""));
      if(!["http:","https:"].includes(url.protocol) || url.origin!==base.origin || !url.pathname.startsWith(base.pathname) || url.username || url.password) return null;
      return url.href;
    }catch(e){ return null; }
  }
  function photoHtml(photos){
    return (Array.isArray(photos)?photos:[]).map(safePhotoUrl).filter(Boolean).map(url=>`<img src="${VX.esc(url)}" alt="Imagem anexada" loading="lazy">`).join("");
  }

  function openComposer(x,y,cx,cy,area=null){
    const pageIndex=pageKey(state.pageIdx,state.device);
    bubble.innerHTML="";
    const box=document.createElement("div"); box.className="bubble-box";
    box.innerHTML=`
      <div class="bubble-head"><b>Novo comentário</b><button class="bubble-x" type="button">✕</button></div>
      ${identityHtml()}
      <textarea class="b-text" placeholder="Escreva a correção ou observação…"></textarea>
      <div class="b-thumbs"></div>
      <div class="b-row">
        <button type="button" class="attach-btn b-attach">Anexar imagens (até 5)</button>
        <button type="button" class="send-btn b-send">Enviar</button>
      </div>`;
    bubble.appendChild(box);
    wireIdentity(box); placeBubble(cx,cy);
    const attachments=wireAttachments(box);
    box.querySelector(".bubble-x").addEventListener("click",closeBubble);
    (box.querySelector(".b-author[type='text']")||box.querySelector(".b-text")).focus();
    box.querySelector(".b-send").addEventListener("click",async()=>{
      const body=box.querySelector(".b-text").value.trim();
      if(!body && !attachments.files.length){ VX.toast("Escreva algo ou anexe uma foto."); return; }
      const who=requireAuthor(box); if(!who) return;
      const btn=box.querySelector(".b-send"); btn.disabled=true; btn.textContent="Enviando…";
      const urls=[]; let saved=false;
      try{
        for(const f of attachments.files) urls.push(await VX.uploadPhoto(state.id,f));
        const res=await VX.addComment({ mockup_id:state.id, page_index:pageIndex, x, y:Math.round(y),
          author:who, body, photos:urls, ...(area?{ w:area.w, h:area.h }:{}) });
        saved=true;
        closeBubble(); setCommentMode(false);
        await loadComments();
        VX.toast(res.positioned ? "Comentário adicionado." : "Comentário salvo (sem marcador — falta rodar a migração x/y no Supabase).");
      }catch(err){ console.error(err);
        if(!saved && urls.length) await VX.removePhotos(urls).catch(cleanup=>console.warn(cleanup));
        btn.disabled=false; btn.textContent="Enviar";
        const unavailable=area && (missingColumn(err,"w")||missingColumn(err,"h"));
        VX.toast(unavailable?"Comentários por área ainda não estão disponíveis. Use um clique simples ou aguarde a atualização do sistema.":"Erro ao enviar — "+(err.message||err), true); }
    });
  }

  function openThread(t, anchorEl){
    const c=t.root;
    activeThread=c.id; highlightArea(c.id);
    const r=anchorEl.getBoundingClientRect();
    bubble.innerHTML="";
    const box=document.createElement("div"); box.className="bubble-box bubble-thread";
    const photos=photoHtml(c.photos);
    const replies=t.replies.map(rp=>`
      <div class="th-reply">
        <span class="th-av th-av--sm">${VX.esc(initial(rp.author))}</span>
        <div class="th-rbody">
          <div class="th-who">${VX.esc(rp.author||"Anônimo")}<time>${VX.fmtDate(rp.created_at)}</time></div>
          <div class="b-body">${VX.esc(rp.body||"")}</div>
          <div class="b-photos">${photoHtml(rp.photos)}</div>
        </div>
      </div>`).join("");
    box.innerHTML=`
      <div class="th-head">
        <span class="th-av">${VX.esc(initial(c.author))}</span>
        <div class="th-meta"><b>${VX.esc(c.author||"Anônimo")}</b><time>${VX.fmtDate(c.created_at)}</time></div>
        <button class="th-done${isDone(t)?" is-done":""}" type="button" title="${isDone(t)?"Reabrir comentário":"Marcar como entregue"}">✓</button>
        <button class="bubble-x" type="button" aria-label="Fechar">✕</button>
      </div>
      ${isDone(t)?'<div class="th-badge">Entregue</div>':""}
      ${c.body?`<div class="b-body">${VX.esc(c.body)}</div>`:""}
      ${photos?`<div class="b-photos">${photos}</div>`:""}
      ${replies?`<div class="th-replies">${replies}</div>`:""}
      <div class="th-reply-box">
        ${identityHtml()}
        <textarea class="th-text" placeholder="Responder…"></textarea>
        <div class="b-thumbs"></div>
        <button type="button" class="attach-btn b-attach">Anexar imagens (até 5)</button>
        <div class="b-row">
          <button type="button" class="b-del">Excluir</button>
          <button type="button" class="send-btn th-send">Responder</button>
        </div>
      </div>`;
    bubble.appendChild(box);
    wireIdentity(box);
    const attachments=wireAttachments(box.querySelector(".th-reply-box"));
    placeBubble(r.right, r.top);
    box.querySelector(".bubble-x").addEventListener("click",closeBubble);
    box.querySelectorAll(".b-photos img").forEach(im=>im.addEventListener("click",()=>{ const url=safePhotoUrl(im.src); if(url) window.open(url,"_blank","noopener,noreferrer"); }));

    box.querySelector(".th-done").addEventListener("click",async()=>{
      const target=!isDone(t);
      try{ await VX.setResolved(c.id,target); closeBubble(); await loadComments();
        VX.toast(target?"Comentário marcado como entregue.":"Comentário reaberto."); }
      catch(err){ console.error(err); VX.toast("Não consegui marcar — "+(err.message||err),true); }
    });
    box.querySelector(".th-send").addEventListener("click",async()=>{
      const body=box.querySelector(".th-text").value.trim();
      if(!body && !attachments.files.length){ VX.toast("Escreva a resposta ou anexe uma imagem."); return; }
      const who=requireAuthor(box); if(!who) return;
      const btn=box.querySelector(".th-send"); btn.disabled=true; btn.textContent="Enviando…";
      const photos=[]; let saved=false;
      try{
        for(const file of attachments.files) photos.push(await VX.uploadPhoto(state.id,file));
        await VX.addReply(c.id,{ mockup_id:state.id, page_index:c.page_index, author:who, body, photos });
        saved=true;
        await loadComments();
        const t2=threads().find(x=>x.root.id===c.id), pin=document.querySelector(`.pin[data-tid="${c.id}"]`);
        if(t2&&pin) openThread(t2,pin); else closeBubble();
      }catch(err){ console.error(err);
        if(!saved && photos.length) await VX.removePhotos(photos).catch(cleanup=>console.warn(cleanup));
        btn.disabled=false; btn.textContent="Responder";
        VX.toast("Não consegui responder — "+(err.message||err),true); }
    });
    box.querySelector(".b-del").addEventListener("click",async()=>{
      if(!confirm("Excluir este comentário e suas respostas?")) return;
      try{ await VX.deleteComment(c); closeBubble(); await loadComments(); VX.toast("Comentário excluído."); }
      catch(err){ VX.toast("Erro ao excluir — "+(err.message||err),true); }
    });
  }

  // ---- lista lateral ----
  function renderDrawer(){
    const ts=threads(), open=ts.filter(t=>!isDone(t)), done=ts.filter(isDone);
    const list=state.drawerFilter==="entregues" ? done : open;
    drawerBody.innerHTML="";
    const f=document.createElement("div"); f.className="drw-filters";
    f.innerHTML=`<button class="pf-chip${state.drawerFilter==="abertos"?" is-on":""}" data-f="abertos">Abertos (${open.length})</button>
                 <button class="pf-chip${state.drawerFilter==="entregues"?" is-on":""}" data-f="entregues">Entregues (${done.length})</button>`;
    f.querySelectorAll(".pf-chip").forEach(b=>b.addEventListener("click",()=>{ state.drawerFilter=b.dataset.f; renderDrawer(); }));
    drawerBody.appendChild(f);
    const sw=document.createElement("label"); sw.className="drw-switch";
    sw.innerHTML=`<input type="checkbox"${state.showDone?" checked":""}> <span>Mostrar entregues no site</span>`;
    sw.querySelector("input").addEventListener("change",(e)=>{ state.showDone=e.target.checked; renderPins(); });
    drawerBody.appendChild(sw);
    if(!list.length){
      const e=document.createElement("div"); e.className="cmt-empty";
      e.innerHTML = state.drawerFilter==="entregues" ? "Nenhum comentário entregue ainda."
        : 'Nenhum comentário aberto.<br><small>Use “Comentar” e clique no ponto do site.</small>';
      drawerBody.appendChild(e); return;
    }
    list.forEach(t=>{
      const c=t.root, card=document.createElement("div"); card.className="cmt-card"+(isDone(t)?" is-done":"");
      const nr=t.replies.length ? " · "+t.replies.length+" resposta"+(t.replies.length>1?"s":"") : "";
      card.innerHTML=`<div class="who"><b><span class="th-av th-av--sm">${VX.esc(initial(c.author))}</span> ${VX.esc(c.author||"Anônimo")}</b>
          <span class="who-right"><time>${VX.fmtDate(c.created_at)}</time>
          <button class="card-done${isDone(t)?" is-done":""}" type="button" title="${isDone(t)?"Reabrir":"Marcar como entregue"}">✓</button></span></div>
        <div class="cmt-where">${c.x==null||c.y==null?"Sem marcador · ":""}${whereLabel(c)}${nr}</div>
        ${c.body?`<div class="body">${VX.esc(c.body)}</div>`:""}`;
      card.querySelector(".card-done").addEventListener("click",async(e)=>{
        e.stopPropagation();
        const target=!isDone(t);
        try{ await VX.setResolved(c.id,target); await loadComments(); VX.toast(target?"Comentário marcado como entregue.":"Comentário reaberto."); }
        catch(err){ console.error(err); VX.toast("Não consegui marcar — "+(err.message||err),true); }
      });
      card.tabIndex=0;
      card.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); closeDrawer(); goToComment(c); } });
      card.addEventListener("click",()=>{ closeDrawer(); goToComment(c); });
      drawerBody.appendChild(card);
    });
  }

  // leva até a página, o dispositivo e o ponto do comentário, e abre a thread
  async function goToComment(c){
    const k=fromKey(c.page_index);
    if(state.overview) setOverview(false);
    if(k.device!==state.device) setDevice(k.device);
    if(k.idx!==state.pageIdx && k.idx<state.pages.length) loadPage(k.idx);
    await waitReady();
    if(c.y!=null) post({ type:"scrollTo", y:Math.max(0, c.y - state.vh*0.3) });
    setTimeout(()=>{
      renderPins();
      const t=threads().find(x=>x.root.id===c.id); if(!t) return;
      const pin=document.querySelector(`.pin[data-tid="${c.id}"]`);
      if(pin && !state.hideMarks){ openThread(t,pin); return; }
      const r=stage.getBoundingClientRect();
      openThread(t,{ getBoundingClientRect:()=>({ right:r.left+r.width/2, top:r.top+r.height/3 }) });
    },450);
  }
  function openDrawer(){ drawer.classList.add("show"); drawerBg.classList.add("show"); }
  function closeDrawer(){ drawer.classList.remove("show"); drawerBg.classList.remove("show"); }
  $("listBtn").addEventListener("click",openDrawer);
  $("drawerClose").addEventListener("click",closeDrawer);
  drawerBg.addEventListener("click",closeDrawer);
})();
