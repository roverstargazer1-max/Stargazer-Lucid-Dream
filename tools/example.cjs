const fs = require('node:fs');
const path = require('node:path');
const Hexo = require('hexo');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'example');

async function main() {
  // Use an ordinary theme directory to exercise the same integration as a user site.
  const theme = path.join(site, 'themes/starfield');
  fs.mkdirSync(path.dirname(theme), { recursive: true });
  // Link only runtime directories, so the theme never contains its own example.
  if (fs.lstatSync(theme, { throwIfNoEntry: false })?.isSymbolicLink()) fs.unlinkSync(theme);
  fs.mkdirSync(theme, { recursive: true });
  for (const name of ['layout', 'lib', 'scripts', 'source', 'components', 'scaffolds', 'package.json', '_config.yml']) {
    const link = path.join(theme, name);
    if (!fs.existsSync(link)) fs.symlinkSync(path.join(root, name), link, process.platform === 'win32' && !name.includes('.') ? 'junction' : undefined);
  }
  const [command = 'build', ...args] = process.argv.slice(2);
  const hexo = new Hexo(site, { silent: false });
  await hexo.init();
  try {
    if (command === 'build') {
      await hexo.call('clean');
      await hexo.call('generate', { bail: true });
    } else if (command === 'server') {
      await hexo.call('server', { port: Number(process.env.PORT || 4175), ip: '127.0.0.1' });
      return;
    } else if (command === 'new' || command === 'journal') {
      await hexo.call(command, { _: args });
    } else if (command === 'clean') {
      await hexo.call('clean');
    } else throw new Error(`Unknown command: ${command}`);
  } finally {
    if (command !== 'server') await hexo.exit();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
