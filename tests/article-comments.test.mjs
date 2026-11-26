import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
import { previewComments } from '../components/comments/preview.mjs';
import { createDomeProjector } from '../themes/stargazer-starfield/source/js/starfield/dome.js';
import { skyProjection } from '../themes/stargazer-starfield/source/js/starfield/camera-bounds.js';

const template = readFileSync('components/comments/thread.html', 'utf8');
const thread = 'components/comments/thread.js';
const meteors = 'themes/stargazer-starfield/source/js/starfield/comment-meteors.js';
const endpoint = '/__preview/api/comment';

function browser(t) {
  const dom = new JSDOM('<article data-starry-id="first">' + template + '</article><div id="sky"></div>',
    { url: 'http://localhost/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const win = dom.window;
  win.HTMLElement.prototype.scrollIntoView = function () { win.lastScroll = this; };
  const module = file => win.eval(buildSync({
    entryPoints: [file], bundle: true, format: 'iife', globalName: 'api', write: false,
  }).outputFiles[0].text + '\napi');
  return { win, section: win.document.querySelector('section'), module };
}

// Use the actual handler and SQLite store without needing a listening socket.
function fetchPreview(handler) {
  return async (url, options = {}) => {
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.url = new URL(url, 'http://localhost').pathname + new URL(url, 'http://localhost').search;
    req.method = options.method || 'GET';
    req.headers = { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' };
    let status, result;
    await handler(req, {
      writeHead(value) { status = value; },
      end(body) { result = JSON.parse(body); },
    });
    return { ok: status < 400, status, json: async () => result };
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('guest comments survive remount, independent visitors and reopening the SQLite preview store', async t => {
  const folder = mkdtempSync(path.join(tmpdir(), 'starry-comments-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const filename = path.join(folder, 'comments.sqlite');
  const first = browser(t);
  first.win.fetch = fetchPreview(previewComments(filename));
  const unmount = first.module(thread).mountComments(first.section, endpoint);
  await flush();
  const form = first.section.querySelector('form');
  form.elements.nick.value = '夜航';
  form.elements.comment.value = '第一颗 <b>星</b>！';
  form.requestSubmit();
  await flush();
  assert.equal(first.section.querySelector('li p').textContent, '第一颗 <b>星</b>！');
  const anchor = first.section.querySelector('li').id;
  unmount();

  const other = browser(t);
  other.win.fetch = fetchPreview(previewComments(filename));
  const ui = other.module(thread);
  ui.mountComments(other.section, endpoint, anchor);
  await flush();
  assert.equal(other.win.lastScroll.id, anchor);
  assert.equal(other.win.document.activeElement.id, anchor);
  assert.equal(other.section.querySelectorAll('li b').length, 0);
  assert.equal((await ui.meteorComments(endpoint, [{ id: 'first' }]))[0].id, anchor.slice(8));
  const empty = await other.win.fetch(endpoint + '?path=second');
  assert.equal((await empty.json()).data.count, 0);
  const rejected = await other.win.fetch(endpoint, { method: 'POST', body: JSON.stringify({ url: 'first', nick: ' ', comment: '留言' }) });
  assert.equal(rejected.status, 400);
});

test('deep links locate older comments across pages and handle a removed target', async t => {
  const { win, section, module } = browser(t);
  win.fetch = fetchPreview(previewComments(':memory:'));
  let first;
  for (let i = 0; i < 22; i++) {
    const res = await win.fetch(endpoint, { method: 'POST', body: JSON.stringify({ url: 'first', nick: '读者', comment: '留言 ' + i }) });
    if (!i) first = (await res.json()).data.objectId;
  }
  const ui = module(thread);
  const unmount = ui.mountComments(section, endpoint, 'comment-' + first);
  await flush();
  assert.equal(win.lastScroll.id, 'comment-' + first);
  assert.equal(section.querySelectorAll('li').length, 22);
  unmount();
  ui.mountComments(section, endpoint, 'comment-deleted');
  await flush();
  assert.match(section.querySelector('.comment-list-status').textContent, /已不可见/);
});

test('comment meteors fade along varied sky paths, follow the camera and retain their comment links', async t => {
  const { win, module } = browser(t);
  const layer = win.document.querySelector('#sky');
  layer.dataset.speed = 40;
  let task, target, now = 0, random = .6;
  win.setTimeout = callback => { task = callback; return 1; };
  win.clearTimeout = () => { task = null; };
  win.Math.random = () => random;
  win.performance.now = () => now;
  const width = 1024, height = 768;
  const camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: .55, zoom: 1 };
  const settings = skyProjection(width, height);
  const head = button => [parseFloat(button.style.left), parseFloat(button.style.top)];
  const glints = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    arc(x, y, radius) { glints.push({ x, y, radius, opacity: this.globalAlpha }); },
  };
  const rows = [{ articleId: 'first', id: 'abc', excerpt: '云层很漂亮' }];
  const { setActive, paint } = module(meteors).createCommentMeteors({
    layer, articles: [{ id: 'first', title: '第一篇' }], getSelected: () => null,
    getScene: () => ({ camera, width, height, settings }),
    isSoft: () => false, loadModule: async () => ({ meteorComments: async () => rows }),
    open: (article, anchor) => { target = [article.id, anchor]; },
  });
  function frame(view = camera) {
    glints.length = 0;
    paint(ctx, now, createDomeProjector(view, skyProjection(width, height, view.zoom)), width, height);
    return glints.at(-1);
  }
  function pointerClick(element, pointerType = 'mouse') {
    const down = new win.MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(down, 'pointerType', { value: pointerType });
    element.dispatchEvent(down);
    element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, detail: 1 }));
    return down.defaultPrevented;
  }
  setActive(true);
  assert.equal(task, undefined, 'An unconfigured production service never schedules an invitation');
  layer.dataset.api = endpoint;
  setActive(true);
  await task();
  const star = layer.querySelector('button');
  assert.equal(frame(), undefined);
  assert.ok(star.hidden);
  now = 500;
  const rising = frame();
  assert.ok(rising.opacity > 0 && rising.opacity < 1);
  now = 2400;
  const peak = frame();
  assert.ok(peak.opacity > rising.opacity);
  assert.ok(peak.radius < 1.5);
  const beforePan = head(star);
  assert.deepEqual(beforePan, [peak.x, peak.y]);
  frame({ ...camera, yaw: .15 });
  assert.ok(head(star)[0] < beforePan[0] - 70);
  frame({ ...camera, pitch: .65, zoom: 1.6 });
  assert.ok(Math.abs(head(star)[1] - beforePan[1]) > 40);
  frame({ ...camera, yaw: Math.PI });
  assert.ok(star.hidden);
  frame();
  assert.deepEqual(head(star), beforePan);

  star.dispatchEvent(new win.Event('pointerenter'));
  assert.match(star.textContent, /第一篇云层很漂亮/);
  now += 400;
  frame();
  assert.deepEqual(head(star), beforePan);
  const suppressedFocus = pointerClick(star);
  assert.equal(target, undefined, 'a click on the meteor itself does not open a comment');
  assert.ok(suppressedFocus, 'a mouse press on the meteor must not focus it');
  star.dispatchEvent(new win.MouseEvent('pointerleave', { relatedTarget: star.querySelector('.meteor-note') }));
  assert.ok(star.classList.contains('is-caught'), 'crossing from the star into its card keeps the preview open');
  star.dispatchEvent(new win.Event('pointerleave'));
  now += 400;
  frame();
  assert.ok(!star.classList.contains('is-caught'));
  assert.notDeepEqual(head(star), beforePan);
  star.dispatchEvent(new win.Event('pointerenter'));
  pointerClick(star.querySelector('.meteor-note strong'));
  assert.deepEqual(target, ['first', 'comment-abc']);
  setActive(false);

  random = .8;
  setActive(true);
  await task();
  const touchStar = layer.querySelector('button');
  now += 2400;
  frame();
  assert.ok(Math.hypot(head(touchStar)[0] - beforePan[0], head(touchStar)[1] - beforePan[1]) > 80);
  target = null;
  pointerClick(touchStar, 'touch');
  assert.equal(target, null);
  assert.ok(touchStar.classList.contains('is-caught'));
  pointerClick(touchStar, 'touch');
  assert.deepEqual(target, ['first', 'comment-abc']);
  setActive(false);
  assert.equal(layer.children.length, 0);
  assert.equal(task, null);

  rows.length = 0;
  win.document.dispatchEvent(new win.Event('starry:comments-changed'));
  setActive(true);
  await task();
  const invitation = layer.querySelector('button');
  const born = now;
  now += 2400;
  frame();
  target = null;
  invitation.dispatchEvent(new win.Event('pointerenter'));
  pointerClick(invitation);
  invitation.dispatchEvent(new win.Event('pointerleave'));
  assert.equal(target, null);
  assert.ok(!invitation.classList.contains('is-caught'), 'clicking an invitation meteor cannot pin it');
  invitation.click();
  assert.equal(target, null);
  assert.equal(invitation.textContent, '试试评论吗？');
  pointerClick(invitation.querySelector('.meteor-note'));
  assert.deepEqual(target, ['first', 'article-comments']);

  setActive(false);
  now = born;
  setActive(true);
  await task();
  let fading;
  for (now = born + 2400; now < born + 20000 && layer.children.length; now += 100) {
    const opacity = frame()?.opacity;
    if (opacity > 0 && opacity < .08) fading = opacity;
  }
  assert.ok(fading, 'the light fades nearly to zero before the hit target is removed');
  assert.equal(layer.children.length, 0);
});
