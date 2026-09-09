/* VIVOX · Viewer de material (/m/SLUG) — flipbook, folder 3D e comentários em balão */
(function(){
  "use strict";
  const VX = window.VX, $ = VX.$;
  const flipEl=$("flipbook"), folderEl=$("folderView"), flipArea=$("flipArea");
  const bubble=$("bubble"), drawer=$("cmtDrawer"), drawerBody=$("cmtDrawerBody"), drawerBg=$("drawerBackdrop");
  const loader=$("loader"), loaderSub=$("loaderSub"), progressBar=$("progressBar");

  const state = { id:null, name:"", type:"revista", pages:[], aspect:60/49, total:0,
                  comments:[], commentMode:false, folderOpen:false, ry:-24, rx:6,
                  showDone:false, drawerFilter:"abertos",
                  hideMarks: localStorage.getItem("vivox_hide_marks")==="1" };

  // ---- identidade: pede o nome uma vez e reaproveita nas próximas páginas ----
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
    const btn=box.querySelector(".b-changeid");
    if(!btn) return;
    btn.addEventListener("click",()=>{
      localStorage.removeItem("vivox_author");
      const holder=box.querySelector(".b-ident");
      holder.outerHTML='<input class="b-author" type="text" placeholder="Seu nome (obrigatório)" autocomplete="name">';
      const inp=box.querySelector(".b-author"); if(inp) inp.focus();
    });
  }
  // devolve o nome ou null (avisando) se ainda não se identificou
  function requireAuthor(box){
    const inp=box.querySelector(".b-author");
    const who=(inp&&inp.value||"").trim();
    if(!who){ VX.toast("Informe seu nome para comentar."); if(inp&&inp.type!=="hidden") inp.focus(); return null; }
    localStorage.setItem("vivox_author",who);
    return who;
  }

  const isMobile = ()=>window.matchMedia("(max-width:760px)").matches;
  const isFolder = ()=>state.type==="folder";
  const isSingle = ()=>isMobile() || state.type==="mockup";
  const $fb = ()=>window.jQuery(flipEl);
  const curPage = ()=>{ try{ return $fb().turn("page")||1; }catch(e){ return 1; } };

  function getSlug(){
    const m = location.pathname.match(/^\/m\/([^\/]+)\/?$/);
    if(m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get("m");
  }

  // ================= carregar =================
  (async function init(){
    const slug = getSlug();
    if(!slug){ fail("Material não informado."); return; }
    try{
      const mk = await VX.getMockup(slug);
      if(!mk){ fail("Este material não existe."); return; }
      state.id=slug; state.name=mk.name||slug; state.type=mk.type;
      state.aspect = mk.aspect || (60/49);
      const n = mk.num_pages||0;
      if(!n){ fail("Material sem páginas."); return; }
      state.pages = Array.from({length:n},(_,i)=>VX.pageUrl(slug,i,mk.cover_version));
      state.total = n;

      $("docName").textContent = state.name.replace(/\.pdf$/i,"");
      const t=$("docType"); t.hidden=false; t.textContent=VX.TYPE_LABEL[state.type];
      t.className="pf-type pf-type--"+state.type;
      document.title = "VIVOX · "+state.name.replace(/\.pdf$/i,"");

      loaderSub.textContent="Carregando páginas…"; progressBar.style.width="60%";
      await VX.nextFrame();
      if(isFolder()) await buildFolder(); else await buildFlipbook();
      progressBar.style.width="100%";
      loader.classList.remove("show");

      await loadComments();
      if(new URLSearchParams(location.search).get("comment")==="1") setCommentMode(true);
    }catch(err){ console.error(err); fail(err.message||String(err)); }
  })();

  function fail(msg){
    loader.classList.remove("show");
    VX.toast("Não foi possível abrir — "+msg, true);
    $("docName").textContent = "Material indisponível";
  }

  // ================= flipbook (revista / mockup) =================
  function computeDims(){
    const single=isSingle();
    const areaW=Math.max(280, flipArea.clientWidth - (isMobile()?16:24));
    const areaH=Math.max(320, flipArea.clientHeight - 14);
    let pageW = single ? Math.min(areaW*0.96,(areaH*0.98)/state.aspect)
                       : Math.min((areaW*0.94)/2,(areaH*0.98)/state.aspect);
    return { single, pageW:Math.round(pageW), pageH:Math.round(pageW*state.aspect) };
  }

  async function buildFlipbook(){
    const J=window.jQuery;
    if(!J||!J.fn||!J.fn.turn){ VX.toast("Biblioteca de animação não carregou.",true); return; }
    try{ $fb().turn("destroy"); }catch(e){}
    flipEl.innerHTML=""; flipEl.removeAttribute("style");
    folderEl.hidden=true; flipEl.hidden=false;
    $("pageControls").hidden=false; $("folderControls").hidden=true;

    const d=computeDims();
    state.pages.forEach((src,i)=>{
      const pg=document.createElement("div");
      pg.className="pg"; pg.dataset.page=i;
      pg.style.width=d.pageW+"px"; pg.style.height=d.pageH+"px";
      const img=document.createElement("img"); img.src=src; img.alt="Página "+(i+1); img.draggable=false;
      const pins=document.createElement("div"); pins.className="pins";
      // ícone que aparece ao passar o mouse: entra no modo de marcação
      const add=document.createElement("button");
      add.className="pg-add"; add.type="button"; add.title="Comentar nesta página";
      add.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      add.addEventListener("mousedown",e=>e.stopPropagation());
      add.addEventListener("click",(e)=>{ e.stopPropagation(); e.preventDefault();
        if(!state.commentMode) setCommentMode(true); });
      pg.appendChild(img); pg.appendChild(pins); pg.appendChild(add);
      pg.addEventListener("click",(e)=>onSurfaceClick(e,pg,i));
      flipEl.appendChild(pg);
    });

    await VX.preloadImages(state.pages);

    const opts={ width:d.single?d.pageW:d.pageW*2, height:d.pageH,
      display:d.single?"single":"double", autoCenter:true, gradients:true, acceleration:true,
      elevation:50, duration:d.single?900:800,
      when:{ turning:(e,p)=>syncPage(p), turned:(e,p)=>{ syncPage(p); renderPins(); } } };
    let ready=false;
    for(let a=0;a<5&&!ready;a++){
      try{ $fb().turn("destroy"); }catch(e){}
      try{ $fb().turn(opts); }catch(e){}
      ready = !!$fb().turn("page");
      if(!ready) await new Promise(r=>setTimeout(r,90));
    }
    $("totalPages").textContent=state.total; $("pageInput").max=state.total;
    syncPage(1);
  }

  function syncPage(p){
    p = p || curPage();
    $("pageInput").value=p;
    $("firstBtn").disabled=$("prevBtn").disabled=$("sidePrev").disabled=(p<=1);
    $("nextBtn").disabled=$("lastBtn").disabled=$("sideNext").disabled=(p>=state.total);
  }

  // ================= folder 3D (2 spreads: fora / dentro) =================
  async function buildFolder(){
    flipEl.hidden=true; folderEl.hidden=false;
    $("pageControls").hidden=true; $("folderControls").hidden=false;
    folderEl.innerHTML="";

    const outside = state.pages[0];
    const inside  = state.pages[1] || state.pages[0];
    await VX.preloadImages([outside,inside]);

    // aspecto de UM painel = altura / (largura do spread / 3)
    const panelAspect = 3 * state.aspect;
    const areaW=Math.max(280, flipArea.clientWidth-40), areaH=Math.max(300, flipArea.clientHeight-40);
    let pw = Math.min(areaW/3.15, areaH/panelAspect);
    const ph = Math.round(pw*panelAspect); pw = Math.round(pw);

    const f3d=document.createElement("div");
    f3d.className="folder-3d folder-3d--viewer"; f3d.id="fv3d";
    f3d.style.setProperty("--pw", pw+"px"); f3d.style.setProperty("--ph", ph+"px");

    // ordem visual dos terços: esquerda 0%, centro 50%, direita 100%
    [["fpanel--center","50%",1],["fpanel--left","0%",0],["fpanel--right","100%",2]].forEach(([cls,pos,idx])=>{
      const panel=document.createElement("div"); panel.className="fpanel "+cls; panel.dataset.panel=idx;
      const fin=document.createElement("div"); fin.className="ffv ffv--in";
      fin.style.cssText=`background-image:url('${inside}');background-size:300% 100%;background-position:${pos} 0`;
      const fout=document.createElement("div"); fout.className="ffv ffv--out";
      fout.style.cssText=`background-image:url('${outside}');background-size:300% 100%;background-position:${pos} 0`;
      const pins=document.createElement("div"); pins.className="pins"; pins.dataset.face="in";
      fin.appendChild(pins);
      panel.appendChild(fin); panel.appendChild(fout);
      panel.addEventListener("click",(e)=>onFolderClick(e));
      f3d.appendChild(panel);
    });
    folderEl.appendChild(f3d);
    applyFolderRotation();
    wireFolderDrag(f3d);
  }

  function applyFolderRotation(){
    const f=$("fv3d"); if(f) f.style.transform=`rotateX(${state.rx}deg) rotateY(${state.ry}deg)`;
  }
  function setFolderOpen(open){
    const f=$("fv3d"); if(!f) return;
    state.folderOpen=open; f.classList.toggle("open",open);
    $("folderToggle").textContent = open ? "Fechar folder" : "Abrir folder";
    renderPins();
  }
  function wireFolderDrag(f){
    let dragging=false,moved=0,sx=0,sy=0,sry=0,srx=0;
    f.addEventListener("pointerdown",(e)=>{ if(state.commentMode) return;
      dragging=true;moved=0;sx=e.clientX;sy=e.clientY;sry=state.ry;srx=state.rx;
      f.classList.add("grabbing"); try{ f.setPointerCapture(e.pointerId); }catch(_){} });
    f.addEventListener("pointermove",(e)=>{ if(!dragging)return;
      const dx=e.clientX-sx, dy=e.clientY-sy; moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));
      state.ry=sry+dx*0.55; state.rx=Math.max(-32,Math.min(38,srx-dy*0.35)); applyFolderRotation(); e.preventDefault(); });
    const end=()=>{ if(!dragging)return; dragging=false; f.classList.remove("grabbing");
      if(moved<7 && !state.commentMode) setFolderOpen(!state.folderOpen); };
    f.addEventListener("pointerup",end);
    f.addEventListener("pointercancel",()=>{dragging=false;f.classList.remove("grabbing");});
  }
  $("folderToggle").addEventListener("click",()=>setFolderOpen(!state.folderOpen));
  $("folderReset").addEventListener("click",()=>{ state.ry=0; state.rx=0; applyFolderRotation(); });

  // ================= comentários =================
  // agrupa em threads: comentário raiz + respostas (parent_id)
  function threads(){
    const all=state.comments, byParent={};
    all.forEach(c=>{ if(c.parent_id){ (byParent[c.parent_id]=byParent[c.parent_id]||[]).push(c); } });
    return all.filter(c=>!c.parent_id).map(r=>({ root:r, replies:byParent[r.id]||[] }));
  }
  const isDone = (t)=> t.root.resolved===true;
  const initial = (name)=> (String(name||"A").trim()[0]||"A").toUpperCase();

  async function loadComments(){
    try{ state.comments = await VX.listComments(state.id); }
    catch(err){ console.warn("comentários:",err); state.comments=[]; }
    const open = threads().filter(t=>!isDone(t)).length;
    const badge=$("cmtCount"); badge.textContent=open; badge.hidden=open===0;
    renderPins(); renderDrawer();
  }

  // pins do flipbook: dentro da página; pins do folder: dentro do painel correspondente
  function renderPins(){
    document.querySelectorAll(".pins").forEach(p=>p.innerHTML="");
    threads().forEach(t=>{
      const c=t.root;
      if(c.x==null||c.y==null) return;              // comentário antigo, sem posição
      if(isDone(t) && !state.showDone) return;      // entregues ficam ocultos
      if(isFolder()){
        if(c.page_index===0) return;                // pins ficam no spread de dentro
        const p=Math.max(0,Math.min(2,Math.floor(c.x*3)));
        const host=document.querySelector(`.fpanel[data-panel="${p}"] .pins`);
        if(host) host.appendChild(pinEl(t,(c.x*3-p),c.y));
      }else{
        const host=document.querySelector(`.pg[data-page="${c.page_index}"] .pins`);
        if(host) host.appendChild(pinEl(t,c.x,c.y));
      }
    });
  }

  function pinEl(t,x,y){
    const c=t.root;
    const b=document.createElement("button");
    b.className="pin"+(isDone(t)?" pin--done":"");
    b.type="button"; b.dataset.tid=c.id;
    b.style.left=(x*100)+"%"; b.style.top=(y*100)+"%";
    b.title=(c.author||"Anônimo")+": "+String(c.body||"").slice(0,90);
    const ini=document.createElement("span"); ini.className="pin-ini"; ini.textContent=initial(c.author);
    b.appendChild(ini);
    if(t.replies.length){ const n=document.createElement("i"); n.className="pin-n"; n.textContent=t.replies.length+1; b.appendChild(n); }
    b.addEventListener("mousedown",e=>e.stopPropagation());
    b.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
    b.addEventListener("click",(e)=>{ e.stopPropagation(); e.preventDefault(); openThread(t,b); });
    return b;
  }

  // ---- modo comentário ----
  function setCommentMode(on){
    state.commentMode=on;
    document.body.classList.toggle("cmt-mode",on);
    $("cmtTool").classList.toggle("is-on",on);
    $("cmtHint").hidden=!on;
    if(on && isFolder()){ setFolderOpen(true); state.ry=0; state.rx=0; applyFolderRotation(); }
    // trava o turn.js enquanto comenta, senão o clique vira a página
    if(!isFolder()){ try{ $fb().turn("disable", on); }catch(e){} }
    if(!on) closeBubble();
  }
  $("cmtTool").addEventListener("click",()=>setCommentMode(!state.commentMode));

  // ---- ocultar marcadores (leitura sem distração) ----
  function setHideMarks(on){
    state.hideMarks=on;
    document.body.classList.toggle("marks-off",on);
    $("hideBtn").classList.toggle("is-on",on);
    $("hideBtn").title = on ? "Mostrar comentários" : "Ocultar comentários";
    const lbl=$("hideLbl"); if(lbl) lbl.textContent = on ? "Mostrar" : "Ocultar";
    localStorage.setItem("vivox_hide_marks", on?"1":"0");
    if(on && state.commentMode) setCommentMode(false);
  }
  $("hideBtn").addEventListener("click",()=>setHideMarks(!state.hideMarks));
  setHideMarks(state.hideMarks);
  document.addEventListener("keydown",(e)=>{
    if(e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT") return;
    if(e.key==="Escape"){ if(state.commentMode) setCommentMode(false); closeBubble(); closeDrawer(); }
    else if(e.key==="c"||e.key==="C"){ setCommentMode(!state.commentMode); }  // atalho do Figma
    else if(!isFolder()){
      if(e.key==="ArrowRight") fNext(); else if(e.key==="ArrowLeft") fPrev();
    }
  });

  function onSurfaceClick(e,pg,pageIndex){
    if(!state.commentMode) return;
    e.stopPropagation(); e.preventDefault();
    const r=pg.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    if(x<0||x>1||y<0||y>1) return;
    openComposer(pageIndex,x,y,e.clientX,e.clientY);
  }

  function onFolderClick(e){
    if(!state.commentMode) return;
    e.stopPropagation(); e.preventDefault();
    const panels=[...document.querySelectorAll(".fpanel")];
    const rects=panels.map(p=>p.getBoundingClientRect());
    const left=Math.min(...rects.map(r=>r.left)), right=Math.max(...rects.map(r=>r.right));
    const top=Math.min(...rects.map(r=>r.top)), bottom=Math.max(...rects.map(r=>r.bottom));
    const x=(e.clientX-left)/(right-left), y=(e.clientY-top)/(bottom-top);
    if(x<0||x>1||y<0||y>1) return;
    openComposer(1,x,y,e.clientX,e.clientY);   // page_index 1 = spread de dentro
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
  function closeBubble(){ bubble.hidden=true; bubble.innerHTML=""; }
  document.addEventListener("mousedown",(e)=>{
    if(bubble.hidden) return;
    if(!bubble.contains(e.target) && !e.target.closest(".pin")) closeBubble();
  });

  function openComposer(pageIndex,x,y,cx,cy){
    bubble.innerHTML="";
    const box=document.createElement("div"); box.className="bubble-box";
    box.innerHTML=`
      <div class="bubble-head"><b>Novo comentário</b><button class="bubble-x" type="button">✕</button></div>
      ${identityHtml()}
      <textarea class="b-text" placeholder="Escreva a correção ou observação…"></textarea>
      <div class="b-thumbs"></div>
      <div class="b-row">
        <button type="button" class="attach-btn b-attach">Anexar foto</button>
        <button type="button" class="send-btn b-send">Enviar</button>
      </div>`;
    bubble.appendChild(box);
    wireIdentity(box);
    placeBubble(cx,cy);

    const files=[];
    const fileIn=document.createElement("input"); fileIn.type="file"; fileIn.accept="image/*"; fileIn.multiple=true; fileIn.hidden=true;
    box.appendChild(fileIn);
    box.querySelector(".b-attach").addEventListener("click",()=>fileIn.click());
    fileIn.addEventListener("change",()=>{
      Array.from(fileIn.files).forEach(f=>{ if(!f.type.startsWith("image/"))return;
        if(files.length>=5){ VX.toast("Máximo de 5 imagens por comentário."); return; }
        files.push(f);
        const th=document.createElement("div"); th.className="th";
        const im=document.createElement("img"); im.src=URL.createObjectURL(f);
        const rm=document.createElement("button"); rm.type="button"; rm.textContent="✕";
        rm.addEventListener("click",()=>{ const i=files.indexOf(f); if(i>=0)files.splice(i,1); th.remove(); });
        th.appendChild(im); th.appendChild(rm); box.querySelector(".b-thumbs").appendChild(th); });
      fileIn.value="";
    });
    box.querySelector(".bubble-x").addEventListener("click",closeBubble);
    (box.querySelector(".b-author[type='text']")||box.querySelector(".b-text")).focus();

    box.querySelector(".b-send").addEventListener("click",async()=>{
      const body=box.querySelector(".b-text").value.trim();
      if(!body && !files.length){ VX.toast("Escreva algo ou anexe uma foto."); return; }
      const who=requireAuthor(box); if(!who) return;
      const btn=box.querySelector(".b-send"); btn.disabled=true; btn.textContent="Enviando…";
      try{
        const urls=[];
        for(const f of files) urls.push(await VX.uploadPhoto(state.id,f));
        const res = await VX.addComment({ mockup_id:state.id, page_index:pageIndex, x, y,
          author:who, body, photos:urls });
        closeBubble(); setCommentMode(false);
        await loadComments();
        VX.toast(res.positioned ? "Comentário adicionado."
          : "Comentário salvo (sem marcador — falta rodar a migração x/y no Supabase).");
      }catch(err){ console.error(err); btn.disabled=false; btn.textContent="Enviar";
        VX.toast("Erro ao enviar — "+(err.message||err), true); }
    });
  }

  function openThread(t, anchorEl){
    const c=t.root;
    const r=anchorEl.getBoundingClientRect();
    bubble.innerHTML="";
    const box=document.createElement("div"); box.className="bubble-box bubble-thread";
    const photos=(Array.isArray(c.photos)?c.photos:[]).map(u=>`<img src="${u}" loading="lazy">`).join("");
    const replies=t.replies.map(rp=>`
      <div class="th-reply">
        <span class="th-av th-av--sm">${VX.esc(initial(rp.author))}</span>
        <div class="th-rbody">
          <div class="th-who">${VX.esc(rp.author||"Anônimo")}<time>${VX.fmtDate(rp.created_at)}</time></div>
          <div class="b-body">${VX.esc(rp.body||"")}</div>
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
        <div class="b-row">
          <button type="button" class="b-del">Excluir</button>
          <button type="button" class="send-btn th-send">Responder</button>
        </div>
      </div>`;
    bubble.appendChild(box);
    wireIdentity(box);
    placeBubble(r.right, r.top);
    box.querySelector(".bubble-x").addEventListener("click",closeBubble);
    box.querySelectorAll(".b-photos img").forEach(im=>im.addEventListener("click",()=>window.open(im.src,"_blank")));

    // marcar como entregue / reabrir
    box.querySelector(".th-done").addEventListener("click",async()=>{
      const target=!isDone(t);
      try{
        await VX.setResolved(c.id,target);
        closeBubble(); await loadComments();
        VX.toast(target?"Comentário marcado como entregue.":"Comentário reaberto.");
      }catch(err){ console.error(err);
        VX.toast("Não consegui marcar. Falta rodar a migração da coluna resolved no Supabase.",true); }
    });

    // responder
    box.querySelector(".th-send").addEventListener("click",async()=>{
      const body=box.querySelector(".th-text").value.trim();
      if(!body){ VX.toast("Escreva a resposta."); return; }
      const who=requireAuthor(box); if(!who) return;
      const btn=box.querySelector(".th-send"); btn.disabled=true; btn.textContent="Enviando…";
      try{
        await VX.addReply(c.id,{ mockup_id:state.id, page_index:c.page_index, author:who, body, photos:[] });
        await loadComments();
        const t2=threads().find(x=>x.root.id===c.id);
        const pin=document.querySelector(`.pin[data-tid="${c.id}"]`);
        if(t2&&pin) openThread(t2,pin); else closeBubble();
      }catch(err){ console.error(err); btn.disabled=false; btn.textContent="Responder";
        VX.toast("Não consegui responder. Falta rodar a migração da coluna parent_id no Supabase.",true); }
    });

    box.querySelector(".b-del").addEventListener("click",async()=>{
      if(!confirm("Excluir este comentário e suas respostas?")) return;
      try{ await VX.deleteComment(c); closeBubble(); await loadComments(); VX.toast("Comentário excluído."); }
      catch(err){ VX.toast("Erro ao excluir — "+(err.message||err),true); }
    });
  }

  // ---- lista lateral ----
  function renderDrawer(){
    const ts=threads();
    const open=ts.filter(t=>!isDone(t)), done=ts.filter(t=>isDone(t));
    const list = state.drawerFilter==="entregues" ? done : open;
    drawerBody.innerHTML="";

    const f=document.createElement("div"); f.className="drw-filters";
    f.innerHTML=`<button class="pf-chip${state.drawerFilter==="abertos"?" is-on":""}" data-f="abertos">Abertos (${open.length})</button>
                 <button class="pf-chip${state.drawerFilter==="entregues"?" is-on":""}" data-f="entregues">Entregues (${done.length})</button>`;
    f.querySelectorAll(".pf-chip").forEach(b=>b.addEventListener("click",()=>{ state.drawerFilter=b.dataset.f; renderDrawer(); }));
    drawerBody.appendChild(f);

    const sw=document.createElement("label"); sw.className="drw-switch";
    sw.innerHTML=`<input type="checkbox"${state.showDone?" checked":""}> <span>Mostrar entregues no material</span>`;
    sw.querySelector("input").addEventListener("change",(e)=>{ state.showDone=e.target.checked; renderPins(); });
    drawerBody.appendChild(sw);

    if(!list.length){
      const e=document.createElement("div"); e.className="cmt-empty";
      e.innerHTML = state.drawerFilter==="entregues"
        ? "Nenhum comentário entregue ainda."
        : 'Nenhum comentário aberto.<br><small>Use “Comentar” e clique no ponto do material.</small>';
      drawerBody.appendChild(e); return;
    }
    list.forEach(t=>{
      const c=t.root;
      const card=document.createElement("div"); card.className="cmt-card"+(isDone(t)?" is-done":"");
      const where = isFolder() ? (c.page_index===0?"Fora":"Dentro") : ("Página "+((c.page_index||0)+1));
      const nr = t.replies.length ? " · "+t.replies.length+" resposta"+(t.replies.length>1?"s":"") : "";
      card.innerHTML=`<div class="who"><b><span class="th-av th-av--sm">${VX.esc(initial(c.author))}</span> ${VX.esc(c.author||"Anônimo")}</b>
          <span class="who-right"><time>${VX.fmtDate(c.created_at)}</time>
          <button class="card-done${isDone(t)?" is-done":""}" type="button" title="${isDone(t)?"Reabrir":"Marcar como entregue"}">✓</button></span></div>
        <div class="cmt-where">${where}${nr}</div>
        ${c.body?`<div class="body">${VX.esc(c.body)}</div>`:""}`;
      card.querySelector(".card-done").addEventListener("click",async(e)=>{
        e.stopPropagation();
        const target=!isDone(t);
        try{ await VX.setResolved(c.id,target); await loadComments();
          VX.toast(target?"Comentário marcado como entregue.":"Comentário reaberto."); }
        catch(err){ console.error(err);
          VX.toast("Não consegui marcar. Falta rodar a migração da coluna resolved no Supabase.",true); }
      });
      card.addEventListener("click",()=>{ goToComment(c); closeDrawer(); });
      drawerBody.appendChild(card);
    });
  }
  // vai até a página do comentário e abre a thread (com a opção de entregar)
  function goToComment(c){
    if(isFolder()){ setFolderOpen(true); state.ry=0;state.rx=0; applyFolderRotation(); }
    else { try{ $fb().turn("page", (c.page_index||0)+1); }catch(e){} }
    setTimeout(()=>{
      renderPins();
      const t=threads().find(x=>x.root.id===c.id); if(!t) return;
      const pin=document.querySelector(`.pin[data-tid="${c.id}"]`);
      if(pin){ pin.click(); return; }
      // sem marcador (comentário antigo ou marcadores ocultos): abre a thread no centro da área
      const r=flipArea.getBoundingClientRect();
      openThread(t,{ getBoundingClientRect:()=>({ right:r.left+r.width/2, top:r.top+r.height/3 }) });
    },430);
  }
  function openDrawer(){ drawer.classList.add("show"); drawerBg.classList.add("show"); }
  function closeDrawer(){ drawer.classList.remove("show"); drawerBg.classList.remove("show"); }
  $("listBtn").addEventListener("click",openDrawer);
  $("drawerClose").addEventListener("click",closeDrawer);
  drawerBg.addEventListener("click",closeDrawer);

  // ================= navegação =================
  const fNext=()=>{ try{ $fb().turn("next"); }catch(e){} };
  const fPrev=()=>{ try{ $fb().turn("previous"); }catch(e){} };
  const goTo=(n)=>{ try{ $fb().turn("page", Math.min(state.total,Math.max(1,n))); }catch(e){} };
  $("nextBtn").addEventListener("click",fNext); $("prevBtn").addEventListener("click",fPrev);
  $("sideNext").addEventListener("click",fNext); $("sidePrev").addEventListener("click",fPrev);
  $("firstBtn").addEventListener("click",()=>goTo(1));
  $("lastBtn").addEventListener("click",()=>goTo(state.total));
  $("pageInput").addEventListener("change",(e)=>{ const v=parseInt(e.target.value,10); if(!isNaN(v)) goTo(v); });
  $("fsBtn").addEventListener("click",()=>{
    const el=$("viewer");
    if(!document.fullscreenElement){ (el.requestFullscreen||el.webkitRequestFullscreen||function(){}).call(el); }
    else { (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); }
  });

  let rt, wasMobile=isMobile();
  window.addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(async()=>{
    if(!state.pages.length) return;
    if(isFolder()){ await buildFolder(); setFolderOpen(state.folderOpen); renderPins(); return; }
    const m=isMobile();
    if(m!==wasMobile){ wasMobile=m; await buildFlipbook(); renderPins(); return; }
    const d=computeDims();
    try{
      flipEl.querySelectorAll(".pg").forEach(pg=>{ pg.style.width=d.pageW+"px"; pg.style.height=d.pageH+"px"; });
      $fb().turn("display", d.single?"single":"double");
      $fb().turn("size", d.single?d.pageW:d.pageW*2, d.pageH);
      renderPins();
    }catch(e){ await buildFlipbook(); renderPins(); }
  },180); });
})();
