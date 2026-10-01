let assetsPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = false;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error('Music player asset unavailable.')); };
    document.head.append(script);
  });
}

async function ensureAssets() {
  const body = document.body;
  if (!document.querySelector('link[data-starry-aplayer-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = body.dataset.starryAplayerStyle; link.dataset.starryAplayerStyle = '';
    document.head.append(link);
  }
  if (!window.APlayer) await loadScript(body.dataset.starryAplayerScript);
  if (!window.loadMeting) await loadScript(body.dataset.starryMetingScript);
}

function showUnavailable(container) {
  container.hidden = true;
  if (container.previousElementSibling?.classList.contains('article-player-status')) return;
  const status = document.createElement('p');
  status.className = 'article-player-status'; status.textContent = '音乐服务暂不可用，正文仍可继续阅读。';
  container.before(status);
}

export async function prepareEmbeddedPlayer(node) {
  if (!node?.querySelector('meting-js, .aplayer[data-id], .aplayer[data-url]')) return;
  try {
    // Cache asset loading, not article initialization: each article owns its player DOM.
    assetsPromise ||= ensureAssets().catch(error => { assetsPromise = null; throw error; });
    await assetsPromise;
    if (!node.isConnected) return;
    for (const player of node.querySelectorAll('meting-js')) {
      const container = document.createElement('div'); container.className = 'aplayer';
      for (const attribute of player.attributes) {
        if (!['autoplay', 'hidden'].includes(attribute.name)) container.setAttribute(`data-${attribute.name}`, attribute.value);
      }
      player.replaceWith(container);
    }
    const containers = [...node.querySelectorAll('.aplayer[data-id], .aplayer[data-url]')];
    for (const container of containers) container.dataset.autoplay = 'false';
    window.loadMeting();
    for (const container of containers) {
      const observer = new MutationObserver(() => {
        if (!container.querySelector('.aplayer-body')) return;
        container.hidden = false;
        if (container.previousElementSibling?.classList.contains('article-player-status')) container.previousElementSibling.remove();
        observer.disconnect();
      });
      observer.observe(container, { childList: true, subtree: true });
      window.setTimeout(() => {
        if (container.querySelector('.aplayer-body')) observer.disconnect();
        else showUnavailable(container);
      }, 8000);
      window.setTimeout(() => observer.disconnect(), 30000);
    }
  } catch (error) {
    console.warn('Music unavailable; article content remains readable.', error);
    for (const container of node.querySelectorAll('meting-js, .aplayer[data-id], .aplayer[data-url]')) showUnavailable(container);
  }
}
