import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { findArticles, atlasPoint, viewFootprint } from '../themes/stargazer-starfield/source/js/starfield/search.js';
import { direction, projectDome, domeIntersection, viewRay } from '../themes/stargazer-starfield/source/js/starfield/dome.js';
const require = createRequire(import.meta.url);
const { load } = require(require.resolve('cheerio', { paths: [path.dirname(require.resolve('hexo'))] }));

const articles = [
  { id: 'a', title: '清醒梦', catalogNumber: 'SLD-0001', displayId: 'SLD-0001 · 1.0', magnitude: 1, date: '2025-01-01', tags: ['梦境'], categories: [] },
  { id: 'b', title: '随笔', catalogNumber: 'SLD-0002', displayId: 'SLD-0002 · 2.5', magnitude: 2.5, date: '2026-01-01', tags: ['生活'], categories: ['思考'] },
  { id: 'c', title: '生活', catalogNumber: 'SLD-0003', displayId: 'SLD-0003 · 4.0', magnitude: 4, date: '2026-01-01', tags: [], categories: [] },
];
const documents = new Map([['a', '梦想开始'], ['b', '正文末尾谈及清醒梦及 OpenAI'], ['c', '日常和 OpenAI']]);

test('no conditions list every article in repeatable newest-first order', () => {
  assert.deepEqual(findArticles(articles, documents).map(article => article.id), ['b', 'c', 'a']);
});
test('Chinese titles, full body text, tags, categories and permanent IDs are searchable', () => {
  for (const [query, ids] of [['清醒梦', ['a', 'b']], ['梦境', ['a']], ['思考', ['b']], [' sld-0002 ', ['b']], ['OPENAI', ['b', 'c']], ['SLD-0001 · 1.0', ['a']]]) {
    assert.deepEqual(findArticles(articles, documents, { query }).map(article => article.id), ids);
  }
});
test('years and magnitudes intersect with keywords, and zero matches remain empty', () => {
  assert.deepEqual(findArticles(articles, documents, { query: '清醒梦', year: '2026', magnitude: '2.5' }).map(article => article.id), ['b']);
  assert.deepEqual(findArticles(articles, documents, { query: '清醒梦', year: '2026', magnitude: '1.0' }), []);
  assert.deepEqual(findArticles(articles, documents, { query: '不存在的内容' }), []);
  assert.deepEqual(findArticles(articles, documents, { query: '思考 OpenAI' }).map(article => article.id), ['b']);
});
test('filtering does not mutate article identities, coordinates or metadata', () => {
  const snapshot = JSON.stringify(articles);
  findArticles(articles, documents, { year: '2025' });
  assert.equal(JSON.stringify(articles), snapshot);
});
test('the real dome maps zenith, horizon and directions to the supplied circular grid', () => {
  assert.deepEqual(atlasPoint({ x: 0, y: 1, z: 0 }), { x: .5, y: .5 });
  assert.deepEqual(atlasPoint({ x: 0, y: 0, z: 1 }), { x: .5, y: 0 });
  const east = atlasPoint({ x: 1, y: 0, z: 0 });
  assert.ok(Math.abs(east.x - 1) < 1e-9 && Math.abs(east.y - .5) < 1e-9);
  for (let yaw = -Math.PI; yaw < Math.PI; yaw += .2) for (let pitch = 0; pitch <= Math.PI / 2; pitch += .1) {
    const point = atlasPoint(direction(yaw, pitch));
    assert.ok(Math.hypot(point.x - .5, point.y - .5) <= .5 + 1e-9);
  }
});
test('current view boundary uses the actual camera origin, zoom and inverse projection', () => {
  const width = 1440, height = 900, settings = { cx: 680, cy: 470, focal: 1300 };
  const camera = { x: 200, y: 450, z: 300, yaw: .4, pitch: .7, zoom: 1.55 };
  const boundary = viewFootprint(camera, settings, width, height);
  assert.equal(boundary.length, 64);
  for (const [i, x, y] of [[0, 0, 0], [16, width, 0], [32, width, height], [48, 0, height]]) {
    const point = domeIntersection(camera, viewRay(x, y, camera, settings));
    assert.deepEqual(boundary[i], atlasPoint(point));
    const projected = projectDome(point, camera, settings);
    assert.ok(Math.abs(projected.x - x) < 1e-8 && Math.abs(projected.y - y) < 1e-8);
  }
});
test('all supplied search artwork is published byte for byte without SVG replacements', () => {
  const root = '.preview/stargazer';
  for (const [name, source] of [['base-v2', '底图/底图v2'], ['grid-v2', '检索原型图v2'], ['frame-v2', '左侧/搜索栏v2'], ['filters', '左侧/筛选'], ['arrow', '左侧/折叠箭头'], ['star-chart', '左侧/Starchart'], ['index', '右侧/index'], ['name', '右侧/NAME'], ['id', '右侧/OBS&ID'], ['close', '右侧/退出按钮']]) {
    assert.deepEqual(fs.readFileSync(path.join(root, `images/search/${name}.png`)), fs.readFileSync(`assets/检索页/${source}.png`));
  }
  assert.deepEqual(fs.readFileSync(path.join(root, 'images/search/entry-blue-purple.png')), fs.readFileSync('assets/蓝紫星盘.png'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('<dialog id="star-search"')[1].split('</dialog>')[0];
  assert.doesNotMatch(html, /<svg|data:image\/svg/);
  assert.doesNotMatch(html, /images\/search\/(?:base|frame)\.png/);
  assert.equal(fs.existsSync(path.join(root, 'images/search/base.png')), false);
  assert.equal(fs.existsSync(path.join(root, 'images/search/frame.png')), false);
});
test('every published article supplies full search text, tags and categories', () => {
  const index = JSON.parse(fs.readFileSync('.preview/stargazer/starry/index.json'));
  const search = JSON.parse(fs.readFileSync('.preview/stargazer/starry/search.json'));
  assert.equal(search.documents.length, index.articles.length);
  for (const article of index.articles) {
    assert.ok(Array.isArray(article.tags) && Array.isArray(article.categories));
    const document = search.documents.find(document => document.id === article.id);
    const page = load(fs.readFileSync(path.join('.preview/stargazer', article.path, 'index.html'), 'utf8'));
    page('#reader-content script, #reader-content style').remove();
    assert.equal(document.text, page('#reader-content').text().replace(/\s+/g, ' ').trim());
    assert.doesNotMatch(document.text, /@scope|<script|<style/);
  }
});
