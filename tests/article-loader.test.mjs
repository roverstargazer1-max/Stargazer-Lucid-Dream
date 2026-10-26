import test from 'node:test';
import assert from 'node:assert/strict';
import { createArticleLoader } from '../themes/stargazer-starfield/source/js/starfield/article-loader.js';

const article = { id: 'dream', path: '/article/' };
const response = { ok: true, text: async () => '<article>readable text</article>' };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

test('prefetch and repeated READ share a request and the same cached article node', async () => {
  const network = deferred(), node = {};
  let calls = 0;
  const loader = createArticleLoader({
    urlFor: item => item.path,
    request: (url, options) => {
      calls++;
      assert.equal(url, article.path);
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.cache, undefined, 'use normal HTTP caching rather than force revalidation');
      return network.promise;
    },
    parsePage: (html, item) => { assert.match(html, /readable text/); assert.equal(item, article); return node; },
  });
  const speculative = loader.prefetch(article), reading = loader.load(article);
  assert.equal(loader.load(article), reading);
  assert.equal(calls, 1);
  network.resolve(response);
  assert.equal(await speculative, node);
  assert.equal(await reading, node);
  assert.equal(await loader.load(article), node);
  assert.equal(calls, 1);
});

for (const stalledPart of ['headers', 'body']) {
  test(`a stalled ${stalledPart} request times out, aborts and can be retried without caching a late result`, async () => {
    const stalled = deferred();
    let signal, calls = 0;
    const freshNode = {}, lateNode = {};
    const loader = createArticleLoader({
      urlFor: item => item.path, timeoutMs: 15,
      request: (url, options) => {
        signal = options.signal;
        calls++;
        if (calls > 1) return Promise.resolve(response);
        return stalledPart === 'headers' ? stalled.promise : Promise.resolve({ ok: true, text: () => stalled.promise });
      },
      parsePage: html => html === 'late' ? lateNode : freshNode,
    });
    await assert.rejects(loader.load(article), { name: 'TimeoutError' });
    assert.equal(signal.aborted, true);
    assert.equal(await loader.load(article), freshNode);
    stalled.resolve(stalledPart === 'headers' ? { ok: true, text: async () => 'late' } : 'late');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(await loader.load(article), freshNode, 'the timed-out request must not overwrite the retry');
    assert.equal(calls, 2);
  });
}

test('a failed speculative request is consumed and a later READ retries', async () => {
  let calls = 0;
  const node = {};
  const loader = createArticleLoader({
    urlFor: item => item.path,
    request: async () => ++calls === 1 ? { ok: false, status: 503 } : response,
    parsePage: () => node,
  });
  assert.equal(await loader.prefetch(article), null);
  assert.equal(await loader.load(article), node);
  assert.equal(calls, 2);
});

test('invalid article pages are rejected and direct-entry content avoids a new request', async () => {
  let calls = 0;
  const loader = createArticleLoader({
    urlFor: item => item.path,
    request: async () => { calls++; return response; },
    parsePage: () => { throw new Error('Wrong article identity'); },
  });
  await assert.rejects(loader.load(article), /Wrong article identity/);
  await assert.rejects(loader.load(article), /Wrong article identity/);
  assert.equal(calls, 2);
  const staticNode = {};
  loader.prime(article.id, staticNode);
  assert.equal(await loader.load(article), staticNode);
  assert.equal(calls, 2);
});
