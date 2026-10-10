import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.preview/stargazer');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const probe = `<script>
window.startupVisualProbe = { changes: [], verdict: 'pending' };
let previous;
function inspectStartup() {
  const image = document.querySelector('.room-image');
  const room = document.querySelector('#room');
  if (image && room) {
    const style = getComputedStyle(image);
    const skyStyle = getComputedStyle(document.querySelector('#sky'));
    const sample = { time: performance.now(), mask: style.maskImage, src: image.currentSrc, visible: !room.hidden && getComputedStyle(room).display !== 'none' && image.complete && image.naturalWidth > 0, skyOpacity: skyStyle.opacity, skyTransition: skyStyle.transitionProperty, skyDuration: skyStyle.transitionDuration, ready: document.body.classList.contains('starry-ready') };
    if (!previous || sample.mask !== previous.mask || sample.visible !== previous.visible || sample.ready !== previous.ready) window.startupVisualProbe.changes.push(sample);
    if (sample.ready && +sample.skyOpacity > 0 && +sample.skyOpacity < 1 && !window.startupVisualProbe.fadeObserved) {
      window.startupVisualProbe.fadeObserved = true;
      window.startupVisualProbe.changes.push(sample);
    }
    if (previous?.visible && sample.visible && previous.mask === 'none' && sample.mask !== 'none') window.startupVisualProbe.verdict = 'FAIL: visible original window is replaced in one frame';
    previous = sample;
    const fallback = document.querySelector('#home-fallback');
    if (room.hidden && fallback && getComputedStyle(fallback).display !== 'none') {
      window.startupVisualProbe.verdict = 'PASS: readable fallback';
      document.documentElement.dataset.startupVisualProbe = JSON.stringify(window.startupVisualProbe);
      return;
    }
    if (new URLSearchParams(location.search).get('probe') === 'pause' && sample.visible) {
      window.startupVisualProbe.verdict = sample.mask !== 'none' && sample.skyOpacity === '0' ? 'PASS: stable initial window' : 'FAIL: original sky is exposed';
      document.documentElement.dataset.startupVisualProbe = JSON.stringify(window.startupVisualProbe);
      return;
    }
    document.documentElement.dataset.startupVisualProbe = JSON.stringify(window.startupVisualProbe);
    if (sample.ready && +sample.skyOpacity >= 1) {
      window.startupVisualProbe.changes.push(sample);
      const first = window.startupVisualProbe.changes.find(item => item.visible && !item.ready);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (window.startupVisualProbe.verdict === 'pending') window.startupVisualProbe.verdict = !first || first.mask === 'none' || first.mask !== sample.mask || (!reduced && !window.startupVisualProbe.fadeObserved) ? 'FAIL: initial window or sky handoff is not stable' : 'PASS';
      document.documentElement.dataset.startupVisualProbe = JSON.stringify(window.startupVisualProbe);
      return;
    }
  }
  requestAnimationFrame(inspectStartup);
}
requestAnimationFrame(inspectStartup);
</script>`;

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    let content = await readFile(file);
    const failure = new URL(request.headers.referer || 'http://127.0.0.1', 'http://127.0.0.1').searchParams.get('probe');
    if ((failure === 'module-failure' && file.endsWith('/js/starfield/app.js')) || (failure === 'mask-failure' && /room-window-.*\.svg$/.test(file))) throw new Error('Injected startup failure');
    if (file.endsWith('/js/starfield/app.js')) {
      if (failure === 'pause') content = Buffer.from('await new Promise(() => {});');
      else await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (file.endsWith('.html')) content = Buffer.from(content.toString().replace('</body>', probe + '</body>'));
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}).listen(4187, '127.0.0.1', () => console.log('Startup visual probe: http://127.0.0.1:4187/'));
