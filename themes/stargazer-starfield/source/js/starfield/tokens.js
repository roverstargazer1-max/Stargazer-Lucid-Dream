// The motion vocabulary, shared by every JS-driven animation.
// CSS mirrors these names in `motion-tokens.css`; the values are duplicated there
// because custom properties cannot be read by Canvas. Keep the two in step: a
// curve changed here must be changed there too.
//
// Before this module each component invented its own numbers — `smooth(t)` for the
// camera, `1 - Math.exp(-dt * 6)` for clouds, bare `ease` in CSS — so unrelated
// moments felt unrelated. These are the only curves the site animates on.

export const unit = value => Math.max(0, Math.min(1, value));

// Cubic-bezier evaluated directly, so Canvas and DOM agree on the same curve.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = t => ((ax * t + bx) * t + cx) * t;
  const sampleY = t => ((ay * t + by) * t + cy) * t;
  const slopeX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    const target = unit(x);
    if (target === 0 || target === 1) return target;
    // Newton first, then a bisection guard for the flat ends of the curve.
    let t = target;
    for (let i = 0; i < 6; i++) {
      const error = sampleX(t) - target;
      if (Math.abs(error) < 1e-5) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let low = 0, high = 1;
    t = target;
    for (let i = 0; i < 20; i++) {
      const error = sampleX(t) - target;
      if (Math.abs(error) < 1e-5) break;
      if (error > 0) high = t; else low = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };
}

/* Curves.
   settle is the site's original camera curve — the exact smootherstep
   `t³(10−15t+6t²)` — kept bit-for-bit because the entrance, the window passage and
   the return were all timed and approved against it. It is sharper than a typical
   ease-in-out: almost no movement in the first tenth, almost none in the last.
   enter / exit / drift are new and are used for UI state changes, not the camera. */
export const settle = value => {
  const t = unit(value);
  return t * t * t * (10 + t * (-15 + 6 * t));
};
export const enter = bezier(.16, .84, .24, 1);
export const exit = bezier(.55, .02, .80, .30);
export const drift = bezier(.45, .05, .55, .95);

/* Durations in ms, matching the CSS names. */
export const DUR = {
  press: 90,
  hover: 180,
  quick: 260,
  panel: 420,
  scene: 800,
};

/* Frame-rate independent approach, for values that chase a target each frame
   rather than running on a fixed timeline. Replaces ad-hoc `* (1 - exp(-dt * k))`
   coefficients, which made hover response depend on the display's refresh rate. */
export function approach(current, target, dt, halfLife = 120) {
  if (halfLife <= 0) return target;
  return target + (current - target) * Math.pow(2, -dt * 1000 / halfLife);
}

/* The camera's own curve. Kept as a named function because the entrance, the
   return and the selection travel all previously used different smoothed forms. */
export function smooth(value) {
  const t = unit(value);
  return settle(t);
}

export const cue = (progress, start, end) => settle((progress - start) / (end - start));

/* Sequential reveal timing. Returns the delay for item `index`, capped so a long
   list never makes the last item visibly wait. */
export const STAGGER_STEP = 38;
export const STAGGER_MAX = 6;
export function staggerDelay(index, step = STAGGER_STEP) {
  return Math.min(index, STAGGER_MAX) * step;
}

export const ENTRANCE = { passage: 2857, turnStart: 0, duration: 2857, turn: Math.PI / 3, clarify: 593, clear: 2679, retreat: 2857 };
export const PREVIEW = { duration: 1100, clear: 950 };
// Mode switches and dock returns move the whole sky, so they use the scene
// duration rather than a one-off 1800ms.
export const TRAVEL_SCENE = 1800;
export const TRAVEL_QUICK = 220;
