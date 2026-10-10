const path = require('node:path');

// Reuse the original tag implementations rather than maintaining two syntaxes.
// Kira loads these itself; the new theme needs them before Hexo renders Markdown.
if (hexo.config.theme === 'stargazer-starfield') {
  for (const name of ['biliplayer', 'codepen', 'kira-player', 'meting']) {
    await hexo.loadPlugin(path.join(hexo.base_dir, 'themes/hexo-theme-kira/scripts/tag', `${name}.js`));
  }
}
