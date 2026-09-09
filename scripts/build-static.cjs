// Copia somente arquivos públicos. Servidor, documentação e segredos não viram assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const files = [
  'index.html', 'admin.html', 'viewer.html', 'config.js', 'common.js',
  'admin.js', 'viewer.js', 'portfolio.js', 'portfolio-background.js', 'theme.js',
  'style.css', 'ui.css', 'portfolio-background.css', 'pdf.worker.min.js',
  'assets', 'lib'
];
fs.mkdirSync(output, { recursive: true });
for (const file of files) fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });
module.exports = { root, output, files };
