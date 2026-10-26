import test from 'node:test';
import assert from 'node:assert/strict';
import { satellitePlacement } from '../themes/stargazer-starfield/source/js/starfield/friends-satellite.js';
import { entranceFrame } from '../themes/stargazer-starfield/source/js/starfield/motion.js';
import { constrainSkyCamera, skyProjection } from '../themes/stargazer-starfield/source/js/starfield/camera-bounds.js';
import { angles, viewRay } from '../themes/stargazer-starfield/source/js/starfield/dome.js';

test('looking up reveals the satellite below the dome across desktop, portrait and short landscape views', () => {
  for (const [width, height] of [[1280, 720], [375, 812], [320, 740], [723, 853], [844, 390]]) {
    const camera = constrainSkyCamera({ ...entranceFrame(2857, width <= 760 ? .78 : 1), pitch: 1.08 }, width, height);
    const saved = structuredClone(camera);
    const placement = satellitePlacement(camera, width, height);
    assert.ok(placement, `${width}×${height} must show the satellite`);
    assert.ok(placement.x - placement.size / 2 >= 8);
    assert.ok(placement.x + placement.size / 2 <= width - 8);
    assert.ok(placement.y - placement.hitHeight / 2 >= 8);
    assert.ok(placement.y + placement.hitHeight / 2 <= height - 8);
    assert.ok(placement.hitWidth >= 44 && placement.hitHeight >= 44);
    assert.deepEqual(camera, saved, 'A friend entry must never alter the exploration camera');
  }
});

test('turning the observer moves the same satellite and looking away removes its hit area', () => {
  const camera = constrainSkyCamera({ ...entranceFrame(2857), pitch: 1.08 }, 1280, 720);
  const initial = satellitePlacement(camera, 1280, 720);
  const turned = satellitePlacement({ ...camera, yaw: camera.yaw + .2 }, 1280, 720);
  assert.ok(turned.x < initial.x - 24, 'The object must follow sky projection instead of remaining pinned');
  assert.equal(satellitePlacement({ ...camera, yaw: camera.yaw + Math.PI, pitch: .05 }, 1280, 720), null);
});

test('the satellite is above the default desktop frame and remains high in the taller phone view', () => {
  const desktop = constrainSkyCamera(entranceFrame(2857), 1280, 720);
  assert.equal(satellitePlacement(desktop, 1280, 720), null);
  const phone = constrainSkyCamera(entranceFrame(2857, .78), 375, 812);
  const placement = satellitePlacement(phone, 375, 812);
  assert.ok(placement && placement.y < 812 * .35);
});

test('the visible satellite scales continuously with the lens while the touch target stays usable', () => {
  for (const [width, height] of [[1280, 720], [375, 812]]) {
    const base = constrainSkyCamera({ ...entranceFrame(2857), pitch: 1.08 }, width, height);
    const visible = satellitePlacement(base, width, height);
    const aim = angles(viewRay(visible.x, visible.y, base, skyProjection(width, height, base.zoom)));
    const camera = { ...base, yaw: aim.azimuth, pitch: aim.elevation };
    const zooms = [.36, .5, .72, 1, 1.5, 2.8];
    const placements = zooms.map(zoom => satellitePlacement({ ...camera, zoom }, width, height));
    placements.forEach((p, i) => {
      assert.ok(p);
      assert.ok(Math.abs(p.size / placements[0].size - zooms[i] / zooms[0]) < 1e-8,
        'The artwork must follow projection scale without a minimum or maximum screen size');
    });
    placements.forEach(p => assert.ok(p.hitWidth >= 44 && p.hitHeight >= 44));
  }
});

test('all four viewport edges can naturally crop the satellite before it is removed', () => {
  const width = 1280, height = 720;
  const base = constrainSkyCamera({ ...entranceFrame(2857), pitch: Math.PI / 2, zoom: 2.2 }, width, height);
  const partial = { left: false, right: false, top: false, bottom: false };
  for (let offset = -2; offset <= 2; offset += .005) {
    for (const camera of [{ ...base, yaw: base.yaw + offset }, { ...base, pitch: base.pitch + offset }]) {
      const p = satellitePlacement(camera, width, height);
      if (!p) continue;
      const left = p.x - p.size / 2, right = p.x + p.size / 2;
      const top = p.y - p.imageHeight / 2, bottom = p.y + p.imageHeight / 2;
      partial.left ||= left < 0 && right > 0;
      partial.right ||= left < width && right > width;
      partial.top ||= top < 0 && bottom > 0;
      partial.bottom ||= top < height && bottom > height;
    }
  }
  assert.deepEqual(partial, { left: true, right: true, top: true, bottom: true });
});
