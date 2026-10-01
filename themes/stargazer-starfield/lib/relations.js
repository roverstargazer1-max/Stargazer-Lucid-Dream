'use strict';

const path = require('node:path');

// Author-facing filenames resolve to saved identities; changing a title is harmless.
function normalizeArticleRelations(posts, warn = () => {}) {
  const published = posts.filter(post => post.published !== false);
  const filenames = new Map();
  for (const post of published) {
    const filename = path.posix.basename(String(post.source).replace(/\\/g, '/'), '.md');
    if (filenames.has(filename)) throw new Error(`Ambiguous article filename "${filename}"; use unique filenames in source/_posts.`);
    filenames.set(filename, post);
  }
  const pairs = new Map();
  for (const post of published) {
    if (post.related == null) continue;
    const entries = Array.isArray(post.related) ? post.related : [post.related];
    entries.forEach((entry, index) => {
      const location = `${post.source} related[${index}]`;
      const filename = typeof entry === 'string' ? entry : entry?.post;
      const reason = typeof entry === 'object' && entry !== null ? entry.reason : undefined;
      if (typeof filename !== 'string' || !filename.trim() || (reason != null && typeof reason !== 'string')) {
        warn(`${location}: expected a filename without .md and an optional text reason; skipping.`);
        return;
      }
      const target = filenames.get(filename.trim());
      if (!target || target === post) {
        warn(`${location}: missing, unpublished or self-referencing article "${filename}"; skipping.`);
        return;
      }
      const articles = [String(post.starry_id), String(target.starry_id)].sort();
      const key = articles.join('\0');
      const text = (reason || '').trim();
      const existing = pairs.get(key);
      if (!existing) pairs.set(key, { articles, reason: text });
      else if (!existing.reason) existing.reason = text;
      else if (text && existing.reason !== text) warn(`${location}: conflicting reciprocal reasons; keeping the first reason.`);
    });
  }
  return [...pairs.values()].sort((a, b) => a.articles.join('\0').localeCompare(b.articles.join('\0')));
}

module.exports = { normalizeArticleRelations };
