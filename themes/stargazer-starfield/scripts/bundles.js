const path = require('node:path');
const { buildAssets } = require('../lib/build-assets');
let cached;
hexo.extend.filter.register('before_generate', () => { cached = null; });
function assets() {
  return cached ||= buildAssets(path.join(hexo.base_dir, 'themes/stargazer-starfield/source'));
}
hexo.extend.generator.register('starry-bundles', () => [...assets().files].map(([path, data]) => ({ path, data })));
hexo.extend.helper.register('starry_script_url', function (name) {
  const relative = `js/starfield/${name}.bundle.js`;
  return `${this.url_for(relative)}?v=${assets().version(relative)}`;
});
hexo.extend.helper.register('starry_styles_url', function (surface = false) {
  const name = typeof surface === 'string' ? surface : surface ? 'journal' : 'world';
  const relative = `css/starry/${name}.bundle.css`;
  return `${this.url_for(relative)}?v=${assets().version(relative)}`;
});
