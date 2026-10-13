import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { createPreviewHandler } from '../tools/preview-http.mjs';

async function fixture(t, dependencies) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-preview-http-'));
  const image = Buffer.alloc(2_468_552, 37);
  fs.writeFileSync(path.join(root, 'art.webp'), image);
  fs.mkdirSync(path.join(root, '中文文章'));
  fs.writeFileSync(path.join(root, '中文文章/index.html'), '<p>原来的正文</p>');
  fs.mkdirSync(path.join(root, 'no-index'));
  fs.mkdirSync(path.join(root, 'directory-index/index.html'), { recursive: true });
  const server = http.createServer(createPreviewHandler(root, dependencies));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, image, port: server.address().port };
}

function request(port, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const client = http.request({ hostname: '127.0.0.1', port, path: pathname, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    client.on('error', reject);
    client.end();
  });
}

test('HEAD returns real file metadata without starting a content stream', async t => {
  let opened = 0;
  let closed = 0;
  let contentStreams = 0;
  let finishClosing;
  const descriptorsClosed = new Promise(resolve => { finishClosing = resolve; });
  const { port, image } = await fixture(t, { openFile: async (...args) => {
    const handle = await open(...args);
    opened += 1;
    return {
      stat: () => handle.stat(),
      createReadStream() { contentStreams += 1; throw new Error('HEAD must not read content'); },
      async close() { await handle.close(); closed += 1; if (closed === 20) finishClosing(); },
    };
  } });
  for (let pass = 0; pass < 20; pass++) {
    const result = await request(port, '/art.webp', 'HEAD');
    assert.equal(result.status, 200);
    assert.equal(result.body.length, 0);
    assert.equal(result.headers['content-length'], String(image.length));
    assert.equal(result.headers['content-type'], 'image/webp');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
  }
  await descriptorsClosed;
  assert.equal(opened, 20);
  assert.equal(closed, 20);
  assert.equal(contentStreams, 0);
});

test('GET streams every image byte and keeps decoded directory indexes and response headers', async t => {
  const { port, image } = await fixture(t);
  const result = await request(port, '/art.webp?unchanged=1');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, image);
  assert.equal(result.headers['content-type'], 'image/webp');
  assert.equal(result.headers['cache-control'], 'no-store');
  const article = await request(port, '/%E4%B8%AD%E6%96%87%E6%96%87%E7%AB%A0/');
  assert.equal(article.status, 200);
  assert.equal(article.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(article.body.toString(), '<p>原来的正文</p>');
});

test('missing indexes, directory indexes, malformed encoding and outside paths retain their statuses for GET and HEAD', async t => {
  const { port } = await fixture(t);
  for (const method of ['GET', 'HEAD']) {
    for (const pathname of ['/missing.webp', '/no-index/', '/directory-index/', '/%FF']) {
      const result = await request(port, pathname, method);
      assert.equal(result.status, 404, `${method} ${pathname}`);
      assert.equal(result.headers['content-type'], 'text/plain; charset=utf-8');
      assert.equal(result.headers['cache-control'], 'no-store');
      assert.equal(result.body.toString(), method === 'HEAD' ? '' : 'Not found');
    }
    const outside = await request(port, '/%2e%2e%2foutside.txt', method);
    assert.equal(outside.status, 403);
    assert.equal(outside.body.toString(), method === 'HEAD' ? '' : 'Forbidden');
  }
});

test('open failures return the existing 404 response before sending success headers, including HEAD', async t => {
  const { port } = await fixture(t, { openFile: async () => {
    throw Object.assign(new Error('Injected unreadable file'), { code: 'EACCES' });
  } });
  for (const method of ['GET', 'HEAD']) {
    const result = await request(port, '/art.webp', method);
    assert.equal(result.status, 404);
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.body.toString(), method === 'HEAD' ? '' : 'Not found');
  }
});

test('a read failure after streaming starts closes the descriptor without appending a 404 body', async t => {
  let closeDescriptor;
  const descriptorClosed = new Promise(resolve => { closeDescriptor = resolve; });
  const { port } = await fixture(t, { openFile: async (...args) => {
    const handle = await open(...args);
    return {
      stat: () => handle.stat(),
      createReadStream: () => new Readable({ read() { this.destroy(new Error('Injected stream failure')); } }),
      async close() { await handle.close(); closeDescriptor(); },
    };
  } });
  await assert.rejects(request(port, '/art.webp'), /socket hang up|aborted|reset/i);
  await descriptorClosed;
});

test('disconnecting during GET destroys its file stream and closes the descriptor', { timeout: 5000 }, async t => {
  let stream;
  let closeDescriptor;
  const descriptorClosed = new Promise(resolve => { closeDescriptor = resolve; });
  const { port } = await fixture(t, { openFile: async (...args) => {
    const handle = await open(...args);
    return {
      stat: () => handle.stat(),
      createReadStream(options) { stream = handle.createReadStream(options); return stream; },
      async close() { await handle.close(); closeDescriptor(); },
    };
  } });
  await new Promise((resolve, reject) => {
    const client = http.get({ hostname: '127.0.0.1', port, path: '/art.webp' }, response => {
      response.once('data', () => { client.destroy(); resolve(); });
      response.on('error', () => {});
    });
    client.on('error', reject);
  });
  await descriptorClosed;
  assert.equal(stream.destroyed, true);
});
