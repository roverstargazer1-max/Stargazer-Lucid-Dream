import { angles, clamp, domeIntersection, viewRay } from './dome.js';
import { renderGlyphs } from './observation.js';
import { createTimeline, smooth, unit, dialogFrames, dialogDuration, dialogBackdrop } from './motion.js';

const normalize = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();

// Search uses published calendar dates, never UTC conversion or the displayed row number.
export function findArticles(articles, documents, { query = '', year = '', magnitude = '' } = {}) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return articles.flatMap(article => {
    if (year && article.date.slice(0, 4) !== String(year)) return [];
    if (magnitude !== '' && Number(article.magnitude) !== Number(magnitude)) return [];
    const title = normalize(article.title), number = normalize(article.catalogNumber);
    const metadata = normalize([article.displayId, ...(article.tags || []), ...(article.categories || [])].join(' '));
    const text = normalize(documents.get(article.id));
    if (!tokens.every(token => [title, number, metadata, text].some(field => field.includes(token)))) return [];
    const score = tokens.reduce((total, token) => total + (number === token ? 100 : number.includes(token) ? 40
      : title === token ? 80 : title.includes(token) ? 30 : metadata.includes(token) ? 15 : 1), 0);
    return [{ article, score }];
  }).sort((left, right) => right.score - left.score
    || String(right.article.timeOrder || right.article.date).localeCompare(String(left.article.timeOrder || left.article.date))
    || left.article.id.localeCompare(right.article.id)).map(result => result.article);
}

// The supplied circular grid uses zenith at its centre and horizon on its outer ring.
export function atlasPoint(position) {
  const { azimuth, elevation } = angles(position);
  const radius = 1 - clamp(elevation, 0, Math.PI / 2) / (Math.PI / 2);
  return { x: .5 + Math.sin(azimuth) * radius * .5, y: .5 - Math.cos(azimuth) * radius * .5 };
}

export function viewFootprint(camera, settings, width, height) {
  const points = [];
  for (let side = 0; side < 4; side++) for (let step = 0; step < 16; step++) {
    const t = step / 16;
    const [x, y] = side === 0 ? [t * width, 0] : side === 1 ? [width, t * height]
      : side === 2 ? [(1 - t) * width, height] : [0, (1 - t) * height];
    points.push(atlasPoint(domeIntersection(camera, viewRay(x, y, camera, settings))));
  }
  return points;
}

export function createArticleSearch({ articles, getScene, onRead, onOpen, onClose, articleUrl, isSoft }) {
  const dialog = document.getElementById('star-search');
  const artboard = dialog.querySelector('.search-artboard');
  const entry = document.getElementById('search-entry');
  const map = dialog.querySelector('.search-map');
  const mapCanvas = map.querySelector('canvas');
  const starLayer = map.querySelector('.search-map-stars');
  const title = map.querySelector('.search-map-title');
  const input = document.getElementById('search-query');
  const toggle = document.getElementById('search-index-toggle');
  const index = document.getElementById('search-index');
  const results = document.getElementById('search-results');
  const feedback = document.getElementById('search-feedback');
  const clear = document.getElementById('search-clear');
  const glyphRoot = dialog.dataset.glyphRoot;
  let documents = new Map(), loading = null, loaded = false, loadError = false;
  let conditions = { query: '', year: '', magnitude: '' };
  let matched = new Set(articles.map(article => article.id));
  let composing = false, reading = false, closing = false, dialogAnimation = null;
  let openingTrigger = entry, readingTrigger = null, session = false;
  let lastMapKey = '';
  const filterButtons = new Map();
  const starButtons = new Map();
  const rowLinks = new Map();
  const backdropSheet = document.createElement('style');
  backdropSheet.textContent = '#star-search::backdrop {}'; document.head.append(backdropSheet);
  const backdrop = backdropSheet.sheet.cssRules[0].style;
  let backdropFocus = 0, outsidePointer = false;
  const setBackdrop = (progress, soft) => {
    backdropFocus = progress;
    Object.assign(backdrop, dialogBackdrop(progress, soft), {
      backdropFilter: `blur(${soft ? 0 : (1.2 * progress).toFixed(2)}px)`,
    });
  };
  setBackdrop(0, isSoft());

  const hydrate = root => {
    for (const image of root.querySelectorAll('img[data-search-src]')) {
      image.src = image.dataset.searchSrc;
      delete image.dataset.searchSrc;
    }
  };

  for (const [kind, options] of [
    ['year', [...new Set(articles.map(article => article.date.slice(0, 4)))].sort().reverse()],
    ['magnitude', ['1.0', '2.5', '4.0']],
  ]) {
    const rail = dialog.querySelector(`[data-filter="${kind}"] .search-filter-options`);
    const buttons = options.map(value => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.value = value;
      button.setAttribute('aria-label', kind === 'year' ? `${value} 年` : `博客星等 ${value}`);
      button.setAttribute('aria-pressed', 'false');
      // Preserve the complete native black rail, cyan edge and digits in each supplied PNG cell.
      const nativeValues = kind === 'year' ? ['2026', '2025', '2024'] : ['1.0', '2.5', '4.0'];
      const nativeColumn = nativeValues.indexOf(value);
      const artwork = document.createElement('span'); artwork.className = 'search-filter-art';
      artwork.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img'); image.dataset.searchSrc = dialog.dataset.filterSrc;
      image.alt = ''; image.draggable = false;
      if (nativeColumn >= 0) {
        const cellWidth = kind === 'year' ? 238 / 3 : 221 / 3;
        image.style.width = `${383 / cellWidth * 100}%`;
        image.style.left = `${-(145 + nativeColumn * cellWidth) / cellWidth * 100}%`;
        image.style.height = '200%'; image.style.top = kind === 'year' ? '0' : '-100%';
      } else {
        // Other real years reuse a blank strip of the native rail beneath the existing number glyphs.
        image.style.width = '9575%'; image.style.left = '-5800%';
        image.style.height = '200%'; image.style.top = '0';
        const digits = document.createElement('span'); digits.className = 'search-filter-digits';
        renderGlyphs(digits, value, glyphRoot); button.append(digits);
      }
      artwork.append(image); button.prepend(artwork);
      button.addEventListener('click', () => {
        conditions[kind] = conditions[kind] === value ? '' : value;
        changed();
      });
      rail.append(button);
      return button;
    });
    filterButtons.set(kind, buttons);
  }

  for (const article of articles) {
    const star = document.createElement('button');
    star.type = 'button'; star.className = 'search-map-star';
    star.dataset.articleId = article.id;
    star.setAttribute('aria-label', `阅读：${article.title}，${article.displayId}`);
    star.addEventListener('mouseenter', () => highlight(article.id));
    star.addEventListener('mouseleave', () => highlight(null));
    star.addEventListener('focus', () => highlight(article.id));
    star.addEventListener('blur', () => highlight(null));
    star.addEventListener('click', () => void read(article.id, star));
    starLayer.append(star); starButtons.set(article.id, star);
    const row = document.createElement('a');
    row.className = 'search-result'; row.href = articleUrl(article).pathname;
    row.dataset.articleId = article.id;
    row.setAttribute('aria-label', `${article.title}，${article.date}，${article.displayId}`);
    const label = document.createElement('span'); label.className = 'search-result-name';
    const name = document.createElement('span'); name.textContent = article.title;
    const date = document.createElement('time'); date.dateTime = article.date; date.textContent = article.date;
    const id = document.createElement('span'); id.className = 'search-result-id';
    id.textContent = article.displayId;
    label.append(name, date); row.append(label, id);
    row.addEventListener('mouseenter', () => highlight(article.id));
    row.addEventListener('mouseleave', () => highlight(null));
    row.addEventListener('focus', () => highlight(article.id));
    row.addEventListener('blur', () => highlight(null));
    row.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); void read(article.id, row);
    });
    rowLinks.set(article.id, row);
  }

  function setIndex(open) {
    index.hidden = false;
    index.inert = !open;
    index.setAttribute('aria-hidden', String(!open));
    dialog.dataset.indexOpen = String(open);
    artboard.dataset.indexOpen = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起检索索引' : '展开检索索引');
  }

  function changed() {
    conditions.query = input.value;
    if (conditions.query.trim() || conditions.year || conditions.magnitude) setIndex(true);
    renderResults();
  }

  function renderResults(preserveScroll = false) {
    const scrollTop = results.scrollTop;
    for (const [kind, buttons] of filterButtons) for (const button of buttons) {
      button.setAttribute('aria-pressed', String(conditions[kind] === button.dataset.value));
    }
    const waiting = Boolean(conditions.query.trim() && !loaded && !loadError);
    const failed = Boolean(conditions.query.trim() && loadError);
    const found = findArticles(articles, documents, conditions);
    matched = new Set(found.map(article => article.id));
    results.replaceChildren(...(waiting || failed ? [] : found.map(article => rowLinks.get(article.id))));
    results.scrollTop = preserveScroll ? scrollTop : 0;
    feedback.textContent = waiting ? '正在准备检索…' : failed ? '正文检索暂不可用，请清除关键词浏览文章。'
      : found.length ? `${found.length} 篇文章` : '未找到匹配文章';
    clear.hidden = !(conditions.query || conditions.year || conditions.magnitude);
    lastMapKey = '';
    paintMap();
  }

  async function loadDocuments() {
    if (loaded) return;
    if (loading) return loading;
    loadError = false;
    loading = fetch(dialog.dataset.searchUrl, { credentials: 'same-origin', cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
        const data = await response.json();
        if (data.version !== 1 || !Array.isArray(data.documents)
          || data.documents.some(item => typeof item.id !== 'string' || typeof item.text !== 'string')
          || articles.some(article => !data.documents.some(item => item.id === article.id))) {
          throw new Error('The search documents do not match the published articles.');
        }
        documents = new Map(data.documents.map(item => [item.id, item.text]));
        loaded = true;
      }).catch(error => { loadError = true; console.warn('Article search could not be loaded.', error); })
      .finally(() => { loading = null; if (dialog.open) renderResults(); });
    return loading;
  }

  function open(trigger) {
    if (dialog.open || session) return;
    openingTrigger = trigger;
    session = true;
    conditions = { query: '', year: '', magnitude: '' }; input.value = '';
    setIndex(false); hydrate(dialog);
    void showDialog().then(() => {
      if (session && !closing && dialog.open) input.focus({ preventScroll: true });
    });
    onOpen();
    renderResults(); paintMap();
    void loadDocuments();
  }

  function animateDialog(out = false) {
    const soft = isSoft(), fromFocus = backdropFocus;
    const frames = dialogFrames(soft, !out, out || dialogAnimation ? getComputedStyle(dialog) : null);
    cancelDialogAnimation();
    const timeline = createTimeline(); timeline.add(dialog, frames);
    dialog.dataset.motion = out ? 'closing' : 'opening'; artboard.inert = true;
    const finished = new Promise(resolve => {
      dialogAnimation = { timeline, start:performance.now(), duration:dialogDuration(soft, !out),
        fromFocus, toFocus:out ? 0 : 1, soft, resolve };
    });
    tickDialog(performance.now());
    return finished;
  }

  function cancelDialogAnimation() {
    const current = dialogAnimation; dialogAnimation = null;
    current?.timeline.cancel(); current?.resolve();
    artboard.inert = false; delete dialog.dataset.motion;
  }

  function tickDialog(now) {
    if (!dialogAnimation) return;
    const current = dialogAnimation, progress = unit((now - current.start) / current.duration);
    current.timeline.seek(progress);
    setBackdrop(current.fromFocus + (current.toFocus - current.fromFocus) * smooth(progress), current.soft);
    if (progress === 1) cancelDialogAnimation();
  }

  function showDialog() {
    closing = false; dialog.showModal(); return animateDialog();
  }

  async function close() {
    if (!dialog.open || reading || closing) return;
    closing = true;
    await animateDialog(true);
    if (!closing) return;
    session = false; dialog.close(); closing = false; highlight(null);
    entry.hidden = false; onClose(); openingTrigger?.focus({ preventScroll: true });
  }

  async function read(id, trigger) {
    if (reading || closing || !dialog.open) return;
    reading = true; readingTrigger = trigger;
    feedback.textContent = '正在准备正文…';
    dialog.setAttribute('aria-busy', 'true');
    try {
      const opened = await onRead(id, trigger);
      if (!opened) feedback.textContent = '这篇文章暂时无法加载，请重试。';
    } finally {
      reading = false; dialog.removeAttribute('aria-busy');
    }
  }

  function highlight(id) {
    for (const [key, star] of starButtons) star.classList.toggle('is-highlighted', id === key);
    for (const [key, row] of rowLinks) row.classList.toggle('is-highlighted', id === key);
    const article = articles.find(article => article.id === id);
    title.hidden = !article;
    if (article) {
      const star = starButtons.get(id);
      title.textContent = article.title;
      // Keep the label near its star and inside the map, including after a resize.
      title.style.left = `${clamp(parseFloat(star.style.left), 26, 74)}%`;
      title.style.top = star.style.top;
      title.dataset.below = String(parseFloat(star.style.top) < 18);
    }
  }

  function drawView(canvas, scene) {
    const size = Math.round(canvas.clientWidth), ratio = Math.min(devicePixelRatio || 1, 2);
    if (!size) return;
    if (canvas.width !== Math.round(size * ratio)) canvas.width = canvas.height = Math.round(size * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip();
    const boundary = viewFootprint(scene.camera, scene.settings, scene.width, scene.height);
    context.beginPath();
    boundary.forEach((point, i) => i ? context.lineTo(point.x * size, point.y * size) : context.moveTo(point.x * size, point.y * size));
    context.closePath(); context.fillStyle = '#b9e7ff12'; context.fill();
    context.strokeStyle = '#b9e7ff99'; context.lineWidth = 1; context.stroke();
    const centre = atlasPoint(domeIntersection(scene.camera, viewRay(scene.width / 2, scene.height / 2, scene.camera, scene.settings)));
    context.beginPath(); context.arc(centre.x * size, centre.y * size, 3, 0, Math.PI * 2);
    context.strokeStyle = '#62d5ff'; context.stroke();
    context.restore();
  }

  function sceneKey(scene) {
    return [scene.mode, scene.selected, scene.width, scene.height, ...Object.values(scene.camera).map(value => value.toFixed(4))].join('|');
  }

  function paintMap() {
    if (!dialog.open) return;
    const scene = getScene(), key = sceneKey(scene) + mapCanvas.clientWidth;
    if (key === lastMapKey) return;
    lastMapKey = key;
    drawView(mapCanvas, scene);
    for (const article of articles) {
      const point = atlasPoint(scene.positionOf(article)), star = starButtons.get(article.id);
      star.style.left = `${point.x * 100}%`; star.style.top = `${point.y * 100}%`;
      star.classList.toggle('is-selected', scene.selected === article.id);
      star.classList.toggle('is-muted', !matched.has(article.id));
      star.style.setProperty('--star-size', article.magnitude === 1 ? '9px' : article.magnitude === 2.5 ? '7px' : '5px');
    }
  }

  entry.addEventListener('click', () => open(entry));
  document.getElementById('close-search').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener('pointerdown', event => { outsidePointer = outside(event); });
  dialog.addEventListener('click', event => {
    if (event.button === 0 && outsidePointer && outside(event)) void close();
    outsidePointer = false;
  });
  toggle.addEventListener('click', () => setIndex(artboard.dataset.indexOpen !== 'true'));
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; changed(); });
  input.addEventListener('input', event => { if (!composing && !event.isComposing) changed(); });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); if (composing) return; setIndex(true); changed();
  });
  clear.addEventListener('click', () => {
    conditions = { query: '', year: '', magnitude: '' }; input.value = '';
    renderResults(); input.focus({ preventScroll: true });
  });
  new ResizeObserver(() => { lastMapKey = ''; paintMap(); }).observe(artboard);

  return {
    get isOpen() { return dialog.open; },
    suspend() { closing = false; cancelDialogAnimation(); dialog.close(); setBackdrop(0, isSoft()); },
    resume() {
      if (!session || dialog.open) return;
      void showDialog().then(() => {
        if (session && !closing && dialog.open) (readingTrigger?.isConnected ? readingTrigger : input).focus({ preventScroll: true });
      });
      lastMapKey = ''; paintMap();
      if (conditions.query.trim()) renderResults(true);
      feedback.textContent = `${results.children.length} 篇文章`;
    },
    abandon() { session = false; closing = false; cancelDialogAnimation(); if (dialog.open) dialog.close(); setBackdrop(0, isSoft()); },
    update(now, active) {
      tickDialog(now);
      entry.hidden = !active || dialog.open;
    },
  };
}
