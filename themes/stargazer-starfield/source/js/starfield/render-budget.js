// Only background decoration is budgeted; every real article keeps its target and reader.
const tiers = [
  { tier: 'full', pixelRatioCap: 2, environmentRatioCap: 1.5, backgroundStride: 1, ambientMotion: true, roomBlur: true },
  { tier: 'balanced', pixelRatioCap: 1, environmentRatioCap: 1, backgroundStride: 2, ambientMotion: true, roomBlur: false },
  { tier: 'low', pixelRatioCap: .75, environmentRatioCap: .75, backgroundStride: 4, ambientMotion: false, roomBlur: false },
];
const withoutRoomBlur = tiers.map(tier => ({ ...tier, roomBlur: false }));

export function createRenderBudget({ hardwareConcurrency, deviceMemory, roomBlur: requestedRoomBlur = true } = {}) {
  let level = hardwareConcurrency <= 2 || deviceMemory <= 2 ? 2 : hardwareConcurrency <= 4 || deviceMemory <= 4 ? 1 : 0;
  let frames = 0, cost = 0;
  let motionFrames = 0, missedFrames = 0;
  let frameInterval = 1000 / 60, idleIntervals = [];
  let roomBlur = requestedRoomBlur;
  let settlingFrames = 0;
  function changeLevel(next) {
    if (next === level) return false;
    level = next;
    frames = 0; cost = 0; motionFrames = 0; missedFrames = 0;
    return true;
  }
  return {
    get current() { return roomBlur ? tiers[level] : withoutRoomBlur[level]; },
    sample(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) return false;
      cost += Math.min(milliseconds, 100); frames++;
      if (frames < 45) return false;
      const average = cost / frames;
      frames = 0; cost = 0;
      const next = average > 42 ? 2 : average > 24 ? Math.max(level, 1) : level;
      return changeLevel(next);
    },
    sampleFrame(interval, moving) {
      // JS timings end before GPU drawing and compositing. Repeated missed
      // camera frames catch that pressure, including under OS power limits.
      // Resting/hidden scenes and isolated pauses are not evidence of overload.
      if (!Number.isFinite(interval) || interval <= 0 || interval > 250) {
        motionFrames = 0; missedFrames = 0;
        idleIntervals = [];
        return false;
      }
      if (!moving) {
        motionFrames = 0; missedFrames = 0;
        idleIntervals.push(interval);
        if (idleIntervals.length === 16) {
          // Learn the browser's cadence at rest. A steady 30 Hz display or
          // power-saving RAF cap is not a run of dropped 60 Hz frames.
          const sorted = idleIntervals.slice().sort((a, b) => a - b);
          frameInterval = sorted[3];
          idleIntervals = [];
        }
        return false;
      }
      idleIntervals = [];
      // Let the compositor retire frames queued before the blur was removed.
      // Otherwise those same slow frames can immediately lower sky precision.
      if (settlingFrames > 0) { settlingFrames--; return false; }
      motionFrames++;
      if (interval > frameInterval * 1.45) missedFrames++;
      // Remove the inexpensive-to-disable blur as soon as three misses are
      // observed; wait a whole window before changing background resolution.
      if (motionFrames < 16 && !(roomBlur && level === 0 && missedFrames >= 3)) return false;
      const overloaded = missedFrames >= 3;
      motionFrames = 0; missedFrames = 0;
      if (!overloaded) return false;
      // The room's subpixel blur is the least visible and most expensive effect
      // during a large zoom. Drop it before resizing any sky drawing buffers.
      if (roomBlur && level === 0) {
        roomBlur = false;
        settlingFrames = 8;
        frames = 0; cost = 0;
        return true;
      }
      return changeLevel(Math.min(level + 1, tiers.length - 1));
    },
  };
}
