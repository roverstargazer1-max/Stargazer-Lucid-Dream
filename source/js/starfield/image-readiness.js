const pending = new WeakMap();

// Optional artwork must never hold a usable page hostage on a stalled request.
// Keep preparing in the background after the foreground waiting budget expires.
export async function settleWithin(preparation, milliseconds = 1500) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(preparation).then(() => true, () => false),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

// Promote only the requested surface. Repeated intent and click preparation share
// the same decode, and optional artwork failures never make navigation unusable.
export function prepareImages(root, priority = 'low') {
  if (!root) return Promise.resolve([]);
  return Promise.allSettled([...root.querySelectorAll('img[data-src]')].map(image => {
    // A later whole-surface warmup must not downgrade a foreground request.
    if (!pending.has(image) || priority === 'high' || (priority === 'auto' && image.fetchPriority === 'low')) image.fetchPriority = priority;
    if (pending.has(image)) return pending.get(image);
    image.decoding = 'async';
    // Set the selection width before srcset so the browser never first requests
    // a full-size candidate using its default 100vw assumption.
    if (image.dataset.sizes) image.sizes = image.dataset.sizes;
    if (image.dataset.srcset) image.srcset = image.dataset.srcset;
    image.src = image.dataset.src;
    const ready = image.decode().finally(() => {
      delete image.dataset.src;
      delete image.dataset.srcset;
      delete image.dataset.sizes;
      pending.delete(image);
    });
    pending.set(image, ready);
    return ready;
  }));
}
