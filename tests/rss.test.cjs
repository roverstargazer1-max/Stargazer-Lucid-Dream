const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Hexo = require('hexo');
const moment = require('moment-timezone');
const { load } = require('cheerio');

test('RSS is root-only, date ordered, capped at 20, and escapes the public summaries', async () => {
  const hexo = new Hexo();
  Object.assign(hexo.config, { url: 'https://blog.example', root: '/', title: 'A & B', description: '随笔', language: 'zh-CN' });
  await hexo.loadPlugin(require.resolve('../scripts/rss'));
  const generate = hexo.extend.generator.get('blog-rss').bind(hexo);
  const posts = Array.from({ length: 22 }, (_, day) => ({
    title: '文章 ' + day,
    date: moment.tz([2026, 0, day + 1, 17], 'Asia/Singapore'),
    path: `2026/01/文章${day}/`,
    starry_excerpt: '写下 <星>、& 与 😀。',
    content: '全文不进入阅读器。',
    sticky: day === 0 ? 999 : 0,
  }));
  const newest = posts.at(-1);
  const locals = { posts: { toArray: () => [...posts, { ...newest, title: '未公开', published: false }, { ...newest, title: '草稿', draft: true }] } };
  const feed = await generate(locals);
  assert.equal(feed.path, 'rss.xml');
  const xml = load(feed.data, { xmlMode: true });
  const items = xml('rss[version="2.0"] > channel > item');
  assert.equal(xml('channel > title').text(), 'A & B');
  assert.equal(xml('channel > atom\\:link').attr('href'), 'https://blog.example/rss.xml');
  assert.deepEqual(items.map((_, item) => xml(item).find('title').text()).get(), posts.slice(-20).reverse().map(post => post.title));
  assert.equal(items.first().find('pubDate').text(), 'Thu, 22 Jan 2026 09:00:00 GMT');
  assert.equal(items.first().find('description').text(), newest.starry_excerpt);
  assert.equal(items.first().find('guid').text(), new URL(newest.path, hexo.config.url).href);
  assert.equal(items.first().find('guid').attr('isPermaLink'), 'true');
  assert.ok(!xml.root().text().includes(newest.content));
  for (const root of ['/legacy/', '/starfield/']) {
    Object.assign(hexo.config, { root, url: 'https://blog.example' + root });
    assert.deepEqual(await generate(locals), []);
  }
});

test('both themes advertise one feed and the article reader, archive and Kira sidebar link to it', () => {
  const output = path.resolve('.preview/stargazer');
  const read = name => fs.readFileSync(path.join(output, name), 'utf8');
  const article = JSON.parse(read('starry/index.json')).articles[0];
  const feed = load(read('rss.xml'), { xmlMode: true });
  const self = feed('channel > atom\\:link').attr('href');
  assert.equal(fs.existsSync(path.join(output, 'legacy/rss.xml')), false);
  for (const route of ['index.html', 'legacy/index.html', article.path + 'index.html', 'archives/index.html']) {
    const $ = load(read(route));
    const alternate = $('head link[rel="alternate"][type="application/rss+xml"]');
    assert.equal(alternate.length, 1);
    assert.equal(alternate.attr('href'), self);
  }
  assert.equal(load(read('legacy/index.html'))('#sidebar a[href="/rss.xml"]').length, 1);
  assert.equal(load(read('archives/index.html'))('#static-collection-fallback .article a[href="/rss.xml"]').length, 1);
  const staticPost = load(read(article.path + 'index.html'));
  assert.equal(staticPost('#static-article-fallback .article a[href="/rss.xml"]').length, 1);
  const fragment = load(JSON.parse(read(article.readerUrl)).html);
  assert.equal(fragment('.article a[href="/rss.xml"]').length, 1);
});
