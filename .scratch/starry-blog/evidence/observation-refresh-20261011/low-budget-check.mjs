import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
  const page = await context.newPage();
  await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
  await page.waitForSelector('body.starry-ready', { state: 'attached' });
  await page.locator('#window-entry').evaluate(button => button.click());
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.locator('#star-targets button').first().evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled);
  await page.locator('#preview img').evaluateAll(images => Promise.all(images.filter(image => image.src).map(image => image.decode())));
  const motion = await page.evaluate(async () => {
    const selectors = ['.observation-silhouette canvas', '.observation-waveform canvas'];
    const frames = selectors.map(() => new Set());
    for (let index = 0; index < 4; index++) {
      selectors.forEach((selector, i) => frames[i].add(document.querySelector(selector).toDataURL()));
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return { quality: document.body.dataset.renderQuality, motion: document.body.dataset.motion,
      canvasHidden: selectors.map(selector => document.querySelector(selector).hidden),
      walkerFrames: frames[0].size, waveformFrames: frames[1].size };
  });
  console.log(JSON.stringify(motion));
  assert.equal(motion.quality, 'low', 'the regression must exercise the low rendering budget');
  assert.deepEqual(motion.canvasHidden, [false, false], 'the visible panel must use its walking and frequency canvases even at low quality');
  assert.ok(motion.walkerFrames > 1, 'walking must continue at low quality');
  assert.ok(motion.waveformFrames > 1, 'frequency waves must continue at low quality');
  results.push(motion);
  await page.screenshot({ path: fileURLToPath(new URL('./low-budget-fixed.png', import.meta.url)) });
  await fs.writeFile(new URL('./low-budget-summary.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); }
