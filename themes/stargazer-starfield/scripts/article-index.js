hexo.extend.generator.register('starry-article-index', function (locals) {
  if (hexo.config.theme !== 'stargazer-starfield') return [];

  const layout = (locals.data || hexo.locals.get('data') || {})['starry-layout'];
  const savedArticles = layout?.articles;
  if (layout?.version !== 1 || !savedArticles || typeof savedArticles !== 'object') {
    throw new Error('Starfield article layout is missing or has an unsupported version.');
  }

  const articles = [];
  const ids = new Set();
  locals.posts.each((post) => {
    if (!post.starry_id) return;
    const id = String(post.starry_id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(`Invalid starry_id "${id}" in ${post.source}. Use lowercase letters, numbers, and hyphens.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate starry_id "${id}".`);
    ids.add(id);

    const saved = savedArticles[id];
    if (!saved || !Array.isArray(saved.position) || saved.position.length !== 3 || !saved.position.every(Number.isFinite)) {
      throw new Error(`Missing saved star position for "${id}" in source/_data/starry-layout.json.`);
    }
    const excerpt = String(post.starry_excerpt || '').trim();
    if (!excerpt) throw new Error(`Missing starry_excerpt for "${id}" in ${post.source}.`);

    articles.push({
      id,
      title: String(post.title || ''),
      excerpt,
      date: post.date.format('YYYY-MM-DD'),
      path: String(post.path),
      url: String(post.permalink),
      position: saved.position,
      importance: saved.importance || 'ordinary',
    });
  });

  const featuredId = hexo.theme.config.featured_article_id;
  if (!featuredId || !articles.some((article) => article.id === featuredId)) {
    throw new Error(`Featured article "${featuredId || '(unset)'}" is missing from the starfield index.`);
  }

  return {
    path: 'starry/index.json',
    data: JSON.stringify({ version: 1, articles }),
  };
});
