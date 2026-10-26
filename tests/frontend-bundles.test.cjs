const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildAssets } = require('../lib/build-assets');

test('published bundles preserve module-relative artwork URLs and give the journal only its own surface styles', () => {
  const assets = buildAssets(path.resolve('source'));
  const app = assets.files.get('js/starfield/app.bundle.js');
  assert.ok(app.includes('import.meta.url'), 'Module-relative images must resolve from the emitted module');
  assert.ok(app.includes('../../images/reader/'));
  assert.ok(!/\bfrom\s*["']\.\//.test(app), 'The browser should not need the source dependency waterfall');
  const world = assets.files.get('css/starry/world.bundle.css');
  const journal = assets.files.get('css/starry/journal.bundle.css');
  assert.ok(world.includes('#star-search') && world.includes('#reader'));
  assert.ok(journal.includes('.journal-top') && journal.includes('.journal-image'));
  assert.ok(!journal.includes('#star-search') && !/#reader\s*\{/.test(journal));
  assert.ok(journal.includes('../../fonts/lxgw-marker-ui-v1.woff2'));
  assert.ok(world.includes('../../images/reader/sheet.webp'));
  assert.ok(journal.length < world.length, 'The standalone journal excludes the other reading and exploration surfaces');
  for (const relative of assets.files.keys()) assert.match(assets.version(relative), /^[a-f0-9]{16}$/);
});
