import { createInteractiveClouds } from './interactive-clouds.js';
import { createRoom, paintCloudVeil, paintPaintedSky, paintPaintedStar, preparePaintedScene } from './painted.js';
import { HOME_ELEVATION, clamp, domeDestination, direction, projectDome } from './dome.js';
import { createStarMotion, ENTRANCE, entranceFrame, returnFrame, smooth } from './motion.js';
import { dockTarget } from './experience.js';

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
  const status = document.getElementById('approach-status');
  const readButton = document.getElementById('read-button');
  const homeButton = document.getElementById('home');
  const targetLayer = document.getElementById('star-targets');
  const directId = body.dataset.starryArticleId;
  const isDirectEntry = Boolean(directId);
  const fallbackArticle = document.querySelector('#static-article-fallback .article[data-starry-id]');
  const previewMemory = { camera: null, selected: null, phase: 'idle' };
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  let roomScene = null;
  let clouds = null;
  let starMotion = null;
  let article = null;
  let articleNode = fallbackArticle;
  let selected = null;
  let phase = 'idle';
  let travel = null;
  let arrival = null;
  let retreatCamera = null;
  let width = innerWidth;
  let height = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: HOME_ELEVATION, zoom: 1 };
  let starTarget = null;
  let visibleStar = null;
  let readingSnapshot = null;
  let readerTrigger = null;
  let internalArticleHistory = false;
  let directCloseInProgress = false;
  let animationStarted = false;
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
  if (index.version !== 1 || !Array.isArray(index.articles)) throw new Error('The starfield index has an unsupported format.');
  article = index.articles.find((item) => item.id === (directId || body.dataset.starryFeaturedId));
  if (!article || !article.title || !article.excerpt || !Array.isArray(article.position) || article.position.length !== 3) {
    throw new Error('The featured article is not ready for the starfield.');
  }
  article.position = { x: article.position[0], y: article.position[1], z: article.position[2] };

  if (isDirectEntry) {
    if (!articleNode || articleNode.dataset.starryId !== article.id) throw new Error('The static article does not match its starfield identity.');
    const heading = articleNode.querySelector('#reader-title');
    if (!heading || heading.textContent.trim() !== article.title) throw new Error('The static article title does not match its index entry.');
  } else {
    articleNode = await loadArticleNode(article);
  }

  resize();
  await preparePaintedScene();
  await waitForImage(document.querySelector('.room-image'));
  clouds = createInteractiveClouds(world);
  starMotion = createStarMotion({ preview, reader, scroller, isSoft: () => reducedMotion });

  if (isDirectEntry) {
    selected = article.id;
    phase = 'settled';
    camera = focusCamera(article);
    readerSlot.replaceChildren(articleNode);
  }

  roomScene = createRoom({
    startOutside: isDirectEntry,
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
      updateUI();
    },
    onJournal() {},
    onMotion(value) {
      reducedMotion = value;
      if (body.dataset.room === 'inside') body.style.setProperty('--sky-clarity', value ? '1' : '0');
    },
  });

  mountStar();
  wireControls();
  updateUI();
  preflightRenderer();

  body.classList.add('starry-ready');
  if (isDirectEntry) openDirectArticle();
  animationStarted = true;
  requestAnimationFrame(animate);

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (travel && selected) travel.to = destination(article);
    if (selected && phase === 'settled' && !reader.open && !isDirectEntry) camera = focusCamera(article);
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

  function focusCamera(targetArticle) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return domeDestination(targetArticle.position, camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, { x: width * .40, y: height * .42 });
  }

  function destination(targetArticle) {
    const settings = projectionSettings();
    const baseFocal = settings.focal / (camera.zoom || 1);
    return domeDestination(targetArticle.position, camera, {
      cx: settings.cx,
      cy: settings.cy,
      focal: baseFocal * 1.55,
    }, dockTarget(width, height, preview.getBoundingClientRect()));
  }

  function mountStar() {
    starTarget = document.createElement('button');
    starTarget.className = 'star-target';
    starTarget.type = 'button';
    starTarget.hidden = true;
    starTarget.setAttribute('aria-label', `选择文章：${article.title}`);
    const label = document.createElement('span');
    label.className = 'star-label';
    label.textContent = article.title;
    starTarget.append(label);
    starTarget.addEventListener('click', () => activateStar(article.id));
    targetLayer.append(starTarget);
  }

  function updateUI() {
    const isSelected = selected === article.id;
    preview.hidden = !isSelected || reader.open;
    if (isSelected) {
      document.getElementById('preview-date').textContent = article.date;
      document.getElementById('preview-title').textContent = article.title;
      document.getElementById('preview-intro').textContent = article.excerpt;
      status.textContent = phase === 'moving' || phase === 'arriving' ? '正在靠近 · · ·' : phase === 'settled' ? '再点星，阅读' : '点星，重新靠近';
    }
    readButton.disabled = !isSelected || phase !== 'settled' || reader.open;
    if (starTarget) {
      starTarget.classList.toggle('is-selected', isSelected);
      starTarget.setAttribute('aria-label', `${isSelected && phase === 'settled' ? '阅读文章' : '选择文章'}：${article.title}`);
    }
    homeButton.hidden = Boolean(roomScene?.active) || reader.open;
    document.getElementById('gesture-help').textContent = width <= 760 ? '单指转动穹顶 · 滚轮前行 · 点星靠近' : '拖动转动穹顶 · 滚轮前行 · 点星靠近';
  }

  function announce(message) {
    document.getElementById('announcement').textContent = message;
  }

  function activateStar(id) {
    if (reader.open || travel || arrival || roomScene?.active) return;
    if (selected === id && phase === 'settled') {
      openReaderFromStar();
      return;
    }
    beginApproach(id);
  }

  function beginApproach(id) {
    selected = id;
    phase = 'moving';
    starMotion.interrupt();
    updateUI();
    const start = performance.now();
    const to = destination(article);
    const duration = reducedMotion ? 220 : 2800;
    travel = { from: { ...camera }, to, start, duration };
    starMotion.beginApproach(start, id);
    announce('正在靠近文章星。到位后再次点选这颗星即可阅读。');
  }

  function interrupt() {
    if (!travel) return;
    travel = null;
    starMotion.interrupt();
    phase = selected ? 'selected' : 'idle';
    updateUI();
  }

  function openReaderFromStar() {
    readingSnapshot = { camera: { ...camera }, selected, phase };
    readerTrigger = document.activeElement;
    readerSlot.replaceChildren(articleNode);
    internalArticleHistory = true;
    history.pushState({ starryArticleId: article.id }, '', localArticleUrl(article).pathname);
    showReader(project(article.position));
  }

  function openDirectArticle() {
    readerTrigger = document.getElementById('home');
    showReader(project(article.position));
  }

  function showReader(origin) {
    reader.showModal();
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
    directCloseInProgress = true;
    phase = 'closing';
    starMotion.close(() => {
      reader.close();
      directCloseInProgress = false;
      internalArticleHistory = false;
      history.replaceState({ starryView: 'sky' }, '', body.dataset.starryRoot);
      phase = 'settled';
      selected = article.id;
      updateUI();
      starTarget?.focus({ preventScroll: true });
    }, project(article.position));
  }

  function closeReaderThroughHistory() {
    if (!reader.open || !internalArticleHistory) return;
    history.back();
  }

  function closeReaderAfterPop() {
    if (!reader.open) return;
    phase = 'closing';
    starMotion.close(() => {
      reader.close();
      internalArticleHistory = false;
      if (readingSnapshot) {
        camera = { ...readingSnapshot.camera };
        selected = readingSnapshot.selected;
        phase = readingSnapshot.phase;
      } else {
        phase = 'settled';
        selected = article.id;
      }
      readingSnapshot = null;
      updateUI();
      const target = readerTrigger?.isConnected ? readerTrigger : starTarget;
      target?.focus({ preventScroll: true });
      readerTrigger = null;
    }, project(article.position));
  }

  function openReaderFromHistory() {
    if (reader.open) return;
    selected = article.id;
    phase = 'settled';
    if (!readingSnapshot) readingSnapshot = { camera: { ...camera }, selected, phase };
    readerSlot.replaceChildren(articleNode);
    internalArticleHistory = true;
    showReader(project(article.position));
  }

  function enterHome() {
    if (reader.open || roomScene?.active) return;
    roomScene?.returnHome();
  }

  function finishArrival() {
    const end = entranceFrame(ENTRANCE.duration, width <= 760 ? .78 : 1);
    camera = { x: end.x, y: end.y, z: end.z, yaw: end.yaw, pitch: end.pitch, zoom: end.zoom };
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
    const seconds = reducedMotion ? null : now / 1000;
    paintPaintedSky(ctx, width, height, camera, projectionSettings(), { x: ambient.x, y: ambient.y, seconds, clarity: 1 });
    if (animationStarted && body.dataset.domeRenderer !== 'webgl') throw new Error('The starfield renderer stopped being available.');
    const projected = project(article.position);
    visibleStar = projected && Number.isFinite(projected.x) && Number.isFinite(projected.y) ? projected : null;
    starTarget.hidden = !visibleStar || roomScene?.active || Boolean(arrival);
    if (visibleStar) {
      starTarget.style.left = `${visibleStar.x}px`;
      starTarget.style.top = `${visibleStar.y}px`;
      paintPaintedStar(ctx, visibleStar.x, visibleStar.y, article.id, {
        depth: visibleStar.depth,
        active: selected === article.id,
        hover: starTarget.matches(':hover'),
        zoom: Math.max(.62, Math.min(1.4, visibleStar.scale)),
        importance: article.importance,
        seconds,
      });
      if (selected) starMotion.paintFocus(ctx, visibleStar);
    }
    paintCloudVeil(ctx, width, height, camera, projectionSettings());
    clouds?.update(now / 1000, Boolean(reader.open || arrival || roomScene?.active));
    clouds?.paint(ctx, width, height, camera, projectionSettings());
  }

  function animate(now) {
    try {
      if (travel) {
        const t = Math.min(1, (now - travel.start) / travel.duration);
        camera = interpolate(travel.from, travel.to, smooth(t));
        starMotion.setApproach(t);
        if (t >= 1) {
          travel = null;
          phase = 'settled';
          updateUI();
          announce('已经靠近。再次点选这颗星，或使用阅读按钮打开正文。');
        }
      }
      updateArrival(now);
      ambient.seconds = now / 1000;
      ambient.x += (ambient.targetX - ambient.x) * .035;
      ambient.y += (ambient.targetY - ambient.y) * .035;
      drawScene(now);
      starMotion.tick(now);
      updateProgress();
      requestAnimationFrame(animate);
    } catch (error) {
      fallback(error);
    }
  }

  function updateProgress() {
    if (!reader.open || phase !== 'reading') return;
    const content = reader.querySelector('#reader-content');
    if (!content) return;
    const end = content.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    const complete = end.bottom <= viewport.bottom + 2;
    const total = Math.max(1, content.offsetTop + content.offsetHeight);
    const percent = Math.min(100, Math.round((scroller.scrollTop + scroller.clientHeight) / total * 100));
    document.getElementById('reading-progress').textContent = `${complete ? 100 : percent}%`;
    document.getElementById('reading-state').textContent = complete ? '已到文末' : '沿着文字，慢慢往下';
  }

  function wireControls() {
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
    readButton.addEventListener('click', openReaderFromStar);
    homeButton.addEventListener('click', enterHome);
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', () => {
      resize();
      starMotion.resize();
      if (reader.open) updateProgress();
    });
    window.addEventListener('popstate', (event) => {
      if (reader.open && !event.state?.starryArticleId) closeReaderAfterPop();
      else if (!reader.open && event.state?.starryArticleId) openReaderFromHistory();
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
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) gestureMoved = true;
      if (!gestureMoved) return;
      interrupt();
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
        const hit = visibleStar && Math.hypot(visibleStar.x - event.clientX, visibleStar.y - event.clientY) < 26;
        if (hit) activateStar(article.id);
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
      if (roomScene?.active || reader.open) return;
      event.preventDefault();
      interrupt();
      moveForward(Math.max(-600, Math.min(600, event.deltaY * .8)));
    }, { passive: false });
    document.addEventListener('keydown', (event) => {
      if (reader.open || event.target.closest('button, a, input, textarea, select, [contenteditable]')) return;
      if (event.key === 'Escape' && selected) {
        selected = null;
        phase = 'idle';
        starMotion.clearSelection();
        updateUI();
      }
    });
  }

  function moveForward(amount) {
    const old = { x: camera.x, y: camera.y, z: camera.z };
    camera.x += Math.sin(camera.yaw) * Math.cos(camera.pitch) * amount;
    camera.y += Math.sin(camera.pitch) * amount;
    camera.z += Math.cos(camera.yaw) * Math.cos(camera.pitch) * amount;
    camera.x = clamp(camera.x, -9000, 9000);
    camera.y = clamp(camera.y, -6000, 6000);
    camera.z = clamp(camera.z, -1000, 9000);
    if (camera.x !== old.x || camera.y !== old.y || camera.z !== old.z) {
      if (selected) phase = 'selected';
      updateUI();
    }
  }

  function localArticleUrl(item) {
    const root = new URL(body.dataset.starryRoot, location.origin);
    const originalPath = new URL(item.url, location.origin).pathname;
    return new URL(originalPath, root);
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
    if (image.complete && image.naturalWidth > 0) return Promise.resolve(image);
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

function fallback(error) {
  if (error) console.error('Starfield enhancement stayed in the readable fallback.', error);
  const direct = Boolean(document.body.dataset.starryArticleId);
  const articleNode = document.querySelector('#reader #static-article-fallback .article[data-starry-id], #reader .article[data-starry-id]');
  const staticArticle = document.getElementById('static-article-fallback');
  if (direct && articleNode && staticArticle) staticArticle.replaceChildren(articleNode);
  document.getElementById('reader')?.open && document.getElementById('reader').close();
  document.body.classList.remove('starry-ready');
}
