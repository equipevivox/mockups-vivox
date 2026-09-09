// Servidor local com a mesma API e somente os assets públicos permitidos.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { root, output } = require('./build-static.cjs');
const envFile = path.join(root, '.env.r2.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const storage = require('../api/storage.js');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    let url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/api/storage') {
      const parts = []; let length = 0;
      for await (const part of req) { length += part.length; if (length > 15000) { res.writeHead(413); res.end(); return; } parts.push(part); }
      req.body = Buffer.concat(parts).toString();
      return await storage(req, res);
    }
    if (url === '/' || url === '/portfolio') url = '/index.html';
    if (url === '/admin') url = '/admin.html';
    if (/^\/m\/[^/]+$/.test(url)) url = '/viewer.html';
    const file = path.resolve(output, '.' + decodeURIComponent(url));
    if (!file.startsWith(output + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Não encontrado'); return; }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(500); res.end('Erro local'); }
}).listen(8130, '127.0.0.1', () => console.log('VIVOX local: http://127.0.0.1:8130 (reexecute após alterar arquivos)'));
