const fs = require('node:fs');
const path = require('node:path');

const headerPattern = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;

function fieldComments(scaffold) {
  const comments = new Map();
  const header = scaffold.match(headerPattern)?.[2] || '';
  let pending = [];
  for (const line of header.split(/\r?\n/)) {
    if (line.startsWith('#')) {
      pending.push(line);
    } else if (!line.trim()) {
      if (pending.length) pending.push(line);
    } else {
      const key = line.match(/^([\w-]+)\s*:/)?.[1];
      if (key && pending.length) comments.set(key, pending);
      pending = [];
    }
  }
  return comments;
}

// Hexo serializes scaffold YAML and drops its comments before emitting `new`.
// Restore only author notes from the scaffold, leaving generated values/body intact.
hexo.on('new', post => {
  const relative = path.relative(path.join(hexo.source_dir, '_posts'), post.path);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return;
  if (path.extname(post.path) !== '.md') return;

  const scaffold = fs.readFileSync(path.join(hexo.base_dir, 'scaffolds/post.md'), 'utf8');
  const comments = fieldComments(scaffold);
  const eol = post.content.includes('\r\n') ? '\r\n' : '\n';
  const content = post.content.replace(headerPattern, (_, opening, header, closing) => {
    const annotated = header.split(/\r?\n/).flatMap(line => {
      const key = line.match(/^([\w-]+)\s*:/)?.[1];
      return [...(comments.get(key) || []), line];
    });
    return opening + annotated.join(eol) + closing;
  });
  if (content === post.content) return;
  // Event listeners are synchronous; finish writing before the CLI reports success.
  fs.writeFileSync(post.path, content, 'utf8');
  post.content = content;
});
