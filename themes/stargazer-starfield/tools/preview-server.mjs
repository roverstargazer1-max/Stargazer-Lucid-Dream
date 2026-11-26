import http from 'node:http';
import { previewComments } from '../../../components/comments/preview.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewHandler } from '../../../tools/preview-http.mjs';

const legacy = process.argv.includes('--legacy');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), legacy ? '../../../.preview/legacy' : '../../../.preview/stargazer');
const port = Number(process.env.STARFIELD_PREVIEW_PORT || (legacy ? 4176 : 4175));
const serve = createPreviewHandler(projectRoot);
const comments = previewComments(path.resolve(projectRoot, '../comments.sqlite'));
http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/__preview/api/comment') return comments(req, res);
  return serve(req, res);
}).listen(port, '127.0.0.1', () => {
  console.log(`${legacy ? 'Legacy Kira' : 'Starfield'} preview: http://127.0.0.1:${port}/`);
});
