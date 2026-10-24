import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImages } from '../themes/stargazer-starfield/source/js/starfield/image-readiness.js';

test('surface preparation shares in-flight decoding and tolerates failed optional artwork', async () => {
  let decodes = 0, resolve, reject;
  const images = [
    { dataset: { src: '/logo.webp' }, decode() { decodes++; return new Promise(done => { resolve = done; }); } },
    { dataset: { src: '/pointer.webp' }, decode() { decodes++; return new Promise((_, fail) => { reject = fail; }); } },
  ];
  const surface = { querySelectorAll: () => images.filter(image => image.dataset.src) };
  const first = prepareImages(surface), second = prepareImages(surface, 'high');
  assert.equal(decodes, 2);
  assert.deepEqual(images.map(image => image.src), ['/logo.webp', '/pointer.webp']);
  assert.ok(images.every(image => image.fetchPriority === 'high' && image.decoding === 'async'));
  resolve(); reject(new Error('Optional image unavailable'));
  assert.deepEqual((await first).map(result => result.status), ['fulfilled', 'rejected']);
  await second;
  assert.ok(images.every(image => !image.dataset.src));
  await prepareImages(surface);
  assert.equal(decodes, 2, 'Returning to an already prepared surface adds no work');
  await assert.doesNotReject(prepareImages(null));
});
test('stalled optional artwork has a bounded foreground wait and later failures are handled', async () => {
  const { settleWithin } = await import('../themes/stargazer-starfield/source/js/starfield/image-readiness.js');
  let reject;
  const stalled = new Promise((resolve, failure) => { reject = failure; });
  assert.equal(await settleWithin(stalled, 10), false);
  reject(new Error('late network failure'));
  assert.equal(await settleWithin(Promise.resolve(), 1000), true);
  assert.equal(await settleWithin(Promise.reject(new Error('unavailable')), 1000), false);
});
