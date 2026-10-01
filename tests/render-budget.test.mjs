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
