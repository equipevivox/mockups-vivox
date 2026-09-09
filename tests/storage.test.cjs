const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { createHandler } = require('../server/storage.cjs');
const { createAuth } = require('../server/auth.cjs');
const { createAdapters } = require('../server/adapters.cjs');
const cfg = require('../config.js');
const env = { SESSION_SECRET: 'segredo-somente-para-teste', ADMIN_PASSWORD_SHA256: createHash('sha256').update('senha-de-teste').digest('hex'), NODE_ENV: 'production' };
function setup() {
  let row = { id: 'TESTE', name: 'Nome editado', num_pages: 2, aspect: 1.4, is_public: true, cover_version: randomUUID(), r2_prefix: null };
  const files = new Map(), removed = [], saved = [], comments = [], legacyRemoved = [];
  const db = {
    get: async id => row?.id === id ? { ...row } : null,
    save: async (data, previous) => {
      assert.equal(row?.cover_version || null, previous); saved.push(data);
      const { name, ...patch } = data;
      row = row ? { ...row, ...patch, cover_version: randomUUID() } : { ...data, is_public: false, cover_version: randomUUID() };
      return row;
    },
    comments: async () => comments,
    deleteComment: async id => { removed.push('comment:' + id); },
    removeLegacy: async paths => legacyRemoved.push(...paths),
    removeLegacyFolder: async prefix => legacyRemoved.push(prefix),
    deleteMaterial: async id => { assert.equal(id, row.id); row = null; }
  };
  const r2 = {
    sign: async (key, type, size) => { files.set(key, { ContentType: type, ContentLength: size }); return 'https://upload.invalid/' + key; },
    head: async key => { if (!files.has(key)) throw new Error('missing'); return files.get(key); },
    remove: async keys => { removed.push(...keys); },
    removePrefix: async prefix => { removed.push(prefix); }
  };
  const handler = createHandler({ env, db, r2 });
  async function call(action, body = {}, cookie, headers = {}) {
    const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(v) { this.data = JSON.parse(v); } };
    await handler({ method: 'POST', headers: { origin: 'https://grid.vivoxmarketing.com.br', 'content-type': 'application/json', cookie, ...headers }, body: { ...body, action } }, response);
    return response;
  }
  const cookie = 'vivox_session=' + createAuth(env).issue({ kind: 'admin' }, 1000);
  const start = () => call('upload-start', { slug: 'TESTE', name: 'teste.pdf', num_pages: 2, aspect: 1.4, type: 'revista' }, cookie);
  return { call, cookie, start, files, saved, removed, comments, legacyRemoved, get row() { return row; }, set row(v) { row = v; } };
}
test('uploads exigem sessão assinada; login não aceita o hash como senha e usa cookie protegido', async () => {
  const s = setup();
  assert.equal((await s.start()).statusCode, 200);
  assert.equal((await s.call('upload-start', {}, 'vivox_admin=1')).statusCode, 401);
  assert.equal((await s.call('login', { user: 'VIVOX', password: env.ADMIN_PASSWORD_SHA256 })).statusCode, 401);
  const login = await s.call('login', { user: 'vivox', password: 'senha-de-teste' });
  assert.equal(login.statusCode, 200);
  assert.match(login.headers['Set-Cookie'], /HttpOnly; SameSite=Strict.*Secure/);
  assert.equal((await s.call('session', {}, login.headers['Set-Cookie'])).data.authenticated, true);
  assert.equal((await s.call('session', {}, s.cookie + 'x')).data.authenticated, false);
  assert.equal((await s.call('session', {}, s.cookie, { origin: 'https://site-externo.invalid' })).statusCode, 403);
  assert.equal((await s.call('session', {}, s.cookie, { 'content-type': 'text/plain' })).statusCode, 415);
  for (let i = 0; i < 10; i++) await s.call('login', { user: 'VIVOX', password: 'incorreta' });
  assert.equal((await s.call('login', { user: 'VIVOX', password: 'incorreta' })).statusCode, 429);
});
test('reenvio incompleto preserva os links; envio completo mantém nome/publicação e repetição é idempotente', async () => {
  const s = setup(), old = { ...s.row }, ticket = (await s.start()).data.ticket;
  assert.equal((await s.call('upload-complete', { ticket }, s.cookie)).statusCode, 409);
  assert.deepEqual(s.row, old); assert.equal(s.saved.length, 0);
  for (let index = 0; index < 2; index++) assert.equal((await s.call('upload-sign', { ticket, index, size: 100 }, s.cookie)).statusCode, 200);
  assert.equal((await s.call('upload-complete', { ticket }, s.cookie)).statusCode, 200);
  assert.equal(s.row.name, old.name); assert.equal(s.row.is_public, old.is_public);
  assert.match(s.row.r2_prefix, /^materials\/TESTE\//);
  assert.notEqual(s.row.cover_version, old.cover_version);
  assert.equal((await s.call('upload-complete', { ticket }, s.cookie)).statusCode, 200);
  assert.equal(s.saved.length, 1); assert.equal(s.removed.length, 0);
});
test('assinatura recusa caminhos, páginas, tamanhos, tipos e tickets inválidos', async () => {
  const s = setup(), ticket = (await s.start()).data.ticket;
  for (const index of [-1, 2, '../photos/x', 0.5]) assert.equal((await s.call('upload-sign', { ticket, index, size: 100 }, s.cookie)).statusCode, 400);
  for (const size of [0, -1, 7 * 1024 * 1024 + 1]) assert.equal((await s.call('upload-sign', { ticket, index: 0, size }, s.cookie)).statusCode, 400);
  assert.equal((await s.call('upload-sign', { ticket: ticket + 'x', index: 0, size: 100 }, s.cookie)).statusCode, 401);
  const expired = createAuth(env).issue({ kind: 'upload' }, -1);
  assert.equal((await s.call('upload-sign', { ticket: expired }, s.cookie)).statusCode, 401);
  assert.equal((await s.call('upload-start', { slug: '../TESTE' }, s.cookie)).statusCode, 400);
  assert.equal((await s.call('photo-sign', { slug: 'TESTE', size: 100, type: 'image/svg+xml' })).statusCode, 400);
  assert.equal((await s.call('photo-sign', { slug: 'AUSENTE', size: 100, type: 'image/png' })).statusCode, 404);
});
test('envios concorrentes não substituem a versão mais recente', async () => {
  const s = setup(), a = (await s.start()).data.ticket, b = (await s.start()).data.ticket;
  for (const ticket of [a, b]) for (let index = 0; index < 2; index++) await s.call('upload-sign', { ticket, index, size: 100 }, s.cookie);
  assert.equal((await s.call('upload-complete', { ticket: b }, s.cookie)).statusCode, 200);
  const prefix = s.row.r2_prefix;
  assert.equal((await s.call('upload-complete', { ticket: a }, s.cookie)).statusCode, 409);
  assert.equal(s.row.r2_prefix, prefix);
});
test('novos materiais nascem privados com nome original e fotos de revisão usam o R2', async () => {
  const s = setup(); s.row = null;
  const ticket = (await s.start()).data.ticket;
  for (let index = 0; index < 2; index++) await s.call('upload-sign', { ticket, index, size: 100 }, s.cookie);
  assert.equal((await s.call('upload-complete', { ticket }, s.cookie)).statusCode, 200);
  assert.equal(s.row.name, 'teste.pdf'); assert.equal(s.row.is_public, false);
  const photo = await s.call('photo-sign', { slug: 'TESTE', type: 'image/png', size: 100 });
  assert.equal(photo.statusCode, 200); assert.match(photo.data.url, /\.r2\.dev\/comments\/TESTE\/.*\.png$/);
});
test('exclusão de comentários remove fotos da thread nos dois provedores sem aceitar URLs arbitrárias', async () => {
  const s = setup(), filename = randomUUID() + '.png';
  s.comments.push({ id: 'root', mockup_id: 'TESTE', photos: [cfg.R2_PUBLIC_URL + '/comments/TESTE/' + filename,
    cfg.R2_PUBLIC_URL + '/materials/TESTE/' + filename, cfg.R2_PUBLIC_URL + '/comments/OUTRO/' + filename] });
  s.comments.push({ id: 'reply', parent_id: 'root', mockup_id: 'TESTE', photos: [cfg.SUPABASE_URL + '/storage/v1/object/public/mockups/TESTE/photos/legado.jpg'] });
  s.comments.push({ id: 'unrelated', mockup_id: 'TESTE', photos: [cfg.R2_PUBLIC_URL + '/comments/TESTE/' + randomUUID() + '.jpg'] });
  assert.equal((await s.call('comment-delete', { slug: 'TESTE', id: 'root' })).statusCode, 200);
  assert.deepEqual(s.removed, ['comments/TESTE/' + filename, 'comment:root']);
  assert.deepEqual(s.legacyRemoved, ['TESTE/photos/legado.jpg']);
});
test('exclusão do material exige a versão atual e fica limitada às suas pastas', async () => {
  const s = setup();
  assert.equal((await s.call('material-delete', { slug: 'TESTE', version: 'antiga' }, s.cookie)).statusCode, 409);
  assert.equal(s.removed.length, 0);
  assert.equal((await s.call('material-delete', { slug: 'TESTE', version: s.row.cover_version }, s.cookie)).statusCode, 200);
  assert.deepEqual(s.removed, ['materials/TESTE/', 'comments/TESTE/']);
  assert.deepEqual(s.legacyRemoved, ['TESTE/pages', 'TESTE/photos']); assert.equal(s.row, null);
});
test('presigned PUT vincula chave, tipo, tamanho e prazo sem entregar a chave secreta', async () => {
  const { r2 } = createAdapters({ R2_BUCKET: 'test', R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'teste', R2_SECRET_ACCESS_KEY: 'segredo-r2-somente-teste' });
  const url = new URL(await r2.sign('materials/TESTE/versao/pages/0.jpg', 'image/jpeg', 123));
  assert.equal(url.pathname, '/test/materials/TESTE/versao/pages/0.jpg');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600');
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-length;content-type/);
  assert.ok(!url.href.includes('segredo-r2-somente-teste'));
});
