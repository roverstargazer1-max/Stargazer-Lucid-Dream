import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

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

export function createPreviewHandler(projectRoot, { statFile = stat, openFile = open } = {}) {
  return async (request, response) => {
    let handle;
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
      if ((await statFile(file)).isDirectory()) file = path.join(file, 'index.html');

      // Opening verifies readability for HEAD too, without reading any file bytes.
      handle = await openFile(file, 'r');
      const metadata = await handle.stat();
      if (metadata.isDirectory()) throw new Error('Preview index is a directory.');
      if (response.destroyed) return;
      response.writeHead(200, {
        'Content-Type': types.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
        'Content-Length': metadata.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      // Pipeline applies backpressure and destroys the stream on client disconnect.
      // This handler owns the descriptor, including the HEAD and failed-read paths.
      await pipeline(handle.createReadStream({ autoClose: false }), response);
    } catch {
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end('Not found');
    } finally {
      if (handle) {
        try {
          await handle.close();
        } catch {
          response.destroy();
        }
      }
    }
  };
}
