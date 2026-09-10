import { DOME_RADIUS, direction, projectDome } from './dome.js';
import { paintDomeEnvironment } from './dome-renderer.js';
// V11 visual experiment: the supplied room leads into a painted, navigable sky.
export const painted = new URLSearchParams(location.search).get('scene') !== 'classic';
const plate = new Image();
if (painted) plate.src = new URL('./assets/painted-sky-v11.png', import.meta.url).href;
let seed=812;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const stars=Array.from({length:600},()=>{
  const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);
  return {x:Math.sin(a)*r,y,z:Math.cos(a)*r,r:.4+random()*.55,alpha:.2+random()*.4};
});
// Sparse pinpricks along the painted band; these stay dimmer and smaller than articles.
const galaxyStars=Array.from({length:2400},()=>{
  const y=random(),a=random()*Math.PI*2,r=Math.sqrt(1-y*y),x=Math.sin(a)*r,z=Math.cos(a)*r;
  const band=Math.max(0,1-Math.abs(x*.84-y*.20+z*.50)/.23);
  return {x,y,z,r:.55+random()*.55,alpha:(.20+random()*.26)*band};
}).filter(star=>star.y>.58&&star.alpha>.07);
const skyStars=stars.concat(galaxyStars);

export function paintPaintedSky(ctx,w,h,camera,settings,ambient){
  ctx.fillStyle='#042b68';ctx.fillRect(0,0,w,h);
  const ready=paintDomeEnvironment(ctx,w,h,camera,settings,plate);
  document.body.dataset.domeRenderer=ready?'webgl':'loading';
  // Distant decoration shares the article hemisphere and camera, without a screen-space offset.
  for(const star of skyStars){
    if(star.y<0)continue;
    const p=projectDome({x:star.x*DOME_RADIUS,y:star.y*DOME_RADIUS,z:star.z*DOME_RADIUS},camera,settings);
    if(!p||p.x<0||p.x>w||p.y<0||p.y>h)continue;
    ctx.globalAlpha=star.alpha*.65;ctx.fillStyle='#c5dbef';
    ctx.fillRect(p.x,p.y,star.r,star.r);
  }
  ctx.globalAlpha=1;
  const moon=projectDome(direction(.45,.50,DOME_RADIUS),camera,settings);
  if(moon&&moon.x>-100&&moon.x<w+100&&moon.y>-100&&moon.y<h+100){
    const r=Math.min(w,h)*.037*(camera.zoom||1);
    ctx.save();ctx.translate(moon.x,moon.y);ctx.rotate(-.24);
    ctx.shadowColor='#e8bc652a';ctx.shadowBlur=9;ctx.fillStyle='#e7b859';
    const crescent=new Path2D('M19 -29 C-5 -43 -35 -24 -33 1 C-33 26 -9 41 14 28 L25 17 C4 31 -19 17 -20 -1 C-21 -21 -1 -33 19 -29Z');
    ctx.scale(r/35,r/35);ctx.fill(crescent);ctx.shadowBlur=0;
    ctx.strokeStyle='#f4d88c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,-29);ctx.lineTo(-2,-30);ctx.lineTo(-19,-19);ctx.lineTo(-27,-2);ctx.lineTo(-22,17);ctx.lineTo(-9,28);ctx.stroke();ctx.restore();
  }
}
export function paintCloudVeil(ctx,w,h,camera,settings){
  paintDomeEnvironment(ctx,w,h,camera,settings,plate,true);
}
export function paintPaintedStar(ctx,x,y,id,{depth=1800,active=false,hover=false,zoom=1,importance='ordinary',seconds=null}={}){
  let identity=0;for(const ch of id)identity=(identity*31+ch.charCodeAt(0))>>>0;
  const rank={ordinary:1,important:1.3,treasured:1.65}[importance]||1;
  const size=(3.2+(identity%7)*.17)*rank*Math.max(.8,Math.min(1.35,Math.sqrt(1800/depth)));
  const pulse=seconds===null?1:1+Math.sin(seconds*.9+identity)*.025;
  ctx.save();ctx.translate(x,y);ctx.scale(zoom*pulse,zoom*pulse);
  const warm=identity%3!==0;
  const halo=ctx.createRadialGradient(0,0,0,0,0,size*3.1);
  halo.addColorStop(0,warm?'#f1d58b25':'#cbe9ff20');halo.addColorStop(.3,warm?'#f1d58b0b':'#cbe9ff09');halo.addColorStop(1,'#cce9ff00');
  ctx.fillStyle=halo;ctx.fillRect(-size*3.1,-size*3.1,size*6.2,size*6.2);
  ctx.rotate((identity%5-2)*.08);
  ctx.fillStyle=warm?'#f3d38d':'#d0e5f6';ctx.beginPath();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4-Math.PI/2,r=i%2?size*.29:size*(i%4===0?1.2:.85);
    const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();ctx.fillStyle='#fff1c8';ctx.fillRect(-.8,-.8,1.6,1.6);
  if(active||hover){
    ctx.strokeStyle=active?'#edcf8899':'#d5e8ed77';ctx.lineWidth=.85;
    ctx.beginPath();ctx.ellipse(0,0,size+10,size+9,-.2,.2,5.8);ctx.stroke();
  }
  ctx.restore();
}

export function createRoom({onEnter,onReturn,onJournal,onMotion}){
  const room=document.getElementById('room'),stage=document.getElementById('room-stage');
  const entry=document.getElementById('window-entry'),world=document.getElementById('world');
  // This visual trial explicitly asks for a visible camera push; keep a light alternative.
  let flight=null,short=new URLSearchParams(location.search).get('motion')==='soft';
  const motion=document.getElementById('entry-motion');
  function setMotion(){motion.setAttribute('aria-pressed',String(short));motion.textContent=short?'轻过渡 · 开':'轻过渡';onMotion(short);}
  motion.onclick=()=>{short=!short;setMotion();};setMotion();
  function show(){
    if(flight){flight.cancel();flight=null;}
    onReturn();room.hidden=false;room.inert=false;world.inert=true;
    document.body.dataset.room='inside';entry.disabled=false;
    stage.style.transform='';room.style.opacity='';entry.focus({preventScroll:true});
  }
  entry.onclick=async()=>{
    if(flight)return;
    entry.disabled=true;room.inert=true;document.body.dataset.room='entering';
    const rect=stage.getBoundingClientRect();
    // Fly through the clear left pane, above the chair and away from the mullion.
    const px=rect.width*(innerWidth<=760?.55:.52),py=rect.height*.29;
    stage.style.transformOrigin=`${px}px ${py}px`;
    const dx=innerWidth/2-(rect.left+px),dy=innerHeight/2-(rect.top+py);
    onEnter();
    const duration=short?240:2200;
    flight=stage.animate([
      {transform:'translate(0,0) scale(1)',opacity:1,offset:0},
      {transform:`translate(${dx*.2}px,${dy*.2}px) scale(1.32)`,opacity:1,offset:.24},
      {transform:`translate(${dx*.82}px,${dy*.82}px) scale(3.25)`,opacity:1,offset:.62},
      {transform:`translate(${dx}px,${dy}px) scale(5.8)`,opacity:0,offset:1}
    ],{duration,easing:'cubic-bezier(.42,0,.18,1)',fill:'forwards'});
    await flight.finished.catch(()=>{});
    if(!flight)return;
    flight.cancel();flight=null;room.hidden=true;world.inert=false;
    document.body.dataset.room='outside';document.getElementById('home').focus({preventScroll:true});
  };
  document.getElementById('room-journal').onclick=onJournal;
  show();
  return {show,get active(){return !room.hidden;}};
}
