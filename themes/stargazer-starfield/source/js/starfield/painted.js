import { DOME_RADIUS, direction, createDomeProjector } from './dome.js';
import { paintDomeEnvironment } from './dome-renderer.js';
export { createRoom } from './room-scene.js';

// The final room leads into one painted, navigable sky.
export const painted = true;
const plate = new Image();
// Load both aperture masks before revealing the live sky, including across a resize.
const windowMasks = painted ? [document.body.dataset.windowMaskDesktop, document.body.dataset.windowMaskMobile].map(src => {
  const mask = new Image();
  mask.src = src;
  return mask;
}) : [];

function waitForImage(image) {
  if (image.complete) return image.naturalWidth ? Promise.resolve(image) :
    Promise.reject(new Error(`Could not load scene image: ${image.src}`));
  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error(`Could not load scene image: ${image.src}`)), { once: true });
  });
}

export async function preparePaintedScene() {
  if (!plate.src) plate.src = document.body.dataset.skyImage;
  await Promise.all([waitForImage(plate), ...windowMasks.map(waitForImage)]);
  await plate.decode();
  return true;
}

let seed = 812;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const stars = Array.from({ length: 600 }, () => {
  const y = random() * 2 - 1, a = random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
  return { x: Math.sin(a) * r, y, z: Math.cos(a) * r, r: .4 + random() * .55, alpha: .2 + random() * .4 };
});
// Sparse pinpricks along the painted band; these stay dimmer and smaller than articles.
const galaxyStars = Array.from({ length: 2400 }, () => {
  const y = random(), a = random() * Math.PI * 2, r = Math.sqrt(1 - y * y), x = Math.sin(a) * r, z = Math.cos(a) * r;
  const band = Math.max(0, 1 - Math.abs(x * .84 - y * .20 + z * .50) / .23);
  return { x, y, z, r: .55 + random() * .55, alpha: (.20 + random() * .26) * band };
}).filter(star => star.y > .58 && star.alpha > .07);
// World coordinates and the moon's shape are fixed; only their projection changes.
const skyStars = stars.concat(galaxyStars).map(star => ({
  ...star, x: star.x * DOME_RADIUS, y: star.y * DOME_RADIUS, z: star.z * DOME_RADIUS,
}));
const moonPosition = direction(.45, .50, DOME_RADIUS);
const crescent = new Path2D('M19 -29 C-5 -43 -35 -24 -33 1 C-33 26 -9 41 14 28 L25 17 C4 31 -19 17 -20 -1 C-21 -21 -1 -33 19 -29Z');

export function paintPaintedSky(ctx, w, h, camera, settings, ambient) {
  const project = createDomeProjector(camera, settings);
  ctx.fillStyle = '#031a87';
  ctx.fillRect(0, 0, w, h);
  const ready = paintDomeEnvironment(ctx, w, h, camera, settings, plate);
  const rendererState = ready ? 'webgl' : 'loading';
  const windowState = ready && windowMasks.every(mask => mask.complete && mask.naturalWidth > 0) ? 'ready' : 'loading';
  if (document.body.dataset.domeRenderer !== rendererState) document.body.dataset.domeRenderer = rendererState;
  if (document.body.dataset.liveWindow !== windowState) document.body.dataset.liveWindow = windowState;
  // Distant decoration shares the article hemisphere and camera, without a screen-space offset.
  for (let index = 0; index < skyStars.length; index += ambient.backgroundStride || 1) {
    const star = skyStars[index];
    if (star.y < 0) continue;
    const p = project(star);
    if (!p || p.x < 0 || p.x > w || p.y < 0 || p.y > h) continue;
    ctx.globalAlpha = star.alpha * .65 * (.45 + .55 * (ambient.clarity ?? 1));
    ctx.fillStyle = '#c5dbef';
    ctx.fillRect(p.x, p.y, star.r, star.r);
  }
  ctx.globalAlpha = 1;
  const moon = project(moonPosition);
  if (moon && moon.x > -100 && moon.x < w + 100 && moon.y > -100 && moon.y < h + 100) {
    const r = Math.min(w, h) * .037 * (camera.zoom || 1);
    ctx.save();
    ctx.translate(moon.x, moon.y);
    ctx.rotate(-.24);
    ctx.shadowColor = '#5bd9ff2a';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#accaff';
    ctx.scale(r / 35, r / 35);
    ctx.fill(crescent);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#d3f7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -29);
    ctx.lineTo(-2, -30);
    ctx.lineTo(-19, -19);
    ctx.lineTo(-27, -2);
    ctx.lineTo(-22, 17);
    ctx.lineTo(-9, 28);
    ctx.stroke();
    ctx.restore();
  }
}

export function paintCloudVeil(ctx, w, h, camera, settings) {
  paintDomeEnvironment(ctx, w, h, camera, settings, plate, true);
}

let coreColors = ['#bceaff', '#d6e3ff', '#effaff'];
export function setStarCoreGain(gain) {
  const g = Math.max(1, Math.min(1.2, gain));
  coreColors = [[171, 213, 243], [195, 206, 243], [221, 231, 243]]
    .map(rgb => '#' + rgb.map(c => Math.min(255, Math.round(c * g)).toString(16).padStart(2, '0')).join(''));
}
setStarCoreGain(1.1);

export function paintPaintedStar(ctx, x, y, id, {
  depth = 1800, active = false, hover = false, zoom = 1, importance = 'ordinary', seconds = null,
} = {}) {
  let identity = 0;
  for (const ch of id) identity = (identity * 31 + ch.charCodeAt(0)) >>> 0;
  const rank = { ordinary: 1, important: 1.3, treasured: 1.65 }[importance] || 1;
  const size = (3.2 + (identity % 7) * .17) * rank * Math.max(.8, Math.min(1.35, Math.sqrt(1800 / depth)));
  const pulse = seconds === null ? 1 : 1 + Math.sin(seconds * .9 + identity) * .025;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(zoom * pulse, zoom * pulse);
  const cyan = identity % 3 !== 0;
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3.1);
  halo.addColorStop(0, cyan ? '#5bd9ff25' : '#b7cfff20');
  halo.addColorStop(.3, cyan ? '#5bd9ff0b' : '#b7cfff09');
  halo.addColorStop(1, '#cce9ff00');
  ctx.fillStyle = halo;
  ctx.fillRect(-size * 3.1, -size * 3.1, size * 6.2, size * 6.2);
  ctx.rotate((identity % 5 - 2) * .08);
  ctx.fillStyle = coreColors[cyan ? 0 : 1];
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? size * .29 : size * (i % 4 === 0 ? 1.2 : .85);
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = coreColors[2];
  ctx.fillRect(-.8, -.8, 1.6, 1.6);
  ctx.restore();
  // State furniture is drawn unrotated so ticks stay on the screen axes.
  // `hover` and `active` are 0..1 (booleans still work) and are eased by the caller,
  // so the ring draws itself in rather than switching on.
  const h = +hover, a = +active;
  if (h < .01 && a < .01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // Hover: one open hairline arc that sweeps closed as attention settles.
  if (h > .01) {
    const r = size + 9 - h * 1.5, sweep = Math.PI * (.35 + 1.25 * h);
    ctx.strokeStyle = `rgba(213,232,255,${(.48 * h).toFixed(3)})`;
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * .62, -Math.PI * .62 + sweep);
    ctx.stroke();
  }
  // Selection: four axis ticks that slide inward and lock, an instrument reticle
  // rather than a glow. Reads as "acquired" without adding light to the sky.
  if (a > .01) {
    const inner = size + 6 + (1 - a) * 10, len = 3 + a * 3;
    ctx.strokeStyle = `rgba(114,219,255,${(.78 * a).toFixed(3)})`;
    ctx.lineWidth = .9;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const dx = Math.cos(i * Math.PI / 2), dy = Math.sin(i * Math.PI / 2);
      ctx.moveTo(dx * inner, dy * inner);
      ctx.lineTo(dx * (inner + len), dy * (inner + len));
    }
    ctx.stroke();
  }
  ctx.restore();
}
