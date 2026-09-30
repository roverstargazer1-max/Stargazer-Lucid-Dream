const { normalizeAdoptedRelations } = require('../lib/relations');

hexo.extend.generator.register('starry-article-index', function (locals) {
  if (hexo.config.theme !== 'stargazer-starfield') return [];

  const layout = (locals.data || hexo.locals.get('data') || {})['starry-layout'];
  const savedArticles = layout?.articles;
  if (layout?.version !== 2 || !savedArticles || typeof savedArticles !== 'object' || Array.isArray(savedArticles)) {
    throw new Error('Starfield layout is not prepared. Run `npm run prepare:starfield` locally and commit source/_data/starry-layout.json.');
  }

  const articles = [];
  const ids = new Set();
  const paths = new Map();
  locals.posts.each((post) => {
    if (post.published === false) return;
    const id = String(post.starry_id || '');
    if (!id) {
      throw new Error(`Missing starry_id in ${post.source}. Run \`npm run prepare:starfield\` locally and commit the post changes.`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(`Invalid starry_id "${id}" in ${post.source}.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate starry_id "${id}".`);
    ids.add(id);

    const saved = savedArticles[id];
    if (!saved || !Array.isArray(saved.position) || saved.position.length !== 3 || !saved.position.every(Number.isFinite)) {
      throw new Error(`Missing or invalid saved position for "${id}" in source/_data/starry-layout.json. Run \`npm run prepare:starfield\` locally and commit the prepared layout.`);
    }
    const path = String(post.path || '').replace(/^\/+/, '');
    const originalPermalink = String(post.starry_original_permalink || '').replace(/^\/+/, '');
    if (!originalPermalink || path !== originalPermalink || saved.originalPermalink !== originalPermalink) {
      throw new Error(`Original permalink for "${id}" is missing or changed in ${post.source}. Run \`npm run prepare:starfield\` locally.`);
    }
    const duplicatePath = paths.get(path);
    if (duplicatePath) throw new Error(`Duplicate article permalink "${path}" in ${duplicatePath} and ${post.source}.`);
    paths.set(path, post.source);

    const dateKey = post.date.format('YYYY-MM-DDTHH:mm:ss');
    articles.push({
      id,
      title: String(post.title || ''),
      excerpt: String(post.starry_excerpt || '').trim(),
      date: post.date.format('YYYY-MM-DD'),
      timeOrder: `${dateKey}|${id}`,
      path,
      url: String(post.permalink),
      position: saved.position,
      importance: saved.importance || 'ordinary',
      constellation: typeof post.starry_constellation === 'string' ? post.starry_constellation.trim() : '',
    });
  });

  articles.sort((left, right) => left.timeOrder < right.timeOrder ? -1 : left.timeOrder > right.timeOrder ? 1 : 0);
  const relations = normalizeAdoptedRelations(
    (locals.data || hexo.locals.get('data') || {})['starry-relations'],
    new Set(articles.map((article) => article.id)),
    (message) => hexo.log.warn(message),
  );
  const configuredFeatured = hexo.theme.config.featured_article_id;
  const featuredArticleId = articles.some((article) => article.id === configuredFeatured)
    ? configuredFeatured
    : (articles[0]?.id || '');

  return {
    path: 'starry/index.json',
    data: JSON.stringify({ version: 2, featuredArticleId, articles, relations }),
  };
});

hexo.extend.generator.register('starry-empty-home', function (locals) {
  if (hexo.config.theme !== 'stargazer-starfield' || locals.posts.toArray().length > 0) return [];
  return { path: 'index.html', data: '', layout: ['index'] };
});
