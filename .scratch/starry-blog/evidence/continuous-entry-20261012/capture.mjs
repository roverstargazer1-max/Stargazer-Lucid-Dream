import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const run = process.argv[2] || 'before';
const folder = new URL('./' + run + '/', import.meta.url);
await fs.mkdir(folder, { recursive: true });
const path = name => new URL(name, folder).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, reducedMotion: 'no-preference', recordVideo: { dir: path('video/'), size: { width: 1440, height: 1040 } } });
  const page = await context.newPage();
  if (run === 'no-room-tilt') await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.id === 'room-stage') frames = frames.map(frame => ({ ...frame,
        transform: frame.transform?.replace(/perspective\([^)]*\)|rotate[YZ]\([^)]*\)/g, '') }));
      return animate.call(this, frames, options);
    };
  });
  await page.goto('http://127.0.0.1:4175/?motion=full');
  await page.waitForFunction(() => document.body.classList.contains('starry-ready') && document.body.dataset.liveWindow === 'ready');
  await page.screenshot({ path: path('frame-00.png') });
  await page.evaluate(() => {
    window.entryFrames = [];
    const stage = document.querySelector('.room-stage'), sky = document.querySelector('#sky');
    let begun = false, finished = 0;
    function sample(time) {
      const state = document.body.dataset.room, arrival = document.body.dataset.arrival;
      if (state === 'entering' || arrival) begun = true;
      if (begun) {
        const roomStyle = getComputedStyle(stage), skyStyle = getComputedStyle(sky);
        const m = new DOMMatrix(roomStyle.transform), k = new DOMMatrix(skyStyle.transform);
        const w = sky.clientWidth, h = sky.clientHeight, inverse = k.inverse();
        const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(inverse));
        window.entryFrames.push({ time, state, arrival: arrival || '', opacity: Number(roomStyle.opacity), roomTransform: roomStyle.transform, skyTransform: skyStyle.transform, roomTilt: Math.max(Math.abs(m.m13), Math.abs(m.m23), Math.abs(m.m31), Math.abs(m.m32)), skyCoversViewport: corners.every(p => Math.abs(p.x) <= w / 2 + .1 && Math.abs(p.y) <= h / 2 + .1) });
        if (state === 'outside' && !arrival) finished++;
      }
      if (finished < 3) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  const box = await page.locator('#window-entry').boundingBox();
  await page.locator('#window-entry').click({ position: { x: box.width * .35, y: box.height * .25 } });
  let index = 1;
  const start = Date.now();
  do {
    await page.screenshot({ path: path('frame-' + String(index++).padStart(2, '0') + '.png') });
    await page.waitForTimeout(180);
  } while (Date.now() - start < 10000 && await page.evaluate(() => document.body.dataset.room !== 'outside' || Boolean(document.body.dataset.arrival)));
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.screenshot({ path: path('frame-final.png') });
  const frames = await page.evaluate(() => window.entryFrames);
  const visible = frames.filter(f => f.state === 'entering' && f.opacity > .02);
  const gaps = frames.filter(f => !f.skyCoversViewport);
  const summary = { frames: frames.length, screenshots: index + 1, maxVisibleRoomTilt: Math.max(...visible.map(f => f.roomTilt)), viewportGapFrames: gaps.length, firstGap: gaps[0], firstWarp: visible.find(f => f.roomTilt > .001), durationMs: frames.at(-1).time - frames[0].time };
  await fs.writeFile(path('frames.json'), JSON.stringify(frames, null, 2));
  await fs.writeFile(path('capture-summary.json'), JSON.stringify(summary, null, 2));
  await context.close();
  console.log(JSON.stringify(summary, null, 2));
  assert.equal(gaps.length, 0, 'the moving sky must cover every viewport corner throughout entry');
  assert.ok(summary.maxVisibleRoomTilt < .001, 'the visible room illustration must not tilt and warp before the camera clears the window');
} finally { await browser.close(); }
