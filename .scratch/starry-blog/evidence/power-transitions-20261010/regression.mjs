import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1680, height: 970 }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage();
    // Exercise every pressure fallback deterministically, independently of GPU speed.
    await page.route('**/js/starfield/render-budget.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('sampleFrame(interval, moving) {', 'sampleFrame(interval, moving) { if(moving)interval=50;') });
    });
    await page.addInitScript(() => {
      window.__transitionWrites = [];
      window.__foregroundResizes = [];
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
      Object.defineProperty(HTMLCanvasElement.prototype, 'width', { ...descriptor, set(value) {
        if (this.id === 'sky' && document.body?.classList.contains('starry-ready')) {
          window.__foregroundResizes.push({ room: document.body.dataset.room, arrival: document.body.dataset.arrival,
            moving: Boolean(document.body.dataset.arrival || ['entering', 'returning'].includes(document.body.dataset.room)), width: value });
        }
        descriptor.set.call(this, value);
      } });
      const set = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = function (name, ...args) {
        if (document.body && this === document.body.style && ['--entry-bank', '--entry-scale', '--sky-clarity'].includes(name)) window.__transitionWrites.push(name);
        return set.call(this, name, ...args);
      };
    });
    await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.evaluate(() => {
      window.__emptySkyFrames = 0;
      const canvas = document.getElementById('sky'), ctx = canvas.getContext('2d');
      function inspect() {
        if (!ctx.getImageData(0, 0, 1, 1).data[3]) window.__emptySkyFrames++;
        window.__skyInspection = requestAnimationFrame(inspect);
      }
      window.__skyInspection = requestAnimationFrame(inspect);
    });
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const [name, selector, expected] of [['enter', '#window-entry', 'outside'], ['return', '#home', 'inside']]) {
        if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
        const running = await page.evaluate(() => {
          const animation = document.getElementById('room-stage').getAnimations()[0];
          return { playState: animation.playState, rate: animation.playbackRate, timing: animation.effect.getTiming(),
            rootWrites: window.__transitionWrites.slice(), keyframes: animation.effect.getKeyframes() };
        });
        assert.equal(running.playState, 'running', `${name} must use native playback rather than per-frame seeks`);
        assert.equal(running.rate, name === 'enter' ? 1 : -1);
        assert.equal(running.timing.duration, name === 'enter' ? 1900 : 2600);
        assert.deepEqual(running.rootWrites, [], 'Hidden articles must not inherit per-frame scene styles');
        assert.equal(running.keyframes.at(-1).filter, 'blur(1px)', 'Retain original blur and full passage');
        assert.match(running.keyframes.at(-1).transform, /scale\(6.2\)/);
        // Resize while in flight, exercising timeline replacement in both directions.
        if (cycle === 1) await page.setViewportSize(mobile ? { width: 412, height: 844 } : { width: 1600, height: 970 });
        await page.waitForFunction(state => document.body.dataset.room === state, expected);
        if (name === 'enter') await page.waitForFunction(() => !document.body.dataset.arrival);
        const settled = await page.evaluate(() => ({ animations: document.getElementById('room-stage').getAnimations().length,
          roomHidden: document.getElementById('room').hidden, worldInert: document.getElementById('world').inert,
          quality: document.body.dataset.renderQuality, roomBlur: document.body.dataset.roomBlur,
          emptySkyFrames: window.__emptySkyFrames, foregroundResizes: window.__foregroundResizes,
          filter: getComputedStyle(document.getElementById('room-stage')).filter }));
        assert.equal(settled.animations, 0, 'No completed room animation survives the transition');
        assert.equal(settled.roomHidden, name === 'enter');
        assert.equal(settled.worldInert, name === 'return');
        assert.equal(settled.quality, 'low', 'Repeated pressure must reach the existing background fallback');
        assert.equal(settled.roomBlur, 'off');
        assert.equal(settled.filter, 'none');
        assert.equal(settled.emptySkyFrames, 0, 'A quality change must never present a cleared sky canvas');
        if (cycle === 0) assert.ok(settled.foregroundResizes.every(change => !change.moving), 'Pressure must not rebuild the main canvas during the camera passage');
        results.push({ device: mobile ? 'mobile' : 'desktop', cycle, name, ...settled });
      }
    }
    await page.goto(`${process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/'}?motion=soft`);
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    for (const [name, selector, expected] of [['enter', '#window-entry', 'outside'], ['return', '#home', 'inside']]) {
      if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
      await page.waitForFunction(state => document.body.dataset.room === state, expected);
      const settled = await page.evaluate(() => ({ animations: document.getElementById('room-stage').getAnimations().length,
        roomHidden: document.getElementById('room').hidden, worldInert: document.getElementById('world').inert,
        transientCameraStyles: document.getElementById('sky').style.cssText, rootWrites: window.__transitionWrites.slice() }));
      assert.equal(settled.animations, 0);
      assert.deepEqual(settled.rootWrites, []);
      assert.equal(settled.roomHidden, name === 'enter');
      assert.equal(settled.worldInert, name === 'return');
      assert.doesNotMatch(settled.transientCameraStyles, /--entry-/);
      results.push({ device: mobile ? 'mobile' : 'desktop', name, motion: 'soft', ...settled });
    }
    await context.close();
  }
  console.log(JSON.stringify(results));
  await fs.writeFile('.scratch/starry-blog/evidence/power-transitions-20261010/regression-summary.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
