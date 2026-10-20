import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_PATH||path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const executablePath=process.env.CHROMIUM_PATH||(process.platform==='darwin'?path.join(homedir(),'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'):undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const folder=new URL('./',import.meta.url),reports=[];
const ready=page=>page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
const expanded=page=>page.waitForFunction(()=>document.querySelector('#search-index-toggle').getAttribute('aria-expanded')==='true');
const closed=page=>page.waitForFunction(()=>!document.querySelector('#star-search').open);
try{
 for(const [name,width,height,reducedMotion,soft] of [['desktop',1440,900,'no-preference',false],['mobile',390,844,'no-preference',false],['reduced',1440,900,'reduce',false],['soft',1440,900,'no-preference',true]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion,hasTouch:name==='mobile'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4175/')+(soft?'?motion=soft':''));
  await page.waitForSelector('body.starry-ready',{state:'attached'});
  await page.locator('#window-entry').evaluate(el=>el.click());await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
  await page.evaluate(()=>{
   window.indexTrace=[];window.indexCapture=true;const start=performance.now(),dialog=document.querySelector('#star-search'),map=document.querySelector('.search-map'),index=document.querySelector('#search-index');
   function tick(now){if(!window.indexCapture)return;if(dialog.open){
    const rect=dialog.getBoundingClientRect(),unfold=Number(dialog.style.getPropertyValue('--unfold')),x=parseFloat(dialog.style.getPropertyValue('--iris-x')),y=parseFloat(dialog.style.getPropertyValue('--iris-y'));
    const r0=parseFloat(dialog.style.getPropertyValue('--iris-r0')),r=parseFloat(dialog.style.getPropertyValue('--iris-r')),clip=getComputedStyle(index).clipPath;
    window.indexTrace.push({t:now-start,motion:dialog.dataset.motion||null,unfold,expanded:dialog.dataset.indexOpen==='true',width:rect.width,mapWidth:map.clientWidth,
     clipRight:parseFloat(clip.slice(6,-1).trim().split(/\s+/)[1]),irisRadius:r0+(r-r0)*unfold,furthest:Math.max(...[[0,0],[rect.width,0],[0,rect.height],[rect.width,rect.height]].map(([a,b])=>Math.hypot(a-x,b-y)))});
   }requestAnimationFrame(tick);}requestAnimationFrame(tick);
  });
  await page.locator('#search-entry').click();await expanded(page);await page.waitForTimeout(1000);
  const trace=await page.evaluate(()=>{window.indexCapture=false;return window.indexTrace;});
  const opening=trace.filter(frame=>frame.motion==='opening'),firstExpanded=trace.find(frame=>frame.expanded),final=trace.at(-1);
  assert.ok(opening.some(frame=>!frame.expanded),'the chart must start on its own');assert.ok(firstExpanded);assert.equal(firstExpanded.motion,'opening');
  const overlap=opening.at(-1).t-firstExpanded.t;assert.ok(overlap>(soft?20:200),'the sidebar must overlap the moving chart instead of waiting for it to settle');
  assert.ok(firstExpanded.unfold>.7&&firstExpanded.unfold<.99);
  if(!soft){
   assert.ok(opening.some(frame=>frame.expanded&&frame.clipRight<.1),'the sidebar must be revealed before the chart settles');
   assert.ok(opening.at(-1).irisRadius>opening.at(-1).furthest,'the aperture must cover the wider panel before its clip is removed');
  }
  const indexFrames=trace.filter(frame=>frame.expanded);
  assert.ok(Math.max(...indexFrames.map(frame=>frame.mapWidth))-Math.min(...indexFrames.map(frame=>frame.mapWidth))<1,'the star chart must retain its size during index expansion');
  if(name!=='mobile'){
   assert.ok(final.width>opening[0].width+50);
   if(reducedMotion!=='reduce')assert.ok(trace.some(frame=>frame.expanded&&frame.width>opening[0].width+5&&frame.width<final.width-5),'the index must visibly expand rather than jump');
  }
  assert.equal(await page.locator('#search-index').evaluate(el=>el.inert),false);
  assert.ok(await page.locator('#search-results .search-result').count()>0);
  await page.locator('#search-index-toggle').evaluate(el=>el.click());await page.waitForTimeout(700);
  assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'false','manual collapse must remain in effect');
  if(name==='desktop'){
   await page.locator('.search-map-star:not(:disabled)').first().evaluate(el=>el.click());await page.waitForFunction(()=>document.body.dataset.reading==='open');
   await page.locator('#close-reader').click();await ready(page);
   assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'false','returning from reading must retain a manual collapse');
   await page.keyboard.press('Escape');await closed(page);
   await page.locator('#search-entry').click();await expanded(page);await page.waitForTimeout(700);
   await page.locator('#star-search').screenshot({path:new URL('desktop.png',folder).pathname});
   await page.keyboard.press('Escape');await closed(page);
   await page.locator('#search-entry').click();await page.keyboard.press('Escape');await closed(page);
   await page.waitForTimeout(700);assert.equal(await page.locator('#star-search').getAttribute('data-index-open'),'false','closing during entry must cancel the automatic expansion');
   await page.locator('#search-entry').click();await expanded(page);await page.waitForTimeout(700);
  }
  await page.locator('#search-index-toggle').evaluate(el=>el.click());
  if(name!=='desktop')await expanded(page);
  assert.deepEqual(errors,[]);
  const report={name,viewport:{width,height},openingFrames:opening.length,overlapMs:overlap,indexStartsAtUnfold:firstExpanded.unfold,collapsedWidth:opening[0].width,expandedWidth:final.width,mapWidth:final.mapWidth,manualCollapse:true,...(name==='desktop'?{readingPreservesCollapse:true,reopenDefaultsExpanded:true,interruptedEntry:true}:{}),errors};
  reports.push(report);console.log(JSON.stringify(report));await page.close();
 }
 await fs.writeFile(new URL('browser-summary.json',folder),JSON.stringify(reports,null,2));
}finally{await browser.close();}
