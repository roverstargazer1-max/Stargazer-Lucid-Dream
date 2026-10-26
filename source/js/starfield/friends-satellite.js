import { direction, DOME_RADIUS, projectDome } from './dome.js';
import { skyProjection } from './camera-bounds.js';
import { prepareImages } from './image-readiness.js';

// One place in the virtual sky, independent of article positions and timeline mode.
// It sits just below the zenith; looking up discovers it, turning away leaves it behind.
const position = direction(Math.PI / 3 + .35, 1.24, DOME_RADIUS);

export function satellitePlacement(camera, width, height) {
  const point = projectDome(position, camera, skyProjection(width, height, camera.zoom));
  if (!point) return null;
  const size = point.scale * 600;
  const imageHeight = size * 2 / 3;
  const hitWidth = Math.max(44, size);
  const hitHeight = Math.max(44, imageHeight);
  // Let #world clip the object at the viewport, just like the painted sky.
  // Removing it while its centre is still on screen makes it visibly pop away.
  if (point.x + size / 2 <= 0 || point.x - size / 2 >= width ||
      point.y + imageHeight / 2 <= 0 || point.y - imageHeight / 2 >= height) return null;
  return { x: point.x, y: point.y, size, imageHeight, hitWidth, hitHeight, align: point.x > width - 150 ? 'right' : point.x < 150 ? 'left' : 'center' };
}

export function createFriendsSatellite(entry) {
  let prepared = false;
  let previous = '';
  function prepare() {
    if (entry && !prepared) { prepared = true; void prepareImages(entry); }
  }
  return {
    prepare,
    update(camera, width, height, visible) {
      if (!entry) return;
      const placement = visible ? satellitePlacement(camera, width, height) : null;
      entry.hidden = !placement;
      if (!placement) return;
      prepare();
      const { x, y, size, hitWidth, hitHeight, align } = placement;
      const key = [x, y, size, hitHeight, align].join('|');
      if (key === previous) return;
      previous = key;
      entry.style.left = `${x}px`;
      entry.style.top = `${y}px`;
      entry.style.width = `${hitWidth}px`;
      entry.style.height = `${hitHeight}px`;
      entry.style.setProperty('--satellite-size', `${size}px`);
      entry.dataset.align = align;
    },
  };
}
