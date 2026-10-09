import test from 'node:test';
import assert from 'node:assert/strict';
import { createSilhouetteWalker } from '../themes/stargazer-starfield/source/js/starfield/silhouette-walker.js';

function fixture({ still = true } = {}) {
  const image = still ? { hidden: false } : null;
  const frames = { complete: true, naturalWidth: 1680, naturalHeight: 4680 };
  const draws = [];
  const context = { clearRect() {}, drawImage(...args) { draws.push(args); } };
  const canvas = { hidden: true, width: 0, height: 0, getContext: () => context };
  const element = {
    clientWidth: 52, clientHeight: 73,
    querySelector: selector => ({ '.silhouette-still': image, '.silhouette-frames': frames, canvas })[selector],
  };
  return { image, frames, canvas, element, context, draws };
}

test('reading walker keeps its last pose, size and baseline when scrolling stops and resumes', () => {
  globalThis.devicePixelRatio = 1;
  const view = fixture();
  const walker = createSilhouetteWalker(view.element, { compact: true, white: true, freezeWhenIdle: true });
  walker.render(0, true);
  walker.render(80, true);
  const moving = view.draws.at(-1);
  walker.render(260, false);
  assert.equal(view.canvas.hidden, false, 'stopping must keep the same rendered character visible');
  assert.equal(view.image.hidden, true, 'stopping must not switch to the unrelated static silhouette');
  walker.render(4000, false);
  assert.deepEqual(view.draws.at(-1), moving);
  assert.equal(view.draws.length, 2, 'a paused pose does not redraw every animation frame');
  walker.render(5000, true);
  assert.deepEqual(view.draws.at(-1), moving, 'resuming must exclude the idle interval from walk time');
  walker.render(5020, true);
  assert.notEqual(view.draws.at(-1)[1], moving[1]);
  assert.deepEqual(view.draws.at(-1).slice(5), moving.slice(5), 'walking uses the same drawing bounds');
});

test('an initially stationary reading walker uses the same atlas and can resize while paused', () => {
  globalThis.devicePixelRatio = 1;
  const view = fixture({ still: false });
  const walker = createSilhouetteWalker(view.element, { compact: true, white: true, freezeWhenIdle: true });
  walker.render(0, false);
  assert.equal(view.canvas.hidden, false);
  assert.equal(view.draws.at(-1)[0], view.frames);
  assert.deepEqual(view.draws.at(-1).slice(1, 5), [0, 0, 280, 390]);
  assert.equal(view.context.filter, 'brightness(0) invert(1)');
  view.element.clientWidth = 25; view.element.clientHeight = 35;
  walker.render(1000, false);
  assert.equal(view.canvas.width, 25);
  assert.equal(view.canvas.height, 35);
  assert.deepEqual(view.draws.at(-1).slice(1, 5), [0, 0, 280, 390]);
  const [, , , , , , y, , height] = view.draws.at(-1);
  assert.ok(Math.abs(y + height * 385 / 390 - 35) < .001, 'the same foot baseline meets the rail after resize');
});

test('a reading walker waits for its atlas instead of displaying a different fallback character', () => {
  globalThis.devicePixelRatio = 1;
  const view = fixture({ still: false });
  view.frames.complete = false;
  const walker = createSilhouetteWalker(view.element, { compact: true, white: true, freezeWhenIdle: true });
  walker.render(0, false);
  assert.equal(view.canvas.hidden, true);
  assert.equal(view.draws.length, 0);
  view.frames.complete = true;
  walker.render(100, false);
  assert.equal(view.canvas.hidden, false);
  assert.equal(view.draws.length, 1);
});

test('observation walkers retain their original static fallback when idle or when the atlas is invalid', () => {
  globalThis.devicePixelRatio = 1;
  const view = fixture();
  const walker = createSilhouetteWalker(view.element);
  walker.render(0, true);
  assert.equal(view.image.hidden, true);
  walker.render(100, false);
  assert.equal(view.image.hidden, false);
  assert.equal(view.canvas.hidden, true);
  view.frames.naturalWidth = 1;
  walker.render(200, true);
  assert.equal(view.image.hidden, false);
  assert.equal(view.canvas.hidden, true);
});
