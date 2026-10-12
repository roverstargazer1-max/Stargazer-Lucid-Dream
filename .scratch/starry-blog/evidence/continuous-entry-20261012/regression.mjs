import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder = new URL('./', import.meta.url);
const file = name => new URL(name, folder).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const reports = [];
const only = process.argv[2];
const reportPrefix = process.argv[3] || 'overlap';
try {
  for (const [name, viewport, soft, pressure] of [
    ['desktop', { width: 1440, height: 1040 }, false, false],
    ['mobile', { width: 390, height: 844 }, false, false],
    ['landscape', { width: 844, height: 390 }, false, false],
    ['resize', { width: 1440, height: 1000 }, false, false],
    ['pressure', { width: 1440, height: 1000 }, false, true],
    ['soft', { width: 390, height: 844 }, true, false],
  ]) {
    if (only && name !== only) continue;
    const page = await browser.newPage({ viewport, reducedMotion: soft ? 'reduce' : 'no-preference', hasTouch: name === 'mobile' || soft, isMobile: name === 'mobile' || soft });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    if (pressure) await page.route('**/js/starfield/render-budget.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('sampleFrame(interval, moving) {', 'sampleFrame(interval, moving) { if(moving)interval=50;') });
    });
    await page.goto('http://127.0.0.1:4175/?motion=' + (soft ? 'soft' : 'full'));
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'));
    await page.evaluate(async () => {
      const mask = new Image(); mask.src = document.body.dataset[innerWidth <= 760 ? 'windowMaskMobile' : 'windowMaskDesktop']; await mask.decode();
      const sample = document.createElement('canvas'); sample.width = mask.naturalWidth; sample.height = mask.naturalHeight;
      const maskContext = sample.getContext('2d'); maskContext.drawImage(mask, 0, 0);
      const maskPixels = maskContext.getImageData(0, 0, sample.width, sample.height).data;
      const canvas = document.querySelector('#sky'), context = canvas.getContext('2d'), stage = document.querySelector('.room-stage');
      window.entryAudit = { movingFrames: 0, emptyFrames: 0, warpedFrames: 0, transformedSkyFrames: 0, overlapFrames: 0 };
      window.entryAuditRun = true;
      let previousColors = '';
      function inspect() {
        const moving = ['entering', 'returning'].includes(document.body.dataset.room);
        if (moving) {
          const audit = window.entryAudit; audit.movingFrames++;
          const points = [[0, 0], [canvas.width - 1, 0], [canvas.width - 1, canvas.height - 1], [0, canvas.height - 1], [canvas.width / 2 | 0, canvas.height / 2 | 0]];
          const colors = points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
          if (colors.some(pixel => pixel[3] !== 255)) audit.emptyFrames++;
          const changed = previousColors !== '' && JSON.stringify(colors) !== previousColors;
          previousColors = JSON.stringify(colors);
          const m = new DOMMatrix(getComputedStyle(stage).transform);
          if (Math.max(Math.abs(m.m13), Math.abs(m.m23), Math.abs(m.m31), Math.abs(m.m32)) > .001) audit.warpedFrames++;
          if (getComputedStyle(canvas).transform !== 'none') audit.transformedSkyFrames++;
          const animation = stage.getAnimations()[0];
          // Sky pixels move while the unwarped near-room foreground is still in view.
          if (document.body.dataset.room === 'entering' && changed && animation?.currentTime > 0 && animation.effect.getTiming().duration > 220) {
            const rect = stage.getBoundingClientRect();
            let foreground = false;
            for (let row = 0; row <= 8; row++) for (let col = 0; col <= 8; col++) {
              const x = Math.floor((innerWidth * col / 8 - rect.left) / rect.width * sample.width);
              const y = Math.floor((innerHeight * row / 8 - rect.top) / rect.height * sample.height);
              if (x >= 0 && x < sample.width && y >= 0 && y < sample.height && maskPixels[(y * sample.width + x) * 4 + 3] > 0) foreground = true;
            }
            if (foreground) audit.overlapFrames++;
          }
        }
        if (window.entryAuditRun) requestAnimationFrame(inspect);
      }
      requestAnimationFrame(inspect);
    });
    const states = [];
    for (const direction of ['enter', 'return']) {
      if (direction === 'enter') {
        const rect = await page.locator('#window-entry').boundingBox();
        await page.locator('#window-entry').click({ position: { x: rect.width * .35, y: rect.height * .25 } });
      } else await page.locator('#home').click();
      if (name === 'resize') {
        await page.waitForTimeout(1100);
        await page.setViewportSize(direction === 'enter' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 });
      }
      await page.waitForFunction(expected => document.body.dataset.room === expected && !document.body.dataset.arrival, direction === 'enter' ? 'outside' : 'inside');
      const state = await page.evaluate(() => ({ roomHidden: document.querySelector('#room').hidden, roomInert: document.querySelector('#room').inert, worldInert: document.querySelector('#world').inert, animations: document.querySelector('.room-stage').getAnimations().length, transientSkyStyle: document.querySelector('#sky').style.cssText, quality: document.body.dataset.renderQuality }));
      assert.equal(state.roomHidden, direction === 'enter');
      assert.equal(state.worldInert, direction === 'return');
      assert.equal(state.animations, 0);
      assert.doesNotMatch(state.transientSkyStyle, /--entry-/);
      if (pressure) assert.equal(state.quality, 'low', 'The pressure case must actually exercise the low drawing tier');
      states.push({ direction, ...state });
      if (direction === 'enter') {
        await page.locator('#search-entry').click();
        await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
        await page.locator('#search-index-toggle').click();
        assert.equal(await page.locator('.search-result').count(), 10);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('#star-search').open);
      }
    }
    const audit = await page.evaluate(() => { window.entryAuditRun = false; return window.entryAudit; });
    assert.ok(audit.movingFrames > 0);
    for (const key of ['emptyFrames', 'warpedFrames', 'transformedSkyFrames']) assert.equal(audit[key], 0, name + ': ' + key);
    if (!soft) assert.ok(audit.overlapFrames > 0, name + ': sky movement must overlap the visible room passage');
    assert.deepEqual(errors, []);
    reports.push({ name, viewport, soft, pressure, audit, states, errors, interaction: 'enter, search, collapse/expand, close search and return passed' });
    console.log(name, audit);
    await page.close();
  }
  await fs.writeFile(file(only ? reportPrefix + '-' + only + '-summary.json' : reportPrefix + '-regression-summary.json'), JSON.stringify(reports, null, 2));
} finally { await browser.close(); }
