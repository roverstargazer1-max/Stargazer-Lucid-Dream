// Animate narrow strips of the supplied PNG around the same signal centerline.
// Slow phrases, quick syllables and offset peaks keep the CALL from pulsing in unison.
const CANVAS_HEADROOM = 1.5;

function signalActivity(seconds) {
  const phrase = .55 + .35 * Math.sin(seconds * 2.1) + .24 * Math.sin(seconds * 4.9 + .6);
  const envelope = Math.max(0, Math.min(1, (phrase - .25) / .5));
  return envelope * envelope * (3 - 2 * envelope);
}

function signalScale(seconds, position, activity) {
  const syllable = .5 + .5 * Math.sin(seconds * (10.8 + position * 2) - position * 12);
  const detail = .5 + .5 * Math.sin(seconds * 22 - position * 25);
  return .05 + 1.35 * activity * (.4 + .6 * (.7 * syllable + .3 * detail));
}

function signalTexture(image) {
  const texture = image.ownerDocument.createElement('canvas');
  texture.width = image.naturalWidth; texture.height = image.naturalHeight;
  const context = texture.getContext('2d');
  if (!context) return image;
  // Strengthen the original translucent pixels without replacing their colors or detail.
  context.drawImage(image, 0, 0);
  context.globalCompositeOperation = 'lighter';
  context.drawImage(image, 0, 0);
  return texture;
}

export function createCallWaveform(element) {
  const image = element?.querySelector('img'), canvas = element?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!image || !context) return { render() {} };
  let previousTime = null, signalTime = 0, lastPaint = -Infinity, texture = null;
  return {
    render(now, enabled) {
      if (!enabled || !image.complete || !image.naturalWidth) {
        if (image.hidden) image.hidden = false;
        if (!canvas.hidden) canvas.hidden = true;
        previousTime = null; lastPaint = -Infinity;
        return;
      }
      if (previousTime !== null) signalTime += Math.min(100, now - previousTime);
      previousTime = now;
      const width = Math.max(1, Math.round(element.clientWidth * Math.min(devicePixelRatio || 1, 2)));
      const height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth * CANVAS_HEADROOM));
      const resized = canvas.width !== width || canvas.height !== height;
      if (!resized && now - lastPaint < 1000 / 30) return;
      lastPaint = now;
      if (resized) { canvas.width = width; canvas.height = height; }
      context.clearRect(0, 0, width, height);
      texture ||= signalTexture(image);
      const seconds = signalTime / 1000, activity = signalActivity(seconds);
      context.globalAlpha = .45 + .55 * activity;
      const strips = Math.min(96, Math.ceil(width / 3));
      for (let index = 0; index < strips; index++) {
        const left = Math.round(index * width / strips), right = Math.round((index + 1) * width / strips);
        const sourceLeft = left / width * image.naturalWidth;
        const sourceWidth = (right - left) / width * image.naturalWidth;
        const scaledHeight = height / CANVAS_HEADROOM * signalScale(seconds, index / (strips - 1 || 1), activity);
        context.drawImage(texture, sourceLeft, 0, sourceWidth, image.naturalHeight,
          left, (height - scaledHeight) / 2, right - left, scaledHeight);
      }
      if (canvas.hidden) canvas.hidden = false;
      if (!image.hidden) image.hidden = true;
    },
  };
}
