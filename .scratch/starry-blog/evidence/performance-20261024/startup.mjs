import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const label = process.argv[2] || 'baseline';
const base = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175';
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--disk-cache-size=1048576'] });
const results = [];
const cases = [
  { name: 'desktop-cold', width: 1440, height: 900, cpu: 1 },
  { name: 'mobile-cold', width: 390, height: 844, mobile: true, cpu: 1 },
  { name: 'mobile-fast4g', width: 390, height: 844, mobile: true, cpu: 4, mbps: 9, latency: 100 },
  { name: 'mobile-slow4g', width: 390, height: 844, mobile: true, cpu: 4, mbps: 1.6, latency: 150 },
];
try {
  for (const settings of cases.filter(item => !process.env.PERF_CASE || process.env.PERF_CASE.split(',').includes(item.name))) {
    const context = await browser.newContext({ viewport: { width: settings.width, height: settings.height }, deviceScaleFactor: 2, isMobile: !!settings.mobile, hasTouch: !!settings.mobile });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send('Performance.enable');
    await client.send('Network.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate: settings.cpu });
    if (settings.mbps) await client.send('Network.emulateNetworkConditions', { offline: false, latency: settings.latency, downloadThroughput: settings.mbps * 1e6 / 8, uploadThroughput: 1e6 / 8 });
    const requests = new Map(), errors = [];
    client.on('Network.requestWillBeSent', event => requests.set(event.requestId, { url: event.request.url, type: event.type, start: event.timestamp, initiator: event.initiator.type }));
    client.on('Network.responseReceived', event => Object.assign(requests.get(event.requestId) || {}, { status: event.response.status, cache: !!event.response.fromDiskCache, mime: event.response.mimeType }));
    client.on('Network.loadingFinished', event => Object.assign(requests.get(event.requestId) || {}, { end: event.timestamp, encodedBytes: event.encodedDataLength }));
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const result = { tasks: [], lcp: [], shifts: [], readyMs: null, roomDecodedMs: null };
      document.addEventListener('load',event=>{if(event.target?.matches?.('.room-image'))event.target.decode().then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{result.roomDecodedMs=performance.now();}))).catch(()=>{});},true);
      new PerformanceObserver(list => result.tasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver(list => result.lcp.push(...list.getEntries().map(entry => ({ time: entry.startTime, size: entry.size, element: entry.element?.className || entry.element?.id, url: entry.url })))).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => result.shifts.push(...list.getEntries().filter(entry => !entry.hadRecentInput).map(entry => entry.value))).observe({ type: 'layout-shift', buffered: true });
      const observe = () => {
        if (document.body?.classList.contains('starry-ready') && !result.readyMs) result.readyMs = performance.now();
      };
      new MutationObserver(observe).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
      window.__startupAudit = result;
    });
    const started = Date.now();
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'), null, { timeout: 120000 });
    await page.waitForTimeout(700);
    const sample = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { ...window.__startupAudit, now: performance.now(), fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, domMs: nav.domContentLoadedEventEnd, loadMs: nav.loadEventEnd,
        resources: performance.getEntriesByType('resource').map(resource => ({ url: resource.name, start: resource.startTime, end: resource.responseEnd, bytes: resource.encodedBodySize, duration: resource.duration, initiator: resource.initiatorType })),
        room: document.body.dataset.room, quality: document.body.dataset.renderQuality, activeJournalImages: document.querySelectorAll('.journal-entry img').length };
    });
    const network = [...requests.values()].filter(request => request.url.startsWith('http')).map(request => ({ ...request, path: new URL(request.url).pathname, url: undefined }));
    const row = { settings, browser: browser.version(), elapsedMs: Date.now() - started, ...sample, errors, network };
    results.push(row);
    console.log(JSON.stringify({ name: settings.name, readyMs: sample.readyMs, fcp: sample.fcp, roomDecodedMs: sample.roomDecodedMs, lcp: sample.lcp.at(-1), cls: sample.shifts.reduce((sum, shift) => sum + shift, 0), requests: network.length, bytes: network.reduce((sum, request) => sum + (request.encodedBytes || 0), 0), unfinished: network.filter(request => !request.end).map(request => request.path), largest: sample.resources.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(resource => ({ path: new URL(resource.url).pathname, bytes: resource.bytes, end: resource.end })), errors }));
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(new URL(`${label}-startup-summary.json`, import.meta.url), JSON.stringify({ label, base, results }, null, 2) + '\n');
}
if (process.env.PERF_ASSERT === '1') {
  for (const row of results) {
    assert.deepEqual(row.errors, []);
    assert.ok(row.readyMs < (row.settings.mbps === 1.6 ? 10000 : 4000), `${row.settings.name}: scene preparation exceeds the loading budget (${Math.round(row.readyMs)}ms)`);
    assert.ok(row.network.reduce((sum, request) => sum + (request.encodedBytes || 0), 0) < 3 * 1024 * 1024, `${row.settings.name}: initial transfers exceed 3 MiB`);
  }
}
