const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { parse } = require(resolveHexo('hexo-front-matter'));
const { load } = require(resolveHexo('cheerio'));
const root = path.resolve('.preview/stargazer');
const sourceFiles = fs.readdirSync('source/_posts').filter(name => name.endsWith('.md'));
const posts = sourceFiles.map(name => parse(fs.readFileSync(path.join('source/_posts', name), 'utf8').replace(/\r\n/g, '\n'))).filter(post => post.published !== false);
const index = JSON.parse(fs.readFileSync(path.join(root, 'starry/index.json'), 'utf8'));

test('every published real article has its original address, readable body and saved star', () => {
  const layout = JSON.parse(fs.readFileSync('source/_data/starry-layout.json', 'utf8'));
  assert.equal(index.articles.length, posts.length);
  assert.equal(new Set(index.articles.map(post => post.id)).size, posts.length);
  for (const post of posts) {
    const article = index.articles.find(item => item.id === post.starry_id);
    assert.equal(article.path, post.starry_original_permalink);
    assert.deepEqual(article.position, layout.articles[post.starry_id].position);
    const $ = load(fs.readFileSync(path.join(root, article.path, 'index.html'), 'utf8'));
    assert.equal($('#reader-title').text(), post.title);
    assert.ok($('#reader-content').text().trim().length > 0);
    $('#reader-content img').each((_, image) => {
      const src = $(image).attr('src');
      if (!/^(https?:|data:)/.test(src)) assert.ok(fs.existsSync(path.join(root, decodeURIComponent(new URL(src, 'http://local/' + article.path).pathname))), `Missing image ${src}`);
    });
    $('#reader-content style').each((_, style) => assert.match($(style).text(), /^@scope \(\[data-content-scope=/));
  }
});

test('preparing twice preserves all existing metadata, bodies and star coordinates byte for byte', () => {
  const files = [...sourceFiles.map(name => path.join('source/_posts', name)), 'source/_data/starry-layout.json'];
  const before = files.map(file => fs.readFileSync(file));
  for (let pass = 0; pass < 2; pass++) execFileSync(process.execPath, ['prepare-starfield.cjs'], { stdio: 'pipe' });
  files.forEach((file, i) => assert.deepEqual(fs.readFileSync(file), before[i], `${file} changed on repeated preview preparation`));
});

test('legacy collections retain scope, friends retain source data, music keeps its player configuration', () => {
  const archive = load(fs.readFileSync(path.join(root, 'archives/2025/11/index.html'), 'utf8'));
  assert.equal(archive('#static-collection-fallback a[data-starry-article-id]').length, index.articles.filter(item => item.date.startsWith('2025-11')).length);
  const friends = load(fs.readFileSync(path.join(root, 'pages/friends/index.html'), 'utf8'));
  const yaml = require(resolveHexo('js-yaml'));
  const expected = yaml.load(fs.readFileSync('_config.hexo-theme-kira.yml', 'utf8')).friends;
  for (const friend of expected) assert.ok(friends('.legacy-friends a').toArray().some(el => friends(el).attr('href') === friend.link));
  const mine = load(fs.readFileSync(path.join(root, 'pages/mine/index.html'), 'utf8'));
  assert.equal(mine('meting-js').attr('id') || mine('.aplayer').attr('data-id'), '14457276201');
  assert.ok(mine('script[src$="static-page.js"]').length);
  const home = load(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  assert.equal(home('#home-fallback a').length, posts.length);
  assert.equal(home('.prototype-tools, .art-study-bar, .motion-study-bar, #grow-star, #export-sky').length, 0);
  assert.equal(home('#preview-intro, #preview-tag, .reading-seal').length, 0);
  assert.equal(home('#close-reader').attr('aria-label'), '关闭文章，返回星空');
  assert.ok(fs.existsSync(path.join(root, 'images/reader-grain.svg')));
});
