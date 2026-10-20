import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const variant = process.argv[2] || 'baseline';
const browser = await chromium.launch({ headless: process.env.PERF_HEADED !== '1', executablePath: process.env.CHROMIUM_PATH || '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  // Interception disables the browser HTTP cache. These two negative-control
  // probes can locate work, but must not be paired with cache-preparation timings.
  // Use physically separate snapshots for a cache-sensitive A/B experiment.
  if (variant.includes('no-player') || variant.includes('freeze-sky')) await page.route('**/js/starfield/app.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    if (variant.includes('no-player')) body = body.replaceAll('void prepareEmbeddedPlayer(node);', '');
    if (variant.includes('freeze-sky')) body = body.replace("(reader.open && body.dataset.reading === 'open')", 'reader.open');
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    window.readerProbe = { tasks: [], frames: [] };
    new PerformanceObserver(list => window.readerProbe.tasks.push(...list.getEntries().map(e => ({ start: e.startTime, ms: e.duration })))).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4191/');
  await page.waitForSelector('body.starry-ready', { state: 'attached' });
  await page.locator('#window-entry').click();
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.locator('#star-targets button').first().evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
  if (variant.includes('no-blur')) await page.addStyleTag({ content: '#reader { filter:none!important; } #reader::backdrop { backdrop-filter:none!important; }' });
  if (variant === 'warm-sheet' || variant === 'warm-all') await page.evaluate(async variant => {
    await Promise.all(['sheet', 'continuation', 'progress-track'].map(async name => { const image = new Image(); image.src = `/images/reader/${name}.webp`; await image.decode(); }));
    if (variant === 'warm-all') await document.fonts.load('16px "LXGW Marker Gothic"');
  }, variant);
  if (process.env.PERF_TRACE) {
    await browser.startTracing(page, { screenshots: false, categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'loading', 'cc', 'gpu'] });
    await client.send('Profiler.enable'); await client.send('Profiler.start');
  }
  await page.evaluate(() => {
    const start = performance.now(); window.readerProbe.start = start;
    let last;
    const tick = now => { if (last !== undefined) window.readerProbe.frames.push(now - last); last = now; if (now - start < 1000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const before = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.locator('#read-button').click();
  await page.waitForTimeout(1100);
  const after = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const result = await page.evaluate(() => ({ ...window.readerProbe, tasks: window.readerProbe.tasks.filter(task => task.start >= window.readerProbe.start), resources: performance.getEntriesByType('resource').filter(e => e.startTime >= window.readerProbe.start).map(e => ({ path: new URL(e.name).pathname, ms: e.duration, bytes: e.encodedBodySize })) }));
  const report = { variant, ...result, maxGap: Math.max(...result.frames), busyMs: (after.TaskDuration - before.TaskDuration) * 1000, scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000 };
  await fs.writeFile(new URL(`./reader-${variant}.json`, import.meta.url), JSON.stringify(report, null, 2));
  if (process.env.PERF_TRACE) {
    await fs.writeFile(new URL(`./reader-${variant}-trace.json`, import.meta.url), await browser.stopTracing());
    await fs.writeFile(new URL(`./reader-${variant}.cpuprofile`, import.meta.url), JSON.stringify((await client.send('Profiler.stop')).profile));
  }
  console.log(JSON.stringify({ ...report, frames: undefined }));
} finally { await browser.close(); }
