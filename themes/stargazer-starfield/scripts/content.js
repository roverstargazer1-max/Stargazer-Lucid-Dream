const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
// These parsers are already owned and locked by Hexo's HTML/YAML pipeline.
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { load } = require(resolveHexo('cheerio'));
const yaml = require(resolveHexo('js-yaml'));
const { normalizeArticleRelations } = require('../lib/relations');

hexo.extend.helper.register('starry_content', function (page) {
  const scope = crypto.createHash('sha256').update(String(page.source || page.path)).digest('hex').slice(0, 12);
  const $ = load(String(page.content || ''), null, false);
  $('style').each((_, element) => {
    const style = $(element);
    // Native CSS scoping keeps raw article styles from touching the sky or another article.
    style.text(`@scope ([data-content-scope="${scope}"]) {\n${style.text()}\n}`);
  });
  $('[src], [href]').each((_, element) => {
    for (const attribute of ['src', 'href']) {
      const value = $(element).attr(attribute);
      if (!value || !/^\/?(?:\.\.?\/)*image\//.test(value)) continue;
      const relative = value.replace(/^\/?(?:\.\.?\/)*image\//, 'image/');
      if (fs.existsSync(path.join(hexo.source_dir, relative.split(/[?#]/)[0]))) $(element).attr(attribute, this.url_for(relative));
    }
  });
  return `<div class="article-content" data-content-scope="${scope}">${$.html()}</div>`;
});

hexo.extend.helper.register('starry_legacy_friends', function () {
  const file = path.join(hexo.base_dir, '_config.hexo-theme-kira.yml');
  const config = yaml.load(fs.readFileSync(file, 'utf8'));
  return Array.isArray(config?.friends) ? config.friends : [];
});

hexo.extend.helper.register('starry_related_articles', function (page) {
  const posts = hexo.locals.get('posts').toArray();
  const byId = new Map(posts.map(post => [post.starry_id, post]));
  return normalizeArticleRelations(posts).filter(pair => pair.articles.includes(page.starry_id)).map(pair => ({
    post: byId.get(pair.articles.find(id => id !== page.starry_id)), reason: pair.reason,
  }));
});
