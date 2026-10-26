// Local diagnostic server only. Deliberately stall optional artwork and the
// first article request so the real browser can exercise recovery and retry.
import http from 'node:http';
import path from 'node:path';
import { createPreviewHandler } from '../../../../tools/preview-http.mjs';

const serve = createPreviewHandler(path.resolve('.preview/stargazer'));
for (const [port, scenario] of [[4187, 'normal'], [4188, 'stalled-art'], [4189, 'timeout-first'], [4190, 'slow-article']]) {
  const attempts = new Map();
  http.createServer((request, response) => {
    const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    const article = /^\/\d{4}\/\d{2}\/\d{2}\//.test(pathname);
    const count = (attempts.get(pathname) || 0) + 1;
    attempts.set(pathname, count);
    if (scenario === 'stalled-art' && /\/images\/optimized\/interface-reader-/.test(pathname)
      || scenario === 'timeout-first' && article && count === 1) {
      console.log(JSON.stringify({ scenario, pathname, attempt: count, held: true }));
      return;
    }
    if (scenario === 'slow-article' && article) {
      const timer = setTimeout(() => serve(request, response), 2500);
      response.on('close', () => clearTimeout(timer));
      return;
    }
    if (article) console.log(JSON.stringify({ scenario, pathname, attempt: count }));
    serve(request, response);
  }).listen(port, '127.0.0.1', () => console.log(`${scenario}: http://127.0.0.1:${port}/`));
}
