import { prepareEmbeddedPlayer } from './audio.js';
import { createInteractiveClouds, prepareInteractiveClouds } from './interactive-clouds.js';
import { createRoom, paintCloudVeil, paintPaintedSky, paintPaintedStar, preparePaintedScene } from './painted.js';
import { HOME_ELEVATION, MIN_SKY_ZOOM, clamp, domeDestination, direction, domePosition, projectDome } from './dome.js';
import { createStarMotion, ENTRANCE, entranceFrame, returnFrame, smooth } from './motion.js';
import { approach } from './tokens.js';
import { dockTarget } from './experience.js';
import { buildPaths, buildTimePaths, clipSegment, crosses } from './navigation.js';
import { createEdgeGuide } from './edge-guide.js';
import { createRenderBudget } from './render-budget.js';
import { setRenderQuality } from './dome-renderer.js';
import { isStarReachable, starLabelPlacement } from './star-targets.js';
import { createObservationPanel } from './observation.js';
import { createPolyhedron } from './polyhedron.js';
import { createSilhouetteWalker } from './silhouette-walker.js';
import { readingProgress } from './reading-progress.js';
import { constrainSkyCamera, skyProjection } from './camera-bounds.js';
import { createArticleSearch } from './search.js';
import { prepareReaderArt, waitForReaderArt } from './reader-art.js';
import { prepareImages, settleWithin } from './image-readiness.js';

const body = document.body;
const world = document.getElementById('world');
if (world) start().catch(fallback);

async function start() {
  // Let the original room paint before the hidden sky interface competes for bandwidth.
  await waitForImage(document.querySelector('.room-image'));
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');

  const reader = document.getElementById('reader');
  const scroller = document.getElementById('reading-scroll');
  const readerSlot = document.getElementById('reading-content-slot');
  const preview = document.getElementById('preview');
  const observationPanel = createObservationPanel(preview);
  const polyhedron = createPolyhedron(document.querySelector('.sky-polyhedron'));
  const readingWalker = createSilhouetteWalker(reader.querySelector('.reading-walker'), { compact: true, white: true, freezeWhenIdle: true });
  const journey = document.getElementById('reading-journey');
  const readingFooter = reader.querySelector('.reading-footer');
  const readingMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.getElementById('approach-status');
  const readButton = document.getElementById('read-button');
  const controls = document.getElementById('exploration-controls');
  const prepareSkyFurniture = () => Promise.all([
    '.masthead', '.sky-polyhedron', '#exploration-controls', '#search-entry',
  ].map(selector => prepareImages(document.querySelector(selector))));
  // The room has already painted. Prepare the next scene concurrently with its
  // sky rather than starting a new download only after the first window click.
  const furnitureReady = settleWithin(prepareSkyFurniture());
  const relationModeButton = document.getElementById('relation-mode');
  const timeModeButton = document.getElementById('time-mode');
  const backDockButton = document.getElementById('back-dock');
  const homeButton = document.getElementById('home');
  const targetLayer = document.getElementById('star-targets');
  const edgeGuide = createEdgeGuide(document.getElementById('edge-guide'), activateStar);
  const directId = body.dataset.starryArticleId;
  const isDirectEntry = Boolean(directId);
  const collectionKind = body.dataset.starryCollectionKind || '';
  const isDirectCollection = Boolean(collectionKind);
  if (isDirectEntry) void prepareReaderArt(document.getElementById('reader-title')?.textContent || '');
  const collectionMode = collectionKind === 'archive' ? 'time' : 'relation';
  const collectionPath = body.dataset.starryCollectionPath || location.pathname;
  const staticCollection = document.getElementById('static-collection-fallback');
  const collectionFirstId = staticCollection?.querySelector('[data-starry-article-id]')?.dataset.starryArticleId || '';
  const collectionDialog = document.getElementById('collection-panel');
  const collectionSlot = document.getElementById('collection-content-slot');
  const fallbackArticle = document.querySelector('#static-article-fallback .article[data-starry-id]');
  const previewMemory = { camera: null, selected: null, phase: 'idle' };
  let reducedMotion = body.dataset.defaultMotion === 'soft';
  let roomScene = null;
  let clouds = null;
  let starMotion = null;
  let articles = [];
  let articleById = new Map();
  let relationsByArticle = new Map();
  let timePositionById = new Map();
  let articleNodes = new Map();
  const readArticleIds = new Set();
  let article = null;
  let selected = null;
  let mode = isDirectCollection ? collectionMode : 'relation';
  let phase = 'idle';
  let travel = null;
  let arrival = null;
  let retreatCamera = null;
  let width = innerWidth;
  let height = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: HOME_ELEVATION, zoom: 1 };
  let starTargets = new Map();
  // Per-star eased hover/lock, so rings draw in rather than switching on.
  const starEase = new Map();
  let visibleStars = new Map();
  const projectedStars = new Map();
  let layoutMorph = null;
  let articleLoads = new Map();
  let readingSnapshot = null;
  const dockHistoryByMode = new Map();
  const dockCursorByMode = new Map();
  let readerTrigger = null;
  let internalArticleHistory = false;
  let historyNavigationVersion = 0;
  let directCloseInProgress = false;
  let collectionOpen = isDirectCollection;
  let collectionTrigger = null;
  let articleSearch = null;
  let animationStarted = false;
  let navigationEdges = [];
  let timeCueUntil = 0;
  let lineOpacity = 1;
  let lastCamera = null;
  let labelPointer = null;
  let lastFrame = 0;
  let restingFrameDrawn = false;
  let renderQualityPending = false;
  let foregroundQualityPending = false;
  const meteors = [];
  const egg = document.getElementById('egg-dialog');
  const renderBudget = createRenderBudget({ hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory, roomBlur: body.dataset.passageBlur === 'on' });
  const pointers = new Map();
  let press = null;
  let gestureMoved = false;
  let multiTouch = false;
  let previousPinch = 0;
  let ambient = { x: 0, y: 0, targetX: 0, targetY: 0, seconds: 0 };

  const indexUrl = new URL(body.dataset.starryIndex, location.origin);
  const response = await fetch(indexUrl, { credentials: 'same-origin', cache: 'no-cache' });
  if (!response.ok) throw new Error(`Starfield index request failed: ${response.status}`);
  const index = await response.json();
  if (index.version !== 2 || !Array.isArray(index.articles)) throw new Error('The starfield index has an unsupported format.');
  articles = index.articles.map((item) => {
    if (!item.id || !item.title || !Array.isArray(item.position) || item.position.length !== 3 || !item.position.every(Number.isFinite)) {
      throw new Error(`Article "${item.id || '(missing ID)'}" is not ready for the starfield.`);
    }
    return { ...item, savedPosition: item.position.slice(), position: { x: item.position[0], y: item.position[1], z: item.position[2] } };
  });
  articleById = new Map(articles.map((item) => [item.id, item]));
  navigationEdges = buildPaths(articles.map(item => ({ ...item, position: item.savedPosition })));
  const timeOrderedArticles = [...articles].sort((left, right) => {
    const leftOrder = String(left.timeOrder || `${left.date}|${left.id}`);
    const rightOrder = String(right.timeOrder || `${right.date}|${right.id}`);
    return leftOrder < rightOrder ? -1 : leftOrder > rightOrder ? 1 : 0;
  });
  const timeEdges = buildTimePaths(timeOrderedArticles);
  timeOrderedArticles.forEach((item, index) => {
    timePositionById.set(item.id, domePosition({ position: item.savedPosition }, index, 'time'));
  });
  relationsByArticle = new Map(articles.map((item) => [item.id, []]));
  for (const relation of Array.isArray(index.relations) ? index.relations : []) {
    if (!Array.isArray(relation.articles) || relation.articles.length !== 2) continue;
    const [left, right] = relation.articles;
    if (left === right || !articleById.has(left) || !articleById.has(right)) continue;
    const reason = typeof relation.reason === 'string' ? relation.reason.trim() : '';
    relationsByArticle.get(left).push({ articleId: right, reason });
    relationsByArticle.get(right).push({ articleId: left, reason });
  }
  const startId = directId || index.featuredArticleId || body.dataset.starryFeaturedId;
  article = articleById.get(startId) || articles[0] || null;
  seedDockHistory('relation', camera, null);
  seedDockHistory('time', camera, null);
  if (!isDirectEntry) {
    history.replaceState(isDirectCollection
      ? { starryView: 'collection', mode, collectionPath }
      : { starryView: 'sky', mode }, '', location.href);
  }

  if (isDirectEntry) {
    if (!article || !fallbackArticle || fallbackArticle.dataset.starryId !== article.id) throw new Error('The static article does not match its starfield identity.');
    const heading = fallbackArticle.querySelector('#reader-title');
    if (!heading || heading.textContent.trim() !== article.title) throw new Error('The static article title does not match its index entry.');
    articleNodes.set(article.id, fallbackArticle);
  }

  resize();
  await Promise.all([preparePaintedScene(), prepareInteractiveClouds(), furnitureReady,
    ...(isDirectEntry ? [waitForReaderArt(article?.title)] : [])]);
  await waitForImage(document.querySelector('.room-image'));
  clouds = createInteractiveClouds(world, () => reducedMotion || !renderBudget.current.ambientMotion);
  starMotion = createStarMotion({ preview, reader, scroller, isSoft: () => reducedMotion });

  if (isDirectEntry) {
    selected = article.id;
    phase = 'settled';
    updateUI();
    camera = destination(article);
    seedDockHistory(mode, camera, selected);
    readerSlot.replaceChildren(fallbackArticle);
  }

  roomScene = createRoom({
    prepareEnter: () => settleWithin(prepareSkyFurniture(), 800),
    startOutside: isDirectEntry || isDirectCollection,
    onEnter(startTime) {
      // Explicitly leaving the room is the first intent to explore/read. Use
      // the existing passage to warm its two next surfaces, without adding
      // either surface (or any journal photos) to the initial room download.
      void prepareReaderArt();
      void articleSearch?.prepare();
      const first = entryFrame(0);
      camera = { ...first };
      if (reducedMotion) arrival = null;
      else arrival = { start: startTime };
      phase = 'entering';
      body.dataset.arrival = 'passage';
    },
    onProgress(progress) {
      if (!reducedMotion) return;
      const from = entryFrame(0);
      const to = entryFrame(ENTRANCE.duration);
      camera = interpolate(from, to, smooth(progress));
    },
    onEntered() {
      if (reducedMotion || !arrival) finishArrival();
      else phase = 'arriving';
      updateUI();
    },
    onReturnStart() {
      retreatCamera = { ...camera };
      travel = null;
      arrival = null;
      selected = null;
      phase = 'returning';
      starMotion.clearSelection();
      delete body.dataset.arrival;
      updateUI();
    },
    onReturnProgress(progress) {
      if (!retreatCamera) return;
      camera = returnFrame(progress, retreatCamera, width <= 760 ? .78 : 1);
    },
    onReturned() {
      const start = entranceFrame(0, width <= 760 ? .78 : 1);
      camera = { ...start };
      retreatCamera = null;
      travel = null;
      arrival = null;
      selected = null;
      phase = 'idle';
      starMotion.clearSelection();
      delete body.dataset.arrival;
      seedDockHistory('relation', camera, null);
      seedDockHistory('time', camera, null);
      replaceViewState(mode);
      updateUI();
    },
    onMotion(value) {
      restingFrameDrawn = false;
      reducedMotion = value;
    },
  });

  if (isDirectCollection && collectionFirstId && articleById.has(collectionFirstId)) {
    article = articleById.get(collectionFirstId);
    selected = article.id;
    phase = 'settled';
    camera = destination(article, mode);
    seedDockHistory(mode, camera, selected);
  }

  mountStar();
  articleSearch = createArticleSearch({
    articles,
    isSoft: () => reducedMotion,
    getScene: () => ({ camera, mode, selected, width, height, settings: projectionSettings(), positionOf }),
    articleUrl: localArticleUrl,
    onRead: openReaderFromSearch,
    onOpen() {
      interrupt(); pointers.clear(); press = null; labelPointer = null;
      restingFrameDrawn = false; updateUI();
    },
    onClose() { restingFrameDrawn = false; updateUI(); },
  });
  wireControls();
  document.addEventListener('starry:journal', event => {
    if (event.detail.open) { interrupt(); pointers.clear(); press = null; labelPointer = null; }
    restingFrameDrawn = false;
  });
  updateUI();
  preflightRenderer();

  body.classList.add('starry-ready');
  document.documentElement.classList.remove('starry-loading');
  if (isDirectEntry) openDirectArticle();
  else if (isDirectCollection) openCollectionPanel();
  animationStarted = true;
  requestAnimationFrame(animate);

  function resize() {
    restingFrameDrawn = false;
    width = innerWidth;
    height = innerHeight;
    applyRenderQuality();
    if (travel?.kind === 'return') return;
    if (travel?.kind === 'mode-start') {
      const targetArticle = articleById.get(travel.targetArticleId);
      if (targetArticle) travel.to = focusCamera(targetArticle, travel.layout);
    } else if (travel?.targetArticleId) {
      const targetArticle = articleById.get(travel.targetArticleId);
      if (targetArticle) travel.to = destination(targetArticle, travel.layout);
    }
    if (selected && phase === 'settled' && !reader.open && article) camera = destination(article);
    if (roomScene && !roomScene.active && !arrival) limitCamera();
  }

  function applyRenderQuality() {
    const quality = renderBudget.current;
    restingFrameDrawn = false;
    body.dataset.renderQuality = quality.tier;
    body.dataset.roomBlur = quality.roomBlur ? 'on' : 'off';
    setRenderQuality(quality.environmentRatioCap);
    const nextDpr = Math.min(devicePixelRatio || 1, quality.pixelRatioCap);
    // A new foreground surface can require a synchronous GPU allocation. The
    // background adapts immediately; resize this surface once the camera rests.
    foregroundQualityPending = animationStarted && cameraIsMoving() && nextDpr !== dpr;
    if (!foregroundQualityPending) dpr = nextDpr;
    const drawableWidth = Math.round(width * dpr), drawableHeight = Math.round(height * dpr);
    if (canvas.width !== drawableWidth || canvas.height !== drawableHeight) {
      canvas.width = drawableWidth;
      canvas.height = drawableHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cameraIsMoving() {
    return Boolean(travel || arrival || pointers.size || body.dataset.room === 'entering' || body.dataset.room === 'returning');
  }

  function projectionSettings(view = camera) {
    return skyProjection(width, height, view.zoom || 1);
  }

  function limitCamera() {
    camera = constrainSkyCamera(camera, width, height);
  }

  function entryFrame(elapsed) {
    const frame = entranceFrame(elapsed, width <= 760 ? .78 : 1);
    const bounded = constrainSkyCamera(frame, width, height);
    const progress = smooth(elapsed / ENTRANCE.passage);
    return { ...frame, pitch: frame.pitch + (bounded.pitch - frame.pitch) * progress,
      zoom: frame.zoom + (bounded.zoom - frame.zoom) * progress };
  }

  function project(point) {
    return projectDome(point, camera, projectionSettings());
  }

  function layoutPosition(targetArticle, layout) {
    const p = layout === 'time' ? timePositionById.get(targetArticle.id) : targetArticle.position;
    return Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : p;
  }

  // While modes swap, each star glides along the dome (great-circle slerp with a
  // per-star stagger) instead of teleporting to its new constellation.
  function positionOf(targetArticle, layout = mode) {
    const end = layoutPosition(targetArticle, layout);
    if (!layoutMorph || layout !== layoutMorph.to || reducedMotion) return end;
    const order = layoutMorph.order.get(targetArticle.id) || 0;
    const t = clamp((performance.now() - layoutMorph.start - order * 260) / (layoutMorph.duration - 260), 0, 1);
    if (t >= 1) return end;
    const start = layoutPosition(targetArticle, layoutMorph.from);
    const k = smooth(t), ra = Math.hypot(start.x, start.y, start.z), rb = Math.hypot(end.x, end.y, end.z);
    const dot = clamp((start.x * end.x + start.y * end.y + start.z * end.z) / (ra * rb), -1, 1), w = Math.acos(dot);
    if (w < 1e-4) return end;
    const sa = Math.sin((1 - k) * w) / Math.sin(w) / ra, sb = Math.sin(k * w) / Math.sin(w) / rb, r = ra + (rb - ra) * k;
    // A slight lift toward the zenith mid-flight reads as stars rising, not sliding.
    const lift = Math.sin(k * Math.PI) * .06 * r;
    return { x: (start.x * sa + end.x * sb) * r, y: (start.y * sa + end.y * sb) * r + lift, z: (start.z * sa + end.z * sb) * r };
  }

  function defaultArticleForMode(layout) {
    return layout === 'time'
      ? (timeOrderedArticles[0] || articles[0] || null)
      : (articleById.get(index.featuredArticleId) || articles[0] || null);
  }

  function focusCamera(targetArticle, layout = mode) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return constrainSkyCamera(domeDestination(layoutPosition(targetArticle, layout), camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, { x: width * .40, y: height * .42 }), width, height);
  }

  function destination(targetArticle, layout = mode) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return constrainSkyCamera(domeDestination(layoutPosition(targetArticle, layout), camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, dockTarget(width, height, preview.getBoundingClientRect())), width, height);
  }

  function seedDockHistory(layout, cameraState, selectedArticleId) {
    dockHistoryByMode.set(layout, [{ camera: { ...cameraState }, selected: selectedArticleId || null }]);
    dockCursorByMode.set(layout, 0);
  }

  function appendDockStop(layout, cameraState, selectedArticleId) {
    const stops = dockHistoryByMode.get(layout) || [];
    const cursor = dockCursorByMode.get(layout) ?? (stops.length - 1);
    stops.splice(cursor + 1);
    const previous = stops[stops.length - 1];
    const distance = previous ? Math.hypot(
      previous.camera.x - cameraState.x,
      previous.camera.y - cameraState.y,
      previous.camera.z - cameraState.z,
      previous.camera.yaw - cameraState.yaw,
      previous.camera.pitch - cameraState.pitch,
    ) : Infinity;
    if (previous && previous.selected === (selectedArticleId || null) && distance < 1) {
      previous.camera = { ...cameraState };
    } else {
      stops.push({ camera: { ...cameraState }, selected: selectedArticleId || null });
    }
    dockHistoryByMode.set(layout, stops);
    dockCursorByMode.set(layout, stops.length - 1);
  }

  function canReturnToDock() {
    const stops = dockHistoryByMode.get(mode) || [];
    return !reader.open && !travel && !arrival && !roomScene?.active && (dockCursorByMode.get(mode) || 0) > 0;
  }

  function replaceViewState(layout = mode) {
    const state = reader.open
      ? { starryView: 'reader', starryArticleId: article?.id, mode: layout }
      : collectionOpen
        ? { starryView: 'collection', mode: layout, collectionPath }
        : { starryView: 'sky', mode: layout };
    history.replaceState(state, '', location.href);
    window.blogThemeSwitch?.refresh();
  }

  function openCollectionPanel() {
    if (!staticCollection || !collectionDialog || collectionDialog.open) return;
    if (!collectionSlot.firstElementChild) {
      const articleContent = staticCollection.querySelector('.article');
      if (articleContent) collectionSlot.replaceChildren(articleContent.cloneNode(true));
    }
    const title = collectionSlot.querySelector('#collection-title')?.textContent?.trim();
    if (title) document.getElementById('collection-panel-title').textContent = title;
    collectionOpen = true;
    collectionDialog.showModal();
    document.getElementById('close-collection').focus({ preventScroll: true });
    updateUI();
  }

  function closeCollectionPanel() {
    if (!collectionDialog.open) return;
    collectionOpen = false;
    collectionDialog.close();
    history.pushState({ starryView: 'sky', mode }, '', body.dataset.starryRoot);
    window.blogThemeSwitch?.refresh();
    updateUI();
    homeButton.focus({ preventScroll: true });
  }

  function mountStar() {
    for (const item of articles) {
      const target = document.createElement('button');
      target.className = 'star-target';
      target.type = 'button';
      target.hidden = true;
      target.setAttribute('aria-label', `选择文章：${item.title}`);
      const label = document.createElement('span');
      label.className = 'star-label';
      label.textContent = item.title;
      target.append(label);
      target.addEventListener('click', () => activateStar(item.id));
      targetLayer.append(target);
      starTargets.set(item.id, target);
    }
  }

  function updateUI() {
    const isSelected = Boolean(article && selected === article.id);
    preview.hidden = !isSelected || reader.open || collectionOpen || Boolean(articleSearch?.isOpen);
    controls.hidden = Boolean(roomScene?.active) || reader.open || collectionOpen || Boolean(articleSearch?.isOpen);
    relationModeButton.setAttribute('aria-pressed', String(mode === 'relation'));
    timeModeButton.setAttribute('aria-pressed', String(mode === 'time'));
    relationModeButton.disabled = Boolean(arrival || phase === 'loading');
    timeModeButton.disabled = Boolean(arrival || phase === 'loading');
    backDockButton.disabled = !canReturnToDock();
    if (isSelected && !preview.hidden && (animationStarted || !isDirectEntry)) {
      void prepareImages(readButton, 'high');
      void prepareImages(preview);
      observationPanel.update(article);
      document.getElementById('preview-title').textContent = article.title;
      readButton.setAttribute('aria-label', `进入阅读：${article.title}`);
      status.textContent = phase === 'moving' || phase === 'arriving' ? '正在靠近 · · ·' : phase === 'loading' ? '正在准备正文 · · ·' : phase === 'settled' ? '再点星，阅读' : '点星，重新靠近';
    }
    readButton.disabled = !isSelected || phase !== 'settled' || reader.open;
    for (const [id, target] of starTargets) {
      const item = articleById.get(id);
      const active = selected === id;
      target.classList.toggle('is-selected', active);
      target.classList.toggle('is-read', readArticleIds.has(id));
      target.setAttribute('aria-label', `${active && phase === 'settled' ? '阅读文章' : '选择文章'}：${item.title}`);
    }
    homeButton.hidden = Boolean(roomScene?.active) || reader.open || collectionOpen;
    document.getElementById('journal-egg').hidden = true;
  }

  function announce(message) {
    document.getElementById('announcement').textContent = message;
  }

  function activateStar(id) {
    if (reader.open || arrival || roomScene?.active) return;
    const targetArticle = articleById.get(id);
    if (!targetArticle) return;
    if (travel?.targetArticleId === id) return;
    if (selected === id && phase === 'settled') {
      void openReaderFromStar();
      return;
    }
    const previousContext = { article, selected, phase, camera: { ...camera } };
    article = targetArticle;
    beginApproach(id, 'selection', previousContext);
  }

  function beginApproach(id, kind = 'selection', previousContext = null) {
    void prepareImages(reader);
    void prepareReaderArt(article?.title);
    selected = id;
    phase = 'moving';
    starMotion.interrupt();
    updateUI();
    const start = performance.now();
    const approachLayout = mode;
    const to = destination(article);
    const duration = starMotion.beginApproach(start, id);
    travel = { from: { ...camera }, to, start, duration, kind, targetArticleId: id, layout: approachLayout };
    announce('正在靠近文章星。到位后再次点选这颗星即可阅读。');
    if (!articleNodes.has(id) && !articleLoads.has(id)) {
      const load = loadArticleNode(article).then((node) => {
        articleNodes.set(id, node);
        articleLoads.delete(id);
        return node;
      }).catch((error) => {
        articleLoads.delete(id);
        if (selected === id && mode === approachLayout && !reader.open) {
          travel = null;
          starMotion.clearSelection();
          if (previousContext) {
            article = previousContext.article;
            selected = previousContext.selected;
            camera = previousContext.camera;
            phase = previousContext.selected
              ? (previousContext.phase === 'settled' ? 'settled' : 'selected')
              : 'idle';
          } else {
            phase = 'selected';
          }
          updateUI();
          announce(previousContext?.selected
            ? '这篇文章暂时无法加载；已恢复到此前可读文章，地址没有改变。'
            : '这篇文章暂时无法加载；地址没有改变，可以继续浏览星空。');
        }
        console.warn(`Article "${id}" could not be prepared.`, error);
        return null;
      });
      articleLoads.set(id, load);
    }
  }

  function interrupt() {
    if (!travel) return;
    travel = null;
    starMotion.interrupt();
    phase = selected ? 'selected' : 'idle';
    updateUI();
  }

  async function openReaderFromStar() {
    if (!article || selected !== article.id || phase !== 'settled' || reader.open) return;
    const targetArticle = article;
    phase = 'loading';
    updateUI();
    try {
      const node = articleNodes.get(targetArticle.id) || await articleLoads.get(targetArticle.id) || await loadArticleNode(targetArticle);
      if (!node) return;
      await waitForReaderArt(targetArticle.title);
      articleNodes.set(targetArticle.id, node);
      if (selected !== targetArticle.id || reader.open) return;
      readingSnapshot = { camera: { ...camera }, selected, articleId: article?.id, phase: 'settled', mode };
      readerTrigger = starTargets.get(targetArticle.id) || document.activeElement;
      readerSlot.replaceChildren(node);
      internalArticleHistory = true;
      history.pushState({ starryView: 'reader', starryArticleId: targetArticle.id, mode }, '', localArticleUrl(targetArticle).pathname);
      window.blogThemeSwitch?.refresh();
      showReader(project(positionOf(targetArticle)));
      void prepareEmbeddedPlayer(node);
    } catch (error) {
      phase = 'settled';
      updateUI();
      announce('这篇文章暂时无法加载；仍停留在当前文章与地址。');
      console.warn(`Article "${targetArticle.id}" could not be opened.`, error);
    }
  }

  async function openReaderFromCollection(id, trigger) {
    if (!collectionOpen || reader.open) return;
    const targetArticle = articleById.get(id);
    if (!targetArticle) return;
    try {
      const node = articleNodes.get(id) || await articleLoads.get(id) || await loadArticleNode(targetArticle);
      await waitForReaderArt(targetArticle.title);
      if (!collectionOpen || reader.open || !node) return;
      articleNodes.set(id, node);
      readingSnapshot = {
        camera: { ...camera },
        selected,
        articleId: article?.id,
        phase: selected ? 'settled' : 'idle',
        mode,
        collectionOpen: true,
      };
      collectionTrigger = trigger;
      readerTrigger = trigger;
      collectionOpen = false;
      collectionDialog.close();
      mode = collectionMode;
      article = targetArticle;
      selected = id;
      phase = 'settled';
      camera = destination(targetArticle, mode);
      seedDockHistory(mode, camera, selected);
      readerSlot.replaceChildren(node);
      internalArticleHistory = true;
      history.pushState({ starryView: 'reader', starryArticleId: id, mode }, '', localArticleUrl(targetArticle).pathname);
      window.blogThemeSwitch?.refresh();
      showReader(project(positionOf(targetArticle)));
      void prepareEmbeddedPlayer(node);
    } catch (error) {
      announce('这篇文章暂时无法加载；仍停留在当前清单与地址。');
      console.warn(`Collection article "${id}" could not be opened.`, error);
    }
  }

  async function openReaderFromSearch(id, trigger) {
    if (!articleSearch?.isOpen || reader.open) return false;
    const targetArticle = articleById.get(id);
    if (!targetArticle) return false;
    try {
      const node = articleNodes.get(id) || await articleLoads.get(id) || await loadArticleNode(targetArticle);
      await waitForReaderArt(targetArticle.title);
      if (!articleSearch.isOpen || reader.open || !node) return false;
      articleNodes.set(id, node);
      readingSnapshot = { camera: { ...camera }, selected, articleId: article?.id, phase, mode, searchOpen: true };
      readerTrigger = trigger;
      const rect = trigger.getBoundingClientRect();
      articleSearch.suspend();
      article = targetArticle; selected = id;
      readerSlot.replaceChildren(node);
      internalArticleHistory = true;
      history.pushState({ starryView: 'reader', starryArticleId: id, mode }, '', localArticleUrl(targetArticle).pathname);
      window.blogThemeSwitch?.refresh();
      showReader({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      void prepareEmbeddedPlayer(node);
      return true;
    } catch (error) {
      console.warn(`Search article "${id}" could not be opened.`, error);
      return false;
    }
  }

  function openDirectArticle() {
    readerTrigger = document.getElementById('home');
    showReader(project(positionOf(article)));
    void prepareEmbeddedPlayer(readerSlot.querySelector('.article'));
  }

  function showReader(origin) {
    document.getElementById('reading-window-title').textContent = `${article.title} · 观星者的清醒梦`;
    if (!reader.open) reader.showModal();
    scroller.scrollTop = 0;
    journey.style.setProperty('--reading-fraction', 0);
    journey.setAttribute('aria-valuenow', '0');
    setText(document.getElementById('reading-progress'), '0%');
    phase = 'reading';
    starMotion.open(origin, () => {
      phase = 'reading';
      updateProgress();
    });
    document.getElementById('close-reader').focus({ preventScroll: true });
    updateUI();
  }

  function closeReaderFromDirect() {
    if (!reader.open || directCloseInProgress) return;
    historyNavigationVersion += 1;
    stopEmbeddedAudio();
    directCloseInProgress = true;
    phase = 'closing';
    starMotion.close(() => {
      reader.close();
      directCloseInProgress = false;
      internalArticleHistory = false;
      history.replaceState({ starryView: 'sky', mode }, '', body.dataset.starryRoot);
      window.blogThemeSwitch?.refresh();
      phase = 'settled';
      selected = article.id;
      updateUI();
      starTargets.get(article.id)?.focus({ preventScroll: true });
    }, project(positionOf(article)));
  }

  function closeReaderThroughHistory() {
    if (!reader.open || !internalArticleHistory) return;
    historyNavigationVersion += 1;
    if (isDirectEntry && !readingSnapshot) {
      closeReaderFromDirect();
      return;
    }
    history.go(-(history.state?.starryReaderDepth || 1));
  }

  function closeReaderAfterPop() {
    if (!reader.open) return;
    historyNavigationVersion += 1;
    stopEmbeddedAudio();
    const returnToCollection = Boolean(readingSnapshot?.collectionOpen);
    const returnToSearch = Boolean(readingSnapshot?.searchOpen);
    phase = 'closing';
    starMotion.close(() => {
      reader.close();
      internalArticleHistory = false;
      if (readingSnapshot) {
        camera = { ...readingSnapshot.camera };
        selected = readingSnapshot.selected;
        article = articleById.get(readingSnapshot.articleId || selected) || article;
        mode = readingSnapshot.mode || mode;
        phase = readingSnapshot.phase;
      } else {
        phase = 'settled';
        selected = article.id;
      }
      readingSnapshot = null;
      if (returnToCollection) {
        collectionOpen = true;
        collectionDialog.showModal();
      }
      if (returnToSearch) articleSearch.resume();
      updateUI();
      const target = returnToCollection && collectionTrigger?.isConnected
        ? collectionTrigger
        : readerTrigger?.isConnected ? readerTrigger : starTargets.get(selected);
      target?.focus({ preventScroll: true });
      readerTrigger = null;
    }, project(positionOf(article)));
  }

  async function openReaderFromHistory(id) {
    const requestVersion = ++historyNavigationVersion;
    const targetArticle = articleById.get(id);
    if (!targetArticle) {
      restoreAddressForDisplayedContent();
      announce('历史文章不在当前星空索引中，已保留当前阅读内容。');
      return;
    }
    if (reader.open && article?.id === id) return;
    const wasOpen = reader.open;
    const openingFromCollection = !wasOpen && collectionOpen && collectionDialog.open;
    const openingFromSearch = !wasOpen && articleSearch?.isOpen;
    const activeCollectionTrigger = openingFromCollection
      ? document.activeElement.closest?.('a[data-starry-article-id]')
      : null;
    try {
      const node = articleNodes.get(id) || await articleLoads.get(id) || await loadArticleNode(targetArticle);
      await waitForReaderArt(targetArticle.title);
      if (requestVersion !== historyNavigationVersion || history.state?.starryArticleId !== id) return;
      articleNodes.set(id, node);
      if (!readingSnapshot && !wasOpen) readingSnapshot = {
        camera: { ...camera },
        selected,
        articleId: article?.id,
        phase: selected ? 'settled' : 'idle',
        mode,
        collectionOpen: openingFromCollection,
        searchOpen: openingFromSearch,
      };
      if (openingFromSearch) {
        readerTrigger = document.activeElement;
        articleSearch.suspend();
      }
      if (openingFromCollection) {
        collectionTrigger = activeCollectionTrigger || collectionTrigger;
        readerTrigger = collectionTrigger;
        collectionOpen = false;
        collectionDialog.close();
      }
      // Cached players survive DOM replacement; pause the departing article only
      // after this history request has succeeded and is still the current one.
      if (reader.open) stopEmbeddedAudio();
      article = targetArticle;
      selected = id;
      phase = 'reading';
      readerSlot.replaceChildren(node);
      internalArticleHistory = history.state?.starryReaderDepth !== 0;
      showReader(project(positionOf(targetArticle)));
      void prepareEmbeddedPlayer(node);
    } catch (error) {
      if (requestVersion !== historyNavigationVersion || history.state?.starryArticleId !== id) return;
      restoreAddressForDisplayedContent();
      announce('这篇文章暂时无法加载；仍保留当前可读内容与对应地址。');
      console.warn(`History article "${id}" could not be opened.`, error);
    }
  }

  async function openAdjacentArticle(id, navigation) {
    const targetArticle = articleById.get(id);
    if (!reader.open || phase !== 'reading' || !targetArticle || article.id === id || navigation.getAttribute('aria-busy') === 'true') return;
    const requestVersion = ++historyNavigationVersion;
    navigation.setAttribute('aria-busy', 'true');
    announce(`正在打开《${targetArticle.title}》。`);
    try {
      const node = articleNodes.get(id) || await articleLoads.get(id) || await loadArticleNode(targetArticle);
      await waitForReaderArt(targetArticle.title);
      if (!node || requestVersion !== historyNavigationVersion || !reader.open || phase !== 'reading') return;
      articleNodes.set(id, node);
      // Keep the current entry readable through Back, including direct article entry.
      const depth = history.state?.starryReaderDepth ?? (internalArticleHistory ? 1 : 0);
      history.replaceState({ ...history.state, starryView: 'reader', starryArticleId: article.id, mode, starryReaderDepth: depth }, '', location.href);
      history.pushState({ starryView: 'reader', starryArticleId: id, mode, starryReaderDepth: depth + 1 }, '', localArticleUrl(targetArticle).pathname);
      window.blogThemeSwitch?.refresh();
      await openReaderFromHistory(id);
    } catch (error) {
      if (requestVersion !== historyNavigationVersion) return;
      announce('这篇文章暂时无法加载；仍保留当前文章，可以再次点击重试。');
      console.warn(`Adjacent article "${id}" could not be opened.`, error);
    } finally {
      navigation.removeAttribute('aria-busy');
    }
  }

  function restoreAddressForDisplayedContent() {
    const displayingArticle = reader.open && article;
    const displayingCollection = !displayingArticle && collectionOpen;
    const state = displayingArticle
      ? { starryView: 'reader', starryArticleId: displayingArticle.id, mode }
      : displayingCollection
        ? { starryView: 'collection', mode, collectionPath }
        : { starryView: 'sky', mode };
    const url = displayingArticle
      ? localArticleUrl(displayingArticle).pathname
      : displayingCollection ? collectionPath : body.dataset.starryRoot;
    history.replaceState(state, '', url);
    window.blogThemeSwitch?.refresh();
    internalArticleHistory = Boolean(displayingArticle);
  }

  function switchMode(nextMode) {
    if (nextMode === mode || reader.open || arrival || roomScene?.active) return;
    const hasSelection = Boolean(selected && articleById.has(selected));
    const selectedArticle = hasSelection ? articleById.get(selected) : null;
    const defaultArticle = defaultArticleForMode(nextMode);
    if (!defaultArticle) return;
    interrupt();
    layoutMorph = {
      from: mode, to: nextMode, start: performance.now(), duration: 1500,
      order: new Map(articles.map((item, i) => [item.id, (i * .618) % 1])),
    };
    mode = nextMode;
    if (mode === 'time') showTimeCue(selectedArticle || defaultArticle);
    else document.getElementById('time-cue').hidden = true;
    replaceViewState(mode);
    updateUI();

    const baseline = focusCamera(defaultArticle, mode);
    seedDockHistory(mode, baseline, null);
    const targetArticle = selectedArticle || defaultArticle;
    if (selectedArticle) {
      article = selectedArticle;
      beginApproach(selectedArticle.id, 'mode-switch');
      return;
    }
    selected = null;
    phase = 'moving';
    starMotion.clearSelection();
    travel = {
      from: { ...camera }, to: baseline, start: performance.now(),
      duration: reducedMotion ? 220 : 1800, kind: 'mode-start',
      targetArticleId: targetArticle.id, layout: mode,
    };
    updateUI();
    announce(nextMode === 'time' ? '已切换到时间模式，正在前往时间起点。' : '已切换到关联模式，正在前往关联起点。');
  }

  function returnToPreviousDock() {
    if (!canReturnToDock()) return;
    const cursor = dockCursorByMode.get(mode) || 0;
    const previousIndex = cursor - 1;
    const stop = dockHistoryByMode.get(mode)?.[previousIndex];
    if (!stop) return;
    interrupt();
    selected = stop.selected;
    article = articleById.get(stop.selected) || defaultArticleForMode(mode);
    phase = selected ? 'moving' : 'idle';
    starMotion.interrupt();
    if (selected && article) updateUI();
    travel = {
      from: { ...camera }, to: { ...stop.camera }, start: performance.now(),
      duration: reducedMotion ? 220 : 1800, kind: 'return', layout: mode,
      targetArticleId: selected, returnIndex: previousIndex,
    };
    updateUI();
    announce('正在返回上一个自动停靠点。');
  }

  function enterHome() {
    if (reader.open || roomScene?.active) return;
    roomScene?.returnHome();
  }

  function finishArrival() {
    const end = entryFrame(ENTRANCE.duration);
    camera = { x: end.x, y: end.y, z: end.z, yaw: end.yaw, pitch: end.pitch, zoom: end.zoom };
    seedDockHistory(mode, camera, null);
    arrival = null;
    phase = 'idle';
    delete body.dataset.arrival;
    updateUI();
    homeButton.focus({ preventScroll: true });
  }

  function updateArrival(now) {
    if (!arrival) return;
    const frame = entryFrame(now - arrival.start);
    camera = { x: frame.x, y: frame.y, z: frame.z, yaw: frame.yaw, pitch: frame.pitch, zoom: frame.zoom };
    if (body.dataset.arrival !== frame.stage) body.dataset.arrival = frame.stage;
    if (frame.done) finishArrival();
  }

  function preflightRenderer() {
    // A single static preflight only warms cache hits. Exercise both changing
    // scenery passes before the first click needs their Canvas texture copies.
    if (roomScene?.active && !reducedMotion) for (const elapsed of [16, 32]) {
      const frame = entranceFrame(elapsed, width <= 760 ? .78 : 1);
      const settings = projectionSettings(frame);
      paintPaintedSky(ctx, width, height, frame, settings, { x: 0, y: 0, seconds: null, clarity: 0 });
      paintCloudVeil(ctx, width, height, frame, settings);
    }
    // Allocate the smaller background surfaces before interaction. The full
    // resolution sky is restored below, in the same task before any frame paints.
    for (const cap of [1, .75]) if (cap < renderBudget.current.environmentRatioCap) {
      setRenderQuality(cap);
      paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: 0, y: 0, seconds: null, clarity: 1 });
      paintCloudVeil(ctx, width, height, camera, projectionSettings());
    }
    setRenderQuality(renderBudget.current.environmentRatioCap);
    paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: 0, y: 0, seconds: null, clarity: 1 });
    if (body.dataset.domeRenderer !== 'webgl') throw new Error('WebGL could not prepare the starfield.');
    if (body.dataset.liveWindow !== 'ready') throw new Error('The window aperture could not be prepared.');
    paintCloudVeil(ctx, width, height, camera, projectionSettings());
    if (!canvas.width || !canvas.height) throw new Error('The starfield canvas has no drawable size.');
  }

  function drawScene(now) {
    ctx.clearRect(0, 0, width, height);
    const seconds = reducedMotion || !renderBudget.current.ambientMotion ? null : ambient.seconds;
    paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: ambient.x, y: ambient.y, seconds, clarity: 1, backgroundStride: renderBudget.current.backgroundStride });
    if (animationStarted && body.dataset.domeRenderer !== 'webgl') throw new Error('The starfield renderer stopped being available.');
    visibleStars.clear();
    projectedStars.clear();
    const showStars = !roomScene?.active && !arrival;
    // Titles and navigation are hidden for the whole passage. Measuring their
    // obstacles after camera style writes otherwise forces layout on every frame.
    const obstacles = showStars ? [...document.querySelectorAll('.masthead a, #exploration-controls:not([hidden]), #exploration-controls:not([hidden]) .mode-switch, #preview:not([hidden]), #signal-egg:not([hidden]), #search-entry:not([hidden])')]
      .map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height) : [];
    for (const item of articles) {
      const target = starTargets.get(item.id);
      const projected = project(positionOf(item));
      const point = projected && Number.isFinite(projected.x) && Number.isFinite(projected.y) ? projected : null;
      if (point) projectedStars.set(item.id, point);
      if (!showStars) {
        if (!target.hidden) target.hidden = true;
        target.classList.toggle('is-near-pointer', false);
        continue;
      }
      const hidden = !isStarReachable(point, width, height, obstacles);
      if (target.hidden !== hidden) target.hidden = hidden;
      const nearPointer = !hidden && labelPointer && !pointers.size && !travel && !reader.open && !egg.open && !collectionOpen &&
        (Math.hypot(point.x - labelPointer.x, point.y - labelPointer.y) <= 88 || target.matches(':hover'));
      target.classList.toggle('is-near-pointer', Boolean(nearPointer));
      if (!point) continue;
      if (!target.hidden) visibleStars.set(item.id, point);
      target.style.left = `${point.x}px`;
      target.style.top = `${point.y}px`;
      if (!target.hidden) {
        const label = target.firstElementChild;
        const placement = starLabelPlacement(point, width, obstacles);
        const onLeft = placement.side === 'left';
        label.style.left = onLeft ? 'auto' : '35px';
        label.style.right = onLeft ? '35px' : 'auto';
        label.style.maxWidth = `${placement.maxWidth}px`;
      }
    }
    drawNavigationGuides();
    const easeDt = Math.min(.05, (now - lastFrame) / 1000 || 0);
    for (const item of articles) {
      const point = (showStars ? visibleStars : projectedStars).get(item.id);
      const target = starTargets.get(item.id);
      // Hover and lock ease toward their targets every frame, offscreen too, so a
      // star never reappears mid-state. Reduced motion snaps.
      const state = starEase.get(item.id) || { hover: 0, lock: 0 };
      const hoverTarget = showStars && selected !== item.id &&
        (target.matches(':hover') || target.matches(':focus-visible')) ? 1 : 0;
      const lockTarget = showStars && selected === item.id && phase === 'settled' && !reader.open ? 1 : 0;
      state.hover = reducedMotion ? hoverTarget : approach(state.hover, hoverTarget, easeDt, hoverTarget ? 70 : 110);
      state.lock = reducedMotion ? lockTarget : approach(state.lock, lockTarget, easeDt, lockTarget ? 120 : 80);
      starEase.set(item.id, state);
      if (!point) continue;
      paintPaintedStar(ctx, point.x, point.y, item.id, {
        depth: point.depth / 3,
        active: state.lock,
        hover: state.hover,
        zoom: 1,
        importance: item.importance,
        seconds,
      });
      if (selected === item.id) starMotion.paintFocus(ctx, point);
    }
    paintCloudVeil(ctx, width, height, camera, projectionSettings());
    clouds?.update(Math.min(.05, (now - lastFrame) / 1000 || 0), Boolean(reader.open || arrival || roomScene?.active || egg.open));
    clouds?.paint(ctx, width, height, camera, projectionSettings());
  }

  function drawNavigationGuides() {
    if (roomScene?.active || arrival || reader.open || collectionOpen || articleSearch?.isOpen) {
      edgeGuide.present(null);
      return;
    }
    const box = { left: 28, right: width - 28, top: 100, bottom: height - 85 };
    const edges = mode === 'time' ? timeEdges : navigationEdges;
    const painted = [];
    const hints = [];
    ctx.save();
    ctx.globalAlpha = lineOpacity;
    ctx.setLineDash([2.5, 7]);
    ctx.lineWidth = .9;
    for (const [left, right] of edges) {
      const a = projectedStars.get(left), b = projectedStars.get(right);
      if (!a || !b) continue;
      const line = clipSegment(a, b, box);
      if (!line || Math.hypot(line.a.x - line.b.x, line.a.y - line.b.y) < 24) continue;
      if (painted.some(other => crosses(line.a, line.b, other.a, other.b))) continue;
      ctx.strokeStyle = selected ? '#c8d8e611' : '#c8d8e65c';
      drawGuideLine(line.a, line.b);
      painted.push(line);
      if (line.hi < 1 && line.lo === 0) hints.push({ point: line.b, id: right });
      if (line.lo > 0 && line.hi === 1) hints.push({ point: line.a, id: left });
    }
    if (selected && mode === 'relation') {
      ctx.setLineDash([]); ctx.lineWidth = 1.15; ctx.strokeStyle = '#d9e8f479';
      const origin = visibleStars.get(selected);
      if (origin) for (const relation of relationsByArticle.get(selected) || []) {
        const target = projectedStars.get(relation.articleId);
        if (target) drawGuideLine(origin, target);
      }
    }
    ctx.restore();
    const visible = [...starTargets.values()].some(target => !target.hidden);
    const hint = hints[0];
    if (phase === 'moving' || lineOpacity < .5) {
      edgeGuide.present(null);
      return;
    }
    let guideState = null;
    if (hint && !selected) {
      const obstacles = [...document.querySelectorAll('#world nav,#world nav .mode-switch,#world header,#preview,.signal-egg,#search-entry')].filter(el => !el.hidden).map(el => el.getBoundingClientRect());
      if (!obstacles.some(rect => hint.point.x + 24 > rect.left && hint.point.x - 24 < rect.right && hint.point.y + 24 > rect.top && hint.point.y - 24 < rect.bottom)) {
        guideState = { left: hint.point.x + 'px', top: hint.point.y + 'px', text: '›', articleId: hint.id };
      }
    } else if (!visible && articles.length) {
      const target = articles.reduce((nearest, item) => {
        const point = positionOf(item), ray = direction(camera.yaw, camera.pitch);
        const score = (point.x * ray.x + point.y * ray.y + point.z * ray.z) / Math.hypot(point.x, point.y, point.z);
        return !nearest || score > nearest.score ? { item, score } : nearest;
      }, null).item;
      guideState = { left: '50%', top: 'calc(100% - 110px)', text: '✧', articleId: target.id };
    }
    edgeGuide.present(guideState);
  }

  function drawGuideLine(origin, target) {
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(target.x, target.y); ctx.stroke();
  }

  function openNote(title, copy) {
    document.getElementById('egg-title').textContent = title;
    document.getElementById('egg-copy').textContent = copy;
    egg.showModal();
  }

  function showTimeCue(item) {
    const cue = document.getElementById('time-cue');
    const [year, month] = item.date.split('-');
    cue.textContent = year + ' 年 ' + Number(month) + ' 月';
    cue.hidden = false; cue.style.animation = 'none'; void cue.offsetWidth; cue.style.animation = '';
    timeCueUntil = performance.now() + 3000;
  }

  function animate(now) {
    try {
      const renderStart = performance.now();
      if (renderQualityPending) {
        applyRenderQuality();
        renderQualityPending = false;
      }
      if (travel) {
        const currentTravel = travel;
        const t = Math.min(1, (now - currentTravel.start) / currentTravel.duration);
        camera = interpolate(currentTravel.from, currentTravel.to, smooth(t));
        if (currentTravel.kind === 'selection' || currentTravel.kind === 'mode-switch') starMotion.setApproach(t);
        if (t >= 1) {
          travel = null;
          if (currentTravel.kind === 'return') {
            dockCursorByMode.set(currentTravel.layout, currentTravel.returnIndex);
            phase = selected ? 'settled' : 'idle';
          } else if (currentTravel.kind === 'mode-start' || currentTravel.kind === 'look') {
            seedDockHistory(currentTravel.layout, camera, null);
            phase = 'idle';
          } else {
            phase = 'settled';
            appendDockStop(currentTravel.layout, camera, selected);
          }
          updateUI();
          if (currentTravel.kind === 'selection' || currentTravel.kind === 'mode-switch' || currentTravel.kind === 'return') {
            announce(currentTravel.kind === 'return' ? '已返回上一个停靠点。' : '已经靠近。再次点选这颗星，或使用阅读按钮打开正文。');
          }
        }
      }
      updateArrival(now);
      if (!roomScene?.active && !arrival) limitCamera();
      if (foregroundQualityPending && !cameraIsMoving()) applyRenderQuality();
      const delta = lastFrame ? Math.min(50, now - lastFrame) : 16;
      const moving = lastCamera && (Math.abs(camera.yaw - lastCamera.yaw) + Math.abs(camera.pitch - lastCamera.pitch) + Math.abs(camera.zoom - lastCamera.zoom) > .01);
      lineOpacity += ((moving || travel || pointers.size ? 0 : 1) - lineOpacity) * Math.min(1, delta / (moving ? 100 : 380));
      lastCamera = { ...camera };
      const journalOpen = body.dataset.journalOpen === 'true';
      if (!reader.open && !egg.open && !journalOpen && !roomScene?.active && !articleSearch?.isOpen && !reducedMotion) ambient.seconds += delta / 1000;
      ambient.x += (ambient.targetX - ambient.x) * .035;
      ambient.y += (ambient.targetY - ambient.y) * .035;
      // Sky/cloud motion already pauses at the window and while reading. Keep
      // that frame until a resize, transition or meteor changes it. CSS micro-motion continues.
      const staticScene = !travel && !arrival && !meteors.length &&
        (journalOpen || articleSearch?.isOpen || (reader.open && body.dataset.reading === 'open') || (roomScene?.active && body.dataset.room === 'inside'));
      if (!staticScene || !restingFrameDrawn) drawScene(now);
      restingFrameDrawn = Boolean(staticScene);
      polyhedron.render(now, !reducedMotion && !document.hidden && !journalOpen && !roomScene?.active && !reader.open && !articleSearch?.isOpen);
      articleSearch?.update(now, !journalOpen && !roomScene?.active && !arrival && !reader.open && !collectionOpen && !egg.open);
      // The low sky budget must not freeze the selected article's walking and frequency artwork.
      observationPanel.render(now, !preview.hidden && !reducedMotion &&
        !document.hidden && !journalOpen && !roomScene?.active && !reader.open && !egg.open && !collectionOpen && !arrival);
      // Keep the gait alive while reading; scrolling controls its position separately.
      readingWalker.render(now, reader.open && phase === 'reading' &&
        !readingMotionPreference.matches && !document.hidden);
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i], age = (now - meteor.start) / 1800;
        if (age > 1) { meteors.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(187,213,239,${Math.sin(age * Math.PI) * .65})`;
        ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(meteor.x + age * width * .22, meteor.y + age * height * .16);
        ctx.lineTo(meteor.x + age * width * .22 - 55, meteor.y + age * height * .16 - 30); ctx.stroke();
      }
      if (timeCueUntil && now > timeCueUntil) document.getElementById('time-cue').hidden = true;
      starMotion.tick(now);
      const canSample = !reader.open && !egg.open && !articleSearch?.isOpen && !document.hidden;
      const movingScene = cameraIsMoving();
      const drawingOverloaded = canSample && renderBudget.sample(performance.now() - renderStart);
      const presentationOverloaded = renderBudget.sampleFrame(canSample && lastFrame ? now - lastFrame : 0, movingScene);
      // Resize at the beginning of the next draw. Clearing the canvas after this
      // frame was painted would expose an empty sky until the following RAF.
      if (drawingOverloaded || presentationOverloaded) renderQualityPending = true;
      lastFrame = now;
      requestAnimationFrame(animate);
    } catch (error) {
      fallback(error);
    }
  }

  function updateProgress() {
    if (!reader.open || phase !== 'reading') return;
    const content = reader.querySelector('#reader-content');
    if (!content) return;
    const articleNode = content.closest('.article[data-starry-id]');
    const articleId = articleNode?.dataset.starryId;
    const end = content.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    const scrollTop = scroller.scrollTop;
    const progress = readingProgress({
      scrollTop,
      contentBottom: end.bottom - viewport.top + scrollTop,
      viewportHeight: scroller.clientHeight,
    });
    // Scope the scrolling paper to the footer, and avoid repainting it while reading is idle.
    const paperWidth = `${scroller.clientWidth}px`;
    const paperOffset = `${-scrollTop - viewport.height}px`;
    if (readingFooter.style.getPropertyValue('--reading-paper-width') !== paperWidth) readingFooter.style.setProperty('--reading-paper-width', paperWidth);
    if (readingFooter.style.getPropertyValue('--reading-paper-offset') !== paperOffset) readingFooter.style.setProperty('--reading-paper-offset', paperOffset);
    const { complete, fraction, percent } = progress;
    if (complete && articleId) readArticleIds.add(articleId);
    const revealed = Boolean(articleId && readArticleIds.has(articleId));
    const hasReasons = (relationsByArticle.get(articleId) || []).some((relation) => relation.reason);
    renderReadingRelations(articleNode, revealed);
    journey.style.setProperty('--reading-fraction', fraction);
    journey.setAttribute('aria-valuenow', String(percent));
    journey.setAttribute('aria-valuetext', complete ? '已到文末，100%' : `已阅读 ${percent}%`);
    setText(document.getElementById('reading-progress'), `${percent}%`);
    setText(document.getElementById('reading-state'), complete
      ? (revealed && hasReasons ? '已到文末 · 关联理由已显露' : '已到文末')
      : '沿着文字，慢慢往下');
  }

  function renderReadingRelations(articleNode, revealed) {
    const section = articleNode?.querySelector('.reading-relations');
    if (!section) return;
    const articleId = articleNode.dataset.starryId;
    const authored = relationsByArticle.get(articleId) || [];
    const hidden = !revealed || authored.length === 0;
    if (section.hidden !== hidden) section.hidden = hidden;
    if (section.hidden) return;
    if (section.dataset.renderedArticleId === articleId) return;

    const heading = document.createElement('h2');
    heading.textContent = '相连的文章';
    const list = document.createElement('ul');
    for (const relation of authored) {
      const targetArticle = articleById.get(relation.articleId);
      if (!targetArticle) continue;
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = targetArticle.title;
      const reason = document.createElement('p');
      reason.textContent = relation.reason;
      const link = document.createElement('a');
      link.className = 'reading-relation-link';
      link.dataset.starryArticleId = targetArticle.id;
      link.href = localArticleUrl(targetArticle).pathname;
      link.textContent = `继续阅读《${targetArticle.title}》 ↗`;
      item.append(title);
      if (relation.reason) item.append(reason);
      item.append(link);
      list.append(item);
    }
    section.replaceChildren(heading, list);
    section.dataset.renderedArticleId = articleId;
  }

  function wireControls() {
    document.addEventListener('visibilitychange', () => { restingFrameDrawn = false; });
    document.getElementById('brand').addEventListener('click', event => { event.preventDefault(); enterHome(); });
    document.getElementById('close-egg').addEventListener('click', () => egg.close());
    document.getElementById('signal-egg').addEventListener('click', () => {
      meteors.push({ x: width * .58, y: height * .17, start: performance.now() });
      announce('远方划过一点微光。');
    });
    document.getElementById('deselect').addEventListener('click', () => {
      interrupt(); selected = null; phase = 'idle'; starMotion.clearSelection(); updateUI();
    });
    document.getElementById('close-reader').addEventListener('click', () => {
      if (isDirectEntry && !internalArticleHistory) closeReaderFromDirect();
      else closeReaderThroughHistory();
    });
    reader.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (isDirectEntry && !internalArticleHistory) closeReaderFromDirect();
      else closeReaderThroughHistory();
    });
    reader.addEventListener('click', (event) => {
      if (event.target === reader && isDirectEntry && !internalArticleHistory) closeReaderFromDirect();
      else if (event.target === reader && internalArticleHistory) closeReaderThroughHistory();
    });
    readButton.addEventListener('click', () => { void openReaderFromStar(); });
    relationModeButton.addEventListener('click', () => switchMode('relation'));
    timeModeButton.addEventListener('click', () => switchMode('time'));
    backDockButton.addEventListener('click', returnToPreviousDock);
    homeButton.addEventListener('click', enterHome);
    document.getElementById('close-collection').addEventListener('click', closeCollectionPanel);
    collectionDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeCollectionPanel();
    });
    collectionSlot.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-starry-article-id]');
      if (!link || !articleById.has(link.dataset.starryArticleId)) return;
      event.preventDefault();
      void openReaderFromCollection(link.dataset.starryArticleId, link);
    });
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    // Images, fonts and player expansion can change the end position without a scroll.
    const readingResize = new ResizeObserver(updateProgress);
    readingResize.observe(readerSlot);
    readingResize.observe(scroller);
    scroller.addEventListener('click', event => {
      const adjacent = event.target.closest('.article-pagination-link[data-starry-article-id]');
      if (adjacent && reader.open && articleById.has(adjacent.dataset.starryArticleId)
        && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        void openAdjacentArticle(adjacent.dataset.starryArticleId, adjacent.closest('.article-pagination'));
        return;
      }
      const link = event.target.closest('.reading-relation-link[data-starry-article-id]');
      const target = link && articleById.get(link.dataset.starryArticleId);
      if (!reader.open || !target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      stopEmbeddedAudio(); phase = 'closing';
      starMotion.close(() => {
        reader.close(); collectionOpen = false; collectionDialog.close();
        articleSearch?.abandon();
        readingSnapshot = null; internalArticleHistory = false;
        history.replaceState({ starryView: 'sky', mode }, '', body.dataset.starryRoot);
        window.blogThemeSwitch?.refresh();
        phase = 'settled'; updateUI(); activateStar(target.id);
      }, project(positionOf(article)));
    });
    window.addEventListener('resize', () => {
      resize();
      starMotion.resize();
      if (reader.open) updateProgress();
    });
    window.addEventListener('popstate', (event) => {
      if (event.state?.mode === 'relation' || event.state?.mode === 'time') mode = event.state.mode;
      if (reader.open && event.state?.starryView === 'reader' && event.state.starryArticleId) {
        void openReaderFromHistory(event.state.starryArticleId);
      } else if (reader.open) closeReaderAfterPop();
      else if (event.state?.starryView === 'reader' && event.state.starryArticleId) {
        void openReaderFromHistory(event.state.starryArticleId);
      } else if (event.state?.starryView === 'collection') {
        openCollectionPanel();
      }
    });

    world.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        if (body.dataset.starInput !== event.pointerType) body.dataset.starInput = event.pointerType;
        labelPointer = !event.buttons && (event.target === canvas || event.target.closest('.star-target'))
          ? { x: event.clientX, y: event.clientY } : null;
      }
      if (event.pointerType === 'mouse' && !event.buttons && !roomScene?.active && !reader.open && !articleSearch?.isOpen) {
        ambient.targetX = clamp((event.clientX / width) * 2 - 1, -1, 1);
        ambient.targetY = clamp((event.clientY / height) * 2 - 1, -1, 1);
      }
      clouds?.hover(event.clientX, event.clientY, !pointers.size && !travel && !reader.open && !roomScene?.active);
      if (!pointers.has(event.pointerId)) return;
      const previous = pointers.get(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!gestureMoved && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) {
        gestureMoved = true;
        interrupt();
      }
      if (!gestureMoved) return;
      if (pointers.size >= 2) interrupt();
      if (pointers.size >= 2) {
        const points = [...pointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        moveForward((distance - previousPinch) * 4);
        previousPinch = distance;
      } else if (!multiTouch) {
        const sensitivity = Math.sqrt(Math.min(camera.zoom, 1 / camera.zoom));
        camera.yaw -= (event.clientX - previous.x) * .003 * sensitivity;
        camera.pitch = clamp(camera.pitch + (event.clientY - previous.y) * .0025 * sensitivity, 0, Math.PI / 2);
        limitCamera();
        if (selected) phase = 'selected';
      }
    });
    world.addEventListener('pointerdown', (event) => {
      body.dataset.starInput = event.pointerType;
      if (event.pointerType === 'touch') labelPointer = null;
      if (roomScene?.active || reader.open || articleSearch?.isOpen || event.target.closest('.star-target') || event.target !== canvas) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      world.setPointerCapture(event.pointerId);
      if (pointers.size === 1) {
        press = { x: event.clientX, y: event.clientY, start: performance.now() };
        gestureMoved = false;
        multiTouch = false;
      } else {
        multiTouch = true;
        gestureMoved = true;
        const points = [...pointers.values()];
        previousPinch = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      }
    });
    world.addEventListener('pointerup', (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (!gestureMoved && !multiTouch && !roomScene?.active) {
        const hit = [...visibleStars.entries()].find(([, point]) => Math.hypot(point.x - event.clientX, point.y - event.clientY) < 26);
        if (hit) activateStar(hit[0]);
        else if (!(press && performance.now() - press.start < 500 && clouds?.tap(event.clientX, event.clientY))) {
          interrupt();
          selected = null;
          phase = 'idle';
          starMotion.clearSelection();
          updateUI();
        }
      }
      if (!pointers.size) { press = null; updateUI(); }
    });
    world.addEventListener('pointercancel', (event) => {
      pointers.delete(event.pointerId);
      gestureMoved = true;
      press = null;
    });
    world.addEventListener('pointerleave', () => {
      labelPointer = null;
      ambient.targetX = 0;
      ambient.targetY = 0;
      clouds?.clearHover();
    });
    world.addEventListener('wheel', (event) => {
      if (roomScene?.active || reader.open || articleSearch?.isOpen || event.target.closest('#preview, dialog')) return;
      event.preventDefault();
      interrupt();
      moveForward(Math.max(-600, Math.min(600, -event.deltaY * .8)));
    }, { passive: false });
    document.addEventListener('keydown', (event) => {
      if (body.dataset.journalOpen === 'true' || reader.open || egg.open || roomScene?.active || collectionOpen || articleSearch?.isOpen || event.target.closest('input, textarea, select, [contenteditable], #preview')) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); interrupt();
        camera.yaw += event.key === 'ArrowLeft' ? -.09 : event.key === 'ArrowRight' ? .09 : 0;
        camera.pitch = clamp(camera.pitch + (event.key === 'ArrowUp' ? .065 : event.key === 'ArrowDown' ? -.065 : 0), 0, Math.PI / 2);
        limitCamera();
        if (selected) phase = 'selected';
        updateUI();
        return;
      }
      if (event.key === 'Escape' && selected) {
        selected = null;
        phase = 'idle';
        starMotion.clearSelection();
        updateUI();
      }
    });
  }

  function moveForward(amount) {
    camera.zoom = clamp(camera.zoom * Math.exp(amount * .0011), MIN_SKY_ZOOM, 2.8);
    const distance = clamp((camera.zoom - 1) * 1100, 0, 1200);
    const ray = direction(camera.yaw, camera.pitch, distance);
    camera.x = ray.x; camera.y = ray.y; camera.z = ray.z;
    limitCamera();
    if (selected) phase = 'selected';
    updateUI();
  }

  function localArticleUrl(item) {
    const root = new URL(body.dataset.starryRoot, location.origin);
    const rootPath = root.pathname.endsWith('/') ? root.pathname : `${root.pathname}/`;
    const originalPath = new URL(item.url, location.origin).pathname;
    const siteRelativePath = originalPath.startsWith(rootPath)
      ? originalPath.slice(rootPath.length)
      : originalPath.replace(/^\/+/, '');
    return new URL(siteRelativePath, root);
  }

  async function loadArticleNode(item) {
    void prepareReaderArt(item.title);
    const url = localArticleUrl(item);
    const pageResponse = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!pageResponse.ok) throw new Error(`Article request failed: ${pageResponse.status}`);
    const html = await pageResponse.text();
    const documentCopy = new DOMParser().parseFromString(html, 'text/html');
    if (documentCopy.body.dataset.starryArticleId !== item.id) throw new Error('The article page did not match the starfield index.');
    const node = documentCopy.querySelector(`#static-article-fallback .article[data-starry-id="${CSS.escape(item.id)}"]`);
    if (!node) throw new Error('The static article body is missing.');
    return document.importNode(node, true);
  }

  function waitForImage(image) {
    if (!image) return Promise.reject(new Error('The room illustration is missing.'));
    if (image.complete) return image.naturalWidth > 0 ? Promise.resolve(image) : Promise.reject(new Error(`Could not load room image: ${image.currentSrc || image.src}`));
    return new Promise((resolve, reject) => {
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', () => reject(new Error(`Could not load room image: ${image.currentSrc || image.src}`)), { once: true });
    });
  }

  function interpolate(from, to, progress) {
    const value = (a, b) => a + (b - a) * progress;
    return {
      x: value(from.x, to.x), y: value(from.y, to.y), z: value(from.z, to.z),
      yaw: value(from.yaw, to.yaw), pitch: value(from.pitch, to.pitch), zoom: value(from.zoom, to.zoom),
    };
  }
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function fallback(error) {
  window.starfieldStartup?.fail();
  if (error) console.error('Starfield enhancement stayed in the readable fallback.', error);
  stopEmbeddedAudio();
  const articleNode = document.querySelector('#reader .article[data-starry-id], #static-article-fallback .article[data-starry-id]');
  let staticArticle = document.getElementById('static-article-fallback');
  if (articleNode) {
    if (!staticArticle) {
      staticArticle = document.createElement('main');
      staticArticle.id = 'static-article-fallback'; staticArticle.className = 'static-article-fallback';
      document.body.append(staticArticle);
    }
    staticArticle.replaceChildren(articleNode);
    document.getElementById('home-fallback')?.setAttribute('hidden', '');
    void prepareEmbeddedPlayer(articleNode);
  }
  document.getElementById('reader')?.open && document.getElementById('reader').close();
  document.getElementById('star-search')?.open && document.getElementById('star-search').close();
  document.body.classList.remove('starry-ready');
  document.getElementById('world').hidden = true;
  document.getElementById('room').hidden = true;
}

function stopEmbeddedAudio() {
  for (const player of window.aplayers || []) {
    try { player.pause(); } catch {}
  }
  const reader = document.getElementById('reader');
  for (const media of reader?.querySelectorAll('audio, video') || []) {
    try { media.pause(); } catch {}
  }
  for (const button of reader?.querySelectorAll('.aplayer-button.aplayer-pause') || []) {
    button.click();
  }
}
