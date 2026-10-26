import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstrolabe } from '../source/js/starfield/astrolabe.js';
import { atlasPoint } from '../source/js/starfield/search.js';
import { direction, viewRay } from '../source/js/starfield/dome.js';

function instrument() {
  const writes = [];
  const compass = createAstrolabe({ style: { setProperty(name, value) { writes.push({ name, value }); } } });
  return { compass, writes, heading: () => parseFloat(writes.at(-1).value) };
}

test('the entry hand points along the actual horizontal view ray and atlas direction', () => {
  const { compass, heading } = instrument();
  const settings = { cx: 600, cy: 400, focal: 1000 };
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .71, -2.8, 7.1]) {
    for (const pitch of [0, .43, 1.4]) {
      const camera = { x: 200, y: 300, z: -400, yaw, pitch, zoom: 2 };
      compass.update(camera);
      const ray = viewRay(settings.cx, settings.cy, camera, settings);
      const length = Math.hypot(ray.x, ray.z);
      assert.ok(Math.abs(Math.sin(heading()) - ray.x / length) < 1e-12);
      assert.ok(Math.abs(-Math.cos(heading()) + ray.z / length) < 1e-12);
      const atlas = atlasPoint(direction(yaw, 0));
      assert.ok(Math.abs(.5 + .5 * Math.sin(heading()) - atlas.x) < 1e-12);
      assert.ok(Math.abs(.5 - .5 * Math.cos(heading()) - atlas.y) < 1e-12);
    }
  }
});

test('looking vertically or zooming retains heading and does not rewrite a still hand', () => {
  const { compass, writes, heading } = instrument();
  for (const [pitch, zoom] of [[.43, 1], [1.5, .36], [Math.PI / 2, 2.8]]) {
    compass.update({ yaw: .8, pitch, zoom });
    assert.equal(heading(), .8);
  }
  assert.equal(writes.length, 1);
});

test('the shared frame updates retain small turns and continuous rotations through the seam', () => {
  const { compass, writes, heading } = instrument();
  const sequence = [Math.PI - .01, Math.PI, Math.PI + .01, 2 * Math.PI, 2 * Math.PI + .00001];
  for (const yaw of sequence) {
    compass.update({ yaw, pitch: .6, zoom: 1 });
    assert.equal(heading(), yaw);
  }
  assert.equal(writes.length, sequence.length);
  assert.ok(writes.every(write => write.name === '--view-heading'));
});
