// PROTOTYPE ONLY: serves the current generated blog with a local visual overlay.
// Nothing is written into the production theme or generated site.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const study = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(study, '../../../../.preview/stargazer');
const sample = '2026/05/14/慢/index.html';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const route = decodeURIComponent(url.pathname);
    let file = route === '/study.css' ? path.join(study, 'study.css')
      : route === '/study.js' ? path.join(study, 'study.js')
      : path.resolve(site, route === '/' ? sample : `.${route}`);
    if (!file.startsWith(site + path.sep) && file !== path.join(study, 'study.css') && file !== path.join(study, 'study.js')) throw Error('Outside prototype');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    let content = await readFile(file);
    if (path.extname(file) === '.html') {
      content = content.toString().replace('</head>', '<link rel="stylesheet" href="/study.css"><script type="module" src="/study.js"></script></head>');
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Prototype asset missing. Run npm run preview:starfield first.');
  }
}).listen(4180, '127.0.0.1', () => console.log('Cold reading prototype: http://127.0.0.1:4180/'));
