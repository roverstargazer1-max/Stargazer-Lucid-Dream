// Keep iconfont's editable sources and demo in the repository, out of every
// Kira build. The theme uses only iconfont.css and the font files at runtime.
hexo.extend.filter.register('after_generate', () => {
  if (hexo.config.theme !== 'hexo-theme-kira') return;
  for (const file of ['demo_index.html', 'demo.css', 'iconfont.js', 'iconfont.json']) {
    hexo.route.remove(`lib/iconfont/${file}`);
  }
});
