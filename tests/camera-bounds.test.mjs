import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOME_RADIUS, direction, domeDestination, domeIntersection, domePosition, projectDome, viewRay } from '../themes/stargazer-starfield/source/js/starfield/dome.js';
import { constrainSkyCamera, MAX_TERRAIN_FRACTION, skyProjection, TERRAIN_CEILING } from '../themes/stargazer-starfield/source/js/starfield/camera-bounds.js';
import { dockTarget } from '../themes/stargazer-starfield/source/js/starfield/experience.js';
import { isStarReachable } from '../themes/stargazer-starfield/source/js/starfield/star-targets.js';

const sizes = [[390, 844], [482, 986], [844, 390], [1280, 720], [1440, 900], [3440, 1440]];

function assertTerrainBudget(camera, width, height) {
  const settings = skyProjection(width, height, camera.zoom);
  for (let column = 0; column <= 64; column++) {
    const ray = viewRay(width * column / 64, height * (1 - MAX_TERRAIN_FRACTION), camera, settings);
    const point = domeIntersection(camera, ray);
    assert.ok(Math.asin(point.y / DOME_RADIUS) >= TERRAIN_CEILING - 1e-8,
      `${width}×${height}, zoom ${camera.zoom}, column ${column} exposes terrain above the bottom fifth`);
  }
}

test('downward exploration stays above the terrain budget across viewports, zoom and translated origins', () => {
  for (const [width, height] of sizes) for (const zoom of [.36, .72, 1, 1.55, 2.8]) {
    for (const yaw of [0, 1, 3, 5]) for (const origin of [{ x: 0, y: 0, z: 0 }, direction(yaw, .4, 1200), { x: 1200, y: -450, z: -700 }]) {
      const bounded = constrainSkyCamera({ ...origin, yaw, pitch: 0, zoom }, width, height);
      assertTerrainBudget(bounded, width, height);
      assert.equal(bounded.yaw, yaw);
      assert.ok(bounded.pitch <= Math.PI / 2);
    }
  }
});

test('a wide zoomed-out lens raises the lower boundary; safe upward views stay unchanged', () => {
  const base = { x: 0, y: 0, z: 0, yaw: 1, pitch: 0, zoom: 1 };
  const portrait = constrainSkyCamera(base, 390, 844);
  const desktop = constrainSkyCamera(base, 1280, 720);
  const distant = constrainSkyCamera({ ...base, zoom: .36 }, 390, 844);
  assert.ok(portrait.pitch > desktop.pitch);
  assert.ok(distant.pitch > portrait.pitch);
  const high = { ...base, pitch: 1.45 };
  assert.deepEqual(constrainSkyCamera(high, 390, 844), high);
  assert.deepEqual(constrainSkyCamera(portrait, 390, 844), portrait);
  const panoramic = constrainSkyCamera({ ...base, zoom: .36 }, 7680, 360);
  assertTerrainBudget(panoramic, 7680, 360);
});

test('every real article remains reachable after bounded docking in both sky modes', () => {
  const articles = JSON.parse(fs.readFileSync('.preview/stargazer/starry/index.json')).articles;
  for (const [width, height] of sizes) {
    const landscape = width > height && height <= 500;
    const panelWidth = width <= 760 ? Math.min(430, width - 28) : landscape ? Math.min(width * .51, 470) : Math.min(760, Math.max(470, width * .34));
    const left = width <= 760 ? width - 14 - panelWidth : width - (landscape ? 20 : width * .038) - panelWidth;
    const top = width <= 760 ? height - 82 - panelWidth / 2 : height * (landscape ? .60 : .64) - panelWidth / 4;
    const panel = { left, top, right: left + panelWidth, bottom: top + panelWidth / 2 };
    const settings = skyProjection(width, height, 1.55);
    articles.forEach((article, index) => {
      for (const mode of ['relation', 'time']) {
        const point = domePosition(article, index, mode);
        const camera = constrainSkyCamera(domeDestination(point, { yaw: 0 }, settings, dockTarget(width, height, panel)), width, height);
        const projected = projectDome(point, camera, skyProjection(width, height, camera.zoom));
        assert.equal(isStarReachable(projected, width, height, [panel]), true, `${article.title}, ${mode}, ${width}×${height}`);
        assertTerrainBudget(camera, width, height);
      }
    });
  }
});
