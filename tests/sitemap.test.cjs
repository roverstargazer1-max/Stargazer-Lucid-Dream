const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('cheerio');
const Hexo = require('hexo');
const { writeSitemap } = require('../tools/write-sitemap.cjs');

test('the personal page and journal become indexable once they contain public author content', async () => {
  const hexo = new Hexo();
  await hexo.loadPlugin(require.resolve('../scripts/blog'));
  const noindex = hexo.extend.helper.get('blog_noindex');
  assert.equal(noindex({ path: 'pages/mine/index.html', content: '\n' }), true);
  assert.equal(noindex({ path: 'pages/mine/index.html', content: '<p>自我介绍</p>' }), false);
  assert.equal(noindex({ layout: 'journal', journal: { months: [] } }), true);
  assert.equal(noindex({ layout: 'journal', journal: { months: [{}], demo: true } }), true);
  assert.equal(noindex({ layout: 'journal', journal: { months: [{}], demo: false } }), false);
  assert.equal(noindex({ published: false }), true);
});

test('the sitemap includes self-canonical HTML across themes and omits alternate copies, private pages and compatibility routes', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-sitemap-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  const home = 'https://blog.example';
  function page(route, canonical = route, robots = '') {
    const folder = path.join(output, route);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'index.html'), `<html><head><link rel="canonical" href="${new URL(canonical, home).href}"><meta name="robots" content="${robots}"></head><body></body></html>`);
  }
  for (const route of ['/', '/文与星/', '/page/2/', '/archives/', '/archives/page/2/', '/pages/archive/', '/starfield/journal/']) page(route);
  page('/pages/mine/', '/pages/mine/', 'noindex');
  page('/starfield/文与星/', '/文与星/');
  page('/private/', '/private/', 'nofollow,noindex');
  writeSitemap(output, home);
  const xml = load(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), { xmlMode: true });
  const urls = xml('urlset > url > loc').map((_, loc) => decodeURI(xml(loc).text())).get();
  assert.deepEqual(urls.sort(), ['/', '/文与星/', '/page/2/', '/archives/', '/archives/page/2/', '/starfield/journal/'].map(route => home + route).sort());
  assert.equal(xml('lastmod').length, 0);
  page('/pages/mine/');
  fs.rmSync(path.join(output, '文与星'), { recursive: true });
  writeSitemap(output, home);
  const updated = load(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), { xmlMode: true });
  assert.ok(updated('loc').toArray().some(node => updated(node).text() === home + '/pages/mine/'));
  assert.ok(!updated('loc').toArray().some(node => decodeURI(updated(node).text()) === home + '/文与星/'));
});
