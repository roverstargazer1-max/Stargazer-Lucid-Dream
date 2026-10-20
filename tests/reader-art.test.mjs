import test from 'node:test';
import assert from 'node:assert/strict';

test('reader assets decode on demand, share in-flight work, and tolerate failure without blocking text', async t => {
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  t.after(() => { globalThis.Image = oldImage; globalThis.document = oldDocument; });
  const images = [], decodes = [];
  let fontLoads = 0;
  globalThis.Image = class {
    constructor() { images.push(this); }
    decode() { return new Promise((resolve, reject) => decodes.push({ resolve, reject })); }
  };
  globalThis.document = { fonts: { load() { fontLoads++; return Promise.resolve([]); } } };
  const { prepareReaderArt } = await import('../themes/stargazer-starfield/source/js/starfield/reader-art.js');
  assert.equal(images.length, 0, 'importing the module must not add homepage requests');
  const first = prepareReaderArt();
  assert.equal(prepareReaderArt(), first);
  assert.equal(images.length, 3);
  assert.equal(fontLoads, 1);
  assert.ok(images.every(image => /\/images\/reader\/(sheet|continuation|progress-track)\.webp$/.test(image.src)));
  decodes.forEach(({ resolve }) => resolve());
  await first;
  const later = prepareReaderArt();
  assert.notEqual(later, first, 'reopening must recheck decode readiness after cache eviction');
  assert.equal(images.length, 3, 'reuse the same image resources');
  decodes.slice(3).forEach(({ reject }) => reject(new Error('Image unavailable')));
  await assert.doesNotReject(later);
});
