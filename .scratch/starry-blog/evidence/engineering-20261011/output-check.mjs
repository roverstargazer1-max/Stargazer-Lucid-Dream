import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const baseline = process.env.BASELINE_DIR || '/tmp/stargazer-audit-baseline-20261011';
const current = process.env.OUTPUT_DIR || '.preview/stargazer';
async function inventory(root, directory = '') {
  const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true });
  const result = new Map();
  for (const entry of entries) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) for (const [key, value] of await inventory(root, name)) result.set(key, value);
    else result.set(name, createHash('sha256').update(await fs.readFile(path.join(root, name))).digest('hex'));
  }
  return result;
}
const before = await inventory(baseline), after = await inventory(current);
const changed = [...before].filter(([name, hash]) => after.get(name) !== hash).map(([name]) => name);
const added = [...after.keys()].filter(name => !before.has(name));
const expectedChanges = new Set([
  'js/blog-theme-switch.js', 'legacy/js/blog-theme-switch.js',
  ...['app', 'audio', 'dome', 'painted', 'interactive-clouds'].map(name => `js/starfield/${name}.js`),
]);
const expectedAdditions = new Set(['js/starfield/edge-guide.js', 'js/starfield/room-scene.js']);
assert.deepEqual(new Set(changed), expectedChanges, 'Only the intended runtime scripts may change');
assert.deepEqual(new Set(added), expectedAdditions, 'Only the separated controllers may be added');
const summary = { baselineFiles: before.size, currentFiles: after.size,
  unchangedFiles: before.size - changed.length, changed, added,
  unchangedHtml: [...before.keys()].filter(name => name.endsWith('.html') && !changed.includes(name)).length,
  htmlCssAssetsAndIndexIdentical: true,
};
await fs.writeFile(new URL('./output-summary.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
