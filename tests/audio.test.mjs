import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const vendor = fs.readFileSync('node_modules/meting/dist/Meting.min.js', 'utf8');
let moduleId = 0;

async function fixture(t) {
  const requests = [], constructed = [], observers = [], timers = new Map(), listeners = new Map();
  const containers = [];
  let nextTimer = 1;
  const document = {
    body: { dataset: {} }, head: { append() {} },
    querySelector: () => ({}), querySelectorAll: () => containers.filter(container => container.isConnected),
    addEventListener(name, listener) { listeners.set(name, listener); },
    createElement() { return { className: '', textContent: '' }; },
  };
  class Request {
    constructor() { requests.push(this); }
    open(method, url, async) { Object.assign(this, { method, url, async }); }
    send() {}
    finish(body, status = 200) {
      this.readyState = 4; this.status = status;
      this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
      this.onreadystatechange?.();
    }
  }
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; this.active = true; }
    disconnect() { this.active = false; }
  }
  const browser = {
    document, XMLHttpRequest: Request, console: { log() {}, warn() {} },
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    APlayer: class {
      constructor(options) {
        this.options = options; this.container = options.container;
        this.container.playerBody = {}; constructed.push(this);
        for (const observer of observers) {
          if (observer.active && observer.target === this.container) observer.callback();
        }
      }
      destroy() { this.destroyed = true; this.container.playerBody = null; }
    },
  };
  browser.window = browser;
  vm.runInNewContext(vendor, browser);
  const globals = { document: globalThis.document, window: globalThis.window,
    XMLHttpRequest: globalThis.XMLHttpRequest, MutationObserver: globalThis.MutationObserver };
  Object.assign(globalThis, { document, window: browser, XMLHttpRequest: Request,
    MutationObserver: Observer });
  t.after(() => Object.assign(globalThis, globals));
  const { prepareEmbeddedPlayer } = await import(`../themes/stargazer-starfield/source/js/starfield/audio.js?test=${moduleId++}`);
  function article(dataset) {
    const container = {
      dataset: { ...dataset }, isConnected: true, hidden: false, previousElementSibling: null,
      querySelector() { return this.playerBody; },
      before(status) {
        status.classList = { contains: name => name === status.className };
        status.remove = () => { this.previousElementSibling = null; };
        this.previousElementSibling = status;
      },
    };
    containers.push(container);
    return { container, isConnected: true, querySelector: () => container,
      querySelectorAll: selector => selector === 'meting-js' ? [] : [container] };
  }
  return { article, prepareEmbeddedPlayer, browser, document, requests, constructed, observers, timers,
    fire(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay !== delay) continue;
        timers.delete(id); timer.callback();
      }
    } };
}

const playlist = [{ name: 'Song', artist: 'Artist', url: '/song.mp3', cover: '/cover.jpg', lrc: '/lyrics.lrc' }];
const playlistSettings = { id: '14457276201', server: 'netease', type: 'playlist' };
const plainOptions = options => JSON.parse(JSON.stringify({ ...options, container: null }));

test('cached article preparation keeps one pending request and one player after rapid reopening', async t => {
  const f = await fixture(t), article = f.article(playlistSettings);
  await Promise.all([f.prepareEmbeddedPlayer(article), f.prepareEmbeddedPlayer(article)]);
  assert.equal(f.requests.length, 1);
  assert.equal(f.timers.size, 1);
  f.requests[0].finish(playlist);
  await f.prepareEmbeddedPlayer(article);
  assert.equal(f.requests.length, 1);
  assert.equal(f.constructed.length, 1);
  assert.equal(f.browser.aplayers.length, 1);
  assert.equal(f.constructed[0].destroyed, undefined);
  assert.equal(f.timers.size, 0);
  assert.equal(f.observers.length, 0);
  assert.equal(f.requests[0].onreadystatechange, null);
  assert.equal(f.requests[0].onerror, null);
  assert.equal(f.requests[0].ontimeout, null);
});

test('a second music article never rebuilds or destroys the first cached player', async t => {
  const f = await fixture(t), first = f.article(playlistSettings), second = f.article({ url: '/second.mp3' });
  await f.prepareEmbeddedPlayer(first); f.requests[0].finish(playlist);
  await f.prepareEmbeddedPlayer(second); await f.prepareEmbeddedPlayer(first);
  assert.equal(f.requests.length, 1);
  assert.equal(f.constructed.length, 2);
  assert.ok(f.constructed.every(player => !player.destroyed));
  assert.equal(f.browser.aplayers.length, 2);
});

test('scoped playlist options and URL match the actual installed Meting vendor', async t => {
  const f = await fixture(t), article = f.article({
    ...playlistSettings, api: '/api?server=:server&type=:type&id=:id&auth=:auth', auth: 'fixture',
    autoplay: 'true', mini: 'true', fixed: 'false', volume: '0.4', listfolded: 'true',
    lrctype: '2', listMaxHeight: '180px', customAudioType: 'fixture', theme: '#abc',
    preload: 'none', loop: 'one', order: 'random', storagename: 'article-player',
  });
  // This is the real old initializer, serving as the compatibility oracle.
  article.container.dataset.autoplay = 'false';
  f.browser.loadMeting(); f.requests[0].finish(playlist);
  const expectedOptions = plainOptions(f.constructed[0].options), expectedUrl = f.requests[0].url;
  // Isolate the reference player from the scoped initialization under test.
  f.browser.aplayers = []; f.constructed.length = 0; f.requests.length = 0;
  await f.prepareEmbeddedPlayer(article); f.requests[0].finish(playlist);
  assert.deepEqual(plainOptions(f.constructed[0].options), expectedOptions);
  assert.equal(f.requests[0].url, expectedUrl);
  assert.equal(f.constructed[0].options.autoplay, false);
});

test('direct audio preserves actual Meting defaults and boolean coercion', async t => {
  const f = await fixture(t), article = f.article({
    url: '/song.mp3', title: 'Title', author: 'Author', pic: '/cover.jpg', mutex: 'false',
  });
  article.container.dataset.autoplay = 'false';
  f.browser.loadMeting();
  const expected = plainOptions(f.constructed[0].options);
  f.browser.aplayers = []; f.constructed.length = 0;
  await f.prepareEmbeddedPlayer(article);
  assert.deepEqual(plainOptions(f.constructed[0].options), expected);
  assert.equal(f.requests.length, 0);
  assert.equal(f.timers.size, 0);
});

test('eight-second fallback clears immediately on late success without observers or leftover timers', async t => {
  const f = await fixture(t), article = f.article(playlistSettings);
  await f.prepareEmbeddedPlayer(article); f.fire(8000);
  assert.equal(article.container.hidden, true);
  assert.equal(article.container.previousElementSibling.textContent, '音乐服务暂不可用，正文仍可继续阅读。');
  f.requests[0].finish(playlist);
  assert.equal(article.container.hidden, false);
  assert.equal(article.container.previousElementSibling, null);
  assert.equal(f.timers.size, 0);
});

test('failed playlists keep the original fallback, release handlers and can retry on reopening', async t => {
  const f = await fixture(t), article = f.article(playlistSettings);
  await f.prepareEmbeddedPlayer(article); f.requests[0].finish('invalid json'); f.fire(8000);
  assert.equal(article.container.hidden, true);
  assert.equal(f.requests[0].onreadystatechange, null);
  await f.prepareEmbeddedPlayer(article);
  assert.equal(f.requests.length, 2);
  f.requests[1].finish(playlist);
  assert.equal(article.container.hidden, false);
  assert.equal(article.container.previousElementSibling, null);
  assert.equal(f.constructed.length, 1);
  assert.equal(f.timers.size, 0);
});

test('playlist completion for a detached cached article waits until it is displayed again', async t => {
  const f = await fixture(t), article = f.article(playlistSettings);
  await f.prepareEmbeddedPlayer(article);
  article.isConnected = article.container.isConnected = false;
  f.requests[0].finish(playlist);
  assert.equal(f.constructed.length, 0);
  assert.equal(f.timers.size, 0);
  article.isConnected = article.container.isConnected = true;
  await f.prepareEmbeddedPlayer(article);
  assert.equal(f.requests.length, 1);
  assert.equal(f.constructed.length, 1);
});

test('stalled requests have a finite timeout and retain a retryable readable fallback', async t => {
  const f = await fixture(t), article = f.article(playlistSettings);
  await f.prepareEmbeddedPlayer(article);
  assert.equal(f.requests[0].timeout, 30000);
  f.fire(8000); f.requests[0].ontimeout();
  assert.equal(article.container.hidden, true);
  assert.equal(f.requests[0].ontimeout, null);
  await f.prepareEmbeddedPlayer(article);
  assert.equal(f.requests.length, 2);
});
