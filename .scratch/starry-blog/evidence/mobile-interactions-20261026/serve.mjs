// Deliberately hold the first search-document and journal requests. The next
// request is served normally so real UI retry actions can be checked locally.
import http from 'node:http';
import path from 'node:path';
import { createPreviewHandler } from '../../../../tools/preview-http.mjs';

const serve = createPreviewHandler(path.resolve('.preview/stargazer'));
const attempts = new Map();
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1:4191').pathname;
  if (['/starry/search.json', '/journal/'].includes(pathname)) {
    const count = (attempts.get(pathname) || 0) + 1;
    attempts.set(pathname, count);
    console.log(JSON.stringify({ pathname, attempt: count, held: count === 1 }));
    if (count === 1) return;
  }
  serve(request, response);
}).listen(4191, '127.0.0.1', () => console.log('Mobile recovery test: http://127.0.0.1:4191/'));
