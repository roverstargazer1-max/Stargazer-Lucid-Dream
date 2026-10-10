// One-off asset preparation; production builds use the checked-in outputs.
const sharp = require('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  const results = [];
  const scenes = ['painted-sky-v11', 'room-poster-detail-v20', 'room-portrait-v11'];
  const files = scenes.map(name => ({ original: `themes/hexo-theme-kira/prototypes/starfield/assets/${name}.png`, output: `source/image/starfield/${name}.webp`, sourceCopy: `source/image/starfield/${name}.png` }));
  files.push({ original: 'assets/详情弹窗/详细工程文件/人物剪影.png', output: 'themes/stargazer-starfield/source/images/observation/silhouette.png' });
  for (const file of files) {
    const input = await fs.readFile(file.original);
    if (file.sourceCopy) {
      const previous = await fs.readFile(file.sourceCopy).catch(e => e.code === 'ENOENT' ? input : Promise.reject(e));
      assert.equal(hash(previous), hash(input), 'source copy must match the preserved original');
    }
    const original = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let encoded;
    if (file.sourceCopy) encoded = await sharp(input).webp({ lossless: true, effort: 6 }).toBuffer();
    else {
      // Fully transparent RGB has no displayed contribution but carries ~1 MB of noise.
      // Keep PNG's handling of the visible semi-transparent edge pixels unchanged.
      const rgba = Buffer.from(original.data);
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] === 0) rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
      encoded = await sharp(rgba, { raw: { width: original.info.width, height: original.info.height, channels: 4 } })
        .png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    }
    const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.width, original.info.width);
    assert.equal(decoded.info.height, original.info.height);
    let visibleDifferences = 0, transparentDifferences = 0;
    for (let i = 0; i < original.data.length; i += 4) {
      const a = original.data, b = decoded.data;
      if (a[i + 3] !== b[i + 3] || (a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]))) visibleDifferences++;
      else if (!a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) transparentDifferences++;
    }
    assert.equal(visibleDifferences, 0, 'every visible RGB pixel and alpha value must be preserved');
    await fs.mkdir(path.dirname(file.output), { recursive: true });
    await fs.writeFile(file.output, encoded);
    if (!file.sourceCopy) await fs.unlink(file.output.replace('.png', '.webp')).catch(e => { if (e.code !== 'ENOENT') throw e; });
    if (file.sourceCopy) await fs.unlink(file.sourceCopy).catch(e => { if (e.code !== 'ENOENT') throw e; });
    results.push({ ...file, width: decoded.info.width, height: decoded.info.height, originalBytes: input.length, optimizedBytes: encoded.length,
      originalSHA256: hash(input), optimizedSHA256: hash(encoded), allRGBAPixelsEqual: original.data.equals(decoded.data), visibleDifferences, transparentDifferences });
  }
  await fs.writeFile('.scratch/starry-blog/evidence/performance-20261008/assets.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
