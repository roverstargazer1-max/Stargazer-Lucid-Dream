import test from 'node:test';
import assert from 'node:assert/strict';
import { createEdgeGuide } from '../themes/stargazer-starfield/source/js/starfield/edge-guide.js';

test('unchanged frame presentation does not mutate a hidden or visible navigation hint', () => {
  const writes = [];
  const values = { hidden: true, textContent: '' };
  const element = { style: new Proxy({}, { set(target, key, value) {
    writes.push([key, value]); target[key] = value; return true;
  } }) };
  for (const key of Object.keys(values)) Object.defineProperty(element, key, {
    get: () => values[key], set: value => { writes.push([key, value]); values[key] = value; },
  });
  const activated = [];
  const guide = createEdgeGuide(element, id => activated.push(id));
  for (let i = 0; i < 120; i++) guide.present(null);
  assert.deepEqual(writes, [], 'a stationary hidden hint must not be rewritten each frame');

  const state = { left: '52px', top: '110px', text: '›', articleId: 'first' };
  guide.present(state);
  const initialWrites = writes.length;
  for (let i = 0; i < 120; i++) guide.present(state);
  assert.equal(writes.length, initialWrites, 'an unchanged visible hint must not hide/show or rewrite text');
  element.onclick();
  guide.present({ ...state, articleId: 'next' });
  element.onclick();
  assert.deepEqual(activated, ['first', 'next'], 'the click follows the latest destination even at the same position');
  assert.equal(writes.length, initialWrites);

  guide.present({ left: '50%', top: 'calc(100% - 110px)', text: '✧', articleId: 'nearest' });
  assert.equal(element.style.top, 'calc(100% - 110px)');
  assert.equal(element.textContent, '✧');
  assert.equal(element.hidden, false);
  guide.present(null);
  const hiddenWrites = writes.length;
  guide.present(null);
  assert.equal(element.hidden, true);
  assert.equal(writes.length, hiddenWrites);
});
