import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    // Enter programmatically in the compact landscape room; this check targets the observation panel.
    if (height < 500) await page.locator('#window-entry').evaluate(button => button.click());
    else await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    const articles = await page.evaluate(async () => (await (await fetch(document.body.dataset.starryIndex)).json()).articles);
    const checkedIds = [];
    const selected = width === 1440 ? articles : [articles[0], articles.at(-1)];
    for (const article of selected) {
      const index = articles.findIndex(candidate => candidate.id === article.id);
      await page.locator('#star-targets button').nth(index).evaluate(button => button.click());
      await page.waitForFunction(expected => document.querySelector('#preview-id').dataset.displayId === expected &&
        !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled, article.displayId);
      assert.equal(await page.locator('#preview-id').getAttribute('aria-label'), `文章 ID：${article.displayId}`);
      checkedIds.push(article.displayId);
    }
    await page.locator('#time-mode').click();
    await page.waitForFunction(() => document.querySelector('#time-mode').getAttribute('aria-pressed') === 'true' &&
      !document.querySelector('#read-button').disabled);
    assert.equal(await page.locator('#preview-id').getAttribute('data-display-id'), selected.at(-1).displayId);
    const measurement = await page.evaluate(() => {
      const bounds = selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, right: x + width, bottom: y + height };
      };
      const id = document.querySelector('#preview-id');
      return { id: bounds('#preview-id'), label: bounds('.observation-id'), read: bounds('.preview-bottom'),
        rule: bounds('.read-rule'), date: bounds('#preview-date'), panel: bounds('#preview'),
        idFont: parseFloat(getComputedStyle(id).fontSize), dateFont: parseFloat(getComputedStyle(document.querySelector('#preview-date')).fontSize),
        glyphs: [...id.querySelectorAll('img')].map(image => ({ src: image.src, loaded: image.complete && image.naturalWidth > 0 })) };
    });
    assert.ok(measurement.idFont < measurement.dateFont);
    assert.ok(measurement.id.x > measurement.label.right);
    assert.ok(measurement.id.right < measurement.read.x, 'the complete ID must stay before the READ decoration');
    assert.ok(measurement.glyphs.every(image => image.loaded && image.src.includes('/images/observation/glyphs/')));
    await page.screenshot({ path: new URL(`./${width}x${height}.png`, import.meta.url).pathname });
    await page.locator('#preview').screenshot({ path: new URL(`./panel-${width}x${height}.png`, import.meta.url).pathname });
    // A five-digit future catalogue number must still fit without truncating its magnitude.
    const futureMeasurement = await page.evaluate(async () => {
      const { renderGlyphs } = await import('/js/starfield/observation.js');
      const id = document.querySelector('#preview-id');
      renderGlyphs(id, 'SLD-10000 · 2.5', document.querySelector('#preview').dataset.assetRoot);
      await Promise.all([...id.querySelectorAll('img')].map(image => image.decode()));
      const idBounds = id.getBoundingClientRect(), readBounds = document.querySelector('.preview-bottom').getBoundingClientRect();
      return { right: idBounds.right, readLeft: readBounds.left };
    });
    assert.ok(futureMeasurement.right < futureMeasurement.readLeft, 'five-digit catalogue numbers must fit');
    assert.deepEqual(errors, []);
    results.push({ viewport: { width, height }, checkedIds, modes: ['relation', 'time'], measurement, futureMeasurement, errors });
    console.log(`${width}x${height}: ${checkedIds.length} article IDs checked`);
    await context.close();
  }
  await fs.writeFile(new URL('./browser-summary.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); }
