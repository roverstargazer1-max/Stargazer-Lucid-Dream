import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPageIdentity, revealArticleFragment } from '../themes/stargazer-starfield/source/js/starfield/reader-navigation.js';

test('article fragments scroll and focus only matching content in the open reader', t => {
  const dom = new JSDOM('<main><div id="reader-content"><h2 id="最后：100%">最后</h2></div><section id="article-comments"></section></main>');
  t.after(() => dom.window.close());
  const { document } = dom.window;
  const scroller = document.querySelector('main'), heading = document.querySelector('h2');
  scroller.getBoundingClientRect = () => ({ top: 50 });
  heading.getBoundingClientRect = () => ({ top: 450 });
  scroller.scrollTop = 100;
  for (const hash of ['', '#missing', '#%E0%A4', '#article-comments']) {
    revealArticleFragment(scroller, hash);
    assert.equal(scroller.scrollTop, 100);
    assert.equal(document.activeElement, document.body);
  }
  revealArticleFragment(scroller, '#' + encodeURIComponent(heading.id));
  assert.equal(scroller.scrollTop, 500);
  assert.equal(document.activeElement, heading);
  assert.equal(heading.tabIndex, -1);
});

test('reader navigation keeps the production canonical under either default theme and restores the collection and homepage', t => {
  for (const currentRoot of ['/', '/starfield/']) {
    const dom = new JSDOM('<title>文章归档 · 博客</title><link rel="canonical" href="https://blog.example/archives/">'
      + `<body data-site-title="博客" data-blog-current-root="${currentRoot}" data-starry-root="${currentRoot}">`,
    { url: 'http://localhost:4175' + currentRoot + 'archives/?motion=soft' });
    t.after(() => dom.window.close());
    const { document } = dom.window;
    const canonical = document.querySelector('[rel=canonical]');
    const sync = createPageIdentity(document);
    const article = { title: '随笔', path: '2025/11/01/随笔/', url: 'http://localhost:4175' + currentRoot + '2025/11/01/随笔/' };
    sync(article, false);
    assert.equal(document.title, '随笔 · 博客');
    assert.equal(canonical.href, 'https://blog.example/2025/11/01/' + encodeURIComponent('随笔') + '/');
    sync(null, true);
    assert.equal(document.title, '文章归档 · 博客');
    assert.equal(canonical.href, 'https://blog.example/archives/');
    sync(null, false);
    assert.equal(document.title, '博客');
    assert.equal(canonical.href, 'https://blog.example/');
  }
});
