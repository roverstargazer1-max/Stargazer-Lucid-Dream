import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { observationDate } from '../themes/stargazer-starfield/source/js/starfield/observation.js';

test('every real article keeps its publication year centered and its zero-padded month/day', () => {
  const { articles } = JSON.parse(fs.readFileSync('.preview/stargazer/starry/index.json'));
  for (const article of articles) {
    const date = observationDate(article.date);
    assert.equal(date.years[2].year, Number(article.date.slice(0, 4)));
    assert.deepEqual(date.years.map(row => row.selected), [false, false, true, false, false]);
    assert.equal(date.monthDay, `${article.date.slice(5, 7)}.${article.date.slice(8, 10)}`);
  }
});

test('calendar boundaries and leap days keep the supplied local publication date', () => {
  assert.deepEqual(observationDate('2024-02-29').years.map(row => row.label), ['22', '23', '24', '25', '26']);
  assert.equal(observationDate('2026-01-01').monthDay, '01.01');
  assert.equal(observationDate('2025-12-31').monthDay, '12.31');
  assert.deepEqual(observationDate('2100-01-01').years.map(row => row.label), ['98', '99', '00', '01', '02']);
});

test('the generated PNG artwork and glyphs retain the supplied bytes, and the prepared silhouette is published', () => {
  const output = '.preview/stargazer/images/observation';
  const artwork = 'assets/详情弹窗/详细工程文件';
  for (const [name, source] of [
    ['waveform.png', '声音频率.png'],
    ['waves.png', '波浪纹理.png'], ['read.png', 'READ.png'], ['close.png', '退出按钮.png'],
    ['polyhedron.png', '右下角跳动几何块.png'], ['starlink.png', 'STARLINK.png'], ['observation-id.png', 'OBS&ID.png'],
  ]) assert.deepEqual(fs.readFileSync(path.join(output, name)), fs.readFileSync(path.join(artwork, source)), name);
  assert.deepEqual(fs.readFileSync(path.join(output, 'silhouette.png')),
    fs.readFileSync('themes/stargazer-starfield/source/images/observation/silhouette.png'));
  const crops = JSON.parse(fs.readFileSync(path.join(artwork, 'supplement-crops/crops.json')));
  for (const name of Object.keys(crops.rectangles)) {
    assert.deepEqual(fs.readFileSync(path.join(output, name)),
      fs.readFileSync(path.join(artwork, 'supplement-crops', name)), name);
  }
  for (const character of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const folder = /\d/.test(character) ? '数字' : '大写字母';
    assert.deepEqual(fs.readFileSync(path.join(output, `glyphs/${character}.png`)),
      fs.readFileSync(path.join('assets/zmd科技小字-修订版7-透明字形/透明PNG', folder, `${character}.png`)), character);
  }
});
