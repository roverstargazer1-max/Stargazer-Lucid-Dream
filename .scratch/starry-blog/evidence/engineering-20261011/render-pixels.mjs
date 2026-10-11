import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'acorn';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const sourceRoot = 'themes/stargazer-starfield/source/js/starfield';
const evidenceRoot = '.scratch/starry-blog/evidence/engineering-20261011';
const baselineRoot = process.env.BASELINE_DIR || '/tmp/stargazer-audit-baseline-20261011';
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const sources = {};
for (const name of ['dome', 'painted', 'interactive-clouds']) {
  sources[`baseline-${name}`] = await fs.readFile(path.join(baselineRoot, 'js/starfield', `${name}.js`), 'utf8');
  sources[`current-${name}`] = await fs.readFile(path.join(sourceRoot, `${name}.js`), 'utf8');
}
sources['current-room-scene'] = await fs.readFile(path.join(sourceRoot, 'room-scene.js'), 'utf8');
function roomAST(source) {
  const room = parse(source, { ecmaVersion: 2020, sourceType: 'module' }).body
    .find(node => node.declaration?.id?.name === 'createRoom').declaration;
  return JSON.stringify(room, (key, value) => key === 'start' || key === 'end' ? undefined : value);
}
const roomASTEqual = roomAST(sources['baseline-painted']) === roomAST(sources['current-room-scene']);
assert.ok(roomASTEqual, 'Moving room control must preserve its complete function AST');

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  // Isolate drawing from the real app's own RAF loop; use its unchanged assets/data attributes.
  await page.route('**/js/starfield/app.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
  await page.route(/\/js\/starfield\/(baseline|current)-.+\.js$/, route => {
    const name = path.basename(new URL(route.request().url()).pathname, '.js');
    const prefix = name.startsWith('baseline-') ? 'baseline-' : 'current-';
    const body = sources[name].replaceAll("'./dome.js'", `'./${prefix}dome.js'`)
      .replaceAll("'./room-scene.js'", "'./current-room-scene.js'");
    return route.fulfill({ contentType: 'text/javascript', body });
  });
  await page.goto(url);
  const samples = await page.evaluate(async () => {
    const before = await import('/js/starfield/baseline-painted.js');
    const after = await import('/js/starfield/current-painted.js');
    const renderer = await import('/js/starfield/dome-renderer.js');
    const { skyProjection } = await import('/js/starfield/camera-bounds.js');
    await Promise.all([before.preparePaintedScene(), after.preparePaintedScene()]);
    const samples = [];
    for (const [w, h] of [[640, 360], [390, 844]]) for (const dpr of [.75, 1, 1.5, 2]) {
      for (const yaw of [0, .7, 3.2]) for (const pitch of [.43, 1.45]) for (const clarity of [0, .37, 1]) {
        for (const [cap, stride] of [[1.5, 1], [1, 2], [.75, 4]]) {
          renderer.setRenderQuality(cap);
          const camera = { x: -180, y: -50, z: -420, yaw, pitch, zoom: .72 };
          const settings = skyProjection(w, h, camera.zoom);
          const canvases = [before, after].map(module => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            module.paintPaintedSky(ctx, w, h, camera, settings, { clarity, backgroundStride: stride });
            if (document.body.dataset.domeRenderer !== 'webgl') throw Error('Sky renderer unavailable');
            return canvas;
          });
          const pixels = canvases.map(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
          let changed = 0, maxDelta = 0;
          for (let i = 0; i < pixels[0].length; i++) if (pixels[0][i] !== pixels[1][i]) {
            changed++; maxDelta = Math.max(maxDelta, Math.abs(pixels[0][i] - pixels[1][i]));
          }
          samples.push({ w, h, dpr, yaw, pitch, clarity, cap, stride, changed, maxDelta });
        }
      }
    }
    return samples;
  });
  const summary = {
    samples: samples.length,
    viewports: [[640, 360], [390, 844]], dpr: [.75, 1, 1.5, 2],
    environmentCaps: [1.5, 1, .75], backgroundStrides: [1, 2, 4],
    changedChannels: samples.reduce((sum, item) => sum + item.changed, 0),
    maxDelta: Math.max(...samples.map(item => item.maxDelta)), roomASTEqual,
  };
  await fs.writeFile(path.join(evidenceRoot, 'render-pixels.json'), JSON.stringify(samples, null, 2));
  await fs.writeFile(path.join(evidenceRoot, 'render-pixels-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  assert.equal(summary.changedChannels, 0, 'All sky pixels must match the frozen baseline');
} finally { await browser.close(); }
