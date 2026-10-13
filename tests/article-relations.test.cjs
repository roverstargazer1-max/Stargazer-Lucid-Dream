const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require(require.resolve('hexo-front-matter', { paths: [path.dirname(require.resolve('hexo'))] }));
const { normalizeArticleRelations } = require('../themes/stargazer-starfield/lib/relations');

// Use the site's actual articles; changes to optional metadata stay in memory.
const posts = fs.readdirSync('source/_posts').filter(name => name.endsWith('.md')).map(name => ({
  ...parse(fs.readFileSync(path.join('source/_posts', name), 'utf8').replace(/\r\n/g, '\n')),
  source: `_posts/${name}`,
}));
const filename = post => path.basename(post.source, '.md');

test('a filename reference produces one bidirectional pair without requiring a reason', () => {
  const [left, right] = posts;
  const configured = posts.map(post => ({ ...post, related: post === left ? [filename(right)] : [] }));
  assert.deepEqual(normalizeArticleRelations(configured), [{
    articles: [left.starry_id, right.starry_id].sort(), reason: '',
  }]);
});

test('reciprocal declarations merge and preserve an optional author reason', () => {
  const [left, right] = posts;
  const configured = posts.map(post => ({ ...post, title: 'Changed display title', related:
    post === left ? [filename(right)] : post === right ? [{ post: filename(left), reason: '作者填写的理由' }] : [],
  }));
  assert.deepEqual(normalizeArticleRelations(configured), [{
    articles: [left.starry_id, right.starry_id].sort(), reason: '作者填写的理由',
  }]);
});

test('invalid optional references name the source and do not hide valid relations', () => {
  const [left, right] = posts;
  const warnings = [];
  const configured = posts.map(post => ({ ...post, related: post === left ? [
    '不存在的文章', filename(left), { post: filename(right), reason: 42 }, filename(right),
  ] : [] }));
  const result = normalizeArticleRelations(configured, message => warnings.push(message));
  assert.equal(result.length, 1);
  assert.equal(warnings.length, 3);
  assert.ok(warnings.every(message => message.includes(left.source)));
});

test('references to unpublished articles are omitted with a warning', () => {
  const [left, right] = posts;
  const warnings = [];
  const configured = posts.map(post => ({ ...post, published: post !== right,
    related: post === left ? [filename(right)] : [],
  }));
  assert.deepEqual(normalizeArticleRelations(configured, message => warnings.push(message)), []);
  assert.equal(warnings.length, 1);
});
