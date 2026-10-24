const path = require('node:path');
const { resolveSceneArt } = require('../lib/scene-art');
let resolved = new Map();
hexo.extend.filter.register('before_generate', () => { resolved = new Map(); });

function sceneUrl(helper, source) {
  if (!resolved.has(source)) resolved.set(source, resolveSceneArt(hexo.source_dir, path.join(hexo.base_dir, 'themes/stargazer-starfield/source'), source));
  const asset = resolved.get(source);
  return `${helper.url_for(asset.path)}?v=${asset.version}${asset.cacheVersion ? `&cache=${asset.cacheVersion}` : ''}`;
}

// A replacement illustration must not reuse a browser/CDN cache entry for the old bytes.
hexo.extend.helper.register('starry_room_url', function () {
  return sceneUrl(this, hexo.theme.config.scene.room);
});
hexo.extend.helper.register('starry_sky_url', function () { return sceneUrl(this, hexo.theme.config.scene.painted_sky); });
