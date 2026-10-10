const fs = require('node:fs');
const path = require('node:path');

// Publish the author's artwork and transparent font images without redrawing them.
hexo.extend.generator.register('starry-observation-assets', function () {
  if (hexo.config.theme !== 'stargazer-starfield') return [];
  const assets = path.join(hexo.base_dir, 'assets');
  const glyphFolder = fs.existsSync(path.join(assets, '科技小字-修订版7-透明字形'))
    ? '科技小字-修订版7-透明字形' : 'zmd科技小字-修订版7-透明字形';
  const glyphs = path.join(assets, glyphFolder, '透明PNG');
  const artwork = path.join(assets, '详情弹窗', '详细工程文件');
  const files = [
    ['waveform.png', '声音频率.png'],
    ['waves.png', '波浪纹理.png'],
    ['read.png', 'READ.png'],
    ['starlink.png', 'STARLINK.png'],
    ['observation-id.png', 'OBS&ID.png'],
    ['close.png', '退出按钮.png'],
    ['polyhedron.png', '右下角跳动几何块.png'],
  ].map(([name, source]) => [name, path.join(artwork, source)]);
  for (const name of ['year-pointer', 'diamond', 'dial-ticks', 'dial-bracket', 'date-boxes', 'call-label', 'call-word', 'call-underline', 'hour-label', 'read-rule']) {
    files.push([`${name}.png`, path.join(artwork, 'supplement-crops', `${name}.png`)]);
  }
  for (const character of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    files.push([`glyphs/${character}.png`, path.join(glyphs, /\d/.test(character) ? '数字' : '大写字母', `${character}.png`)]);
  }
  return files.map(([name, source]) => ({
    path: `images/observation/${name}`,
    data: fs.readFileSync(source),
  }));
});
