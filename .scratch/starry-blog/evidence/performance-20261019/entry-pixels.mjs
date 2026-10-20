import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
let comparisons = 0;
try {
  for (const dpr of [.75, 1, 1.5, 2]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
    await page.route('**/js/starfield/app.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
    await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
    await page.addStyleTag({ content: '#search-entry, #search-entry * { animation:none!important;transition:none!important; }' });
    await page.evaluate(() => {
      document.body.classList.add('starry-ready'); document.body.dataset.room = 'outside';
      document.querySelector('#room').hidden = true;
      const entry = document.querySelector('#search-entry'); entry.hidden = false;
      Object.assign(entry.style, { position: 'fixed', left: '20px', top: '20px', bottom: 'auto' });
    });
    for (const side of [60, 72, 100]) for (const yaw of [0, .8, Math.PI, 5.7]) for (const hover of [false, true]) {
      await page.evaluate(({ side, yaw }) => {
        const entry = document.querySelector('#search-entry');
        Object.assign(entry.style, { width: `${side}px`, height: `${side}px` });
        entry.style.setProperty('--view-heading', `${yaw}rad`);
      }, { side, yaw });
      await page.mouse.move(hover ? 20 + side / 2 : 500, hover ? 20 + side / 2 : 500);
      const buffers = [];
      for (const optimized of [false, true]) {
        await page.evaluate(async optimized => {
          await Promise.all([...document.querySelectorAll('#search-entry img')].map(async image => {
            const repair = image.classList.contains('search-entry-repair');
            image.src = optimized ? `/images/optimized/entry-${repair ? 'repair' : 'base'}.webp`
              : `/images/search/entry-${repair ? 'disc-repair' : 'blue-purple'}.png`;
            await image.decode();
          }));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }, optimized);
        buffers.push(await page.screenshot({ clip: { x: 0, y: 0, width: side + 48, height: side + 48 } }));
      }
      comparisons++;
      if (!buffers[0].equals(buffers[1])) {
        const prefix = `entry-${dpr}-${side}-${yaw}-${hover}`;
        await fs.writeFile(new URL(`./${prefix}-before.png`, import.meta.url), buffers[0]);
        await fs.writeFile(new URL(`./${prefix}-after.png`, import.meta.url), buffers[1]);
        throw Error(`Entry pixels changed: ${prefix}`);
      }
    }
    await page.close();
  }
  const summary = { comparisons, dpr: [.75, 1, 1.5, 2], side: [60, 72, 100], yaw: [0, .8, Math.PI, 5.7], hover: [false, true], changedScreenshots: 0 };
  await fs.writeFile(new URL('./entry-pixels-summary.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  assert.equal(comparisons, 96);
} finally { await browser.close(); }
