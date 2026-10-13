import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve('.scratch/starry-blog/evidence/silhouette-walk-edge-20261008');
const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
try {
  for (const mode of ['system-soft', 'low-quality', 'canvas-unavailable', 'atlas-unavailable']) {
    const context = await browser.newContext({ viewport: mode === 'landscape' ? { width: 844, height: 390 } : { width: 1440, height: 900 },
      deviceScaleFactor: 2, reducedMotion: mode === 'system-soft' ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(mode => {
      window.__walkerPaints = [];
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(...args) {
        if (this.canvas.closest('.observation-silhouette')) window.__walkerPaints.push(performance.now());
        return clear.apply(this, args);
      };
      if (mode === 'low-quality') Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 });
      if (mode === 'canvas-unavailable') {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(...args) {
          if (this.closest('.observation-silhouette')) return null;
          return getContext.apply(this, args);
        };
      }
      if (mode === 'visibility-and-deselect') {
        window.__walkerHidden = false;
        Object.defineProperty(document, 'hidden', { get: () => window.__walkerHidden });
      }
    }, mode);
    if(mode === 'atlas-unavailable') await page.route('**/silhouette-walk-frames.png', route => route.abort());
    await page.goto('http://127.0.0.1:4175/2025/10/20/%E6%A2%A6%E5%BC%80%E5%A7%8B%E7%9A%84%E5%9C%B0%E6%96%B9%5B%E7%BD%AE%E9%A1%B6%5D/', { waitUntil: 'load' });
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.waitForFunction(() => document.getElementById('reader').open);
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.getElementById('reader').open && document.body.dataset.reading !== 'closing');
    await page.waitForTimeout(250);
    const state = async () => page.evaluate(() => {
      const element = document.querySelector('.observation-silhouette'), rect = element.getBoundingClientRect();
      return { imageHidden: element.querySelector('img').hidden, canvasHidden: element.querySelector('canvas').hidden,
        previewHidden: document.getElementById('preview').hidden, paints: window.__walkerPaints.length,
        quality: document.body.dataset.renderQuality, motion: document.body.dataset.motion,
        insideViewport: rect.x >= 0 && rect.right <= innerWidth && rect.y >= 0 && rect.bottom <= innerHeight };
    });
    const first = await state();
    await page.waitForTimeout(400);
    const second = await state();
    const result = { mode, first, second, errors };
    if (mode === 'landscape') await page.screenshot({ path: path.join(output, 'landscape-full.png') });
    if (mode === 'visibility-and-deselect') {
      await page.evaluate(() => { window.__walkerHidden = true; });
      await page.waitForTimeout(100);
      const hidden = await state();
      await page.waitForTimeout(250);
      result.hiddenStopped = hidden.paints === (await state()).paints;
      await page.evaluate(() => { window.__walkerHidden = false; });
      await page.waitForTimeout(120);
      result.visibleResumed = (await state()).paints > hidden.paints;
      await page.locator('#deselect').click();
      await page.waitForTimeout(100);
      const deselected = await state();
      await page.waitForTimeout(250);
      result.deselectStopped = deselected.previewHidden && deselected.paints === (await state()).paints;
    }
    if (second.imageHidden || !second.canvasHidden || first.paints !== second.paints || errors.length) throw new Error('Static fallback failed: '+mode);
    results.push(result);
    console.log(JSON.stringify(result));
    await context.close();
  }
  await fs.writeFile(path.join(output, 'fallback-checks.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
