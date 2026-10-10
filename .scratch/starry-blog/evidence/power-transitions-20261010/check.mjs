// Diagnostic browser benchmark: first entry and return, not settled scene performance.
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const label = process.argv[2] || 'baseline';
const output = path.resolve('.scratch/starry-blog/evidence/power-transitions-20261010');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: !process.env.PERF_HEADED,
  executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
const metrics = async session => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
try {
  for (const device of (process.env.PERF_DEVICE || 'desktop,mobile').split(',')) {
    const context = await browser.newContext({ viewport: device === 'desktop' ? { width: Number(process.env.PERF_WIDTH || 1680), height: Number(process.env.PERF_HEIGHT || 970) } : { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: device === 'mobile', hasTouch: device === 'mobile' });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    await session.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.PERF_CPU || 4) });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__transitionLongTasks = [];
      window.__qualityChanges = [];
      new MutationObserver(() => {
        if (!document.body) return;
        window.__qualityChanges.push({time: performance.now(), quality: document.body.dataset.renderQuality, roomBlur: document.body.dataset.roomBlur});
      }).observe(document, {subtree: true, attributes: true, attributeFilter: ['data-render-quality', 'data-room-blur']});
      new PerformanceObserver(list => window.__transitionLongTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
      window.__sampleTransition = duration => {
        const intervals = [], started = performance.now(); let last, firstFrameDelayMs;
        window.__transitionSample = new Promise(resolve => {
          const tick = now => {
            if (last !== undefined) intervals.push(now - last);
            else firstFrameDelayMs = performance.now() - started;
            last = now;
            if (now - started < duration) requestAnimationFrame(tick);
            else {
              const sorted = intervals.slice().sort((a, b) => a - b);
              resolve({ intervals, frames: intervals.length, firstFrameDelayMs, intervalP95Ms: sorted[Math.floor(sorted.length * .95)], maxGapMs: Math.max(...intervals),
                gapsOver34Ms: intervals.filter(n => n > 34).length, gapsOver50Ms: intervals.filter(n => n > 50).length,
                longTasks: window.__transitionLongTasks.filter(e => e.start >= started), qualityChanges: window.__qualityChanges.filter(e => e.time >= started).map(e => ({...e, time: e.time - started})), room: document.body.dataset.room,
                quality: document.body.dataset.renderQuality, roomBlur: document.body.dataset.roomBlur, renderer: document.body.dataset.domeRenderer });
            }
          };
          requestAnimationFrame(tick);
        });
      };
      document.addEventListener('click', event => {
        if (event.target.closest('#window-entry, #home')) {
          performance.mark(event.target.closest('#window-entry') ? 'transition-enter' : 'transition-return');
          window.__sampleTransition(event.target.closest('#window-entry') ? 2800 : 2900);
        }
      }, true);
    });
    if (process.env.PERF_VARIANT === 'local-vars') await page.addInitScript(() => {
      const set = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
        if (document.body && this === document.body.style) {
          if (name === '--sky-clarity') return;
          if (name === '--entry-bank' || name === '--entry-scale') return set.call(document.getElementById('sky').style, name, value, priority);
        }
        return set.call(this, name, value, priority);
      };
    });
    if (['no-scenery', 'no-veil', 'ratio-one', 'direct-canvases', 'direct-split-filter'].includes(process.env.PERF_VARIANT)) {
      await page.route('**/js/starfield/dome-renderer.js', async route => {
        const response = await route.fetch();
        let source = await response.text();
        if (process.env.PERF_VARIANT === 'no-scenery') source = source.replace('if(!image.complete||!image.naturalWidth)return false;', 'return true;');
        if (process.env.PERF_VARIANT === 'no-veil') source = source.replace('if(!image.complete||!image.naturalWidth)return false;', 'if(overlay)return true; if(!image.complete||!image.naturalWidth)return false;');
        if (process.env.PERF_VARIANT === 'ratio-one') source = source.replace('Math.min(devicePixelRatio||1,pixelRatioCap)', '1');
        if (process.env.PERF_VARIANT.startsWith('direct-')) {
          source = source.replace("const cache=[0,1].map(()=>({key:null,canvas:document.createElement('canvas')}));", 'const cache=[0,1].map(()=>({key:null,canvas}));');
          source = source.replace(/    if\(entry.canvas.width!==rw[\s\S]*?entry.key=key;return entry.canvas;/, '    entry.key=key;return canvas;');
          source = source.replace('if(!renderer)renderer=createRenderer(image);', 'if(!renderer)renderer=[createRenderer(image),createRenderer(image)];');
          source = source.replace('if(!renderer)return false;', 'if(!renderer[overlay?1:0])return false;');
          source = source.replace('renderer.draw(w,h,camera,settings,overlay)', 'renderer[overlay?1:0].draw(w,h,camera,settings,overlay)');
        }
        await route.fulfill({response, body: source});
      });
    }
    if (['split-filter', 'direct-split-filter'].includes(process.env.PERF_VARIANT)) {
      await page.route('**/js/starfield/painted.js', async route => {
        const response = await route.fetch();
        const source = (await response.text()).replace('timeline.add(stage,short?', 'const roomFrames=short?').replace(']);\n    return timeline;', "];\n    timeline.add(stage,roomFrames.map(({filter,...frame})=>frame));\n    if(!short)timeline.add(stage.querySelector('.room-image'),roomFrames.map(({filter,offset})=>({filter,offset})));\n    return timeline;");
        await route.fulfill({response, body: source});
      });
    }
    await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/', { waitUntil: 'load' });
    await page.waitForSelector('body.starry-ready', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(300);
    if (process.env.PERF_VARIANT === 'no-room') await page.addStyleTag({ content: '.room-stage picture { visibility: hidden !important; }' });
    if (process.env.PERF_VARIANT === 'no-room-filter') await page.addStyleTag({ content: '.room-stage { filter: none !important; }' });
    if (process.env.PERF_VARIANT === 'promote-sky') await page.addStyleTag({ content: '#sky { will-change: transform; }' });
    if (process.env.PERF_VARIANT === 'identity-transforms') await page.addStyleTag({ content: '#sky { transform: rotate(0rad) scale(1); } .room-stage { transform: perspective(1100px) translate(0,0) rotateY(0deg) rotateZ(0deg) scale(1); }' });
    if (process.env.PERF_VARIANT === 'warm-renderer') await page.evaluate(async () => {
      const { paintPaintedSky, paintCloudVeil } = await import('/js/starfield/painted.js');
      const { entranceFrame } = await import('/js/starfield/motion.js');
      const canvas = document.getElementById('sky'), ctx = canvas.getContext('2d');
      for (const time of [16, 32, 0]) {
        const camera = entranceFrame(time, innerWidth <= 760 ? .78 : 1);
        const settings = { cx: innerWidth * (innerWidth <= 760 ? .56 : .5), cy: innerHeight * (innerWidth <= 760 ? .49 : .46), focal: Math.min(innerWidth, innerHeight * 1.2) * 1.05 * camera.zoom };
        paintPaintedSky(ctx, innerWidth, innerHeight, camera, settings, { clarity: 0 });
        paintCloudVeil(ctx, innerWidth, innerHeight, camera, settings);
      }
      window.dispatchEvent(new Event('resize'));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    if (process.env.PERF_TRACE) await browser.startTracing(page, { screenshots: false, categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'cc', 'gpu', 'viz'] });
    if (process.env.PERF_PROFILE) { await session.send('Profiler.enable'); await session.send('Profiler.setSamplingInterval', { interval: 100 }); await session.send('Profiler.start'); }
    for (let cycle = 0; cycle < Number(process.env.PERF_CYCLES || 2); cycle++) {
      for (const [name, control] of [['enter', '#window-entry'], ['return', '#home']]) {
        const before = await metrics(session);
        if (device === 'mobile') await page.locator(control).tap(); else await page.locator(control).click();
        const sample = await page.evaluate(() => window.__transitionSample);
        const after = await metrics(session);
        const result = { device, cycle, name, cpuRate: Number(process.env.PERF_CPU || 4), ...sample,
          mainThreadBusyPercent: 100 * (after.TaskDuration - before.TaskDuration) / (after.Timestamp - before.Timestamp),
          scriptMs: 1000 * (after.ScriptDuration - before.ScriptDuration), styleMs: 1000 * (after.RecalcStyleDuration - before.RecalcStyleDuration),
          layoutMs: 1000 * (after.LayoutDuration - before.LayoutDuration), errors: errors.slice() };
        results.push(result);
        console.log(JSON.stringify({ ...result, intervals: undefined, longTasks: result.longTasks.map(e => Math.round(e.duration)) }));
        await page.waitForFunction(state => document.body.dataset.room === state, name === 'enter' ? 'outside' : 'inside');
        await page.waitForTimeout(300);
      }
    }
    if (process.env.PERF_TRACE) await fs.writeFile(path.join(output, `${label}-${device}-trace.json`), await browser.stopTracing());
    if (process.env.PERF_PROFILE) await fs.writeFile(path.join(output, `${label}-${device}.cpuprofile`), JSON.stringify((await session.send('Profiler.stop')).profile));
    await context.close();
  }
  await fs.writeFile(path.join(output, `${label}.json`), JSON.stringify({ label, browser: browser.version(), cpuRate: Number(process.env.PERF_CPU || 4), variant: process.env.PERF_VARIANT, results }, null, 2));
} finally { await browser.close(); }
if (process.env.PERF_ASSERT) {
  const failures = results.filter(r => r.intervalP95Ms > 25 || r.firstFrameDelayMs > 80 || r.maxGapMs > 80 || r.gapsOver50Ms > 2 || r.errors.length);
  if (failures.length) throw new Error(`Transition stutter: ${failures.map(r => `${r.device}/${r.cycle}/${r.name}: p95=${r.intervalP95Ms.toFixed(1)}ms, max=${r.maxGapMs.toFixed(1)}ms, >50ms=${r.gapsOver50Ms}`).join('; ')}`);
}
