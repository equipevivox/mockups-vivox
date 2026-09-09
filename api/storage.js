const { createHandler } = require('../server/storage.cjs');
const { createAdapters } = require('../server/adapters.cjs');
let handler;
module.exports = async function storage(req, res) {
  try {
    if (!handler) handler = createHandler({ env: process.env, ...createAdapters(process.env) });
    return await handler(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'O armazenamento ainda não está configurado.' }));
  }
};
