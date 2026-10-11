import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const sourceRoot = 'themes/stargazer-starfield/source/js/starfield';
const evidenceRoot = '.scratch/starry-blog/evidence/engineering-20261011';
const baselineRoot = process.env.BASELINE_DIR || '/tmp/stargazer-audit-baseline-20261011';
const sources = {};
for (const name of ['dome', 'interactive-clouds']) {
  sources[`baseline-${name}`] = await fs.readFile(path.join(baselineRoot, 'js/starfield', `${name}.js`), 'utf8');
  sources[`current-${name}`] = await fs.readFile(path.join(sourceRoot, `${name}.js`), 'utf8');
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/js/starfield/app.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
  await page.route(/\/js\/starfield\/(baseline|current)-.+\.js$/, route => {
    const name = path.basename(new URL(route.request().url()).pathname, '.js');
    const prefix = name.startsWith('baseline-') ? 'baseline-' : 'current-';
    const body = sources[name].replaceAll("'./dome.js'", `'./${prefix}dome.js'`) +
      (name.endsWith('interactive-clouds') ? '\nexport { makeCloud };' : '');
    return route.fulfill({ contentType: 'text/javascript', body });
  });
  await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
  const result = await page.evaluate(async () => {
    const before = await import('/js/starfield/baseline-interactive-clouds.js');
    const after = await import('/js/starfield/current-interactive-clouds.js');
    const { skyProjection } = await import('/js/starfield/camera-bounds.js');
    await Promise.all([before.prepareInteractiveClouds(), after.prepareInteractiveClouds()]);
    let alphaSamples = 0, alphaMismatches = 0, beforeBytes = 0, afterBytes = 0;
    for (const seed of [1, 2, 3]) {
      const image = new Image(); image.src = `/images/optimized/cloud-${seed}.png`; await image.decode();
      const old = before.makeCloud(image), current = after.makeCloud(image);
      beforeBytes += old.alpha.byteLength; afterBytes += current.alpha.byteLength;
      for (let i = 0; i < current.alpha.length; i++) {
        alphaSamples++; if (old.alpha[i * 4 + 3] !== current.alpha[i]) alphaMismatches++;
      }
    }
    const samples = [];
    let hitSamples = 0, hitMismatches = 0;
    const staticTrigonometry = [0, 0];
    for (const [initialW, initialH] of [[640, 360], [390, 844]]) for (const soft of [false, true]) {
      const worlds = [before, after].map(module => {
        const world = document.createElement('div'); document.body.append(world);
        const ctx = document.createElement('canvas').getContext('2d');
        return { world, ctx, clouds: module.createInteractiveClouds(world, () => soft) };
      });
      let w = initialW, h = initialH;
      const camera = { x: -180, y: -50, z: -420, yaw: 0, pitch: .43, zoom: .72 };
      let settings = skyProjection(w, h, camera.zoom);
      function resize() {
        for (const state of worlds) { state.ctx.canvas.width = w * 2; state.ctx.canvas.height = h * 2; state.ctx.setTransform(2, 0, 0, 2, 0, 0); }
      }
      function paint(dt = 0, blocked = false) {
        for (const state of worlds) {
          state.clouds.update(dt, blocked); state.ctx.clearRect(0, 0, w, h);
          state.clouds.paint(state.ctx, w, h, camera, settings);
        }
      }
      function compare(label) {
        const pixels = worlds.map(state => state.ctx.getImageData(0, 0, state.ctx.canvas.width, state.ctx.canvas.height).data);
        let changed = 0, maxDelta = 0;
        for (let i = 0; i < pixels[0].length; i++) if (pixels[0][i] !== pixels[1][i]) {
          changed++; maxDelta = Math.max(maxDelta, Math.abs(pixels[0][i] - pixels[1][i]));
        }
        const buttons = worlds.map(state => Array.from(state.world.children).map(button => [button.hidden, button.style.left, button.style.top]));
        samples.push({ w, h, soft, label, changed, maxDelta, buttonsEqual: JSON.stringify(buttons[0]) === JSON.stringify(buttons[1]) });
        for (let y = -8; y < h + 8; y += 5) for (let x = -8; x < w + 8; x += 5) {
          hitSamples++; if (worlds[0].clouds.hover(x, y, true) !== worlds[1].clouds.hover(x, y, true)) hitMismatches++;
        }
        worlds.forEach(state => state.clouds.clearHover());
      }
      resize(); paint(); compare('first frame');
      // Count real Math calls, rather than infer layout/FPS from identical CSS writes.
      if (!soft && initialW === 640) for (const [index, state] of worlds.entries()) {
        const sin = Math.sin, cos = Math.cos;
        Math.sin = (...args) => { staticTrigonometry[index]++; return sin(...args); };
        Math.cos = (...args) => { staticTrigonometry[index]++; return cos(...args); };
        try { for (let i = 0; i < 180; i++) { state.clouds.update(1 / 60, false); state.clouds.paint(state.ctx, w, h, camera, settings); } }
        finally { Math.sin = sin; Math.cos = cos; }
      }
      paint(); compare('static cache');
      const target = Array.from(worlds[0].world.children).find(button => !button.hidden);
      const x = parseFloat(target.style.left), y = parseFloat(target.style.top);
      for (const state of worlds) { state.clouds.hover(x, y, true); state.clouds.update(.15, false); }
      paint(); compare('hover glow');
      const taps = worlds.map(state => state.clouds.tap(x, y));
      if (!taps[0] || taps[0] !== taps[1]) throw Error('Cloud center tap changed');
      for (const dt of [1 / 60, .2, .4, .5, 1, 2, 3]) { paint(dt); compare(`active ${dt}`); }
      // Every dependency of cached geometry must invalidate, including previously culled clouds.
      for (const [key, value] of [['x', 400], ['y', 250], ['z', 100], ['yaw', -1], ['yaw', 2], ['pitch', 1.45], ['pitch', .43]]) {
        camera[key] = value; paint(); compare(`camera ${key}=${value}`);
      }
      for (const [key, value] of [['cx', 200], ['cy', 270], ['focal', 180]]) {
        settings[key] = value; paint(); compare(`lens ${key}=${value}`);
      }
      w += 40; resize(); paint(); compare('width culling');
      h += 30; resize(); paint(); compare('height culling');
      paint(0, true); compare('blocked');
      paint(0, false); compare('unblocked');
      worlds.forEach(state => state.world.remove());
    }
    return { samples, alphaSamples, alphaMismatches, beforeBytes, afterBytes, hitSamples, hitMismatches, staticTrigonometry };
  });
  const summary = {
    samples: result.samples.length,
    changedChannels: result.samples.reduce((sum, sample) => sum + sample.changed, 0),
    maxDelta: Math.max(...result.samples.map(sample => sample.maxDelta)),
    buttonMismatches: result.samples.filter(sample => !sample.buttonsEqual).length,
    alphaSamples: result.alphaSamples, alphaMismatches: result.alphaMismatches,
    beforeAlphaBytes: result.beforeBytes, afterAlphaBytes: result.afterBytes, savedBytes: result.beforeBytes - result.afterBytes,
    hitSamples: result.hitSamples, hitMismatches: result.hitMismatches,
    staticFrames: 180, beforeTrigonometry: result.staticTrigonometry[0], afterTrigonometry: result.staticTrigonometry[1],
  };
  await fs.writeFile(path.join(evidenceRoot, 'cloud-pixels.json'), JSON.stringify(result, null, 2));
  await fs.writeFile(path.join(evidenceRoot, 'cloud-pixels-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  for (const key of ['changedChannels', 'buttonMismatches', 'alphaMismatches', 'hitMismatches']) assert.equal(summary[key], 0, key);
  assert.equal(summary.savedBytes, 1032192);
  assert.equal(summary.afterTrigonometry, 0, 'Unchanged clouds reuse their exact geometry');
} finally { await browser.close(); }
