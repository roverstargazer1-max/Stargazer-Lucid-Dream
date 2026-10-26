import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('themes/stargazer-starfield/source/js/starfield/app.js', 'utf8');
const search = fs.readFileSync('themes/stargazer-starfield/source/js/starfield/search.js', 'utf8');

function install(source, from, to, context) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
}

function sky() {
  const handlers = new Map(), activated = [], zoom = [];
  const canvas = { closest: () => null };
  const star = { closest: selector => selector === '.star-target' ? star : null, dataset: { articleId: 'near' } };
  const context = vm.createContext({
    world: { addEventListener: (name, handler) => handlers.set(name, handler), setPointerCapture() {} },
    canvas, body: { dataset: {} }, roomScene: { active: false }, reader: { open: false },
    articleSearch: { isOpen: false }, clouds: null, pointers: new Map(),
    press: null, gestureMoved: false, multiTouch: false, previousPinch: 0,
    labelPointer: null, ambient: {}, width: 390, height: 844,
    camera: { yaw: 0, pitch: .5, zoom: 1 }, selected: null, phase: 'idle',
    visibleStars: new Map([['far', { x: 125, y: 205 }], ['near', { x: 110, y: 200 }]]),
    performance: { now: () => 0 }, clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    interrupt() {}, limitCamera() {}, updateUI() {}, moveForward: amount => zoom.push(amount),
    starMotion: { clearSelection() {} }, activateStar: id => activated.push(id),
  });
  install(app, "    world.addEventListener('pointermove'", "    world.addEventListener('pointerleave'", context);
  const fire = (name, x, y, target = star, pointerId = 1) => handlers.get(name)({ target, pointerId, pointerType: 'touch', clientX: x, clientY: y });
  return { context, fire, canvas, activated, zoom };
}

test('dragging from an article star pans the sky without selecting or reading it', () => {
  const { context, fire, activated } = sky();
  fire('pointerdown', 110, 200);
  fire('pointermove', 170, 220);
  fire('pointerup', 170, 220);
  assert.notEqual(context.camera.yaw, 0, 'the visible article target must not be a dead patch for sky gestures');
  assert.deepEqual(activated, []);
});

test('a sky tap resolves overlapping stars by distance rather than source order', () => {
  const { fire, canvas, activated } = sky();
  fire('pointerdown', 110, 200, canvas);
  fire('pointerup', 110, 200, canvas);
  assert.deepEqual(activated, ['near']);
});

test('a cancelled sky gesture never selects a star', () => {
  const { fire, activated } = sky();
  fire('pointerdown', 110, 200);
  fire('pointercancel', 110, 200);
  fire('pointerup', 110, 200);
  assert.deepEqual(activated, []);
});

test('a two-finger gesture starting on a star zooms without becoming a tap or pan', () => {
  const { context, fire, canvas, activated, zoom } = sky();
  fire('pointerdown', 110, 200);
  fire('pointerdown', 200, 200, canvas, 2);
  fire('pointermove', 220, 200, canvas, 2);
  fire('pointerup', 220, 200, canvas, 2);
  fire('pointerup', 110, 200);
  assert.ok(zoom[0] > 0);
  assert.equal(context.camera.yaw, 0);
  assert.deepEqual(activated, []);
});

test('star keyboard activation is preserved without duplicating pointer activation', () => {
  const activated = [], nodes = [];
  const context = vm.createContext({
    articles: [{ id: 'article', title: '文章' }], starTargets: new Map(),
    targetLayer: { append: node => nodes.push(node) },
    activateStar: id => activated.push(id),
    document: { createElement: () => ({ dataset: {}, append() {}, setAttribute() {},
      addEventListener(name, callback) { if (name === 'click') this.click = callback; } }) },
  });
  install(app, '  function mountStar()', '  function prepareObservationArt()', context);
  context.mountStar();
  nodes[0].click({ detail: 0 });
  nodes[0].click({ detail: 1 });
  assert.deepEqual(activated, ['article']);
});

test('a chart tap reads the nearest enabled star even when another button covers its centre', () => {
  const calls = [], handlers = new Map();
  const context = vm.createContext({
    article: { id: 'covering' },
    star: { addEventListener: (name, handler) => handlers.set(name, handler) },
    highlight() {}, read: (id, trigger) => calls.push({ id, trigger }),
    starButtons: new Map(), matched: new Set(['intended', 'covering']),
    map: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 280, height: 280 }) },
  });
  for (const [id, x, y] of [['intended', 110, 200], ['covering', 119, 182]]) {
    context.starButtons.set(id, { style: { left: `${x / 2.8}%`, top: `${y / 2.8}%` },
      getBoundingClientRect: () => ({ left: x - 22, top: y - 22, width: 44, height: 44 }), disabled: false });
  }
  // Exercise the real event binding and resolver, including the keyboard branch.
  if (search.includes('  function readMapStar(')) install(search, '  function readMapStar(', '  function setIndex(', context);
  install(search, "    star.addEventListener('mouseenter'", '    starLayer.append(star)', context);
  handlers.get('click')({ detail: 1, clientX: 110, clientY: 200 });
  assert.equal(calls[0]?.id, 'intended');
  calls.length = 0;
  handlers.get('click')({ detail: 0, clientX: 0, clientY: 0 });
  assert.equal(calls[0]?.id, 'covering', 'keyboard activation follows the focused button');
});
