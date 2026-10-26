const fs = require('node:fs');
const path = require('node:path');
const { annotateFrontMatter } = require('../lib/article-authoring.cjs');

// Hexo drops scaffold comments when serializing YAML. Restore field notes after
// creation without changing any property values or article body bytes.
hexo.on('new', post => {
  const relative = path.relative(path.join(hexo.source_dir, '_posts'), post.path);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return;
  if (path.extname(post.path) !== '.md') return;

  const content = annotateFrontMatter(post.content, post.path);
  if (content === post.content) return;
  fs.writeFileSync(post.path, content, 'utf8');
  post.content = content;
});
