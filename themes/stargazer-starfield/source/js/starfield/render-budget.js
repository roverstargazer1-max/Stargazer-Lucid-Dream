// Only background decoration is budgeted; every real article keeps its target and reader.
const tiers = [
  { tier: 'full', pixelRatioCap: 2, environmentRatioCap: 1.5, backgroundStride: 1, ambientMotion: true },
  { tier: 'balanced', pixelRatioCap: 1, environmentRatioCap: 1, backgroundStride: 2, ambientMotion: true },
  { tier: 'low', pixelRatioCap: .75, environmentRatioCap: .75, backgroundStride: 4, ambientMotion: false },
];

export function createRenderBudget({ hardwareConcurrency, deviceMemory } = {}) {
  let level = hardwareConcurrency <= 2 || deviceMemory <= 2 ? 2 : hardwareConcurrency <= 4 || deviceMemory <= 4 ? 1 : 0;
  let frames = 0, cost = 0;
  return {
    get current() { return tiers[level]; },
    sample(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) return false;
      cost += Math.min(milliseconds, 100); frames++;
      if (frames < 45) return false;
      const average = cost / frames;
      frames = 0; cost = 0;
      const next = average > 42 ? 2 : average > 24 ? Math.max(level, 1) : level;
      if (next === level) return false;
      level = next;
      return true;
    },
  };
}
