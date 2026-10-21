const crypto = require('node:crypto');
const path = require('node:path');
const { parse } = require(require.resolve('hexo-front-matter', {
  paths: [path.dirname(require.resolve('hexo'))],
}));

const FIELD_COMMENTS = {
  title: '文章标题，可随时修改。',
  date: '发表时间，例如 2026-10-21 12:00:00；影响显示和时间排序。',
  updated: '可选的最后更新时间；不填写时由 Hexo 处理。',
  tags: '标签，例如 [随笔, 生活]；不填保留 []。',
  categories: '分类，例如 [生活, 随笔] 表示逐级分类；不填保留 []。',
  subheading: '旧版列表副标题，可写文字或 HTML；留空不显示。',
  sticky: '旧版置顶权重，数字越大越靠前；不填或 0 不置顶。',
  cover: '旧版封面及新版分享图片，例如 /image/covers/sky.webp；不改变新版正文底图。',
  cover_mobile: '旧版窄屏封面；留空沿用 cover。',
  related: '关联文章的文件名，不含 .md，例如 [随笔1]；自动双向，无关联用 []。',
  star: '新版星空选项；不填写时为普通星，参与探索。',
  'star.rank': '博客星等：ordinary（普通）、important（重要）、treasured（珍藏）。',
  'star.isolated': 'true 不生成自动探索路径或时间连线，手填关联仍保留；默认 false。',
  starry_excerpt: '新版描述摘要：留空自动提取正文，手写优先，清空恢复自动；不控制旧版列表摘要。',
  starry_excerpt_generated: '程序维护的摘要状态，无需手改；true 自动提取，false 手写。',
  starry_id: '内部文章身份，首次预览或构建时自动生成；已有值不要修改。',
  starry_original_permalink: '程序保存的文章原地址，用于保持旧链接；无需手改。',
  permalink: '固定文章地址，由程序与原地址保持一致；无需手改。',
  layout: '页面模板；普通文章使用 post。',
  published: '是否发布，默认 true；false 时不发布。',
  reprinted: '旧版转载标记；true 时隐藏旧版文章版权声明。',
  loyout: '历史字段名拼写，当前不生效；普通文章仍使用默认 post 模板。',
};
const HEADER_PATTERN = /^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;

function excerptHash(value) {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

function resolveExcerpt(frontMatter, record, automaticExcerpt) {
  const written = typeof frontMatter.starry_excerpt === 'string' ? frontMatter.starry_excerpt.trim() : '';
  // Before the first snapshot exists, retain any text that differs from today's
  // extraction. Never guess that a potentially authored description is disposable.
  const previousHash = record?.generatedExcerptHash || excerptHash(automaticExcerpt);
  const generated = !written || (frontMatter.starry_excerpt_generated === true && excerptHash(written) === previousHash);
  return { excerpt: generated ? automaticExcerpt : written, generated };
}

// Change a complete YAML field (including a block scalar or list), rather than
// reserializing the header and losing the author's comments and formatting.
function upsertFrontMatter(source, fields, postSource) {
  const header = source.match(HEADER_PATTERN);
  if (!header) throw new Error(`Expected YAML front-matter in ${postSource}.`);
  const existing = parse(source.replace(/\r\n/g, '\n'));
  const eol = header[1].endsWith('\r\n') ? '\r\n' : '\n';
  const lines = header[2].split(/\r?\n/);
  for (const [key, value] of Object.entries(fields)) {
    if (existing[key] === value) continue;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^(?:${escapedKey}|"${escapedKey}"|'${escapedKey}')\\s*:`);
    const start = lines.findIndex(line => pattern.test(line));
    const replacement = `${key}: ${JSON.stringify(value)}`;
    if (start < 0) {
      if (value !== undefined) lines.push(replacement);
      continue;
    }
    let end = start + 1;
    while (end < lines.length && !/^[^\s#]/.test(lines[end])) end++;
    // Trailing comments/blank lines belong to the following field, not this value.
    let valueEnd = end;
    while (valueEnd > start + 1 && /^(?:#.*|\s*)$/.test(lines[valueEnd - 1])) valueEnd--;
    lines.splice(start, valueEnd - start, ...(value === undefined ? [] : [replacement]));
  }
  return header[1] + lines.join(eol) + header[3] + source.slice(header[0].length);
}

function annotateFrontMatter(source, postSource) {
  // Remove the former catch-all hint properties; explanations belong to comments.
  source = upsertFrontMatter(source, { 写作提示: undefined, 自动字段: undefined, 字段速查: undefined }, postSource);
  const header = source.match(HEADER_PATTERN);
  const eol = header[1].endsWith('\r\n') ? '\r\n' : '\n';
  const values = parse(source.replace(/\r\n/g, '\n'));
  let parent;
  let scalarIndent = null;
  const annotated = [];
  for (const line of header[2].split(/\r?\n/)) {
    const indentation = line.match(/^ */)[0].length;
    // A comment-looking line inside `|` or `>` is string content, not a note.
    if (scalarIndent !== null) {
      if (!line.trim() || indentation > scalarIndent) {
        annotated.push(line);
        continue;
      }
      scalarIndent = null;
    }
    const managedKey = line.match(/^\s*# ([\w.]+)：/)?.[1];
    if ((managedKey && Object.hasOwn(FIELD_COMMENTS, managedKey))
      || /^# (?:以下三项仅在编辑器属性面板中提示|仅在编辑器属性面板显示的写作提示)/.test(line)) continue;

    const topLevel = line.match(/^(?:([\p{L}\p{N}_-]+)|"([^"]+)"|'([^']+)')\s*:/u);
    let key;
    let indent = '';
    if (topLevel) {
      parent = topLevel[1] || topLevel[2] || topLevel[3];
      key = parent;
    } else if (parent === 'star' && values.star && typeof values.star === 'object' && !Array.isArray(values.star)) {
      const child = line.match(/^( {2})(rank|isolated)\s*:/);
      if (child) { key = `star.${child[2]}`; indent = child[1]; }
    }
    if (key && Object.hasOwn(FIELD_COMMENTS, key)) annotated.push(`${indent}# ${key}：${FIELD_COMMENTS[key]}`);
    annotated.push(line);
    if (/^\s*[^#].*:\s*[|>](?:[+-][1-9]?|[1-9][+-]?)?\s*(?:#.*)?$/.test(line)) scalarIndent = indentation;
  }
  return header[1] + annotated.join(eol) + header[3] + source.slice(header[0].length);
}

module.exports = { FIELD_COMMENTS, annotateFrontMatter, excerptHash, resolveExcerpt, upsertFrontMatter };
