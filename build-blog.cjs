const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const yaml = require(resolveHexo('js-yaml'));

// One author-facing command owns preparation, both themes and the publish directory.
function buildBlog({ preview = false } = {}) {
  const root = __dirname;
  const config = yaml.load(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'));
  const defaultTheme = config.blog?.default_theme || 'starfield';
  if (!['starfield', 'legacy'].includes(defaultTheme)) throw new Error('blog.default_theme must be starfield or legacy.');
  const roots = defaultTheme === 'starfield'
    ? { starfield: '/', legacy: '/legacy/' }
    : { legacy: '/', starfield: '/starfield/' };
  const target = path.join(root, preview ? '.preview/stargazer' : 'public');
  const stagingParent = path.join(root, '.preview');
  fs.mkdirSync(stagingParent, { recursive: true });
  const staging = fs.mkdtempSync(path.join(stagingParent, '.dual-build-'));
  const output = path.join(staging, 'site');
  const run = (file, args = []) => execFileSync(process.execPath, [file, ...args], { cwd: root, stdio: 'inherit' });
  const hexoCli = require.resolve('hexo/bin/hexo');
  try {
    run(path.join(root, 'prepare-starfield.cjs'));
    // Hexo shares db.json, so build the themes sequentially with fresh caches.
    for (const name of [defaultTheme, defaultTheme === 'starfield' ? 'legacy' : 'starfield']) {
      const routeRoot = roots[name];
      if (routeRoot !== '/' && fs.existsSync(path.join(output, routeRoot.slice(1)))) {
        throw new Error(`${routeRoot} is reserved for the alternate theme; move the conflicting source page or article permalink.`);
      }
      const override = path.join(staging, `${name}.json`);
      fs.writeFileSync(override, JSON.stringify({
        theme: name === 'starfield' ? 'stargazer-starfield' : 'hexo-theme-kira',
        root: routeRoot,
        url: new URL(routeRoot, config.url).href,
        public_dir: path.join(output, routeRoot.slice(1)),
        dual_theme: { current_root: routeRoot, target_root: roots[name === 'starfield' ? 'legacy' : 'starfield'] },
      }));
      const args = ['--config', `_config.yml,${override}`];
      run(hexoCli, ['clean', ...args]);
      run(hexoCli, ['generate', '--bail', ...args]);
    }
    // Never replace a usable preview with only half of a successful build.
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(output, target);
    console.log(`Both themes built: ${path.relative(root, target)} (${defaultTheme} at /, ${defaultTheme === 'starfield' ? 'Kira at /legacy/' : 'starfield at /starfield/'}).`);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    buildBlog({ preview: process.argv.includes('--preview') });
  } catch (error) {
    console.error(`Blog build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { buildBlog };
