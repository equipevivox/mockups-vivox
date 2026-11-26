/* VIVOX · Script de revisão injetado pelo proxy (/api/lp) na cópia da landing page.
 * Roda dentro do iframe, em origem opaca. Só conversa com o grid por postMessage:
 * informa página, rolagem e altura do documento; recebe pedidos de rolagem.
 * Links internos são devolvidos ao grid para continuar navegando pelo proxy. */
(function(){
  "use strict";
  if (window.parent === window || window.__vxReview) return;
  window.__vxReview = true;
  const base = new URL(document.baseURI);
  const post = (msg)=>{ try{ window.parent.postMessage(Object.assign({ vx:"lp" }, msg), "*"); }catch(e){} };
  const root = ()=>document.scrollingElement || document.documentElement;
  const self = new URL(document.currentScript ? document.currentScript.src : location.href);
  const slug = self.searchParams.get("m") || "";

  // fetch/XHR da LP para o próprio domínio (ex.: modelo 3D) passam pelo proxy, que libera CORS.
  const viaProxy = (url)=>{
    try{
      const u = new URL(String(url), base);
      if (!slug || u.host !== base.host) return url;
      return self.origin + "/api/lp?m=" + encodeURIComponent(slug) + "&a=" + encodeURIComponent(u.pathname + u.search);
    }catch(e){ return url; }
  };
  if (window.fetch) {
    const origFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (method !== "GET") return origFetch(input, init);
      if (typeof input === "string" || input instanceof URL) return origFetch(viaProxy(input), init);
      if (input && input.url) return origFetch(viaProxy(input.url), init);
      return origFetch(input, init);
    };
  }
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    const args = Array.prototype.slice.call(arguments);
    if (String(method).toUpperCase() === "GET") args[1] = viaProxy(url);
    return origOpen.apply(this, args);
  };

  // Frameworks como o Next.js conferem o caminho do endereço ao hidratar. A cópia é
  // servida em /api/lp; aqui o endereço passa a mostrar o caminho original da LP.
  // Como o <base> aponta para o site original, o framework tenta gravar no histórico
  // endereços do domínio da LP, o que o navegador recusa; eles são trazidos para cá.
  try{
    const here = new URL(location.href);
    const local = (url)=>{
      if (url == null || url === "") return url;
      const u = new URL(String(url), base);
      return u.host === base.host ? here.origin + u.pathname + u.search + u.hash : url;
    };
    ["pushState","replaceState"].forEach((name)=>{
      const orig = history[name].bind(history);
      history[name] = function(state, title, url){ return orig(state, title, local(url)); };
    });
    if (here.pathname !== base.pathname) history.replaceState(history.state, "", base.pathname + base.search + base.hash);
  }catch(e){ /* sem reescrita: a página continua abrindo, só sem a correção */ }

  let queued = false;
  function report(){
    queued = false;
    const el = root();
    post({ type:"state", path: base.pathname, title: document.title,
      scrollY: Math.round(window.scrollY || el.scrollTop || 0),
      docH: Math.max(el.scrollHeight, document.body ? document.body.scrollHeight : 0),
      vw: window.innerWidth, vh: window.innerHeight });
  }
  // setTimeout em vez de requestAnimationFrame: rAF não dispara em iframe fora da tela.
  function schedule(){ if(!queued){ queued = true; setTimeout(report, 16); } }

  window.addEventListener("scroll", schedule, { passive:true });
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.addEventListener("DOMContentLoaded", ()=>{
    schedule();
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.documentElement);
  });
  setInterval(schedule, 1500); // conteúdo carregado depois (carrosséis, imagens)

  // Links: internos voltam ao grid; externos abrem em nova aba (o iframe não sai da revisão).
  document.addEventListener("click", (e)=>{
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const raw = a.getAttribute("href") || "";
    if (/^(javascript:|mailto:|tel:)/i.test(raw)) return;
    let u; try{ u = new URL(a.href, base); }catch(err){ return; }
    if (u.host === base.host) {
      e.preventDefault(); e.stopPropagation();
      if (u.pathname === base.pathname) {
        const id = decodeURIComponent(u.hash.slice(1));
        const target = id && (document.getElementById(id) || document.getElementsByName(id)[0]);
        if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
        else if (!u.hash) window.scrollTo({ top:0, behavior:"smooth" });
        return;
      }
      post({ type:"navigate", path: u.pathname, hash: u.hash });
      return;
    }
    if (/^https?:$/.test(u.protocol)) { e.preventDefault(); e.stopPropagation(); window.open(u.href, "_blank", "noopener"); }
  }, true);

  window.addEventListener("message", (e)=>{
    if (e.source !== window.parent) return;
    const m = e.data;
    if (!m || m.vx !== "grid") return;
    if (m.type === "scrollTo") window.scrollTo({ top: m.y, behavior: m.smooth ? "smooth" : "auto" });
    else if (m.type === "scrollBy") window.scrollBy({ top: m.dy || 0, left: 0, behavior: "auto" });
    else if (m.type === "hash" && m.hash) {
      const el = document.getElementById(decodeURIComponent(String(m.hash).slice(1)));
      if (el) el.scrollIntoView({ block:"start" });
    }
    else if (m.type === "ping") report();
  });

  post({ type:"hello", path: base.pathname });
})();
