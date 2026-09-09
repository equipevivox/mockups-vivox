/* Preferência de tema exclusiva da página inicial, aplicada antes dos estilos. */
(function(){
  "use strict";
  const key="vivox_theme", root=document.documentElement;
  function apply(value){
    const light=value==="light";
    root.dataset.theme=light?"light":"dark";
    const button=document.getElementById("themeToggle");
    if(!button) return;
    const label=light?"Ativar tema escuro":"Ativar tema claro";
    button.setAttribute("aria-label",label);
    button.title=label;
    button.querySelector("span").textContent=light?"Tema escuro":"Tema claro";
  }
  let saved="dark";
  try{ saved=localStorage.getItem(key); }catch(e){ /* O botão funciona sem armazenamento. */ }
  apply(saved);
  document.addEventListener("DOMContentLoaded",()=>{
    apply(root.dataset.theme);
    document.getElementById("themeToggle").addEventListener("click",()=>{
      apply(root.dataset.theme==="light"?"dark":"light");
      try{ localStorage.setItem(key,root.dataset.theme); }catch(e){}
    });
  });
  window.addEventListener("storage",(event)=>{
    if(event.key===key || event.key===null) apply(event.newValue);
  });
})();
