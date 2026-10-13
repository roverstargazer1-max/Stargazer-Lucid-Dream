import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomeProjector, direction, projectDome } from '../themes/stargazer-starfield/source/js/starfield/dome.js';
import { skyProjection } from '../themes/stargazer-starfield/source/js/starfield/camera-bounds.js';

test('a prepared drawing pass retains exact single-point projections across camera and lens changes', () => {
  const points = Array.from({ length: 160 }, (_, i) => direction(i * 2.399963, -.8 + i / 100, 6000));
  for (const [width, height] of [[390, 844], [640, 360], [1440, 900]]) {
    for (const zoom of [.36, .72, 1, 1.55, 2.8]) for (const yaw of [-3, 0, .7, 4]) for (const pitch of [.1, .43, 1.45]) {
      const camera = { x: -180, y: -50, z: -420, yaw, pitch, zoom };
      const settings = skyProjection(width, height, zoom);
      const project = createDomeProjector(camera, settings);
      for (const point of points) assert.deepEqual(project(point), projectDome(point, camera, settings));
    }
  }
  const project = createDomeProjector({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, { cx: 0, cy: 0, focal: 1 });
  assert.equal(project({ x: 0, y: 0, z: 24 }), null);
  assert.notEqual(project({ x: 0, y: 0, z: 24.000001 }), null);
});
