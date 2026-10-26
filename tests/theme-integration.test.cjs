const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Hexo = require('hexo');
const { load } = require('cheerio');
const { parse } = require('hexo-front-matter');
const themeRoot = path.resolve(__dirname, '..');

async function withSite(options, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'starfield-site-'));
  const themeName = options.name || 'renamed-theme';
  const themeDir = path.join(root, 'themes', themeName);
  fs.mkdirSync(path.dirname(themeDir), { recursive: true });
  // A real copy catches dependencies on the original checkout and directory name.
  for (const item of ['layout', 'lib', 'scripts', 'source', 'components', 'scaffolds']) {
    fs.cpSync(path.join(themeRoot, item), path.join(themeDir, item), { recursive: true });
  }
  for (const item of ['_config.yml', 'package.json']) fs.copyFileSync(path.join(themeRoot, item), path.join(themeDir, item));
  fs.symlinkSync(path.join(themeRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  fs.copyFileSync(path.join(themeRoot, 'example/package.json'), path.join(root, 'package.json'));
  fs.mkdirSync(path.join(root, 'source/_posts'), { recursive: true });
  fs.writeFileSync(path.join(root, '_config.yml'), `title: Test Observatory\nauthor: ''\nurl: https://example.com${options.root || '/'}\nroot: ${options.root || '/'}\ntheme: ${themeName}\ntimezone: UTC\npermalink: :year/:month/:day/:title/\nper_page: 0\nindex_generator:\n  per_page: 0\n`);
  if (options.friends) fs.writeFileSync(path.join(root, `_config.${themeName}.yml`), `friends:\n  - name: Example Friend\n    link: https://example.org/\n    desc: Example description\nbranding:\n  logo: ''\n`);
  const write = (file, text) => {
    const full = path.join(root, 'source', file);
    fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text);
    return full;
  };
  if (options.posts) {
    write('_posts/first.md', '---\ntitle: First sample\ndate: 2026-01-01 12:00:00\nrelated:\n  - post: second\n    reason: A sample connection\n---\nFirst body with a unique search phrase.\n');
    write('_posts/second.md', '---\ntitle: Second sample\ndate: 2026-02-01 12:00:00\nstar:\n  rank: treasured\n---\nSecond body.\n');
    write('_drafts/private.md', '---\ntitle: Private draft\ndate: 2026-01-01\n---\nDO-NOT-PUBLISH-DRAFT\n');
    write('_journal/note.md', '---\ndate: "2026-01-02"\ntitle: Sample note\n---\nPublic journal body.\n');
    write('_journal/private.md', '---\ndate: "2026-01-02"\npublished: false\n---\nDO-NOT-PUBLISH-JOURNAL\n');
  }
  const hexo = new Hexo(root, { silent: true });
  try {
    await hexo.init();
    await hexo.call('generate', { bail: true });
    const read = file => fs.readFileSync(path.join(root, 'public', file), 'utf8');
    await run({ hexo, root, read, write });
  } finally {
    await hexo.exit();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function checkAssets(html, base, outputRoot) {
  const $ = load(html);
  const values = [];
  $('[src], [data-src], link[href], script[src]').each((_, node) => {
    for (const attribute of ['src', 'data-src', 'href']) {
      const value = $(node).attr(attribute);
      if (value && !/^(https?:|data:|#)/.test(value)) values.push(value);
    }
  });
  for (const value of values) {
    const route = decodeURIComponent(new URL(value, 'https://example.com' + base).pathname);
    assert.ok(route.startsWith(base), `${value} escaped the site root`);
    assert.ok(fs.existsSync(path.join(outputRoot, route.slice(base.length))), `Missing published asset: ${value}`);
  }
}

test('a fresh renamed theme builds an empty site without personal configuration or content', async () => {
  await withSite({}, async ({ root, read }) => {
    const index = JSON.parse(read('starry/index.json'));
    assert.deepEqual(index.articles, []);
    assert.deepEqual(index.relations, []);
    assert.equal(index.featuredArticleId, '');
    const home = load(read('index.html'));
    assert.equal(home('.wordmark-text').text(), 'Test Observatory');
    assert.equal(home('.friends-link').length, 0);
    assert.match(home('#fallback-title').text(), /第一篇文章/);
    assert.equal(home('[data-blog-theme-switch]').length, 0);
    assert.equal(fs.existsSync(path.join(root, 'public/legacy')), false);
    assert.equal(load(read('pages/friends/index.html'))('.friends-link').length, 0);
    assert.ok(!read('journal/index.html').includes('DO-NOT-PUBLISH'));
    checkAssets(read('index.html'), '/', path.join(root, 'public'));
    for (const filename of ['base', 'frame', 'magnifier', 'star-chart']) {
      assert.deepEqual(fs.readFileSync(path.join(root, `public/images/search/${filename}-v3.png`)), fs.readFileSync(path.join(themeRoot, `source/images/search/${filename}-v3.png`)));
    }
  });
});

test('normal Hexo generation prepares articles, search, relations, journal and config under a subdirectory', async () => {
  await withSite({ posts: true, root: '/blog/', friends: true }, async ({ root, read, hexo }) => {
    const index = JSON.parse(read('starry/index.json'));
    assert.equal(index.articles.length, 2);
    assert.deepEqual(index.articles.map(article => article.catalogNumber), ['STAR-0001', 'STAR-0002']);
    assert.equal(index.articles[1].displayId, 'STAR-0002 · 1.0');
    assert.equal(index.relations.length, 1);
    const search = JSON.parse(read('starry/search.json'));
    assert.ok(search.documents.some(document => document.text.includes('unique search phrase')));
    assert.equal(search.documents.length, 2);
    const home = load(read('index.html'));
    assert.equal(home('.friends-link').attr('href'), 'https://example.org/');
    assert.equal(home('body').attr('data-site-title'), 'Test Observatory');
    assert.ok(read('journal/index.html').includes('Public journal body.'));
    assert.ok(!read('journal/index.html').includes('DO-NOT-PUBLISH-JOURNAL'));
    for (const article of index.articles) {
      const html = read(article.path + 'index.html');
      const $ = load(html);
      assert.equal($('#reader-title').text(), article.title);
      assert.ok($('#reader-content').text().trim());
      assert.ok($('link[rel=canonical]').attr('href').startsWith('https://example.com/blog/'));
      checkAssets(html, '/blog/', path.join(root, 'public'));
    }
    const sources = ['source/_posts/first.md', 'source/_posts/second.md', 'source/_data/starry-layout.json'];
    const saved = sources.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
    await hexo.call('generate', { bail: true });
    sources.forEach((file, i) => assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), saved[i], `Preparation changed ${file} on the second build`));
    // A title/date change must preserve the previously published URL and star.
    const firstFile = path.join(root, sources[0]);
    fs.writeFileSync(firstFile, saved[0].replace('title: First sample', 'title: Changed sample').replace('2026-01-01 12:00:00', '2020-01-01 12:00:00'));
    await hexo.call('generate', { bail: true });
    const changed = JSON.parse(read('starry/index.json')).articles.find(article => article.id === index.articles[0].id);
    assert.equal(changed.path, index.articles[0].path);
    assert.deepEqual(changed.position, index.articles[0].position);
    assert.equal(changed.catalogNumber, index.articles[0].catalogNumber);
    assert.equal(parse(fs.readFileSync(firstFile, 'utf8')).title, 'Changed sample');
    // Theme-owned journal CLI works even without a site-local scaffold.
    await hexo.call('journal', { _: ['CLI note'], date: '2026-01-03', content: 'Created through theme.' });
    assert.ok(fs.readdirSync(path.join(root, 'source/_journal')).some(file => file.includes('CLI-note')));
  });
});
