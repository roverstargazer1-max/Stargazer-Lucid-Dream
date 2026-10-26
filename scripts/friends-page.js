hexo.extend.generator.register('starry-friends-page', function (locals) {
  // A site-provided page may use the same template without creating duplicates.
  if (locals.pages.toArray().some(page => page.path === 'pages/friends/index.html')) return [];
  return { path: 'pages/friends/index.html', layout: 'friends', data: { layout: 'friends', title: '友链' } };
});
