import {angles,clamp,direction,domeIntersection,viewRay} from './dome.js';
export function createSkyMap(world,onLook){
  const panel=document.createElement('aside');panel.id='sky-map';panel.setAttribute('aria-label','星空方位图');
  panel.innerHTML='<div class="sky-map-heading"><span>星空方位</span><span id="sky-map-angle"></span></div><canvas width="360" height="360" aria-label="天顶在中央，地平线在圆周；亮框表示当前视野"></canvas><p>中央是天顶 · 点击星图转向</p>';
  const toggle=document.createElement('button');toggle.id='sky-map-toggle';toggle.textContent='◎ 星图';toggle.setAttribute('aria-label','显示星空方位图');
  world.append(panel,toggle);
  const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');
  let lastActivity=-10000,lastPose='',lastData=null;
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
    const shown=active&&now-lastActivity<2800;
    panel.classList.toggle('is-visible',shown);panel.inert=!shown;toggle.hidden=!active;
    if(!shown)return;
    const key=pose+selected+[w,h,settings.cx,settings.cy,settings.focal].join(',')+articles.map(a=>[a.id,a.point.x.toFixed(0),a.point.y.toFixed(0),a.point.z.toFixed(0)].join(',')).join(';');
    if(key===lastData)return;lastData=key;
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,180,180);
    ctx.strokeStyle='#9dbed135';ctx.lineWidth=.6;
    for(const r of [70,46.67,23.33]){ctx.beginPath();ctx.arc(90,90,r,0,7);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(90,20);ctx.lineTo(90,160);ctx.moveTo(20,90);ctx.lineTo(160,90);ctx.stroke();
    ctx.font='9px sans-serif';ctx.fillStyle='#a7bfce';ctx.textAlign='center';
    for(const [s,x,y] of [['北',90,12],['南',90,176],['东',171,93],['西',9,93]])ctx.fillText(s,x,y);
    ctx.fillStyle='#9bb9cf75';ctx.font='7px sans-serif';ctx.fillText('60°',109,91);ctx.fillText('30°',132,91);
    // The view footprint uses the exact inverse projection and sphere intersection.
    const boundary=[];
    for(let side=0;side<4;side++)for(let i=0;i<12;i++){
      const t=i/12;
      const [x,y]=side===0?[t*w,0]:side===1?[w,t*h]:side===2?[(1-t)*w,h]:[0,(1-t)*h];
      boundary.push(point(domeIntersection(camera,viewRay(x,y,camera,settings))));
    }
    ctx.beginPath();boundary.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='#89b5d92a';ctx.fill();ctx.strokeStyle='#b4d4e394';ctx.lineWidth=.85;ctx.stroke();
    for(const article of articles){
      const p=point(article.point);ctx.fillStyle=article.id===selected?'#ffe1a0':'#c6d8df';
      ctx.beginPath();ctx.arc(p.x,p.y,article.id===selected?2.5:1.35,0,7);ctx.fill();
    }
    const center=point(domeIntersection(camera,direction(camera.yaw,camera.pitch)));
    ctx.strokeStyle='#f3d591';ctx.lineWidth=1;ctx.beginPath();ctx.arc(center.x,center.y,3.8,0,7);ctx.stroke();
    const degrees=(camera.yaw*180/Math.PI%360+360)%360,labels=['北','东北','东','东南','南','西南','西','西北'];
    panel.querySelector('#sky-map-angle').textContent=`${labels[Math.round(degrees/45)%8]} · 仰角 ${Math.round(camera.pitch*180/Math.PI)}°`;
  }};
}
