'use strict';

const MAGNITUDES = { ordinary: 4.0, important: 2.5, treasured: 1.0 };

function normalizeStar(post, warn = () => {}) {
  const config = post.star;
  if (config == null) return { importance: 'ordinary', isolated: false, magnitude: MAGNITUDES.ordinary };
  if (typeof config !== 'object' || Array.isArray(config)) {
    warn(`${post.source}: star must contain rank and/or isolated; using the defaults.`);
    return { importance: 'ordinary', isolated: false, magnitude: MAGNITUDES.ordinary };
  }
  const ranks = Object.keys(MAGNITUDES);
  if (config.rank != null && !ranks.includes(config.rank)) warn(`${post.source}: unknown star.rank; using ordinary.`);
  if (config.isolated != null && typeof config.isolated !== 'boolean') warn(`${post.source}: star.isolated must be true or false; using false.`);
  const importance = ranks.includes(config.rank) ? config.rank : 'ordinary';
  return { importance, isolated: config.isolated === true, magnitude: MAGNITUDES[importance] };
}

module.exports = { normalizeStar };
