import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const code=await fs.readFile(process.argv[2]||'themes/stargazer-starfield/source/js/starfield/silhouette-walker.js','utf8');
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const page=await browser.newPage({deviceScaleFactor:1});await page.goto('http://127.0.0.1:4175/images/observation/silhouette-walk-atlas.png');
const result=await page.evaluate(async ({code,source})=>{
 const mod=await import('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(code))));
 const el=document.createElement('div');el.style='position:fixed;width:280px;height:419px;left:0;top:0;visibility:hidden';
 el.innerHTML='<img class="silhouette-still" src="/images/observation/silhouette.png"><img class="silhouette-frames" src="/images/observation/'+source+'" hidden><canvas hidden></canvas>';
 document.body.append(el);await el.querySelector('.silhouette-frames').decode();const walker=mod.createSilhouetteWalker(el);
 const c=document.createElement('canvas');c.width=280;c.height=390;const ctx=c.getContext('2d'),canvas=el.querySelector('canvas'),stats=[];
 const edgeWidth=(p,x0,x1,y0,y1)=>{let gray=0,boundary=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const k=(y*280+x)*4+3,a=p[k];if(a>10&&a<245)gray++;if(a>=128&&[k-4,k+4,k-1120,k+1120].some(n=>p[n]<128))boundary++;}return gray/Math.max(1,boundary);};
 for(let i=0;i<68;i++){
  walker.render(i*1000/120+.001,true);if(canvas.hidden)throw new Error('Animated frame failed to render');
  const scale=Math.min(canvas.width/1024,canvas.height/1536),poseScale=1302*scale/355;
  const x=(canvas.width-1024*scale)/2+528*scale-125*poseScale,y=(canvas.height-1536*scale)/2+1420*scale-385*poseScale;
  ctx.clearRect(0,0,280,390);ctx.drawImage(canvas,-x/poseScale,-y/poseScale,canvas.width/poseScale,canvas.height/poseScale);
  const p=ctx.getImageData(0,0,280,390).data;let jump=0,last=null;
  for(let y=212;y<=236;y++){
   const runs=[];let start=-1;for(let x=100;x<190;x++){if(p[(y*280+x)*4+3]>=128){if(start<0)start=x;}else if(start>=0){if(x-start>=16)runs.push([start,x-1]);start=-1;}}
   if(start>=0&&190-start>=16)runs.push([start,189]);
   runs.sort((a,b)=>Math.abs((a[0]+a[1])/2-130)-Math.abs((b[0]+b[1])/2-130));
   const row=runs[0];if(row&&last)jump=Math.max(jump,Math.abs(row[0]-last[0]),Math.abs(row[1]-last[1]));last=row;
  }
  stats.push({frame:i,body:edgeWidth(p,70,190,95,190),legs:edgeWidth(p,25,245,265,330),jump});
 }
 const body=stats.reduce((s,p)=>s+p.body,0)/68,legs=stats.reduce((s,p)=>s+p.legs,0)/68,maxJump=Math.max(...stats.map(s=>s.jump));
 return{bodyEdgeWidth:body,legEdgeWidth:legs,edgeWidthDifference:Math.abs(body-legs),maxWaistJump:maxJump,stats};
},{code,source:process.argv[4]||'silhouette-walk-frames.png'});await browser.close();
console.log(JSON.stringify({...result,stats:undefined}));if(process.argv[3])await fs.writeFile(process.argv[3],JSON.stringify(result,null,2));
if(result.edgeWidthDifference>.6||result.maxWaistJump>3)process.exitCode=1;
