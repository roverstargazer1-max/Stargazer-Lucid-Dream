const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { buildSync, transformSync } = require('esbuild');

function buildAssets(themeSource) {
  const files = new Map();
  const entryPoints = Object.fromEntries(['app', 'journal'].map(name => [`${name}.bundle`, path.join(themeSource, 'js/starfield', `${name}.js`)]));
  const result = buildSync({ entryPoints, outdir: path.join(themeSource, 'js/starfield'), write: false, bundle: true, splitting: false, format: 'esm', platform: 'browser', target: 'es2020', minify: true, charset: 'utf8', legalComments: 'inline' });
  for (const file of result.outputFiles) files.set(path.relative(themeSource, file.path).split(path.sep).join('/'), file.text);
  const core = ['font-chunks', 'ui-font', 'tokens', 'motion-tokens', 'site'];
  const groups = {
    world: [...core, 'scene', 'motion', 'reader', 'observation', 'search', 'collection', 'journal', 'friends'],
    journal: [...core, 'journal'],
    friends: [...core, 'friends'],
  };
  for (const [name, styles] of Object.entries(groups)) {
    const text = styles.map(style => fs.readFileSync(path.join(themeSource, `css/starry/${style}.css`), 'utf8')).join('\n');
    // The output stays beside the source styles, retaining every relative URL.
    files.set(`css/starry/${name}.bundle.css`, transformSync(text, { loader: 'css', minify: true, charset: 'utf8', legalComments: 'inline' }).code);
  }
  return {
    files,
    version(relative) { return createHash('sha256').update(files.get(relative)).digest('hex').slice(0, 16); },
  };
}

module.exports = { buildAssets };
