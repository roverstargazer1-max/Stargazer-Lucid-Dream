import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderBudget } from '../themes/stargazer-starfield/source/js/starfield/render-budget.js';

test('sustained slow drawing reduces decoration while keeping article/navigation work outside the budget', () => {
  const budget = createRenderBudget({ hardwareConcurrency: 8 });
  assert.equal(budget.current.tier, 'full');
  for (let frame = 0; frame < 90; frame++) budget.sample(60);
  assert.equal(budget.current.tier, 'low');
  assert.ok(budget.current.pixelRatioCap < 1);
  assert.ok(budget.current.backgroundStride > 1);
  assert.equal(budget.current.ambientMotion, false);
});

test('one slow frame does not degrade the scene and small devices start conservatively', () => {
  const budget = createRenderBudget({ hardwareConcurrency: 8 });
  budget.sample(150);
  for (let frame = 0; frame < 89; frame++) budget.sample(8);
  assert.equal(budget.current.tier, 'full');
  assert.equal(createRenderBudget({ hardwareConcurrency: 2 }).current.tier, 'low');
});

test('GPU-bound camera motion is budgeted from repeated missed frames even with cheap JavaScript', () => {
  const budget = createRenderBudget({ hardwareConcurrency: 8 });
  for (let frame = 0; frame < 16; frame++) {
    budget.sample(3);
    budget.sampleFrame(frame % 3 === 0 ? 33.3 : 16.7, true);
  }
  assert.equal(budget.current.tier, 'full');
  assert.equal(budget.current.roomBlur, false);
  for (let frame = 0; frame < 24; frame++) budget.sampleFrame(33.3, true);
  assert.equal(budget.current.tier, 'balanced');
  for (let frame = 0; frame < 16; frame++) budget.sampleFrame(33.3, true);
  assert.equal(budget.current.tier, 'low');
});

test('isolated stalls, hidden pages and resting scenes do not reduce rendering quality', () => {
  const budget = createRenderBudget({ hardwareConcurrency: 8 });
  budget.sampleFrame(90, true);
  for (let frame = 0; frame < 31; frame++) budget.sampleFrame(16.7, true);
  assert.equal(budget.current.tier, 'full');
  for (let frame = 0; frame < 32; frame++) budget.sampleFrame(33.3, false);
  assert.equal(budget.current.tier, 'full');
  for (let frame = 0; frame < 8; frame++) budget.sampleFrame(33.3, true);
  budget.sampleFrame(1000, false);
  for (let frame = 0; frame < 8; frame++) budget.sampleFrame(16.7, true);
  assert.equal(budget.current.tier, 'full', 'New motion must not inherit a paused sampling window');
});

test('camera motion follows the observed refresh cadence rather than assuming every browser runs at 60 Hz', () => {
  for (const interval of [1000 / 30, 1000 / 120]) {
    const budget = createRenderBudget({ hardwareConcurrency: 8 });
    for (let frame = 0; frame < 16; frame++) budget.sampleFrame(interval, false);
    for (let frame = 0; frame < 32; frame++) budget.sampleFrame(interval, true);
    assert.equal(budget.current.tier, 'full');
    for (let frame = 0; frame < 24; frame++) budget.sampleFrame(interval * 2, true);
    assert.equal(budget.current.tier, 'full');
    assert.equal(budget.current.roomBlur, false);
    for (let frame = 0; frame < 16; frame++) budget.sampleFrame(interval * 2, true);
    assert.equal(budget.current.tier, 'balanced');
  }
});

test('disabling passage blur keeps full sky precision until measured pressure requires the background fallback', () => {
  const budget = createRenderBudget({ hardwareConcurrency: 8, roomBlur: false });
  assert.equal(budget.current.roomBlur, false);
  assert.equal(budget.current.tier, 'full');
  for (let frame = 0; frame < 32; frame++) budget.sampleFrame(16.7, true);
  assert.equal(budget.current.tier, 'full');
  for (let frame = 0; frame < 16; frame++) budget.sampleFrame(33.3, true);
  assert.equal(budget.current.tier, 'balanced');
});
