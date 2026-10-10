import {angles,clamp,direction,domeIntersection,viewRay} from './dome.js';
export function createSkyMap(world,{onLook,onOverview,onReset}){
  const panel=document.createElement('aside');panel.id='sky-map';panel.setAttribute('aria-label','星空方位图');
  panel.innerHTML='<canvas width="360" height="360" aria-label="星空方位图：天顶在中央，地平线在圆周；淡光区域表示当前视野，点击可转向"></canvas>';
  const toggle=document.createElement('button');toggle.id='sky-map-toggle';toggle.textContent='◎ 星图';toggle.setAttribute('aria-label','显示星空方位图');
  const controls=document.createElement('div');controls.id='sky-map-controls';
  const overview=document.createElement('button');overview.id='sky-overview';overview.textContent='仰望';overview.setAttribute('aria-label','仰望广角星空');overview.title='仰望广角星空';overview.onclick=onOverview;
  const reset=document.createElement('button');reset.id='sky-reset';reset.textContent='回正';reset.setAttribute('aria-label','回到初始星空视角');reset.title='回到初始星空视角';reset.onclick=onReset;
  controls.append(overview,reset,toggle);world.append(panel,controls);
  const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');
  let lastActivity=-10000,lastPose='',lastData=null,wide=false;
  const reveal=()=>{lastActivity=performance.now();};toggle.onclick=reveal;
  panel.addEventListener('pointermove',reveal);panel.addEventListener('focusin',reveal);
  canvas.onclick=e=>{
    const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*180-90,y=(e.clientY-rect.top)/rect.height*180-90;
    const r=Math.hypot(x,y);if(r>70)return;
    onLook(Math.atan2(x,-y),clamp((1-r/70)*Math.PI/2,0,Math.PI/2));reveal();
  };
  const point=p=>{const a=angles(p),r=(1-clamp(a.elevation,0,Math.PI/2)/(Math.PI/2))*70;return {x:90+Math.sin(a.azimuth)*r,y:90-Math.cos(a.azimuth)*r};};
  return {reveal,update(camera,settings,articles,selected,active,w,h,now){
    const pose=[camera.yaw,camera.pitch,camera.zoom,camera.x,camera.y,camera.z].map(v=>v.toFixed(4)).join(',');
    if(active&&pose!==lastPose)lastActivity=now;
    lastPose=pose;
    wide=camera.zoom<(wide?.64:.58);
    document.body.dataset.skyView=wide?'wide':'normal';
    const shown=active&&(wide||now-lastActivity<2800);
    panel.classList.toggle('is-visible',shown);panel.inert=!shown;controls.hidden=!active;
    if(!shown)return;
    const key=pose+selected+[w,h,settings.cx,settings.cy,settings.focal].join(',')+articles.map(a=>[a.id,a.point.x.toFixed(0),a.point.y.toFixed(0),a.point.z.toFixed(0)].join(',')).join(';');
    if(key===lastData)return;lastData=key;
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,180,180);
    // Broken, low-contrast latitude marks leave the sky visible between strokes.
    ctx.strokeStyle='#b4cbdc30';ctx.lineWidth=.6;ctx.setLineDash([1,5]);ctx.lineCap='round';
    for(const r of [70,46.67,23.33]){ctx.beginPath();ctx.arc(90,90,r,0,Math.PI*2);ctx.stroke();}
    ctx.setLineDash([]);
    // Keep direction labels and points legible as CSS shrinks the mobile map.
    const mapSize=canvas.clientWidth||180,symbolScale=Math.max(1,142/mapSize);
    ctx.font=`600 ${Math.max(11,Math.round(9*180/mapSize))}px KaiTi, STKaiti, serif`;ctx.fillStyle='#dce7eee8';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [s,x,y] of [['北',90,9],['南',90,171],['东',171,90],['西',9,90]])ctx.fillText(s,x,y);
    // The view footprint uses the exact inverse projection and sphere intersection.
    const boundary=[];
    for(let side=0;side<4;side++)for(let i=0;i<12;i++){
      const t=i/12;
      const [x,y]=side===0?[t*w,0]:side===1?[w,t*h]:side===2?[(1-t)*w,h]:[0,(1-t)*h];
      boundary.push(point(domeIntersection(camera,viewRay(x,y,camera,settings))));
    }
    ctx.beginPath();boundary.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    const wash=ctx.createRadialGradient(90,90,4,90,90,76);
    wash.addColorStop(0,'#b4d0e21a');wash.addColorStop(1,'#b4d0e203');
    ctx.fillStyle=wash;ctx.fill();ctx.strokeStyle='#bed7e34a';ctx.lineWidth=.7;
    ctx.shadowColor='#b1cee1';ctx.shadowBlur=5;ctx.stroke();ctx.shadowBlur=0;
    for(const article of articles){
      const p=point(article.point),chosen=article.id===selected;
      ctx.fillStyle=chosen?'#ffe1a0':'#d6e0dfba';ctx.shadowColor=chosen?'#edcc8c':'#b8d3e0';ctx.shadowBlur=chosen?8:4;
      ctx.beginPath();ctx.arc(p.x,p.y,(chosen?2:1.15)*symbolScale,0,7);ctx.fill();ctx.shadowBlur=0;
    }
    const center=point(domeIntersection(camera,direction(camera.yaw,camera.pitch)));
    const glow=ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,9);
    glow.addColorStop(0,'#f3d59165');glow.addColorStop(1,'#f3d59100');ctx.fillStyle=glow;
    ctx.beginPath();ctx.arc(center.x,center.y,9,0,7);ctx.fill();
    ctx.strokeStyle='#f3d591b3';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(center.x,center.y,3.2,0,7);ctx.stroke();
  }};
}
