import {chromium} from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const results=[];
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4175/',{waitUntil:'load'});
for(const[name,source]of[['silhouette-walk-frames','images/observation/silhouette-walk-frames.png']]){
 const original=(await fs.readFile(`.preview/stargazer/${source}`)).toString('base64');
 const result=await page.evaluate(async({name,original})=>{
  async function pixels(src){const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return{width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};}
  const a=await pixels(`data:image/png;base64,${original}`),b=await pixels(`/images/optimized/${name}.webp`);let differences=0;for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i])differences++;return{name,dimensionsEqual:a.width===b.width&&a.height===b.height,differences};
 },{name,original});results.push(result);
}
const source=await fs.readFile('.scratch/starry-blog/evidence/performance-20261009/cloud-artwork-baseline.js','utf8');
const clouds=await page.evaluate(async source=>{const module=await import(URL.createObjectURL(new Blob([source.replace("'./dome.js'","'http://127.0.0.1:4175/js/starfield/dome.js'")+'\nexport {makeCloud};'],{type:'text/javascript'})));return Promise.all([1,2,3].map(async seed=>{const a=module.makeCloud(seed);const b=document.createElement('canvas');b.width=512;b.height=224;const ctx=b.getContext('2d'),image=new Image();image.src=`/images/optimized/cloud-${seed}.png`;await image.decode();ctx.drawImage(image,0,0);const old=a.canvas.getContext('2d').getImageData(0,0,512,224).data,next=ctx.getImageData(0,0,512,224).data;let differences=0,alphaDifferences=0;for(let i=0;i<old.length;i++)if(old[i]!==next[i]){differences++;if(i%4===3)alphaDifferences++;}return{name:`cloud-${seed}`,dimensionsEqual:true,differences,alphaDifferences};}));},source);
results.push(...clouds);console.log(JSON.stringify(results));await fs.writeFile('.scratch/starry-blog/evidence/performance-20261009/browser-pixels.json',JSON.stringify(results,null,2));assert.ok(results.every(r=>r.dimensionsEqual&&r.differences===0),'All delivery artwork must have identical browser pixels');
}finally{await browser.close();}
