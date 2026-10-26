import { direction, createDomeProjector } from './dome.js';

// Small independent painted clouds. The same raster alpha drives paint and hit testing.
let sprites = null;

export async function prepareInteractiveClouds() {
  if (sprites) return;
  const images = await Promise.all([1, 2, 3].map(async seed => {
    const image = new Image();
    image.src = new URL(`../../images/optimized/cloud-${seed}.png`, import.meta.url).href;
    await image.decode();
    return image;
  }));
  sprites = images.map(makeCloud);
}

function makeCloud(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  // Hit testing needs only alpha; the original color pixels stay in the canvases.
  const rgba = ctx.getImageData(0, 0, 512, 224).data;
  const alpha = new Uint8Array(512 * 224);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  const glow = document.createElement('canvas');
  glow.width = 512;
  glow.height = 224;
  const glowCtx = glow.getContext('2d');
  glowCtx.drawImage(canvas, 0, 0);
  glowCtx.globalCompositeOperation = 'source-atop';
  glowCtx.fillStyle = '#5bd9ff30';
  glowCtx.fillRect(0, 0, 512, 224);
  return { canvas, glow, alpha };
}

function projectCloud(cloud, shift, project, w, h) {
  const az = cloud.azimuth + shift * .043, el = cloud.elevation + shift * .012;
  const cw = cloud.width * (1 + shift * .13), ch = cloud.height * (1 + shift * .08);
  const at = (a, e) => project(direction(a, e, 5300));
  const center = at(az, el), left = at(az - cw / 2, el), right = at(az + cw / 2, el);
  const top = at(az, el + ch / 2), bottom = at(az, el - ch / 2);
  if (!center || !left || !right || !top || !bottom) return null;
  // Cull against the cloud's actual dome footprint before fitting a flat sprite.
  // Near the camera plane, extrapolating that fit can pull an offscreen cloud
  // back across the sky as a very long strip. Edge midpoints retain the curve.
  const footprint = [[-.5, -.5], [0, -.5], [.5, -.5], [.5, 0], [.5, .5], [0, .5], [-.5, .5], [-.5, 0]]
    .map(([u, v]) => at(az + cw * u, el + ch * v));
  if (footprint.some(p => !p) || footprint.every(p => p.x < 0) || footprint.every(p => p.x > w) ||
    footprint.every(p => p.y < 0) || footprint.every(p => p.y > h)) return null;
  const a = (right.x - left.x) / 512, b = (right.y - left.y) / 512;
  const c = (bottom.x - top.x) / 224, d = (bottom.y - top.y) / 224;
  const tx = center.x - a * 256 - c * 112, ty = center.y - b * 256 - d * 112;
  if (![a, b, c, d, tx, ty].every(Number.isFinite) || Math.abs(a * d - b * c) < .0001 ||
    Math.hypot(a, b) * 512 > w * 2 || Math.hypot(c, d) * 224 > h * 2) return null;
  const corners = [[0, 0], [512, 0], [0, 224], [512, 224]]
    .map(([x, y]) => ({ x: a * x + c * y + tx, y: b * x + d * y + ty }));
  if (corners.every(p => p.x < 0) || corners.every(p => p.x > w) ||
    corners.every(p => p.y < 0) || corners.every(p => p.y > h)) return null;
  return { center, a, b, c, d, tx, ty, footprint };
}

function insideFootprint(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function sameProjection(previous, camera, settings, w, h) {
  return previous && previous.w === w && previous.h === h &&
    previous.x === camera.x && previous.y === camera.y && previous.z === camera.z &&
    previous.yaw === camera.yaw && previous.pitch === camera.pitch &&
    previous.cx === settings.cx && previous.cy === settings.cy && previous.focal === settings.focal;
}

export function createInteractiveClouds(world, isSoft = () => matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const clouds = [[-.38, .28, .36, .15], [1.94, .37, .40, .16], [4.18, .42, .44, .18]]
    .map(([azimuth, elevation, width, height], i) => {
      const button = document.createElement('button');
      button.className = 'cloud-target';
      button.hidden = true;
      button.setAttribute('aria-label', `轻触第 ${i + 1} 朵云`);
      world.append(button);
      const cloud = { id: i, azimuth, elevation, width, height, age: null, hover: 0, sprite: sprites[i], button };
      button.onclick = e => { if (e.detail === 0) activate(cloud); };
      return cloud;
    });
  let frames = [], hovered = null, blocked = true;
  let projection = null, project = null;

  function activate(cloud) {
    if (blocked || cloud.age !== null) return;
    cloud.age = 0;
  }

  function hit(x, y) {
    if (blocked) return null;
    for (const frame of [...frames].reverse()) {
      const { a, b, c, d, tx, ty, cloud, opacity, footprint } = frame, det = a * d - b * c;
      if (!insideFootprint(x, y, footprint)) continue;
      const u = (d * (x - tx) - c * (y - ty)) / det, v = (-b * (x - tx) + a * (y - ty)) / det;
      if (u < 0 || u >= 512 || v < 0 || v >= 224) continue;
      if (cloud.sprite.alpha[Math.floor(v) * 512 + Math.floor(u)] * opacity > 55) return cloud;
    }
    return null;
  }

  return {
    hover(x, y, enabled) {
      hovered = enabled ? hit(x, y)?.id : null;
      return hovered !== null && hovered !== undefined;
    },
    clearHover() { hovered = null; },
    tap(x, y) {
      const cloud = hit(x, y);
      if (!cloud) return false;
      activate(cloud);
      return true;
    },
    update(dt, isBlocked) {
      blocked = isBlocked;
      if (blocked) { hovered = null; return; }
      for (const cloud of clouds) {
        if (cloud.age !== null) {
          cloud.age += dt;
          if (cloud.age >= (isSoft() ? .85 : 7)) cloud.age = null;
        }
        const target = hovered === cloud.id || cloud.button.matches(':focus-visible') ? 1 : 0;
        cloud.hover += (target - cloud.hover) * (1 - Math.exp(-dt * 6));
      }
    },
    paint(ctx, w, h, camera, settings) {
      frames = [];
      const projectionChanged = !sameProjection(projection, camera, settings, w, h);
      if (projectionChanged) {
        project = createDomeProjector(camera, settings);
        projection = {
          w, h, x: camera.x, y: camera.y, z: camera.z, yaw: camera.yaw, pitch: camera.pitch,
          cx: settings.cx, cy: settings.cy, focal: settings.focal,
        };
      }
      const visibleButtons = new Set();
      for (const cloud of clouds) {
        const age = cloud.age || 0;
        const strength = cloud.age === null ? 0 : isSoft() ? Math.sin(Math.PI * Math.min(1, age / .85)) :
          age < 1.2 ? Math.sin(age / 1.2 * Math.PI / 2) : ((7 - age) / 5.8) ** 2;
        const shift = isSoft() ? 0 : strength;
        // Hover/opacity still update every frame. Reuse only unchanged geometry,
        // including a cached offscreen result, and invalidate for any camera/viewport input.
        if (projectionChanged || cloud.lastShift !== shift) {
          cloud.geometry = projectCloud(cloud, shift, project, w, h);
          cloud.lastShift = shift;
        }
        if (!cloud.geometry) continue;
        const { center, a, b, c, d, tx, ty, footprint } = cloud.geometry;
        const opacity = 1 - strength * (isSoft() ? .25 : .65);
        frames.push({ a, b, c, d, tx, ty, cloud, opacity, footprint });
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(footprint[0].x, footprint[0].y);
        for (const point of footprint.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.closePath();
        ctx.clip();
        ctx.transform(a, b, c, d, tx, ty);
        ctx.globalAlpha = opacity;
        ctx.drawImage(cloud.sprite.canvas, 0, 0);
        if (cloud.hover > .01) {
          ctx.globalAlpha = opacity * cloud.hover * .30;
          ctx.drawImage(cloud.sprite.glow, 0, 0);
        }
        ctx.restore();
        if (!blocked && center.x >= 22 && center.x <= w - 22 && center.y >= 100 && center.y <= h - 65) visibleButtons.add(cloud.id);
        cloud.button.style.left = center.x + 'px';
        cloud.button.style.top = center.y + 'px';
      }
      for (const cloud of clouds) {
        const hidden = !visibleButtons.has(cloud.id);
        if (cloud.button.hidden !== hidden) cloud.button.hidden = hidden;
      }
    },
  };
}
