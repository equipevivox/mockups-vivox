const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const cfg = require('../config.js');
const context = { window: { VIVOX_CFG: cfg, supabase: { createClient: () => ({}) } } };
vm.runInNewContext(fs.readFileSync(require.resolve('../common.js'), 'utf8'), context);
const { materialPageUrl } = context.window.VX;
test('URLs legadas mantêm versão de capa; novos materiais usam a pasta R2 em todas as páginas', () => {
  const m = { id: 'TESTE', cover_version: 'versao' };
  assert.equal(materialPageUrl(m, 0), cfg.SUPABASE_URL + '/storage/v1/object/public/mockups/TESTE/pages/0.jpg?cacheNonce=versao');
  m.r2_prefix = 'materials/TESTE/11111111-1111-1111-1111-111111111111';
  assert.equal(materialPageUrl(m, 3), cfg.R2_PUBLIC_URL + '/' + m.r2_prefix + '/pages/3.jpg');
  assert.notEqual(materialPageUrl({ ...m, r2_prefix: m.r2_prefix.replaceAll('1', '2') }, 0), materialPageUrl(m, 0));
});
test('prefixos inválidos ou de outro material não entram nas URLs das imagens', () => {
  for (const r2_prefix of ['https://externo.invalid/x', '../arquivo', 'materials/OUTRO/11111111-1111-1111-1111-111111111111']) {
    assert.ok(materialPageUrl({ id: 'TESTE', r2_prefix }, 0).startsWith(cfg.SUPABASE_URL));
  }
});
