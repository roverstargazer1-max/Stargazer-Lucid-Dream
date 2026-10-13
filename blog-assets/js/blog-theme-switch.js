(() => {
  const body = document.body;
  const currentRoot = body.dataset.blogCurrentRoot;
  const targetRoot = body.dataset.blogTargetRoot;
  if (!currentRoot || !targetRoot) return;
  let lastAddress = null;
  const address = () => `${location.pathname}${location.search}${location.hash}`;
  function refresh() {
    const route = location.pathname.startsWith(currentRoot) ? location.pathname.slice(currentRoot.length) : '';
    const href = `${targetRoot}${route}${location.search}${location.hash}`;
    for (const link of document.querySelectorAll('[data-blog-theme-switch]')) {
      if (link.getAttribute('href') !== href) link.href = href;
    }
    lastAddress = address();
  }
  // Pointer/focus/click events also catch address changes made by history APIs.
  // Explicit refresh still scans newly inserted or cached article links.
  function refreshIfAddressChanged() { if (address() !== lastAddress) refresh(); }
  window.blogThemeSwitch = { refresh };
  window.addEventListener('popstate', refreshIfAddressChanged);
  document.addEventListener('focusin', refreshIfAddressChanged);
  document.addEventListener('pointerover', refreshIfAddressChanged);
  document.addEventListener('click', refreshIfAddressChanged, true);
  refresh();
})();
