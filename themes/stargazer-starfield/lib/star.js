'use strict';

function normalizeStar(post, warn = () => {}) {
  const config = post.star;
  if (config == null) return { importance: 'ordinary', isolated: false };
  if (typeof config !== 'object' || Array.isArray(config)) {
    warn(`${post.source}: star must contain rank and/or isolated; using the defaults.`);
    return { importance: 'ordinary', isolated: false };
  }
  const ranks = ['ordinary', 'important', 'treasured'];
  if (config.rank != null && !ranks.includes(config.rank)) warn(`${post.source}: unknown star.rank; using ordinary.`);
  if (config.isolated != null && typeof config.isolated !== 'boolean') warn(`${post.source}: star.isolated must be true or false; using false.`);
  return { importance: ranks.includes(config.rank) ? config.rank : 'ordinary', isolated: config.isolated === true };
}

module.exports = { normalizeStar };
