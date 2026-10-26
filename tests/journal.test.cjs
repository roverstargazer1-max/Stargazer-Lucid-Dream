const test = require('node:test');
const assert = require('node:assert/strict');
const { journalDate, buildJournal } = require('../components/journal/index.cjs');
const options = { render: text => `<p>${text}</p>` };
const note = (name, date, body = '一则手记', extra = '') => ({ name, text: `---\ndate: ${date}\n${extra}---\n${body}` });

test('handwritten dates retain their precision, including midnight and leap days', () => {
  assert.deepEqual(journalDate('2026-09-22', 'note.md'), { date: '2026-09-22', time: '', order: '' });
  assert.deepEqual(journalDate('2026-08-05 00:14', 'note.md'), { date: '2026-08-05', time: '00:14', order: '00:14:00' });
  assert.equal(journalDate('2024-02-29 23:59:59', 'note.md').date, '2024-02-29');
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-00-12', '2026-09-22 24:00', '2026-09-22 01:60', '2026-09-22T00:00Z']) {
    assert.throws(() => journalDate(invalid, 'invalid.md'), /invalid.md/);
  }
});

test('months and days run newest first while entries on the same day retain clock order', () => {
  const files = [note('afternoon.md', '2026-08-25 13:58'), note('september.md', '2026-09-22'), note('night.md', '2026-08-25 02:40'), note('old.md', '2025-12-31')];
  const model = buildJournal(files, options);
  assert.deepEqual(model.months.map(month => month.key), ['2026-09', '2026-08', '2025-12']);
  assert.deepEqual(model.months[1].days[0].entries.map(entry => entry.time), ['02:40', '13:58']);
  assert.equal(model.months[0].days[0].entries[0].time, '');
  assert.equal(model.months[0].days[0].entries[0].title, '');
  assert.equal(model.count, 4);
  const reordered = buildJournal(files.reverse(), options);
  assert.deepEqual(reordered, model, 'File enumeration cannot reorder entries or change independent links');
});

test('unpublished writing is discarded before date validation or rendering, and empty writing is omitted', () => {
  const rendered = [];
  const model = buildJournal([
    note('public.md', '2026-10-23', '公开的文字'),
    note('private.md', '不必公开的日期', '私密正文', 'published: false\n'),
    note('empty.md', '2026-10-24', '   '),
  ], { ...options, render: text => { rendered.push(text); return text; } });
  assert.equal(model.count, 1);
  assert.deepEqual(rendered, ['公开的文字']);
  assert.ok(!JSON.stringify(model).includes('私密正文'));
  assert.throws(() => buildJournal([{ name: 'missing.md', text: '没有日期的正文' }], options), /missing.md/);
  assert.throws(() => buildJournal([note('quoted.md', '2026-10-23', '正文', 'published: "false"\n')], options), /不要加引号/);
});
