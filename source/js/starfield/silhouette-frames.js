// Offline sprite generator; the live walker only reads silhouette-walk-frames.png.
// Complete poses sampled from the author's walking reference, 0.667–1.233 seconds.
// Reference poses supply the textures; intermediate joints keep each leg's lengths.
const FRAME_WIDTH = 280, FRAME_HEIGHT = 390, FRAME_COLUMNS = 6, FRAME_COUNT = 17;
// Sample at 120 Hz so a 60 Hz display can always select a fresh in-between pose.
const SMOOTH_FRAMES = 68, SMOOTH_COLUMNS = 6;
const REFERENCE_FLOOR = 385;

function prepareAtlas(image) {
  const atlas = image.ownerDocument.createElement('canvas');
  atlas.width = image.naturalWidth; atlas.height = image.naturalHeight;
  const context = atlas.getContext('2d');
  if (!context || atlas.width !== FRAME_WIDTH * FRAME_COLUMNS || atlas.height !== FRAME_HEIGHT * 3) return null;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, atlas.width, atlas.height), data = pixels.data;
  const size = FRAME_WIDTH * FRAME_HEIGHT;
  const candidates = new Uint8Array(size), kept = new Uint8Array(size), queue = new Int32Array(size);
  const anchors = [], heads = [];
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const left = frame % FRAME_COLUMNS * FRAME_WIDTH, top = Math.floor(frame / FRAME_COLUMNS) * FRAME_HEIGHT;
    let seed = -1, closest = Infinity;
    candidates.fill(0); kept.fill(0);
    for (let y = 24; y < REFERENCE_FLOOR; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
      const pixel = ((top + y) * atlas.width + left + x) * 4;
      const low = Math.min(data[pixel], data[pixel + 1], data[pixel + 2]);
      const high = Math.max(data[pixel], data[pixel + 1], data[pixel + 2]);
      if (low <= 75 || high - low >= 140) continue;
      const index = y * FRAME_WIDTH + x;
      candidates[index] = 1;
      if (y < 95 && low > 210) {
        const distance = (x - 125) ** 2 + (y - 60) ** 2;
        if (distance < closest) { closest = distance; seed = index; }
      }
    }
    if (seed < 0) return null;
    // Keep only the connected character; discard the game background, text and floor marker.
    let start = 0, end = 1;
    queue[0] = seed; kept[seed] = 1;
    while (start < end) {
      const index = queue[start++], x = index % FRAME_WIDTH, y = Math.floor(index / FRAME_WIDTH);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= FRAME_WIDTH || ny < 24 || ny >= REFERENCE_FLOOR) continue;
        const next = ny * FRAME_WIDTH + nx;
        if (!candidates[next] || kept[next]) continue;
        kept[next] = 1; queue[end++] = next;
      }
    }
    let headX = 0, headY = 0, headPixels = 0;
    for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
      const pixel = ((top + y) * atlas.width + left + x) * 4;
      const alpha = kept[y * FRAME_WIDTH + x] ? Math.min(data[pixel], data[pixel + 1], data[pixel + 2]) : 0;
      data[pixel] = data[pixel + 1] = data[pixel + 2] = 255; data[pixel + 3] = alpha;
      if (y < 95 && alpha > 210) { headX += x; headY += y; headPixels++; }
    }
    if (!headPixels) return null;
    // Remove the reference recording's horizontal travel while retaining its natural vertical bob.
    anchors.push(headX / headPixels);
    heads.push(headY / headPixels);
  }
  context.putImageData(pixels, 0, 0);
  return { atlas, anchors, heads };
}

const poseLegs = [
  [
    { hip: [138, 223], knee: [168, 291], ankle: [200, 363], angle: -.42 },
    { hip: [124, 224], knee: [107, 291], ankle: [70, 354], angle: .4 },
  ],
  [
    { hip: [131, 220], knee: [128, 291], ankle: [128, 367], angle: 0 },
    { hip: [123, 220], knee: [126, 292], ankle: [61, 337], angle: .91 },
  ],
  [
    { hip: [124, 219], knee: [116, 292], ankle: [108, 367], angle: 0 },
    { hip: [138, 219], knee: [152, 288], ankle: [98, 338], angle: .94 },
  ],
];
const mix = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function curve(a, b, c, d, t) {
  return .5 * ((2 * b) + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t +
    (3 * b - a - 3 * c + d) * t * t * t);
}
function legAt(key, leg) { return poseLegs[key % 3][key % 6 < 3 ? leg : 1 - leg]; }
function jointNormal(leg, joint) {
  const upper = distance(leg.hip, leg.knee), lower = distance(leg.knee, leg.ankle);
  let x = (leg.knee[1] - leg.hip[1]) / upper, y = -(leg.knee[0] - leg.hip[0]) / upper;
  if (joint === 'knee') { x += (leg.ankle[1] - leg.knee[1]) / lower; y -= (leg.ankle[0] - leg.knee[0]) / lower; }
  if (joint === 'ankle') { x = (leg.ankle[1] - leg.knee[1]) / lower; y = -(leg.ankle[0] - leg.knee[0]) / lower; }
  const length = Math.hypot(x, y);
  return [x / length, y / length];
}
function legMesh(leg) {
  return ['hip', 'knee', 'ankle'].flatMap((joint, index) => {
    const normal = index ? jointNormal(leg, joint) : [1, 0], halfWidth = [14, 11, 10][index];
    return [-1, 1].map(side => [leg[joint][0] + normal[0] * halfWidth * side, leg[joint][1] + normal[1] * halfWidth * side]);
  });
}
function intermediateLeg(key, leg, t, sole) {
  const a = legAt((key + 5) % 6, leg), b = legAt(key, leg), c = legAt((key + 1) % 6, leg), d = legAt((key + 2) % 6, leg);
  const hip = b.hip.map((value, i) => mix(value, c.hip[i], t));
  const foot = (pose, phase) => {
    const contact = leg === 0 ? phase <= 3 : phase === 0 || phase >= 3;
    const bottom = Math.max(...sole.map(([x, y]) => x * Math.sin(pose.angle) + y * Math.cos(pose.angle)));
    return [pose.ankle[0], contact ? REFERENCE_FLOOR - 1 - bottom : pose.ankle[1]];
  };
  const positions = [foot(a, (key + 5) % 6), foot(b, key), foot(c, (key + 1) % 6), foot(d, (key + 2) % 6)];
  const ankle = b.ankle.map((_, i) => curve(...positions.map(point => point[i]), t));
  const angle = curve(a.angle, b.angle, c.angle, d.angle, t);
  const soleOffset = Math.max(...sole.map(([x, y]) => x * Math.sin(angle) + y * Math.cos(angle)));
  const grounded = leg === 0;
  ankle[1] = grounded ? REFERENCE_FLOOR - 1 - soleOffset : Math.min(ankle[1], REFERENCE_FLOOR - 1 - soleOffset);
  const upper = mix(distance(b.hip, b.knee), distance(c.hip, c.knee), t);
  const lower = mix(distance(b.knee, b.ankle), distance(c.knee, c.ankle), t);
  const reach = upper + lower - .001;
  if (distance(hip, ankle) > reach) hip[1] = ankle[1] - Math.sqrt(Math.max(0, reach * reach - (ankle[0] - hip[0]) ** 2));
  const length = distance(hip, ankle);
  const dx = (ankle[0] - hip[0]) / length, dy = (ankle[1] - hip[1]) / length;
  const along = (upper * upper - lower * lower + length * length) / (2 * length);
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  return { hip, ankle, angle, knee: [hip[0] + dx * along + dy * bend, hip[1] + dy * along - dx * bend] };
}
function paintLeg(context, texture, leg) {
  const mesh = legMesh(leg), outline = [mesh[0], mesh[2], mesh[4], mesh[5], mesh[3], mesh[1]];
  context.save(); context.beginPath();
  outline.forEach((point, index) => {
    const before = outline[(index + outline.length - 1) % outline.length], after = outline[(index + 1) % outline.length];
    const radius = index === 1 || index === 4 ? 7 : 2;
    const entry = point.map((value, i) => value + (before[i] - value) * Math.min(.2, radius / distance(point, before)));
    const exit = point.map((value, i) => value + (after[i] - value) * Math.min(.2, radius / distance(point, after)));
    if (index) context.lineTo(...entry); else context.moveTo(...entry);
    context.quadraticCurveTo(...point, ...exit);
  });
  context.closePath(); context.clip();
  // The source's solid trouser pixels fill a continuously skinned leg, without ghost limbs.
  context.drawImage(texture, 125, 210, 8, 8, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  context.restore();
}

function paintPelvis(context, texture, legs) {
  const top = 215, bottom = 244, height = bottom - top;
  const pixels = context.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT).data;
  const center = Math.round((legs[0].hip[0] + legs[1].hip[0]) / 2);
  const bodyWidth = y => {
    const alpha = x => pixels[(y * FRAME_WIDTH + x) * 4 + 3];
    let left = center, right = center;
    while (left > 0 && alpha(left - 1) >= 128) left--;
    while (right < FRAME_WIDTH - 1 && alpha(right + 1) >= 128) right++;
    return [left - .5 + (128 - alpha(left - 1)) / (alpha(left) - alpha(left - 1)),
      right + .5 + (128 - alpha(right)) / (alpha(right + 1) - alpha(right))];
  };
  const legWidth = y => {
    const crossings = [];
    for (const leg of legs) {
      const mesh = legMesh(leg), outline = [mesh[0], mesh[2], mesh[4], mesh[5], mesh[3], mesh[1]];
      outline.forEach((a, i) => {
        const b = outline[(i + 1) % outline.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) crossings.push(mix(a[0], b[0], (y - a[1]) / (b[1] - a[1])));
      });
    }
    return [Math.min(...crossings), Math.max(...crossings)];
  };
  const upper = bodyWidth(top), previous = bodyWidth(top - 6), lower = legWidth(bottom), next = legWidth(bottom + 8);
  const startSlope = upper.map((x, i) => Math.max(-.65, Math.min(.65, (x - previous[i]) / 6)));
  const endSlope = lower.map((x, i) => (next[i] - x) / 8);
  // Replace the two cut edges with one continuous waist, matching the torso and thigh tangents.
  context.clearRect(0, top + 1, FRAME_WIDTH, FRAME_HEIGHT - top - 1);
  context.save(); context.beginPath();
  context.moveTo(upper[0], top); context.lineTo(upper[1], top);
  context.bezierCurveTo(upper[1] + startSlope[1] * height / 3, top + height / 3,
    lower[1] - endSlope[1] * height / 3, bottom - height / 3, lower[1], bottom);
  context.lineTo(lower[0], bottom);
  context.bezierCurveTo(lower[0] - endSlope[0] * height / 3, bottom - height / 3,
    upper[0] + startSlope[0] * height / 3, top + height / 3, upper[0], top);
  context.closePath(); context.clip();
  context.drawImage(texture, 125, 210, 8, 8, 0, 0, FRAME_WIDTH, FRAME_HEIGHT); context.restore();
}

function paintUnifiedContour(context, mask, texture) {
  const { width, height } = mask, alpha = mask.getContext('2d').getImageData(0, 0, width, height).data;
  const links = new Map(), points = new Map();
  const pairs = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
    [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[3, 1]], [[0, 1]], [[3, 0]], []];
  for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
    const index = (y * width + x) * 4 + 3;
    const a = alpha[index], b = alpha[index + 4], c = alpha[index + width * 4 + 4], d = alpha[index + width * 4];
    const bits = (a >= 128 ? 1 : 0) | (b >= 128 ? 2 : 0) | (c >= 128 ? 4 : 0) | (d >= 128 ? 8 : 0);
    if (!bits || bits === 15) continue;
    const values = [a, b, c, d];
    const vertices = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const ids = [(y * width + x) * 2, (y * width + x + 1) * 2 + 1,
      ((y + 1) * width + x) * 2, (y * width + x) * 2 + 1];
    for (const pair of pairs[bits]) {
      for (const edge of pair) {
        const id = ids[edge], next = (edge + 1) % 4;
        if (!points.has(id)) {
          const t = (128 - values[edge]) / (values[next] - values[edge]);
          points.set(id, vertices[edge].map((value, i) => mix(value, vertices[next][i], t) + .5));
        }
      }
      const a = ids[pair[0]], b = ids[pair[1]];
      if (!links.has(a)) links.set(a, []);
      if (!links.has(b)) links.set(b, []);
      links.get(a).push(b); links.get(b).push(a);
    }
  }
  const outline = new Path2D(), visited = new Set();
  for (const start of links.keys()) {
    if (visited.has(start)) continue;
    const contour = []; let current = start, previous = -1;
    do {
      visited.add(current); contour.push(points.get(current));
      const next = links.get(current)?.find(id => id !== previous);
      previous = current; current = next;
    } while (current !== undefined && current !== start && !visited.has(current));
    if (contour.length < 3) continue;
    const midpoint = (a, b) => a.map((value, i) => (value + b[i]) / 2);
    outline.moveTo(...midpoint(contour[contour.length - 1], contour[0]));
    contour.forEach((point, i) => outline.quadraticCurveTo(...point, ...midpoint(point, contour[(i + 1) % contour.length])));
    outline.closePath();
  }
  // Rasterize the entire character together, giving every contour the same antialiasing.
  context.save(); context.clip(outline, 'evenodd');
  context.drawImage(texture, 125, 210, 8, 8, 0, 0, width, height); context.restore();
}

function prepareSmoothFrames(prepared, document) {
  const makeCanvas = (width = FRAME_WIDTH, height = FRAME_HEIGHT) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
  };
  const sourceFrames = [0, 6, 12];
  const poses = sourceFrames.map(frame => {
    const texture = makeCanvas(), context = texture.getContext('2d');
    context.drawImage(prepared.atlas, frame % FRAME_COLUMNS * FRAME_WIDTH, Math.floor(frame / FRAME_COLUMNS) * FRAME_HEIGHT,
      FRAME_WIDTH, FRAME_HEIGHT, 125 - prepared.anchors[frame], 0, FRAME_WIDTH, FRAME_HEIGHT);
    return texture;
  });
  // One intact neutral boot is rotated as a whole throughout the stride.
  const boot = makeCanvas(54, 34), bootContext = boot.getContext('2d');
  bootContext.drawImage(poses[1], 112, 352, 54, 34, 0, 0, 54, 34);
  const bootPixels = bootContext.getImageData(0, 0, 54, 34).data, sole = [];
  for (let x = 0; x < 54; x++) for (let y = 33; y >= 0; y--) {
    if (bootPixels[(y * 54 + x) * 4 + 3] > 100) { sole.push([x - 16, y - 15]); break; }
  }
  const atlas = makeCanvas(FRAME_WIDTH * SMOOTH_COLUMNS, FRAME_HEIGHT * Math.ceil(SMOOTH_FRAMES / SMOOTH_COLUMNS));
  const output = atlas.getContext('2d'), mask = makeCanvas(), maskContext = mask.getContext('2d');
  for (let frame = 0; frame < SMOOTH_FRAMES; frame++) {
    const phase = frame / SMOOTH_FRAMES * 3, key = Math.floor(phase), t = phase - key;
    const legs = [0, 1].map(leg => intermediateLeg(key, leg, t, sole));
    const headY = mix(prepared.heads[sourceFrames[key]], prepared.heads[sourceFrames[(key + 1) % 3]], t);
    const left = frame % SMOOTH_COLUMNS * FRAME_WIDTH, top = Math.floor(frame / SMOOTH_COLUMNS) * FRAME_HEIGHT;
    maskContext.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    for (let side = 0; side < 2; side++) {
      const sourceKey = key + side, texture = poses[sourceKey % 3];
      const offsetY = headY - prepared.heads[sourceFrames[sourceKey % 3]];
      maskContext.globalCompositeOperation = 'lighter'; maskContext.globalAlpha = side ? t : 1 - t;
      maskContext.drawImage(texture, 0, 0, FRAME_WIDTH, 225, 0, offsetY, FRAME_WIDTH, 225);
    }
    maskContext.globalCompositeOperation = 'source-over'; maskContext.globalAlpha = 1;
    paintPelvis(maskContext, poses[1], legs);
    maskContext.save(); maskContext.beginPath(); maskContext.rect(0, 244, FRAME_WIDTH, FRAME_HEIGHT - 244); maskContext.clip();
    for (const leg of legs) {
      paintLeg(maskContext, poses[1], leg);
      maskContext.save(); maskContext.translate(...leg.ankle); maskContext.rotate(leg.angle); maskContext.drawImage(boot, -16, -15); maskContext.restore();
    }
    maskContext.restore();
    output.save(); output.translate(left, top);
    paintUnifiedContour(output, mask, poses[1]);
    output.restore();
  }
  return { atlas };
}

// Rebuild the complete, uniformly rasterized sprite atlas when the reference changes.
export function createSilhouetteFrames(image) {
  const reference = prepareAtlas(image);
  return reference && prepareSmoothFrames(reference, image.ownerDocument);
}
