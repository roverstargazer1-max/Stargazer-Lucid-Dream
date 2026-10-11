import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createDomeProjector } from '../../../../themes/stargazer-starfield/source/js/starfield/dome.js';
const baselineRoot=process.env.BASELINE_DIR||'/tmp/stargazer-audit-baseline-20261011';
const original=await fs.readFile(`${baselineRoot}/js/starfield/dome.js`,'utf8');
const {projectDome}=await import(`data:text/javascript;base64,${Buffer.from(original).toString('base64')}`);
let seed=812;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const stars=Array.from({length:600},()=>{const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);return{x:Math.sin(a)*r,y,z:Math.cos(a)*r,r:.4+random()*.55,alpha:.2+random()*.4};});
const galaxyStars=Array.from({length:2400},()=>{const y=random(),a=random()*Math.PI*2,r=Math.sqrt(1-y*y),x=Math.sin(a)*r,z=Math.cos(a)*r;const band=Math.max(0,1-Math.abs(x*.84-y*.20+z*.50)/.23);return{x,y,z,r:.55+random()*.55,alpha:(.20+random()*.26)*band};}).filter(star=>star.y>.58&&star.alpha>.07);
const points=stars.concat(galaxyStars).filter(s=>s.y>=0).map(s=>({x:s.x*6000,y:s.y*6000,z:s.z*6000}));
const cameras=Array.from({length:1800},(_,i)=>({x:-180+i*.17,y:-50,z:-420,yaw:i*.02,pitch:.43+Math.sin(i)*.8,zoom:.72}));
const settings={cx:840,cy:485,focal:1400};
let mismatches=0;
for(const camera of cameras){const project=createDomeProjector(camera,settings);for(const point of points){const before=projectDome(point,camera,settings),after=project(point);if(JSON.stringify(before)!==JSON.stringify(after))mismatches++;}}
let checksum=0;
function run(prepared){const start=performance.now();for(const camera of cameras){const project=prepared?createDomeProjector(camera,settings):point=>projectDome(point,camera,settings);for(const point of points){const p=project(point);if(p)checksum+=p.x+p.y;}}return performance.now()-start;}
for(let i=0;i<5;i++){run(false);run(true);}
const rounds=Array.from({length:9},()=>({before:run(false),after:run(true)}));
const median=key=>rounds.map(r=>r[key]).sort((a,b)=>a-b)[4];
const result={skyStars:stars.length+galaxyStars.length,projectedBackgroundPoints:points.length,verifiedPoints:points.length*cameras.length,mismatches,frames:cameras.length,rounds,medianBefore:median('before'),medianAfter:median('after'),checksum};
await fs.writeFile('.scratch/starry-blog/evidence/engineering-20261011/projection-cost.json',JSON.stringify(result,null,2));
const summary={skyStars:result.skyStars,projectedBackgroundPoints:result.projectedBackgroundPoints,verifiedPoints:result.verifiedPoints,mismatches:result.mismatches,frames:result.frames,rounds:result.rounds.length,medianBeforeMs:result.medianBefore,medianAfterMs:result.medianAfter,scope:'Synchronous numerical microbenchmark; not browser FPS or presentation time'};
await fs.writeFile('.scratch/starry-blog/evidence/engineering-20261011/projection-cost-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
