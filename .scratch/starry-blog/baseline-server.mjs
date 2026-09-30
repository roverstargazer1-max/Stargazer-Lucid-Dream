import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'baseline-v19-20260914');
const manifest = JSON.parse((await readFile(path.join(here, 'baseline-v19-manifest.json'), 'utf8')).replace(/^\uFEFF/, ''));
const allowed = new Set(manifest.files.map(file => file.path));
const base = '/pages/starfield-prototype/';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const name = url.pathname.startsWith(base) ? url.pathname.slice(base.length) || 'index.html' : '';
  if (!allowed.has(name) && name !== 'frame-monitor.js') { res.writeHead(404); res.end('Not found'); return; }
  try {
    let body = await readFile(name === 'frame-monitor.js' ? path.resolve(here, '../../themes/hexo-theme-kira/prototypes/starfield/frame-monitor.js') : path.join(root, name));
    // Instrumentation is opt-in; the 46 frozen source/asset files remain byte-identical.
    if (name === 'index.html' && url.searchParams.get('monitor') === '1') body = body.toString().replace('</body>', '<script type="module" src="./frame-monitor.js"></script></body>');
    res.writeHead(200, { 'Content-Type': types[path.extname(name)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Could not read baseline'); }
}).listen(4174, '127.0.0.1', () => console.log(`V19 frozen baseline: http://127.0.0.1:4174${base}?variant=C&scene=painted&controls=quiet&motion=soft&living=0`));
