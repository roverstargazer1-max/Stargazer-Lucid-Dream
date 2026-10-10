import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const label = process.argv[2] || 'baseline';
const targetUrl = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const repetitions = Number(process.env.PERF_REPEATS || 3);
const output = path.resolve('.scratch/starry-blog/evidence/performance-20261009');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
const getMetrics = async session => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
async function sample(page, session, name) {
  const before = await getMetrics(session);
  const frames = await page.evaluate(async () => {
    let progressMutations = 0;
    const observer = new MutationObserver(records => { progressMutations += records.length; });
    for (const id of ['reading-state', 'reading-progress']) observer.observe(document.getElementById(id), { childList: true });
    const intervals = []; let last = performance.now(); const end = last + 4000;
    await new Promise(resolve => {
      function frame(now) {
        intervals.push(now - last); last = now;
        if (now < end) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    const sorted = intervals.slice(1).sort((a, b) => a - b);
    observer.disconnect();
    return { callbacks: intervals.length, intervalP95Ms: sorted[Math.floor(sorted.length * .95)], intervalsOver34Ms: sorted.filter(n => n > 34).length, progressMutations };
  });
  const after = await getMetrics(session);
  const state = await page.evaluate(() => ({ room: document.body.dataset.room, quality: document.body.dataset.renderQuality,
    renderer: document.body.dataset.domeRenderer, heap: performance.memory?.usedJSHeapSize,
    canvases: [...document.querySelectorAll('canvas')].map(c => ({ id: c.id, width: c.width, height: c.height })) }));
  const elapsed = after.Timestamp - before.Timestamp;
  return { name, ...frames, mainThreadBusyPercent: 100 * (after.TaskDuration - before.TaskDuration) / elapsed,
    scriptMsPerSecond: 1000 * (after.ScriptDuration - before.ScriptDuration) / elapsed,
    layoutMsPerSecond: 1000 * (after.LayoutDuration - before.LayoutDuration) / elapsed,
    styleMsPerSecond: 1000 * (after.RecalcStyleDuration - before.RecalcStyleDuration) / elapsed,
    jsHeapMiB: after.JSHeapUsedSize / 1048576, domNodes: after.Nodes, ...state };
}
try {
  for (const device of ['desktop', 'mobile']) for (let repeat = 0; repeat < repetitions; repeat++) {
    const context = await browser.newContext({ viewport: device === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    await page.addInitScript(() => {
      window.__perf = { paints: [], lcp: [], longTasks: [] };
      for (const [type, key] of [['paint', 'paints'], ['largest-contentful-paint', 'lcp'], ['longtask', 'longTasks']]) {
        new PerformanceObserver(list => window.__perf[key].push(...list.getEntries().map(e => ({ name: e.name, start: e.startTime, duration: e.duration, size: e.size })))).observe({ type, buffered: true });
      }
    });
    await page.goto(targetUrl, { waitUntil: 'load' });
    await page.waitForSelector('body.starry-ready', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1500);
    const initialBytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + r.encodedBodySize, 0));
    const room = await sample(page, session, 'room');
    if (!repeat) await page.screenshot({ path: path.join(output, `${label}-${device}-room.png`) });
    await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside');
    await page.waitForTimeout(2500);
    const sky = await sample(page, session, 'sky');
    if (!repeat) await page.screenshot({ path: path.join(output, `${label}-${device}-sky.png`) });
    const targets = page.locator('#star-targets button:visible');
    await targets.first().click({ force: true });
    await page.waitForFunction(() => !document.getElementById('read-button').disabled, { timeout: 15000 });
    await page.waitForTimeout(700);
    const selected = await sample(page, session, 'selected');
    if (!repeat) await page.screenshot({ path: path.join(output, `${label}-${device}-selected.png`) });
    await page.locator('#read-button').click();
    await page.waitForFunction(() => document.getElementById('reader').open);
    await page.waitForTimeout(1000);
    const reader = await sample(page, session, 'reader');
    if (!repeat) await page.screenshot({ path: path.join(output, `${label}-${device}-reader.png`) });
    const loading = await page.evaluate(() => ({ ...window.__perf,
      resources: performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname, type: r.initiatorType, bytes: r.encodedBodySize, decoded: r.decodedBodySize, duration: r.duration })),
      navigation: performance.getEntriesByType('navigation').map(n => ({ domContentLoadedMs: n.domContentLoadedEventEnd, loadMs: n.loadEventEnd })) }));
    const result = { device, repeat, initialBytes, samples: [room, sky, selected, reader], loading, errors };
    results.push(result);
    console.log(JSON.stringify({ device, repeat, initialBytes, samples: result.samples, totalBytes: loading.resources.reduce((n, r) => n + r.bytes, 0), paints: loading.paints, errors }));
    await context.close();
  }
  if (!process.env.PERF_SKIP_THROTTLE) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const started = Date.now();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('body.starry-ready', { state: 'attached', timeout: 60000 });
  const readyMs = Date.now() - started;
  await page.waitForFunction(() => { const img = document.querySelector('.room-image'); return img.complete && img.naturalWidth > 0; }, { timeout: 60000 });
  const roomImageMs = Date.now() - started;
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname, bytes: r.encodedBodySize, duration: r.duration })));
  results.push({ device: 'mobile-throttled', cpuRate: 4, downloadBytesPerSecond: 200000, latencyMs: 150, readyMs, roomImageMs, resources });
  console.log(JSON.stringify(results.at(-1)));
  await context.close();
  }
  await fs.writeFile(path.join(output, `${label}.json`), JSON.stringify({ label, browser: browser.version(), headless: true, repetitions, results }, null, 2));
} finally { await browser.close(); }
