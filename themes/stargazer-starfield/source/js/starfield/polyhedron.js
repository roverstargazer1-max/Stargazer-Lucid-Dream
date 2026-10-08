// The author's axis reference, fitted into the original 1254 × 1254 artboard.
// Both tips share a vertical axis. The four other vertices lie on one 3D plane.
export const POLYHEDRON_REFERENCE = [[678, 259], [678, 1036], [271, 420], [1036, 549], [816, 688], [378, 805]];
const SOURCE_SIZE = 1254;
const PITCH = Math.PI / 4, CAMERA_DISTANCE = 6, SCALE = 480;
const ORIGIN = [678, 595];
const vertices = POLYHEDRON_REFERENCE.map(([u, v], index) => {
  const x = (u - ORIGIN[0]) / SCALE, y = (v - ORIGIN[1]) / SCALE;
  if (index < 2) return [0, y / (Math.cos(PITCH) - y * Math.sin(PITCH) / CAMERA_DISTANCE), 0];
  // Invert the perspective projection onto the equatorial plane, rather than
  // treating the bitmap's crossings as independent surfaces to be stretched.
  const z = -y / (Math.sin(PITCH) + y * Math.cos(PITCH) / CAMERA_DISTANCE);
  return [x * (1 + z * Math.cos(PITCH) / CAMERA_DISTANCE), 0, z];
});
const faces = [2, 3, 4, 5].flatMap((point, index, ring) => {
  const next = ring[(index + 1) % ring.length];
  return [[0, point, next], [1, next, point]];
});
const edges = [2, 3, 4, 5].flatMap((point, index, ring) =>
  [[0, point], [1, point], [point, ring[(index + 1) % ring.length]]]);

export function projectPolyhedron(angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return vertices.map(([x, y, z]) => {
    const rx = x * cos + z * sin, rz = z * cos - x * sin;
    const ry = y * Math.cos(PITCH) - rz * Math.sin(PITCH);
    const depth = y * Math.sin(PITCH) + rz * Math.cos(PITCH);
    const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE + depth);
    return {
      x: ORIGIN[0] + SCALE * rx * perspective,
      y: ORIGIN[1] + SCALE * ry * perspective,
      depth,
    };
  });
}

function edgeTexture(image) {
  // A clean section of the original upper-left edge, without any crossings.
  // Every projected edge uses these bitmap pixels; no substitute strokes/SVG.
  const a = [610, 277], b = [305, 417];
  const strip = document.createElement('canvas');
  strip.width = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); strip.height = 12;
  const context = strip.getContext('2d');
  context.translate(0, strip.height / 2);
  context.rotate(-Math.atan2(b[1] - a[1], b[0] - a[0]));
  context.translate(-a[0], -a[1]);
  context.drawImage(image, 0, 0);
  return strip;
}

export function createPolyhedron(element) {
  const image = element?.querySelector('img'), canvas = element?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!image || !context) return { render() {} };
  let previousTime = null, rotationTime = 0, lastPaint = -Infinity;
  let texture = null, wasEnabled = null;
  return {
    render(now, enabled) {
      if (!image.complete || !image.naturalWidth) {
        if (image.hidden) image.hidden = false;
        if (!canvas.hidden) canvas.hidden = true;
        previousTime = null; rotationTime = 0; lastPaint = -Infinity;
        return;
      }
      if (enabled) {
        if (previousTime !== null) rotationTime += Math.min(100, now - previousTime);
        previousTime = now;
      } else { previousTime = null; rotationTime = 0; }
      if (canvas.hidden) canvas.hidden = false;
      if (!image.hidden) image.hidden = true;
      const side = Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)));
      if (enabled === wasEnabled && canvas.width === side && (!enabled || now - lastPaint < 1000 / 30)) return;
      wasEnabled = enabled; lastPaint = now;
      texture ||= edgeTexture(image);
      if (canvas.width !== side) canvas.width = canvas.height = side;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, side, side);
      context.scale(side / SOURCE_SIZE, side / SOURCE_SIZE);
      const projected = projectPolyhedron(rotationTime / 13000 * Math.PI * 2);
      const frontFaces = faces.filter(face => {
        const [a, b, c] = face.map(index => projected[index]);
        return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) > 0;
      });
      const depthOf = edge => (projected[edge[0]].depth + projected[edge[1]].depth) / 2;
      for (const edge of [...edges].sort((a, b) => depthOf(b) - depthOf(a))) {
        const [a, b] = edge.map(index => projected[index]);
        const front = frontFaces.some(face => edge.every(index => face.includes(index)));
        context.save();
        context.globalAlpha = front ? 1 : .38;
        context.translate(a.x, a.y); context.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        context.drawImage(texture, 0, -texture.height / 2, Math.hypot(b.x - a.x, b.y - a.y), texture.height);
        context.restore();
      }
    },
  };
}
