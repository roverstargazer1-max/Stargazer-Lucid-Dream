import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const label = process.argv[2] || 'baseline';
const results = [];
const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', isMobile: width < 760, hasTouch: width < 760 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__skyPaints = 0;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) { if (this.canvas.id === 'sky') window.__skyPaints++; return clear.apply(this, args); };
    });
    await page.goto('http://127.0.0.1:4175/');
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.waitForTimeout(200);
    const roomIdle = await page.evaluate(async () => {
      const canvas = document.getElementById('sky'), before = canvas.toDataURL(), paints = window.__skyPaints;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { sceneRedraws: window.__skyPaints - paints, pixelsUnchanged: before === canvas.toDataURL() };
    });
    const initialObservationRequests = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /\/images\/observation\//.test(r.name) && !r.name.endsWith('/polyhedron.png')).map(r => r.name));
    const initialObservationBytes = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /\/images\/observation\//.test(r.name) && !r.name.endsWith('/polyhedron.png')).reduce((sum, r) => sum + r.encodedBodySize, 0));
    if (width < 760) await page.locator('#window-entry').tap();
    else await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside');
    if (width < 760) await page.locator('#star-targets button:visible').first().tap({ force: true });
    else await page.locator('#star-targets button:visible').first().click({ force: true });
    await page.waitForFunction(() => !document.getElementById('read-button').disabled);
    await page.waitForFunction(() => [...document.querySelectorAll('#preview img')].every(img => img.complete && img.naturalWidth > 0));
    await page.locator('#read-button').click();
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
    await page.waitForTimeout(500);
    const idle = await page.evaluate(async () => {
      let mutations = 0, redundantMutations = 0;
      const observer = new MutationObserver(records => {
        mutations += records.length;
        redundantMutations += records.filter(record => [...record.removedNodes].map(n => n.textContent).join('') === [...record.addedNodes].map(n => n.textContent).join('')).length;
      });
      for (const id of ['reading-state', 'reading-progress']) observer.observe(document.getElementById(id), { childList: true });
      const paints = window.__skyPaints;
      await new Promise(resolve => setTimeout(resolve, 1000));
      observer.disconnect();
      return { mutations, redundantMutations, sceneRedraws: window.__skyPaints - paints };
    });
    await page.evaluate(() => { const s = document.getElementById('reading-scroll'); s.scrollTop = s.scrollHeight; });
    await page.waitForFunction(() => document.getElementById('reading-progress').textContent === '100%');
    assert.match(await page.locator('#reading-state').textContent(), /已到文末/);
    const imageBytes = await fs.readFile('themes/stargazer-starfield/source/images/observation/silhouette.png');
    await page.route('**/__performance_late_image.png', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ contentType: 'image/png', body: imageBytes });
    });
    await page.evaluate(() => {
      const scroll = document.getElementById('reading-scroll'); scroll.scrollTop = Math.max(1, (scroll.scrollHeight - scroll.clientHeight) / 2);
      const image = document.createElement('img'); image.id = 'performance-late-image'; image.src = '/__performance_late_image.png';
      document.getElementById('reader-content').append(image);
    });
    await page.waitForTimeout(100);
    const beforeImage = await page.locator('#reading-progress').textContent();
    await page.locator('#performance-late-image').evaluate(image => image.decode());
    await page.waitForFunction(previous => document.getElementById('reading-progress').textContent !== previous, beforeImage);
    const afterImage = await page.locator('#reading-progress').textContent();
    await page.locator('#performance-late-image').evaluate(image => image.remove());
    await page.setViewportSize({ width: width === 1440 ? 1000 : 342, height: width === 1440 ? 760 : 740 });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.getElementById('reading-scroll').scrollWidth <= document.getElementById('reading-scroll').clientWidth), true);
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.getElementById('reader').open);
    await page.locator('#time-mode').click();
    await page.waitForFunction(() => document.getElementById('time-mode').getAttribute('aria-pressed') === 'true' && !document.getElementById('read-button').disabled);
    await page.locator('#relation-mode').click();
    await page.waitForFunction(() => document.getElementById('relation-mode').getAttribute('aria-pressed') === 'true' && !document.getElementById('read-button').disabled);
    await page.locator('#home').click();
    await page.waitForFunction(() => document.body.dataset.room === 'inside');
    assert.deepEqual(errors, []);
    const result = { width, initialObservationRequests, initialObservationBytes, roomIdle, idle, lateImageProgress: { beforeImage, afterImage }, functionalChecks: 'passed', errors };
    results.push(result); console.log(JSON.stringify(result));
    await context.close();
  }
  await fs.writeFile(`.scratch/starry-blog/evidence/performance-20261009/${label}-regression.json`, JSON.stringify(results, null, 2));
  assert.ok(results.every(r => r.idle.redundantMutations === 0), 'stationary reading must not rewrite unchanged progress text');
  assert.ok(results.every(r => r.idle.sceneRedraws === 0), 'a frozen reading background must not redraw continuously');
  assert.ok(results.every(r => r.roomIdle.sceneRedraws === 0 && r.roomIdle.pixelsUnchanged), 'the unchanged room canvas must not redraw continuously');
  assert.ok(results.every(r => r.initialObservationBytes <= 600000), 'observation artwork must fit the measured 600 KB payload budget');
} finally { await browser.close(); }
