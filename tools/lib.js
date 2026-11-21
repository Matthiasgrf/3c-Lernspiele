/* Gemeinsame Helfer für die Werkzeuge in tools/. Keine Abhängigkeiten außer Node. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const GAMES_JS = path.join(ROOT, 'games.js');

/* games.js ist ein Browser-Skript (window.GAMES = [...]) – hier wird es ohne Browser gelesen. */
function loadGames() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(GAMES_JS, 'utf8'), sandbox, { filename: 'games.js' });
  return sandbox.window.GAMES;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

/* Kleiner Webserver für das Repository, verhält sich wie GitHub Pages (index.html, 404.html). */
function startServer() {
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { rel = '/'; }
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    let status = 200;
    if (!fs.existsSync(file)) { status = 404; file = path.join(ROOT, '404.html'); }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' }));
  });
}

/* Arbeitet eine Liste mit höchstens `limit` gleichzeitigen Aufgaben ab, Ergebnisse in der Reihenfolge der Liste.
   Die Browser-Tests laufen so mehrere Spiele gleichzeitig und sind deutlich schneller fertig. */
async function parallel(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

/* Wie viele Spiele gleichzeitig getestet werden: --parallel <n> oder Umgebungsvariable PARALLEL, sonst nach CPU-Kernen. */
function parallelLimit(args) {
  const i = args.indexOf('--parallel');
  if (i >= 0) { const n = Number(args[i + 1]); args.splice(i, 2); if (n > 0) return n; }
  if (Number(process.env.PARALLEL) > 0) return Number(process.env.PARALLEL);
  return Math.max(1, Math.min(4, require('os').cpus().length));
}

module.exports = { ROOT, GAMES_DIR, GAMES_JS, loadGames, startServer, parallel, parallelLimit };
