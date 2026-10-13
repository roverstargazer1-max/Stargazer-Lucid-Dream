import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewHandler } from '../../../tools/preview-http.mjs';

const legacy = process.argv.includes('--legacy');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), legacy ? '../../../.preview/legacy' : '../../../.preview/stargazer');
const port = Number(process.env.STARFIELD_PREVIEW_PORT || (legacy ? 4176 : 4175));
http.createServer(createPreviewHandler(projectRoot)).listen(port, '127.0.0.1', () => {
  console.log(`${legacy ? 'Legacy Kira' : 'Starfield'} preview: http://127.0.0.1:${port}/`);
});
