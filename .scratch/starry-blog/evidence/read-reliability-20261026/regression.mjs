import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the actual application closures with only their browser boundaries replaced.
// This keeps the reproducer on the READ call path without starting the sky renderer.
const source = fs.readFileSync('themes/stargazer-starfield/source/js/starfield/app.js', 'utf8');
const never = () => new Promise(() => {});
function scene() {
  const article = { id: 'target', title: '目标文章' }, node = {};
  const context = vm.createContext({
    article, selected: article.id, phase: 'settled', mode: 'relation', camera: {},
    reader: { open: false }, articleNodes: new Map([[article.id, node]]), articleLoads: new Map(),
    articleLoader: { load: async () => node, prefetch: async () => null },
    readError: null, readerRequestVersion: 0,
    readingSnapshot: null, readerTrigger: null, internalArticleHistory: false,
    readerSlot: { replaceChildren() {} }, starTargets: new Map(),
    document: { activeElement: {} }, window: {}, history: { pushState() {} },
    prepareReaderArt: never, waitForReaderArt: never, prepareImages: async () => {},
    updateUI() {}, announce() {}, project: value => value, positionOf: () => ({}),
    localArticleUrl: () => ({ pathname: '/article/' }), prepareEmbeddedPlayer: async () => {},
    showReader() { context.reader.open = true; },
    console: { warn() {} },
  });
  return context;
}
function install(context, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'application function boundaries must be present');
  vm.runInContext(source.slice(from, to), context);
}

test('READ reveals available text even when reading artwork never finishes', async () => {
  const context = scene();
  install(context, '  async function openReaderFromStar()', '  async function openReaderFromCollection(');
  const opening = context.openReaderFromStar();
  await Promise.race([opening, new Promise(resolve => setTimeout(resolve, 30))]);
  assert.equal(context.reader.open, true, 'a decorative request must not hold readable text behind READ');
});

test('failed background prefetch preserves the current star so READ can retry', async () => {
  const context = scene();
  context.articleNodes.clear();
  Object.assign(context, {
    preview: {}, travel: null, selected: 'previous', phase: 'settled',
    starMotion: { interrupt() {}, beginApproach: () => 1100, clearSelection() {} },
    performance: { now: () => 0 }, destination: () => ({}),
    loadArticleNode: async () => { throw new Error('offline'); },
  });
  install(context, '  function beginApproach(', '  function interrupt()');
  context.beginApproach('target', 'selection', { article: { id: 'previous' }, selected: 'previous', phase: 'settled', camera: {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(context.selected, 'target', 'an optional prefetch failure must not undo the selection');
});

test('a timed-out READ restores the ready state with retry feedback and keeps the address', async () => {
  const context = scene();
  context.articleLoader.load = async () => { const error = new Error('offline'); error.name = 'TimeoutError'; throw error; };
  let changedAddress = false;
  context.history.pushState = () => { changedAddress = true; };
  install(context, '  async function openReaderFromStar()', '  async function openReaderFromCollection(');
  await context.openReaderFromStar();
  assert.equal(context.phase, 'settled');
  assert.match(context.readError, /超时.*重试/);
  assert.equal(context.reader.open, false);
  assert.equal(changedAddress, false);
});

test('interrupting a pending READ prevents its late completion from opening the reader', async () => {
  const context = scene();
  let finish;
  context.articleLoader.load = () => new Promise(resolve => { finish = resolve; });
  context.waitForReaderArt = async () => {};
  context.starMotion = { interrupt() {} };
  context.travel = null;
  install(context, '  async function openReaderFromStar()', '  async function openReaderFromCollection(');
  install(context, '  function interrupt()', '  async function openReaderFromStar()');
  const opening = context.openReaderFromStar();
  context.interrupt();
  finish({});
  await opening;
  assert.equal(context.reader.open, false);
  assert.equal(context.phase, 'selected');
});
