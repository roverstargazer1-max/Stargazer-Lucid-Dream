import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
import { previewComments } from '../components/comments/preview.mjs';

const template = readFileSync('components/comments/thread.html', 'utf8');
const thread = 'components/comments/thread.js';
const endpoint = '/__preview/api/comment';

function browser(t) {
  const dom = new JSDOM('<article data-starry-id="first">' + template + '</article>',
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
