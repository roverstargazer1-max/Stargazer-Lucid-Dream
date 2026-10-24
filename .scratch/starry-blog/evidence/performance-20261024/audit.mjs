import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const label = process.argv[2] || 'baseline';
const root = new URL('./', import.meta.url);
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const rate = Number(process.env.PERF_CPU || 1);
const browser = await chromium.launch({ headless: process.env.PERF_HEADED !== '1', args: ['--disable-backgrounding-occluded-windows'], channel: 'chrome' });
const results = [], loads = [], networkFailures = [];
const metrics = async client => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
try {
  for (const device of (process.env.PERF_DEVICES || 'desktop,mobile').split(',')) {
    const mobile = device === 'mobile';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', request => {
      const resource = new URL(request.url());
      networkFailures.push({ device, path: resource.origin + resource.pathname,
        external: resource.origin !== new URL(url).origin, error: request.failure()?.errorText });
    });
    const client = await context.newCDPSession(page);
    await client.send('Performance.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.addInitScript(() => {
      const tasks = [], paints = [];
      new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => ({ start: e.startTime, ms: e.duration })))).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver(list => paints.push(...list.getEntries().map(e => ({ start: e.startTime, size: e.size })))).observe({ type: 'largest-contentful-paint', buffered: true });
      let generation = 0, start = 0, last = null, firstFrameDelayMs = null, frames = [], skyPaints = 0;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.id === 'sky') skyPaints++;
        return clear.apply(this, args);
      };
      window.perfAudit = {
        begin() {
          const current = ++generation;
          start = performance.now(); last = null; firstFrameDelayMs = null; frames = []; skyPaints = 0;
          const tick = now => {
            if (current !== generation) return;
            if (last === null) firstFrameDelayMs = performance.now() - start;
            if (last !== null) frames.push(now - last);
            last = now; requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        end() {
          generation++;
          const sorted = frames.slice().sort((a, b) => a - b);
          return { elapsedMs: performance.now() - start, frames: frames.length, p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: Math.max(0, ...frames), firstFrameDelayMs, over34: frames.filter(n => n > 34).length, over50: frames.filter(n => n > 50).length, skyPaints, visibility: document.visibilityState,
            longTasks: tasks.filter(task => task.start >= start), quality: document.body.dataset.renderQuality, room: document.body.dataset.room };
        },
        load() {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return { readyMs: performance.now(), domContentLoadedMs: nav.domContentLoadedEventEnd, loadMs: nav.loadEventEnd, lcp: paints.at(-1), longTasks: tasks.slice(), resources: resources.length, encodedBytes: resources.reduce((sum, r) => sum + r.encodedBodySize, 0), largest: resources.slice().sort((a, b) => b.encodedBodySize - a.encodedBodySize).slice(0, 8).map(r => ({ path: new URL(r.name).pathname, bytes: r.encodedBodySize, durationMs: r.duration })) };
        },
      };
    });

    async function sample(name, action = () => page.waitForTimeout(1500)) {
      const before = await metrics(client);
      await page.evaluate(() => window.perfAudit.begin());
      await action();
      const timing = await page.evaluate(() => window.perfAudit.end());
      assert.ok(timing.frames > 0 && timing.p50 > 0, `${name}: invalid RAF sample`);
      const after = await metrics(client);
      const result = { device, name, cpuRate: rate, ...timing, busyMs: 1000 * (after.TaskDuration - before.TaskDuration), scriptMs: 1000 * (after.ScriptDuration - before.ScriptDuration), layoutMs: 1000 * (after.LayoutDuration - before.LayoutDuration), layoutCount: after.LayoutCount - before.LayoutCount, styleMs: 1000 * (after.RecalcStyleDuration - before.RecalcStyleDuration), heapBytes: after.JSHeapUsedSize, nodes: after.Nodes, errors: errors.slice() };
      results.push(result); console.log(JSON.stringify(result));
      await fs.writeFile(new URL(`${label}.json`, root), JSON.stringify({ label, browser: browser.version(), url, rate, results, loads, networkFailures }, null, 2));
    }
    const delay = ms => page.waitForTimeout(ms);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    loads.push({ device, name: 'starfield', ...await page.evaluate(() => window.perfAudit.load()) });
    await sample('room-idle');
    await sample('enter', async () => {
      await page.locator('#window-entry').click();
      await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
      await delay(100);
    });
    await sample('sky-idle');
    await sample('pan', async () => {
      if (mobile) {
        const points = (x, y) => [{ x, y, id: 1 }];
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(180, 240) });
        for (let i = 1; i <= 24; i++) {
          await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(180 + i * 3, 240 + i * 2) }); await delay(16);
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(620, 300); await page.mouse.down();
        await page.mouse.move(780, 390, { steps: 30 }); await page.mouse.up();
      }
      await delay(200);
    });
    await sample('zoom', async () => {
      if (mobile) {
        const points = span => [{ x: 195 - span, y: 300, id: 1 }, { x: 195 + span, y: 300, id: 2 }];
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(30) });
        for (const span of [35, 40, 45, 50, 55, 60, 65, 70]) { await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(span) }); await delay(35); }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(720, 300);
        for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -35); await delay(35); }
      }
      await delay(200);
    });
    await sample('select', async () => {
      // A real article target; keyboard activation also works when the camera's pan moved it out of frame.
      await page.locator('#star-targets button').first().evaluate(button => button.click());
      await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
      await delay(100);
    });
    await sample('selected-idle');
    await sample('reader-open', async () => {
      await page.locator('#read-button').click();
      await page.waitForFunction(() => document.body.dataset.reading === 'open');
      await delay(100);
    });
    await sample('reader-idle');
    await sample('reader-scroll', async () => {
      await page.evaluate(() => new Promise(resolve => {
        const scroll = document.querySelector('#reading-scroll'), started = performance.now();
        const max = scroll.scrollHeight - scroll.clientHeight;
        function tick(now) { const progress = Math.min(1, (now - started) / 1000); scroll.scrollTop = max * progress; if (progress < 1) requestAnimationFrame(tick); else resolve(); }
        requestAnimationFrame(tick);
      }));
      await delay(200);
    });
    await sample('reader-close', async () => {
      await page.locator('#close-reader').click(); await page.waitForFunction(() => !document.querySelector('#reader').open); await delay(100);
    });
    await sample('search-open', async () => {
      await page.locator('#search-entry').click(); await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion); await delay(100);
    });
    await sample('search-index', async () => { await page.locator('#search-index-toggle').click(); await delay(800); });
    await sample('search-input', async () => {
      for (const text of ['梦', '随笔', 'SLD-0001', '']) { await page.locator('#search-query').fill(text); await delay(120); }
      await delay(300);
    });
    await page.locator('#search-results .search-result').first().hover();
    await sample('search-hover');
    await sample('search-close', async () => {
      await page.locator('#close-search').click(); await page.waitForFunction(() => !document.querySelector('#star-search').open); await delay(100);
    });
    await sample('mode-time', async () => {
      await page.locator('#time-mode').click(); await page.waitForFunction(() => !document.querySelector('#read-button').disabled); await delay(100);
    });
    await sample('return', async () => {
      await page.locator('#home').click(); await page.waitForFunction(() => document.body.dataset.room === 'inside'); await delay(100);
    });
    if (!process.env.PERF_NO_LEGACY) {
      await page.goto(new URL('/legacy/', url).href, { waitUntil: 'load' }); await delay(400);
      loads.push({ device, name: 'legacy-home', ...await page.evaluate(() => window.perfAudit.load()) });
      await sample('legacy-home-idle');
      const scrollLegacy = async () => {
        for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 120); await delay(50); }
        await delay(200);
      };
      await sample('legacy-home-scroll', scrollLegacy);
      const article = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href).find(href => /\/legacy\/20\d{2}\//.test(href)));
      if (!article) throw Error('Legacy article link missing');
      await page.goto(article, { waitUntil: 'load' }); await delay(400);
      loads.push({ device, name: 'legacy-article', ...await page.evaluate(() => window.perfAudit.load()) });
      await sample('legacy-article-idle');
      await sample('legacy-article-scroll', scrollLegacy);
    }
    await context.close();
  }
  const report = { label, browser: browser.version(), url, rate, results, loads, networkFailures };
  await fs.writeFile(new URL(`${label}.json`, root), JSON.stringify(report, null, 2));
  await fs.writeFile(new URL(`${label}-summary.json`, root), JSON.stringify({ ...report, loads: loads.map(load => ({ ...load, largest: undefined })), results: results.map(result => ({ ...result, longTasks: result.longTasks.map(task => Math.round(task.ms)), heapBytes: undefined, nodes: undefined })) }, null, 2) + '\n');
} finally { await browser.close(); }
