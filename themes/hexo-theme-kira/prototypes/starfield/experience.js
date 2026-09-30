// Visit-local presentation memory. Reading to the end has its own state in app.js.
export function createPreviewMemory() {
  const seen = new Set();
  let pending = null;
  return {
    begin(id) { pending = { id, repeat: seen.has(id) }; return pending; },
    complete(token) {
      if (token !== pending) return false;
      seen.add(token.id); pending = null; return true;
    },
    cancel() { pending = null; },
  };
}

export function dockTarget(width, height, preview) {
  const landscape = width > height && height <= 500;
  if (landscape) return { x: Math.min(width * .28, preview.left - 52), y: height * .48 };
  if (width <= 760) return {
    x: width * .67,
    y: Math.max(206, Math.min(height * .35, preview.top - 44)),
  };
  return { x: Math.min(width * .40, preview.left - 60), y: height * .42 };
}
