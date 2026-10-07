import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYHEDRON_UV, projectPolyhedron } from '../themes/stargazer-starfield/source/js/starfield/polyhedron.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);

test('the initial 3D projection matches the control points on the original bitmap', () => {
  projectPolyhedron(0).forEach((point, index) => {
    close(point.x, POLYHEDRON_UV[index][0]); close(point.y, POLYHEDRON_UV[index][1]);
  });
});

test('both tips remain on the fixed central axis throughout a full revolution', () => {
  const original = projectPolyhedron(0);
  for (let step = 1; step <= 24; step++) {
    const points = projectPolyhedron(step / 24 * Math.PI * 2);
    for (const tip of [0, 1]) {
      close(points[tip].x, original[tip].x); close(points[tip].y, original[tip].y);
    }
  }
});

test('a quarter turn retains volume and a full turn returns to the original projection', () => {
  const original = projectPolyhedron(0), quarter = projectPolyhedron(Math.PI / 2);
  const ringArea = points => Math.abs([2, 3, 4, 5].reduce((sum, index, i, ring) => {
    const next = points[ring[(i + 1) % ring.length]], point = points[index];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  close(ringArea(quarter), ringArea(original));
  assert.ok(ringArea(quarter) > 100000, 'the object never collapses into a flat rotating card');
  assert.ok(Math.abs(quarter[2].x - original[2].x) > 100, 'equatorial points move around the fixed tips');
  projectPolyhedron(Math.PI * 2).forEach((point, index) => {
    close(point.x, original[index].x); close(point.y, original[index].y);
  });
});
