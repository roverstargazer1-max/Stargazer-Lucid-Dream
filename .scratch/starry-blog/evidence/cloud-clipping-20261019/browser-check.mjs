import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ||
  '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const shots = new URL('./shots/', import.meta.url);
await fs.mkdir(shots, { recursive: true });
const summary = { cloudViews: 0, highSkyStrayPixels: 0, exactReproTopPixels: null, interactions: [], ui: [] };

try {
  const page = await browser.newPage({ viewport: { width: 1183, height: 766 }, deviceScaleFactor: 1 });
  await page.route('**/js/starfield/app.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
  await page.goto(url);
  await page.evaluate(async () => {
    const clouds = await import('/js/starfield/interactive-clouds.js');
    const painted = await import('/js/starfield/painted.js');
    const bounds = await import('/js/starfield/camera-bounds.js');
    const dome = await import('/js/starfield/dome.js');
    const articles = (await (await fetch(document.body.dataset.starryIndex)).json()).articles;
    await Promise.all([clouds.prepareInteractiveClouds(), painted.preparePaintedScene()]);
    const canvas = document.createElement('canvas'); canvas.id = 'cloud-probe';
    const world = document.createElement('div');
    document.body.replaceChildren(canvas);
    const cloudScene = clouds.createInteractiveClouds(world, () => false);
    cloudScene.update(0, false);
    window.cloudCheck = { canvas, cloudScene, world, painted, bounds, dome, articles };
  });

  const cloudResult = await page.evaluate(() => {
    const { canvas, cloudScene, bounds, dome } = window.cloudCheck;
    const ctx = canvas.getContext('2d');
    let views = 0, strayPixels = 0, exactTopPixels = 0;
    const failures = [];
    function sample(w, h, input, exact = false) {
      canvas.width = w; canvas.height = h;
      const camera = bounds.constrainSkyCamera(input, w, h);
      const settings = bounds.skyProjection(w, h, camera.zoom);
      cloudScene.paint(ctx, w, h, camera, settings);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      let stray = 0;
      // All clouds, including their activation shift, end below .53 radians.
      // A generous .60 ceiling tolerates edge approximation and antialiasing.
      for (let y = 6; y < h; y += 12) for (let x = 6; x < w; x += 12) {
        if (pixels[(y * w + x) * 4 + 3] <= 10) continue;
        const ray = dome.viewRay(x + .5, y + .5, camera, settings);
        const point = dome.domeIntersection(camera, ray, 5300);
        if (Math.asin(point.y / 5300) > .60) stray++;
      }
      if (exact) for (let y = 0; y < Math.floor(h * .2); y++) for (let x = 0; x < w; x++) {
        if (pixels[(y * w + x) * 4 + 3] > 10) exactTopPixels++;
      }
      views++; strayPixels += stray;
      if (stray) failures.push({ w, h, camera, stray });
    }
    sample(1183, 766, { x: 0, y: 0, z: 0, yaw: 1.365, pitch: 1.24, zoom: .36 }, true);
    for (const [w, h] of [[1183, 766], [390, 844], [844, 390]]) {
      for (const zoom of [.36, .72]) for (const pitch of [.9, 1.24, Math.PI / 2]) {
        for (let i = 0; i < 24; i++) sample(w, h, { x: 0, y: 0, z: 0, yaw: i * Math.PI / 12, pitch, zoom });
      }
    }
    for (let i = 0; i < 24; i++) sample(1183, 766,
      { x: 400, y: 250, z: -200, yaw: i * Math.PI / 12, pitch: 1.24, zoom: .36 });
    return { views, strayPixels, exactTopPixels, failures };
  });
  summary.cloudViews = cloudResult.views;
  summary.highSkyStrayPixels = cloudResult.strayPixels;
  summary.exactReproTopPixels = cloudResult.exactTopPixels;
  assert.equal(cloudResult.exactTopPixels, 0, 'The original strip must not reach the upper fifth');
  assert.deepEqual(cloudResult.failures, [], 'Low clouds must stay out of the high sky throughout rotation');

  for (const [name, yaw, pitch] of [['original-angle', 1.365, 1.24], ['near-zenith', 1.15, 1.4], ['zenith', 1.365, Math.PI / 2]]) {
    await page.evaluate(({ yaw, pitch }) => {
      const { canvas, cloudScene, painted, bounds, dome, articles } = window.cloudCheck;
      canvas.width = 1183; canvas.height = 766;
      const camera = { x: 0, y: 0, z: 0, yaw, pitch, zoom: .36 };
      const settings = bounds.skyProjection(1183, 766, camera.zoom), ctx = canvas.getContext('2d');
      painted.paintPaintedSky(ctx, 1183, 766, camera, settings, { clarity: 1 });
      for (const article of articles) {
        const [x, y, z] = article.position;
        const p = dome.projectDome({ x, y, z }, camera, settings);
        if (p) painted.paintPaintedStar(ctx, p.x, p.y, article.id, { depth: p.depth / 3, importance: article.importance });
      }
      painted.paintCloudVeil(ctx, 1183, 766, camera, settings);
      cloudScene.paint(ctx, 1183, 766, camera, settings);
    }, { yaw, pitch });
    await page.locator('#cloud-probe').screenshot({ path: new URL(`${name}.png`, shots).pathname });
  }

  summary.interactions = await page.evaluate(() => {
    const { canvas, cloudScene, world, bounds } = window.cloudCheck;
    const camera = { x: 0, y: 0, z: 0, yaw: -.38, pitch: .43, zoom: .72 };
    canvas.width = 1183; canvas.height = 766;
    const settings = bounds.skyProjection(1183, 766, camera.zoom), ctx = canvas.getContext('2d');
    const paint = () => { ctx.clearRect(0, 0, 1183, 766); cloudScene.paint(ctx, 1183, 766, camera, settings); };
    cloudScene.update(0, false); paint();
    const button = world.children[0], x = parseFloat(button.style.left), y = parseFloat(button.style.top);
    const hover = cloudScene.hover(x, y, true), tap = cloudScene.tap(x, y);
    cloudScene.update(.4, false); paint();
    const shifted = parseFloat(button.style.left) !== x;
    const before = ctx.getImageData(0, 0, 1183, 766).data;
    paint();
    const after = ctx.getImageData(0, 0, 1183, 766).data;
    const cachedPixelsEqual = before.every((value, i) => value === after[i]);
    cloudScene.update(0, true);
    const blockedTap = cloudScene.tap(x, y);
    return { hover, tap, shifted, cachedPixelsEqual, blockedTap };
  });
  assert.deepEqual(summary.interactions, { hover: true, tap: true, shifted: true, cachedPixelsEqual: true, blockedTap: false });
  await page.close();

  for (const [name, viewport, reducedMotion, mobile] of [
    ['desktop', { width: 1440, height: 900 }, 'no-preference', false],
    ['mobile', { width: 390, height: 844 }, 'no-preference', true],
    ['reduced', { width: 1440, height: 900 }, 'reduce', false],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion, isMobile: mobile, hasTouch: mobile });
    const ui = await context.newPage(), errors = [];
    ui.on('pageerror', error => errors.push(error.message));
    await ui.goto(url);
    await ui.waitForSelector('body.starry-ready', { state: 'attached' });
    await ui.locator('#window-entry').click();
    await ui.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    const entry = ui.locator('#search-entry');
    await entry.waitFor({ state: 'visible' });
    await entry.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
    if (!mobile) { await entry.hover(); await ui.waitForTimeout(700); }
    const hover = await entry.evaluate(element => {
      const style = getComputedStyle(element), ring = getComputedStyle(element, '::before');
      const matrix = new DOMMatrix(style.transform);
      return { ringContent: ring.content, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI };
    });
    assert.ok(['none', 'normal'].includes(hover.ringContent), `${name}: no outer hover ring`);
    if (!mobile) assert.ok(Math.abs(hover.angle - (reducedMotion === 'reduce' ? 0 : -4)) < .1, `${name}: entry turn preserved (${hover.angle})`);
    if (!mobile) {
      const rect = await entry.boundingBox();
      await ui.screenshot({ path: new URL(`${name}-entry-hover.png`, shots).pathname,
        clip: { x: rect.x - 16, y: rect.y - 16, width: rect.width + 32, height: rect.height + 32 } });
      await ui.keyboard.press('Tab'); await entry.focus();
      assert.ok(['none', 'normal'].includes(await entry.evaluate(element => getComputedStyle(element, '::before').content)));
    }
    if (mobile) await entry.tap(); else await entry.click();
    await ui.waitForFunction(() => document.querySelector('#star-search').open);
    await ui.locator('#search-index-toggle').click();
    await ui.locator('#search-query').fill('梦');
    await ui.waitForFunction(() => document.querySelectorAll('#search-results .search-result').length > 0);
    await ui.screenshot({ path: new URL(`${name}-search.png`, shots).pathname });
    await ui.locator('#close-search').click();
    await ui.waitForFunction(() => !document.querySelector('#star-search').open);
    assert.deepEqual(errors, []);
    summary.ui.push({ name, hover, searchRoundTrip: true, errors });
    await context.close();
  }
  await fs.writeFile(new URL('./browser-summary.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
} finally { await browser.close(); }
