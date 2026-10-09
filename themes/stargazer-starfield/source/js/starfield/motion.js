// One clock for the camera, the reading window and the mist reveal. No animation-library dependency.
import { createPreviewMemory } from './experience.js';
export const unit = value => Math.max(0, Math.min(1, value));
export function smooth(value) {
  const t = unit(value);
  return t * t * t * (10 + t * (-15 + 6 * t));
}
export const cue = (progress, start, end) => smooth((progress - start) / (end - start));
export const ENTRANCE = { passage: 1900, duration: 2500, turn: Math.PI / 3, clarify: 950, clear: 2300, retreat: 2600 };
export const PREVIEW = { duration: 1100, clear: 950 };

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

// Reading gestures seek a paused timeline; room transitions play on the browser's
// timeline with the same clock as the Canvas camera, without a seek on every RAF.
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
    play(startTime, duration, direction = 1) {
      for (const { effect, start, end } of effects) {
        effect.effect.updateTiming({ duration: duration * (end - start), delay: duration * start, endDelay: duration * (1 - end) });
        effect.currentTime = direction > 0 ? 0 : duration;
        effect.playbackRate = direction;
        effect.play();
        effect.startTime = direction > 0 ? startTime : startTime + duration;
      }
    },
    cancel() { for (const { effect } of effects) effect.cancel(); effects.length = 0; },
  };
}

export function createStarMotion({ preview, reader, scroller, isSoft }) {
  let approach = null, page = null, focusProgress = 1, previewRect = null;
  const memory = createPreviewMemory();
  const body = document.body;
  // ::backdrop does not reliably inherit custom properties from its dialog.
  // Update its own rule so the sky follows the same clock, including interruption.
  const backdropSheet = document.createElement('style');
  backdropSheet.textContent = '#reader::backdrop {}';
  document.head.append(backdropSheet);
  const backdrop = backdropSheet.sheet.cssRules[0].style;
  let backdropFocus = 0;
  function setBackdrop(progress, soft) {
    backdropFocus = progress;
    backdrop.background = `rgb(6 13 48 / ${(.15 * progress).toFixed(3)})`;
    backdrop.backdropFilter = `blur(${soft ? 0 : (2.4 * progress).toFixed(2)}px)`;
  }
  setBackdrop(0, isSoft());
  function clearApproach() {
    approach?.timeline.cancel(); approach = null;
    memory.cancel();
    preview.removeAttribute('aria-busy'); delete preview.dataset.reveal;
  }
  function beginApproach(start = performance.now(), articleId, resumed = null) {
    clearApproach(); focusProgress = 0;
    const token = memory.begin(articleId);
    body.dataset.focus = 'approaching';
    const timeline = createTimeline(), soft = isSoft();
    const repeat = resumed?.repeat ?? token.repeat;
    const duration = soft ? 220 : repeat ? 700 : PREVIEW.duration;
    preview.dataset.presentation = soft ? 'soft' : repeat ? 'repeat' : 'first';
    previewRect = preview.getBoundingClientRect();
    // Real text emerges through a slight loss of focus; no masks or copied text.
    timeline.add(preview, [{ opacity: 0 }, { opacity: 1 }], 0, soft ? 1 : .75);
    for (const [order, element] of [...preview.querySelectorAll('#preview-date, #preview-title')].entries()) {
      const delay = soft ? 0 : .08 + order * .035;
      timeline.add(element, [
        { opacity: 0, filter: soft ? 'none' : `blur(${repeat ? 1 : 3}px)` },
        { opacity: 1, filter: 'blur(0px)' },
      ], delay, soft ? 1 : repeat ? .85 : PREVIEW.clear / duration);
    }
    timeline.add(preview.querySelector('.preview-bottom'), [{ opacity: 0 }, { opacity: 1 }], soft ? 0 : .3, 1);
    preview.setAttribute('aria-busy', 'true');
    approach = { timeline, start, duration, repeat, articleId, token };
    setApproach(0);
    tick(start);
    return duration;
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
    current.timeline.cancel();
    setBackdrop(current.toFocus, current.soft);
    scroller.inert = false;
    delete reader.dataset.motion;
    body.dataset.reading = current.direction > 0 ? 'open' : 'closed';
    current.done?.();
  }
  function startPage(direction, done) {
    const soft = isSoft(), opening = direction > 0;
    const fromFocus = backdropFocus;
    // Closing midway or reopening during a close starts from the displayed pose.
    const pose = page || !opening ? getComputedStyle(reader) : null;
    const from = pose ? { opacity: pose.opacity, filter: soft ? 'none' : pose.filter }
      : { opacity: 0, filter: soft ? 'none' : 'blur(2px)' };
    page?.timeline.cancel();
    const timeline = createTimeline();
    timeline.add(reader, [from, { opacity: opening ? 1 : 0, filter: soft ? 'none' : opening ? 'blur(0px)' : 'blur(1.5px)' }]);
    reader.dataset.motion = opening ? 'opening' : 'closing';
    body.dataset.reading = reader.dataset.motion;
    scroller.inert = true;
    page = { timeline, direction, fromFocus, toFocus: opening ? 1 : 0, soft,
      start: performance.now(), duration: soft ? (opening ? 160 : 120) : (opening ? 440 : 240), done };
    tick(page.start);
  }
  function openPage(_origin, done) {
    clearApproach();
    startPage(1, done);
  }
  function closePage(done) {
    if (page?.direction === -1) return;
    startPage(-1, done);
  }
  function tick(now) {
    if (approach) {
      const elapsed = Math.max(0, now - approach.start), t = unit(elapsed / approach.duration);
      approach.timeline.seek(t);
      preview.dataset.reveal = 'focusing';
      if (t === 1) { memory.complete(approach.token); clearApproach(); }
    }
    if (!page) return;
    const t = unit((now - page.start) / page.duration);
    page.timeline.seek(t);
    setBackdrop(page.fromFocus + (page.toFocus - page.fromFocus) * smooth(t), page.soft);
    if (t === 1) finishPage();
  }
  function paintFocus(ctx, point) {
    if (!point || isSoft() || reader.open || !body.dataset.focus) return;
    const t = focusProgress, gather = approachFrame(t).gather;
    const arrival = cue(t, .60, 1), radius = 32 - 17 * gather + arrival * 3;
    ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(-Math.PI / 4 + gather * .22);
    ctx.strokeStyle = `rgba(114,219,255,${(.65 - arrival * .46).toFixed(3)})`; ctx.lineWidth = .75;
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
    gradient.addColorStop(0, `rgba(114,219,255,${(.32 - arrival * .17) * extent})`);
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
    open: openPage, close: closePage,
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
