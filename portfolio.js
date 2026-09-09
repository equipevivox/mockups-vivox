/* VIVOX · Portfólio público — grade de materiais marcados como públicos */
(function(){
  "use strict";
  const { $, pageUrl, esc, toast, TYPE_LABEL, listPublicMockups } = window.VX;
  const grid = $("pfGrid");
  const background=window.VX.portfolioBackground;
  const versions=new Map();
  const coverSession=Date.now();
  let items = [], filter = "todos";
  let loading=false, loaded=false, refreshTimer=0, refreshPending=false, signature="", active=true;

  // A versão vem do banco: um reenvio também chega às abas abertas em outros computadores.
  const coverUrl=m=>pageUrl(encodeURIComponent(m.id),0,m.cover_version||versions.get(m.id)||coverSession);

  document.querySelectorAll(".pf-chip").forEach(chip=>{
    chip.addEventListener("click",()=>{
      document.querySelectorAll(".pf-chip").forEach(c=>{
        c.classList.remove("is-on"); c.setAttribute("aria-pressed","false");
      });
      chip.classList.add("is-on");
      chip.setAttribute("aria-pressed","true");
      filter = chip.dataset.f;
      render();
    });
  });

  // Cartão "mockup físico": objeto 3D com a capa (página 1) do material
  function card(m){
    const a = document.createElement("a");
    a.className = "pf-card pf-card--"+m.type;
    a.href = "/m/"+encodeURIComponent(m.id);
    a.innerHTML = `
      <div class="pm">
        <div class="pm-obj">
          <div class="pm-cover"></div>
          <div class="pm-spine"></div>
          <div class="pm-edge"></div>
          <div class="pm-gloss"></div>
        </div>
      </div>
      <div class="pf-meta">
        <span class="pf-type pf-type--${m.type}">${TYPE_LABEL[m.type]}</span>
        <span class="pf-name">${esc(m.name||m.id).replace(/\.pdf$/i,"")}</span>
        <span class="pf-pages">${m.num_pages||0} página${(m.num_pages===1)?"":"s"}</span>
      </div>`;
    a.querySelector(".pm-cover").style.backgroundImage=`url("${coverUrl(m)}")`;
    return a;
  }

  function render(){
    const list = filter==="todos" ? items : items.filter(m=>m.type===filter);
    grid.innerHTML = "";
    if(!list.length){
      grid.innerHTML = '<div class="pf-empty">Nenhum material publicado nesta categoria ainda.<br><small>Marque materiais como públicos no painel admin.</small></div>';
      return;
    }
    list.forEach(m=>grid.appendChild(card(m)));
  }

  async function load(){
    if(!active || document.hidden) return;
    if(loading){ refreshPending=true; return; }
    loading=true;
    clearTimeout(refreshTimer);
    try{
      const all = await listPublicMockups();
      items = all.filter(m=>m.is_public===true);
      const nextSignature=JSON.stringify(items)+JSON.stringify(items.map(coverUrl));
      if(!loaded || nextSignature!==signature){
        const focusedId=document.activeElement.closest(".pf-card")?.getAttribute("href");
        render();
        if(focusedId) Array.from(grid.querySelectorAll(".pf-card")).find(a=>a.getAttribute("href")===focusedId)?.focus({preventScroll:true});
        signature=nextSignature;
      }
      background?.setMaterials(items,coverUrl);
      loaded=true;
    }catch(err){
      console.error(err);
      if(!loaded){
        grid.innerHTML = '<div class="pf-empty">Não foi possível carregar o portfólio.<button class="ghost-btn pf-retry" type="button">Tentar novamente</button></div>';
        grid.querySelector("button").addEventListener("click",load);
        toast("Erro ao carregar o portfólio.", true);
      }
    }finally{
      loading=false;
      if(active && !document.hidden){
        refreshTimer=setTimeout(load,refreshPending ? 0 : 15000);
      }
      refreshPending=false;
    }
  }

  function refreshWhenVisible(){ if(!document.hidden) load(); }
  document.addEventListener("visibilitychange",()=>{
    clearTimeout(refreshTimer);
    refreshWhenVisible();
  });
  window.addEventListener("focus",refreshWhenVisible);
  window.addEventListener("online",refreshWhenVisible);
  window.addEventListener("storage",event=>{
    if(event.key!=="vivox_materials_changed") return;
    try{
      const change=JSON.parse(event.newValue);
      if(change && typeof change.id==="string" && Number.isFinite(change.version)) versions.set(change.id,change.version);
    }catch(e){ /* Uma notificação inválida não deve interromper a página. */ }
    refreshWhenVisible();
  });
  window.addEventListener("pagehide",()=>{ active=false; clearTimeout(refreshTimer); });
  window.addEventListener("pageshow",event=>{ active=true; if(event.persisted) refreshWhenVisible(); });
  load();
})();
