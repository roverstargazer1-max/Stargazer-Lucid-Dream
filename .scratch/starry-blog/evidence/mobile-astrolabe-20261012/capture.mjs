import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const samples = [
  { name: 'mobile', width: 390, height: 844, touch: true },
  { name: 'narrow', width: 320, height: 568, touch: true },
  { name: 'reference', width: 450, height: 875, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
  { name: 'desktop', width: 1440, height: 1000, touch: false },
];
const summary = [];
async function measure(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const { x, y, width, height, right, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const entry = rect('#search-entry'), modes = rect('.mode-switch'), silhouette = rect('.observation-silhouette');
    const overlaps = b => entry.x < b.right && entry.right > b.x && entry.y < b.bottom && entry.bottom > b.y;
    const hit = !!document.elementFromPoint(entry.x + entry.width / 2, entry.y + entry.height / 2)?.closest('#search-entry');
    return { entry, modes, silhouette, modeGap: modes.y - entry.bottom, overlapsModes: overlaps(modes), overlapsSilhouette: overlaps(silhouette), centerHitsEntry: hit };
  });
}
try {
  for (const sample of samples) {
    const context = await browser.newContext({ viewport: { width: sample.width, height: sample.height }, isMobile: sample.touch, hasTouch: sample.touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4175/');
    await page.waitForFunction(() => document.body.dataset.liveWindow === 'ready', null, { timeout: 30000 });
    // Bootstrap the sky directly; this capture checks the relocated entry's real hit area.
    await page.locator('#window-entry').evaluate(button => button.click());
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    await page.waitForTimeout(1200);
    const initial = await measure(page);
    await page.locator('#star-targets button').first().evaluate(button => button.click());
    await page.waitForFunction(() => !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled);
    await page.waitForTimeout(1000);
    const selected = await measure(page);
    await page.screenshot({ path: fileURLToPath(new URL(`${sample.name}.png`, out)) });
    if (sample.touch) await page.locator('#search-entry').tap();
    else await page.locator('#search-entry').click();
    await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#star-search').open && !document.querySelector('#search-entry').hidden);
    await page.mouse.move(sample.width / 2, sample.height / 2);
    await page.waitForTimeout(600);
    const returned = await measure(page);
    let resized;
    if (sample.name === 'desktop') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(600);
      resized = await measure(page);
      await page.screenshot({ path: fileURLToPath(new URL('desktop-to-mobile.png', out)) });
    }
    const item = { ...sample, initial, selected, returned, resized, errors };
    summary.push(item);
    await fs.writeFile(new URL('browser-summary.json', out), JSON.stringify(summary, null, 2) + '\n');
    console.log(JSON.stringify({ name: sample.name, entry: selected.entry, modeGap: selected.modeGap, overlapsModes: selected.overlapsModes, overlapsSilhouette: selected.overlapsSilhouette, centerHitsEntry: selected.centerHitsEntry, selectionShift: selected.entry.y - initial.entry.y, returnShift: returned.entry.y - selected.entry.y, errors }));
    await context.close();
  }
} finally { await browser.close(); }
