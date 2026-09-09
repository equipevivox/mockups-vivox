const { randomUUID } = require('node:crypto');
const { createAuth, fail } = require('./auth.cjs');
const cfg = require('../config.js');
const SLUG = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const MAX_PAGE = 7 * 1024 * 1024;
const MAX_PHOTO = 10 * 1024 * 1024;
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
function slug(value) {
  if (typeof value !== 'string' || value.length > 200 || !SLUG.test(value)) throw fail(400, 'Nome de arquivo inválido. Use até 200 caracteres.');
  return value;
}
function size(value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) throw fail(400, `A imagem deve ter até ${max / 1024 / 1024} MB.`);
  return value;
}
function createHandler({ env, db, r2 }) {
  const auth = createAuth(env);
  const attempts = new Map();
  const origins = new Set(['https://grid.vivoxmarketing.com.br', 'https://mockups-vivox.vercel.app']);
  if (env.VERCEL_URL) origins.add('https://' + env.VERCEL_URL);
  if (!env.VERCEL && env.NODE_ENV !== 'production') {
    origins.add('http://127.0.0.1:8130'); origins.add('http://localhost:8130');
  }
  function limit(req, action, max) {
    // Proteção básica por instância; o limite global deve ser feito no Firewall.
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0];
    const now = Date.now(), key = action + ':' + ip;
    for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
    const row = attempts.get(key) || { count: 0, until: now + 60000 };
    row.count++; attempts.set(key, row);
    if (row.count > max) throw fail(429, 'Muitas tentativas. Aguarde um minuto e tente novamente.');
  }
  async function material(id) {
    const row = await db.get(slug(id));
    if (!row) throw fail(404, 'Material não encontrado.');
    return row;
  }
  function ticket(value) {
    const data = auth.read(value, 'upload');
    if (!data) throw fail(401, 'O prazo do envio terminou. Envie o PDF novamente.');
    return data;
  }
  async function removePhotos(rows) {
    const r2Keys = [], legacy = [];
    for (const row of rows) {
      const id = slug(row.mockup_id);
      const base = cfg.R2_PUBLIC_URL + '/comments/' + id + '/';
      const oldBase = cfg.SUPABASE_URL + '/storage/v1/object/public/' + cfg.BUCKET + '/' + id + '/photos/';
      for (const url of Array.isArray(row.photos) ? row.photos : []) {
        if (typeof url !== 'string') continue;
        const filename = url.startsWith(base) ? url.slice(base.length) : '';
        if (/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(filename)) r2Keys.push('comments/' + id + '/' + filename);
        const oldName = url.startsWith(oldBase) ? url.slice(oldBase.length) : '';
        if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(oldName)) legacy.push(id + '/photos/' + oldName);
      }
    }
    await r2.remove([...new Set(r2Keys)]);
    await db.removeLegacy([...new Set(legacy)]);
  }
  async function action(req, res, body) {
    const name = body.action;
    if (name === 'login') {
      limit(req, name, 10);
      if (!auth.login(body.user, body.password)) throw fail(401, 'Usuário ou senha inválidos.');
      auth.setCookie(res, auth.issue({ kind: 'admin' }, 43200));
      return { ok: true };
    }
    if (name === 'session') return { authenticated: !!auth.session(req) };
    if (name === 'logout') { auth.setCookie(res, ''); return { ok: true }; }
    if (name === 'photo-sign') {
      limit(req, name, 30);
      await material(body.slug);
      const ext = PHOTO_TYPES[body.type];
      if (!ext) throw fail(400, 'Use imagens JPG, PNG, WebP ou GIF.');
      const bytes = size(body.size, MAX_PHOTO), key = `comments/${body.slug}/${randomUUID()}.${ext}`;
      return { uploadUrl: await r2.sign(key, body.type, bytes), url: cfg.R2_PUBLIC_URL + '/' + key };
    }
    if (name === 'comment-delete') {
      // Mantém a revisão por link, já existente; nunca aceita caminhos enviados pelo cliente.
      limit(req, name, 30);
      await material(body.slug);
      const all = await db.comments(body.slug), target = all.find(c => c.id === body.id);
      if (!target) throw fail(404, 'Comentário não encontrado.');
      const ids = new Set([target.id]);
      let count;
      do { count = ids.size; for (const c of all) if (ids.has(c.parent_id)) ids.add(c.id); } while (count !== ids.size);
      await removePhotos(all.filter(c => ids.has(c.id)));
      await db.deleteComment(target.id);
      return { ok: true };
    }
    if (!auth.session(req)) throw fail(401, 'Sua sessão terminou. Entre novamente no painel.');
    if (name === 'upload-start') {
      const id = slug(body.slug), n = body.num_pages;
      if (!Number.isInteger(n) || n < 1 || n > 500) throw fail(400, 'Envie um PDF com 1 a 500 páginas.');
      if (!Number.isFinite(body.aspect) || body.aspect <= 0 || body.aspect > 20) throw fail(400, 'Tamanho de página inválido.');
      if (!['revista', 'mockup', 'folder'].includes(body.type)) throw fail(400, 'Tipo de material inválido.');
      if (body.type === 'folder' && n !== 2) throw fail(400, 'Folder precisa de exatamente 2 páginas.');
      if (body.type === 'mockup' && Math.abs(body.aspect - 297 / 210) > 0.03) throw fail(400, 'Mockups precisam ser A4 retrato.');
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 255) throw fail(400, 'Nome de arquivo inválido.');
      const old = await db.get(id);
      return { ticket: auth.issue({ kind: 'upload', id, prefix: `materials/${id}/${randomUUID()}`,
        previous: old?.cover_version || null, name: body.name, num_pages: n, aspect: body.aspect, type: body.type }, 7200) };
    }
    if (name === 'upload-sign') {
      const data = ticket(body.ticket);
      if (!Number.isInteger(body.index) || body.index < 0 || body.index >= data.num_pages) throw fail(400, 'Página inválida.');
      return { uploadUrl: await r2.sign(`${data.prefix}/pages/${body.index}.jpg`, 'image/jpeg', size(body.size, MAX_PAGE)) };
    }
    if (name === 'upload-complete') {
      const data = ticket(body.ticket), current = await db.get(data.id);
      if (current?.r2_prefix === data.prefix) return { id: data.id }; // Repetição após perda da resposta.
      if ((current?.cover_version || null) !== data.previous) throw fail(409, 'Outro envio alterou este material. Atualize a lista e tente novamente.');
      // Só troca os links depois de confirmar todas as páginas, em lotes pequenos.
      for (let i = 0; i < data.num_pages; i += 8) {
        await Promise.all(Array.from({ length: Math.min(8, data.num_pages - i) }, async (_, offset) => {
          let page;
          try { page = await r2.head(`${data.prefix}/pages/${i + offset}.jpg`); }
          catch { throw fail(409, 'Ainda faltam páginas no envio. Envie o PDF novamente.'); }
          if (page.ContentType !== 'image/jpeg' || !page.ContentLength || page.ContentLength > MAX_PAGE) {
            throw fail(400, 'Uma página enviada é inválida. Envie o PDF novamente.');
          }
        }));
      }
      await db.save({ id: data.id, name: data.name, num_pages: data.num_pages, aspect: data.aspect,
        type: data.type, expires_at: null, r2_prefix: data.prefix }, data.previous);
      return { id: data.id };
    }
    if (name === 'material-delete') {
      const row = await material(body.slug);
      if (body.version !== row.cover_version) throw fail(409, 'O material mudou. Atualize a lista antes de excluir.');
      await r2.removePrefix(`materials/${row.id}/`);
      await r2.removePrefix(`comments/${row.id}/`);
      await db.removeLegacyFolder(`${row.id}/pages`);
      await db.removeLegacyFolder(`${row.id}/photos`);
      await db.deleteMaterial(row.id);
      return { ok: true };
    }
    throw fail(400, 'Operação inválida.');
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      if (req.method !== 'POST') throw fail(405, 'Use POST.');
      if (!origins.has(req.headers.origin)) throw fail(403, 'Origem não permitida.');
      if (!String(req.headers['content-type']).startsWith('application/json')) throw fail(415, 'Envie JSON.');
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw fail(400, 'Dados inválidos.'); } }
      if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 15000) throw fail(400, 'Dados inválidos.');
      const result = await action(req, res, body);
      res.statusCode = 200; res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error.status || 502;
      // Não registra URLs assinadas, cookies, senhas nem respostas brutas do SDK.
      res.end(JSON.stringify({ error: error.status ? error.message : 'Não foi possível acessar os arquivos. Tente novamente.' }));
    }
  };
}
module.exports = { createHandler };
