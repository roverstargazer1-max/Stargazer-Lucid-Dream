const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

// Dates are the author's local wall-clock labels. Keep date-only notes date-only;
// converting them through UTC would invent a time and sometimes change the day.
function journalDate(value, source) {
  const match = typeof value === 'string' && value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) throw new Error(`手记 ${source}：date 请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:mm。`);
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number(year) < 1000 || date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day) ||
      (hour !== undefined && (Number(hour) > 23 || Number(minute) > 59 || Number(second || 0) > 59))) {
    throw new Error(`手记 ${source}：date 不是有效日期或时间。`);
  }
  return { date: `${year}-${month}-${day}`, time: hour === undefined ? '' : `${hour}:${minute}`, order: hour === undefined ? '' : `${hour}:${minute}:${second || '00'}` };
}

function parseSource(text, source) {
  const match = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`手记 ${source}：请在文件开头填写包含 date 的 Markdown 头部。`);
  const metadata = yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`手记 ${source}：头部必须是字段列表。`);
  if (metadata.published !== undefined && typeof metadata.published !== 'boolean') throw new Error(`手记 ${source}：published 必须是 true 或 false，不要加引号。`);
  return { metadata, content: match[2] };
}

function buildJournal(files, { render }) {
  const entries = [];
  for (const file of files) {
    const { metadata, content: body } = parseSource(file.text, file.name);
    if (metadata.published === false) continue;
    const content = body.trim();
    if (!content) continue;
    const date = journalDate(metadata.date, file.name);
    entries.push({
      id: `note-${crypto.createHash('sha256').update(file.name).digest('hex').slice(0, 16)}`,
      source: `_journal/${file.name}`,
      ...date,
      title: typeof metadata.title === 'string' ? metadata.title.trim() : '',
      html: render(content),
    });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || a.order.localeCompare(b.order) || a.source.localeCompare(b.source));
  const months = [];
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    let month = months.at(-1);
    if (month?.key !== key) {
      const number = Number(key.slice(5));
      month = { key, year: key.slice(0, 4), name: MONTH_NAMES[number - 1], number: key.slice(5), days: [] };
      months.push(month);
    }
    let day = month.days.at(-1);
    if (day?.key !== entry.date) {
      day = { key: entry.date, number: entry.date.slice(8), entries: [] };
      month.days.push(day);
    }
    day.entries.push(entry);
  }
  return { months, count: entries.length, demo: false };
}

function readJournal(sourceDir, { render }) {
  const directory = path.join(sourceDir, '_journal');
  const files = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true })
    .filter(file => file.isFile() && file.name.endsWith('.md') && file.name.toLowerCase() !== 'readme.md')
    .map(file => ({ name: file.name, text: fs.readFileSync(path.join(directory, file.name), 'utf8') })) : [];
  return buildJournal(files, { render });
}

function localDate(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function createEntry(sourceDir, { title = '', date, content = '', draft = false, timeZone = 'UTC', now = new Date(), scaffoldPath = path.join(__dirname, '../../scaffolds/journal.md') } = {}) {
  if (typeof title !== 'string' || typeof content !== 'string' || typeof draft !== 'boolean') throw new Error('手记的标题和正文必须是文字，draft 必须是 true 或 false。');
  const value = date === undefined ? localDate(now, timeZone) : date;
  const parsedDate = journalDate(value, '新手记');
  const dateLabel = parsedDate.date + (parsedDate.time ? ` ${value.trim().length > 16 ? parsedDate.order : parsedDate.time}` : '');
  const values = { title: title.trim(), date: dateLabel, published: !draft };
  const scaffold = fs.readFileSync(scaffoldPath, 'utf8');
  const filled = scaffold.replace(/\{\{\s*(date|title|published)\s*\}\}/g, (_, key) => JSON.stringify(values[key]));
  const text = `${filled.trimEnd()}\n\n${content}${content.endsWith('\n') ? '' : '\n'}`;
  const checked = parseSource(text, '手记模板').metadata;
  if (Object.keys(values).some(key => checked[key] !== values[key])) throw new Error('手记模板需要保留 date、title、published 对应的 {{ ... }} 占位符。');
  const suffix = [...values.title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[. -]+|[. -]+$/g, '')].slice(0, 36).join('');
  const filename = `${parsedDate.date}${parsedDate.time ? '-' + parsedDate.time.replace(':', '') : ''}${suffix ? '-' + suffix : ''}`;
  const directory = path.join(sourceDir, '_journal');
  fs.mkdirSync(directory, { recursive: true });
  // Exclusive creation handles simultaneous commands and never overwrites writing.
  for (let number = 1; ; number++) {
    const target = path.join(directory, `${filename}${number === 1 ? '' : '-' + number}.md`);
    let descriptor;
    try {
      descriptor = fs.openSync(target, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      continue;
    }
    try { fs.writeFileSync(descriptor, text, 'utf8'); }
    catch (error) {
      fs.closeSync(descriptor);
      fs.unlinkSync(target);
      throw error;
    }
    fs.closeSync(descriptor);
    return { path: target, content: text, date: dateLabel, title: values.title, published: !draft };
  }
}

module.exports = { journalDate, buildJournal, readJournal, createEntry };
