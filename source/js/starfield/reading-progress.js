// Progress covers the scroll distance needed to reveal the end of the body.
// It excludes related links, and is recalculated after images/fonts change layout.
export function readingProgress({ scrollTop, contentBottom, viewportHeight, tolerance = 2 }) {
  const distance = Math.max(0, contentBottom - viewportHeight);
  const complete = distance <= tolerance || scrollTop >= distance - tolerance;
  const fraction = complete ? 1 : Math.max(0, Math.min(1, scrollTop / distance));
  return { fraction, percent: complete ? 100 : Math.min(99, Math.round(fraction * 100)), complete };
}
