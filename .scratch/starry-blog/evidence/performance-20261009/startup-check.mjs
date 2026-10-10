import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const label = process.argv[2] || 'baseline';
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const output = path.resolve('.scratch/starry-blog/evidence/performance-20261009');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
try {
  for (const device of ['desktop', 'mobile']) {
    const context = await browser.newContext({ viewport: device === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
    const page = await context.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/js/starfield/app.js', async route => { await gate; await route.continue().catch(() => {}); });
    await page.goto(url, { waitUntil: 'commit' });
    await page.waitForFunction(() => {
      const image = document.querySelector('.room-image');
      return image?.complete && image.naturalWidth > 0 && document.styleSheets.length >= 5;
    }, { timeout: 15000 });
    const state = await page.evaluate(() => {
      const visible = selector => { const el = document.querySelector(selector); const rect = el.getBoundingClientRect(); const style = getComputedStyle(el); return !el.hidden && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; };
      return { ready: document.body.classList.contains('starry-ready'), imageDecoded: document.querySelector('.room-image').naturalWidth > 0, roomVisible: visible('#room'), fallbackVisible: visible('#home-fallback'), fallbackHeading: document.querySelector('#home-fallback h1')?.textContent };
    });
    const result = { device, heldRequest: 'app.js', ...state };
    results.push(result);
    console.log(JSON.stringify(result));
    await page.screenshot({ path: path.join(output, `${label}-${device}-before-js.png`) });
    release();
    await context.close();
    for (const failure of ['no-javascript', 'module-error', 'webgl-unavailable']) {
      const fallbackContext = await browser.newContext({ viewport: device === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, javaScriptEnabled: failure !== 'no-javascript' });
      const fallbackPage = await fallbackContext.newPage();
      if (failure === 'module-error') await fallbackPage.route('**/js/starfield/app.js', route => route.abort());
      if (failure === 'webgl-unavailable') await fallbackPage.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' ? null : getContext.call(this, type, ...args); };
      });
      await fallbackPage.goto(url, { waitUntil: 'load' });
      await fallbackPage.waitForSelector('#home-fallback', { state: 'visible', timeout: 15000 });
      assert.equal(await fallbackPage.locator('#room').isVisible(), false, `${device}: ${failure} must restore readable fallback`);
      assert.ok(await fallbackPage.locator('#home-fallback a').count() > 0);
      console.log(JSON.stringify({ device, failure, readableFallback: true }));
      await fallbackContext.close();
    }
  }
  const articleIndex = JSON.parse(await fs.readFile('.preview/stargazer/starry/index.json', 'utf8'));
  const directContext = await browser.newContext();
  const directPage = await directContext.newPage();
  await directPage.route('**/js/starfield/app.js', route => route.abort());
  await directPage.goto(new URL(articleIndex.articles[0].path, url).href);
  assert.equal(await directPage.locator('#static-article-fallback').isVisible(), true);
  assert.equal(await directPage.locator('#reader-title').textContent(), articleIndex.articles[0].title);
  await directContext.close();
  await fs.writeFile(path.join(output, `${label}-startup.json`), JSON.stringify(results, null, 2));
  assert.ok(results.every(result => result.roomVisible && !result.fallbackVisible), 'The first view must show the room illustration, not the fallback article text, while JavaScript is still loading.');
} finally {
  await browser.close();
}
