const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { buildJournal } = require('../../../../components/journal');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { load } = require(resolveHexo('cheerio'));
const root = path.resolve(__dirname, '../../../..');
const vault = process.argv[2] && path.resolve(process.argv[2]);
assert.ok(vault, 'Pass the original vault directory for comparison.');
const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'import-summary.json')));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalized = value => value.replace(/\s/gu, '');
const expectations = summary.entries.map(item => {
  const original = fs.readFileSync(path.join(vault, '日记？小记？', item.original));
  assert.equal(hash(original), item.originalSha256, 'Original note was modified.');
  const imported = fs.readFileSync(path.join(root, item.target));
  assert.equal(hash(imported), item.importedSha256, 'Imported note was modified.');
  let expectedBody = original.toString('utf8');
  let restoredBody = imported.toString('utf8').match(/\n---\n\n([\s\S]*)$/)[1];
  // createEntry adds one trailing newline when the original has none.
  if (!expectedBody.endsWith('\n')) restoredBody = restoredBody.slice(0, -1);
  for (const embed of item.imageEmbedsConverted) restoredBody = restoredBody.replace(embed.replacement, embed.original);
  if (item.timeMovedFromBody) {
    const prefix = expectedBody.match(/^\d{2}:\d{2}\r?\n\r?\n/)[0];
    restoredBody = prefix + restoredBody;
    expectedBody = expectedBody.slice(prefix.length);
  }
  assert.ok(Buffer.from(restoredBody).equals(original), `Imported prose changed: ${item.original}`);
  for (const embed of item.imageEmbedsConverted) expectedBody = expectedBody.replace(embed.original, '');
  const entry = buildJournal([{ name: path.basename(item.target), text: imported.toString('utf8') }], { render: text => text }).months[0].days[0].entries[0];
  assert.equal(`${entry.date}${entry.time ? ' ' + entry.time : ''}`, item.date);
  return { ...item, id: entry.id, expectedBody, time: entry.time };
});
const outputResults = [];
for (const output of ['.preview/stargazer', 'public']) {
  const $ = load(fs.readFileSync(path.join(root, output, 'journal/index.html'), 'utf8'));
  assert.equal($('.journal-entry').length, expectations.length);
  assert.equal($('.journal-demo, .journal-permalink').length, 0);
  assert.equal($('.journal-month').length, 4);
  assert.equal($('.journal-day').length, 10);
  assert.deepEqual($('.journal-entry').map((_, node) => node.attribs.id).get().sort(), expectations.map(item => item.id).sort());
  for (const item of expectations) {
    const article = $(`#${item.id}`);
    const prose = article.find('.article-content').clone();
    prose.find('[data-journal-image]').remove();
    assert.equal(normalized(prose.text()), normalized(item.expectedBody), `Rendered prose changed: ${item.original}`);
    assert.equal(article.find('.journal-entry-meta time').text(), item.time, `Timestamp differs: ${item.original}`);
    assert.equal(article.find('img').length + article.find('template').contents().find('img').length, item.imageEmbedsConverted.length);
  }
  assert.equal($('.journal-entry-meta time').length, 11);
  assert.equal($('.journal-entry img').length + $('.journal-entry template').contents().find('img').length, 2);
  for (const attachment of summary.attachments) {
    const filename = attachment.target.replace(/^source\//, '');
    assert.equal(hash(fs.readFileSync(path.join(root, output, filename))), attachment.sha256);
  }
  assert.equal(fs.existsSync(path.join(root, output, '_journal')), false, 'Raw authoring files should not be published.');
  outputResults.push({ output, entries: 13, months: 4, days: 10, timestamps: 11, dateOnly: 2, attachments: 2, renderedCharacterComparison: 'passed' });
}
for (const item of summary.attachments) {
  assert.equal(hash(fs.readFileSync(path.join(root, item.target))), item.sha256);
  assert.equal(hash(fs.readFileSync(path.join(vault, '图片杂项', path.basename(item.target)))), item.sha256);
}
const result = { originalAndImportedBodyByteCheck: 'passed', outputs: outputResults, attachmentBytes: 'passed', excludedBodyRead: false };
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
