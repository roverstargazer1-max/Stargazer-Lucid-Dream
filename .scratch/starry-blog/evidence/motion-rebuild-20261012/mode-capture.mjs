import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

const out = new URL('./mode-shots/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const p = name => new URL(name, out).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const errors = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('#window-entry').click();
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: p('00-relation.png') });
  await page.locator('#time-mode').click();
  let last = 0;
  for (const t of [150, 450, 800, 1200, 2200]) {
    await page.waitForTimeout(t - last); last = t;
    await page.screenshot({ path: p(`01-to-time-${t}.png`) });
  }
  await page.locator('#relation-mode').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: p('02-to-relation-600.png') });
} finally {
  await browser.close();
  console.log('errors', JSON.stringify(errors));
}
