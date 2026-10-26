const { normalizeArticleRelations } = require('../lib/relations');
const { normalizeStar } = require('../lib/star');
const { articleTimeOrder } = require('../lib/article-order');
const { readCatalogueNumbers, makeDisplayId } = require('../lib/catalogue');
const { load } = require('cheerio');

hexo.extend.generator.register('starry-article-index', function (locals) {

  const layout = hexo.locals?.get('starry_layout') || (locals.data || hexo.locals.get('data') || {})['starry-layout'];
  const savedArticles = layout?.articles;
  if (layout?.version !== 2 || !savedArticles || typeof savedArticles !== 'object' || Array.isArray(savedArticles)) {
    throw new Error('Starfield layout is not prepared. Run `hexo generate` to prepare the site layout.');
  }
  const { catalogue } = readCatalogueNumbers(savedArticles);

  const articles = [];
  const ids = new Set();
  const paths = new Map();
  locals.posts.each((post) => {
    if (post.published === false) return;
    const id = String(post.starry_id || '');
    if (!id) {
      throw new Error(`Missing starry_id in ${post.source}. Run \`hexo generate\` locally and commit the post changes.`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(`Invalid starry_id "${id}" in ${post.source}.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate starry_id "${id}".`);
    ids.add(id);

    const saved = savedArticles[id];
    if (!saved || !Array.isArray(saved.position) || saved.position.length !== 3 || !saved.position.every(Number.isFinite)) {
      throw new Error(`Missing or invalid saved position for "${id}" in source/_data/starry-layout.json. Run \`hexo generate\` locally and commit the prepared layout.`);
    }
    const path = String(post.path || '').replace(/^\/+/, '');
    const originalPermalink = String(post.starry_original_permalink || '').replace(/^\/+/, '');
    if (!originalPermalink || path !== originalPermalink || saved.originalPermalink !== originalPermalink) {
      throw new Error(`Original permalink for "${id}" is missing or changed in ${post.source}. Run \`hexo generate\` locally.`);
    }
    const duplicatePath = paths.get(path);
    if (duplicatePath) throw new Error(`Duplicate article permalink "${path}" in ${duplicatePath} and ${post.source}.`);
    paths.set(path, post.source);

    const catalogNumber = catalogue.get(id);
    if (!catalogNumber) {
      throw new Error(`Missing catalogNumber for "${id}" in source/_data/starry-layout.json. Run \`hexo generate\` locally and commit the prepared layout.`);
    }
    const star = normalizeStar(post, message => hexo.log.warn(message));
    const tags = (post.tags?.toArray() || []).map(tag => String(tag.name));
    const categories = (post.categories?.toArray() || []).map(category => String(category.name));
    articles.push({
      id,
      catalogNumber,
      displayId: makeDisplayId(catalogNumber, star.magnitude),
      title: String(post.title || ''),
      excerpt: String(post.starry_excerpt || '').trim(),
      tags,
      categories,
      date: post.date.format('YYYY-MM-DD'),
      timeOrder: articleTimeOrder(post),
      path,
      url: String(post.permalink),
      position: saved.position,
      ...star,
      constellation: typeof post.starry_constellation === 'string' ? post.starry_constellation.trim() : '',
    });
  });

  articles.sort((left, right) => left.timeOrder < right.timeOrder ? -1 : left.timeOrder > right.timeOrder ? 1 : 0);
  const archivePeriods = new Map();
  for (const article of articles) {
    const key = article.date.slice(0, 7);
    const period = archivePeriods.get(key) || { key, year: key.slice(0, 4), month: key.slice(5, 7), firstArticleId: article.id, count: 0 };
    period.count += 1;
    archivePeriods.set(key, period);
  }
  const relations = normalizeArticleRelations(
    locals.posts.toArray(),
    (message) => hexo.log.warn(message),
  );
  const configuredFeatured = hexo.theme.config.featured_article_id;
  const featuredArticleId = articles.some((article) => article.id === configuredFeatured)
    ? configuredFeatured
    : (articles[0]?.id || '');

  return {
    path: 'starry/index.json',
    data: JSON.stringify({ version: 2, featuredArticleId, articles, archivePeriods: [...archivePeriods.values()], relations }),
  };
});

hexo.extend.generator.register('starry-search-index', function (locals) {
  const documents = locals.posts.toArray().filter(post => post.published !== false).map(post => {
    const searchable = load(String(post.content || ''), null, false);
    searchable('script, style').remove();
    return { id: String(post.starry_id), text: searchable.root().text().replace(/\s+/g, ' ').trim() };
  });
  return {
    path: 'starry/search.json',
    data: JSON.stringify({ version: 1, documents }),
  };
});

hexo.extend.generator.register('starry-empty-home', function (locals) {
  if (locals.posts.toArray().length > 0) return [];
  return { path: 'index.html', data: '', layout: ['index'] };
});
