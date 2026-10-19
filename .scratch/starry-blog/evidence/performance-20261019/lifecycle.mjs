import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
const readOpen = page => page.waitForFunction(() => document.body.dataset.reading === 'open');
const searchOpen = page => page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
try {
  for (const scenario of (process.env.PERF_SCENARIOS || 'desktop,mobile,landscape,soft,resize').split(',')) {
    console.log('scenario', scenario);
    const mobile = scenario === 'mobile' || scenario === 'soft';
    const soft = scenario === 'soft';
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : scenario === 'landscape' ? { width: 844, height: 390 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: soft ? 'reduce' : 'no-preference' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(soft ? new URL('?motion=soft', url).href : url); await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.locator('#window-entry').click({ position: await page.locator('#window-entry').evaluate(el => ({ x: el.clientWidth * .35, y: el.clientHeight * .25 })) });
    if (scenario === 'resize') { await page.waitForTimeout(150); await page.setViewportSize({ width: 1024, height: 768 }); }
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    await page.locator('#star-targets button').first().evaluate(button => button.click());
    await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
    await page.locator('#read-button').click();
    if (scenario === 'resize') { await page.waitForTimeout(50); await page.setViewportSize({ width: 800, height: 650 }); }
    await readOpen(page);
    assert.equal(await page.locator('#reading-scroll').evaluate(el => el.inert), false);
    assert.ok((await page.locator('#reader-content').textContent()).trim().length > 20);
    const readerBlur = await page.locator('#reader').evaluate(el => getComputedStyle(el, '::backdrop').backdropFilter);
    assert.equal(readerBlur, `blur(${soft ? 0 : 2.4}px)`);
    await page.locator('#reading-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#reader').open);
    await page.locator('#search-entry').click();
    if (scenario === 'resize') { await page.waitForTimeout(50); await page.setViewportSize({ width: 390, height: 844 }); }
    await searchOpen(page);
    const searchBlur = await page.locator('#star-search').evaluate(el => getComputedStyle(el, '::backdrop').backdropFilter);
    assert.equal(searchBlur, `blur(${soft ? 0 : 1.2}px)`);
    await page.locator('#search-index-toggle').click();
    await page.locator('#search-query').fill('SLD-0001');
    await page.waitForFunction(() => document.querySelectorAll('#search-results .search-result').length === 1);
    await page.locator('#search-results .search-result').click(); await readOpen(page);
    await page.keyboard.press('Escape'); await searchOpen(page);
    assert.equal(await page.locator('#search-query').inputValue(), 'SLD-0001');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#star-search').open);
    await page.locator('#home').click();
    await page.waitForFunction(() => document.body.dataset.room === 'inside');
    assert.equal(await page.locator('#world').evaluate(el => el.inert), true);
    assert.deepEqual(errors, []);
    results.push({ scenario, readerBlur, searchBlur, operations: 'enter, select, read, scroll, close, search, filter, read, restore search, close, return', errors });
    await page.close();
  }
  // Warm both interfaces, then look for retained DOM, styles or native effects
  // across repeated reader/search visits. Forced GC removes transient garbage.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const client = await page.context().newCDPSession(page); await client.send('Performance.enable');
  await page.goto(new URL('?motion=soft', url).href); await page.waitForSelector('body.starry-ready', { state: 'attached' });
  await page.locator('#window-entry').click({ position: await page.locator('#window-entry').evaluate(el => ({ x: el.clientWidth * .35, y: el.clientHeight * .25 })) });
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.locator('#star-targets button').first().evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
  const cycle = async () => {
    await page.locator('#read-button').click(); await readOpen(page);
    await page.locator('#close-reader').click(); await page.waitForFunction(() => !document.querySelector('#reader').open);
    await page.locator('#search-entry').click(); await searchOpen(page);
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#star-search').open);
  };
  for (let i = 0; i < 3; i++) await cycle();
  const samples = [];
  const snapshot = async cycle => {
    await page.waitForTimeout(150); await client.send('HeapProfiler.collectGarbage');
    const metrics = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    samples.push({ cycle, heapBytes: metrics.JSHeapUsedSize, nodes: metrics.Nodes, ...await page.evaluate(() => ({ elements: document.querySelectorAll('*').length, styles: document.querySelectorAll('style').length, animations: document.getAnimations().length })) });
  };
  await snapshot(0);
  for (let i = 1; i <= 12; i++) { await cycle(); if (i % 4 === 0) await snapshot(i); }
  const growthBytes = samples.at(-1).heapBytes - samples[0].heapBytes;
  assert.ok(growthBytes < 1048576, 'revisiting cached UI must not retain a new copy per visit');
  assert.ok(samples.at(-1).elements <= samples[0].elements + 100);
  assert.equal(samples.at(-1).styles, samples[0].styles);
  assert.equal(samples.at(-1).animations, samples[0].animations);
  assert.deepEqual(errors, []);
  results.push({ scenario: 'memory', warmupCycles: 3, repeatedCycles: 12, forcedGC: true, samples, growthBytes, errors });
  await page.close();
  await fs.writeFile(new URL('./lifecycle-summary.json', import.meta.url), JSON.stringify({ browser: browser.version(), results }, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
