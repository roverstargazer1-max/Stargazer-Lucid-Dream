import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const label = process.argv[2] || 'optimized';
const results = [];
try {
  for (const scenario of ['desktop', 'mobile', 'direct', 'art-failure']) {
    const mobile = scenario === 'mobile';
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.readerReadyProbe = { decoded: [], shown: [] };
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function (...args) {
        const src = this.src;
        return decode.apply(this, args).then(result => {
          if (/\/images\/reader\//.test(src)) window.readerReadyProbe.decoded.push(new URL(src).pathname);
          return result;
        });
      };
      const show = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function (...args) {
        if (this.id === 'reader') window.readerReadyProbe.shown.push([...window.readerReadyProbe.decoded]);
        return show.apply(this, args);
      };
    });
    if (scenario === 'art-failure') await page.route('**/images/reader/*.webp', route => route.abort());
    const index = await (await page.request.get(new URL('/starry/index.json', url).href)).json();
    const target = scenario === 'direct' ? new URL(new URL(index.articles[0].url, url).pathname, url).href : url;
    await page.goto(target);
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    if (scenario !== 'direct') {
      const early = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /\/images\/reader\//.test(e.name)).length);
      assert.equal(early, 0, 'homepage must not eagerly download reading assets');
      await page.locator('#window-entry').click();
      await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
      await page.locator('#star-targets button').first().evaluate(button => button.click());
      await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
      await page.locator('#read-button').click();
    }
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
    const result = await page.evaluate(() => ({ ...window.readerReadyProbe, path: location.pathname, readable: document.querySelector('#reader-content').textContent.trim().length > 20 }));
    results.push({ scenario, ...result, errors });
    await page.close();
  }
  await fs.writeFile(new URL(`./reader-readiness-${label}-summary.json`, import.meta.url), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
  assert.ok(results.every(result => result.readable && !result.errors.length), 'missing artwork must never block readable text');
  assert.ok(results.filter(result => result.scenario !== 'art-failure').every(result => new Set(result.shown[0]).size === 3), 'reading artwork must already be decoded when the reveal begins');
} finally { await browser.close(); }
