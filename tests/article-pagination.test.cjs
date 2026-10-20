const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment-timezone');
const { adjacentArticles } = require('../themes/stargazer-starfield/lib/article-order');

const post = (id, date, extra = {}) => ({ starry_id: id, date: moment.utc(date), ...extra });

test('article navigation follows publication time despite source order, pinning and unpublished posts', () => {
  const first = post('first', '2025-01-01');
  const middle = post('middle', '2025-06-01');
  const last = post('last', '2025-12-01', { sticky: 10, updated: moment.utc('2026-10-20') });
  const hidden = post('hidden', '2025-05-01', { published: false });
  const posts = [last, hidden, first, middle];
  assert.deepEqual(adjacentArticles(posts, 'first'), { previous: null, next: middle });
  assert.deepEqual(adjacentArticles(posts, 'middle'), { previous: first, next: last });
  assert.deepEqual(adjacentArticles(posts, 'last'), { previous: middle, next: null });
  assert.deepEqual(posts, [last, hidden, first, middle], 'navigation must not reorder the source collection');
});

test('equal timestamps use stable article identity in either input order', () => {
  const a = post('a', '2025-01-01T12:00:00');
  const b = post('b', '2025-01-01T12:00:00');
  const earlier = post('earlier', '2025-01-01T11:59:59');
  assert.deepEqual(adjacentArticles([b, a, earlier], 'a'), { previous: earlier, next: b });
  assert.deepEqual(adjacentArticles([earlier, a, b], 'a'), { previous: earlier, next: b });
});

test('empty catalogues, a single article and unknown identities have no phantom links', () => {
  assert.deepEqual(adjacentArticles([], 'missing'), { previous: null, next: null });
  assert.deepEqual(adjacentArticles([post('only', '2025-01-01')], 'only'), { previous: null, next: null });
  assert.deepEqual(adjacentArticles([post('only', '2025-01-01')], 'missing'), { previous: null, next: null });
});
