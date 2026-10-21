const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parse } = require(require.resolve('hexo-front-matter', {
  paths: [path.dirname(require.resolve('hexo'))],
}));
const project = path.resolve(__dirname, '..');
const { FIELD_COMMENTS, annotateFrontMatter } = require('../tools/article-authoring.cjs');

function withPost(source, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-authoring-'));
  try {
    for (const name of ['prepare-starfield.cjs', 'package.json', '_config.yml', '_config.legacy-preview.yml', '_config.hexo-theme-kira.yml']) {
      fs.copyFileSync(path.join(project, name), path.join(root, name));
    }
    for (const name of ['node_modules', 'themes', 'scripts', 'tools']) fs.symlinkSync(path.join(project, name), path.join(root, name), 'dir');
    fs.cpSync(path.join(project, 'scaffolds'), path.join(root, 'scaffolds'), { recursive: true });
    fs.mkdirSync(path.join(root, 'source/_posts'), { recursive: true });
    const file = path.join(root, 'source/_posts/写作验证.md');
    fs.writeFileSync(file, source);
    const read = () => parse(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    const prepare = () => {
      try { execFileSync(process.execPath, ['prepare-starfield.cjs'], { cwd: root, stdio: 'pipe' }); }
      catch (error) { throw new Error(String(error.stdout) + String(error.stderr)); }
      return read();
    };
    run({ root, file, read, prepare });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const original = '---\ntitle: 写作验证\ndate: 2026-10-15 12:00:00\nstarry_excerpt: ""\nstarry_excerpt_generated: true\n---\n\n这是第一段正文，用于自动概述。\n';

test('field notes preserve comment-like string content, custom mappings and quoted keys', () => {
  const source = '---\n"title": 写作验证\nstar:\n  rank: ordinary\n  isolated: false\nsubheading: |\n  # title：这行是文字内容\n  title: 这个也是文字\n自定义属性:\n  rank: 自定义值\n---\n\n正文不变。\n';
  const annotated = annotateFrontMatter(source, '写作验证.md');
  assert.deepEqual(parse(annotated), parse(source));
  assert.ok(annotated.includes('  # title：这行是文字内容\n  title: 这个也是文字'));
  assert.ok(annotated.includes('自定义属性:\n  rank: 自定义值'));
  assert.equal(annotateFrontMatter(annotated, '写作验证.md'), annotated);
});

test('editing an automatically filled excerpt wins without changing its generated flag', () => {
  withPost(original, ({ file, prepare }) => {
    const first = prepare();
    assert.equal(first.starry_excerpt, '这是第一段正文，用于自动概述。');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(
      /^starry_excerpt:.*$/m, 'starry_excerpt: "我自己写的摘要。"',
    ));
    const manual = prepare();
    assert.equal(manual.starry_excerpt, '我自己写的摘要。');
    assert.equal(manual.starry_excerpt_generated, false);
    assert.equal(manual.starry_id, first.starry_id);
    assert.equal(manual.permalink, first.permalink);
    assert.equal(manual._content, first._content);
  });
});

test('blank excerpts resume automatic extraction and follow body edits while identity stays stable', () => {
  withPost(original.replace('starry_excerpt_generated: true', 'starry_excerpt_generated: false'), ({ root, file, prepare }) => {
    const first = prepare();
    assert.equal(first.starry_excerpt, '这是第一段正文，用于自动概述。');
    const layoutFile = path.join(root, 'source/_data/starry-layout.json');
    const saved = JSON.parse(fs.readFileSync(layoutFile)).articles[first.starry_id];
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('这是第一段正文，用于自动概述。\n', '更新后的正文会自动成为概述。\n'));
    const updated = prepare();
    assert.equal(updated.starry_excerpt, '更新后的正文会自动成为概述。');
    assert.equal(updated.starry_excerpt_generated, true);
    assert.equal(updated.starry_id, first.starry_id);
    const next = JSON.parse(fs.readFileSync(layoutFile)).articles[first.starry_id];
    assert.deepEqual(next.position, saved.position);
    assert.equal(next.catalogNumber, saved.catalogNumber);
    assert.equal(next.originalPermalink, saved.originalPermalink);
  });
});

test('new manual multiline excerpts, clearing them, and author hints preserve valid metadata and the exact body', () => {
  const source = original.replace('starry_excerpt: ""', '# 我自己的备注\nstarry_excerpt: |\n  第一行手写摘要。\n  第二行手写摘要。').replace('title: 写作验证', 'title: 写作验证\n写作提示: 旧的集中提示\n自动字段: 旧的自动字段说明\n字段速查: 旧的速查路径').replace(/\n/g, '\r\n');
  withPost('\uFEFF' + source, ({ file, prepare }) => {
    const first = prepare();
    assert.equal(first.starry_excerpt.trim(), '第一行手写摘要。\n第二行手写摘要。');
    assert.equal(first.starry_excerpt_generated, false);
    const annotated = fs.readFileSync(file, 'utf8');
    for (const key of Object.keys(first).filter(key => Object.hasOwn(FIELD_COMMENTS, key))) {
      assert.ok(annotated.includes(`# ${key}：${FIELD_COMMENTS[key]}\r\n${key}:`), `Missing adjacent comment for ${key}`);
    }
    for (const key of ['写作提示', '自动字段', '字段速查']) assert.ok(!Object.hasOwn(first, key));
    assert.ok(!first._content.includes(FIELD_COMMENTS.starry_excerpt));
    assert.ok(fs.readFileSync(file, 'utf8').startsWith('\uFEFF---\r\n'));
    assert.ok(fs.readFileSync(file, 'utf8').includes('# 我自己的备注'));
    const stable = fs.readFileSync(file, 'utf8');
    prepare();
    assert.equal(fs.readFileSync(file, 'utf8'), stable);

    // An editor may save an empty property as null rather than an empty string.
    fs.writeFileSync(file, stable.replace(/^starry_excerpt:[\s\S]*?(?=^\S|^---)/m, 'starry_excerpt:\r\n'));
    const cleared = prepare();
    assert.equal(cleared.starry_excerpt, '这是第一段正文，用于自动概述。');
    assert.equal(cleared.starry_excerpt_generated, true);
    assert.equal(cleared._content, first._content);
  });
});

test('existing automatic block excerpts migrate safely and new posts receive comments at each field', () => {
  withPost(original.replace('starry_excerpt: ""', 'starry_excerpt: |\n  这是第一段正文，用于自动概述。'), ({ root, file, prepare }) => {
    const first = prepare();
    assert.equal(first.starry_excerpt, '这是第一段正文，用于自动概述。');
    assert.equal(first.starry_excerpt_generated, true);
    assert.equal(first._content, parse(original)._content);
    assert.ok(!fs.readFileSync(file, 'utf8').includes('starry_excerpt: |'));
    execFileSync(process.execPath, [require.resolve('hexo-cli/bin/hexo'), 'new', 'post', '新文章提示'], { cwd: root, stdio: 'pipe' });
    const created = fs.readFileSync(path.join(root, 'source/_posts/新文章提示.md'), 'utf8');
    const post = parse(created);
    for (const key of Object.keys(post).filter(key => Object.hasOwn(FIELD_COMMENTS, key))) {
      assert.ok(created.includes(`# ${key}：${FIELD_COMMENTS[key]}\n${key}:`), `Missing adjacent comment for ${key}`);
    }
    assert.ok(created.includes(`  # star.rank：${FIELD_COMMENTS['star.rank']}\n  rank:`));
    assert.ok(created.includes(`  # star.isolated：${FIELD_COMMENTS['star.isolated']}\n  isolated:`));
    for (const key of ['写作提示', '自动字段', '字段速查']) assert.ok(!Object.hasOwn(post, key));
    assert.equal(post.starry_excerpt, '');
    assert.equal(post.starry_id, undefined, 'Identity is assigned by the first preview/build, not by the creation command');
    assert.ok(!post._content.includes(FIELD_COMMENTS.starry_excerpt));
  });
});
