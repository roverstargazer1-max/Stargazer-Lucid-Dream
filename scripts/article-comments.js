const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(hexo.base_dir, 'components/comments');
hexo.extend.helper.register('blog_comment_thread', () => fs.readFileSync(path.join(folder, 'thread.html'), 'utf8'));
hexo.extend.helper.register('blog_comment_api', () => {
  if (hexo.config.blog_comments_preview) return '/__preview/api/comment';
  const server = hexo.config.blog?.comments_server;
  return server ? server.replace(/\/+$/, '') + '/api/comment' : '';
});
hexo.extend.generator.register('blog-comment-assets', () => [
  { path: 'js/article-comments.js', data: fs.readFileSync(path.join(folder, 'thread.js'), 'utf8') },
  { path: 'css/article-comments.css', data: fs.readFileSync(path.join(folder, 'thread.css'), 'utf8') },
]);
