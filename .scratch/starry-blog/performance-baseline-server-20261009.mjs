import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const legacy = process.argv.includes('--legacy');
const projectRoot = path.resolve(process.env.STARFIELD_TEST_ROOT || '/tmp/stargazer-performance-baseline-20261009');
const port = Number(process.env.STARFIELD_TEST_PORT || 4177);
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff2', 'font/woff2'],
]);

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    let file = path.resolve(projectRoot, `.${pathname}`);
    const inside = file === projectRoot || file.startsWith(`${projectRoot}${path.sep}`);
    if (!inside) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`${legacy ? 'Legacy Kira' : 'Starfield'} preview: http://127.0.0.1:${port}/`);
});
