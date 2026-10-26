const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync('blog-assets/js/blog-theme-switch.js', 'utf8');

function fixture({ currentRoot = '/', targetRoot = '/legacy/', pathname = '/', search = '', hash = '' } = {}) {
  const documentListeners = new Map(), windowListeners = new Map(), links = [];
  let scans = 0, writes = 0;
  function link(href) {
    const anchor = {
      value: href,
      getAttribute(name) { assert.equal(name, 'href'); return this.value; },
      set href(value) { this.value = value; writes++; },
    };
    links.push(anchor); return anchor;
  }
  for (let i = 0; i < 4; i++) link();
  const context = {
    location: { pathname, search, hash },
    window: { addEventListener(name, listener) { windowListeners.set(name, listener); } },
    document: {
      body: { dataset: { blogCurrentRoot: currentRoot, blogTargetRoot: targetRoot } },
      querySelectorAll(selector) { assert.equal(selector, '[data-blog-theme-switch]'); scans++; return links; },
      addEventListener(name, listener, capture) { documentListeners.set(name, { listener, capture }); },
    },
  };
  vm.runInNewContext(script, context);
  return { ...context, links, link, documentListeners,
    counts: () => ({ scans, writes }),
    documentEvent(name) { documentListeners.get(name).listener({}); },
    popstate() { windowListeners.get('popstate')({}); } };
}

test('unrelated hover, focus and click events perform no repeated scan or href mutation', () => {
  const f = fixture();
  assert.deepEqual(f.counts(), { scans: 1, writes: 4 });
  for (let i = 0; i < 100; i++) {
    f.documentEvent('pointerover'); f.documentEvent('focusin'); f.documentEvent('click');
  }
  assert.deepEqual(f.counts(), { scans: 1, writes: 4 });
  assert.equal(f.documentListeners.get('click').capture, true);
});

test('address changes preserve article paths, queries and hashes, including back and forward', () => {
  const f = fixture({ pathname: '/2025/10/20/%E6%A2%A6/', search: '?mode=time', hash: '#paragraph' });
  const articleAddress = '/legacy/2025/10/20/%E6%A2%A6/?mode=time#paragraph';
  assert.ok(f.links.every(link => link.value === articleAddress));
  Object.assign(f.location, { pathname: '/archives/2025/', search: '?view=all', hash: '#top' });
  f.documentEvent('click');
  assert.ok(f.links.every(link => link.value === '/legacy/archives/2025/?view=all#top'));
  Object.assign(f.location, { pathname: '/2025/10/20/%E6%A2%A6/', search: '?mode=time', hash: '#paragraph' });
  f.popstate();
  assert.ok(f.links.every(link => link.value === articleAddress));
  f.location.hash = '#end'; f.documentEvent('focusin');
  assert.ok(f.links.every(link => link.value.endsWith('?mode=time#end')));
  f.location.search = '?mode=relation'; f.documentEvent('pointerover');
  assert.ok(f.links.every(link => link.value.endsWith('?mode=relation#end')));
  assert.deepEqual(f.counts(), { scans: 5, writes: 20 });
});

test('explicit refresh discovers inserted links without rewriting existing equal addresses', () => {
  const f = fixture(), added = f.link('/wrong/');
  f.window.blogThemeSwitch.refresh();
  assert.equal(added.value, '/legacy/');
  assert.deepEqual(f.counts(), { scans: 2, writes: 5 });
  f.window.blogThemeSwitch.refresh();
  assert.deepEqual(f.counts(), { scans: 3, writes: 5 });
});

test('legacy and starfield prefixes still map to the corresponding root theme', () => {
  for (const currentRoot of ['/legacy/', '/starfield/']) {
    const f = fixture({ currentRoot, targetRoot: '/', pathname: `${currentRoot}pages/mine/`, hash: '#section' });
    assert.ok(f.links.every(link => link.value === '/pages/mine/#section'));
    f.location.pathname = currentRoot; f.popstate();
    assert.ok(f.links.every(link => link.value === '/#section'));
  }
});

test('a page outside the configured root retains the prior fallback mapping', () => {
  const f = fixture({ currentRoot: '/starfield/', targetRoot: '/', pathname: '/unrelated/', search: '?a=1' });
  assert.ok(f.links.every(link => link.value === '/?a=1'));
});
