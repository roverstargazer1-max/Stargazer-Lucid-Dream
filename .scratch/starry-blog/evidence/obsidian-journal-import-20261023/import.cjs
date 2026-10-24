const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createEntry, journalDate } = require('../../../../components/journal');

// One-off, explicit import: never edits the vault and never reads retained notes.
const root = path.resolve(__dirname, '../../../..');
const vault = process.argv[2] && path.resolve(process.argv[2]);
assert.ok(vault, 'Pass the Obsidian vault directory.');
const directory = path.join(vault, '日记？小记？');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const names = fs.readdirSync(directory).filter(name => name.endsWith('.md')).sort();
const excluded = names.filter(name => name.includes('留存'));
assert.equal(excluded.length, 1, 'Expected exactly one retained note to exclude.');
const attachments = new Map();
const plan = names.filter(name => !excluded.includes(name)).map(name => {
  const match = name.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\s+(\d{1,2})[·:：](\d{2}))?\.md$/);
  assert.ok(match, `Unrecognized date label: ${name}`);
  const [, year, month, day, hour, minute] = match;
  const original = fs.readFileSync(path.join(directory, name));
  let body = original.toString('utf8');
  let date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  let time = hour === undefined ? '' : `${hour.padStart(2, '0')}:${minute}`;
  let timeLine = '';
  if (!time) {
    const leadingTime = body.match(/^(\d{2}:\d{2})(\r?\n\r?\n)/);
    if (leadingTime) {
      time = leadingTime[1];
      timeLine = leadingTime[0];
      body = body.slice(timeLine.length);
    }
  }
  if (time) date += ` ${time}`;
  journalDate(date, name);
  const embeds = [];
  body = body.replace(/!\[\[([^\]\n]+)\]\]/g, (token, filename) => {
    assert.equal(path.basename(filename), filename);
    const source = path.join(vault, '图片杂项', filename);
    const target = `source/image/journal/${filename}`;
    assert.ok(fs.statSync(source).isFile(), `Missing attachment: ${filename}`);
    attachments.set(filename, { source, target, bytes: fs.readFileSync(source) });
    const replacement = `![](/image/journal/${filename})`;
    embeds.push({ original: token, replacement });
    return replacement;
  });
  // Reverse every allowed presentation change and require exact original bytes.
  let restored = body;
  for (const embed of embeds) restored = restored.replace(embed.replacement, embed.original);
  restored = timeLine + restored;
  assert.ok(Buffer.from(restored).equals(original), `Text changed: ${name}`);
  const basename = date.replace(' ', '-').replace(':', '');
  const target = `source/_journal/${basename}.md`;
  return { name, date, body, timeLine, embeds, original, target };
});

for (const item of [...plan, ...attachments.values()]) {
  assert.equal(fs.existsSync(path.join(root, item.target)), false, `Target already exists: ${item.target}`);
}
const created = [];
try {
  for (const attachment of attachments.values()) {
    const target = path.join(root, attachment.target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, attachment.bytes, { flag: 'wx' });
    created.push(target);
    assert.ok(fs.readFileSync(target).equals(attachment.bytes));
  }
  for (const item of plan) {
    const entry = createEntry(path.join(root, 'source'), { date: item.date, content: item.body });
    created.push(entry.path);
    assert.equal(entry.path, path.join(root, item.target));
    assert.ok(fs.readFileSync(path.join(directory, item.name)).equals(item.original), 'Vault changed during import.');
  }
  const summary = {
    imported: plan.length,
    excluded,
    originalVaultFilesModified: false,
    characterChanges: 0,
    permittedPresentationChanges: ['Two Obsidian image embeds use web image URLs.', 'The standalone 00:47 line is displayed once in the timestamp field.'],
    entries: plan.map(item => ({
      original: item.name, target: item.target, date: item.date,
      originalSha256: hash(item.original), importedSha256: hash(fs.readFileSync(path.join(root, item.target))),
      reversibleBodyVerified: true, timeMovedFromBody: item.timeLine ? item.timeLine.trim() : null,
      imageEmbedsConverted: item.embeds,
    })),
    attachments: [...attachments.values()].map(item => ({ target: item.target, bytes: item.bytes.length, sha256: hash(item.bytes), byteIdentical: true })),
  };
  fs.writeFileSync(path.join(__dirname, 'import-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ imported: summary.imported, excluded, attachments: attachments.size, exactReversibleBodyCheck: 'passed' }));
} catch (error) {
  for (const target of created.reverse()) fs.unlinkSync(target);
  throw error;
}
