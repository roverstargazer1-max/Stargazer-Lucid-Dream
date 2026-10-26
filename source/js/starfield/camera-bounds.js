import { DOME_RADIUS, MIN_SKY_ZOOM, clamp } from './dome.js';

export const MAX_TERRAIN_FRACTION = .2;
// The renderer's tallest ridge is below .045 rad; keep a small framing margin.
export const TERRAIN_CEILING = .06;

export function skyProjection(width, height, zoom = 1) {
  return {
    cx: width * (width <= 760 ? .56 : .5),
    cy: height * (width <= 760 ? .49 : .46),
    focal: Math.min(width, height * 1.2) * 1.05 * zoom,
  };
}

export function constrainSkyCamera(camera, width, height) {
  const base = skyProjection(width, height);
  const rowOffset = height * (1 - MAX_TERRAIN_FRACTION) - base.cy;
  const horizontalOffset = Math.max(base.cx, width - base.cx);
  const rise = DOME_RADIUS * Math.sin(TERRAIN_CEILING) - camera.y;
  const ringRadius = DOME_RADIUS * Math.cos(TERRAIN_CEILING);
  const originRadius = Math.hypot(camera.x, camera.z);
  // The highest direction toward the terrain ceiling, from any azimuth.
  // Looking above this cone keeps every column's ridge below the budget row,
  // including after an article's automatic docking translates the observer.
  const reach = rise > 0 ? Math.abs(ringRadius - originRadius) : ringRadius + originRadius;
  const elevation = Math.atan2(rise, reach);
  const verticalRay = Math.sin(elevation);
  // Extremely wide views may need a narrower lens even at the zenith.
  const minimumFocal = rise > 0 ? Math.hypot(rowOffset, horizontalOffset) * Math.tan(elevation) : 0;
  const zoom = Math.max(camera.zoom, MIN_SKY_ZOOM, minimumFocal / base.focal * 1.000001);
  const focal = base.focal * zoom;
  const down = rowOffset / focal, side = horizontalOffset / focal;
  const rayLength = Math.sqrt(1 + down * down + side * side);
  // For a downward ray, the center column is lower than either edge.
  const required = verticalRay * (verticalRay > 0 ? rayLength : Math.sqrt(1 + down * down));
  const minimumPitch = Math.max(0, Math.atan(down) + Math.asin(clamp(required / Math.sqrt(1 + down * down), -1, 1)));
  return { ...camera, zoom, pitch: clamp(camera.pitch, minimumPitch, Math.PI / 2) };
}
