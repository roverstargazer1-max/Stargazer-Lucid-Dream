let assetsPromise = null;
const players = new WeakMap();
const DEFAULT_API = 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r';

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
}

function showUnavailable(container) {
  container.hidden = true;
  if (container.previousElementSibling?.classList.contains('article-player-status')) return;
  const status = document.createElement('p');
  status.className = 'article-player-status'; status.textContent = '音乐服务暂不可用，正文仍可继续阅读。';
  container.before(status);
}

function showPlayer(container) {
  container.hidden = false;
  if (container.previousElementSibling?.classList.contains('article-player-status')) container.previousElementSibling.remove();
}

// Preserve the installed MetingJS 1.2 option contract while initializing only
// this article's containers. Its global loadMeting() destroys every cached player.
function playerOptions(container, music) {
  const defaults = {
    container, audio: music, mini: null, fixed: null, autoplay: false, mutex: true,
    lrcType: music[0].lrc ? 3 : 0, listFolded: false, preload: 'auto', theme: '#2980b9',
    loop: 'all', order: 'list', volume: null, listMaxHeight: null,
    customAudioType: null, storageName: 'metingjs',
  };
  const options = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const lowercase = key.toLowerCase();
    if (Object.hasOwn(container.dataset, lowercase) || Object.hasOwn(container.dataset, key) || fallback !== null) {
      const value = container.dataset[lowercase] || container.dataset[key] || fallback;
      options[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
  }
  return options;
}

function clearRequest(state) {
  if (!state.request) return;
  state.request.onreadystatechange = state.request.onerror = state.request.ontimeout = null;
  state.request = null;
}

function buildPlayer(container, state) {
  // A cached article can leave the reader while its playlist is downloading.
  // Keep the result, and construct the player when the same DOM is shown again.
  if (!container.isConnected) return;
  try {
    const player = new window.APlayer(playerOptions(container, state.music));
    (window.aplayers ||= []).push(player);
    state.status = 'initialized';
    showPlayer(container);
  } catch (error) {
    state.status = 'failed';
    showUnavailable(container);
    console.warn('Music unavailable; article content remains readable.', error);
  }
}

function initializeContainer(container) {
  const previous = players.get(container);
  if (previous?.status === 'initialized' || previous?.status === 'pending') return;
  if (previous?.status === 'ready') { buildPlayer(container, previous); return; }
  if (previous?.fallbackTimer) window.clearTimeout(previous.fallbackTimer);

  const state = { status: 'pending', request: null, music: null, fallbackTimer: null };
  players.set(container, state);
  state.fallbackTimer = window.setTimeout(() => {
    state.fallbackTimer = null;
    if (state.status !== 'initialized' && state.status !== 'ready') showUnavailable(container);
  }, 8000);
  function fail() {
    clearRequest(state);
    state.status = 'failed';
    // Keep the existing eight-second unavailable presentation for failed requests.
  }
  function complete(music) {
    clearRequest(state);
    if (!Array.isArray(music) || !music.length) { fail(); return; }
    state.music = music;
    state.status = 'ready';
    window.clearTimeout(state.fallbackTimer);
    state.fallbackTimer = null;
    buildPlayer(container, state);
  }

  if (!container.dataset.id) {
    complete([{
      name: container.dataset.name || container.dataset.title || 'Audio name',
      artist: container.dataset.artist || container.dataset.author || 'Audio artist',
      url: container.dataset.url, cover: container.dataset.cover || container.dataset.pic,
      lrc: container.dataset.lrc, type: container.dataset.type || 'auto',
    }]);
    return;
  }
  try {
    let url = container.dataset.api || (window.meting_api !== undefined ? window.meting_api : DEFAULT_API);
    for (const [name, value] of Object.entries({
      server: container.dataset.server, type: container.dataset.type, id: container.dataset.id,
      auth: container.dataset.auth, r: Math.random(),
    })) url = url.replace(`:${name}`, value);
    const request = new XMLHttpRequest();
    state.request = request;
    request.timeout = 30000;
    request.onreadystatechange = () => {
      if (request.readyState !== 4) return;
      if (!(request.status >= 200 && request.status < 300 || request.status === 304)) { fail(); return; }
      try { complete(JSON.parse(request.responseText)); } catch { fail(); }
    };
    request.onerror = request.ontimeout = fail;
    request.open('get', url, true);
    request.send(null);
  } catch { fail(); }
}

export async function prepareEmbeddedPlayer(node) {
  if (!node?.querySelector('meting-js, .aplayer[data-id], .aplayer[data-url]')) return;
  try {
    // Asset downloads are shared; initialization belongs to each cached container.
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
    for (const container of containers) {
      container.dataset.autoplay = 'false';
      initializeContainer(container);
    }
  } catch (error) {
    console.warn('Music unavailable; article content remains readable.', error);
    for (const container of node.querySelectorAll('meting-js, .aplayer[data-id], .aplayer[data-url]')) showUnavailable(container);
  }
}
