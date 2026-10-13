// Run against a frozen baseline and the rebuilt preview, one browser at a time.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const label = process.argv[2] || 'optimized';
const browser = await chromium.launch({
  headless: process.env.PERF_HEADED !== '1',
  executablePath: process.env.CHROMIUM_PATH || '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
});
const results = [];
const metrics = async client => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 2,
      isMobile: width < 760, hasTouch: width < 760,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const client = await context.newCDPSession(page);
    await client.send('Performance.enable');
    await page.addInitScript(() => {
      window.__audit = { rects: 0, walkerSizes: 0, guideMutations: 0 };
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function (...args) {
        window.__audit.rects++;
        return rect.apply(this, args);
      };
      for (const property of ['clientWidth', 'clientHeight']) {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, property);
        Object.defineProperty(Element.prototype, property, { ...descriptor, get() {
          if (this.classList?.contains('reading-walker')) window.__audit.walkerSizes++;
          return descriptor.get.call(this);
        } });
      }
      new MutationObserver(records => {
        window.__audit.guideMutations += records.filter(record => record.target.id === 'edge-guide').length;
      }).observe(document, { subtree: true, attributes: true });
    });
    if (process.env.AUDIT_SKIP_HIDDEN) await page.route('**/js/starfield/app.js', async route => {
      const response = await route.fetch();
      let source = await response.text();
      if (process.env.AUDIT_SKIP_HIDDEN === 'reading') source = source.replace('readingWalker.render(now,', 'reader.open && readingWalker.render(now,');
      if (process.env.AUDIT_SKIP_HIDDEN === 'polyhedron') source = source.replace('polyhedron.render(now,', '!roomScene?.active && !reader.open && polyhedron.render(now,');
      await route.fulfill({ response, body: source });
    });
    await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    async function sample(state) {
      await page.waitForTimeout(700);
      const before = await metrics(client);
      const counts = await page.evaluate(async () => {
        const initial = { ...window.__audit }, intervals = [];
        let last;
        await new Promise(resolve => {
          const begin = performance.now();
          function tick(now) {
            if (last !== undefined) intervals.push(now - last);
            last = now;
            if (now - begin < 2000) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
        intervals.sort((a, b) => a - b);
        return {
          ...Object.fromEntries(Object.keys(initial).map(key => [key, window.__audit[key] - initial[key]])),
          p95: intervals[Math.floor(intervals.length * .95)], max: Math.max(...intervals),
          quality: document.body.dataset.renderQuality,
        };
      });
      const after = await metrics(client);
      const result = { width, state, ...counts,
        layoutCount: after.LayoutCount - before.LayoutCount,
        layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
        styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
        busyMs: (after.TaskDuration - before.TaskDuration) * 1000, errors: errors.slice(),
      };
      results.push(result);
      console.log(JSON.stringify(result));
    }
    await sample('room');
    if (!process.env.AUDIT_ROOM_ONLY) {
      await page.locator('#window-entry').click();
      await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
      await sample('sky');
      await page.locator('#star-targets button:visible').first().click({ force: true });
      await page.waitForFunction(() => !document.getElementById('read-button').disabled);
      await sample('selected');
      await page.locator('#read-button').click();
      await page.waitForFunction(() => document.body.dataset.reading === 'open');
      await sample('reader');
    }
    await context.close();
  }
  await fs.writeFile(new URL(`./${label}-runtime.json`, import.meta.url), JSON.stringify({ browser: browser.version(), results }, null, 2));
  if (process.env.PERF_ASSERT) {
    assert.ok(results.every(result => !result.errors.length));
    assert.ok(results.filter(result => ['sky', 'selected'].includes(result.state)).every(result => result.guideMutations === 0), 'a stationary navigation hint must not be rewritten every frame');
  }
} finally {
  await browser.close();
}
