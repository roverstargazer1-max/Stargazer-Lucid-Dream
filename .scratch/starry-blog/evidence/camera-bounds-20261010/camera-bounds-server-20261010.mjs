// Dedicated visual QA server. The rendered-camera probe is never published.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.preview/stargazer');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const probe = `
    const probeKey = JSON.stringify([width, height, camera, body.dataset.room, mode, phase]);
    if (canvas.dataset.boundsProbeKey !== probeKey) {
      canvas.dataset.boundsProbeKey = probeKey;
      const elevations = Array.from({length: 65}, (_, column) => {
        const ray = probeViewRay(width * column / 64, height * .8, camera, projectionSettings());
        return Math.asin(probeIntersection(camera, ray).y / 6000);
      });
      document.documentElement.dataset.cameraBoundsProbe = JSON.stringify({
        camera, size: [width, height], room: body.dataset.room, mode, phase,
        minimumElevation: Math.min(...elevations), terrainBudgetPass: elevations.every(value => value >= .06 - 1e-8)
      });
    }
`;

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    let content = await readFile(file);
    if (file.endsWith('/js/starfield/app.js')) content = Buffer.from(
      "import { viewRay as probeViewRay, domeIntersection as probeIntersection } from './dome.js';\n" +
      content.toString().replace('function drawScene(now) {', 'function drawScene(now) {' + probe));
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}).listen(4188, '127.0.0.1', () => console.log('Camera bounds QA: http://127.0.0.1:4188/'));
