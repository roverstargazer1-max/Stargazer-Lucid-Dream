const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Hexo = require('hexo');

const frontMatterPath = require.resolve('hexo-front-matter', {
  paths: [path.dirname(require.resolve('hexo'))],
});
const { parse } = require(frontMatterPath);
const ID_PATTERN = /^article-[a-f0-9-]{36}$|^[a-z0-9][a-z0-9-]*$/;
const MINIMUM_SPACING = 900;

async function main() {
  const root = process.cwd();
  // Read posts through the original theme, which also owns the existing tag syntax.
  const hexo = new Hexo(root, { silent: true, config: '_config.yml,_config.legacy-preview.yml' });
  await hexo.init();

  let posts;
  try {
    await hexo.load();
    posts = hexo.locals.get('posts').toArray();
  } finally {
    await hexo.exit();
  }

  const layoutPath = path.join(root, 'source', '_data', 'starry-layout.json');
  const layout = readLayout(layoutPath);
  const savedArticles = layout.articles;
  const claimedIds = new Set();
  const claimedPaths = new Map();
  const pendingFiles = [];
  const active = [];
  for (const [id, record] of Object.entries(savedArticles)) {
    if (record.originalPermalink) claimedPaths.set(normalizePermalink(record.originalPermalink, `source/_data/starry-layout.json (${id})`), id);
  }

  for (const post of posts) {
    if (post.published === false) continue;

    const absolutePath = path.join(hexo.source_dir, post.source);
    const originalText = fs.readFileSync(absolutePath, 'utf8');
    const frontMatter = parse(originalText.replace(/\r\n/g, '\n'));
    if (!frontMatter || typeof frontMatter !== 'object' || typeof frontMatter._content !== 'string') {
      throw new Error(`Could not read YAML front-matter and body in ${post.source}.`);
    }

    let id = frontMatter.starry_id == null ? '' : String(frontMatter.starry_id).trim();
    // A clean Netlify checkout must assign the same identity as a local build.
    if (!id) id = `article-${crypto.createHash('sha256').update(post.source).digest('hex').slice(0, 32)}`;
    if (!ID_PATTERN.test(id)) {
      throw new Error(`Invalid starry_id "${id}" in ${post.source}; use a saved lowercase ID.`);
    }
    if (claimedIds.has(id)) throw new Error(`Duplicate starry_id "${id}" in ${post.source}.`);
    claimedIds.add(id);

    const record = savedArticles[id];
    if (record && !isPosition(record.position)) {
      throw new Error(`Invalid saved position for "${id}" in source/_data/starry-layout.json.`);
    }
    if (!record && frontMatter.starry_original_permalink) {
      throw new Error(`Saved layout entry for "${id}" is missing; restore it before preparing ${post.source}.`);
    }

    const originalPermalink = normalizePermalink(record?.originalPermalink || frontMatter.starry_original_permalink || post.path, post.source);
    const duplicate = claimedPaths.get(originalPermalink);
    if (duplicate && duplicate !== id) {
      throw new Error(`Duplicate original permalink "${originalPermalink}" in ${duplicate} and ${post.source}.`);
    }
    claimedPaths.set(originalPermalink, id);

    const savedPermalink = normalizePermalink(post.path, post.source);
    if (savedPermalink !== originalPermalink) {
      frontMatter.permalink = originalPermalink;
    }

    const hasManualExcerpt = typeof frontMatter.starry_excerpt === 'string' && !frontMatter.starry_excerpt_generated;
    const excerpt = hasManualExcerpt
      ? frontMatter.starry_excerpt.trim()
      : makeExcerpt(frontMatter._content, String(post.title || ''));

    active.push({
      id,
      post,
      absolutePath,
      originalText,
      frontMatter,
      originalPermalink,
      excerpt,
      existingRecord: record,
    });
  }

  active.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const occupied = Object.values(savedArticles)
    .map((record) => record?.position)
    .filter(isPosition);

  for (const entry of active) {
    const position = entry.existingRecord?.position || choosePosition(entry.id, occupied);
    if (!entry.existingRecord) occupied.push(position);

    const fields = {
      starry_id: entry.id,
      starry_original_permalink: entry.originalPermalink,
      permalink: entry.originalPermalink,
      starry_excerpt: entry.excerpt,
    };
    if (!entry.frontMatter.starry_excerpt_generated && typeof entry.frontMatter.starry_excerpt === 'string') {
      delete fields.starry_excerpt;
    } else {
      fields.starry_excerpt_generated = true;
    }

    const updatedText = upsertFrontMatter(entry.originalText, fields, entry.post.source);
    if (updatedText !== entry.originalText) pendingFiles.push([entry.absolutePath, updatedText]);

    savedArticles[entry.id] = {
      ...(entry.existingRecord || {}),
      position,
      originalPermalink: entry.originalPermalink,
      importance: entry.existingRecord?.importance || 'ordinary',
    };
  }

  const nextLayout = {
    ...layout,
    version: 2,
    articles: Object.fromEntries(Object.entries(savedArticles).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
  };
  const serializedLayout = `${JSON.stringify(nextLayout, null, 2)}\n`;
  const previousLayout = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : '';

  for (const [filePath, contents] of pendingFiles) writeAtomically(filePath, contents);
  if (serializedLayout !== previousLayout) writeAtomically(layoutPath, serializedLayout);

  console.log(`Prepared ${active.length} published article(s); ${pendingFiles.length} post file(s) updated.`);
  console.log(`Stable IDs, original permalinks, excerpts, and positions are saved in source/_posts and ${path.relative(root, layoutPath)}.`);
}

function readLayout(layoutPath) {
  if (!fs.existsSync(layoutPath)) return { version: 2, articles: {} };
  let layout;
  try {
    layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse ${path.relative(process.cwd(), layoutPath)}: ${error.message}`);
  }
  if (![1, 2].includes(layout.version) || !layout.articles || typeof layout.articles !== 'object' || Array.isArray(layout.articles)) {
    throw new Error(`Unsupported starry layout in ${path.relative(process.cwd(), layoutPath)}; expected version 1 or 2 with an articles map.`);
  }
  const savedPaths = new Map();
  for (const [id, record] of Object.entries(layout.articles)) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || !isPosition(record.position)) {
      throw new Error(`Invalid saved position for "${id}" in source/_data/starry-layout.json.`);
    }
    if (layout.version === 2) {
      const permalink = normalizePermalink(record.originalPermalink, `source/_data/starry-layout.json (${id})`);
      const duplicate = savedPaths.get(permalink);
      if (duplicate) throw new Error(`Duplicate original permalink "${permalink}" in saved articles "${duplicate}" and "${id}".`);
      savedPaths.set(permalink, id);
    }
  }
  return layout;
}

function normalizePermalink(value, source) {
  let permalink = String(value || '').trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(permalink)) {
    try {
      permalink = new URL(permalink).pathname;
    } catch {
      throw new Error(`Invalid original permalink in ${source}.`);
    }
  }
  if (!permalink || permalink.includes('?') || permalink.includes('#') || permalink.includes('\\')) {
    throw new Error(`Invalid original permalink "${permalink}" in ${source}.`);
  }
  const segments = permalink.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Invalid original permalink "${permalink}" in ${source}.`);
  }
  return `${segments.join('/')}/`;
}

function isPosition(value) {
  return Array.isArray(value) && value.length === 3 && value.every((number) => Number.isFinite(number) && Math.abs(number) <= 20000);
}

function choosePosition(id, occupied) {
  let best = null;
  let bestDistance = -1;
  for (let attempt = 0; attempt < 256; attempt++) {
    const bytes = crypto.createHash('sha256').update(`${id}:${attempt}`).digest();
    const angle = bytes.readUInt32BE(0) / 0xffffffff * Math.PI * 2;
    const height = 0.12 + bytes.readUInt32BE(4) / 0xffffffff * 0.66;
    const radius = 5200 + bytes.readUInt32BE(8) / 0xffffffff * 2300;
    const horizontal = Math.sqrt(1 - height * height) * radius;
    const candidate = [
      Math.round(Math.cos(angle) * horizontal),
      Math.round(height * radius),
      Math.round(Math.sin(angle) * horizontal),
    ];
    const nearest = occupied.length ? Math.min(...occupied.map((point) => distance(candidate, point))) : Infinity;
    if (nearest > bestDistance) {
      best = candidate;
      bestDistance = nearest;
    }
    if (nearest >= MINIMUM_SPACING) return candidate;
  }
  return best;
}

function distance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function makeExcerpt(markdown, title) {
  let text = String(markdown || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/<\s*(meting-js|aplayer|iframe|audio|video|script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*(meting-js|aplayer|iframe|audio|video)\b[^>]*\/?>/gi, ' ')
    .replace(/\{%[\s\S]*?%\}/g, ' ')
    .replace(/^[ \t]*>+[ \t]?/gm, ' ')
    .replace(/^([^\n]+)\n[ \t]*(?:=+|-{3,})[ \t]*$/gm, ' ')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+.*$/gm, ' ')
    .replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, ' ')
    .replace(/^[ \t]*\[?\^[^\]]+\]?[ \t]*:[ \t]*.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
    .replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/gm, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~>#|]/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (title && text.startsWith(title)) text = text.slice(title.length).trim();
  if (text.length > 180) text = `${text.slice(0, 179).trimEnd()}…`;
  return text;
}

function upsertFrontMatter(source, fields, postSource) {
  const normalizedSource = source.replace(/\r+\n/g, '\r\n');
  const hasBom = normalizedSource.charCodeAt(0) === 0xfeff;
  const eol = normalizedSource.includes('\r\n') ? '\r\n' : '\n';
  const lines = (hasBom ? normalizedSource.slice(1) : normalizedSource).split(/\r+\n|\n/);
  if (lines[0]?.trim() !== '---') throw new Error(`Expected YAML front-matter in ${postSource}.`);
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) throw new Error(`Could not find the end of YAML front-matter in ${postSource}.`);

  const existing = parse(normalizedSource.replace(/\r\n/g, '\n'));
  let frontMatterLines = lines.slice(1, closingIndex);
  const bodyLines = lines.slice(closingIndex + 1);
  const additions = [];
  for (const [key, value] of Object.entries(fields)) {
    if (existing[key] === value) continue;
    const line = `${key}: ${JSON.stringify(value)}`;
    const keyPattern = new RegExp(`^\\s*${key}\\s*:`);
    frontMatterLines = frontMatterLines.filter((item) => !keyPattern.test(item));
    additions.push(line);
  }
  if (!additions.length) return normalizedSource;
  return `${hasBom ? '\uFEFF' : ''}${['---', ...frontMatterLines, ...additions, '---', ...bodyLines].join(eol)}`;
}

function writeAtomically(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.starfield-tmp`;
  fs.writeFileSync(temporaryPath, contents, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

main().catch((error) => {
  console.error(`Starfield preparation failed: ${error.message}`);
  process.exitCode = 1;
});
