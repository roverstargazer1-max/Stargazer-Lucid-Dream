import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const directory = new URL('./', import.meta.url);
const baseline = process.argv.includes('--before');
const index = JSON.parse(await fs.readFile('.preview/stargazer/starry/index.json', 'utf8'));
const article = index.articles.find(item => item.title.includes('功效主义'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

try {
  for (const [name, viewport, options] of [
    ['desktop', { width: 1440, height: 1000 }, {}],
    ['mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
    ['narrow', { width: 320, height: 740 }, { isMobile: true, hasTouch: true }],
    ['landscape', { width: 844, height: 390 }, { isMobile: true, hasTouch: true }],
    ['reduced', { width: 1440, height: 1000 }, { reducedMotion: 'reduce' }],
    ['soft', { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
  ]) {
    if (baseline && name !== 'desktop') continue;
    const page = await browser.newPage({ viewport, ...options });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:4175/${article.path}${name === 'soft' ? '?motion=soft' : ''}`);
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
    await page.evaluate(() => document.fonts.ready);
    const states = [];
    for (const fraction of [0, .5, .99, 1]) {
      await page.evaluate(fraction => {
        const scroll = document.querySelector('#reading-scroll');
        const bottom = document.querySelector('#reader-content').getBoundingClientRect().bottom - scroll.getBoundingClientRect().top + scroll.scrollTop;
        scroll.scrollTop = fraction * Math.max(0, bottom - scroll.clientHeight);
      }, fraction);
      await page.waitForFunction(percent => Number(document.querySelector('#reading-journey').getAttribute('aria-valuenow')) === percent, Math.round(fraction * 100));
      await page.waitForTimeout(300);
      const state = await page.evaluate(() => {
        const scroll = document.querySelector('#reading-scroll');
        const walker = document.querySelector('.reading-walker').getBoundingClientRect();
        const rail = document.querySelector('.reading-rail').getBoundingClientRect();
        return { percent: Number(document.querySelector('#reading-journey').getAttribute('aria-valuenow')), overflow: scroll.scrollWidth > scroll.clientWidth, walkerRight: walker.right, railRight: rail.right };
      });
      assert.equal(state.overflow, false);
      if (fraction === 1) assert.ok(state.walkerRight < state.railRight);
      states.push(state);
      if (fraction === .99) {
        const prefix = `${name}-${baseline ? 'before' : 'after'}`;
        await page.screenshot({ path: new URL(`${prefix}.png`, directory).pathname });
        const footer = await page.locator('.reading-footer').boundingBox();
        await page.screenshot({ path: new URL(`${prefix}-detail.png`, directory).pathname, clip: { x: footer.x, y: footer.y - 100, width: footer.width, height: footer.height + 100 } });
      }
    }
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open);
    assert.deepEqual(errors, []);
    results.push({ name, viewport, states, closed: true, errors });
    await page.close();
  }
  if (!baseline) await fs.writeFile(new URL('browser-summary.json', directory), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
