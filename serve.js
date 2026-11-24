// node serve.js [port]  ->  sert dist/ avec les en-têtes CORS requis par Penpot
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = +process.argv[2] || 4400;
const root = path.join(__dirname, 'dist');
const types = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Manifest : http://localhost:${port}/manifest.json`));
