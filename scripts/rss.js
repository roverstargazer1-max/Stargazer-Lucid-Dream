const { load } = require('cheerio');

hexo.extend.generator.register('blog-rss', function (locals) {
  if (this.config.root !== '/') return [];

  const $ = load('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel/></rss>', { xmlMode: true });
  const channel = $('channel');
  const home = new URL('/', this.config.url);
  function field(name, value) {
    // XML 1.0 excludes some characters even when written as numeric references.
    const text = String(value ?? '').replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '');
    return $(`<${name}/>`).text(text);
  }
  channel.append(
    field('title', this.config.title),
    field('link', home.href),
    field('description', this.config.description || this.config.title),
    field('language', this.config.language),
    $('<atom:link/>').attr({ href: new URL('rss.xml', home).href, rel: 'self', type: 'application/rss+xml' }),
  );

  const posts = locals.posts.toArray()
    .filter(post => post.published !== false && !post.draft)
    .sort((left, right) => right.date.valueOf() - left.date.valueOf() || left.path.localeCompare(right.path, 'en'))
    .slice(0, 20);
  for (const post of posts) {
    const permalink = new URL(post.starry_original_permalink || post.path, home).href;
    channel.append($('<item/>').append(
      field('title', post.title),
      field('link', permalink),
      field('guid', permalink).attr('isPermaLink', 'true'),
      field('pubDate', post.date.toDate().toUTCString()),
      field('description', post.starry_excerpt),
    ));
  }
  return { path: 'rss.xml', data: `<?xml version="1.0" encoding="UTF-8"?>\n${$.xml()}\n` };
});
