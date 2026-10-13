import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTimePaths } from '../themes/stargazer-starfield/source/js/starfield/navigation.js';

test('isolated real article keeps its chronological place but never receives an automatic time line', () => {
  const articles = JSON.parse(fs.readFileSync('.preview/stargazer/starry/index.json')).articles;
  const isolated = articles[1].id;
  const edges = buildTimePaths(articles.map(article => ({ ...article, isolated: article.id === isolated })));
  assert.ok(edges.every(pair => !pair.includes(isolated)));
  assert.deepEqual(edges[0], [articles[0].id, articles[2].id]);
  assert.equal(edges.length, articles.length - 2);
});
