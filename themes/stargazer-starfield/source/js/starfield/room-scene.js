import { createTimeline, unit, ENTRANCE } from './motion.js';

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
    // Near window frame slips left as the continuous sky camera turns right.
    const px = rect.width * (innerWidth <= 760 ? .55 : .52), py = rect.height * .29;
    stage.style.transformOrigin = `${px}px ${py}px`;
    const dx = innerWidth / 2 - (rect.left + px), dy = innerHeight / 2 - (rect.top + py);
    const timeline = createTimeline();
    timeline.add(stage, short ? [{ opacity: 1 }, { opacity: 0 }] : [
      { transform: 'perspective(1100px) translate(0,0) rotateY(0deg) rotateZ(0deg) scale(1)', opacity: 1, filter: 'blur(0px)', offset: 0 },
      { transform: `perspective(1100px) translate(${dx * .14 - innerWidth * .025}px,${dy * .18 + innerHeight * .01}px) rotateY(-6deg) rotateZ(-2deg) scale(1.22)`, opacity: 1, filter: 'blur(0px)', offset: .20 },
      { transform: `perspective(1100px) translate(${dx * .68 - innerWidth * .18}px,${dy * .68 + innerHeight * .055}px) rotateY(-23deg) rotateZ(-6deg) scale(2.5)`, opacity: 1, filter: 'blur(.3px)', offset: .52 },
      { transform: `perspective(1100px) translate(${dx - innerWidth * .6}px,${dy + innerHeight * .11}px) rotateY(-43deg) rotateZ(-8deg) scale(4.5)`, opacity: 1, filter: 'blur(.7px)', offset: .80 },
      { transform: `perspective(1100px) translate(${dx - innerWidth * 1.35}px,${dy + innerHeight * .15}px) rotateY(-60deg) rotateZ(-10deg) scale(6.2)`, opacity: 0, filter: 'blur(1px)', offset: 1 },
    ]);
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
    const duration = short ? 220 : ENTRANCE.passage;
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
