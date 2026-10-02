// Article drawing and input must agree on which star can actually be reached.
export function isStarReachable(point, width, height, obstacles = []) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const radius = 24;
  if (point.x < radius || point.x > width - radius || point.y < radius || point.y > height - radius) return false;
  return !obstacles.some(rect => point.x + radius > rect.left && point.x - radius < rect.right && point.y + radius > rect.top && point.y - radius < rect.bottom);
}

export function starLabelPlacement(point, width, obstacles = []) {
  let left = 12, right = width - 12;
  for (const rect of obstacles) {
    if (rect.top >= point.y + 24 || rect.bottom <= point.y - 24) continue;
    if (rect.right <= point.x) left = Math.max(left, rect.right + 12);
    if (rect.left >= point.x) right = Math.min(right, rect.left - 12);
  }
  const leftSpace = Math.max(0, point.x - 35 - left);
  const rightSpace = Math.max(0, right - point.x - 35);
  return leftSpace > rightSpace ? { side: 'left', maxWidth: leftSpace } : { side: 'right', maxWidth: rightSpace };
}
