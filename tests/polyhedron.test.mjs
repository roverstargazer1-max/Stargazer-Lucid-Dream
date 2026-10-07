import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYHEDRON_REFERENCE, projectPolyhedron } from '../themes/stargazer-starfield/source/js/starfield/polyhedron.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);

test('the initial perspective matches the author\'s vertical-axis reference', () => {
  projectPolyhedron(0).forEach((point, index) => {
    close(point.x, POLYHEDRON_REFERENCE[index][0]); close(point.y, POLYHEDRON_REFERENCE[index][1]);
  });
});

test('both tips remain on the fixed central axis throughout a full revolution', () => {
  const original = projectPolyhedron(0);
  close(original[0].x, original[1].x);
  for (let step = 1; step <= 24; step++) {
    const points = projectPolyhedron(step / 24 * Math.PI * 2);
    for (const tip of [0, 1]) {
      close(points[tip].x, original[tip].x); close(points[tip].y, original[tip].y);
    }
  }
});

test('perspective preserves volume and stays within the artboard throughout rotation', () => {
  const original = projectPolyhedron(0), quarter = projectPolyhedron(Math.PI / 2);
  const ringArea = points => Math.abs([2, 3, 4, 5].reduce((sum, index, i, ring) => {
    const next = points[ring[(i + 1) % ring.length]], point = points[index];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  assert.ok(Math.abs(ringArea(quarter) - ringArea(original)) > 100, 'near and far points receive perspective foreshortening');
  for (let step = 0; step < 72; step++) {
    const points = projectPolyhedron(step / 72 * Math.PI * 2);
    assert.ok(ringArea(points) > 100000, 'the object never collapses into a flat rotating card');
    assert.ok(points.every(point => point.x > 12 && point.x < 1242 && point.y > 12 && point.y < 1242), 'the whole wireframe remains visible');
  }
  assert.ok(Math.abs(quarter[2].x - original[2].x) > 100, 'equatorial points move around the fixed tips');
  projectPolyhedron(Math.PI * 2).forEach((point, index) => {
    close(point.x, original[index].x); close(point.y, original[index].y);
  });
});

test('equatorial vertices exchange front and back depth when passing around the axis', () => {
  const initial = projectPolyhedron(0), opposite = projectPolyhedron(Math.PI);
  assert.ok(initial[2].depth > 0 && initial[5].depth < 0);
  for (const index of [2, 3, 4, 5]) close(initial[index].depth, -opposite[index].depth);
});
