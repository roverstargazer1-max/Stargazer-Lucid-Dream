import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const label = process.argv[2] || 'current';
const base = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disk-cache-size=1048576'] });
const results = [];
try {
  for (const slow of [false, true].filter(slow => !process.env.PERF_NETWORK || process.env.PERF_NETWORK === (slow ? 'slow' : 'fast'))) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    const network=new Map();
    client.on('Network.requestWillBeSent',e=>network.set(e.requestId,{path:new URL(e.request.url).pathname,start:e.timestamp,type:e.type}));
    client.on('Network.loadingFinished',e=>Object.assign(network.get(e.requestId)||{},{end:e.timestamp,bytes:e.encodedDataLength}));
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: slow ? 150 : 100, downloadThroughput: (slow ? 1.6 : 9) * 1e6 / 8, uploadThroughput: 1e6 / 8 });
    await page.addInitScript(() => {
      window.__readerDecoded = new Map();
      const decode=HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode=function(...args){const url=this.src;return decode.apply(this,args).then(value=>{if(/images\/optimized\/interface-reader-/.test(url))window.__readerDecoded.set(url,performance.now());return value;});};
      const changes = [];
      new MutationObserver(() => {
        const room = document.body?.dataset.room;
        if (room && room !== changes.at(-1)?.room) changes.push({ room, time: performance.now() });
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-room'] });
      window.__journey = changes;
    });
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'), null, { timeout: 120000 });
    const ready = await page.evaluate(() => ({ time: performance.now(), activeOptionalImages: document.querySelectorAll('#preview img[src], #search-entry img[src], #reader img[src]').length }));
    const clickTime = await page.evaluate(() => performance.now());
    await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival, null, { timeout: 120000 });
    const entered = await page.evaluate(() => ({ time: performance.now(), transitions: window.__journey, shellComplete: [...document.querySelectorAll('.masthead img, .sky-polyhedron img, #search-entry img, #exploration-controls img')].every(image => image.complete && image.naturalWidth > 0) }));
    const selectTime = await page.evaluate(() => performance.now());
    await page.locator('#star-targets button').first().evaluate(button => button.click());
    await page.waitForFunction(() => !document.querySelector('#read-button').disabled, null, { timeout: 120000 });
    await page.locator('#read-button').click();
    await page.waitForFunction(() => document.body.dataset.reading === 'open', null, { timeout: 120000 });
    const read = await page.evaluate(() => ({ time: performance.now(), text: document.querySelector('#reader-content')?.textContent.length || 0, artDecoded: window.__readerDecoded.size, fontsLoaded: document.fonts.check('16px \"LXGW Marker Gothic UI\"',document.querySelector('#reader-title')?.textContent || ' '), readerControlsComplete: [...document.querySelectorAll('#reader img:not([data-src])')].every(image => image.complete && image.naturalWidth > 0) }));
    if(process.env.PERF_DIAGNOSE) console.log(JSON.stringify({when:'first-read',network:[...network.values()]}));
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open);
    const searchTime = await page.evaluate(() => performance.now());
    await page.locator('#search-entry').click();
    await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion, null, { timeout: 120000 });
    const search = await page.evaluate(() => ({ time: performance.now(), loadedImages: [...document.querySelectorAll('#star-search img[src]')].filter(image => image.complete && image.naturalWidth).length, totalImages: document.querySelectorAll('#star-search img[src]').length }));
    await page.waitForFunction(()=>[...document.querySelectorAll('#star-search img[src]')].every(i=>i.complete&&i.naturalWidth),null,{timeout:30000});
    const fullyStyledSearch=await page.evaluate(()=>performance.now());
    search.fullyStyledMs=fullyStyledSearch-searchTime;
    read.artDecodedAt=await page.evaluate(()=>[...window.__readerDecoded]);
    await page.locator('#close-search').click();
    await page.waitForFunction(() => !document.querySelector('#star-search').open);
    await page.locator('.journal-sky-entry').click();
    await page.waitForSelector('#window-journal .journal-entry', { timeout: 120000 });
    assert.equal(await page.locator('#window-journal .journal-entry').count(), 13);
    assert.equal(await page.locator('#window-journal .journal-entry img').count(), 0);
    const row = { network: slow ? 'slow4g' : 'fast4g', browser: browser.version(), ready, enteringDelayMs: entered.transitions.find(event => event.room === 'entering').time - clickTime, enterTotalMs: entered.time - clickTime, entered, firstSelectionToReadMs: read.time - selectTime, read, searchOpenMs: search.time - searchTime, search, errors };
    console.log(JSON.stringify(row));
    if (read.artDecoded < 3) console.log(JSON.stringify(await page.evaluate(()=>({decoded:[...window.__readerDecoded], resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize,start:r.startTime,end:r.responseEnd})).filter(r=>r.startTime>4000)}))));
    assert.ok(entered.shellComplete && read.readerControlsComplete && read.text > 0);
    assert.deepEqual(errors, []);
    if(!slow)assert.equal(read.artDecoded,3,'normal 4G reader should be styled at reveal');
    if(!slow)assert.equal(search.loadedImages,search.totalImages,'normal 4G search should be styled at reveal');
    results.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(new URL(`${label}-journey-summary.json`, import.meta.url), JSON.stringify({ label, base, results }, null, 2) + '\n');
}
