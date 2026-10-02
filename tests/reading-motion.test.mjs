import test from 'node:test';
import assert from 'node:assert/strict';
import { createStarMotion } from '../themes/stargazer-starfield/source/js/starfield/motion.js';

// Exercise the public motion controller with a deterministic animation clock.
// Browser QA covers the actual pixels and native dialog/backdrop rendering.
function fixture(t, soft = false) {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const backdrop = {};
  const documentBefore = globalThis.document, computedBefore = globalThis.getComputedStyle;
  globalThis.document = {
    body: { dataset: {} }, head: { append() {} },
    createElement: () => ({ sheet: { cssRules: [{ style: backdrop }] } }),
  };
  t.after(() => { globalThis.document = documentBefore; globalThis.getComputedStyle = computedBefore; });
  function element() {
    return {
      dataset: {}, effects: [], attributes: new Map(), hidden: false,
      setAttribute(name, value) { this.attributes.set(name, value); },
      removeAttribute(name) { this.attributes.delete(name); },
      getBoundingClientRect: () => ({ left: 700, top: 200, right: 1000, width: 300, height: 160 }),
      animate(frames) {
        const effect = { frames, currentTime: 0, finished: new Promise(() => {}), pause() {}, cancel() { this.cancelled = true; } };
        this.effects.push(effect); return effect;
      },
    };
  }
  const preview = element(), reader = element(), scroller = { inert: false };
  const title = element(), date = element(), action = element();
  preview.querySelectorAll = () => [date, title];
  preview.querySelector = () => action;
  globalThis.getComputedStyle = target => {
    const effect = target.effects.findLast(effect => !effect.cancelled);
    if (!effect) return { opacity: '1', filter: 'none' };
    const [from, to] = effect.frames, progress = effect.currentTime / 1000;
    return { opacity: String(Number(from.opacity) + (Number(to.opacity) - Number(from.opacity)) * progress), filter: from.filter };
  };
  const motion = createStarMotion({ preview, reader, scroller, isSoft: () => soft });
  return { motion, reader, preview, scroller, backdrop, body: document.body,
    tick(time) { now = time; motion.tick(time); }, setTime(time) { now = time; } };
}

test('focus opening and closing finish once, restore scrolling and clear every transient effect', t => {
  const f = fixture(t), calls = [];
  f.motion.open(null, () => calls.push('open'));
  assert.equal(f.scroller.inert, true);
  f.tick(440); f.tick(900);
  assert.deepEqual(calls, ['open']);
  assert.equal(f.body.dataset.reading, 'open');
  assert.equal(f.scroller.inert, false);
  assert.equal(f.reader.dataset.motion, undefined);
  assert.ok(f.reader.effects.every(effect => effect.cancelled));
  assert.equal(f.backdrop.backdropFilter, 'blur(2.40px)');
  f.motion.close(() => calls.push('closed'));
  f.tick(1140); f.tick(1300);
  assert.deepEqual(calls, ['open', 'closed']);
  assert.equal(f.body.dataset.reading, 'closed');
  assert.equal(f.scroller.inert, false);
  assert.equal(f.backdrop.background, 'rgb(4 17 42 / 0.000)');
});

test('closing midway then reopening preserves the displayed pose and discards stale callbacks', t => {
  const f = fixture(t), calls = [];
  f.motion.open(null, () => calls.push('stale open'));
  f.tick(110);
  const beforeClose = getComputedStyle(f.reader).opacity;
  f.motion.close(() => calls.push('stale close'));
  assert.equal(f.reader.effects.at(-1).frames[0].opacity, beforeClose);
  f.tick(170);
  const beforeReopen = getComputedStyle(f.reader).opacity;
  f.motion.open(null, () => calls.push('reopened'));
  assert.equal(f.reader.effects.at(-1).frames[0].opacity, beforeReopen);
  f.tick(610); f.tick(900);
  assert.deepEqual(calls, ['reopened']);
  assert.equal(f.body.dataset.reading, 'open');
  assert.equal(f.scroller.inert, false);
});

test('resize settles an in-flight opening or closing without leaving an inert scroller', t => {
  const f = fixture(t), calls = [];
  f.motion.open(null, () => calls.push('open'));
  f.tick(100); f.motion.resize(); f.motion.resize();
  assert.deepEqual(calls, ['open']);
  assert.equal(f.scroller.inert, false);
  f.motion.close(() => calls.push('close'));
  f.motion.close(() => calls.push('duplicate close'));
  f.motion.resize(); f.tick(1000);
  assert.deepEqual(calls, ['open', 'close']);
  assert.equal(f.scroller.inert, false);
  assert.equal(f.body.dataset.reading, 'closed');
});

test('soft transitions avoid blur and restore scrolling after closing', t => {
  const f = fixture(t, true);
  f.motion.open(); f.tick(160);
  assert.ok(f.reader.effects.at(-1).frames.every(frame => frame.filter === 'none'));
  assert.equal(f.backdrop.backdropFilter, 'blur(0px)');
  f.motion.close(); f.tick(280);
  assert.equal(f.scroller.inert, false);
});

test('preview interruption never marks an unfinished reveal as seen', t => {
  const full = fixture(t);
  const first = full.motion.beginApproach(0, 'existing-article');
  full.tick(first / 2); full.motion.interrupt();
  assert.equal(full.preview.attributes.has('aria-busy'), false);
  assert.equal(full.motion.beginApproach(first, 'existing-article'), first);
  full.tick(first * 2);
  const repeated = full.motion.beginApproach(first * 2, 'existing-article');
  assert.ok(repeated < first);
  full.motion.clearSelection();
  assert.equal(full.preview.attributes.has('aria-busy'), false);
  assert.ok(full.preview.effects.every(effect => effect.cancelled));
});
