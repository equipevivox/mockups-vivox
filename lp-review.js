/* VIVOX · Script de revisão injetado pelo proxy (/api/lp) na cópia da landing page.
 * Roda dentro do iframe, em origem opaca. Só conversa com o grid por postMessage:
 *  - informa página, rolagem e altura do documento; recebe pedidos de rolagem;
 *  - no modo comentário, destaca o componente sob o mouse e devolve a âncora dele
 *    (seletor, texto, contexto: popup ou carrossel, e o botão que abriu o popup);
 *  - acompanha os componentes comentados e informa onde estão e se estão visíveis,
 *    para o pin seguir o card do carrossel e sumir quando o popup fecha;
 *  - reabre o popup ou leva o carrossel até o componente de um comentário.
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

  // Frameworks como o Next.js conferem o caminho do endereço ao hidratar. Como o <base>
  // aponta para o site original, o framework tenta gravar no histórico endereços do
  // domínio da LP, o que o navegador recusa; eles são trazidos para cá.
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

  // ================= estado da página =================
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

  // ================= componentes =================
  const clsOf = (e)=>{ const c = e && e.className; return String((c && c.baseVal !== undefined) ? c.baseVal : (c || "")); };
  const clean = (t, n)=>String(t || "").replace(/\s+/g, " ").trim().slice(0, n || 60);
  const INLINE = /^(span|b|strong|em|i|small|sup|sub|mark|br|wbr|abbr|cite|q|u|s|code|label|time|font)$/;

  // Componente "útil" sob o ponto: ícone inteiro em vez de um traço do SVG e o bloco
  // em vez de um trecho de texto (a não ser que seja um link ou botão).
  function meaningful(el){
    if (!el || el === document.documentElement) return null;
    const svg = el.closest && el.closest("svg");
    if (svg) el = svg;
    while (el.parentElement && el.parentElement !== document.body && INLINE.test(el.localName) && !el.closest("a,button")) el = el.parentElement;
    const r = el.getBoundingClientRect();
    if (r.width < 4 && r.height < 4 && el.parentElement) el = el.parentElement;
    return el === document.body ? null : el;
  }

  function cssPath(el){
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const id = e.id;
      if (id && /^[A-Za-z][\w-]{0,60}$/.test(id) && !/\d{4,}|^_|:/.test(id) && document.querySelectorAll("#" + CSS.escape(id)).length === 1) {
        parts.unshift("#" + CSS.escape(id)); return parts.join(" > ");
      }
      let i = 1; for (let s = e.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === e.localName) i++;
      parts.unshift(CSS.escape(e.localName) + ":nth-of-type(" + i + ")");
    }
    return "body > " + parts.join(" > ");
  }

  function describe(el){
    const t = clean(el.getAttribute("aria-label") || el.getAttribute("alt") || el.getAttribute("title") || el.innerText || el.textContent, 50);
    if (t) return t;
    if (el.localName === "img") return "Imagem";
    if (el.localName === "svg") return "Ícone";
    return el.localName;
  }
  function popupName(p){
    const by = p.getAttribute("aria-labelledby");
    const lab = p.getAttribute("aria-label") || (by && document.getElementById(by) && document.getElementById(by).textContent);
    if (lab) return clean(lab, 50);
    const h = p.querySelector("h1,h2,h3,h4,[class*=title]");
    return h ? clean(h.textContent, 50) : "";
  }
  // 2 = popup declarado (dialog, role, aria-modal); 1 = indício por classe ou camada fixa.
  const popupLevel = (a)=>{
    const role = a.getAttribute("role");
    if (a.localName === "dialog" || role === "dialog" || role === "alertdialog" || a.getAttribute("aria-modal") === "true") return 2;
    // classe terminada em modal/popup… ("atuacao-modal"), não "apple-modal-lead" (conteúdo)
    if (clsOf(a).split(/\s+/).some(c => /(^|[-_])(modal|popup|pop-up|lightbox|dialog|drawer|offcanvas)$/i.test(c))) return 1;
    const cs = getComputedStyle(a);
    if (cs.position === "fixed" && (parseInt(cs.zIndex, 10) || 0) >= 10) {
      const r = a.getBoundingClientRect();
      if (r.width * r.height >= 0.3 * innerWidth * innerHeight) return 1;
    }
    return 0;
  };
  const isCarouselEl = (a)=>{
    const rd = String(a.getAttribute("aria-roledescription") || "").toLowerCase();
    if (/carousel|carrossel/.test(rd)) return true;
    if (/(carousel|swiper|slick|slider|embla|splide|glide|marquee|testimonial-track|-track\b)/i.test(clsOf(a))) return true;
    const cs = getComputedStyle(a);
    return (cs.scrollSnapType && cs.scrollSnapType !== "none") || (cs.animationName !== "none" && /translate|matrix/.test(cs.transform + " " + cs.animationName) && a.children.length > 1);
  };
  const isSlide = (a)=>/slide/i.test(a.getAttribute("aria-roledescription") || "") || (a.getAttribute("role") === "group" && !!a.parentElement && isCarouselEl(a.parentElement));
  // Nome curto: sem "1 de 6:" e sem instruções depois de travessão ("— use as setas…").
  const shortName = (t)=>clean(String(t || "").replace(/^\s*\d+\s*(de|of|\/)\s*\d+\s*[:.\-–]?\s*/i, "").split(/\s[—–-]\s/)[0], 50);
  function context(el){
    let strong = null, weak = null, carousel = null, slide = null;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const lv = popupLevel(a);
      if (lv === 2 && !strong) strong = a;
      if (lv === 1 && !weak) weak = a;
      if (!slide && !carousel && isSlide(a)) slide = a;
      if (!carousel && !isSlide(a) && isCarouselEl(a)) carousel = a;
    }
    const popup = strong || weak;
    if (popup) return { kind:"popup", name: popupName(popup), el: popup };
    if (carousel) {
      let name = "";
      for (let x = carousel; x && x !== document.body && !name; x = x.parentElement) {
        name = x.getAttribute("aria-label") || "";
        if (!name && x.localName === "section") name = (x.querySelector("h2,h3") || {}).textContent || "";
      }
      const item = slide ? shortName(slide.getAttribute("aria-label") || (slide.querySelector("h2,h3,h4") || {}).textContent) : "";
      return { kind:"carousel", name: shortName(name), item, el: carousel };
    }
    return null;
  }

  // Último clique fora do modo comentário: é o que abriu o popup aberto agora.
  let lastClick = null;
  document.addEventListener("click", (e)=>{
    const t = e.target && e.target.closest && e.target.closest("button,a,[role=button],[aria-controls],[aria-haspopup],[onclick],img,figure,[tabindex]");
    if (t && t.isConnected) lastClick = { el: t, at: Date.now() };
  }, true);

  function anchorAt(vx, vy){
    hideOutline();
    const el = meaningful(document.elementFromPoint(vx, vy));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const ctx = context(el);
    const a = { sel: cssPath(el), text: clean(el.innerText || el.textContent, 60), tag: el.localName,
      label: describe(el), fx: r.width ? (vx - r.left) / r.width : 0, fy: r.height ? (vy - r.top) / r.height : 0,
      ew: r.width, eh: r.height };
    if (ctx) { a.ctx = ctx.kind; if (ctx.name) a.ctxName = ctx.name; if (ctx.item) a.ctxItem = ctx.item; }
    if (ctx && ctx.kind === "popup" && lastClick && Date.now() - lastClick.at < 10 * 60 * 1000 && !ctx.el.contains(lastClick.el) && lastClick.el.isConnected) {
      a.opener = cssPath(lastClick.el); a.openerText = clean(lastClick.el.innerText || lastClick.el.getAttribute("aria-label") || lastClick.el.getAttribute("alt"), 40);
    }
    return a;
  }

  // Encontra o componente: pelo seletor e, se o texto não bater, pelo texto no mesmo tipo de elemento.
  const resolved = new Map();
  function resolve(a){
    const cached = resolved.get(a.id);
    if (cached && cached.isConnected) return cached;
    let el = null;
    try{ el = document.querySelector(a.sel); }catch(e){}
    const same = (e)=>!a.text || clean(e.innerText || e.textContent, 60) === a.text;
    if (el && !same(el)) el = null;
    if (!el && a.text && a.tag) {
      try{ el = Array.prototype.find.call(document.getElementsByTagName(a.tag), same) || null; }catch(e){}
    }
    if (!el) { try{ el = document.querySelector(a.sel); }catch(e){} } // sem texto igual: posição no DOM
    if (el) resolved.set(a.id, el);
    return el;
  }

  // Visível = existe, tem tamanho, nenhum ancestral oculto, dentro dos recortes de
  // overflow (carrossel) e não coberto por outro elemento (popup por cima).
  function place(a){
    const el = resolve(a);
    if (!el) return { id:a.id, found:false, visible:false };
    const r = el.getBoundingClientRect();
    const px = r.left + (a.fx || 0) * r.width, py = r.top + (a.fy || 0) * r.height;
    const out = { id:a.id, found:true, visible:false, x:px, y:py, w:(a.fw || 0) * r.width, h:(a.fh || 0) * r.height };
    if (r.width < 1 || r.height < 1) return out;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return out;
      if (e !== el && /(hidden|clip|auto|scroll)/.test(cs.overflowX + cs.overflowY)) {
        const ar = e.getBoundingClientRect();
        if (px < ar.left - 1 || px > ar.right + 1 || py < ar.top - 1 || py > ar.bottom + 1) return out;
      }
      if (e.localName === "dialog" && !e.open) return out;
    }
    if (px >= 0 && py >= 0 && px < innerWidth && py < innerHeight) {
      const hit = document.elementFromPoint(px, py);
      if (hit && hit !== outline && !(el.contains(hit) || hit.contains(el))) return out;
    }
    out.visible = true;
    return out;
  }

  let anchors = [], lastSent = "";
  function track(){
    if (!anchors.length) { if (lastSent) { lastSent = ""; post({ type:"anchors", items:[] }); } return; }
    const items = anchors.map(place);
    const key = items.map(i => i.id + (i.visible ? 1 : 0) + Math.round(i.x || 0) + "," + Math.round(i.y || 0) + "," + Math.round(i.w || 0) + "," + Math.round(i.h || 0)).join("|");
    if (key !== lastSent) { lastSent = key; post({ type:"anchors", items }); }
  }
  // Acompanha animações (carrosséis, faixas em movimento) a cada quadro; com o iframe
  // fora da tela o rAF para e o intervalo mantém a atualização.
  (function loop(){ track(); requestAnimationFrame(loop); })();
  setInterval(track, 250);

  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));
  async function reveal(a){
    let el = resolve(a);
    if (el && place(a).visible) { el.scrollIntoView({ block:"center", inline:"nearest", behavior:"smooth" }); return true; }
    if (a.opener && !(el && place(a).visible)) {
      let op = null; try{ op = document.querySelector(a.opener); }catch(e){}
      if (op) { op.scrollIntoView({ block:"center" }); await sleep(150); op.click(); await sleep(450); resolved.delete(a.id); el = resolve(a); }
    }
    if (el) {
      // carrossel com rolagem lateral: inline "center" leva o card para a área visível
      el.scrollIntoView({ block:"center", inline:"center" });
      await sleep(400);
      if (!place(a).visible && a.ctx === "carousel") {
        const ctx = context(el), box = ctx && ctx.el.closest("section,[role=region]") || (ctx && ctx.el.parentElement);
        const next = box && Array.prototype.find.call(box.querySelectorAll("button,[role=button]"), b=>/pr[oó]x|next|avan|seguinte|›|→|>/i.test((b.getAttribute("aria-label") || "") + " " + clsOf(b) + " " + b.textContent));
        for (let i = 0; next && i < 15 && !place(a).visible; i++) { next.click(); await sleep(380); }
      }
    }
    return !!(el && place(a).visible);
  }

  // ================= destaque do componente (modo comentário) =================
  let outline = null, outlineLabel = null;
  function showOutline(vx, vy){
    const el = meaningful(document.elementFromPoint(vx, vy));
    if (!el) { hideOutline(); return; }
    if (!outline) {
      outline = document.createElement("div");
      outline.setAttribute("aria-hidden", "true");
      outline.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #CCB691;border-radius:4px;background:rgba(204,182,145,.10);box-shadow:0 0 0 1px rgba(0,0,0,.35);transition:all .08s ease-out;box-sizing:border-box";
      outlineLabel = document.createElement("div");
      outlineLabel.style.cssText = "position:absolute;left:-2px;bottom:100%;margin-bottom:3px;background:#CCB691;color:#1b1a13;font:700 11px/1.2 Inter,system-ui,sans-serif;padding:3px 7px;border-radius:4px;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis";
      outline.appendChild(outlineLabel);
      document.documentElement.appendChild(outline);
    }
    const r = el.getBoundingClientRect(), ctx = context(el);
    Object.assign(outline.style, { display:"block", left:r.left + "px", top:r.top + "px", width:r.width + "px", height:r.height + "px" });
    const where = ctx ? (ctx.kind === "popup" ? "Popup" : "Carrossel") + (ctx.name ? " · " + ctx.name : "") + " › " : "";
    outlineLabel.textContent = where + (ctx && ctx.item ? "card " + ctx.item + " › " : "") + describe(el);
    outlineLabel.style.top = r.top < 22 ? "100%" : "";
    outlineLabel.style.bottom = r.top < 22 ? "auto" : "100%";
  }
  function hideOutline(){ if (outline) outline.style.display = "none"; }

  // ================= links =================
  // Internos voltam ao grid; externos abrem em nova aba (o iframe não sai da revisão).
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

  // ================= mensagens do grid =================
  window.addEventListener("message", async (e)=>{
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
    else if (m.type === "hover") showOutline(m.x, m.y);
    else if (m.type === "hoverEnd") hideOutline();
    else if (m.type === "pick") post({ type:"picked", req: m.req, anchor: anchorAt(m.x, m.y) });
    else if (m.type === "anchors") { anchors = Array.isArray(m.items) ? m.items.filter(a => a && a.id && a.sel) : []; resolved.clear(); lastSent = "x"; track(); }
    else if (m.type === "reveal") {
      const a = anchors.find(x => x.id === m.id);
      const ok = a ? await reveal(a) : false;
      lastSent = "x"; track();
      post({ type:"revealed", id: m.id, ok });
    }
  });

  post({ type:"hello", path: base.pathname });
})();
