import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const results = [];
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1440, height = mobile ? 844 : 900;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const client = await context.newCDPSession(page);
    await page.goto(process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/');
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    if (mobile) await page.locator('#window-entry').tap(); else await page.locator('#window-entry').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    const positions = () => page.locator('#star-targets button').evaluateAll(buttons =>
      JSON.stringify(buttons.map(button => [button.style.left, button.style.top, button.hidden])));
    const beforeDrag = await positions();
    const x = width * .5, y = height * .4;
    if (mobile) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 70, y: y + 30, id: 1 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + 100, y + 30, { steps: 8 }); await page.mouse.up();
    }
    await page.waitForTimeout(200);
    const afterDrag = await positions();
    assert.notEqual(afterDrag, beforeDrag, 'real pointer/touch dragging must update projected star positions');
    if (mobile) {
      const points = span => [{ x: x - span, y, id: 1 }, { x: x + span, y, id: 2 }];
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(30) });
      for (const span of [40, 55, 75]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(span) });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.wheel(0, -240);
    }
    await page.waitForTimeout(200);
    assert.notEqual(await positions(), afterDrag, 'wheel/pinch zoom must update projected star positions');
    if (mobile) await page.locator('#home').tap(); else await page.locator('#home').click();
    await page.waitForFunction(() => document.body.dataset.room === 'inside');
    assert.deepEqual(errors, []);
    results.push({ device: mobile ? 'touch-simulation' : 'desktop', drag: 'passed', zoom: 'passed', return: 'passed', errors });
    await context.close();
  }
  await fs.writeFile(new URL('./gesture-summary.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
