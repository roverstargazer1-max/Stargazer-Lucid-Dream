import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url);
const file=name=>new URL(name,dir).pathname.replace(/^\/([A-Z]:)/i,'$1');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
const report=[];
async function open(page){
 await page.goto('http://127.0.0.1:4175/?motion=soft');
 await page.waitForFunction(()=>document.body.classList.contains('starry-ready'));
 const rect=await page.locator('#window-entry').boundingBox();
 await page.locator('#window-entry').click({position:{x:rect.width*.35,y:rect.height*.25}});
 await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
 await page.locator('#search-entry').click();
 await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
 await page.waitForFunction(()=>[...document.querySelectorAll('#star-search img')].every(i=>i.complete&&i.naturalWidth));
}
async function geometry(page){return page.evaluate(()=>{
 const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
 const a=document.querySelector('.search-artboard'), base=document.querySelector('.search-base'),map=document.querySelector('.search-map'),heading=document.querySelector('.search-heading'),bar=document.querySelector('.search-bar'),filters=document.querySelector('.search-filters');
 const b=box(base),m=box(map),scale=b.width/1917;
 return {panel:box(a),map:m,base:b,heading:box(heading),bar:box(bar),filters:box(filters),scrollWidth:a.scrollWidth,clientWidth:a.clientWidth,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight,ringAlignment:{x:(b.x+790.5*scale)-(m.x+m.width/2),y:(b.y+733.5*scale)-(m.y+m.height/2),diameter:897*scale-m.width},rows:document.querySelectorAll('.search-result').length};
 });}
try{
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['tablet',{width:1024,height:768}],['mobile',{width:390,height:844}],['narrow',{width:320,height:568}],['landscape',{width:844,height:390}]]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);const closed=await geometry(page);await page.screenshot({path:file(name+'-closed.png')});
  assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('#search-index-toggle').click();const expanded=await geometry(page);await page.screenshot({path:file(name+'-open.png')});
  assert.equal(expanded.rows,10);assert.ok(Math.abs(closed.map.width-expanded.map.width)<.01);
  assert.ok(expanded.scrollWidth<=expanded.clientWidth+1, name+' horizontal overflow');
  for(const delta of Object.values(expanded.ringAlignment))assert.ok(Math.abs(delta)<.15,name+' ring misaligned');
  if(viewport.width>760&&viewport.height>650){const scale=expanded.base.width/1917;assert.ok(Math.abs(expanded.heading.x-expanded.panel.x-598*scale)<.05);assert.ok(Math.abs(expanded.bar.x-expanded.panel.x-166*scale)<.05);assert.ok(Math.abs(expanded.filters.x-expanded.panel.x-179*scale)<.05);}
  await page.locator('[data-filter=year] button[data-value="2025"]').click();assert.equal(await page.locator('.search-result').count(),5);
  await page.locator('[data-filter=magnitude] button[data-value="1.0"]').click();assert.equal(await page.locator('.search-result').count(),0);
  await page.locator('#search-clear').click();assert.equal(await page.locator('.search-result').count(),10);assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'true');
  await page.locator('#search-query').fill('SLD-0006');await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===1);
  assert.match(await page.locator('.search-result').textContent(),/慢/);
  await page.locator('.search-result').click();await page.waitForFunction(()=>document.querySelector('#reader').open&&!document.querySelector('#reader').dataset.motion);
  await page.locator('#close-reader').click();await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
  assert.equal(await page.locator('#search-query').inputValue(),'SLD-0006');assert.equal(await page.locator('.search-result').count(),1);
  await page.locator('#search-clear').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#star-search').open);
  await page.locator('#search-entry').click();await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);assert.equal(await page.locator('#search-query').inputValue(),'');assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'),'false');
  const d=await page.locator('#star-search').boundingBox();await page.mouse.click(d.x-5,d.y+10);await page.waitForFunction(()=>!document.querySelector('#star-search').open);
  assert.deepEqual(errors,[]);report.push({name,viewport,closed,expanded,errors,interaction:'year/magnitude intersection, clear, ID search, read-return state, Escape, fresh session and outside close passed'});await page.close();
 }
 await fs.writeFile(file('browser-summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.map(({name,expanded})=>({name,ringAlignment:expanded.ringAlignment,width:expanded.clientWidth,scrollWidth:expanded.scrollWidth})),null,2));
}finally{await browser.close();}
