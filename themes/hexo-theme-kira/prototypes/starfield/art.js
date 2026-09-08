// Photographic plates retain texture; this traced silhouette separates the roof
// from its generated sky without turning the architecture into flat polygons.
export const roofContour = 'M0 438 L22 446 L49 463 L77 479 L106 490 L129 505 L161 516 L190 530 L223 541 L255 553 L290 559 L311 566 L320 575 L307 582 L309 590 L288 595 L287 691 L299 685 L304 677 L313 681 L318 674 L328 682 L339 675 L350 682 L360 680 L366 689 L374 693 L369 704 L377 712 L366 720 L354 713 L352 729 L363 730 L356 742 L354 752 L381 752 L412 746 L443 750 L447 757 L455 744 L470 741 L485 745 L485 754 L478 766 L540 769 L650 778 L780 789 L931 804 L1080 824 L1260 841 L1445 862 L1672 884 L1672 941 L0 941 Z';
export const skyPlate = new Image();
export const roofPlate = new Image();
skyPlate.src = new URL('./assets/sky-reference-v2.png', import.meta.url).href;
roofPlate.src = new URL('./assets/rooftop-v2.png', import.meta.url).href;
const roofPath = new Path2D(roofContour);

export function paintSky(ctx, width, height, camera) {
  ctx.fillStyle = '#020509'; ctx.fillRect(0, 0, width, height);
  if (!skyPlate.complete || !skyPlate.naturalWidth) return;
  // Only the astronomical portion of the supplied reference: horizon/clouds are
  // excluded at runtime. This plate is a distant sky dome, not a nearby wall.
  const sourceH = 730, scale = Math.max(width / 1672, height / sourceH) * 1.13;
  const dw = 1672 * scale, dh = sourceH * scale;
  const marginX = (dw - width) / 2, marginY = (dh - height) / 2;
  const offsetX = Math.max(-marginX, Math.min(marginX, Math.sin(camera.yaw) * width * .13 - camera.x * .006));
  const offsetY = Math.max(-marginY, Math.min(marginY, Math.sin(camera.pitch) * height * .13 + camera.y * .005));
  ctx.save();
  ctx.globalAlpha = .9;
  ctx.drawImage(skyPlate, 0, 0, 1672, sourceH, (width - dw) / 2 + offsetX, (height - dh) / 2 + offsetY, dw, dh);
  ctx.restore();
  // Keep most of the sky genuinely black; no uniform blue fog or sparkle grid.
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, '#0000000a'); shade.addColorStop(.65, '#01050a00'); shade.addColorStop(1, '#07132230');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
}

export function paintRoof(ctx, width, height, camera) {
  if (!roofPlate.complete || !roofPlate.naturalWidth) return;
  const leaving = Math.max(0, Math.min(1, camera.z / 950));
  const alpha = (1 - leaving) * Math.max(0, 1 - Math.abs(camera.yaw) * .85);
  if (alpha < .005) return;
  const baseWidth = Math.max(width, height * .95);
  const scale = baseWidth / 1672 * (1 + leaving * .32);
  const x = (width - baseWidth) * .12 - camera.yaw * width * .45 - leaving * width * .1;
  const y = height - 941 * scale + leaving * height * .64 + camera.pitch * height * .2;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.clip(roofPath); ctx.drawImage(roofPlate, 0, 0, 1672, 941); ctx.restore();
}
