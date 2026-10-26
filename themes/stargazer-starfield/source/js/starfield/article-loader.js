// Share article requests across selection, READ, search and history. A stalled
// connection (including a stalled response body) must leave room for a retry.
export function createArticleLoader({ urlFor, request = fetch, parsePage = parseArticlePage, timeoutMs = 8000 }) {
  const nodes = new Map(), pending = new Map();

  function load(article) {
    if (nodes.has(article.id)) return Promise.resolve(nodes.get(article.id));
    if (pending.has(article.id)) return pending.get(article.id);
    const controller = new AbortController();
    let timer;
    const work = (async () => {
      const response = await request(urlFor(article), { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error(`Article request failed: ${response.status}`);
      return parsePage(await response.text(), article);
    })();
    const deadline = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        const error = new Error('The article request timed out.');
        error.name = 'TimeoutError';
        reject(error);
        controller.abort();
      }, timeoutMs);
    });
    const job = Promise.race([work, deadline]).then(node => {
      nodes.set(article.id, node);
      return node;
    }).finally(() => {
      clearTimeout(timer);
      if (pending.get(article.id) === job) pending.delete(article.id);
    });
    pending.set(article.id, job);
    return job;
  }

  return {
    load,
    // A failed speculative request must not change the user's selected star.
    prefetch(article) { return load(article).catch(() => null); },
    prime(id, node) { nodes.set(id, node); },
  };
}

function parseArticlePage(html, article) {
  const copy = new DOMParser().parseFromString(html, 'text/html');
  if (copy.body.dataset.starryArticleId !== article.id) throw new Error('The article page did not match the starfield index.');
  const node = copy.querySelector(`#static-article-fallback .article[data-starry-id="${CSS.escape(article.id)}"]`);
  if (!node) throw new Error('The static article body is missing.');
  return document.importNode(node, true);
}
