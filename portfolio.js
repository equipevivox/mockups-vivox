/* VIVOX · Portfólio público — grade de materiais marcados como públicos */
(function(){
  "use strict";
  const { $, pageUrl, esc, toast, TYPE_LABEL, listMockups } = window.VX;
  const grid = $("pfGrid");
  let items = [], filter = "todos";

  document.querySelectorAll(".pf-chip").forEach(chip=>{
    chip.addEventListener("click",()=>{
      document.querySelectorAll(".pf-chip").forEach(c=>c.classList.remove("is-on"));
      chip.classList.add("is-on");
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
          <div class="pm-cover" style="background-image:url('${pageUrl(m.id,0)}')"></div>
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

  (async function load(){
    try{
      const all = await listMockups();
      // filtro no cliente: funciona mesmo antes da coluna is_public existir
      items = all.filter(m=>m.is_public===true);
      render();
    }catch(err){
      console.error(err);
      grid.innerHTML = '<div class="pf-empty">Não foi possível carregar o portfólio.<br><small>'+esc(err.message||String(err))+'</small></div>';
      toast("Erro ao carregar o portfólio.", true);
    }
  })();
})();
