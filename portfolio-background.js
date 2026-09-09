/* Galeria 3D decorativa: posições estáveis e colunas ligadas à rolagem real. */
(function(){
  "use strict";
  const root=document.getElementById("pfBackdrop");
  const matrix=document.getElementById("pfBackdropMatrix");
  const content=document.querySelector(".pf-wrap");
  if(!root || !matrix) return;

  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile=window.matchMedia("(max-width: 760px)");
  const covers=new Map();
  let columns=[], frame=0, progress=0, target=0, travel=0, targetTravel=0;
  let velocity=0, travelVelocity=0, lastTime=0, active=true;

  function stop(){
    cancelAnimationFrame(frame); frame=0; lastTime=0;
    velocity=0; travelVelocity=0;
    matrix.classList.remove("is-moving");
  }

  function layout(){
    const count=mobile.matches ? 2 : 4;
    const order=mobile.matches ? [1,0] : [2,0,3,1];
    if(columns.length!==count){
      columns=Array.from({length:count},()=>{
        const column=document.createElement("div");
        column.className="pf-backdrop-column";
        return column;
      });
      matrix.replaceChildren(...columns);
    }
    covers.forEach(cover=>{
      const columnIndex=order[cover.slot%count];
      const level=Math.floor(cover.slot/count);
      // As próximas capas entram pelo lado de origem do movimento da coluna.
      // A altura da matriz não depende da quantidade: incluir uma capa não desloca as outras.
      cover.element.style.setProperty("--cover-row",String(level*(columnIndex%2===0 ? 1 : -1)));
      if(cover.element.parentElement!==columns[columnIndex]) columns[columnIndex].appendChild(cover.element);
    });
    updateScroll();
    paint();
  }

  function cancelLoad(cover){
    if(!cover.request) return;
    clearTimeout(cover.request.timer);
    cover.request.image.onload=cover.request.image.onerror=null;
    cover.request=null;
  }

  function loadCover(cover,src){
    cancelLoad(cover);
    const img=new Image();
    img.alt=""; img.decoding="async"; img.loading="eager"; img.draggable=false;
    const request={image:img,timer:0};
    cover.request=request;
    function finish(ok){
      if(cover.request!==request) return;
      clearTimeout(request.timer);
      img.onload=img.onerror=null; cover.request=null;
      if(ok){
        cover.element.replaceChildren(img);
        cover.element.classList.add("is-loaded");
      }else{
        // Uma imagem antiga também sai se a versão nova falhar.
        cover.element.replaceChildren();
        cover.element.classList.remove("is-loaded");
      }
    }
    img.onload=()=>finish(true);
    img.onerror=()=>finish(false);
    request.timer=setTimeout(()=>finish(false),15000);
    const url=new URL(src,location.href);
    if(cover.attempt){
      url.searchParams.set("cacheNonce",(url.searchParams.get("cacheNonce")||"")+"-retry-"+Date.now()+"-"+cover.attempt);
    }
    cover.attempt++;
    img.src=url.href;
  }

  function setMaterials(materials,coverUrl){
    const list=materials.filter(m=>m.is_public===true && m.num_pages>0);
    const ids=new Set(list.map(m=>m.id));
    let layoutChanged=false;
    covers.forEach((cover,id)=>{
      if(!ids.has(id)){
        cancelLoad(cover); cover.element.remove(); covers.delete(id); layoutChanged=true;
      }
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
        cover={element,slot,src:"",attempt:0,request:null};
        covers.set(material.id,cover); layoutChanged=true;
      }
      const src=coverUrl(material);
      if(cover.src!==src){
        cover.src=src; cover.attempt=0; loadCover(cover,src);
      }else if(!cover.request && !cover.element.firstChild){
        loadCover(cover,src);
      }
    });
    if(layoutChanged) layout();
  }

  function paint(){
    if(reduced.matches){
      matrix.style.removeProperty("transform");
      columns.forEach(column=>column.style.removeProperty("--column-y"));
      return;
    }
    const p=progress, strength=mobile.matches ? .28 : .55;
    // Ângulos da referência, mantendo as capas próximas como solicitado para o fundo.
    matrix.style.transform=`translate3d(0,0,${-320+320*p}px) rotateX(${25-21*p}deg) rotateY(${-45+37*p}deg) rotateZ(${15-13*p}deg)`;
    columns.forEach((column,i)=>{
      const direction=i%2===0 ? -1 : 1;
      column.style.setProperty("--column-y",`${direction*travel*strength}px`);
    });
  }

  function animate(time){
    frame=0;
    const elapsed=lastTime ? Math.min(time-lastTime,64) : 16;
    lastTime=time;
    // Mola da referência (rigidez 100, amortecimento 20, massa .5), em passos estáveis.
    const steps=Math.ceil(elapsed/8), dt=elapsed/steps/1000;
    for(let i=0;i<steps;i++){
      velocity+=((target-progress)*100-velocity*20)/.5*dt;
      travelVelocity+=((targetTravel-travel)*100-travelVelocity*20)/.5*dt;
      progress+=velocity*dt; travel+=travelVelocity*dt;
    }
    if(Math.abs(target-progress)<.0001 && Math.abs(velocity)<.001) progress=target;
    if(Math.abs(targetTravel-travel)<.1 && Math.abs(travelVelocity)<1) travel=targetTravel;
    paint();
    if((progress!==target || travel!==targetTravel) && active && !document.hidden){
      frame=requestAnimationFrame(animate);
    }else stop();
  }

  function scroller(){
    // Funciona tanto na rolagem do documento quanto dentro de um contêiner com overflow.
    for(let el=content?.parentElement;el && el!==document.body && el!==document.documentElement;el=el.parentElement){
      if(/auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
    }
    return document.scrollingElement || document.documentElement;
  }

  function updateScroll(immediate=false){
    const el=scroller(), distance=Math.max(0,el.scrollHeight-el.clientHeight);
    targetTravel=Math.max(0,Math.min(distance,el.scrollTop));
    target=distance ? targetTravel/distance : 0;
    if(immediate || reduced.matches || document.hidden || !active){
      stop(); progress=target; travel=targetTravel; paint(); return;
    }
    if(!frame && (Math.abs(progress-target)>.0001 || Math.abs(travel-targetTravel)>.1)){
      matrix.classList.add("is-moving");
      frame=requestAnimationFrame(animate);
    }
  }

  // Captura também scroll de contêineres, que não se propaga até window.
  document.addEventListener("scroll",()=>updateScroll(),{passive:true,capture:true});
  window.addEventListener("resize",()=>updateScroll(),{passive:true});
  const observer=new ResizeObserver(()=>updateScroll());
  if(content) observer.observe(content);
  observer.observe(document.body);
  document.addEventListener("visibilitychange",()=>updateScroll(true));
  reduced.addEventListener("change",()=>updateScroll(true));
  mobile.addEventListener("change",layout);
  window.addEventListener("pagehide",()=>{ active=false; stop(); });
  window.addEventListener("pageshow",()=>{ active=true; updateScroll(true); });
  window.VX.portfolioBackground={setMaterials};
  layout();
  updateScroll(true);
})();
