const fs = require('node:fs');
const path = require('node:path');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { load } = require(resolveHexo('cheerio'));
const { url_for } = require('hexo-util');
const pageRoute = page => String(page.current_url || page.path || '')
  .replace(/^\/+/, '').replace(/(?:^|\/)index\.html$/, '/').replace(/^\/+/, '');

// Normalize the original image-folder convention once for both renderers.
hexo.extend.filter.register('after_post_render', function (post) {
  const $ = load(String(post.content || ''), null, false);
  $('[src], [href], [poster], [data-src]').each((_, element) => {
    for (const attribute of ['src', 'href', 'poster', 'data-src']) {
      const value = $(element).attr(attribute);
      if (!value || !/^\/?(?:\.\.?\/)*image\//.test(value)) continue;
      const relative = value.replace(/^\/?(?:\.\.?\/)*image\//, 'image/');
      if (fs.existsSync(path.join(hexo.source_dir, relative.split(/[?#]/)[0]))) {
        $(element).attr(attribute, url_for.call(hexo, relative));
      }
    }
  });
  post.content = $.html();
  return post;
});

hexo.extend.helper.register('blog_theme_switch', function (page) {
  if (!hexo.config.dual_theme) return null;
  const route = pageRoute(page);
  return {
    href: `${hexo.config.dual_theme.target_root}${route}`,
    label: hexo.config.theme === 'stargazer-starfield' ? '旧版' : '新版',
  };
});

hexo.extend.helper.register('blog_canonical', function (page) {
  const route = pageRoute(page);
  return new URL(`/${route}`, hexo.config.url).href;
});

hexo.extend.generator.register('blog-theme-switch-assets', function () {
  if (!hexo.config.dual_theme) return [];
  return ['css/blog-theme-switch.css', 'js/blog-theme-switch.js'].map(name => ({
    path: name,
    data: fs.readFileSync(path.join(hexo.base_dir, 'blog-assets', name)),
  }));
});
