import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRANCE, entranceFrame, returnFrame } from '../themes/stargazer-starfield/source/js/starfield/motion.js';
import { roomPassageFrames } from '../themes/stargazer-starfield/source/js/starfield/room-scene.js';

test('the room stays opaque and undistorted, keeps advancing, and finishes beyond the clear aperture', () => {
  for (const [width, height] of [[1440, 1040], [1920, 1080], [3440, 1440], [800, 1300], [760, 900], [761, 900], [390, 844], [320, 568], [844, 390]]) {
    const aspect = 1.77683, anchor = width <= 760 ? .20 : .50;
    const w = Math.max(width, height * aspect), h = Math.max(height, width / aspect);
    const rect = { width: w, height: h, left: (width - w) * anchor, top: (height - h) / 2 };
    const { origin, frames } = roomPassageFrames(rect, width, height);
    assert.ok(frames.every(frame => frame.opacity === 1));
    assert.ok(frames.every(frame => /^translate\([^)]*\) scale\([^)]*\)$/.test(frame.transform)), 'Only uniform scale and translation may move the illustration');
    const scales = frames.map(frame => Number(frame.transform.match(/scale\(([-\d.e]+)\)/)[1]));
    assert.ok(scales.every((scale, i) => !i || scale > scales[i - 1]), 'The room must not finish its push and wait for the turn');
    const [, x, y, scale] = frames.at(-1).transform.match(/translate\(([-\d.e]+)px,([-\d.e]+)px\) scale\(([-\d.e]+)\)/).map(Number);
    // These clear rectangles lie inside the existing aperture masks, above all foreground silhouettes.
    const clear = [.36, .04, .66, .44];
    for (const [px, py] of [[0, 0], [width, 0], [width, height], [0, height]]) {
      const u = (px - rect.left - origin.x - x) / (scale * w) + origin.x / w;
      const v = (py - rect.top - origin.y - y) / (scale * h) + origin.y / h;
      assert.ok(u >= clear[0] && u <= clear[2] && v >= clear[1] && v <= clear[3], `${width}×${height}: foreground remains at the end of the shot`);
    }
  }
});

test('the camera pushes and turns together throughout the shot, with no middle pause and a smooth stop', () => {
  for (const windowZoom of [1, .78]) {
    assert.equal(entranceFrame(0, windowZoom).yaw, 0);
    assert.equal(entranceFrame(0, windowZoom).zoom, windowZoom);
    for (let elapsed = 100; elapsed < ENTRANCE.duration - 100; elapsed += 100) {
      const frame = entranceFrame(elapsed, windowZoom);
      const before = entranceFrame(elapsed - 10, windowZoom), after = entranceFrame(elapsed + 10, windowZoom);
      assert.ok(after.z > before.z, 'Forward movement must continue throughout the shot');
      assert.ok(after.yaw > before.yaw, 'Turning must overlap the forward movement');
      assert.equal(frame.bank, 0);
    }
    const end = entranceFrame(ENTRANCE.duration, windowZoom), nearEnd = entranceFrame(ENTRANCE.duration - 1, windowZoom);
    assert.equal(end.yaw, ENTRANCE.turn);
    assert.equal(end.zoom, .72);
    assert.equal(end.done, true);
    assert.ok(Math.abs(end.yaw - nearEnd.yaw) < 1e-8, 'The turn must decelerate rather than cut to its endpoint');
  }
});

test('return starts at the explored camera and continues retreating and turning without a handoff jump', () => {
  const from = { x: 700, y: 300, z: -150, yaw: 5.8, pitch: .85, zoom: 1.4 };
  for (const windowZoom of [1, .78]) {
    const start = returnFrame(0, from, windowZoom);
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch', 'zoom']) assert.ok(Math.abs(start[key] - from[key]) < 1e-10, key + ' jumps on return');
    for (const progress of [.2, .5, .8]) {
      const before = returnFrame(progress - .001, from, windowZoom), after = returnFrame(progress + .001, from, windowZoom);
      assert.notEqual(before.yaw, after.yaw, 'The return turn must not stop before retreat completes');
      assert.notEqual(before.z, after.z, 'The retreat must overlap the return turn');
    }
    const end = returnFrame(1, from, windowZoom), home = entranceFrame(0, windowZoom);
    for (const key of ['x', 'y', 'z', 'pitch', 'zoom']) assert.equal(end[key], home[key]);
  }
});
