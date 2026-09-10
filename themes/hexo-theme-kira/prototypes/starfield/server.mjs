import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Deliberately outside theme/source: this experiment is never part of Hexo output.
if (process.env.NODE_ENV === 'production') throw new Error('This prototype is local-only.');
const root = path.dirname(fileURLToPath(import.meta.url));
const base = '/pages/starfield-prototype/';
const files = new Set(['index.html', 'style.css', 'app.js', 'mock.js', 'art.js', 'assets/sky-reference-v2.png', 'assets/rooftop-v2.png', 'assets/roof-silhouette-v2.svg']);
for(const style of ['anime','minimal','paper','pixel'])files.add(`assets/roof-${style}-v4.png`);
files.add('art-study.js');files.add('navigation.js');
files.add('assets/roof-stargazer-v9.png');
files.add('painted.js');files.add('painted.css');
files.add('assets/room-reference-v11.png');files.add('assets/painted-sky-v11.png');
files.add('assets/room-portrait-v11.png');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === base.slice(0, -1)) {
    res.writeHead(302, { Location: base + url.search }); res.end(); return;
  }
  const file = url.pathname.startsWith(base) ? url.pathname.slice(base.length) || 'index.html' : '';
  if (!files.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(path.join(root, file));
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(500); res.end('Could not read prototype file.'); }
}).listen(4173, '127.0.0.1', () => console.log(`Starfield prototype: http://127.0.0.1:4173${base}?variant=C`));
