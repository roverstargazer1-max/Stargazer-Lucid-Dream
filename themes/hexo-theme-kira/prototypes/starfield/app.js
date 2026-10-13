import {buildPaths,degrees,growArticle,clipSegment,crosses} from './navigation.js';
import { studies, setStudy, paintArticleLight, paintSpecimens } from './art-study.js';
import { articles, relations } from './mock.js';
import { paintSky, paintRoof, roofStyles, setRoofStyle } from './art.js';
import { painted, paintPaintedSky, paintCloudVeil, createRoom } from './painted.js';
import {arrangeDome,domePosition,domeDestination,growDomeArticle,HOME_ELEVATION,MIN_SKY_ZOOM,clamp,direction,wrapAngle} from './dome.js';
import {createSkyMap} from './sky-map.js';
import {createInteractiveClouds} from './interactive-clouds.js';
import {createStarMotion,approachFrame,smooth,ENTRANCE,entranceFrame,returnFrame} from './motion.js';
import {dockTarget} from './experience.js';

// Three structural variants of a new full-screen surface, on one local-only route.
// Prototype question: can quiet space, real camera travel and reading form one flow?
const $ = id => document.getElementById(id);
const canvas = $('sky'), ctx = canvas.getContext('2d');
const world = $('world'), reader = $('reader'), scroller = $('reading-scroll');
const icon = path => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
const arrows={right:icon('M4 12h16m-6-6 6 6-6 6'),left:icon('M20 12H4m6-6-6 6 6 6'),close:icon('m6 6 12 12M18 6 6 18')};
$('read-button').innerHTML=`进入阅读 ${arrows.right}`;
$('close-reader').innerHTML=`${arrows.left} 返回星空`;
$('deselect').innerHTML=arrows.close;$('close-egg').innerHTML=arrows.close;
$('home').innerHTML=icon('m3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8');
$('back').innerHTML=icon('M4 4v7h7M4 11c2-7 15-7 16 2 1 6-5 9-10 7');
const interactiveClouds=painted?createInteractiveClouds(world):null;
const names = { A: '屋顶入梦', B: '观测手记', C: '漂浮书页' };
const query = new URLSearchParams(location.search);
document.body.dataset.scene=painted?'painted':'classic';
let roomScene=null;
let skyMap=null;
const ambientPreference=matchMedia('(prefers-reduced-motion: reduce)');
let living=query.get('living')==='0'?false:query.get('living')==='1'?true:!ambientPreference.matches;
const ambient={x:0,y:0,targetX:0,targetY:0,seconds:0};
let lastFrame=0;
document.addEventListener('visibilitychange',()=>{lastFrame=0;});
function ambientBlocked(){return document.hidden||!!arrival||!!retreat||reader.open||$('specimen-dialog').open||$('egg-dialog').open;}
world.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||e.buttons||!interactiveSurface(e.target))return;
  ambient.targetX=Math.max(-1,Math.min(1,e.clientX/innerWidth*2-1));
  ambient.targetY=Math.max(-1,Math.min(1,e.clientY/innerHeight*2-1));
});
world.addEventListener('pointerleave',()=>{ambient.targetX=0;ambient.targetY=0;interactiveClouds?.clearHover();canvas.classList.remove('over-cloud');});
let variant = names[query.get('variant')] ? query.get('variant') : 'C';
let width = innerWidth, height = innerHeight, dpr = Math.min(devicePixelRatio, 2);
let camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: painted?HOME_ELEVATION:0, zoom:1 };
let mode = 'relation', selected = null, phase = 'idle', travel = null;
let arrival = null, retreat = null, skyClarity = 1;
let history = [], readIds = new Set(), readingSnapshot = null, hovered = null;
let readerTrigger=null, timeCueUntil=0, uiRects=[], labelFontSize=15, reviewMedia=false, uiMeasureFrame=0;
let visible = [], time = 0, lastUI = 0;
// The author explicitly requested visible camera travel for this experiment.
// This local switch remains available; no system preferences are changed.
let reducedMotion = query.get('motion') === 'full' ? false : query.get('motion') === 'soft' || ambientPreference.matches;
const starMotion = createStarMotion({preview:$('preview'),reader,scroller,isSoft:()=>reducedMotion});
const seal = document.createElementNS('http://www.w3.org/2000/svg','svg');
seal.classList.add('reading-seal');seal.setAttribute('viewBox','0 0 1000 1000');seal.setAttribute('preserveAspectRatio','none');seal.setAttribute('aria-hidden','true');
for(const d of ['M0 1000 L1000 0','M1000 0 L0 1000']){
  const line=document.createElementNS(seal.namespaceURI,'path');line.setAttribute('d',d);line.setAttribute('pathLength','1');seal.append(line);
}
reader.append(seal);
let seed = 27;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const dust = Array.from({ length: 950 }, () => ({ x: (random() - .5) * 23000, y: (random() - .5) * 15000, z: 250 + random() * 16000, size: .15 + random() * .75, alpha: .08 + random() * .42, warm: random() > .78 }));
const meteors = [];
const targetElements = new Map();
if(painted)arrangeDome(articles);
const navigationEdges=buildPaths(articles);
let navigationOn=query.get('paths')!=='0',drawnPaths=0,latestAdded=null;
const lineMotion={opacity:1,suppressed:false,lastMotion:0,previous:null};
function updateLineMotion(now,dt){
  const previous=lineMotion.previous;
  lineMotion.previous={...camera,time:now};
  if(!previous)return;
  const elapsed=Math.max(.001,(now-previous.time)/1000);
  // Measure camera movement, so touch, mouse, keys and camera travel agree.
  const rotation=Math.hypot(wrapAngle(camera.yaw-previous.yaw),camera.pitch-previous.pitch)*(camera.zoom||1);
  const translation=Math.hypot(camera.x-previous.x,camera.y-previous.y,camera.z-previous.z)/6000;
  const zoom=Math.abs(Math.log((camera.zoom||1)/(previous.zoom||1)));
  const speed=(rotation+translation+zoom)/elapsed;
  if(speed>.55)lineMotion.suppressed=true;
  if(speed>.08)lineMotion.lastMotion=now;
  // Wait for a quiet interval before restoring lines; avoid flicker between events.
  if(lineMotion.suppressed&&now-lineMotion.lastMotion>220)lineMotion.suppressed=false;
  const target=lineMotion.suppressed?0:1;
  const duration=target===0?.055:ambientPreference.matches?.12:.48;
  lineMotion.opacity+=(target-lineMotion.opacity)*(1-Math.exp(-dt/duration));
  if(Math.abs(lineMotion.opacity-target)<.005)lineMotion.opacity=target;
}
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
function mountArticle(article, i) {
  const button = document.createElement('button');
  button.className = 'star-target'; button.dataset.id = article.id;
  button.setAttribute('aria-label', `选择文章：${article.title}`);
  button.innerHTML = `<span class="star-label">${article.title}<span class="star-index">${String(i + 1).padStart(2, '0')} / ${article.date.slice(0, 4)}</span></span>`;
  // Keyboard activation has no pointer sequence; pointer taps are handled below.
  button.addEventListener('click', event => { if (event.detail === 0) activateStar(article.id); });
  button.addEventListener('mouseenter', () => hovered = article.id);
  button.addEventListener('mouseleave', () => hovered = null);
  $('star-targets').append(button); targetElements.set(article.id, button);
}
articles.forEach(mountArticle);
function position(article) {
  if(painted)return domePosition(article,articles.indexOf(article),mode);
  if (mode === 'relation') return { x: article.position[0], y: article.position[1], z: article.position[2] };
  const i = articles.indexOf(article);
  return { x: Math.sin(i * .95) * 480, y: Math.cos(i * .85) * 230 - 80, z: 1260 + i * 1050 };
}
function projectionSettings() {
  const mobile = width <= 760;
  return { cx: width * (mobile ? .56 : variant === 'A' ? .69 : variant === 'B' ? .66 : .5), cy: height * (mobile ? .49 : .46), focal: Math.min(width, height * 1.2) * 1.05 * (painted?camera.zoom:1) };
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
  $('gesture-help').textContent = painted?(width<=760?'单指转动穹顶 · 双指靠近':'拖动转动穹顶 · 滚轮靠近 · 方向键转向'):width <= 760 ? '单指巡视 · 双指前行 · 点星靠近' : '拖动巡视 · 滚轮前行 · 点星靠近';
  if (selected && phase === 'settled') camera = destination(articles.find(a => a.id === selected));
  if (selected && travel) travel.to = destination(articles.find(a => a.id === selected));
  if (readingSnapshot?.selected) readingSnapshot.camera = destination(articles.find(a => a.id === readingSnapshot.selected));
  if (document.body.dataset.room === 'inside') camera.zoom = width <= 760 ? .78 : 1;
  starMotion.resize();
  positionTimeCue();
  measureUI();
}
function snapshot() { return { camera: { ...camera }, selected, phase: phase === 'moving' ? 'selected' : phase }; }
function pushStop() { if (phase === 'moving') return; history.push(snapshot()); if (history.length > 30) history.shift(); }
function destination(article) {
  if(painted){
    const settings=projectionSettings();settings.focal=settings.focal/camera.zoom*1.55;
    const preview=$('preview').getBoundingClientRect();
    return domeDestination(position(article),camera,settings,dockTarget(width,height,preview));
  }
  const p = position(article), { cx, cy, focal } = projectionSettings();
  const dist = width <= 760 ? 620 : 780;
  const targetX = width * (width <= 760 ? .43 : variant === 'B' ? .64 : variant === 'C' ? .5 : .49);
  const targetY = height * (width <= 760 ? .30 : variant === 'C' ? .36 : .43);
  const rx=(targetX-cx)*dist/focal,ry=(cy-targetY)*dist/focal;
  const ca=Math.cos(camera.yaw),sa=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const rz=dist*cp-ry*sp;
  return {x:p.x-rx*ca-rz*sa,y:p.y-ry*cp-dist*sp,z:p.z-rz*ca+rx*sa,yaw:camera.yaw,pitch:camera.pitch};
}
function moveTo(to, duration = 1500, onDone) {
  hideTimeCue();
  travel = { from: { ...camera }, to:{...camera,...to}, start: performance.now(), duration: reducedMotion ? 220 : duration, onDone:()=>{onDone?.();showTimeCue();} };
  phase = 'moving'; updateUI();
  if(selected)starMotion.beginApproach(travel.start,selected);else starMotion.clearSelection();
}
function selectStar(id, save = true) {
  if (selected === id && phase === 'moving') return;
  if (save) pushStop();
  starMotion.interrupt(); selected = id; updateUI();
  moveTo(destination(articles.find(a => a.id === id)), 1500, () => {
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
  hideTimeCue();
  // The scroll can still be developing after the camera has already settled.
  if (travel || selected) { travel = null; starMotion.interrupt(); phase = selected ? 'selected' : 'idle'; updateUI(); }
}
function home() {
  if (reader.open) {closeReader(home);return;}
  if(painted){roomScene?.returnHome();return;}
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
  else moveTo({ x: 0, y: 0, z: 0, yaw: painted?camera.yaw+wrapAngle(-camera.yaw):0, pitch: painted?HOME_ELEVATION:0, zoom:1 }, 850, () => { phase = 'idle'; updateUI(); });
  updateUI();
}
function related(id) { return relations.filter(r => r[0] === id || r[1] === id).map(r => ({ article: articles.find(a => a.id === (r[0] === id ? r[1] : r[0])), reason: r[2] })); }
function announce(message) { $('announcement').textContent = message; }
function hideTimeCue(){timeCueUntil=0;$('time-cue').hidden=true;}
function positionTimeCue(){
  const cue=$('time-cue');cue.style.removeProperty('top');cue.style.removeProperty('left');
  if(cue.hidden||width>760||height<=width)return;
  const bottom=selected&&!$('preview').hidden?$('preview').getBoundingClientRect().top-8:height*.45;
  cue.style.left='16px';cue.style.top=`${bottom-cue.getBoundingClientRect().height}px`;
}
function showTimeCue(){
  if(mode!=='time'||reader.open||roomScene?.active)return;
  const article=articles.find(a=>a.id===selected)||visible.slice().sort((a,b)=>Math.hypot(a.x-width/2,a.y-height/2)-Math.hypot(b.x-width/2,b.y-height/2))[0]?.article;
  if(!article)return;
  const [year,month]=article.date.split('.');
  $('time-cue').textContent=`${year} 年 ${Number(month)} 月`;$('time-cue').hidden=false;timeCueUntil=performance.now()+3000;
  positionTimeCue();
}
function measureUI(){
  uiRects=[...document.querySelectorAll('.navigation,.masthead,#sky-map-controls,#sky-map,#preview,.signal-egg')].filter(e=>!e.hidden).map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
  const label=document.querySelector('.star-label');if(label)labelFontSize=parseFloat(getComputedStyle(label).fontSize);
}
function scheduleUIMeasure(){
  cancelAnimationFrame(uiMeasureFrame);
  // Map controls become visible in the scene RAF after a reader/room transition.
  uiMeasureFrame=requestAnimationFrame(measureUI);
}
function setText(id, text) { if($(id).textContent!==text)$(id).textContent=text; }
function updateUI() {
  const article = articles.find(a => a.id === selected);
  world.setAttribute('aria-busy',String(phase==='moving'||!!arrival));
  document.body.classList.toggle('exploring', !!selected || camera.z > 100 || Math.abs(camera.yaw) > .15);
  $('back').disabled = history.length === 0;
  $('relation-mode').setAttribute('aria-pressed', mode === 'relation'); $('time-mode').setAttribute('aria-pressed', mode === 'time');
  $('preview').hidden = !article;
  if(!article)starMotion.clearSelection();
  $('path-legend').textContent=mode==='time'?(navigationOn?'虚线：时间顺序':''):selected?(navigationOn?'实线：内容关联 · 虚线：探索路径':'实线：内容关联'):(navigationOn?'虚线：探索路径':'');
  if (article) {
    if($('preview').dataset.article!==article.id){$('preview-scroll').scrollTop=0;$('preview').dataset.article=article.id;}
    // Pointer-up and mode changes also refresh status. Preserve the live ink covers.
    setText('preview-number',`NO. ${String(articles.indexOf(article) + 1).padStart(2, '0')}`);
    setText('preview-date',article.date);setText('preview-title',article.title);
    setText('preview-tag',article.tag);setText('preview-intro',article.intro);
    $('preview-intro').hidden=!article.intro;
    $('approach-status').textContent = phase === 'moving' ? '正在靠近 · · ·' : phase === 'settled' ? '再点星，阅读' : '点星，重新靠近';
    $('read-button').disabled = phase !== 'settled';
    $('known-reasons').replaceChildren();
    if (readIds.has(selected)) related(selected).forEach(r => { const div = document.createElement('div'); div.textContent = `↗ ${r.reason}`; $('known-reasons').append(div); });
  }
  $('journey-label').textContent = article ? `${mode === 'relation' ? '关联' : '时间'} · ${article.title}` : painted?'窗外 · 自由巡视':camera.z > 100 ? '星空 · 自由巡视' : '屋顶 · 夜的起点';
  measureUI();scheduleUIMeasure();updateInspector();
}
function updateInspector() {
  $('state-output').textContent = `方案    ${variant} · ${names[variant]}\n模式    ${mode === 'relation' ? '关联' : '时间'}\n阶段    ${phase}\n选中    ${selected || '—'}\n镜头    ${[camera.x,camera.y,camera.z].map(Math.round).join(', ')}\n方向    ${camera.yaw.toFixed(2)}, ${camera.pitch.toFixed(2)}\n动画    ${reducedMotion ? '减少动态' : '完整推进'}\n星光    ${living?'微动':'静态'} · ${ambient.seconds.toFixed(1)}s\n微视差  ${ambient.x.toFixed(2)}, ${ambient.y.toFixed(2)} × 3px\n视野    ${visible.length} 颗文章星\n已读    ${[...readIds].join(', ') || '—'}\n停靠点  ${history.length}\n路径    ${navigationEdges.length} 条 / 画面 ${drawnPaths} 条\n数据    ${articles.length} 篇虚构文章 / 仅内存`;
}
function openReader() {
  if (!selected || phase !== 'settled') return;
  readingSnapshot = snapshot();readerTrigger=document.activeElement;hideTimeCue();
  const article = articles.find(a => a.id === selected);
  $('reader-title').textContent = article.title; $('reader-date').textContent = article.date;
  $('reader-tag').textContent = article.tag; $('reader-intro').textContent = article.intro;
  $('reader-intro').hidden=!article.intro;
  $('reader-content').replaceChildren(...article.paragraphs.map(text => {
    const p=document.createElement('p');
    if(reviewMedia&&text.startsWith('https://example.com/')){const a=document.createElement('a');a.href=text;a.textContent=text;p.append(a);}else p.textContent=text;
    return p;
  }));
  if(reviewMedia){const img=document.createElement('img');img.src='./assets/painted-sky-v11.png';img.width=2172;img.height=724;img.alt='用于检查正文排版的厚涂星空样本';$('reader-content').prepend(img);}
  $('reader-links').replaceChildren(); $('reading-relations').hidden = true;
  $('reading-state').textContent=readIds.has(selected)?'已到文末':'沿着文字，慢慢往下';
  $('reading-progress').textContent=readIds.has(selected)?'100%':'0%';
  reader.showModal(); phase = 'opening'; scroller.scrollTop = 0;
  const point=project(position(article));
  starMotion.open(point,()=>{phase='reading';updateInspector();checkRead();});
  $('close-reader').focus(); updateInspector();
}
function finishArrival() {
  if(!arrival||roomScene?.active)return;
  const end=entranceFrame(ENTRANCE.duration,width<=760?.78:1);
  camera={x:end.x,y:end.y,z:end.z,yaw:end.yaw,pitch:end.pitch,zoom:end.zoom};
  arrival=null;skyClarity=1;phase='idle';
  delete document.body.dataset.arrival;
  world.style.removeProperty('--entry-bank');world.style.removeProperty('--entry-scale');
  world.style.setProperty('--sky-clarity','1');world.inert=false;
  updateUI();$('home').focus({preventScroll:true});
}
function updateArrival(now) {
  if(!arrival)return;
  const frame=entranceFrame(now-arrival.start,width<=760?.78:1);
  camera={x:frame.x,y:frame.y,z:frame.z,yaw:frame.yaw,pitch:frame.pitch,zoom:frame.zoom};
  skyClarity=frame.clarity;
  document.body.dataset.arrival=frame.stage;
  world.style.setProperty('--sky-clarity',skyClarity.toFixed(3));
  world.style.setProperty('--entry-bank',`${frame.bank}rad`);
  world.style.setProperty('--entry-scale',String(1+Math.abs(frame.bank)*Math.max(width/height,height/width)*1.1));
  if(frame.done)finishArrival();
}
function closeReader(afterClose) {
  if(!reader.open||phase==='closing')return;
  phase='closing';updateInspector();
  starMotion.close(()=>{
    reader.close();
    if (readingSnapshot) { camera = { ...readingSnapshot.camera }; selected = readingSnapshot.selected; phase = readingSnapshot.phase; }
    readingSnapshot = null; updateUI();
    const trigger=readerTrigger?.isConnected&&!readerTrigger.hidden?readerTrigger:targetElements.get(selected);
    trigger?.focus({preventScroll:true});readerTrigger=null;
    if(typeof afterClose==='function')afterClose();
  },selected?project(position(articles.find(a=>a.id===selected))):null);
}
function checkRead() {
  if (!reader.open || phase!=='reading') return;
  const endRect = $('reader-content').getBoundingClientRect(), scrollRect = scroller.getBoundingClientRect();
  const reached = endRect.bottom <= scrollRect.bottom + 2;
  if (reached && !readIds.has(selected)) { readIds.add(selected); revealReadingLinks(); announce(related(selected).length?'已到达正文末尾，关联理由已显露。':'已到达正文末尾。'); }
  else if (readIds.has(selected) && $('reading-relations').hidden) revealReadingLinks();
  const contentEnd = $('reader-content').offsetTop + $('reader-content').offsetHeight;
  const progress = Math.min(100, Math.round((scroller.scrollTop + scroller.clientHeight) / contentEnd * 100));
  $('reading-progress').textContent = `${readIds.has(selected) ? 100 : progress}%`;
  $('reading-state').textContent = readIds.has(selected) ? '已到文末' : '沿着文字，慢慢往下';
  updateInspector();
}
function revealReadingLinks() {
  $('reading-relations').hidden = related(selected).length===0; $('reader-links').replaceChildren();
  related(selected).forEach(({ article, reason }) => {
    const button = document.createElement('button'); const title = document.createElement('strong'); const text = document.createElement('span');
    title.textContent = article.title; text.textContent = reason; button.append(title, text);
    button.onclick = () => closeReader(()=>selectStar(article.id));
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
function interactiveSurface(target) { return !arrival && !roomScene?.active && (target === canvas || target.closest('.star-target')); }
world.addEventListener('pointerdown', e => {
  if (!interactiveSurface(e.target) || reader.open) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); world.setPointerCapture(e.pointerId);
  if (pointers.size === 1) { press = { x: e.clientX, y: e.clientY, start: performance.now() }; gestureMoved = false; multiTouch = false; }
  else { multiTouch = true; gestureMoved = true; const pts = [...pointers.values()]; previousPinch = Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y); }
});
world.addEventListener('pointermove', e => {
  if(interactiveClouds)canvas.classList.toggle('over-cloud',interactiveClouds.hover(e.clientX,e.clientY,!pointers.size&&!hovered&&!ambientBlocked()&&interactiveSurface(e.target)));
  if (!pointers.has(e.pointerId)) return;
  const old = pointers.get(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (press && Math.hypot(e.clientX-press.x,e.clientY-press.y)>6) gestureMoved = true;
  if (!gestureMoved) return;
  interrupt();
  if (pointers.size >= 2) {
    const pts = [...pointers.values()], distance = Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    moveForward((distance-previousPinch)*4); previousPinch=distance;
  } else if (!multiTouch) {
    // Wide views should turn more gently, instead of amplifying a disorienting swipe.
    const sensitivity=painted?Math.sqrt(Math.min(camera.zoom,1/camera.zoom)):1;
    camera.yaw -= (e.clientX-old.x)*.003*sensitivity;
    camera.pitch = clamp(camera.pitch+(e.clientY-old.y)*.0025*sensitivity,painted?0:-1.05,painted?Math.PI/2:1.05);
    if (selected) phase = 'selected';
  }
});
world.addEventListener('pointerup', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (!gestureMoved && !multiTouch) {
    const hit = visible.filter(s=>Math.hypot(s.x-e.clientX,s.y-e.clientY)<25).sort((a,b)=>Math.hypot(a.x-e.clientX,a.y-e.clientY)-Math.hypot(b.x-e.clientX,b.y-e.clientY))[0];
    if (hit) activateStar(hit.article.id);
    else if(!(press&&performance.now()-press.start<500&&interactiveClouds?.tap(e.clientX,e.clientY))){ interrupt(); selected = null; phase = 'idle'; updateUI(); }
  }
  if (!pointers.size) { press=null; updateUI(); }
});
world.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); gestureMoved=true; press=null; });
world.addEventListener('wheel', e => {
  if (!interactiveSurface(e.target)) return;
  e.preventDefault(); interrupt(); moveForward(-Math.max(-140,Math.min(140,e.deltaY)) * 1.35); updateUI();
}, { passive: false });
function moveForward(amount) {
  if(painted){
    camera.zoom=clamp(camera.zoom*Math.exp(amount*.0011),MIN_SKY_ZOOM,2.8);
    const distance=clamp((camera.zoom-1)*1100,0,1200);
    Object.assign(camera,direction(camera.yaw,camera.pitch,distance));
    if(selected)phase='selected';return;
  }
  const oldZ = camera.z;
  const farBoundary=Math.max(...articles.map(a=>position(a).z))+2000;
  camera.z = Math.max(-100,Math.min(farBoundary,camera.z + Math.cos(camera.yaw)*Math.cos(camera.pitch)*amount));
  if (camera.z !== oldZ) { camera.x += Math.sin(camera.yaw)*Math.cos(camera.pitch)*amount; camera.y += Math.sin(camera.pitch)*amount; }
  if (selected) phase='selected';
}
function drawBackground() {
  (painted?paintPaintedSky:paintSky)(ctx,width,height,camera,projectionSettings(),{x:ambient.x,y:ambient.y,seconds:living?ambient.seconds:null,clarity:skyClarity});
  if(painted)return;
  // Nearby dust uses finite world positions, unlike the far celestial sphere.
  for (const star of dust) {
    const p=project(star);
    if(!p || p.x<0 || p.x>width || p.y<0 || p.y>height) continue;
    p.x+=ambient.x*2;p.y+=ambient.y*2;
    const r=Math.min(.65,star.size*Math.sqrt(p.scale));
    ctx.globalAlpha=star.alpha*(painted ? .32 : .6);
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
function drawPaths(allPoints){
  drawnPaths=0;const hints=[];$('edge-guide').hidden=true;
  if(roomScene?.active||arrival||phase==='entering'||!navigationOn||lineMotion.opacity<.01)return;
  const box={left:32,right:width-32,top:150,bottom:height-130};
  const lookup=new Map(allPoints.map(p=>[p.article.id,p]));
  const edges=mode==='time'?articles.slice(1).flatMap((a,i)=>a.isolated||articles[i].isolated?[]:[[articles[i].id,a.id]]):navigationEdges;
  const painted=[];
  for(const [from,to] of edges){
    const a=lookup.get(from),b=lookup.get(to);if(!a||!b||a.depth>8500||b.depth>8500)continue;
    const line=clipSegment(a,b,box);if(!line)continue;
    const length=Math.hypot(line.b.x-line.a.x,line.b.y-line.a.y);
    if(length<12||length>Math.min(850,width*.72))continue;
    if(painted.some(p=>crosses(line.a,line.b,p.a,p.b)))continue;
    const far=Math.max(.25,1-Math.max(a.depth,b.depth)/11000);
    const alpha=(selected? .065:.36)*far;
    ctx.save();ctx.setLineDash([2.5,7]);ctx.lineWidth=.9;
    const gradient=ctx.createLinearGradient(line.a.x,line.a.y,line.b.x,line.b.y);
    gradient.addColorStop(0,`rgba(200,216,230,${line.lo>0?0:alpha})`);
    gradient.addColorStop(.5,`rgba(200,216,230,${alpha})`);
    gradient.addColorStop(1,`rgba(200,216,230,${line.hi<1?0:alpha})`);
    ctx.strokeStyle=gradient;ctx.beginPath();ctx.moveTo(line.a.x,line.a.y);ctx.lineTo(line.b.x,line.b.y);ctx.stroke();ctx.restore();
    painted.push(line);drawnPaths++;
    if(line.hi<1&&line.lo===0)hints.push({p:line.b,target:b.article,score:length});
    if(line.lo>0&&line.hi===1)hints.push({p:line.a,target:a.article,score:length});
  }
  // A nearby isolated star can have a direction hint without inventing a path.
  const degree=degrees(articles,navigationEdges);
  for(const p of allPoints){
    if((mode==='relation'?degree.get(p.article.id)>0:!p.article.isolated)||p.depth>6500)continue;
    const dx=p.x-width/2,dy=p.y-height/2;
    if(p.x>box.left&&p.x<box.right&&p.y>box.top&&p.y<box.bottom)continue;
    if(Math.abs(dx)>width*.9||Math.abs(dy)>height*.9)continue;
    const line=clipSegment({x:width/2,y:height/2},p,box);
    if(line)hints.push({p:line.b,target:p.article,score:Math.hypot(dx,dy),isolated:true});
  }
  const hint=hints.sort((a,b)=>a.score-b.score)[0];
  if(hint&&phase!=='moving'&&lineMotion.opacity>.5){
    const candidates=[hint.p,...[102,height*.34,height*.5,height*.66,height-100].flatMap(y=>[{x:44,y},{x:width-44,y}])];
    const point=candidates.find(p=>p.x>=24&&p.x<=width-24&&p.y>=24&&p.y<=height-24&&!uiRects.some(r=>p.x+24>r.left&&p.x-24<r.right&&p.y+24>r.top&&p.y-24<r.bottom)&&!allPoints.some(s=>Math.abs(s.x-p.x)<46&&Math.abs(s.y-p.y)<46));
    if(!point)return;
    const button=$('edge-guide');button.hidden=false;button.style.left=point.x+'px';button.style.top=point.y+'px';
    button.style.opacity=String(lineMotion.opacity*.95);if(!button.firstElementChild)button.innerHTML=arrows.right;button.style.transform='translate(-50%,-50%)';
    const target=project(position(hint.target));button.firstElementChild.style.rotate=`${Math.atan2(target.y-point.y,target.x-point.x)}rad`;
    button.title=hint.isolated?'附近有一颗独立的文章星':'沿路径还有文章星';
    button.setAttribute('aria-label',hint.isolated?'靠近附近的独立文章星':'沿路径寻找下一颗文章星');button.onclick=()=>selectStar(hint.target.id);
  }
}
function drawConnections(points) {
  const lookup=new Map(points.map(p=>[p.article.id,p]));
  if(!selected||mode!=='relation')return;
  const origin=lookup.get(selected);if(!origin)return;
  related(selected).forEach(({article})=>{
    const end=lookup.get(article.id);if(!end)return;
    const grad=ctx.createLinearGradient(origin.x,origin.y,end.x,end.y);grad.addColorStop(0,'#d9e8f49a');grad.addColorStop(1,'#d9e8f435');
    ctx.strokeStyle=grad;ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  });
}
function drawStars() {
  const linked = new Set(selected && mode === 'relation' ? related(selected).map(r=>r.article.id) : []);
  const candidates=articles.map(article=>{const p=project(position(article));return p?{article,...p,x:p.x+(painted?0:ambient.x*3),y:p.y+(painted?0:ambient.y*3)}:{article};})
    .filter(p=>Number.isFinite(p.x) && (painted || p.depth<6500 || p.article.id===selected || linked.has(p.article.id)))
    .sort((a,b)=>a.depth-b.depth);
  // Density comes from spatial layout, not an arbitrary cap hiding nearby stars.
  ctx.save();ctx.globalAlpha*=lineMotion.opacity;
  drawPaths(candidates);
  const points=candidates.filter(p=>p.x>20&&p.x<width-25&&p.y>95&&p.y<height-100);
  drawConnections(points);
  ctx.restore();
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
    ctx.save();
    ctx.globalAlpha=.38+.62*skyClarity;
    if(skyClarity<1)ctx.filter=`blur(${((1-skyClarity)*1.25).toFixed(2)}px)`;
    paintArticleLight(ctx,x,y,article.id,{depth:painted?depth/3:depth,active:false,hover:hovered===article.id&&!active,seconds:living?ambient.seconds:null,importance:article.importance,zoom:.62+.38*skyClarity});
    ctx.restore();
  });
  // Hide points that are behind the camera too.
  for(const article of articles)if(!points.some(p=>p.article.id===article.id))targetElements.get(article.id).hidden=true;
  placeLabels(points);
}
function placeLabels(points){
  const occupied=uiRects.map(r=>({x:r.left,y:r.top,w:r.width,h:r.height})),fontSize=labelFontSize,labelHeight=fontSize*1.5;
  for(const p of [...points].sort((a,b)=>(b.article.id===selected)-(a.article.id===selected)||a.depth-b.depth)){
    const label=targetElements.get(p.article.id).querySelector('.star-label');
    const w=Math.min(width<=760?150:250,p.article.title.length*(fontSize+1)+6);
    const options=[
      {x:p.x+15,y:p.y-6}, {x:p.x-w-15,y:p.y-6},
      {x:Math.max(12,Math.min(width-w-12,p.x-w/2)),y:p.y+27},
      {x:Math.max(12,Math.min(width-w-12,p.x-w/2)),y:p.y-labelHeight-27}
    ];
    const fits=r=>r.x>=10&&r.x+w<width-10&&r.y>80&&r.y+labelHeight<height-100;
    const free=r=>!occupied.some(q=>r.x<q.x+q.w+6&&r.x+w+6>q.x&&r.y<q.y+q.h+5&&r.y+labelHeight+5>q.y);
    const box=options.find(r=>fits(r)&&free(r));
    label.classList.toggle('label-crowded',!box);if(!box)continue;
    label.style.maxWidth=w+'px';
    label.style.left=(box.x-p.x+22)+'px';label.style.right='auto';label.style.top=(box.y-p.y+22)+'px';label.style.textAlign='left';
    occupied.push({...box,w,h:labelHeight});
  }
}
function animate(now) {
  time=now;
  if(timeCueUntil&&now>=timeCueUntil)hideTimeCue();
  updateArrival(now);
  const elapsed=Math.max(0,(now-(lastFrame||now))/1000),dt=Math.min(.05,elapsed);lastFrame=now;
  if(!ambientBlocked()){
    if(living)ambient.seconds+=dt;
    // Freeze target offsets during a gesture or hover so the hit region stays put.
    if(!living||(!pointers.size&&!hovered&&!travel)){
      const blend=1-Math.exp(-dt*5);
      ambient.x+=((living?ambient.targetX:0)-ambient.x)*blend;
      ambient.y+=((living?ambient.targetY:0)-ambient.y)*blend;
    }
  }
  if(travel){
    const flight=travel,t=Math.min(1,(now-flight.start)/Math.max(1,flight.duration));
    // Turn toward the chosen star first; translation and the lens catch up gently.
    // All channels have zero velocity at both ends, including a rapid retarget.
    const frame=approachFrame(t);
    for(const key of Object.keys(camera)){
      const ease=reducedMotion?smooth(t):key==='yaw'||key==='pitch'?frame.aim:key==='zoom'?frame.lens:frame.distance;
      camera[key]=flight.from[key]+(flight.to[key]-flight.from[key])*ease;
    }
    if(selected)starMotion.setApproach(t);
    if(t===1){travel=null;flight.onDone?.();}
  }
  updateLineMotion(now,dt);
  interactiveClouds?.update(elapsed,!!roomScene?.active||ambientBlocked());
  drawBackground();
  const roofVisibility=painted?0:paintRoof(ctx,width,height,camera);
  $('journal-egg').hidden=roofVisibility<.35;
  const foregroundWidth=width<=760?height*.72:Math.min(width,height*.9);
  $('journal-egg').style.left=roofSelect.value==='photo'?'':`${foregroundWidth*.22+Math.min(0,(width-foregroundWidth)*.12)}px`;
  $('journal-egg').style.bottom=roofSelect.value==='photo'?'':`${foregroundWidth*.05}px`;
  drawStars();
  if(painted){
    paintCloudVeil(ctx,width,height,camera,projectionSettings());
    interactiveClouds?.paint(ctx,width,height,camera,projectionSettings());
    skyMap?.update(camera,projectionSettings(),articles.map(article=>({id:article.id,point:position(article)})),selected,!arrival&&!roomScene?.active&&!ambientBlocked(),width,height,now);
  }
  if(selected)starMotion.paintFocus(ctx,project(position(articles.find(a=>a.id===selected))));
  starMotion.tick(now);
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
function deselect(){const trigger=targetElements.get(selected);interrupt();selected=null;phase='idle';updateUI();(trigger&&!trigger.hidden?trigger:$('home')).focus({preventScroll:true});}
$('deselect').onclick=deselect;
reader.addEventListener('cancel',e=>{e.preventDefault();closeReader();});
scroller.addEventListener('scroll',checkRead,{passive:true});
$('prev-variant').onclick=()=>cycleVariant(-1);$('next-variant').onclick=()=>cycleVariant(1);
const motionButton = document.createElement('button');
motionButton.id='motion-toggle'; motionButton.className='motion-toggle';
function updateMotionButton(){motionButton.textContent=reducedMotion?'轻过渡':'镜头推进';motionButton.setAttribute('aria-label',reducedMotion?'开启镜头推进动画':'减少镜头动画');}
motionButton.onclick=()=>{reducedMotion=!reducedMotion;roomScene?.setSoft(reducedMotion);updateMotionButton();updateInspector();};
document.querySelector('.mock-badge').replaceWith(motionButton);updateMotionButton();
document.addEventListener('keydown',e=>{
  if(arrival){if(e.key==='Escape'){e.preventDefault();finishArrival();}return;}
  if(roomScene?.active)return;
  if(e.key==='Escape'&&skyMap?.dismiss()){e.preventDefault();return;}
  if(reader.open||$('specimen-dialog').open||$('egg-dialog').open||e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(e.key==='Escape'&&selected){e.preventDefault();deselect();return;}
  if(e.target.closest('#preview-scroll,.art-study-bar'))return;
  if(painted&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();interrupt();
    if(e.key==='ArrowLeft')camera.yaw-=.12;if(e.key==='ArrowRight')camera.yaw+=.12;
    if(e.key==='ArrowUp')camera.pitch=clamp(camera.pitch+.1,0,Math.PI/2);
    if(e.key==='ArrowDown')camera.pitch=clamp(camera.pitch-.1,0,Math.PI/2);
    if(selected)phase='selected';updateUI();return;
  }
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

// Round-one art comparisons preserve camera, star positions and reading state.
const artChoice=$('art-choice');
for(const [key,value] of Object.entries(studies)){
  const option=document.createElement('option');option.value=key;option.textContent=value.name;artChoice.append(option);
}
artChoice.value=studies[query.get('art')]?query.get('art'):'ink';
function changeArt(){
  setStudy(artChoice.value);document.body.dataset.art=artChoice.value;
  const url=new URL(location.href);url.searchParams.set('art',artChoice.value);window.history.replaceState(null,'',url);
  $('study-caption').textContent=artChoice.value==='ink'?'中性冷黑 / 灰蓝屋顶 / 克制暖光':'灰褐暗部 / 炭灰屋顶 / 旧纸暖光';
  if($('specimen-dialog').open)paintSpecimens($('specimen-canvas'));
  announce(studies[artChoice.value].name);
}
artChoice.onchange=changeArt;changeArt();
$('show-specimens').onclick=()=>{$('specimen-dialog').showModal();paintSpecimens($('specimen-canvas'));};
$('close-specimens').onclick=()=>$('specimen-dialog').close();
$('show-tools').onclick=()=>{const open=document.body.classList.toggle('show-prototype-tools');$('show-tools').setAttribute('aria-expanded',open);};

window.addEventListener('resize',()=>{if($('specimen-dialog').open)paintSpecimens($('specimen-canvas'));});

function updateLiving(){
  $('living-toggle').textContent=living?'微动 · 开':'微动 · 关';
  $('living-toggle').setAttribute('aria-pressed',String(living));
  const url=new URL(location.href);url.searchParams.set('living',living?'1':'0');window.history.replaceState(null,'',url);
  updateInspector();
}
$('living-toggle').onclick=()=>{living=!living;updateLiving();};
ambientPreference.addEventListener('change',e=>{living=!e.matches;updateLiving();});
updateLiving();

// Compare an uninterrupted sky against the earlier near-title treatment.
let allLabels=query.get('labels')==='all';
function updateLabels(){
  document.body.dataset.labels=allLabels?'all':'reveal';
  $('labels-toggle').textContent=allLabels?'标题 · 常显':'标题 · 按需';
  $('labels-toggle').setAttribute('aria-pressed',String(allLabels));
  const url=new URL(location.href);url.searchParams.set('labels',allLabels?'all':'reveal');window.history.replaceState(null,'',url);
}
$('labels-toggle').onclick=()=>{allLabels=!allLabels;updateLabels();};updateLabels();

const typeChoice=$('type-choice');
typeChoice.value=['white','mist','cool'].includes(query.get('type'))?query.get('type'):'white';
function updateType(){
  document.body.dataset.type=typeChoice.value;
  const url=new URL(location.href);url.searchParams.set('type',typeChoice.value);window.history.replaceState(null,'',url);
}
typeChoice.onchange=updateType;updateType();

function updatePaths(){
  $('paths-toggle').textContent=navigationOn?'路径 · 开':'路径 · 关';$('paths-toggle').setAttribute('aria-pressed',String(navigationOn));
  const url=new URL(location.href);url.searchParams.set('paths',navigationOn?'1':'0');window.history.replaceState(null,'',url);updateUI();
}
$('paths-toggle').onclick=()=>{navigationOn=!navigationOn;updatePaths();};updatePaths();
$('grow-star').onclick=()=>{
  const n=articles.length-15,id='new-note-'+n;
  const result=(painted?growDomeArticle:growArticle)(articles,navigationEdges,{id,importance:$('star-rank').value,isolated:$('star-isolated').checked});
  if(!result){$('growth-status').textContent='附近较拥挤，这次未添加；已有位置保持不变。';return;}
  const article={...result.article,title:'新写下的片段 '+n,date:'2026.12.09',tag:'新留下的星光',intro:'这是试加的一篇文章。沿着天空，慢慢发现它。',paragraphs:['这篇虚构文章用来检查天空生长后的密度。','它没有自动生成任何内容关联，导航线只帮助找到附近的文章。']};
  articles.push(article);navigationEdges.push(...result.edges);mountArticle(article,articles.length-1);latestAdded=article.id;
  $('find-new-star').disabled=false;$('growth-status').textContent=`已添加第 ${articles.length} 篇 · ${result.edges.length} 条导航线 · 旧星位置未改变`;
  updateUI();
};
$('find-new-star').onclick=()=>{if(latestAdded)selectStar(latestAdded);};
$('export-sky').onclick=()=>{
  const blob=new Blob([JSON.stringify({version:1,articles:articles.map(({id,position,importance,isolated})=>({id,position,importance,isolated})),navigationEdges},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='starfield-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

// Keep the complete interaction experiment, changing only its visual world/entry.
const compare=document.createElement('a');compare.id='scene-compare';
compare.textContent=painted?'对照 · 原来的夜空 ↗':'试试 · 厚涂窗边 ↗';
const comparisonURL=new URL(location.href);comparisonURL.searchParams.set('scene',painted?'classic':'painted');
compare.href=comparisonURL.href;document.querySelector('.art-study-controls').prepend(compare);
if(painted){
  const lookAtSky=(yaw,pitch,zoom)=>{
    interrupt();pushStop();selected=null;
    moveTo({x:0,y:0,z:0,yaw:camera.yaw+wrapAngle(yaw-camera.yaw),pitch,zoom},700,()=>{phase='idle';updateUI();});
  };
  skyMap=createSkyMap(world,{
    onLook:(yaw,pitch)=>lookAtSky(yaw,pitch,Math.min(1,camera.zoom)),
    onOverview:()=>lookAtSky(camera.yaw,Math.PI/2,MIN_SKY_ZOOM),
    onReset:()=>lookAtSky(0,HOME_ELEVATION,1)
  });
  $('home').title='回到窗边';$('home').setAttribute('aria-label','回到窗边');
  $('brand').setAttribute('aria-label','观星者的清醒梦，回到窗边');
  document.querySelector('.art-study-bar summary').innerHTML='穿窗入星 <span>20</span>';
  $('study-caption').textContent='顺势转向 · 星光渐清 · 缓缓归窗';
  roomScene=createRoom({
    onEnter(start){
      const frame=entranceFrame(0,width<=760?.78:1);
      camera={x:frame.x,y:frame.y,z:frame.z,yaw:frame.yaw,pitch:frame.pitch,zoom:frame.zoom};
      skyClarity=reducedMotion?1:0;
      document.body.dataset.arrival='passage';
      world.style.setProperty('--sky-clarity',String(skyClarity));
      // The window already exposes this camera; never swap sky canvases or reset its clock.
      if(!reducedMotion){arrival={start};updateArrival(start);}
      phase='entering';updateUI();
    },
    onProgress(progress){
      if(reducedMotion){
        const start=entranceFrame(0,width<=760?.78:1),t=smooth(progress);
        camera={x:start.x*(1-t),y:start.y*(1-t),z:start.z*(1-t),yaw:0,pitch:start.pitch,zoom:start.zoom+(.72-start.zoom)*t};
      }
    },
    onEntered(){
      if(reducedMotion){
        delete document.body.dataset.arrival;phase='idle';updateUI();$('home').focus({preventScroll:true});return;
      }
      phase='arriving';world.inert=true;
      updateArrival(performance.now());updateUI();
    },
    onReturnStart(){
      hideTimeCue();
      retreat={camera:{...camera},clarity:skyClarity};
      travel=null;arrival=null;selected=null;phase='returning';history=[];starMotion.clearSelection();
      document.body.dataset.arrival='returning';updateUI();
    },
    onReturnProgress(progress){
      const frame=returnFrame(progress,retreat.camera,width<=760?.78:1);
      camera={x:frame.x,y:frame.y,z:frame.z,yaw:frame.yaw,pitch:frame.pitch,zoom:frame.zoom};
      skyClarity=retreat.clarity*(1-smooth(progress))+(reducedMotion?1:0)*smooth(progress);
      world.style.setProperty('--sky-clarity',skyClarity.toFixed(3));
      world.style.setProperty('--entry-bank',`${reducedMotion?0:frame.bank}rad`);
      world.style.setProperty('--entry-scale',String(reducedMotion?1:1+Math.abs(frame.bank)*Math.max(width/height,height/width)*1.1));
    },
    onReturned(){
      retreat=null;
      travel=null;arrival=null;skyClarity=reducedMotion?1:0;selected=null;phase='idle';history=[];starMotion.clearSelection();
      delete document.body.dataset.arrival;world.style.removeProperty('--sky-clarity');
      world.style.removeProperty('--entry-bank');world.style.removeProperty('--entry-scale');
      const frame=entranceFrame(0,width<=760?.78:1);
      camera={x:frame.x,y:frame.y,z:frame.z,yaw:frame.yaw,pitch:frame.pitch,zoom:frame.zoom};updateUI();
    },
    onJournal(){
      $('egg-title').textContent='灯还亮着。';
      $('egg-copy').textContent='这一页还没有写完。\n\n窗外的星星里，放着一些日常、念头和未眠时写下的文字。';
      document.querySelector('#egg-dialog .eyebrow').textContent='桌上的手记';
      $('egg-dialog').showModal();
    },
    onMotion(value){reducedMotion=value;if(document.body.dataset.room==='inside')skyClarity=value?1:0;updateMotionButton();}
  });
}

if(query.get('review')==='1'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)){
  import('./review-tools.js').then(({installReviewTools})=>installReviewTools({
    articles,relations,select:selectStar,renderMedia:value=>reviewMedia=value,
    audit:{activate:activateStar,interrupt,selected:()=>selected,full(){reducedMotion=false;roomScene?.setSoft(false);}},
    refresh(){for(const article of articles)targetElements.get(article.id).querySelector('.star-label').textContent=article.title;updateUI();},
    look(yaw,pitch,zoom){interrupt();selected=null;moveTo({x:0,y:0,z:0,yaw:camera.yaw+wrapAngle(yaw-camera.yaw),pitch,zoom},700,()=>{phase='idle';updateUI();});}
  }));
}
if(query.get('monitor')==='1'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname))import('./frame-monitor.js');
