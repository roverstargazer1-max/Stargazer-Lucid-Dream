import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const timeout = () => { const error = new Error('Request timed out'); error.name = 'TimeoutError'; return Promise.reject(error); };
const delay = () => new Promise(resolve => setTimeout(() => resolve('still waiting'), 25));

test('a stalled journal request finishes with an error and clears its shared request for retry', async () => {
  const source = fs.readFileSync('themes/stargazer-starfield/source/js/starfield/journal.js', 'utf8');
  const context = vm.createContext({
    loadPromise: null, dialog: { dataset: { journalUrl: '/journal/' } },
    fetch: () => new Promise(() => {}), requestText: timeout,
  });
  const from = source.lastIndexOf('  function load() {');
  vm.runInContext(source.slice(from, source.indexOf('  async function fill(', from)), context);
  const result = context.load().then(() => 'loaded', error => error.name);
  assert.equal(await Promise.race([result, delay()]), 'TimeoutError');
  assert.equal(context.loadPromise, null);
});

test('a stalled full-text index finishes with recoverable search feedback', async () => {
  const source = fs.readFileSync('themes/stargazer-starfield/source/js/starfield/search.js', 'utf8');
  let renders = 0;
  const context = vm.createContext({
    loaded: false, loading: null, loadError: false, dialog: { open: true, dataset: { searchUrl: '/search.json' } },
    fetch: () => new Promise(() => {}), requestText: timeout,
    renderResults: () => renders++, console: { warn() {} },
  });
  const from = source.indexOf('  async function loadDocuments()');
  vm.runInContext(source.slice(from, source.indexOf('  function open(', from)), context);
  await Promise.race([context.loadDocuments(), delay()]);
  assert.equal(context.loadError, true);
  assert.equal(context.loading, null);
  assert.equal(renders, 1);
});
