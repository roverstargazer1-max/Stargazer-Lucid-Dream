// Complete poses are pre-rendered as one silhouette with a continuous waist and uniform edges.
// Rebuild the sprite with createSilhouetteFrames in silhouette-frames.js after changing its reference.
const SOURCE_WIDTH = 1024, SOURCE_HEIGHT = 1536;
const FRAME_WIDTH = 280, FRAME_HEIGHT = 390, FRAME_COLUMNS = 6, FRAME_COUNT = 68;
const PERIOD = 17 * 1000 / 30;
const REFERENCE_FLOOR = 385, REFERENCE_HEIGHT = 355;

export function createSilhouetteWalker(element) {
  const image = element?.querySelector('.silhouette-still'), frames = element?.querySelector('.silhouette-frames');
  const canvas = element?.querySelector('canvas'), context = canvas?.getContext('2d');
  if (!image || !frames || !context) return { render() {} };
  let failed = false, walkTime = 0, previousTime = null, lastFrame = -1;
  function showStill() {
    if (image.hidden) image.hidden = false;
    if (!canvas.hidden) canvas.hidden = true;
    previousTime = null; lastFrame = -1;
  }
  return {
    render(now, enabled) {
      if (!enabled || failed || !frames.complete || !frames.naturalWidth) { showStill(); return; }
      if (frames.naturalWidth !== FRAME_WIDTH * FRAME_COLUMNS || frames.naturalHeight !== FRAME_HEIGHT * Math.ceil(FRAME_COUNT / FRAME_COLUMNS)) {
        failed = true; showStill(); return;
      }
      if (previousTime !== null) walkTime += Math.min(100, now - previousTime);
      previousTime = now;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(element.clientWidth * ratio)), height = Math.max(1, Math.round(element.clientHeight * ratio));
      const frame = Math.floor(walkTime % PERIOD / PERIOD * FRAME_COUNT);
      const resized = canvas.width !== width || canvas.height !== height;
      if (!resized && frame === lastFrame) return;
      lastFrame = frame;
      if (resized) { canvas.width = width; canvas.height = height; context.imageSmoothingQuality = 'high'; }
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width / SOURCE_WIDTH, height / SOURCE_HEIGHT);
      const offsetX = (width - SOURCE_WIDTH * scale) / 2, offsetY = (height - SOURCE_HEIGHT * scale) / 2;
      const poseScale = 1302 * scale / REFERENCE_HEIGHT;
      const x = offsetX + 528 * scale - 125 * poseScale;
      const y = offsetY + 1420 * scale - REFERENCE_FLOOR * poseScale;
      context.drawImage(frames, frame % FRAME_COLUMNS * FRAME_WIDTH, Math.floor(frame / FRAME_COLUMNS) * FRAME_HEIGHT,
        FRAME_WIDTH, FRAME_HEIGHT, x, y, FRAME_WIDTH * poseScale, FRAME_HEIGHT * poseScale);
      if (canvas.hidden) canvas.hidden = false;
      if (!image.hidden) image.hidden = true;
    },
  };
}
