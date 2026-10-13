import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const label = 'paired-selected';
const targetUrl = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const repetitions = 3;
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
for(const label of ['baseline','optimized','optimized','baseline','baseline','optimized']) {
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
 const page=await context.newPage(),session=await context.newCDPSession(page);
 await session.send('Performance.enable');
 await page.goto(`http://127.0.0.1:${label==='baseline'?4177:4175}/`);
 await page.waitForSelector('body.starry-ready',{state:'attached'});
 await page.waitForTimeout(5500);
 await page.locator('#window-entry').click();
 await page.waitForFunction(()=>document.body.dataset.room==='outside');
 await page.waitForTimeout(6500);
 await page.locator('#star-targets button:visible').first().click({force:true});
 await page.waitForFunction(()=>!document.getElementById('read-button').disabled);
 await page.waitForTimeout(700);
 const result={label,...await sample(page,session,'selected'),selected:await page.locator('#star-targets .is-selected').getAttribute('aria-label')};
 results.push(result);console.log(JSON.stringify(result));await context.close();
}
await fs.writeFile(path.join(output,'paired-selected.json'),JSON.stringify(results,null,2));
}finally{await browser.close();}
