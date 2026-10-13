const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { assignCatalogueNumbers, readCatalogueNumbers } = require('../themes/stargazer-starfield/lib/catalogue');

const order = (id, date) => ({ id, timeOrder: `${date}|${id}` });

test('first catalogue registration follows publication dates and breaks equal dates by permanent identity', () => {
  const originals = { c: { position: [3, 4, 5] }, a: { position: [1, 2, 3] }, b: { position: [2, 3, 4] } };
  const before = structuredClone(originals);
  const catalogue = assignCatalogueNumbers(originals, [
    order('c', '2026-05-02T12:00:00'), order('b', '2026-05-01T12:00:00'), order('a', '2026-05-01T12:00:00'),
  ]);
  assert.deepEqual([...catalogue], [['a', 'SLD-0001'], ['b', 'SLD-0002'], ['c', 'SLD-0003']]);
  assert.deepEqual(originals, before);
});

test('backdated new articles append after the highest saved number, including retired articles', () => {
  const saved = {
    current: { catalogNumber: 'SLD-0002' },
    removed: { catalogNumber: 'SLD-0010' },
  };
  const active = [order('new', '1999-01-01T00:00:00'), order('current', '2027-05-01T00:00:00')];
  const catalogue = assignCatalogueNumbers(saved, active);
  assert.equal(catalogue.get('current'), 'SLD-0002');
  assert.equal(catalogue.get('removed'), 'SLD-0010');
  assert.equal(catalogue.get('new'), 'SLD-0011');
  const registered = { ...saved, new: { catalogNumber: catalogue.get('new') } };
  assert.deepEqual([...assignCatalogueNumbers(registered, active.reverse())], [...catalogue]);
  assert.equal(assignCatalogueNumbers(registered, [order('removed', '2020-01-01')]).get('removed'), 'SLD-0010');
});

test('invalid and duplicate numbers fail even when the record is absent from published articles', () => {
  for (const invalid of ['SLD-0000', 'SLD-1', 'SLD-00001', 'SLD-9999999999999999', 'sld-0001', '', null, 1]) {
    assert.throws(() => assignCatalogueNumbers({ retired: { catalogNumber: invalid } }, []), /Invalid catalogNumber/);
  }
  assert.throws(() => assignCatalogueNumbers({
    current: { catalogNumber: 'SLD-0001' }, retired: { catalogNumber: 'SLD-0001' },
  }, [order('current', '2026-01-01')]), /Duplicate catalogNumber.*current.*retired/);
  assert.equal(assignCatalogueNumbers({ retired: { catalogNumber: 'SLD-9999' } }, [order('new', '2026-01-01')]).get('new'), 'SLD-10000');
  assert.throws(() => readCatalogueNumbers({ broken: null }), /Invalid saved catalogue entry/);
});

function indexFixture() {
  const generators = new Map();
  const scriptPath = path.resolve(__dirname, '../themes/stargazer-starfield/scripts/article-index.js');
  const hexo = {
    config: { theme: 'stargazer-starfield' },
    theme: { config: {} },
    log: { warn() {} },
    extend: { generator: { register(name, callback) { generators.set(name, callback); } } },
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), { hexo, require: createRequire(scriptPath) }, { filename: scriptPath });
  const post = {
    starry_id: 'article-one', starry_original_permalink: '2026/01/01/one/',
    path: '2026/01/01/one/', permalink: 'https://example.com/2026/01/01/one/',
    source: '_posts/one.md', title: 'One', date: { format: pattern => pattern.includes('THH') ? '2026-01-01T12:00:00' : '2026-01-01' },
  };
  const saved = { position: [1200, 1400, 1800], originalPermalink: post.path, catalogNumber: 'SLD-0006' };
  const records = { 'article-one': saved };
  function generate() {
    const locals = {
      data: { 'starry-layout': { version: 2, articles: records } },
      posts: { each: callback => callback(post), toArray: () => [post] },
    };
    return JSON.parse(generators.get('starry-article-index')(locals).data).articles[0];
  }
  return { post, saved, records, generate };
}

test('generated display IDs show the selected rank while article identity, URL and saved location stay stable', () => {
  const { post, saved, generate } = indexFixture();
  const original = generate();
  assert.equal(original.catalogNumber, 'SLD-0006');
  assert.equal(original.magnitude, 4);
  assert.equal(original.displayId, 'SLD-0006 · 4.0');
  for (const [rank, magnitude, displayId] of [
    ['important', 2.5, 'SLD-0006 · 2.5'], ['treasured', 1, 'SLD-0006 · 1.0'],
  ]) {
    post.star = { rank, isolated: true };
    const article = generate();
    assert.equal(article.magnitude, magnitude);
    assert.equal(article.displayId, displayId);
    assert.equal(article.importance, rank);
    assert.equal(article.isolated, true);
    assert.equal(article.id, original.id);
    assert.equal(article.path, original.path);
    assert.equal(article.url, original.url);
    assert.deepEqual(article.position, saved.position);
  }
  post.star = { rank: 'unknown' };
  assert.equal(generate().displayId, 'SLD-0006 · 4.0');
});

test('article index requires saved registration and refuses a retired duplicate', () => {
  const { saved, records, generate } = indexFixture();
  delete saved.catalogNumber;
  assert.throws(generate, /Missing catalogNumber/);
  saved.catalogNumber = 'SLD-0006';
  records.retired = { catalogNumber: 'SLD-0006', position: [100, 200, 300], originalPermalink: '2020/01/01/retired/' };
  assert.throws(generate, /Duplicate catalogNumber/);
});
