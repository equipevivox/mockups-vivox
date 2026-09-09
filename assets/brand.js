/* Anima apenas os quadrados das logos locais; a imagem original é o fallback. */
(function(){
  "use strict";
  const sources=new Map(), namespace="http://www.w3.org/2000/svg";
  const observer=typeof IntersectionObserver==="function" ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>entry.target.classList.toggle("brand-in-view",entry.isIntersecting));
  }) : null;

  function visibility(){
    document.documentElement.classList.toggle("brand-motion-paused",document.hidden);
  }
  document.addEventListener("visibilitychange",visibility);
  visibility();

  document.querySelectorAll("img[data-brand-motion]").forEach(async(img,index)=>{
    const path=img.getAttribute("src");
    if(!["/assets/vivox-grid.svg","/assets/vivox-grid-light.svg"].includes(path)) return;
    try{
      if(!sources.has(path)) sources.set(path,fetch(path).then(response=>{
        if(!response.ok) throw new Error("Logo indisponível");
        return response.text();
      }));
      const doc=new DOMParser().parseFromString(await sources.get(path),"image/svg+xml");
      if(doc.querySelector("parsererror")) return;
      const svg=document.importNode(doc.documentElement,true);
      // Cada instância tem seus próprios gradientes, inclusive a variante oculta.
      const ids=new Map();
      svg.querySelectorAll("[id]").forEach(node=>{
        const original=node.id, unique="brand-"+index+"-"+original;
        ids.set(original,unique);node.id=unique;
      });
      svg.querySelectorAll("[fill]").forEach(node=>{
        const match=/^url\(#(.+)\)$/.exec(node.getAttribute("fill"));
        if(match && ids.has(match[1])) node.setAttribute("fill","url(#"+ids.get(match[1])+")");
      });
      // O arquivo original tem duas camadas sobrepostas em cada quadrado.
      const squares=new Map();
      svg.querySelectorAll('rect[width="10"][height="10"]').forEach(rect=>{
        const key=rect.getAttribute("x")+","+rect.getAttribute("y");
        let group=squares.get(key);
        if(!group){
          group=document.createElementNS(namespace,"g");
          group.classList.add("brand-square");
          group.style.setProperty("--square-delay",(squares.size*.18)+"s");
          rect.before(group);squares.set(key,group);
        }
        group.append(rect);
      });
      svg.setAttribute("class",img.className);
      svg.setAttribute("role","img");
      svg.setAttribute("aria-label",img.alt);
      svg.setAttribute("focusable","false");
      img.replaceWith(svg);
      if(observer) observer.observe(svg);
    }catch(e){ /* A logo estática continua visível se o aprimoramento falhar. */ }
  });
})();
