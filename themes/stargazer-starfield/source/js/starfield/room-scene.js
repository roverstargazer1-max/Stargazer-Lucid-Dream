import { createTimeline, unit, smooth, ENTRANCE } from './motion.js';

// A flat illustration can dolly without distortion; the sky supplies the turn.
export function roomPassageFrames(rect, width, height) {
  const mobile = width <= 760;
  const origin = { x: rect.width * (mobile ? .55 : .50), y: rect.height * (mobile ? .29 : .28) };
  const dx = width / 2 - (rect.left + origin.x), dy = height / 2 - (rect.top + origin.y);
  const endScale = mobile ? 3.4 : 4;
  const frames = Array.from({ length: 97 }, (_, i) => {
    const offset = i / 96, progress = smooth(offset * ENTRANCE.duration / ENTRANCE.passage);
    // Perspective growth along a forward dolly, with no skew or rotation of the artwork.
    const scale = 1 / (1 - (1 - 1 / endScale) * progress);
    // The nearby frame slips left as the shared sky camera pans right.
    return { transform: `translate(${(dx - width * .10) * progress}px,${dy * progress}px) scale(${scale})`, opacity: 1,
      filter: `blur(${.35 * Math.sin(Math.PI * progress) ** 2}px)`, offset };
  });
  return { origin, frames };
}

// Room transitions keep their own timeline and hand camera progress to the app.
export function createRoom({
  onEnter, onProgress, onEntered, onReturnStart, onReturnProgress, onReturned,
  onJournal, onMotion, startOutside = false,
}) {
  const room = document.getElementById('room'), stage = document.getElementById('room-stage');
  const entry = document.getElementById('window-entry'), world = document.getElementById('world');
  const choice = new URLSearchParams(location.search).get('motion');
  const mode = choice === 'full' || choice === 'soft' ? choice : document.body.dataset.defaultMotion;
  let flight = null, short = mode === 'soft';

  function setMotion() {
    document.body.dataset.motion = short ? 'soft' : 'full';
    onMotion(short);
  }
  setMotion();

  function show(restoreFocus = true) {
    if (flight) {
      cancelAnimationFrame(flight.raf);
      flight.timeline.cancel();
      flight = null;
    }
    onReturned();
    room.hidden = false;
    room.inert = false;
    world.inert = true;
    document.body.dataset.room = 'inside';
    entry.disabled = false;
    stage.style.transform = '';
    room.style.opacity = '';
    if (restoreFocus) entry.focus({ preventScroll: true });
  }

  function passageTimeline() {
    const rect = stage.getBoundingClientRect();
    const { origin, frames } = roomPassageFrames(rect, innerWidth, innerHeight);
    stage.style.transformOrigin = `${origin.x}px ${origin.y}px`;
    const timeline = createTimeline();
    timeline.add(stage, short ? [{ opacity: 1 }, { opacity: 0 }] : frames);
    return timeline;
  }

  function enterSky() {
    if (flight) return;
    if (room.hidden) return;
    // Read the room geometry before changing state, so entering does not force
    // a synchronous style/layout pass over the newly hidden interface.
    const timeline = passageTimeline();
    entry.disabled = true;
    room.inert = true;
    document.body.dataset.room = 'entering';
    const duration = short ? 220 : ENTRANCE.duration;
    const current = { timeline, raf: 0, start: performance.now(), duration, direction: 1, progress: 0 };
    flight = current;
    current.timeline.play(current.start, duration);
    onEnter(current.start);
    const advance = now => {
      if (flight !== current) return;
      const progress = unit((now - current.start) / duration);
      current.progress = progress;
      onProgress(progress);
      if (progress < 1) { current.raf = requestAnimationFrame(advance); return; }
      room.hidden = true;
      current.timeline.cancel();
      flight = null;
      world.inert = false;
      document.body.dataset.room = 'outside';
      onEntered();
    };
    advance(current.start);
  }
  entry.onclick = enterSky;
  const journal = document.getElementById('room-journal');
  if (journal) journal.onclick = onJournal;

  function returnHome() {
    if (flight || !room.hidden) return;
    room.hidden = false;
    room.inert = true;
    world.inert = true;
    entry.disabled = true;
    document.body.dataset.room = 'returning';
    const duration = short ? 220 : ENTRANCE.retreat;
    const current = { timeline: passageTimeline(), raf: 0, start: performance.now(), duration, direction: -1, progress: 0 };
    flight = current;
    current.timeline.play(current.start, duration, -1);
    onReturnStart();
    const advance = now => {
      if (flight !== current) return;
      const progress = unit((now - current.start) / duration);
      current.progress = progress;
      onReturnProgress(progress);
      if (progress < 1) { current.raf = requestAnimationFrame(advance); return; }
      current.timeline.cancel();
      flight = null;
      show();
    };
    advance(current.start);
  }

  window.addEventListener('resize', () => {
    if (!flight) return;
    flight.timeline.cancel();
    flight.timeline = passageTimeline();
    flight.timeline.play(flight.start, flight.duration, flight.direction);
  });
  if (startOutside) {
    room.hidden = true;
    room.inert = true;
    world.inert = false;
    document.body.dataset.room = 'outside';
  } else show(false);
  return {
    enter: enterSky,
    returnHome,
    setSoft(value) { short = value; setMotion(); },
    get active() { return !room.hidden; },
  };
}
