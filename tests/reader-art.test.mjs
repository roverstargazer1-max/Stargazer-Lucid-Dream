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

test('reader preparation uses the configured display caches and requests only missing title characters from the complete font', async t => {
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  t.after(() => { globalThis.Image = oldImage; globalThis.document = oldDocument; });
  const images = [], fonts = [];
  globalThis.Image = class {
    constructor() { images.push(this); }
    decode() { return Promise.resolve(); }
  };
  globalThis.document = {
    body: { dataset: { readerSheet: '/cache/sheet.webp?v=1', readerContinuation: '/cache/continuation.webp?v=2', readerTrack: '/cache/track.webp?v=3' } },
    fonts: { load(font, text) { fonts.push({ font, text }); return Promise.resolve([]); } },
  };
  const { prepareReaderArt } = await import('../themes/stargazer-starfield/source/js/starfield/reader-art.js?configured-cache');
  const { uiCodepoints } = await import('../themes/stargazer-starfield/source/js/starfield/font-coverage.js');
  const title = '手记鲸';
  await prepareReaderArt(title);
  assert.deepEqual(images.map(image => image.src), ['/cache/sheet.webp?v=1', '/cache/continuation.webp?v=2', '/cache/track.webp?v=3']);
  assert.equal(fonts[0].text, title);
  assert.equal(fonts[1].text, [...title].filter(character => !uiCodepoints.has(character.codePointAt(0))).join(''));
  assert.ok(fonts[1].text.length > 0 && fonts[1].text.length < title.length);
});
