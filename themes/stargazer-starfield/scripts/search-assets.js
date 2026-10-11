const fs = require('node:fs');
const path = require('node:path');

// Keep the author's PNG files intact; the layout crops their transparent padding in CSS.
hexo.extend.generator.register('starry-search-assets', function () {
  if (hexo.config.theme !== 'stargazer-starfield') return [];
  const root = path.join(hexo.base_dir, 'assets');
  const files = [
    ['base-v2.png', '底图/底图v2.png'],
    ['grid-v2.png', '检索原型图v2.png'],
    ['frame-v2.png', '左侧/搜索栏v2.png'],
    ['filters.png', '左侧/筛选.png'],
    ['arrow.png', '左侧/折叠箭头.png'],
    ['star-chart.png', '左侧/Starchart.png'],
    ['index.png', '右侧/index.png'],
    ['name.png', '右侧/NAME.png'],
    ['id.png', '右侧/OBS&ID.png'],
    ['close.png', '右侧/退出按钮.png'],
  ].map(([name, source]) => [name, path.join(root, '检索页', source)]);
  files.push(['entry-blue-purple.png', path.join(root, '蓝紫星盘.png')]);
  return files.map(([name, source]) => ({ path: `images/search/${name}`, data: fs.readFileSync(source) }));
});
