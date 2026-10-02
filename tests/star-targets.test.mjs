import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { angles, projectDome, direction } from '../themes/stargazer-starfield/source/js/starfield/dome.js';
import { isStarReachable, starLabelPlacement } from '../themes/stargazer-starfield/source/js/starfield/star-targets.js';

const articles = JSON.parse(fs.readFileSync('.preview/stargazer/starry/index.json')).articles;
const width = 1120, height = 640, focal = 400;

function projectAt(article, x, y) {
  const point = { x: article.position[0], y: article.position[1], z: article.position[2] };
  const { azimuth, elevation } = angles(point);
  return projectDome(point, { ...direction(azimuth, elevation, 0), yaw: azimuth, pitch: elevation }, { cx: x, cy: y, focal });
}

test('real articles near an uncovered top or bottom edge remain reachable', () => {
  for (const article of articles) {
    assert.equal(isStarReachable(projectAt(article, width / 2, 48), width, height), true, article.title);
    assert.equal(isStarReachable(projectAt(article, width / 2, height - 48), width, height), true, article.title);
  }
});

test('articles covered by the map or reading note are not drawn as clickable stars', () => {
  const map = { left: 60, top: 350, right: 240, bottom: 530 };
  const preview = { left: 650, top: 240, right: 1100, bottom: 550 };
  for (const article of articles) {
    assert.equal(isStarReachable(projectAt(article, 160, 430), width, height, [map, preview]), false, article.title);
    assert.equal(isStarReachable(projectAt(article, 630, 330), width, height, [map, preview]), false, '48px target overlaps note');
    assert.equal(isStarReachable(projectAt(article, 450, 260), width, height, [map, preview]), true, article.title);
  }
});

test('off-screen and non-finite projections never create article hit targets', () => {
  for (const point of [null, { x: NaN, y: 100 }, { x: 100, y: Infinity }, { x: -100, y: 200 }, { x: width + 100, y: 200 }]) {
    assert.equal(isStarReachable(point, width, height), false);
  }
});

test('star titles use the free side and stay within the screen instead of behind the note', () => {
  const note = { left: 417, top: 299, right: 767, bottom: 792 };
  const placement = starLabelPlacement({ x: 324, y: 458 }, 809, [note]);
  assert.equal(placement.side, 'left');
  assert.ok(placement.maxWidth > 165, 'the observed real article title fits');
  for (const article of articles) {
    const point = projectAt(article, 229, 250);
    const label = starLabelPlacement(point, 342);
    const edge = label.side === 'left' ? point.x - 35 - label.maxWidth : point.x + 35 + label.maxWidth;
    assert.ok(edge >= 12 && edge <= 330, article.title);
  }
});
