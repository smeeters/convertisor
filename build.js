// node build.js  ->  dist/ (sans dépendance)
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src');
const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(src, 'main.js'), path.join(dist, 'plugin.js'));
for (const f of ['index.html', 'ui.js', 'ui.css', 'manifest.json', 'icon.png', '_headers', 'CORS']) {
  const p = path.join(src, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dist, f));
}
console.log('dist/ prêt');
