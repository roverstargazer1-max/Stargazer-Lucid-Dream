const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const digest = data => createHash('sha256').update(data).digest('hex');

function resolveSceneArt(sourceDir, themeSourceDir, source, { originalFile = path.join(sourceDir, source), manifestFile = 'scene-cache.json' } = {}) {
  const originalHash = digest(fs.readFileSync(originalFile));
  const fallback = { path: source, version: originalHash.slice(0, 16), cacheVersion: '' };
  // Replacing an original never accidentally keeps an older display cache.
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(themeSourceDir, 'images/optimized', manifestFile), 'utf8'));
    const entry = manifest.entries.find(entry => entry.source === source && entry.sourceSha256 === originalHash);
    if (!entry) return fallback;
    const cacheHash = digest(fs.readFileSync(path.join(themeSourceDir, entry.cache)));
    if (cacheHash !== entry.cacheSha256) return fallback;
    return { ...fallback, path: entry.cache, cacheVersion: cacheHash.slice(0, 16) };
  } catch { return fallback; }
}

module.exports = { resolveSceneArt };
