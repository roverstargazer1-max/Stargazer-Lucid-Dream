// One clock for the camera, the page and its ink. No animation-library dependency.
import { createPreviewMemory } from './experience.js';
export const unit = value => Math.max(0, Math.min(1, value));
export function smooth(value) {
  const t = unit(value);
  return t * t * t * (10 + t * (-15 + 6 * t));
}
export const cue = (progress, start, end) => smooth((progress - start) / (end - start));
export const ENTRANCE = { passage: 1900, duration: 2500, turn: Math.PI / 3, clarify: 950, clear: 2300, retreat: 2600 };
export const PREVIEW = { duration: 2800, unfold: 1500, reveal: 2000, clear: 2734 };

// The window and open sky share this camera, even before the entry button is pressed.
// A short turn carries the passage into its landing; stars clear during deceleration.
export function entranceFrame(elapsed, windowZoom = 1) {
  const turn = smooth(elapsed / ENTRANCE.duration);
  const progress = unit(elapsed / ENTRANCE.passage), distance = 1 - smooth(progress);
  return {
    x: -180 * distance,
    y: -50 * distance,
    z: -420 * distance,
    yaw: ENTRANCE.turn * turn,
    pitch: .43 + .09 * Math.sin(Math.PI * turn) ** 2,
    zoom: .50 + .22 * cue(elapsed / ENTRANCE.duration, .42, 1) + (windowZoom - .50) * (1 - cue(progress, .05, .88)),
    bank: -.085 * Math.sin(Math.PI * cue(progress, .03, 1)),
    clarity: cue(elapsed, ENTRANCE.clarify, ENTRANCE.clear),
    stage: elapsed < ENTRANCE.passage ? 'passage' : 'settling',
    done: elapsed >= ENTRANCE.duration,
  };
}
// Reverse the near-window journey from wherever exploration left the camera.
// Anchor the reverse lens to the actual passage endpoint to avoid a jump on return.
export function returnFrame(progress, from, windowZoom = 1) {
  const t = unit(progress), remaining = 1 - smooth(t);
  const reverse = entranceFrame(ENTRANCE.passage * (1 - t), windowZoom);
  const passageEnd = entranceFrame(ENTRANCE.passage, windowZoom);
  const homeYaw = from.yaw + Math.atan2(Math.sin(-from.yaw), Math.cos(-from.yaw));
  return {
    x: reverse.x + from.x * remaining,
    y: reverse.y + from.y * remaining,
    z: reverse.z + from.z * remaining,
    yaw: homeYaw + (from.yaw - homeYaw) * remaining,
    pitch: .43 + (from.pitch - .43) * remaining,
    zoom: reverse.zoom + (from.zoom - passageEnd.zoom) * remaining,
    bank: reverse.bank,
  };
}
export function approachFrame(progress) {
  return {
    aim: cue(progress, .025, .78),
    distance: cue(progress, .09, 1),
    lens: cue(progress, .16, 1),
    gather: cue(progress, 0, .22),
    ink: cue(progress, .43, 1),
  };
}

// Paused Web Animations are scrubbed by the same RAF timestamp as Canvas.
export function createTimeline() {
  const effects = [];
  return {
    add(element, frames, start = 0, end = 1) {
      const effect = element.animate(frames, { duration: 1000, fill: 'both', easing: 'linear' });
      effect.pause();
      effect.finished.catch(() => {}); // Cancellation is expected on retarget/return.
      effects.push({ effect, start, end });
      effect.currentTime = 0;
    },
    seek(progress) {
      for (const { effect, start, end } of effects) {
        effect.currentTime = cue(progress, start, end) * 1000;
      }
    },
    cancel() { for (const { effect } of effects) effect.cancel(); effects.length = 0; },
  };
}

// Measure real line boxes. The text stays intact, selectable and accessible;
// only decorative, aria-hidden strips pass over it, including wrapped CJK lines.
function revealInk(elements, timeline, start, end, soft, white = false) {
  const covers = [], copies = [];
  elements.forEach((element, order) => {
    const delay = Math.min(order, 8) * (white ? .012 : .018);
    element.classList.add('ink-target');
    let ink = element;
    if (white && !soft) {
      // Blur the real ink independently: the white blocks stay solid during the hold.
      ink = document.createElement('span'); ink.className = 'ink-copy';
      ink.append(...element.childNodes); element.append(ink); copies.push(ink);
    }
    timeline.add(ink, [
      { opacity: soft ? 0 : 1, filter: soft ? 'none' : 'blur(3px)', translate: soft ? 'none' : '0 4px' },
      { opacity: 1, filter: soft ? 'none' : 'blur(0px)', translate: soft ? 'none' : '0 0' },
    ], start + delay, Math.min(1, end + delay));
    if (soft) return;
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const lines = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1) continue;
        const previous = lines.find(line => Math.abs(line.top - rect.top) < 3);
        if (previous) previous.right = Math.max(previous.right, rect.right);
        else lines.push({ left: rect.left, top: rect.top, right: rect.right, height: rect.height });
      }
    }
    for (const [index, line] of lines.entries()) {
      const strip = document.createElement('span');
      strip.className = white ? 'ink-veil ink-veil-white' : 'ink-veil'; strip.setAttribute('aria-hidden', 'true');
      strip.style.cssText = `left:${line.left - bounds.left}px;top:${line.top - bounds.top}px;width:${line.right - line.left}px;height:${line.height}px`;
      element.append(strip); covers.push(strip);
      timeline.add(strip, [
        { transform: 'scaleX(1)', opacity: 1 },
        { transform: 'scaleX(.68)', opacity: .78, offset: .28 },
        { transform: 'scaleX(0)', opacity: 0 },
      ], start + delay + Math.min(index, 3) * .014, Math.min(1, end + delay));
    }
  });
  return () => {
    covers.forEach(cover => cover.remove());
    copies.forEach(copy => copy.replaceWith(...copy.childNodes));
    elements.forEach(element => element.classList.remove('ink-target'));
  };
}

export function createStarMotion({ preview, reader, scroller, isSoft }) {
  let approach = null, page = null, focusProgress = 1, previewRect = null;
  const memory = createPreviewMemory();
  const body = document.body;
  function clearApproach() {
    approach?.timeline.cancel(); approach?.clean(); approach = null;
    memory.cancel();
    preview.style.removeProperty('--preview-reveal');
    preview.removeAttribute('aria-busy'); delete preview.dataset.reveal;
  }
  function beginApproach(start = performance.now(), articleId, resumed = null) {
    clearApproach(); focusProgress = 0;
    const token = memory.begin(articleId);
    body.dataset.focus = 'approaching';
    const timeline = createTimeline(), soft = isSoft();
    const repeat = resumed?.repeat ?? token.repeat;
    const duration = soft ? 220 : repeat ? 700 : PREVIEW.duration;
    const unfold = soft ? duration : repeat ? 420 : PREVIEW.unfold;
    const reveal = soft ? 0 : repeat ? 100 : PREVIEW.reveal;
    preview.dataset.presentation = soft ? 'soft' : repeat ? 'repeat' : 'first';
    previewRect = preview.getBoundingClientRect();
    const clean = revealInk([...preview.querySelectorAll('#preview-number, #preview-date, #preview-tag, #preview-title, #preview-intro')], timeline, reveal / duration, soft || repeat ? .85 : PREVIEW.clear / duration, soft || repeat, true);
    timeline.add(preview, soft || repeat ? [{ opacity: 0 }, { opacity: 1 }] : [
      { opacity: 0, translate: `${Math.round(previewRect.width*.65+innerWidth-previewRect.right)}px 0`, rotate: 'y -12deg', clipPath: 'inset(49% 0 49% 0)' },
      { opacity: 1, translate: '0 0', rotate: 'y 0deg', clipPath: 'inset(0% 0 0% 0)' },
    ], soft || repeat ? 0 : .03, unfold / duration);
    // The action participates in the panel's reveal, without an additional late fade.
    // Its enabled state belongs to the camera clock, which may run longer than this.
    timeline.add(preview.querySelector('.relation-cues'), [{ opacity: 0 }, { opacity: 1 }], soft || repeat ? 0 : .82, 1);
    preview.setAttribute('aria-busy', 'true');
    approach = { timeline, clean, start, duration, unfold, reveal, repeat, articleId, token };
    setApproach(0);
    tick(start);
  }
  function setApproach(progress) {
    focusProgress = unit(progress);
    if (progress >= 1) body.dataset.focus = 'settled';
  }
  function clearSelection() {
    clearApproach(); focusProgress = 1; previewRect = null; delete body.dataset.focus;
  }
  function interrupt() {
    clearApproach(); focusProgress = 1; body.dataset.focus = 'interrupted';
  }
  function finishPage() {
    if (!page) return;
    const current = page; page = null;
    current.timeline.cancel(); current.clean();
    reader.style.removeProperty('transform-origin');
    reader.style.removeProperty('--reading-veil'); reader.style.removeProperty('--reading-blur');
    delete reader.dataset.motion;
    body.dataset.reading = current.direction > 0 ? 'open' : 'closed';
    current.done?.();
  }
  function openPage(origin, done) {
    clearApproach();
    const timeline = createTimeline(), soft = isSoft();
    const rect = reader.getBoundingClientRect();
    const point = origin || { x: innerWidth / 2, y: innerHeight * .38 };
    reader.style.transformOrigin = `${point.x - rect.left}px ${point.y - rect.top}px`;
    reader.dataset.motion = 'opening'; body.dataset.reading = 'opening';
    scroller.inert = true;
    const targets = [...reader.querySelectorAll('.article-meta, #reader-title, #reader-intro, #reader-content > p')];
    // Offscreen paragraphs are already clear when the reader scrolls to them.
    const visible = targets.filter(element => element.getBoundingClientRect().top < innerHeight);
    const cleanInk = revealInk(visible, timeline, soft ? 0 : .52, .84, soft);
    timeline.add(reader.querySelector('.reading-header'), [{ opacity: 0 }, { opacity: 1 }], soft ? 0 : .62, .94);
    timeline.add(reader.querySelector('.reading-footer'), [{ opacity: 0 }, { opacity: 1 }], soft ? 0 : .74, 1);
    timeline.add(reader.querySelector('.article-rule'), [{ opacity: 0, scale: '.05 1' }, { opacity: 1, scale: '1 1' }], soft ? 0 : .60, 1);
    const seal = reader.querySelector('.reading-seal');
    timeline.add(seal, [{ opacity: soft ? 0 : .7 }, { opacity: 0 }], .39, .73);
    for (const line of seal.querySelectorAll('path')) timeline.add(line, [{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], .32, .70);
    timeline.add(reader, soft ? [{ opacity: 0 }, { opacity: 1 }] : [
      { opacity: 0, transform: 'perspective(1600px) rotate(-18deg) scale(.012,.018)', offset: 0 },
      { opacity: .92, transform: 'perspective(1600px) rotate(-12deg) scale(.035,.52)', offset: .24 },
      { opacity: 1, transform: 'perspective(1600px) rotate(-1.2deg) scale(.94,.98)', offset: .68 },
      { opacity: 1, transform: 'perspective(1600px) rotate(0deg) scale(1)', offset: 1 },
    ], 0, .76);
    page = { timeline, clean: () => { cleanInk(); scroller.inert = false; }, progress: 0, from: 0, direction: 1, start: performance.now(), duration: soft ? 180 : 1460, done };
    tick(page.start);
  }
  function closePage(done, origin) {
    if (page?.direction === -1) return;
    if (!page) {
      // Rebuild at the same star anchor and immediately seek to the open pose.
      lastOrigin = origin || lastOrigin;
      openPage(lastOrigin, null);
      page.progress = 1;
    }
    page.from = page.progress; page.direction = -1; page.start = performance.now();
    page.duration = isSoft() ? 160 : Math.max(200, 820 * page.from); page.done = done;
    reader.dataset.motion = 'closing'; body.dataset.reading = 'closing';
    scroller.inert = true;
    tick(page.start);
  }
  let lastOrigin = null;
  function tick(now) {
    if (approach) {
      const elapsed = Math.max(0, now - approach.start), t = unit(elapsed / approach.duration);
      approach.timeline.seek(t);
      preview.style.setProperty('--preview-reveal', cue(t, .03, approach.unfold / approach.duration));
      preview.dataset.reveal = elapsed < approach.unfold ? 'unfolding' : elapsed < approach.reveal ? 'holding' : 'revealing';
      if (t === 1) { memory.complete(approach.token); clearApproach(); }
    }
    if (!page) return;
    const t = unit((now - page.start) / page.duration);
    page.progress = page.direction > 0 ? t : page.from * (1 - t);
    page.timeline.seek(page.progress);
    reader.style.setProperty('--reading-veil', (.48 * cue(page.progress, .1, .76)).toFixed(3));
    reader.style.setProperty('--reading-blur', `${isSoft() ? 0 : (2 * cue(page.progress, .2, .8)).toFixed(2)}px`);
    if (t === 1) finishPage();
  }
  function paintFocus(ctx, point) {
    if (!point || isSoft() || reader.open || !body.dataset.focus) return;
    const t = focusProgress, gather = approachFrame(t).gather;
    const arrival = cue(t, .60, 1), radius = 32 - 17 * gather + arrival * 3;
    ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(-Math.PI / 4 + gather * .22);
    ctx.strokeStyle = `rgba(228,215,179,${(.65 - arrival * .46).toFixed(3)})`; ctx.lineWidth = .75;
    for (const angle of [0, Math.PI]) {
      ctx.beginPath(); ctx.arc(0, 0, radius, angle + .20, angle + Math.PI * .68); ctx.stroke();
    }
    ctx.restore();
    if (!previewRect || preview.hidden || t < .22 || body.dataset.focus === 'interrupted') return;
    const beside = previewRect.left > point.x + 28;
    const tip = beside ? { x: previewRect.left, y: previewRect.top + previewRect.height * .42 } : { x: previewRect.left + previewRect.width * .5, y: previewRect.top };
    const extent = cue(t, .24, .72), endY = point.y + (tip.y - point.y) * extent;
    if (!beside && tip.y < point.y + 34) return;
    ctx.save();
    const gradient = ctx.createLinearGradient(point.x, point.y, tip.x, tip.y);
    gradient.addColorStop(0, `rgba(228,215,179,${(.32 - arrival * .17) * extent})`);
    gradient.addColorStop(1, 'rgba(196,217,234,.04)');
    ctx.strokeStyle = gradient; ctx.lineWidth = .65;
    ctx.beginPath();
    if (beside) {
      const endX = point.x + (tip.x - point.x) * extent;
      ctx.moveTo(point.x + radius + 5, point.y);
      ctx.bezierCurveTo(endX - 50, point.y, endX - 45, endY, endX, endY);
    } else {
      ctx.moveTo(point.x, point.y + radius + 5);
      ctx.bezierCurveTo(point.x, endY - 30, tip.x, endY - 25, tip.x, endY);
    }
    ctx.stroke(); ctx.restore();
  }
  return {
    beginApproach, setApproach, clearSelection, interrupt, tick, paintFocus,
    open(origin, done) { lastOrigin = origin; openPage(origin, done); }, close: closePage,
    resize() {
      if (approach) {
        const current = approach, focus = focusProgress;
        beginApproach(current.start, current.articleId, current); setApproach(focus); tick(performance.now());
      }
      previewRect = preview.hidden ? null : preview.getBoundingClientRect();
      if (page) finishPage();
    },
  };
}
