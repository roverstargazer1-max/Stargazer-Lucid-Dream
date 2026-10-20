const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

async function inspect(page) {
  return page.evaluate(() => {
    const image = document.querySelector('.room-image');
    const rect = document.querySelector('.room-stage').getBoundingClientRect();
    return {
      source: new URL(image.currentSrc).pathname,
      natural: [image.naturalWidth, image.naturalHeight],
      mask: document.body.dataset.windowMask,
      renderedMask: getComputedStyle(image).maskImage,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      state: document.body.dataset.room,
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.STARFIELD_BROWSER_PATH });
  const reports = [];
  try {
    for (const [name, width, height, reduce = false] of [
      ['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 320, 568],
      ['boundary-mobile', 760, 900], ['boundary-desktop', 761, 900],
      ['landscape', 844, 390], ['reduced', 390, 844, true], ['resize', 1440, 900],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width <= 760,
        isMobile: width <= 760, reducedMotion: reduce ? 'reduce' : 'no-preference' });
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      let release, startup;
      if (name === 'mobile') {
        const gate = new Promise(resolve => { release = resolve; });
        await page.route('**/js/starfield/app.js', async route => { await gate; await route.continue(); });
      }
      await page.goto('http://127.0.0.1:4175/', { waitUntil: name === 'mobile' ? 'commit' : 'load' });
      if (release) {
        await page.waitForFunction(() => document.documentElement.classList.contains('starry-loading') && document.querySelector('.room-image')?.naturalWidth > 0);
        startup = await inspect(page);
        await page.screenshot({ path: path.join(__dirname, 'mobile-startup.png') });
        release();
      }
      await page.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready');
      const initial = await inspect(page);
      assert.equal(initial.source, '/image/starfield/room-poster-detail-v20.webp');
      assert.deepEqual(initial.natural, [1672, 941]);
      assert.equal(initial.mask, '/image/starfield/room-window-mask-v17.svg');
      assert.ok(initial.renderedMask.includes(initial.mask));
      assert.ok(Math.abs(initial.rect.width / initial.rect.height - 1672 / 941) < .0001);
      assert.equal(initial.horizontalOverflow, false);
      if (startup) assert.deepEqual(startup.rect, initial.rect, 'The first frame and ready room must have identical framing');
      await page.screenshot({ path: path.join(__dirname, name + '.png') });
      const point = { x: initial.rect.left + initial.rect.width * .36, y: initial.rect.top + initial.rect.height * .18 };
      assert.equal(await page.evaluate(({x, y}) => document.elementFromPoint(x, y)?.id, point), 'window-entry');
      if (width <= 760) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      if (name === 'resize') {
        await page.waitForFunction(() => document.body.dataset.room === 'entering');
        await page.setViewportSize({ width: 390, height: 844 });
      }
      await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
      const outside = await page.evaluate(() => ({ hidden: document.querySelector('#room').hidden,
        inert: document.querySelector('#world').inert, animations: document.querySelector('.room-stage').getAnimations().length }));
      assert.deepEqual(outside, { hidden: true, inert: false, animations: 0 });
      await page.getByRole('button', { name: '回到窗边', exact: true }).click();
      if (name === 'resize') {
        await page.waitForFunction(() => document.body.dataset.room === 'returning');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
      await page.waitForFunction(() => document.body.dataset.room === 'inside' && !document.body.dataset.arrival);
      const returned = await inspect(page);
      assert.equal(returned.source, initial.source);
      assert.deepEqual(returned.rect, initial.rect);
      assert.ok(!requests.some(url => /room-portrait|room-window-portrait/.test(url)), 'No portrait artwork or aperture should be requested');
      assert.deepEqual(errors, []);
      reports.push({ name, viewport: [width, height], reducedMotion: reduce, initial, startup, outside, returned, errors });
      console.log(name + ': shared image, mask, pointer entry and return passed');
      await page.close();
    }
    await fs.writeFile(path.join(__dirname, 'browser-summary.json'), JSON.stringify(reports, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
