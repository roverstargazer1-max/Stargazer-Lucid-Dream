const fs = require('node:fs');
const path = require('node:path');

// Publish the author's original PNGs without redrawing or re-encoding them.
hexo.extend.generator.register('starry-branding-assets', function () {
  if (hexo.config.theme !== 'stargazer-starfield') return [];
  const assets = path.join(hexo.base_dir, 'assets', '代码程序素材');
  return [
    ['logo2.png', path.join(assets, 'Logo', 'Logo2', 'Logo2.png')],
    ['right-icons.png', path.join(assets, '右图标', '右图标.png')],
  ].map(([name, source]) => ({ path: `images/branding/${name}`, data: fs.readFileSync(source) }));
});
