/* VIVOX · Proxy de revisão de landing pages (função da Vercel, sem dependências)
 *
 * GET /api/lp?m=SLUG&p=/caminho/  → devolve o HTML da LP com <base> apontando para o
 *   site original (os arquivos continuam vindo de lá) e o script /lp-review.js injetado.
 *   A LP original não é alterada: só esta cópia, entregue ao grid, recebe o script.
 * GET /api/lp?m=SLUG&a=/arquivo   → repassa um arquivo da LP com CORS liberado (fetch/XHR
 *   da LP, como o modelo 3D .glb, que o navegador bloquearia vindo da cópia).
 * GET /api/lp?descobrir=URL        → lista as páginas internas encontradas na URL.
 *
 * O endereço da LP vem de {slug}/landing.json no Storage, nunca da requisição. A cópia
 * é servida com CSP sandbox (origem opaca), então o código da LP não acessa o grid.
 */
"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kthestvyzvbbpnsulned.supabase.co";
const BUCKET = process.env.SUPABASE_BUCKET || "mockups";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 VIVOX-Revisao";
const MAX_HTML = 6 * 1024 * 1024;
const MAX_ASSET = 4 * 1024 * 1024; // limite de resposta das funções da Vercel é 4,5 MB
const SANDBOX = "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads";

const cache = new Map(); // slug -> { at, value }

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}
function sendError(res, status, msg) {
  send(res, status, `<!DOCTYPE html><meta charset="utf-8"><body style="font:15px Inter,system-ui,sans-serif;background:#000;color:#ccb691;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><p>${escHtml(msg)}</p>`,
    { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": SANDBOX, "Cache-Control": "no-store" });
}
function escHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// Só endereços públicos http(s): evita usar o proxy para alcançar redes internas.
function publicHttpUrl(value) {
  let u;
  try { u = new URL(String(value)); } catch (e) { return null; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.startsWith("[")) return null; // sem IP literal
  return u;
}

async function landingConfig(slug) {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < 60000) return hit.value;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(slug)}/landing.json?t=${Date.now()}`);
  if (!r.ok) return null;
  const data = await r.json().catch(() => null);
  const base = data && publicHttpUrl(data.url);
  const value = base ? { url: base } : null;
  cache.set(slug, { at: Date.now(), value });
  return value;
}

async function fetchHtml(url) {
  const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9" } });
  const type = r.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/i.test(type)) return { ok: false, status: r.status, final: r.url, html: "" };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_HTML) return { ok: false, status: 413, final: r.url, html: "" };
  return { ok: r.ok, status: r.status, final: r.url, html: buf.toString("utf8") };
}

// Injeta <base> (os caminhos da LP, inclusive "/_next/...", resolvem no site original)
// e o script de revisão. Remove <base> e CSP em meta que impediriam isso.
function injectReview(html, finalUrl, reviewSrc) {
  let out = html.replace(/<base\b[^>]*>/gi, "")
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  const tags = `<base href="${escHtml(finalUrl)}"><script src="${escHtml(reviewSrc)}"></script>`;
  if (/<head\b[^>]*>/i.test(out)) out = out.replace(/<head\b[^>]*>/i, m => m + tags);
  else out = tags + out;
  return out;
}

// Links internos (mesmo host, sem âncora, sem arquivos) para sugerir as páginas da LP.
function discoverPages(html, finalUrl) {
  const base = new URL(finalUrl), seen = new Map();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  seen.set("/", { path: "/", title: "Home" });
  const re = /<a\b[^>]*href=["']([^"'#]+)(?:#[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let u; try { u = new URL(m[1], base); } catch (e) { continue; }
    if (u.host !== base.host || /\.(pdf|jpe?g|png|webp|gif|svg|zip|mp4|docx?|xlsx?)$/i.test(u.pathname)) continue;
    const path = u.pathname || "/";
    if (seen.has(path)) continue;
    // Primeiro bloco de texto do link (cartões costumam ter título e subtítulo).
    const chunks = m[2].split(/<[^>]+>/).map(t => t.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()).filter(t => t.length > 1);
    const text = chunks[0] || "";
    const fallback = path.replace(/\/+$/, "").split("/").pop().replace(/[-_]+/g, " ");
    seen.set(path, { path, title: (text.length > 2 && text.length < 60 ? text : fallback).replace(/^./, c => c.toUpperCase()) });
    if (seen.size >= 30) break;
  }
  return { url: base.origin + "/", title: title ? title.replace(/\s+/g, " ").trim() : "", pages: [...seen.values()] };
}

module.exports = async function handler(req, res) {
  const q = new URL(req.url, "http://localhost").searchParams;
  try {
    if (q.has("descobrir")) {
      const u = publicHttpUrl(q.get("descobrir"));
      if (!u) return send(res, 400, JSON.stringify({ error: "Informe uma URL pública começando com https://" }), { "Content-Type": "application/json" });
      const page = await fetchHtml(u.href);
      if (!page.html) return send(res, 502, JSON.stringify({ error: "O endereço não devolveu uma página HTML (status " + page.status + ")." }), { "Content-Type": "application/json" });
      return send(res, 200, JSON.stringify(discoverPages(page.html, page.final)), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    }

    const slug = q.get("m") || "";
    if (!/^[A-Z0-9_]{1,120}$/.test(slug)) return sendError(res, 400, "Material inválido.");
    let path = q.get("p") || "/";
    if (!path.startsWith("/") || path.startsWith("//")) path = "/";
    const cfg = await landingConfig(slug);
    if (!cfg) return sendError(res, 404, "Esta landing page não foi encontrada.");

    if (q.has("a")) {
      const asset = new URL(q.get("a") || "/", cfg.url);
      if (asset.host !== cfg.url.host) return send(res, 400, "", { "Access-Control-Allow-Origin": "*" });
      const r = await fetch(asset.href, { headers: { "User-Agent": UA } });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_ASSET) return send(res, 413, "", { "Access-Control-Allow-Origin": "*" });
      return send(res, r.status, buf, {
        "Content-Type": r.headers.get("content-type") || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": SANDBOX,
        "Cache-Control": r.ok ? "public, max-age=300, s-maxage=3600" : "no-store",
      });
    }

    const target = new URL(path, cfg.url);
    if (target.host !== cfg.url.host) return sendError(res, 400, "Página fora da landing page.");

    const page = await fetchHtml(target.href);
    if (!page.html) return sendError(res, 502, "A landing page não respondeu com uma página (status " + page.status + ").");
    const finalUrl = publicHttpUrl(page.final) ? page.final : target.href;
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const reviewSrc = `${host && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : proto}://${host}/lp-review.js?v=20261126-2&m=${slug}`;
    return send(res, page.status === 404 ? 404 : 200, injectReview(page.html, finalUrl, reviewSrc), {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": SANDBOX,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 502, "Não foi possível carregar a landing page.");
  }
};
module.exports._test = { injectReview, discoverPages, publicHttpUrl };
