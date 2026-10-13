import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

const dir = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const summary = [];
for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4175/?motion=soft');
  await page.waitForFunction(() => document.body.classList.contains('starry-ready'));
  const windowBox = await page.locator('#window-entry').boundingBox();
  await page.locator('#window-entry').click({ position: { x: windowBox.width * .35, y: windowBox.height * .25 } });
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.locator('#search-entry').click();
  await page.waitForFunction(() => document.querySelector('#star-search').open);
  await page.waitForFunction(() => [...document.querySelectorAll('#star-search img')].every(image => image.complete && image.naturalWidth));
  await page.screenshot({ path: new URL(`${name}-closed.png`, dir).pathname.replace(/^\/([A-Z]:)/i, '$1') });
  await page.locator('#search-index-toggle').click();
  await page.screenshot({ path: new URL(`${name}-open.png`, dir).pathname.replace(/^\/([A-Z]:)/i, '$1') });
  summary.push({ name, errors, state: await page.evaluate(() => ({
    resultCount: document.querySelectorAll('.search-result').length,
    width: document.querySelector('.search-artboard').clientWidth,
    scrollWidth: document.querySelector('.search-artboard').scrollWidth,
    loadedImages: [...document.querySelectorAll('#star-search img')].filter(image => !image.complete || !image.naturalWidth).map(image => image.src),
    feedback: document.querySelector('#search-feedback').textContent,
  })) });
  await page.close();
}
await fs.writeFile(new URL('preview-summary.json', dir), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
await browser.close();
