import { study, lightNoise } from './art-study.js';
// Photographic plates retain texture; this traced silhouette separates the roof
// from its generated sky without turning the architecture into flat polygons.
export const roofContour = 'M0 438 L22 446 L49 463 L77 479 L106 490 L129 505 L161 516 L190 530 L223 541 L255 553 L290 559 L311 566 L320 575 L307 582 L309 590 L288 595 L287 691 L299 685 L304 677 L313 681 L318 674 L328 682 L339 675 L350 682 L360 680 L366 689 L374 693 L369 704 L377 712 L366 720 L354 713 L352 729 L363 730 L356 742 L354 752 L381 752 L412 746 L443 750 L447 757 L455 744 L470 741 L485 745 L485 754 L478 766 L540 769 L650 778 L780 789 L931 804 L1080 824 L1260 841 L1445 862 L1672 884 L1672 941 L0 941 Z';
export const roofPlate = new Image();
roofPlate.src = new URL('./assets/rooftop-v2.png', import.meta.url).href;
const roofPath = new Path2D(roofContour);
export const roofStyles = {anime:'二次元动画',minimal:'极简色块',paper:'纸雕绘本',pixel:'像素夜景',photo:'原写实版'};
let roofStyle='anime';
const roofImages=new Map();
const roofFrames=new Map();
export function setRoofStyle(style){
  roofStyle=roofStyles[style]?style:'anime';
  if(roofStyle!=='photo'&&!roofImages.has(roofStyle)){
    const image=new Image();image.src=new URL(`./assets/roof-${roofStyle}-v4.png`,import.meta.url).href;
    roofImages.set(roofStyle,image);
  }
}
setRoofStyle('anime');

// Directions on a complete celestial sphere, not an image moving on a rectangle.
let skySeed=8431;
const rand=()=>{skySeed=(skySeed*1664525+1013904223)>>>0;return skySeed/4294967296;};
const normal=()=>Math.sqrt(-2*Math.log(Math.max(.00001,rand())))*Math.cos(2*Math.PI*rand());
function beltDirection(longitude,latitude){
  const x=Math.sin(longitude)*Math.cos(latitude),y=Math.sin(latitude),z=Math.cos(longitude)*Math.cos(latitude);
  const a=.62,b=.27;
  const rx=x*Math.cos(a)-y*Math.sin(a),ry=x*Math.sin(a)+y*Math.cos(a);
  return {x:rx*Math.cos(b)+z*Math.sin(b),y:ry,z:z*Math.cos(b)-rx*Math.sin(b)};
}
const distantStars=Array.from({length:8500},()=>{
  const y=rand()*2-1,t=rand()*Math.PI*2,r=Math.sqrt(1-y*y);
  return {x:r*Math.sin(t),y,z:r*Math.cos(t),size:.45+rand()*.65,alpha:.15+Math.pow(rand(),2)*.38};
});
const galacticStars=Array.from({length:7500},()=>{
  const longitude=rand()*Math.PI*2,latitude=normal()*.065;
  return {...beltDirection(longitude,latitude),size:.30+rand()*.45,alpha:.09+rand()*.15};
});
const clouds=Array.from({length:130},()=>{
  const longitude=rand()*Math.PI*2,latitude=normal()*.075;
  return {...beltDirection(longitude,latitude),radius:.024+rand()*.055,alpha:.07+rand()*.08};
});
const skyStars=[...distantStars,...galacticStars];
const mistSprites=new Map();
function mistFor(color){
  if(!mistSprites.has(color)){
    const sprite=document.createElement('canvas');sprite.width=128;sprite.height=128;
    const painter=sprite.getContext('2d'),gradient=painter.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,color);gradient.addColorStop(.3,color+'50');gradient.addColorStop(1,color+'00');
    painter.fillStyle=gradient;painter.fillRect(0,0,128,128);mistSprites.set(color,sprite);
  }
  return mistSprites.get(color);
}

export function paintSky(ctx,width,height,camera,settings,ambient={x:0,y:0,seconds:null}){
  const palette=study();
  ctx.fillStyle=palette.base;ctx.fillRect(0,0,width,height);
  const atmosphere=ctx.createRadialGradient(width*.6,height*.68,0,width*.6,height*.68,Math.max(width,height)*.9);
  atmosphere.addColorStop(0,palette.lift);atmosphere.addColorStop(.45,palette.base);atmosphere.addColorStop(1,palette.edge);
  ctx.fillStyle=atmosphere;ctx.fillRect(0,0,width,height);
  const {cx,cy,focal}=settings;
  const ca=Math.cos(camera.yaw),sa=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const onSphere=point=>{
    const rx=point.x*ca-point.z*sa,rz=point.x*sa+point.z*ca;
    const ry=point.y*cp-rz*sp,z=point.y*sp+rz*cp;
    return z>.01?{x:cx+rx*focal/z,y:cy-ry*focal/z,depth:z*100000}:null;
  };
  for(const cloud of clouds){
    const p=onSphere(cloud);
    if(!p||p.depth<18000||p.x < -200||p.x>width+200||p.y < -200||p.y>height+200)continue;
    const radius=Math.min(height*.26,cloud.radius*focal*100000/p.depth);
    ctx.globalAlpha=cloud.alpha*.7;ctx.drawImage(mistFor(palette.cloud),p.x-radius+ambient.x*.5,p.y-radius*.3+ambient.y*.5,radius*2,radius*.6);
  }
  // Static, localized low-sky haze. The deep sky keeps its large dark regions.
  const haze=ctx.createRadialGradient(width*.19,height*1.06,0,width*.19,height*1.06,height*.58);
  haze.addColorStop(0,palette.haze+'35');haze.addColorStop(.45,palette.haze+'0b');haze.addColorStop(1,palette.haze+'00');
  ctx.globalAlpha=Math.max(0,1-Math.abs(camera.z)/2200)*Math.max(0,1-Math.abs(camera.pitch));
  ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;
  // Background stars never use the article stars' cross flares or bright cores.
  ctx.fillStyle=palette.stars;
  for(const star of skyStars){
    const p=onSphere(star);
    if(!p||p.x<0||p.x>width||p.y<0||p.y>height)continue;
    const longitude=Math.atan2(star.x,star.z);
    const patch=.52+.48*Math.sin(longitude*3.7+Math.sin(star.y*9))**2;
    const lane=star.y-.11*Math.sin(longitude*5+.8)-.05;
    const extinction=1-.65*Math.exp(-lane*lane/.003);
    const variation=ambient.seconds===null?1:1+.014*lightNoise(Math.floor(star.size*90000+star.y*3000),ambient.seconds/(.8+star.size));
    ctx.globalAlpha=star.alpha*patch*extinction*variation;
    const radius=star.size*.65;
    ctx.beginPath();ctx.arc(p.x+ambient.x,p.y+ambient.y,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

export function paintRoof(ctx, width, height, camera) {
  let plate=roofStyle==='photo'?roofPlate:roofImages.get(roofStyle);
  if (!plate?.complete || !plate.naturalWidth) return 0;
  // Blend the finite foreground into darkness instead of stretching a wall edge.
  if(roofStyle!=='photo'){
    if(!roofFrames.has(roofStyle)){
      const frame=document.createElement('canvas');frame.width=plate.naturalWidth;frame.height=plate.naturalHeight;
      const painter=frame.getContext('2d');painter.drawImage(plate,0,0);
      painter.globalCompositeOperation='destination-in';
      const fade=painter.createLinearGradient(frame.width*.64,0,frame.width,0);
      fade.addColorStop(0,'#000');fade.addColorStop(1,'#0000');
      painter.fillStyle=fade;painter.fillRect(0,0,frame.width,frame.height);roofFrames.set(roofStyle,frame);
    }
    plate=roofFrames.get(roofStyle);
  }
  const leaving = Math.max(0, Math.min(1, camera.z / 950));
  // A single photograph is a foreground frame, not rotatable world geometry.
  // Keep its cut edges offscreen; dissolve it when looking away from the roof.
  const angle = Math.acos(Math.max(-1, Math.min(1, Math.cos(camera.yaw) * Math.cos(camera.pitch))));
  const turn = Math.max(0, Math.min(1, (angle - .12) / .73));
  const alpha = (1 - leaving) * (1 - turn * turn * (3 - 2 * turn));
  if (alpha < .005) return 0;
  const sourceWidth=plate.naturalWidth||plate.width,sourceHeight=plate.naturalHeight||plate.height;
  const baseWidth = roofStyle==='photo'?Math.max(width,height*.95):width<=760?height*.72:Math.min(width,height*.90);
  const scale = baseWidth / sourceWidth * (1 + leaving * .32);
  const x = Math.min(0,(width - baseWidth) * .12) - leaving * width * .1;
  const y = height - sourceHeight * scale + leaving * height * .64;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  if(roofStyle==='photo')ctx.clip(roofPath);
  ctx.imageSmoothingEnabled=roofStyle!=='pixel';
  ctx.filter=study().roof;
  ctx.drawImage(plate, 0, 0, sourceWidth, sourceHeight);
  ctx.restore();
  return alpha;
}
