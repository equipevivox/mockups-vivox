/* Adaptação da galeria 3D enviada pelo usuário para o site estático VIVOX. */
(function(){
  "use strict";
  const root=document.getElementById("pfBackdrop");
  const matrix=document.getElementById("pfBackdropMatrix");
  if(!root || !matrix) return;

  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile=window.matchMedia("(max-width: 760px)");
  const covers=new Map();
  let columns=[], frame=0, progress=0, target=0, lastTime=0;

  function layout(){
    const count=mobile.matches ? 2 : 4;
    const order=mobile.matches ? [1,0] : [2,0,3,1];
    columns=Array.from({length:count},()=>{
      const column=document.createElement("div");
      column.className="pf-backdrop-column";
      return column;
    });
    let rows=3;
    covers.forEach(cover=>{
      const level=Math.floor(cover.slot/count);
      const row=level===0 ? 2 : level===1 ? 1 : level+1;
      rows=Math.max(rows,row);
      cover.element.style.gridRow=String(row);
      columns[order[cover.slot%count]].appendChild(cover.element);
    });
    matrix.style.setProperty("--rows",String(rows));
    matrix.replaceChildren(...columns);
    updateScroll();
    paint();
  }

  function loadCover(cover,src){
    // Se a capa falhar, o espaço fica vazio; uma atualização posterior tenta de novo.
    const img=new Image();
    img.alt="";
    img.decoding="async";
    img.loading=cover.slot<8 ? "eager" : "lazy";
    img.draggable=false;
    cover.src=src;
    cover.element.classList.remove("is-loaded");
    img.onload=()=>{
      if(cover.element.firstChild!==img) return;
      cover.element.classList.add("is-loaded");
    };
    img.onerror=()=>{
      if(cover.element.firstChild!==img) return;
      cover.element.classList.remove("is-loaded");
      img.remove();
    };
    cover.element.replaceChildren(img);
    img.src=src;
  }

  function setMaterials(materials,coverUrl){
    const list=materials.filter(m=>m.is_public===true && m.num_pages>0);
    const ids=new Set(list.map(m=>m.id));
    let layoutChanged=false;
    covers.forEach((cover,id)=>{
      if(!ids.has(id)){ cover.element.remove(); covers.delete(id); layoutChanged=true; }
    });
    const used=new Set(Array.from(covers.values(),cover=>cover.slot));
    list.forEach(material=>{
      let cover=covers.get(material.id);
      if(!cover){
        let slot=0;
        while(used.has(slot)) slot++;
        used.add(slot);
        const element=document.createElement("div");
        element.className="pf-backdrop-cover";
        element.dataset.materialId=material.id;
        cover={element,slot,src:""};
        covers.set(material.id,cover);
        layoutChanged=true;
      }
      const src=coverUrl(material);
      if(cover.src!==src || !cover.element.firstChild) loadCover(cover,src);
    });
    if(layoutChanged) layout();
  }

  function paint(){
    if(reduced.matches){
      matrix.style.removeProperty("transform");
      columns.forEach(column=>column.style.removeProperty("--column-y"));
      return;
    }
    const p=progress, strength=mobile.matches ? .45 : 1;
    matrix.style.transform=`translate3d(6vw,0,${-280+220*p}px) rotateX(${18-14*p}deg) rotateY(${-30+22*p}deg) rotateZ(${9-7*p}deg)`;
    columns.forEach((column,i)=>{
      const direction=i%2===0 ? -1 : 1;
      column.style.setProperty("--column-y",`${direction*(p-.35)*180*strength}px`);
    });
  }

  function animate(time){
    frame=0;
    const elapsed=lastTime ? Math.min(time-lastTime,64) : 16;
    lastTime=time;
    progress+=(target-progress)*(1-Math.exp(-elapsed/110));
    if(Math.abs(target-progress)<.001) progress=target;
    paint();
    if(progress!==target && !document.hidden) frame=requestAnimationFrame(animate);
    else lastTime=0;
  }

  function updateScroll(){
    const distance=Math.max(window.innerHeight*.8,document.documentElement.scrollHeight-window.innerHeight);
    target=Math.max(0,Math.min(1,window.scrollY/distance));
    if(reduced.matches || document.hidden){
      cancelAnimationFrame(frame); frame=0; lastTime=0;
      progress=target; paint(); return;
    }
    if(!frame && Math.abs(progress-target)>.001) frame=requestAnimationFrame(animate);
  }

  window.addEventListener("scroll",updateScroll,{passive:true});
  window.addEventListener("resize",updateScroll,{passive:true});
  document.addEventListener("visibilitychange",updateScroll);
  reduced.addEventListener("change",()=>{ updateScroll(); paint(); });
  mobile.addEventListener("change",layout);
  window.addEventListener("pagehide",()=>{ cancelAnimationFrame(frame); frame=0; lastTime=0; });
  window.addEventListener("pageshow",updateScroll);
  window.VX.portfolioBackground={setMaterials};
  layout();
})();
