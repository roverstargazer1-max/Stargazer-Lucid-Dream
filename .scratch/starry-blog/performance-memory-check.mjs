import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const index = JSON.parse(await fs.readFile('.preview/stargazer/starry/index.json', 'utf8'));
  let article;
  for (const candidate of index.articles) {
    const html = await fs.readFile(path.join('.preview/stargazer', candidate.path, 'index.html'), 'utf8');
    if (!html.includes('class="aplayer"')) { article = candidate; break; }
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const session = await context.newCDPSession(page);
  await session.send('Performance.enable');
  await page.goto(`http://127.0.0.1:4175/${article.path.replace(/^\//, '')}`);
  await page.waitForFunction(() => document.body.dataset.reading === 'open');
  async function closeAndOpen() {
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.getElementById('reader').open);
    await page.locator('#read-button').click();
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
  }
  async function snapshot(cycle) {
    await session.send('HeapProfiler.collectGarbage');
    const metrics = Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    return { cycle, jsHeapMiB: metrics.JSHeapUsedSize / 1048576, domNodes: metrics.Nodes,
      liveElements: await page.evaluate(() => document.querySelectorAll('*').length) };
  }
  for (let cycle = 0; cycle < 3; cycle++) await closeAndOpen();
  const samples = [await snapshot(0)];
  for (let cycle = 1; cycle <= 12; cycle++) {
    await closeAndOpen();
    if (cycle % 4 === 0) samples.push(await snapshot(cycle));
  }
  const heapGrowthMiB = samples.at(-1).jsHeapMiB - samples[0].jsHeapMiB;
  const result = { article: article.id, warmupCycles: 3, repeatedCycles: 12, forcedGC: true, samples, heapGrowthMiB, errors };
  await fs.writeFile('.scratch/starry-blog/evidence/performance-20261008/memory.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  assert.deepEqual(errors, []);
  assert.equal(samples.at(-1).liveElements, samples[0].liveElements);
  assert.ok(heapGrowthMiB < 1, 'reopening the same cached article must not retain a new copy on each cycle');
  await context.close();
} finally { await browser.close(); }
