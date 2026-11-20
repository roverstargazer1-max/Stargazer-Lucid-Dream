import { DOME_RADIUS, clamp, domeIntersection, viewRay } from './dome.js';
import { smooth } from './tokens.js';

const pick = items => items[Math.floor(Math.random() * items.length)];
const between = (min, max) => min + Math.random() * (max - min);

function flightPath({ camera, width, height, settings }, speed, still) {
  const x = width * between(.24, .76);
  const y = height * between(.23, .60);
  const span = Math.min(width, height * 1.45) * between(.25, .44);
  const dx = still ? 0 : span * (Math.random() < .5 ? -1 : 1);
  const dy = still ? 0 : span * between(.12, .42);
  const distance = Math.hypot(dx, dy);
  // Frame the path once from the current view, then keep its endpoints in the sky.
  const at = (x, y) => domeIntersection(camera, viewRay(x, y, camera, settings));
  const from = at(x - dx / 2, y - dy / 2);
  const to = at(x + dx / 2, y + dy / 2);
  return {
    from, to, duration: still ? 14000 : distance / speed * 1000,
    trail: still ? 0 : between(17, 28) / distance,
    initialScale: settings.focal / DOME_RADIUS,
  };
}

function positionAt({ from, to }, progress) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    z: from.z + (to.z - from.z) * progress,
  };
}

function paintLight(ctx, head, tail, scale, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  if (tail && Math.hypot(head.x - tail.x, head.y - tail.y) > .2) {
    const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    gradient.addColorStop(0, '#8bd4ff00');
    gradient.addColorStop(.6, '#8bd4ff24');
    gradient.addColorStop(1, '#bceaff9c');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#8bd4ff2e';
  ctx.beginPath();
  ctx.arc(head.x, head.y, 2.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7eeffe0';
  ctx.beginPath();
  ctx.arc(head.x, head.y, 1.15 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createCommentMeteors({ layer, articles, getSelected, getScene, loadModule, open, isSoft }) {
  const articleById = new Map(articles.map(article => [article.id, article]));
  const configuredSpeed = Number(layer.dataset.speed);
  const speed = Number.isFinite(configuredSpeed) && configuredSpeed > 0 ? configuredSpeed : 36;
  let active = false, generation = 0, timer;
  let pool = [], refreshed = 0, request;
  let pinned = null;
  const flights = new Set();

  document.addEventListener('starry:comments-changed', () => { refreshed = 0; });
  document.addEventListener('pointerdown', event => {
    if (pinned && !pinned.contains(event.target)) {
      const previous = pinned;
      pinned = null;
      previous.blur();
      previous.dispatchEvent(new Event('release'));
    }
  }, true);

  async function shower(version) {
    if (!active || generation !== version) return;
    try {
      if (layer.dataset.api && Date.now() - refreshed > 45000) {
        request = new AbortController();
        const module = await loadModule();
        if (version !== generation) return;
        const rows = await module.meteorComments(layer.dataset.api, articles, request.signal);
        if (version !== generation) return;
        pool = rows.filter(row => articleById.has(row.articleId));
        refreshed = Date.now();
      }
      if (pinned || !articles.length) return;
      const first = pick(pool);
      spawn(first);
      if (!isSoft() && innerHeight > 440 && Math.random() < .28) {
        const other = pool.filter(row => row.id !== first?.id);
        if (!pool.length || other.length) spawn(pick(other));
      }
    } catch {
      // An unavailable feed can retry on the next pass.
    } finally {
      if (active && generation === version) timer = setTimeout(() => shower(version), between(12000, 21000));
    }
  }

  function spawn(comment) {
    if (flights.size >= 2) return;
    const article = articleById.get(comment?.articleId) || articleById.get(getSelected()) || pick(articles);
    const target = comment ? 'comment-' + comment.id : 'article-comments';
    const path = flightPath(getScene(), speed, isSoft());
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'comment-meteor';
    button.hidden = true;
    button.setAttribute('aria-label', comment ? article.title + '：' + comment.excerpt.slice(0, 70) : '试试评论吗？');
    const tip = document.createElement('span');
    tip.className = 'meteor-note';
    const title = document.createElement('strong');
    title.textContent = comment ? article.title : '试试评论吗？';
    const quote = document.createElement('span');
    const snippet = comment?.excerpt || '';
    quote.textContent = snippet.slice(0, 70) + (snippet.length > 70 ? '…' : '');
    tip.append(title, quote);
    button.append(tip);
    layer.append(button);

    let started = performance.now();
    let caughtAt = null;
    let tipWidth = 0, tipHeight = 0;
    const flight = { draw, remove };
    flights.add(flight);

    function remove() {
      if (pinned === button) pinned = null;
      button.remove();
      flights.delete(flight);
    }

    function draw(ctx, now, project, width, height) {
      const elapsed = Math.max(0, (caughtAt ?? now) - started);
      if (elapsed >= path.duration) { remove(); return; }
      const progress = elapsed / path.duration;
      const fadeIn = Math.min(1200, path.duration * .24);
      const fadeOut = Math.min(1700, path.duration * .34);
      const opacity = .78 * smooth(Math.min(elapsed / fadeIn, (path.duration - elapsed) / fadeOut));
      const head = project(positionAt(path, progress));
      const onScreen = head && head.x >= 0 && head.x <= width && head.y >= 0 && head.y <= height;
      const reachable = Boolean(onScreen && (opacity > .12 || caughtAt !== null));
      if (button.hidden === reachable) button.hidden = !reachable;
      if (reachable) {
        button.style.left = `${head.x}px`;
        button.style.top = `${head.y}px`;
        if (caughtAt !== null) placeNote(head, width, height);
      } else if (caughtAt !== null) {
        if (pinned === button) pinned = null;
        button.blur();
        release();
      }
      if (!head || opacity <= 0) return;
      const tail = path.trail && project(positionAt(path, Math.max(0, progress - path.trail)));
      if (outside(head, tail || head, width, height)) return;
      paintLight(ctx, head, tail, clamp(head.scale / path.initialScale, .65, 1.65), opacity);
    }

    function capture() {
      if (caughtAt !== null) return;
      caughtAt = performance.now();
      button.classList.add('is-caught');
      tipWidth = tip.offsetWidth;
      tipHeight = tip.offsetHeight;
      button.style.setProperty('--meteor-note-width', `${tipWidth}px`);
    }
    function placeNote({ x, y }, width, height) {
      const offset = Math.max(8 - x, Math.min(-12, width - 8 - tipWidth - x));
      button.style.setProperty('--meteor-note-offset', `${offset}px`);
      button.classList.toggle('is-note-above', y + 16 + tipHeight > height - 8);
    }
    function release() {
      if (caughtAt === null || pinned === button || button.matches(':focus-visible')) return;
      started += performance.now() - caughtAt;
      caughtAt = null;
      button.classList.remove('is-caught');
    }
    button.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') capture(); });
    button.addEventListener('pointerleave', event => {
      if (!button.contains(event.relatedTarget)) release();
    });
    button.addEventListener('focus', capture);
    button.addEventListener('blur', () => {
      if (pinned === button) pinned = null;
      if (!button.matches(':hover')) release();
    });
    button.addEventListener('release', release);
    button.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); button.blur(); release(); }
    });
    let lastPointerType = 'mouse';
    button.addEventListener('pointerdown', event => {
      lastPointerType = event.pointerType;
      // Hover owns the pause. Clicking the moving point must not transfer focus to it.
      if (lastPointerType !== 'touch' && !tip.contains(event.target)) event.preventDefault();
    });
    button.addEventListener('click', event => {
      const input = event.pointerType || (event.detail > 0 ? lastPointerType : 'keyboard');
      if ((input === 'mouse' || input === 'pen') && !tip.contains(event.target)) return;
      const previewFirst = input === 'touch' || (input === 'keyboard' && !comment);
      if (previewFirst && pinned !== button) { pinned = button; capture(); return; }
      pinned = button;
      capture();
      open(article, target, button);
    });
  }

  function setActive(value) {
    if (value === active) return;
    active = value;
    generation++;
    clearTimeout(timer);
    request?.abort();
    for (const flight of flights) flight.remove();
    if (active) {
      const version = generation;
      timer = setTimeout(() => shower(version), between(2200, 4000));
    }
  }

  return {
    setActive,
    paint(ctx, now, project, width, height) {
      for (const flight of flights) flight.draw(ctx, now, project, width, height);
    },
  };
}

function outside(head, tail, width, height) {
  const margin = 5;
  return Math.max(head.x, tail.x) < -margin || Math.min(head.x, tail.x) > width + margin ||
    Math.max(head.y, tail.y) < -margin || Math.min(head.y, tail.y) > height + margin;
}
