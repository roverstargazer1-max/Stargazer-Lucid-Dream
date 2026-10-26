import test from 'node:test';
import assert from 'node:assert/strict';
import { requestText } from '../themes/stargazer-starfield/source/js/starfield/request.js';

for (const part of ['headers', 'body']) {
  test(`content requests time out and abort stalled ${part}`, async () => {
    let signal;
    const never = new Promise(() => {});
    await assert.rejects(requestText('/content/', {
      timeoutMs: 15,
      request: (url, options) => {
        assert.equal(url, '/content/');
        assert.equal(options.credentials, 'same-origin');
        assert.equal(options.cache, undefined);
        signal = options.signal;
        return part === 'headers' ? never : Promise.resolve({ ok: true, text: () => never });
      },
    }), { name: 'TimeoutError' });
    assert.equal(signal.aborted, true);
  });
}

test('successful content is returned and HTTP errors are recoverable', async () => {
  assert.equal(await requestText('/content/', { request: async () => ({ ok: true, text: async () => 'readable' }) }), 'readable');
  await assert.rejects(requestText('/content/', { request: async () => ({ ok: false, status: 503 }) }), /503/);
});
