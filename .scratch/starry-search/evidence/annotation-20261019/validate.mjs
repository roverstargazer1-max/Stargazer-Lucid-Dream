import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_PATH||path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const executablePath=process.env.CHROMIUM_PATH||(process.platform==='darwin'?path.join(homedir(),'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'):undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const folder=new URL('./',import.meta.url), reports=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rowState=async(page,id)=>page.locator('#search-results').evaluate((list,id)=>{
 const row=[...list.children].find(row=>row.dataset.articleId===id),rect=list.getBoundingClientRect(),r=row.getBoundingClientRect();
 return {top:list.scrollTop,visible:r.top>=rect.top-1&&r.bottom<=rect.bottom+1,highlighted:row.classList.contains('is-highlighted')};
},id);
const outside=async page=>page.evaluate(()=>({document:document.scrollingElement.scrollTop,board:document.querySelector('.search-artboard').scrollTop,dialog:document.querySelector('#star-search').scrollTop,active:document.activeElement?.id}));
try{
 for(const [name,width,height,reducedMotion,soft] of [
  ['desktop',1440,900,'no-preference',false],['short',1440,700,'no-preference',false],
  ['mobile',390,844,'no-preference',false],['narrow',320,568,'no-preference',false],
  ['landscape',844,390,'no-preference',false],['reduced',1440,900,'reduce',false],
  ['soft',1440,700,'no-preference',true]
 ]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion}), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4175/')+(soft?'?motion=soft':''));
  await page.waitForSelector('body.starry-ready',{state:'attached'});
  await page.locator('#window-entry').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
  await page.locator('#search-entry').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
  await page.locator('#search-index-toggle').evaluate(el=>el.click());await sleep(1050);
  await page.evaluate(()=>document.fonts.ready);
  const stars=await page.locator('.search-map-star').evaluateAll(els=>els.map(el=>({id:el.dataset.articleId,title:el.getAttribute('aria-label')})));
  const labels=[];
  for(const star of stars){
   await page.locator('.search-map-star[data-article-id="'+star.id+'"]').evaluate(el=>el.focus({preventScroll:true}));await sleep(35);
   const geometry=await page.locator('.search-map-title').evaluate(label=>{
    const map=label.parentElement,box=label.getBoundingClientRect(),area=map.getBoundingClientRect(),css=getComputedStyle(label),leader=getComputedStyle(label,'::after');
    const x=parseFloat(label.style.getPropertyValue('--leader-x')),y=parseFloat(label.style.getPropertyValue('--leader-y'));
    const angle=parseFloat(label.style.getPropertyValue('--leader-angle')),length=parseFloat(label.style.getPropertyValue('--leader-length'));
    return {name:label.querySelector('.search-map-title-name').textContent,date:label.querySelector('time').dateTime,meta:label.querySelector('.search-map-title-meta').textContent,
     left:box.left-area.left,right:area.right-box.right,top:box.top-area.top,bottom:area.bottom-box.bottom,overflow:label.scrollWidth-label.clientWidth,
     background:css.backgroundColor,boxShadow:css.boxShadow,diagonal:Math.abs(Math.cos(angle))>.15&&Math.abs(Math.sin(angle))>.15,
     length,start:{x:box.left-area.left+x,y:box.top-area.top+y},end:{x:box.left-area.left+x+Math.cos(angle)*length,y:box.top-area.top+y+Math.sin(angle)*length},below:label.dataset.below==='true',labelHeight:box.height};
   });
   assert.ok(geometry.left>=-1&&geometry.right>=-1&&geometry.top>=-1&&geometry.bottom>=-1,JSON.stringify({name,geometry}));
   assert.ok(geometry.overflow<=1,JSON.stringify({name,geometry}));
   assert.equal(geometry.background,'rgba(0, 0, 0, 0)');assert.equal(geometry.boxShadow,'none');assert.equal(geometry.diagonal,true);
   assert.match(geometry.meta,/SLD-\d{4} · 4\.0/);assert.match(geometry.date,/^\d{4}-\d{2}-\d{2}$/);
   const starGeometry=await page.locator('.search-map-star[data-article-id="'+star.id+'"]').evaluate(el=>{const r=el.getBoundingClientRect(),a=el.parentElement.getBoundingClientRect();return{x:r.left+r.width/2-a.left,y:r.top+r.height/2-a.top};});
   assert.ok(Math.abs(Math.hypot(geometry.start.x-starGeometry.x,geometry.start.y-starGeometry.y)-17)<1.5,JSON.stringify({name,geometry,starGeometry}));
   assert.ok(Math.abs(geometry.end.y-(geometry.top+(geometry.below?0:geometry.labelHeight)))<1.5);
   labels.push(geometry);
  }
  // Actual pointer hover follows an off-screen row; the page and chart stay put.
  await page.locator('#search-results').evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));
  await page.locator('#search-query').evaluate(el=>el.focus({preventScroll:true}));
  const oldest=await page.locator('#search-results .search-result').last().getAttribute('data-article-id');
  const star=page.locator('.search-map-star[data-article-id="'+oldest+'"]');
  const beforeOutside=await outside(page);
  await star.dispatchEvent('mouseenter');await sleep(700);
  const followed=await rowState(page,oldest);assert.equal(followed.visible,true);assert.equal(followed.highlighted,true);
  assert.deepEqual(await outside(page),beforeOutside);
  const visibleTop=followed.top;
  await star.dispatchEvent('mouseenter');await sleep(100);assert.equal((await rowState(page,oldest)).top,visibleTop);
  const newest=await page.locator('#search-results .search-result').first().getAttribute('data-article-id');
  const newestStar=page.locator('.search-map-star[data-article-id="'+newest+'"]');
  // Switch while a smooth scroll is still running; only the latest target wins.
  await newestStar.dispatchEvent('mouseenter');await sleep(40);await star.dispatchEvent('mouseenter');await sleep(700);
  assert.equal((await rowState(page,oldest)).visible,true);
  await newestStar.dispatchEvent('mouseenter');await sleep(700);assert.equal((await rowState(page,newest)).visible,true);
  await page.locator('#search-index-toggle').evaluate(el=>el.click());await sleep(550);
  await page.locator('#search-results').evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));
  await star.dispatchEvent('mouseenter');await sleep(400);assert.equal((await rowState(page,oldest)).top,0);
  await page.locator('#search-index-toggle').evaluate(el=>el.click());await sleep(700);
  await page.locator('#search-query').fill('SLD-0007');await sleep(700);
  const filteredTop=await page.locator('#search-results').evaluate(el=>el.scrollTop);
  await newestStar.dispatchEvent('mouseenter');await sleep(400);assert.equal(await page.locator('#search-results').evaluate(el=>el.scrollTop),filteredTop);
  await page.locator('#search-query').fill('');await sleep(700);
  await page.getByRole('button',{name:/^阅读：随笔1，/}).dispatchEvent('mouseenter');await sleep(700);
  if(name==='desktop'||name==='mobile'||name==='narrow')await page.screenshot({path:new URL(name+'-annotation.png',folder).pathname});
  if(name==='desktop'){
   await page.getByRole('button',{name:/^阅读：随笔1，/}).click();
   await page.waitForFunction(()=>document.body.dataset.reading==='open');
   await page.locator('#close-reader').click();await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
   assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'true');
   assert.match(await page.locator('.search-map-title-name').textContent(),/随笔1/);
  }
  assert.deepEqual(errors,[]);
  reports.push({name,viewport:{width,height},labels,followed,visibleRowStable:true,rapidSwitch:true,collapsedStable:true,filteredStable:true,outerScrollStable:true,errors});
  console.log(JSON.stringify({name,labels:labels.length,followed,errors}));
  await page.close();
 }
 await fs.writeFile(new URL('browser-summary.json',folder),JSON.stringify(reports,null,2));
}finally{await browser.close();}
