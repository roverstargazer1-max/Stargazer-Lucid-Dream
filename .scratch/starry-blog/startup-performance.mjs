import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const label=process.argv[2]||'baseline';
const target=process.env.STARFIELD_TEST_URL||'http://127.0.0.1:4175/';
const output=path.resolve('.scratch/starry-blog/evidence/performance-20261009');
const repetitions=Number(process.env.PERF_REPEATS||3);
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const results=[];
try{
for(const device of ['desktop','mobile'])for(let repeat=0;repeat<repetitions;repeat++){
 const context=await browser.newContext({viewport:device==='desktop'?{width:1440,height:900}:{width:390,height:844},deviceScaleFactor:2,isMobile:device==='mobile',hasTouch:device==='mobile'});
 const page=await context.newPage(),session=await context.newCDPSession(page);
 await session.send('Network.enable'); await session.send('Network.setCacheDisabled',{cacheDisabled:true});
 await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
 await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.addInitScript(()=>{
  window.__startup={paints:[],lcp:[],longTasks:[],calls:[],roomPaintMs:null,readyMs:null};
  for(const [type,key]of[['paint','paints'],['largest-contentful-paint','lcp'],['longtask','longTasks']])new PerformanceObserver(list=>window.__startup[key].push(...list.getEntries().map(e=>({name:e.name,start:e.startTime,duration:e.duration,element:e.element?.className})))).observe({type,buffered:true});
  if(location.search.includes('probe'))for(const [proto,names]of[[WebGLRenderingContext.prototype,['getShaderParameter','getProgramParameter','texImage2D']],[CanvasRenderingContext2D.prototype,['drawImage']]])for(const name of names){const original=proto[name];proto[name]=function(...args){const start=performance.now();const result=Reflect.apply(original,this,args);const duration=performance.now()-start;if(duration>4)window.__startup.calls.push({name,duration});return result;};}
  function frame(now){const img=document.querySelector('.room-image'),room=document.getElementById('room');if(window.__startup.roomPaintMs===null&&img?.complete&&img.naturalWidth&&room.getBoundingClientRect().width&&getComputedStyle(room).display!=='none'){window.__startup.roomPaintMs=now;}if(document.body?.classList.contains('starry-ready'))window.__startup.readyMs??=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
 });
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForSelector('body.starry-ready',{state:'attached',timeout:90000});
 await page.waitForTimeout(1000);
 const result=await page.evaluate(()=>({...window.__startup,resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize,start:r.startTime,end:r.responseEnd})),renderer:document.body.dataset.domeRenderer}));
 result.device=device;result.repeat=repeat;result.totalBytes=result.resources.reduce((n,r)=>n+r.bytes,0);result.blockingMs=result.longTasks.reduce((n,t)=>n+Math.max(0,t.duration-50),0);
 results.push(result);console.log(JSON.stringify({device,repeat,roomPaintMs:result.roomPaintMs,readyMs:result.readyMs,totalBytes:result.totalBytes,blockingMs:result.blockingMs,calls:result.calls}));
 if(!repeat)await page.screenshot({path:path.join(output,`${label}-${device}-slow-ready.png`)});
 await context.close();
}
await fs.writeFile(path.join(output,`${label}-loading.json`),JSON.stringify({conditions:{latencyMs:150,downloadBytesPerSecond:200000,cpuRate:4,dpr:2,repetitions},results},null,2));
}finally{await browser.close();}
