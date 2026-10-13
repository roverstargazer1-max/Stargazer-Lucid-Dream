const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installBuildOutput } = require('../tools/install-build-output.cjs');

function fixture(t, { previous = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'public');
  const staging = path.join(root, '.dual-build');
  const output = path.join(staging, 'site');
  fs.mkdirSync(path.join(output, 'legacy'), { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), 'new starfield');
  fs.writeFileSync(path.join(output, 'legacy/index.html'), 'new legacy');
  if (previous) {
    fs.mkdirSync(path.join(target, 'legacy'), { recursive: true });
    fs.writeFileSync(path.join(target, 'index.html'), 'previous starfield');
    fs.writeFileSync(path.join(target, 'legacy/index.html'), 'previous legacy');
    fs.writeFileSync(path.join(target, 'old-only.txt'), 'old route');
  }
  return { root, output, target, staging };
}

function assertPrevious(target) {
  assert.equal(fs.readFileSync(path.join(target, 'index.html'), 'utf8'), 'previous starfield');
  assert.equal(fs.readFileSync(path.join(target, 'legacy/index.html'), 'utf8'), 'previous legacy');
  assert.equal(fs.readFileSync(path.join(target, 'old-only.txt'), 'utf8'), 'old route');
}

function retainedBackups(root) {
  return fs.readdirSync(root).filter(name => name.startsWith('.public-previous-'));
}

test('a complete build replaces both themes and removes previous-only files and its backup', t => {
  const { root, output, target } = fixture(t);
  installBuildOutput(output, target);
  assert.equal(fs.readFileSync(path.join(target, 'index.html'), 'utf8'), 'new starfield');
  assert.equal(fs.readFileSync(path.join(target, 'legacy/index.html'), 'utf8'), 'new legacy');
  assert.equal(fs.existsSync(path.join(target, 'old-only.txt')), false);
  assert.equal(fs.existsSync(output), false);
  assert.deepEqual(retainedBackups(root), []);
});

test('a failed final installation restores the entire usable output before staging cleanup', t => {
  const { root, output, target, staging } = fixture(t);
  const failure = Object.assign(new Error('Injected install failure'), { code: 'EACCES' });
  const filesystem = { ...fs, renameSync(from, to) {
    if (from === output) throw failure;
    fs.renameSync(from, to);
  } };
  assert.throws(() => installBuildOutput(output, target, filesystem), error => error === failure);
  fs.rmSync(staging, { recursive: true, force: true });
  assertPrevious(target);
  assert.deepEqual(retainedBackups(root), []);
});

test('a failed move of the previous output leaves the old routes untouched', t => {
  const { root, output, target } = fixture(t);
  const filesystem = { ...fs, renameSync() { throw new Error('Injected backup failure'); } };
  assert.throws(() => installBuildOutput(output, target, filesystem), /Injected backup failure/);
  assertPrevious(target);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'new starfield');
  assert.deepEqual(retainedBackups(root), []);
});

test('a first build can install into an absent destination', t => {
  const { root, output, target } = fixture(t, { previous: false });
  installBuildOutput(output, target);
  assert.equal(fs.readFileSync(path.join(target, 'legacy/index.html'), 'utf8'), 'new legacy');
  assert.deepEqual(retainedBackups(root), []);
});

test('a failed rollback retains the previous output outside disposable staging and reports its location', t => {
  const { root, output, target, staging } = fixture(t);
  const filesystem = { ...fs, renameSync(from, to) {
    if (to === target) throw new Error(from === output ? 'Injected install failure' : 'Injected restore failure');
    fs.renameSync(from, to);
  } };
  let failure;
  assert.throws(() => installBuildOutput(output, target, filesystem), error => {
    failure = error;
    return error instanceof AggregateError && error.errors.length === 2;
  });
  fs.rmSync(staging, { recursive: true, force: true });
  const backups = retainedBackups(root);
  assert.equal(backups.length, 1);
  const backup = path.join(root, backups[0]);
  assertPrevious(backup);
  assert.ok(failure.message.includes(backup));
});
