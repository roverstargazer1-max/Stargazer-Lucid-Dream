import { articles, relations } from './mock.js';
import { paintSky, paintRoof, roofStyles, setRoofStyle } from './art.js';

// Three structural variants of a new full-screen surface, on one local-only route.
// Prototype question: can quiet space, real camera travel and reading form one flow?
const $ = id => document.getElementById(id);
const canvas = $('sky'), ctx = canvas.getContext('2d');
const world = $('world'), reader = $('reader'), scroller = $('reading-scroll');
const names = { A: '屋顶入梦', B: '观测手记', C: '漂浮书页' };
const query = new URLSearchParams(location.search);
let variant = names[query.get('variant')] ? query.get('variant') : 'C';
let width = innerWidth, height = innerHeight, dpr = Math.min(devicePixelRatio, 2);
let camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
let mode = 'relation', selected = null, phase = 'idle', travel = null;
let history = [], readIds = new Set(), readingSnapshot = null, hovered = null;
let visible = [], time = 0, lastUI = 0;
// The author explicitly requested visible camera travel for this experiment.
// This local switch remains available; no system preferences are changed.
let reducedMotion = false;
let seed = 27;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const dust = Array.from({ length: 950 }, () => ({ x: (random() - .5) * 23000, y: (random() - .5) * 15000, z: 250 + random() * 16000, size: .15 + random() * .75, alpha: .08 + random() * .42, warm: random() > .78 }));
const meteors = [];
const targetElements = new Map();
const findStarButton=document.createElement('button');
findStarButton.id='find-star';findStarButton.textContent='回望最近的文章 ↗';findStarButton.hidden=true;
findStarButton.onclick=()=>{
  const closest=[...articles].sort((a,b)=>{
    const p=position(a),q=position(b);
    return Math.hypot(p.x-camera.x,p.y-camera.y,p.z-camera.z)-Math.hypot(q.x-camera.x,q.y-camera.y,q.z-camera.z);
  })[0];
  selectStar(closest.id);
};
document.querySelector('.world-footer').append(findStarButton);
articles.forEach((article, i) => {
  const button = document.createElement('button');
  button.className = 'star-target'; button.dataset.id = article.id;
  button.setAttribute('aria-label', `选择文章：${article.title}`);
  button.innerHTML = `<span class="star-label">${article.title}<span class="star-index">${String(i + 1).padStart(2, '0')} / ${article.date.slice(0, 4)}</span></span>`;
  // Keyboard activation has no pointer sequence; pointer taps are handled below.
  button.addEventListener('click', event => { if (event.detail === 0) activateStar(article.id); });
  button.addEventListener('mouseenter', () => hovered = article.id);
  button.addEventListener('mouseleave', () => hovered = null);
  $('star-targets').append(button); targetElements.set(article.id, button);
});
function position(article) {
  if (mode === 'relation') return { x: article.position[0] * 2.9, y: article.position[1] * 2.55, z: article.position[2] * 1.75 };
  const i = articles.indexOf(article);
  return { x: Math.sin(i * .95) * 480, y: Math.cos(i * .85) * 230 - 80, z: 1260 + i * 1050 };
}
function projectionSettings() {
  const mobile = width <= 760;
  return { cx: width * (mobile ? .56 : variant === 'A' ? .69 : variant === 'B' ? .66 : .5), cy: height * (mobile ? .53 : .48), focal: Math.min(width, height * 1.2) * .8 };
}
function project(point) {
  const { cx, cy, focal } = projectionSettings();
  const dx = point.x - camera.x, dy = point.y - camera.y, dz = point.z - camera.z;
  const cyaw = Math.cos(camera.yaw), syaw = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const rx = dx * cyaw - dz * syaw, rz = dx * syaw + dz * cyaw;
  const ry = dy * cp - rz * sp, depth = dy * sp + rz * cp;
  if (depth < 24) return null;
  return { x: cx + rx * focal / depth, y: cy - ry * focal / depth, depth, scale: focal / depth };
}
function resize() {
  width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio, 2);
  canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  $('gesture-help').textContent = width <= 760 ? '单指巡视 · 双指前行 · 点星靠近' : '拖动巡视 · 滚轮前行 · 点星靠近';
  if (selected && phase === 'settled') camera = destination(articles.find(a => a.id === selected));
}
function snapshot() { return { camera: { ...camera }, selected, phase: phase === 'moving' ? 'selected' : phase }; }
function pushStop() { if (phase === 'moving') return; history.push(snapshot()); if (history.length > 30) history.shift(); }
function destination(article) {
  const p = position(article), { cx, cy, focal } = projectionSettings();
  const dist = width <= 760 ? 620 : 780;
  const targetX = width * (width <= 760 ? .43 : variant === 'B' ? .64 : variant === 'C' ? .5 : .49);
  const targetY = height * (width <= 760 ? .30 : variant === 'C' ? .36 : .43);
  return { x: p.x - (targetX - cx) * dist / focal, y: p.y + (targetY - cy) * dist / focal, z: p.z - dist, yaw: 0, pitch: 0 };
}
function moveTo(to, duration = 1050, onDone) {
  travel = { from: { ...camera }, to, start: performance.now(), duration: reducedMotion ? 220 : duration, onDone };
  phase = 'moving'; updateUI();
}
function selectStar(id, save = true) {
  if (selected === id && phase === 'moving') return;
  if (save) pushStop();
  selected = id;
  moveTo(destination(articles.find(a => a.id === id)), 1050, () => {
    phase = 'settled'; updateUI(); announce('已靠近。再次点选这颗星，或选择进入阅读。');
  });
  announce('正在靠近文章星。');
}
function activateStar(id) {
  if (reader.open) return;
  if (id === selected && phase === 'moving') return;
  if (id === selected && phase === 'settled') { openReader(); return; }
  selectStar(id);
}
function interrupt() {
  if (travel) { travel = null; phase = selected ? 'selected' : 'idle'; updateUI(); }
}
function home() {
  if (reader.open) closeReader();
  pushStop(); selected = null;
  moveTo({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 1300, () => { phase = 'idle'; updateUI(); });
}
function back() {
  if (!history.length) return;
  const previous = history.pop(); selected = previous.selected;
  moveTo(previous.camera, 1100, () => { phase = previous.phase; updateUI(); });
}
function switchMode(next) {
  if (mode === next) return;
  interrupt(); mode = next; history = [];
  if (selected) selectStar(selected, false);
  else moveTo({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 850, () => { phase = 'idle'; updateUI(); });
  updateUI();
}
function related(id) { return relations.filter(r => r[0] === id || r[1] === id).map(r => ({ article: articles.find(a => a.id === (r[0] === id ? r[1] : r[0])), reason: r[2] })); }
function announce(message) { $('announcement').textContent = message; }
function updateUI() {
  const article = articles.find(a => a.id === selected);
  document.body.classList.toggle('exploring', !!selected || camera.z > 100 || Math.abs(camera.yaw) > .15);
  $('back').disabled = history.length === 0;
  $('relation-mode').setAttribute('aria-pressed', mode === 'relation'); $('time-mode').setAttribute('aria-pressed', mode === 'time');
  $('preview').hidden = !article;
  if (article) {
    $('preview-number').textContent = `NO. ${String(articles.indexOf(article) + 1).padStart(2, '0')}`;
    $('preview-date').textContent = article.date; $('preview-title').textContent = article.title;
    $('preview-tag').textContent = article.tag; $('preview-intro').textContent = article.intro;
    $('approach-status').textContent = phase === 'moving' ? '正在靠近 · · ·' : phase === 'settled' ? '再点这颗星，展开文字' : '点选这颗星，重新靠近';
    $('read-button').disabled = phase !== 'settled';
    $('known-reasons').replaceChildren();
    if (readIds.has(selected)) related(selected).forEach(r => { const div = document.createElement('div'); div.textContent = `↗ ${r.reason}`; $('known-reasons').append(div); });
  }
  $('journey-label').textContent = article ? `${mode === 'relation' ? '关联' : '时间'} · ${article.title}` : camera.z > 100 ? '星空 · 自由巡视' : '屋顶 · 夜的起点';
  updateInspector();
}
function updateInspector() {
  $('state-output').textContent = `方案    ${variant} · ${names[variant]}\n模式    ${mode === 'relation' ? '关联' : '时间'}\n阶段    ${phase}\n选中    ${selected || '—'}\n镜头    ${[camera.x,camera.y,camera.z].map(Math.round).join(', ')}\n方向    ${camera.yaw.toFixed(2)}, ${camera.pitch.toFixed(2)}\n动画    ${reducedMotion ? '减少动态' : '完整推进'}\n视野    ${visible.length} 颗文章星\n已读    ${[...readIds].join(', ') || '—'}\n停靠点  ${history.length}\n数据    8 篇虚构文章 / 仅内存`;
}
function openReader() {
  if (!selected || phase !== 'settled') return;
  readingSnapshot = snapshot();
  const article = articles.find(a => a.id === selected);
  $('reader-title').textContent = article.title; $('reader-date').textContent = article.date;
  $('reader-tag').textContent = article.tag; $('reader-intro').textContent = article.intro;
  $('reader-content').replaceChildren(...article.paragraphs.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  $('reader-links').replaceChildren(); $('reading-relations').hidden = true;
  reader.showModal(); phase = 'reading'; scroller.scrollTop = 0;
  $('close-reader').focus(); updateInspector(); requestAnimationFrame(checkRead);
}
function closeReader() {
  reader.close();
  if (readingSnapshot) { camera = { ...readingSnapshot.camera }; selected = readingSnapshot.selected; phase = readingSnapshot.phase; }
  readingSnapshot = null; updateUI(); targetElements.get(selected)?.focus({ preventScroll: true });
}
function checkRead() {
  if (!reader.open) return;
  const endRect = $('reader-content').getBoundingClientRect(), scrollRect = scroller.getBoundingClientRect();
  const reached = endRect.bottom <= scrollRect.bottom + 2;
  if (reached && !readIds.has(selected)) { readIds.add(selected); revealReadingLinks(); announce('已到达正文末尾，关联理由已显露。'); }
  else if (readIds.has(selected) && $('reading-relations').hidden) revealReadingLinks();
  const contentEnd = $('reader-content').offsetTop + $('reader-content').offsetHeight;
  const progress = Math.min(100, Math.round((scroller.scrollTop + scroller.clientHeight) / contentEnd * 100));
  $('reading-progress').textContent = `${readIds.has(selected) ? 100 : progress}%`;
  $('reading-state').textContent = readIds.has(selected) ? '已抵达文末 · 关联理由已显露' : '沿着文字，慢慢往下';
  updateInspector();
}
function revealReadingLinks() {
  $('reading-relations').hidden = false; $('reader-links').replaceChildren();
  related(selected).forEach(({ article, reason }) => {
    const button = document.createElement('button'); const title = document.createElement('strong'); const text = document.createElement('span');
    title.textContent = article.title; text.textContent = reason; button.append(title, text);
    button.onclick = () => { closeReader(); selectStar(article.id); };
    $('reader-links').append(button);
  });
}
function setVariant(next) {
  variant = next; document.body.dataset.variant = variant;
  const url = new URL(location.href); url.searchParams.set('variant', variant); window.history.replaceState(null, '', url);
  $('variant-label').textContent = `${variant} · ${names[variant]}`;
  if (selected && !reader.open) {
    interrupt(); moveTo(destination(articles.find(a => a.id === selected)), 800, () => { phase='settled'; updateUI(); });
  }
  updateUI(); announce(`方案 ${variant}：${names[variant]}`);
}
function cycleVariant(step) { const keys = Object.keys(names); setVariant(keys[(keys.indexOf(variant) + step + 3) % 3]); }

// Tiny stars occupy little visual space, but their HTML hit areas are 44px.
const pointers = new Map(); let gestureMoved = false, multiTouch = false, previousPinch = 0, press = null;
function interactiveSurface(target) { return target === canvas || target.closest('.star-target'); }
world.addEventListener('pointerdown', e => {
  if (!interactiveSurface(e.target) || reader.open) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); world.setPointerCapture(e.pointerId);
  if (pointers.size === 1) { press = { x: e.clientX, y: e.clientY }; gestureMoved = false; multiTouch = false; }
  else { multiTouch = true; gestureMoved = true; const pts = [...pointers.values()]; previousPinch = Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y); }
});
world.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  const old = pointers.get(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (press && Math.hypot(e.clientX-press.x,e.clientY-press.y)>6) gestureMoved = true;
  if (!gestureMoved) return;
  interrupt();
  if (pointers.size >= 2) {
    const pts = [...pointers.values()], distance = Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    moveForward((distance-previousPinch)*4); previousPinch=distance;
  } else if (!multiTouch) {
    camera.yaw -= (e.clientX-old.x)*.003; camera.pitch = Math.max(-1.05,Math.min(1.05,camera.pitch+(e.clientY-old.y)*.0025));
    if (selected) phase = 'selected';
  }
});
world.addEventListener('pointerup', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (!gestureMoved && !multiTouch) {
    const hit = visible.filter(s=>Math.hypot(s.x-e.clientX,s.y-e.clientY)<25).sort((a,b)=>Math.hypot(a.x-e.clientX,a.y-e.clientY)-Math.hypot(b.x-e.clientX,b.y-e.clientY))[0];
    if (hit) activateStar(hit.article.id);
    else { interrupt(); selected = null; phase = 'idle'; updateUI(); }
  }
  if (!pointers.size) { press=null; updateUI(); }
});
world.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); gestureMoved=true; press=null; });
world.addEventListener('wheel', e => {
  if (!interactiveSurface(e.target)) return;
  e.preventDefault(); interrupt(); moveForward(-Math.max(-140,Math.min(140,e.deltaY)) * 1.35); updateUI();
}, { passive: false });
function moveForward(amount) {
  const oldZ = camera.z;
  camera.z = Math.max(-100,Math.min(10000,camera.z + Math.cos(camera.yaw)*Math.cos(camera.pitch)*amount));
  if (camera.z !== oldZ) { camera.x += Math.sin(camera.yaw)*Math.cos(camera.pitch)*amount; camera.y += Math.sin(camera.pitch)*amount; }
  if (selected) phase='selected';
}
function drawBackground() {
  const articlePoints=articles.map(a=>project(position(a))).filter(p=>p&&p.depth<6500);
  paintSky(ctx, width, height, camera, projectionSettings(), articlePoints);
  // Nearby dust uses finite world positions, unlike the far celestial sphere.
  for (const star of dust) {
    const p=project(star);
    if(!p || p.x<0 || p.x>width || p.y<0 || p.y>height) continue;
    const r=Math.min(.65,star.size*Math.sqrt(p.scale));
    ctx.globalAlpha=star.alpha*.6;
    ctx.fillStyle=star.warm?'#d8c3a6':'#d9e8fc';
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill();
    if(travel && !reducedMotion && star.previous && p.depth<3200){
      const dx=p.x-star.previous.x,dy=p.y-star.previous.y,distance=Math.hypot(dx,dy);
      if(distance>1 && distance<90){
        const length=Math.min(18,distance*1.2),scale=length/distance;
        ctx.strokeStyle=star.warm?'#d8c3a645':'#d9e8fc45';ctx.lineWidth=.5;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-dx*scale,p.y-dy*scale);ctx.stroke();
      }
    }
    star.previous={x:p.x,y:p.y};
  }
  ctx.globalAlpha=1;
}
function drawConnections(points) {
  const lookup=new Map(points.map(p=>[p.article.id,p]));
  if(mode==='time'){
    ctx.strokeStyle='#a8bddc20';ctx.setLineDash([2,8]);ctx.lineWidth=.7;ctx.beginPath();
    let first=true;articles.forEach(article=>{const p=lookup.get(article.id);if(p){first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}});ctx.stroke();ctx.setLineDash([]);return;
  }
  if(!selected)return;
  const origin=lookup.get(selected);if(!origin)return;
  related(selected).forEach(({article})=>{
    const end=lookup.get(article.id);if(!end)return;
    const grad=ctx.createLinearGradient(origin.x,origin.y,end.x,end.y);grad.addColorStop(0,'#a9c7e43e');grad.addColorStop(1,'#a9c7e40a');
    ctx.strokeStyle=grad;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  });
}
function drawStars() {
  const linked = new Set(selected && mode === 'relation' ? related(selected).map(r=>r.article.id) : []);
  const candidates=articles.map(article=>({article,...project(position(article))}))
    .filter(p=>Number.isFinite(p.x) && (p.depth<4000 || p.article.id===selected || linked.has(p.article.id)))
    .sort((a,b)=>a.depth-b.depth);
  // A maximum of six article targets, with distant space left unpopulated.
  const points=candidates.filter(p=>p.x>20&&p.x<width-25&&p.y>95&&p.y<height-100).slice(0,6);
  drawConnections(points);
  visible=[];
  points.sort((a,b)=>b.depth-a.depth).forEach(p=>{
    const {article,x,y,depth}=p, active=selected===article.id;
    const visiblePoint=x>20&&x<width-25&&y>95&&y<height-100;
    const button=targetElements.get(article.id);
    button.hidden=!visiblePoint;
    if(!visiblePoint)return;
    visible.push(p);
    button.style.left=`${x}px`;button.style.top=`${y}px`;
    button.classList.toggle('is-selected',active);button.classList.toggle('near',depth<4200 || hovered===article.id);
    button.classList.toggle('label-left',x>width-190);
    button.setAttribute('aria-label',`${active&&phase==='settled'?'阅读文章':'选择文章'}：${article.title}`);
    const radius=Math.max(2.2,Math.min(3.6,3*1500/depth));
    const alpha=active?1:.95;
    ctx.globalAlpha=alpha;
    const halo=ctx.createRadialGradient(x,y,0,x,y,active?28:22);halo.addColorStop(0,article.color+'aa');halo.addColorStop(.15,article.color+'36');halo.addColorStop(.5,article.color+'0b');halo.addColorStop(1,article.color+'00');
    ctx.fillStyle=halo;ctx.fillRect(x-30,y-30,60,60);
    ctx.fillStyle=article.color;ctx.beginPath();ctx.arc(x,y,radius,0,7);ctx.fill();
    ctx.fillStyle='#fff6e8';ctx.beginPath();ctx.arc(x,y,radius*.4,0,7);ctx.fill();
    const spike=active?13:hovered===article.id?12:9;
    ctx.strokeStyle=article.color+(active?'aa':'85');ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-spike,y);ctx.lineTo(x+spike,y);ctx.moveTo(x,y-spike);ctx.lineTo(x,y+spike);ctx.stroke();
    if(readIds.has(article.id)){ctx.strokeStyle='#baa582';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*1.3);ctx.stroke();}
    ctx.globalAlpha=1;
  });
  // Hide points that are behind the camera too.
  for(const article of articles)if(!points.some(p=>p.article.id===article.id))targetElements.get(article.id).hidden=true;
  placeLabels(points);
}
function placeLabels(points){
  const occupied=[],fontSize=width<=760?10:12,labelHeight=width<=760?17:33;
  for(const p of [...points].sort((a,b)=>(b.article.id===selected)-(a.article.id===selected)||a.depth-b.depth)){
    const label=targetElements.get(p.article.id).querySelector('.star-label');
    const w=Math.min(width<=760?150:250,p.article.title.length*fontSize+6);
    const options=[
      {x:p.x+15,y:p.y-6}, {x:p.x-w-15,y:p.y-6},
      {x:Math.max(12,Math.min(width-w-12,p.x-w/2)),y:p.y+27},
      {x:Math.max(12,Math.min(width-w-12,p.x-w/2)),y:p.y-labelHeight-27}
    ];
    const fits=r=>r.x>=10&&r.x+w<width-10&&r.y>80&&r.y+labelHeight<height-100;
    const free=r=>!occupied.some(q=>r.x<q.x+q.w+6&&r.x+w+6>q.x&&r.y<q.y+q.h+5&&r.y+labelHeight+5>q.y);
    const box=options.find(r=>fits(r)&&free(r))||options.find(fits)||options[0];
    label.style.left=(box.x-p.x+22)+'px';label.style.right='auto';label.style.top=(box.y-p.y+22)+'px';label.style.textAlign='left';
    occupied.push({...box,w,h:labelHeight});
  }
}
function animate(now) {
  time=now;
  if(travel){
    const flight=travel,t=Math.min(1,(now-flight.start)/Math.max(1,flight.duration));
    // Fast acceleration followed by a soft approach; position always interpolates.
    const ease=1-Math.pow(1-t,3);
    for(const key of Object.keys(camera))camera[key]=flight.from[key]+(flight.to[key]-flight.from[key])*ease;
    if(t===1){travel=null;flight.onDone?.();}
  }
  drawBackground();
  const roofVisibility=paintRoof(ctx,width,height,camera);
  $('journal-egg').hidden=roofVisibility<.35;
  drawStars();
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i],age=(now-m.start)/1800;if(age>1){meteors.splice(i,1);continue;}
    ctx.strokeStyle=`rgba(187,213,239,${Math.sin(age*Math.PI)*.65})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m.x+age*width*.22,m.y+age*height*.16);ctx.lineTo(m.x+age*width*.22-55,m.y+age*height*.16-30);ctx.stroke();
  }
  if(now-lastUI>180){
    updateInspector();document.body.classList.toggle('exploring',!!selected||camera.z>100||Math.abs(camera.yaw)>.15);
    const empty=visible.length===0&&phase!=='moving';
    findStarButton.hidden=!empty;$('journey-label').hidden=empty;
    lastUI=now;
  }
  requestAnimationFrame(animate);
}
$('brand').onclick=e=>{e.preventDefault();home();};$('home').onclick=home;$('back').onclick=back;
const roofSelect=$('roof-style');
for(const [key,label] of Object.entries(roofStyles)){
  const option=document.createElement('option');option.value=key;option.textContent=label;roofSelect.append(option);
}
roofSelect.value=roofStyles[query.get('roof')]?query.get('roof'):'anime';
function applyRoofStyle(){
  setRoofStyle(roofSelect.value);
  const url=new URL(location.href);url.searchParams.set('roof',roofSelect.value);window.history.replaceState(null,'',url);
  announce(`屋顶风格：${roofStyles[roofSelect.value]}`);
}
roofSelect.onchange=applyRoofStyle;applyRoofStyle();
$('roof-home').onclick=home;
$('relation-mode').onclick=()=>switchMode('relation');$('time-mode').onclick=()=>switchMode('time');
$('read-button').onclick=openReader;$('close-reader').onclick=closeReader;
$('deselect').onclick=()=>{interrupt();selected=null;phase='idle';updateUI();};
reader.addEventListener('cancel',e=>{e.preventDefault();closeReader();});
scroller.addEventListener('scroll',checkRead,{passive:true});
$('prev-variant').onclick=()=>cycleVariant(-1);$('next-variant').onclick=()=>cycleVariant(1);
const motionButton = document.createElement('button');
motionButton.id='motion-toggle'; motionButton.className='motion-toggle';
function updateMotionButton(){motionButton.textContent=reducedMotion?'轻过渡':'镜头推进';motionButton.setAttribute('aria-label',reducedMotion?'开启镜头推进动画':'减少镜头动画');}
motionButton.onclick=()=>{reducedMotion=!reducedMotion;updateMotionButton();updateInspector();};
document.querySelector('.mock-badge').replaceWith(motionButton);updateMotionButton();
document.addEventListener('keydown',e=>{
  if(reader.open||$('egg-dialog').open||e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cycleVariant(e.key==='ArrowRight'?1:-1);}
});
$('journal-egg').onclick=()=>{
  $('egg-title').textContent='屋顶上，留了一盏灯。';
  $('egg-copy').textContent='这里没有完整的自我介绍。只有一杯冷掉的茶，一本写了一半的手记，和一个总是睡得太晚的人。\n\n如果你也会因为夜空停下脚步，或许我们已经认识了一点。';
  $('egg-dialog').showModal();
};
$('signal-egg').onclick=()=>{
  meteors.push({x:width*.58,y:height*.17,start:performance.now()});
  announce('远方的微光回应了你，一颗流星正在划过。');
};
$('close-egg').onclick=()=>$('egg-dialog').close();
if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname))$('prototype-tools').hidden=true;
window.addEventListener('resize',resize);resize();setVariant(variant);requestAnimationFrame(animate);
