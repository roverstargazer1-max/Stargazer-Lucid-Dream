export function revealArticleFragment(scroller, hash) {
  if (!hash) return;
  let id;
  try { id = decodeURIComponent(hash.slice(1)); }
  catch { return; }
  const target = [...scroller.querySelectorAll('#reader-content [id]')].find(node => node.id === id);
  if (!target) return;
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
}

export function createPageIdentity(document) {
  const { siteTitle, blogCurrentRoot, starryRoot } = document.body.dataset;
  const canonical = document.querySelector('link[rel="canonical"]');
  const home = { title: siteTitle, url: new URL(blogCurrentRoot ? '/' : starryRoot, canonical.href).href };
  const collection = { title: document.title, url: canonical.href };
  let displayed;
  return function syncPageIdentity(article, collectionOpen) {
    const page = article || (collectionOpen ? collection : home);
    if (page === displayed) return;
    displayed = page;
    document.title = article ? `${article.title} · ${home.title}` : page.title;
    canonical.href = article ? new URL(article.path, home.url).href : page.url;
  };
}
