import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

const out = new URL('./shots/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const p = name => new URL(name, out).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });

async function ready(page) {
  await page.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
}

try {
  // Desktop room
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4175/');
  await ready(page);
  await page.screenshot({ path: p('01-room-desktop.png') });

  // Into sky
  await page.locator('#window-entry').click();
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: p('02-sky-desktop.png') });

  // Select a star -> observation panel
  const articles = await page.evaluate(async () => (await (await fetch(document.body.dataset.starryIndex)).json()).articles);
  await page.locator('#star-targets button').nth(0).evaluate(b => b.click());
  await page.waitForFunction(() => !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled, null, { timeout: 15000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: p('03-observation-desktop.png') });

  // Reader
  await page.locator('#read-button').click();
  await page.waitForFunction(() => document.querySelector('#reader')?.open, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: p('04-reader-desktop.png') });
  await page.evaluate(() => { const s = document.querySelector('#reading-scroll'); s.scrollTop = s.scrollHeight * 0.45; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: p('05-reader-mid-desktop.png') });
  await page.locator('#close-reader').click();
  await page.waitForTimeout(1500);

  // Search
  await page.locator('#search-entry').click();
  await page.waitForFunction(() => document.querySelector('#star-search')?.open, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: p('06-search-desktop.png') });
  await page.locator('#search-query').fill('梦');
  await page.waitForTimeout(900);
  await page.screenshot({ path: p('07-search-results-desktop.png') });
  await page.locator('#search-index-toggle').click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: p('08-search-index-desktop.png') });
  await ctx.close();

  // Mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  await mp.goto('http://127.0.0.1:4175/');
  await ready(mp);
  await mp.screenshot({ path: p('10-room-mobile.png') });
  await mp.locator('#window-entry').evaluate(b => b.click());
  await mp.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 20000 });
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: p('11-sky-mobile.png') });
  await mp.locator('#star-targets button').nth(0).evaluate(b => b.click());
  await mp.waitForFunction(() => !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled, null, { timeout: 15000 });
  await mp.waitForTimeout(2200);
  await mp.screenshot({ path: p('12-observation-mobile.png') });
  await mp.locator('#read-button').evaluate(b => b.click());
  await mp.waitForFunction(() => document.querySelector('#reader')?.open, null, { timeout: 15000 });
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: p('13-reader-mobile.png') });
  await mctx.close();
  console.log('done');
} finally { await browser.close(); }
