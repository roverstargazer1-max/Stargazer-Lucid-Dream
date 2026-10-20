import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteractiveClouds, prepareInteractiveClouds } from '../themes/stargazer-starfield/source/js/starfield/interactive-clouds.js';
import { skyProjection } from '../themes/stargazer-starfield/source/js/starfield/camera-bounds.js';

function world() {
  const buttons = [];
  return { buttons, append(button) { buttons.push(button); } };
}

const rgba = new Uint8ClampedArray(512 * 224 * 4).fill(255);
globalThis.Image = class { async decode() {} };
globalThis.document = {
  createElement(tag) {
    if (tag === 'button') return { style: {}, setAttribute() {}, matches: () => false };
    return { getContext: () => ({ drawImage() {}, fillRect() {}, getImageData: () => ({ data: rgba }) }) };
  },
};
await prepareInteractiveClouds();

function drawing() {
  const transforms = [];
  return {
    transforms, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, drawImage() {},
    transform(...values) { transforms.push(values); },
  };
}

test('zoomed-out upward views do not stretch a low, offscreen cloud across the sky or its hit area', () => {
  const width = 1183, height = 766;
  const clouds = createInteractiveClouds(world(), () => false);
  const ctx = drawing();
  const camera = { x: 0, y: 0, z: 0, yaw: 1.365, pitch: 1.24, zoom: .36 };
  clouds.update(0, false);
  clouds.paint(ctx, width, height, camera, skyProjection(width, height, camera.zoom));
  assert.ok(ctx.transforms.every(([, , c, d]) => Math.hypot(c, d) * 224 <= height * 2),
    'a low cloud must not become a strip many viewports tall');
  assert.equal(clouds.hover(600, 80, true), false, 'the empty upper sky must not acquire an invisible cloud hit area');
  assert.equal(clouds.tap(600, 80), false);
});

test('ordinary clouds remain interactive through cached frames, camera changes, and activation', () => {
  const width = 1440, height = 900;
  const scene = world();
  const clouds = createInteractiveClouds(scene, () => false);
  const camera = { x: 0, y: 0, z: 0, yaw: -.38, pitch: .43, zoom: .72 };
  const settings = skyProjection(width, height, camera.zoom);
  const ctx = drawing();
  clouds.update(0, false);
  clouds.paint(ctx, width, height, camera, settings);
  const first = scene.buttons[0];
  assert.equal(first.hidden, false);
  const x = parseFloat(first.style.left), y = parseFloat(first.style.top);
  assert.equal(clouds.hover(x, y, true), true);
  assert.equal(clouds.tap(x, y), true);
  clouds.update(.4, false);
  clouds.paint(ctx, width, height, camera, settings);
  assert.notEqual(parseFloat(first.style.left), x);
  const active = ctx.transforms.at(-1);
  clouds.paint(ctx, width, height, camera, settings);
  assert.deepEqual(ctx.transforms.at(-1), active);
  camera.yaw += .2;
  clouds.paint(ctx, width, height, camera, settings);
  assert.notDeepEqual(ctx.transforms.at(-1), active);
});
