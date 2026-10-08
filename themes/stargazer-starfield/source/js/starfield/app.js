import { prepareEmbeddedPlayer } from './audio.js';
import { createInteractiveClouds } from './interactive-clouds.js';
import { createRoom, paintCloudVeil, paintPaintedSky, paintPaintedStar, preparePaintedScene } from './painted.js';
import { HOME_ELEVATION, MIN_SKY_ZOOM, clamp, domeDestination, direction, domePosition, projectDome } from './dome.js';
import { createStarMotion, ENTRANCE, entranceFrame, returnFrame, smooth } from './motion.js';
import { dockTarget } from './experience.js';
import { buildPaths, buildTimePaths, clipSegment, crosses } from './navigation.js';
import { createRenderBudget } from './render-budget.js';
import { setRenderQuality } from './dome-renderer.js';
import { isStarReachable, starLabelPlacement } from './star-targets.js';
import { createObservationPanel } from './observation.js';
import { createPolyhedron } from './polyhedron.js';

const body = document.body;
const world = document.getElementById('world');
if (world) start().catch(fallback);

async function start() {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');

  const reader = document.getElementById('reader');
  const scroller = document.getElementById('reading-scroll');
  const readerSlot = document.getElementById('reading-content-slot');
  const preview = document.getElementById('preview');
  const observationPanel = createObservationPanel(preview);
  const polyhedron = createPolyhedron(document.querySelector('.sky-polyhedron'));
  const status = document.getElementById('approach-status');
  const readButton = document.getElementById('read-button');
  const controls = document.getElementById('exploration-controls');
  const relationModeButton = document.getElementById('relation-mode');
  const timeModeButton = document.getElementById('time-mode');
  const backDockButton = document.getElementById('back-dock');
  const homeButton = document.getElementById('home');
  const targetLayer = document.getElementById('star-targets');
  const directId = body.dataset.starryArticleId;
  const isDirectEntry = Boolean(directId);
  const collectionKind = body.dataset.starryCollectionKind || '';
  const isDirectCollection = Boolean(collectionKind);
  const collectionMode = collectionKind === 'archive' ? 'time' : 'relation';
  const collectionPath = body.dataset.starryCollectionPath || location.pathname;
  const staticCollection = document.getElementById('static-collection-fallback');
  const collectionFirstId = staticCollection?.querySelector('[data-starry-article-id]')?.dataset.starryArticleId || '';
  const collectionDialog = document.getElementById('collection-panel');
  const collectionSlot = document.getElementById('collection-content-slot');
  const fallbackArticle = document.querySelector('#static-article-fallback .article[data-starry-id]');
  const previewMemory = { camera: null, selected: null, phase: 'idle' };
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
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
  let visibleStars = new Map();
  const projectedStars = new Map();
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
  let animationStarted = false;
  let navigationEdges = [];
  let timeCueUntil = 0;
  let lineOpacity = 1;
  let lastCamera = null;
  let lastFrame = 0;
  let restingFrameDrawn = false;
  const meteors = [];
  const egg = document.getElementById('egg-dialog');
  const renderBudget = createRenderBudget(navigator);
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
  await preparePaintedScene();
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
    startOutside: isDirectEntry || isDirectCollection,
    onEnter(startTime) {
      const first = entranceFrame(0, width <= 760 ? .78 : 1);
      camera = { ...first };
      if (reducedMotion) arrival = null;
      else arrival = { start: startTime };
      phase = 'entering';
      body.dataset.arrival = 'passage';
    },
    onProgress(progress) {
      if (!reducedMotion) return;
      const from = entranceFrame(0, width <= 760 ? .78 : 1);
      const to = entranceFrame(ENTRANCE.duration, width <= 760 ? .78 : 1);
      camera = interpolate(from, to, smooth(progress));
    },
    onEntered() {
      if (reducedMotion) finishArrival();
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
      body.style.setProperty('--entry-bank', `${reducedMotion ? 0 : camera.bank}rad`);
      body.style.setProperty('--entry-scale', String(reducedMotion ? 1 : 1 + Math.abs(camera.bank || 0) * Math.max(width / height, height / width) * 1.1));
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
      body.style.removeProperty('--entry-bank');
      body.style.removeProperty('--entry-scale');
      seedDockHistory('relation', camera, null);
      seedDockHistory('time', camera, null);
      replaceViewState(mode);
      updateUI();
    },
    onJournal() {
      openNote('灯还亮着。', '这一页还没有写完。\n\n窗外的星星里，放着一些日常、念头和未眠时写下的文字。');
    },
    onMotion(value) {
      restingFrameDrawn = false;
      reducedMotion = value;
      const motionButton = document.getElementById('motion-toggle');
      motionButton.textContent = value ? '轻过渡' : '镜头推进';
      motionButton.setAttribute('aria-pressed', String(value));
      motionButton.setAttribute('aria-label', value ? '开启镜头推进动画' : '减少镜头动画');
      if (body.dataset.room === 'inside') body.style.setProperty('--sky-clarity', value ? '1' : '0');
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
  wireControls();
  updateUI();
  preflightRenderer();

  body.classList.add('starry-ready');
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
  }

  function applyRenderQuality() {
    const quality = renderBudget.current;
    body.dataset.renderQuality = quality.tier;
    setRenderQuality(quality.environmentRatioCap);
    dpr = Math.min(devicePixelRatio || 1, quality.pixelRatioCap);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function projectionSettings() {
    return {
      cx: width * (width <= 760 ? .56 : .5),
      cy: height * (width <= 760 ? .49 : .46),
      focal: Math.min(width, height * 1.2) * 1.05 * (camera.zoom || 1),
    };
  }

  function project(point) {
    return projectDome(point, camera, projectionSettings());
  }

  function positionOf(targetArticle, layout = mode) {
    return layout === 'time' ? timePositionById.get(targetArticle.id) : targetArticle.position;
  }

  function defaultArticleForMode(layout) {
    return layout === 'time'
      ? (timeOrderedArticles[0] || articles[0] || null)
      : (articleById.get(index.featuredArticleId) || articles[0] || null);
  }

  function focusCamera(targetArticle, layout = mode) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return domeDestination(positionOf(targetArticle, layout), camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, { x: width * .40, y: height * .42 });
  }

  function destination(targetArticle, layout = mode) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return domeDestination(positionOf(targetArticle, layout), camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, dockTarget(width, height, preview.getBoundingClientRect()));
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
    preview.hidden = !isSelected || reader.open;
    controls.hidden = Boolean(roomScene?.active) || reader.open || collectionOpen;
    relationModeButton.setAttribute('aria-pressed', String(mode === 'relation'));
    timeModeButton.setAttribute('aria-pressed', String(mode === 'time'));
    relationModeButton.disabled = Boolean(arrival || phase === 'loading');
    timeModeButton.disabled = Boolean(arrival || phase === 'loading');
    backDockButton.disabled = !canReturnToDock();
    if (isSelected) {
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
    document.getElementById('gesture-help').textContent = width <= 760 ? '单指巡视 · 双指前行 · 点星靠近' : '拖动巡视 · 滚轮前行 · 点星靠近';
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
      articleNodes.set(targetArticle.id, node);
      if (selected !== targetArticle.id || reader.open) return;
      readingSnapshot = { camera: { ...camera }, selected, articleId: article?.id, phase: 'settled', mode };
      readerTrigger = starTargets.get(targetArticle.id) || document.activeElement;
      readerSlot.replaceChildren(node);
      internalArticleHistory = true;
      history.pushState({ starryView: 'reader', starryArticleId: targetArticle.id, mode }, '', localArticleUrl(targetArticle).pathname);
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
      showReader(project(positionOf(targetArticle)));
      void prepareEmbeddedPlayer(node);
    } catch (error) {
      announce('这篇文章暂时无法加载；仍停留在当前清单与地址。');
      console.warn(`Collection article "${id}" could not be opened.`, error);
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
    stopEmbeddedAudio();
    directCloseInProgress = true;
    phase = 'closing';
    starMotion.close(() => {
      reader.close();
      directCloseInProgress = false;
      internalArticleHistory = false;
      history.replaceState({ starryView: 'sky', mode }, '', body.dataset.starryRoot);
      phase = 'settled';
      selected = article.id;
      updateUI();
      starTargets.get(article.id)?.focus({ preventScroll: true });
    }, project(positionOf(article)));
  }

  function closeReaderThroughHistory() {
    if (!reader.open || !internalArticleHistory) return;
    history.back();
  }

  function closeReaderAfterPop() {
    if (!reader.open) return;
    historyNavigationVersion += 1;
    stopEmbeddedAudio();
    const returnToCollection = Boolean(readingSnapshot?.collectionOpen);
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
    const activeCollectionTrigger = openingFromCollection
      ? document.activeElement.closest?.('a[data-starry-article-id]')
      : null;
    try {
      const node = articleNodes.get(id) || await articleLoads.get(id) || await loadArticleNode(targetArticle);
      if (requestVersion !== historyNavigationVersion || history.state?.starryArticleId !== id) return;
      articleNodes.set(id, node);
      if (!readingSnapshot && !wasOpen) readingSnapshot = {
        camera: { ...camera },
        selected,
        articleId: article?.id,
        phase: selected ? 'settled' : 'idle',
        mode,
        collectionOpen: openingFromCollection,
      };
      if (openingFromCollection) {
        collectionTrigger = activeCollectionTrigger || collectionTrigger;
        readerTrigger = collectionTrigger;
        collectionOpen = false;
        collectionDialog.close();
      }
      article = targetArticle;
      selected = id;
      phase = 'reading';
      readerSlot.replaceChildren(node);
      internalArticleHistory = true;
      showReader(project(positionOf(targetArticle)));
      void prepareEmbeddedPlayer(node);
    } catch (error) {
      if (requestVersion !== historyNavigationVersion || history.state?.starryArticleId !== id) return;
      restoreAddressForDisplayedContent();
      announce('这篇文章暂时无法加载；仍保留当前可读内容与对应地址。');
      console.warn(`History article "${id}" could not be opened.`, error);
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
    internalArticleHistory = Boolean(displayingArticle);
  }

  function switchMode(nextMode) {
    if (nextMode === mode || reader.open || arrival || roomScene?.active) return;
    const hasSelection = Boolean(selected && articleById.has(selected));
    const selectedArticle = hasSelection ? articleById.get(selected) : null;
    const defaultArticle = defaultArticleForMode(nextMode);
    if (!defaultArticle) return;
    interrupt();
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
    const end = entranceFrame(ENTRANCE.duration, width <= 760 ? .78 : 1);
    camera = { x: end.x, y: end.y, z: end.z, yaw: end.yaw, pitch: end.pitch, zoom: end.zoom };
    seedDockHistory(mode, camera, null);
    arrival = null;
    phase = 'idle';
    delete body.dataset.arrival;
    body.style.removeProperty('--entry-bank');
    body.style.removeProperty('--entry-scale');
    updateUI();
    homeButton.focus({ preventScroll: true });
  }

  function updateArrival(now) {
    if (!arrival) return;
    const frame = entranceFrame(now - arrival.start, width <= 760 ? .78 : 1);
    camera = { x: frame.x, y: frame.y, z: frame.z, yaw: frame.yaw, pitch: frame.pitch, zoom: frame.zoom };
    body.dataset.arrival = frame.stage;
    body.style.setProperty('--entry-bank', `${frame.bank}rad`);
    body.style.setProperty('--entry-scale', String(1 + Math.abs(frame.bank) * Math.max(width / height, height / width) * 1.1));
    if (frame.done) finishArrival();
  }

  function preflightRenderer() {
    paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: 0, y: 0, seconds: null, clarity: 1 });
    if (body.dataset.domeRenderer !== 'webgl') throw new Error('WebGL could not prepare the starfield.');
    if (body.dataset.liveWindow !== 'ready') throw new Error('The window aperture could not be prepared.');
    paintCloudVeil(ctx, width, height, camera, projectionSettings());
    if (!canvas.width || !canvas.height) throw new Error('The starfield canvas has no drawable size.');
  }

  function drawScene(now) {
    ctx.clearRect(0, 0, width, height);
    const seconds = reducedMotion || !renderBudget.current.ambientMotion ? null : ambient.seconds;
    const clarity = arrival ? entranceFrame(now - arrival.start).clarity : 1;
    if (body.style.getPropertyValue('--sky-clarity') !== String(clarity)) body.style.setProperty('--sky-clarity', String(clarity));
    paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: ambient.x, y: ambient.y, seconds, clarity, backgroundStride: renderBudget.current.backgroundStride });
    if (animationStarted && body.dataset.domeRenderer !== 'webgl') throw new Error('The starfield renderer stopped being available.');
    visibleStars.clear();
    projectedStars.clear();
    const obstacles = [...world.querySelectorAll('.masthead a, #exploration-controls:not([hidden]), #preview:not([hidden]), #signal-egg:not([hidden])')]
      .map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height);
    for (const item of articles) {
      const projected = project(positionOf(item));
      const point = projected && Number.isFinite(projected.x) && Number.isFinite(projected.y) ? projected : null;
      const target = starTargets.get(item.id);
      const hidden = Boolean(!isStarReachable(point, width, height, obstacles) || roomScene?.active || arrival);
      if (target.hidden !== hidden) target.hidden = hidden;
      if (!point) continue;
      projectedStars.set(item.id, point);
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
    for (const item of articles) {
      const point = visibleStars.get(item.id);
      if (!point) continue;
      const target = starTargets.get(item.id);
      paintPaintedStar(ctx, point.x, point.y, item.id, {
        depth: point.depth / 3,
        active: false,
        hover: selected !== item.id && target.matches(':hover'),
        zoom: .62 + .38 * clarity,
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
    const guide = document.getElementById('edge-guide');
    guide.hidden = true;
    if (roomScene?.active || arrival || reader.open || collectionOpen) return;
    const box = { left: 28, right: width - 28, top: 100, bottom: height - 85 };
    const edges = mode === 'time' ? buildTimePaths(timeOrderedArticles) : navigationEdges;
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
    if (phase === 'moving' || lineOpacity < .5) return;
    if (hint && !selected) {
      const obstacles = [...world.querySelectorAll('nav,header,#preview,.signal-egg')].filter(el => !el.hidden).map(el => el.getBoundingClientRect());
      if (!obstacles.some(rect => hint.point.x + 24 > rect.left && hint.point.x - 24 < rect.right && hint.point.y + 24 > rect.top && hint.point.y - 24 < rect.bottom)) {
        guide.style.left = hint.point.x + 'px'; guide.style.top = hint.point.y + 'px';
        guide.style.transform = 'translate(-50%,-50%)'; guide.textContent = '›';
        guide.onclick = () => activateStar(hint.id); guide.hidden = false;
      }
    } else if (!visible && articles.length) {
      const target = articles.reduce((nearest, item) => {
        const point = positionOf(item), ray = direction(camera.yaw, camera.pitch);
        const score = (point.x * ray.x + point.y * ray.y + point.z * ray.z) / Math.hypot(point.x, point.y, point.z);
        return !nearest || score > nearest.score ? { item, score } : nearest;
      }, null).item;
      guide.style.left = '50%'; guide.style.top = 'calc(100% - 110px)';
      guide.style.transform = 'translate(-50%,-50%)'; guide.textContent = '✧';
      guide.onclick = () => activateStar(target.id); guide.hidden = false;
    }
    setText(document.getElementById('path-legend'), selected && mode === 'relation' && (relationsByArticle.get(selected) || []).length ? '实线：文章关联' : '虚线：探索路径');
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
      const delta = lastFrame ? Math.min(50, now - lastFrame) : 16;
      const moving = lastCamera && (Math.abs(camera.yaw - lastCamera.yaw) + Math.abs(camera.pitch - lastCamera.pitch) + Math.abs(camera.zoom - lastCamera.zoom) > .01);
      lineOpacity += ((moving || travel || pointers.size ? 0 : 1) - lineOpacity) * Math.min(1, delta / (moving ? 100 : 380));
      lastCamera = { ...camera };
      if (!reader.open && !egg.open && !roomScene?.active && !reducedMotion) ambient.seconds += delta / 1000;
      ambient.x += (ambient.targetX - ambient.x) * .035;
      ambient.y += (ambient.targetY - ambient.y) * .035;
      // Sky/cloud motion already pauses at the window and while reading. Keep
      // that frame until a resize, transition or meteor changes it. CSS micro-motion continues.
      const staticScene = !travel && !arrival && !meteors.length &&
        ((reader.open && body.dataset.reading === 'open') || (roomScene?.active && body.dataset.room === 'inside'));
      if (!staticScene || !restingFrameDrawn) drawScene(now);
      restingFrameDrawn = Boolean(staticScene);
      polyhedron.render(now, !reducedMotion && !document.hidden && !roomScene?.active && !reader.open);
      observationPanel.render(now, !preview.hidden && !reducedMotion && renderBudget.current.ambientMotion &&
        !document.hidden && !roomScene?.active && !reader.open && !egg.open && !collectionOpen && !arrival);
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
      if (!reader.open && !egg.open && !document.hidden && renderBudget.sample(performance.now() - renderStart)) applyRenderQuality();
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
    const complete = end.bottom <= viewport.bottom + 2;
    if (complete && articleId) readArticleIds.add(articleId);
    const revealed = Boolean(articleId && readArticleIds.has(articleId));
    const hasReasons = (relationsByArticle.get(articleId) || []).some((relation) => relation.reason);
    renderReadingRelations(articleNode, revealed);
    const total = Math.max(1, content.offsetTop + content.offsetHeight);
    const percent = Math.min(100, Math.round((scroller.scrollTop + scroller.clientHeight) / total * 100));
    setText(document.getElementById('reading-progress'), `${complete ? 100 : percent}%`);
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
    document.getElementById('motion-toggle').addEventListener('click', () => roomScene.setSoft(!reducedMotion));
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
      const link = event.target.closest('.reading-relation-link[data-starry-article-id]');
      const target = link && articleById.get(link.dataset.starryArticleId);
      if (!reader.open || !target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      stopEmbeddedAudio(); phase = 'closing';
      starMotion.close(() => {
        reader.close(); collectionOpen = false; collectionDialog.close();
        readingSnapshot = null; internalArticleHistory = false;
        history.replaceState({ starryView: 'sky', mode }, '', body.dataset.starryRoot);
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
      if (event.pointerType === 'mouse' && !event.buttons && !roomScene?.active && !reader.open) {
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
        if (selected) phase = 'selected';
      }
    });
    world.addEventListener('pointerdown', (event) => {
      if (roomScene?.active || reader.open || event.target.closest('.star-target') || event.target !== canvas) return;
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
      ambient.targetX = 0;
      ambient.targetY = 0;
      clouds?.clearHover();
    });
    world.addEventListener('wheel', (event) => {
      if (roomScene?.active || reader.open || event.target.closest('#preview, dialog')) return;
      event.preventDefault();
      interrupt();
      moveForward(Math.max(-600, Math.min(600, -event.deltaY * .8)));
    }, { passive: false });
    document.addEventListener('keydown', (event) => {
      if (reader.open || egg.open || roomScene?.active || collectionOpen || event.target.closest('input, textarea, select, [contenteditable], #preview')) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); interrupt();
        camera.yaw += event.key === 'ArrowLeft' ? -.09 : event.key === 'ArrowRight' ? .09 : 0;
        camera.pitch = clamp(camera.pitch + (event.key === 'ArrowUp' ? .065 : event.key === 'ArrowDown' ? -.065 : 0), 0, Math.PI / 2);
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
