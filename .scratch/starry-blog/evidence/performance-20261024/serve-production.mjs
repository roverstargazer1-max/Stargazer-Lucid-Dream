// Local production-like text compression and conditional caching. No deployment.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const port = Number(args[index]), root = path.resolve(args[index + 1]), cache = new Map();
  http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://local/');
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (file !== root && !file.startsWith(root + path.sep)) throw Error('Outside root');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const metadata = await stat(file), key = `${metadata.mtimeMs}:${metadata.size}`;
      let item = cache.get(file);
      if (!item || item.key !== key) {
        const body = await readFile(file), ext = path.extname(file);
        const compressed = /\.(html|css|js|json|svg)$/.test(file) ? gzipSync(body, { level: 9 }) : null;
        item = { key, body, compressed, type: types[ext] || 'application/octet-stream', etag: `W/"${createHash('sha256').update(body).digest('hex')}"` };
        cache.set(file, item);
      }
      const headers = { 'Content-Type': item.type, ETag: item.etag, 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding' };
      if (request.headers['if-none-match'] === item.etag) { response.writeHead(304, headers); response.end(); return; }
      const gzip = item.compressed && /\bgzip\b/.test(request.headers['accept-encoding'] || '');
      const body = gzip ? item.compressed : item.body;
      if (gzip) headers['Content-Encoding'] = 'gzip';
      response.writeHead(200, { ...headers, 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404, { 'Cache-Control': 'no-store' }); response.end('Not found'); }
  }).listen(port, '127.0.0.1', () => console.log(`Compressed test output at http://127.0.0.1:${port}/ → ${root}`));
}
