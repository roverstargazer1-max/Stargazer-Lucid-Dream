// Control points taken from the author's 1254 × 1254 PNG. The two tips define
// the axis; the remaining points form its equatorial plane. Faces carry the
// original bitmap, including its lines, rather than drawing replacement edges.
export const POLYHEDRON_UV = [[650, 259], [707, 1036], [260, 438], [1030, 529], [816, 667], [390, 816]];
const SOURCE_SIZE = 1254;
const PITCH = 37 * Math.PI / 180;
const center = POLYHEDRON_UV[0].map((value, index) => (value + POLYHEDRON_UV[1][index]) / 2);
const axisLength = Math.hypot(...POLYHEDRON_UV[1].map((value, index) => value - POLYHEDRON_UV[0][index]));
const axis = POLYHEDRON_UV[1].map((value, index) => (value - POLYHEDRON_UV[0][index]) / axisLength);
const across = [axis[1], -axis[0]];
const scale = axisLength / 2;
const vertices = POLYHEDRON_UV.map(([u, v], index) => {
  if (index < 2) return [0, (index ? 1 : -1) / Math.cos(PITCH), 0];
  const du = u - center[0], dv = v - center[1];
  return [(du * across[0] + dv * across[1]) / scale, 0,
    -(du * axis[0] + dv * axis[1]) / (scale * Math.sin(PITCH))];
});
const faces = [2, 3, 4, 5].flatMap((point, index, ring) => {
  const next = ring[(index + 1) % ring.length];
  return [[0, next, point], [1, point, next]];
});

export function projectPolyhedron(angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return vertices.map(([x, y, z]) => {
    const rx = x * cos + z * sin, rz = z * cos - x * sin;
    const ry = y * Math.cos(PITCH) - rz * Math.sin(PITCH);
    return {
      x: center[0] + scale * (across[0] * rx + axis[0] * ry),
      y: center[1] + scale * (across[1] * rx + axis[1] * ry),
    };
  });
}

function textureTransform(source, target) {
  const [a, b, c] = source;
  const determinant = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const coefficients = key => {
    const ab = target[1][key] - target[0][key], ac = target[2][key] - target[0][key];
    const x = (ab * (c[1] - a[1]) - ac * (b[1] - a[1])) / determinant;
    const y = (ac * (b[0] - a[0]) - ab * (c[0] - a[0])) / determinant;
    return [x, y, target[0][key] - x * a[0] - y * a[1]];
  };
  const [a1, c1, e1] = coefficients('x'), [b1, d1, f1] = coefficients('y');
  return [a1, b1, c1, d1, e1, f1];
}

export function createPolyhedron(element) {
  const image = element?.querySelector('img'), canvas = element?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!image || !context) return { render() {} };
  let previousTime = null, rotationTime = 0, lastPaint = -Infinity;
  return {
    render(now, enabled) {
      if (!enabled || !image.complete || !image.naturalWidth) {
        image.hidden = false; canvas.hidden = true;
        previousTime = null; rotationTime = 0; lastPaint = -Infinity;
        return;
      }
      if (previousTime !== null) rotationTime += Math.min(100, now - previousTime);
      previousTime = now;
      if (now - lastPaint < 1000 / 30) return;
      lastPaint = now;
      canvas.hidden = false; image.hidden = true;
      const side = Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)));
      if (canvas.width !== side) canvas.width = canvas.height = side;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, side, side);
      context.scale(side / SOURCE_SIZE, side / SOURCE_SIZE);
      const projected = projectPolyhedron(rotationTime / 13000 * Math.PI * 2);
      for (const face of faces) {
        const points = face.map(index => projected[index]);
        const [a, b, c] = points;
        // Only the outward-facing surfaces contribute a texture, avoiding
        // duplicate translucent strokes where front and back faces overlap.
        if ((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) <= .001) continue;
        context.save();
        context.beginPath(); context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y); context.lineTo(c.x, c.y); context.closePath();
        context.clip();
        context.transform(...textureTransform(face.map(index => POLYHEDRON_UV[index]), points));
        context.drawImage(image, 0, 0);
        context.restore();
      }
    },
  };
}
