(() => {
  const body = document.body;
  const currentRoot = body.dataset.blogCurrentRoot;
  const targetRoot = body.dataset.blogTargetRoot;
  if (!currentRoot || !targetRoot) return;
  function refresh() {
    const route = location.pathname.startsWith(currentRoot) ? location.pathname.slice(currentRoot.length) : '';
    for (const link of document.querySelectorAll('[data-blog-theme-switch]')) {
      link.href = `${targetRoot}${route}${location.search}${location.hash}`;
    }
  }
  window.blogThemeSwitch = { refresh };
  window.addEventListener('popstate', refresh);
  document.addEventListener('focusin', refresh);
  document.addEventListener('pointerover', refresh);
  document.addEventListener('click', refresh, true);
  refresh();
})();
