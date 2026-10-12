const fs = require('node:fs');
const path = require('node:path');

// v3 files are native Photoshop exports with the author's adjustment layers intact.
hexo.extend.generator.register('starry-search-assets', function () {
  if (hexo.config.theme !== 'stargazer-starfield') return [];
  const root = path.join(hexo.base_dir, 'assets');
  const files = [
    ...['base', 'frame', 'filters', 'arrow', 'star-chart', 'index', 'name', 'id', 'close']
      .map(name => [`${name}-v3.png`, `v3/${name}-v3.png`]),
  ].map(([name, source]) => [name, path.join(root, '检索页', source)]);
  files.push(['entry-blue-purple.png', path.join(root, '蓝紫星盘.png')]);
  return files.map(([name, source]) => ({ path: `images/search/${name}`, data: fs.readFileSync(source) }));
});
