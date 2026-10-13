import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

const out = new URL('./search-shots/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const p = name => new URL(name, out).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('#window-entry').click();
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator('#search-entry').hover(); await page.waitForTimeout(500);
  await page.screenshot({ path: p('00-entry-hover.png') });
  await page.locator('#search-entry').click();
  for (const t of [120, 300, 520, 1100]) {
    await page.waitForTimeout(t - (t === 120 ? 0 : 0));
    await page.screenshot({ path: p(`01-open-${t}.png`) });
  }
  console.log('unfold after open', await page.evaluate(() => document.getElementById('star-search').style.getPropertyValue('--unfold')));
  await page.locator('[data-filter=year] .search-filter-options button').nth(0).click();
  await page.waitForTimeout(160); await page.screenshot({ path: p('02-filter-mid.png') });
  await page.locator('[data-filter=year] .search-filter-options button').nth(1).click();
  await page.waitForTimeout(200); await page.screenshot({ path: p('03-filter-travel.png') });
  await page.waitForTimeout(900); await page.screenshot({ path: p('04-index-open.png') });
  await page.locator('.search-result').first().hover(); await page.waitForTimeout(700);
  await page.screenshot({ path: p('05-row-hover.png') });
  const star = page.locator('.search-map-star:not(.is-muted)').first();
  await star.hover(); await page.waitForTimeout(700);
  await page.screenshot({ path: p('06-star-hover.png') });
  await page.locator('#close-search').hover(); await page.waitForTimeout(500);
  await page.screenshot({ path: p('07-close-hover.png') });
  await page.locator('#close-search').click();
  await page.waitForTimeout(180); await page.screenshot({ path: p('08-closing.png') });
  await page.waitForTimeout(900); await page.screenshot({ path: p('09-closed.png') });
  console.log('dialog open after close', await page.evaluate(() => document.getElementById('star-search').open));
  // Mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await m.newPage(); mp.on('pageerror', e => errors.push(String(e)));
  await mp.goto('http://127.0.0.1:4175/');
  await mp.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready', null, { timeout: 30000 });
  await mp.locator('#window-entry').click();
  await mp.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 20000 });
  await mp.waitForTimeout(800);
  await mp.locator('#search-entry').click(); await mp.waitForTimeout(400);
  await mp.screenshot({ path: p('10-mobile-opening.png') });
  await mp.waitForTimeout(1000);
  await mp.locator('[data-filter=magnitude] .search-filter-options button').nth(1).click();
  await mp.waitForTimeout(900); await mp.screenshot({ path: p('11-mobile-filter.png') });
} finally {
  console.log('errors', JSON.stringify(errors));
  await browser.close();
}
