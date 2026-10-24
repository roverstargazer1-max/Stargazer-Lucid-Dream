import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[];
try{
 for(const version of (process.env.PERF_VERSIONS||'baseline,final').split(',')){
  const base=`http://127.0.0.1:${version==='baseline'?4193:4194}`;
  const data=await (await fetch(base+'/starry/index.json')).json();
  const article=new URL(data.articles[0].url,base).pathname;
  for(const [kind,path]of [['home','/'],['article',article],['archive','/archives/'],['journal','/journal/'],['legacy-home','/legacy/'],['legacy-article','/legacy'+article]].filter(([kind])=>!process.env.PERF_KINDS||process.env.PERF_KINDS.split(',').includes(kind))){
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const page=await context.newPage(),client=await context.newCDPSession(page),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await client.send('Network.enable');await client.send('Emulation.setCPUThrottlingRate',{rate:4});
   await client.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:9e6/8,uploadThroughput:1e6/8});
   await page.addInitScript(()=>{window.__shifts=[];new PerformanceObserver(l=>window.__shifts.push(...l.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value))).observe({type:'layout-shift',buffered:true});});
   for(const cache of ['cold','warm']){
    await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:120000});
    if(['home','article','archive'].includes(kind))await page.waitForSelector('body.starry-ready',{state:'attached',timeout:120000});
    if(kind==='article')await page.waitForFunction(()=>document.body.dataset.reading==='open');
    if(kind==='journal')await page.waitForSelector('.journal-enhanced');
    const readyMs=await page.evaluate(()=>performance.now());
    await page.waitForTimeout(700);
    const value=await page.evaluate(()=>({fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,bytes:performance.getEntriesByType('navigation')[0].transferSize+performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),requests:performance.getEntriesByType('resource').length+1,cls:window.__shifts.reduce((a,b)=>a+b,0),images:[...document.images].filter(i=>i.currentSrc).length,journalImages:document.querySelectorAll('.journal-entry img').length,text:document.body.textContent.trim().length}));
    assert.equal(value.journalImages,0);assert.ok(value.text>20);assert.deepEqual(errors,[]);
    const row={version,kind,path,cache,readyMs,...value,errors:[...errors]};rows.push(row);console.log(JSON.stringify(row));
   }
   if(kind==='archive'){
    await page.locator('#collection-content-slot a[data-starry-article-id]').first().click();
    await page.waitForFunction(()=>document.body.dataset.reading==='open');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('#collection-panel').open&&!document.querySelector('#reader').open);
    assert.deepEqual(errors,[]);
   }
   await context.close();
  }
 }
}finally{await browser.close();await fs.writeFile(new URL(`${process.argv[2]||'pages'}-summary.json`,import.meta.url),JSON.stringify({browser:browser.version(),network:'9Mbps / 100ms, CPU 4x, mobile 390x844 DPR2',results:rows},null,2)+'\n');}
