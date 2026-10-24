const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createEntry, readJournal } = require('../components/journal');
const project = path.resolve(__dirname, '..');
const cli = require.resolve('hexo/bin/hexo');

function temporary(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-journal-'));
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('the writing interface fills the scaffold in the chosen timezone and leaves empty notes out of reading', () => {
  temporary(source => {
    const entry = createEntry(source, { now: new Date('2026-10-22T18:01:00Z') });
    assert.equal(entry.date, '2026-10-23 02:01');
    assert.equal(entry.title, '');
    assert.equal(path.basename(entry.path), '2026-10-23-0201.md');
    assert.match(entry.content, /# date：/);
    assert.match(entry.content, /# published：/);
    assert.equal(readJournal(source, { render: text => text }).count, 0);
    const second = createEntry(source, { now: new Date('2026-10-22T18:01:00Z'), timeZone: 'America/Los_Angeles' });
    assert.equal(second.date, '2026-10-22 11:01');
  });
});

test('creation preserves authored Markdown, safely quotes titles, keeps date precision and never overwrites an entry', () => {
  temporary(source => {
    const content = '# 一点想法\n\n第一段：**原文**。\n\n- 第二段\n';
    const options = { date: '2026-09-22', title: '../日记："风和雨"', content };
    const entry = createEntry(source, options);
    const duplicate = createEntry(source, options);
    assert.notEqual(entry.path, duplicate.path);
    assert.equal(path.dirname(entry.path), path.join(source, '_journal'));
    assert.equal(fs.readFileSync(entry.path, 'utf8'), entry.content);
    assert.ok(entry.content.endsWith(content));
    const journal = readJournal(source, { render: text => text });
    assert.equal(journal.count, 2);
    assert.equal(journal.months[0].days[0].entries[0].time, '');
    assert.equal(journal.months[0].days[0].entries[0].title, options.title);
    const seconds = createEntry(source, { date: '2026-09-22 21:01:32', content: '带秒的原始记录。' });
    assert.equal(seconds.date, '2026-09-22 21:01:32');
    assert.throws(() => createEntry(source, { date: '2026-02-29', content: '无效日期' }), /有效日期/);
    assert.equal(fs.readdirSync(path.join(source, '_journal')).length, 3);
  });
});

test('drafts stay out of production reading and preview examples are explicit and separate', () => {
  temporary(source => {
    createEntry(source, { date: '2026-10-23', draft: true, content: '未公开正文。' });
    const production = readJournal(source, { render: text => text });
    assert.equal(production.count, 0);
    assert.equal(production.demo, false);
    const preview = readJournal(source, { render: text => text, preview: true });
    assert.equal(preview.demo, true);
    assert.ok(!JSON.stringify(preview).includes('未公开正文'));
    createEntry(source, { date: '2026-10-23', content: '公开正文。' });
    const real = readJournal(source, { render: text => text, preview: true });
    assert.equal(real.demo, false);
    assert.equal(real.count, 1);
  });
});

test('real Hexo and npm commands create journals, accept inline and piped Markdown, and preserve normal post/page/draft creation', () => {
  temporary(root => {
    for (const name of ['package.json', '_config.yml', '_config.hexo-theme-kira.yml']) fs.copyFileSync(path.join(project, name), path.join(root, name));
    for (const name of ['node_modules', 'themes', 'scripts', 'tools', 'components']) fs.symlinkSync(path.join(project, name), path.join(root, name), 'dir');
    fs.cpSync(path.join(project, 'scaffolds'), path.join(root, 'scaffolds'), { recursive: true });
    fs.mkdirSync(path.join(root, 'source'));
    const run = (args, input) => execFileSync(process.execPath, [cli, ...args], { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    run(['journal']);
    const multiline = '第一行：**文字**。\n\n第二行。\n';
    run(['new', 'journal', '散步之后', '--date', '2026-09-22', '--content', multiline]);
    run(['new', 'diary', '睡前日记', '--date', '2026-09-17 21:01', '--draft', '--stdin'], '只留给自己的多行正文。\n\n下一段。\n');
    const source = path.join(root, 'source');
    assert.equal(fs.existsSync(path.join(source, '_posts')), false, 'Journals must not become article stars');
    let journal = readJournal(source, { render: text => text });
    assert.equal(journal.count, 1);
    assert.equal(journal.months[0].days[0].entries[0].html, multiline.trim());
    assert.equal(journal.months[0].days[0].entries[0].title, '散步之后');
    assert.equal(journal.months[0].days[0].entries[0].time, '');
    const files = fs.readdirSync(path.join(source, '_journal'));
    const draft = fs.readFileSync(path.join(source, '_journal', files.find(file => file.includes('睡前日记'))), 'utf8');
    assert.match(draft, /published: false/);
    assert.ok(draft.endsWith('只留给自己的多行正文。\n\n下一段。\n'));
    execFileSync('npm', ['run', 'diary', '--', '--date', '2026-10-23 12:30', '--content', '从简单入口写入。'], { cwd: root, stdio: 'pipe' });
    journal = readJournal(source, { render: text => text });
    assert.equal(journal.count, 2);
    const before = fs.readdirSync(path.join(source, '_journal'));
    assert.throws(() => run(['journal', '--date', '2026-02-29']), /Command failed/);
    assert.throws(() => run(['journal', '--unknown', '内容']), /Command failed/);
    assert.deepEqual(fs.readdirSync(path.join(source, '_journal')), before);
    run(['new', 'post', '普通文章']);
    run(['new', 'page', '普通页面']);
    run(['new', 'draft', '文章草稿']);
    assert.ok(fs.existsSync(path.join(source, '_posts/普通文章.md')));
    assert.ok(fs.existsSync(path.join(source, '普通页面/index.md')));
    assert.ok(fs.existsSync(path.join(source, '_drafts/文章草稿.md')));
    assert.match(fs.readFileSync(path.join(source, '_posts/普通文章.md'), 'utf8'), /# starry_excerpt：/);
    assert.match(run(['help', 'journal']), /--content/);
  });
});
