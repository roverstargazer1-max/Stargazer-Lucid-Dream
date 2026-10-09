import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingProgress } from '../themes/stargazer-starfield/source/js/starfield/reading-progress.js';

test('long articles start at zero, reach halfway and finish at the body end', () => {
  const layout = { contentBottom: 3000, viewportHeight: 600 };
  assert.equal(readingProgress({ ...layout, scrollTop: 0 }).fraction, 0);
  assert.equal(readingProgress({ ...layout, scrollTop: 1200 }).fraction, .5);
  assert.equal(readingProgress({ ...layout, scrollTop: 2400 }).complete, true);
});
test('short articles finish without scrolling and elastic scrolling stays within the rail', () => {
  assert.equal(readingProgress({ contentBottom: 400, viewportHeight: 600, scrollTop: 0 }).percent, 100);
  assert.equal(readingProgress({ contentBottom: 3000, viewportHeight: 600, scrollTop: -50 }).fraction, 0);
  assert.equal(readingProgress({ contentBottom: 3000, viewportHeight: 600, scrollTop: 5000 }).fraction, 1);
});
test('late image expansion recalculates progress and 100% is reserved for completion', () => {
  assert.equal(readingProgress({ contentBottom: 1800, viewportHeight: 600, scrollTop: 600 }).percent, 50);
  assert.equal(readingProgress({ contentBottom: 3000, viewportHeight: 600, scrollTop: 600 }).percent, 25);
  assert.equal(readingProgress({ contentBottom: 3000, viewportHeight: 600, scrollTop: 2390 }).percent, 99);
});
