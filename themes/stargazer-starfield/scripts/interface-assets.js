const fs = require('node:fs');
const path = require('node:path');
const { resolveSceneArt } = require('../lib/scene-art');
let entries, cached;
hexo.extend.filter.register('before_generate', () => { entries = null; cached = new Map(); });
function asset(helper, source) {
  const themeSource = path.join(hexo.base_dir, 'themes/stargazer-starfield/source');
  if (!entries) {
    try { entries = new Map(JSON.parse(fs.readFileSync(path.join(themeSource, 'images/optimized/interface-cache.json'), 'utf8')).entries.map(entry => [entry.source, entry])); }
    catch { entries = new Map(); }
  }
  const entry = entries.get(source);
  if (!entry) return { src: helper.url_for(source), srcset: '' };
  cached ||= new Map();
  if (!cached.has(source)) cached.set(source, resolveSceneArt(hexo.source_dir, themeSource, source, { originalFile: path.join(hexo.base_dir, entry.sourceFile), manifestFile: 'interface-cache.json' }));
  const resolved = cached.get(source);
  const src = `${helper.url_for(resolved.path)}?v=${resolved.version}${resolved.cacheVersion ? `&cache=${resolved.cacheVersion}` : ''}`;
  return { src, srcset: resolved.cacheVersion && entry.resampled ? `${src} ${entry.cacheDimensions[0]}w, ${helper.url_for(source)}?v=${resolved.version} ${entry.sourceDimensions[0]}w` : '' };
}
hexo.extend.helper.register('starry_interface_url', function (source) { return asset(this, source).src; });
hexo.extend.helper.register('starry_interface_srcset', function (source) { return asset(this, source).srcset; });
hexo.extend.helper.register('starry_glyph_sources', function () {
  return Object.fromEntries([...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(character => [character, asset(this, `images/observation/glyphs/${character}.png`).src]));
});
