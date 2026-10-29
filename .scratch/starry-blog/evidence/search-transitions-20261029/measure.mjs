import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const label = process.argv[2] || 'baseline';
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4187/';
const rate = Number(process.env.PERF_CPU || 4);
const limit = Number(process.env.PERF_MAX_GAP || 100);
const root = new URL('./', import.meta.url);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { label, url, rate, assetsOverridden: Boolean(process.env.PERF_ASSET_ROOT), browser: browser.version(), results: [] };
try {
  for (const device of (process.env.PERF_DEVICES || 'desktop,mobile').split(',')) {
    const mobile = device === 'mobile';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    if (process.env.PERF_ASSET_ROOT) {
      // Local overrides against the real CDN: both comparison sides use the
      // same interception (and therefore the same disabled HTTP-cache policy).
      for (const file of ['js/starfield/app.bundle.js', 'css/starry/world.bundle.css']) {
        await page.route(`**/${file}?*`, route => route.fulfill({ path: path.resolve(process.env.PERF_ASSET_ROOT, file), contentType: file.endsWith('.js') ? 'text/javascript' : 'text/css' }));
      }
    }
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    const client = await context.newCDPSession(page);
    await client.send('Performance.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    if (process.env.PERF_NETWORK !== 'off') await client.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 9e6 / 8, uploadThroughput: 1e6 / 8 });
    await page.addInitScript(() => {
      let recording = false, started = 0, last = 0;
      const frames = [], tasks = [];
      const showModal = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function (...args) {
        const begin = performance.now();
        const result = showModal.apply(this, args);
        performance.measure(`modal-${this.id}`, { start: begin, end: performance.now() });
        return result;
      };
      new PerformanceObserver(list => { if (recording) tasks.push(...list.getEntries().map(entry => ({ at: entry.startTime - started, ms: entry.duration }))); }).observe({ type: 'longtask', buffered: true });
      const tick = now => { if (recording) { frames.push(now - last); last = now; } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      window.searchPerf = {
        begin() { frames.length = tasks.length = 0; last = started = performance.now(); recording = true; },
        end() {
          recording = false;
          const sorted = frames.slice().sort((a, b) => a - b);
          return { elapsedMs: performance.now() - started, frames: frames.length, maxGapMs: Math.max(...frames), p95Ms: sorted[Math.floor(sorted.length * .95)], over50: frames.filter(ms => ms > 50).length, tasks: tasks.slice(), modals: performance.getEntriesByType('measure').filter(entry => entry.startTime >= started).map(entry => ({ name: entry.name, ms: entry.duration })) };
        },
      };
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body.starry-ready', { state: 'attached', timeout: 45000 });
    const assets = await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.src || node.href));
    await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    if (process.env.PERF_PROBE === 'keep-clip') await page.addStyleTag({ content: '#star-search:not([data-motion]):not([data-soft=true]) { clip-path:circle(200vmax at 50% 50%); }' });
    if (process.env.PERF_PROBE === 'freeze-backdrop') await page.evaluate(() => {
      const rule = [...document.querySelectorAll('style')].find(sheet => sheet.textContent === '#star-search::backdrop {}')?.sheet.cssRules[0];
      if (!rule) throw Error('Dynamic backdrop rule missing');
      for (const name of ['background', 'backdropFilter']) Object.defineProperty(rule.style, name, { set() {} });
    });
    if (process.env.PERF_PROBE === 'warm-fonts') await page.evaluate(async () => {
      const text = [...document.querySelectorAll('#star-targets button')].map(node => node.getAttribute('aria-label')).join('');
      await document.fonts.load('400 16px "LXGW Marker Gothic"', text);
    });
    if (process.env.PERF_PROBE === 'scoped-unfold') await page.evaluate(() => {
      const dialog = document.querySelector('#star-search');
      const selector = '.search-artboard,.search-map,.search-heading,.search-bar,.search-filters,#search-index-toggle,.search-map canvas,.search-map-star';
      const layers = [...dialog.querySelectorAll(selector)];
      for (const name of ['--unfold', '--stage-a', '--stage-b', '--stage-c']) CSS.registerProperty({ name, syntax: '<number>', inherits: false, initialValue: '0' });
      const sheet = document.createElement('style');
      sheet.textContent = `${selector} { --stage-a:clamp(0, calc((var(--unfold) - .18) / .42), 1); --stage-b:clamp(0, calc((var(--unfold) - .34) / .42), 1); --stage-c:clamp(0, calc((var(--unfold) - .5) / .4), 1); } #star-search::after,.search-map-star::before { --unfold:inherit; }`;
      document.head.append(sheet);
      const set = dialog.style.setProperty.bind(dialog.style);
      dialog.style.setProperty = (name, value, priority) => {
        set(name, value, priority);
        if (name === '--unfold') for (const layer of layers) layer.style.setProperty(name, value, priority);
      };
    });
    if (process.env.PERF_TRACE) await client.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing', transferMode: 'ReturnAsStream' });
    const metrics = async () => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    for (let round = 1; round <= 2; round++) {
      for (const action of ['open', 'close']) {
        const before = await metrics(), firstRequest = requests.length;
        await page.evaluate(name => { performance.mark(name); window.searchPerf.begin(); }, `${round}-${action}`);
        if (action === 'open') {
          await page.locator('#search-entry').click();
          await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
        } else {
          await page.locator('#close-search').click();
          await page.waitForFunction(() => !document.querySelector('#star-search').open);
        }
        await page.waitForTimeout(150);
        const timing = await page.evaluate(() => window.searchPerf.end());
        const after = await metrics();
        assert.ok(timing.frames > 5, 'Animation frame sample missing');
        const result = { device, round, action, ...timing, busyMs: 1000 * (after.TaskDuration - before.TaskDuration), layoutMs: 1000 * (after.LayoutDuration - before.LayoutDuration), styleMs: 1000 * (after.RecalcStyleDuration - before.RecalcStyleDuration), requests: requests.slice(firstRequest), errors: errors.slice(), pass: timing.maxGapMs <= limit && errors.length === 0 };
        report.results.push(result);
        console.log(JSON.stringify({ ...result, requests: result.requests.length }));
        await fs.writeFile(new URL(`${label}.json`, root), JSON.stringify({ ...report, assets }, null, 2) + '\n');
      }
    }
    if (process.env.PERF_TRACE) {
      const complete = new Promise(resolve => client.once('Tracing.tracingComplete', resolve));
      await client.send('Tracing.end');
      const { stream } = await complete;
      let data = '';
      for (;;) {
        const chunk = await client.send('IO.read', { handle: stream });
        data += chunk.data;
        if (chunk.eof) break;
      }
      await client.send('IO.close', { handle: stream });
      await fs.writeFile(new URL(`${label}-${device}-trace.json`, root), data);
    }
    await page.screenshot({ path: new URL(`${label}-${device}.png`, root).pathname });
    await context.close();
  }
  await fs.writeFile(new URL(`${label}-summary.json`, root), JSON.stringify(report, null, 2) + '\n');
  if (report.results.some(result => !result.pass)) process.exitCode = 1;
} finally {
  await browser.close();
}
