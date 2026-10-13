// Match the atlas: +Z faces up, +X faces right. Yaw is the horizontal
// projection of the actual camera direction, even when looking at the zenith.
export function createAstrolabe(needle) {
  let lastHeading = '';
  return {
    update(camera) {
      const heading = `${camera.yaw}rad`;
      if (heading === lastHeading) return;
      needle.style.setProperty('--view-heading', heading);
      lastHeading = heading;
    },
  };
}
