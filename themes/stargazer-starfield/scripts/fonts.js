const fs = require('node:fs');
const path = require('node:path');
let manifest;
hexo.extend.filter.register('before_generate', () => { manifest = null; });
function fonts() {
  return manifest ||= JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'themes/stargazer-starfield/source/fonts/marker-manifest.json'), 'utf8'));
}
hexo.extend.helper.register('starry_ui_font_url', function () {
  const ui = fonts().ui;
  return `${this.url_for(ui.path)}?v=${ui.sha256.slice(0, 12)}`;
});
hexo.extend.helper.register('starry_title_fonts', function (title) {
  const data = fonts(), ui = new Set(data.ui.codepoints);
  const blocks = new Set([...String(title || '')].map(character => character.codePointAt(0)).filter(point => !ui.has(point)).map(point => Math.floor(point / 256)));
  return data.chunks.filter(chunk => blocks.has(chunk.block)).map(chunk => this.url_for(chunk.path));
});
