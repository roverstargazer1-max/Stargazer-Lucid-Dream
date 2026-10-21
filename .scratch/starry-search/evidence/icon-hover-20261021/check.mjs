import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {PNG}=require('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const folder=new URL('./',import.meta.url);
const frame=PNG.sync.read(await fs.readFile(new URL('../../../../assets/检索页/v3/frame-v3.png',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const report=[];
function blueDifference(rest,next){
 let changed=0,samples=0,max=0;
 for(let y=0;y<rest.height;y++)for(let x=0;x<rest.width;x++){
  const nx=Math.floor((x+.5)*frame.width/rest.width),ny=Math.floor((y+.5)*frame.height/rest.height);
  if(nx<1168||nx>1183||ny<38||ny>82)continue;
  if(frame.data[(ny*frame.width+nx)*4]>80)continue;
  const i=(y*rest.width+x)*4,delta=Math.max(...[0,1,2].map(c=>Math.abs(rest.data[i+c]-next.data[i+c])));
  samples++;if(delta>1)changed++;max=Math.max(max,delta);
 }
 assert.ok(samples>10);
 return{samples,changed,maxDelta:max};
}
try{
 for(const[name,viewport,touch,reducedMotion]of[
  ['desktop',{width:1440,height:1000},false,'no-preference'],
  ['mobile',{width:390,height:844},true,'no-preference'],
  ['narrow',{width:320,height:568},true,'no-preference'],
  ['landscape',{width:844,height:390},true,'no-preference'],
  ['reduced',{width:1440,height:1000},false,'reduce'],
 ]){
  const page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch,reducedMotion}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4175/?motion=soft');
  await page.waitForFunction(()=>document.body.classList.contains('starry-ready'));
  await page.locator('#window-entry').click({position:{x:40,y:40}});
  await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
  await page.locator('#search-entry').click();
  await page.waitForFunction(()=>!document.querySelector('#star-search').dataset.motion);
  await page.waitForFunction(()=>[...document.querySelectorAll('#star-search img')].every(img=>img.complete&&img.naturalWidth));
  const bar=page.locator('.search-bar'),button=page.locator('.search-submit');
  const settle=()=>page.waitForTimeout(350);
  const shot=async state=>PNG.sync.read(await bar.screenshot({path:new URL(`${name}-${state}.png`,folder).pathname}));
  const visual=()=>page.locator('.search-submit-art').evaluate(el=>({transform:getComputedStyle(el).transform,filter:getComputedStyle(el).filter}));
  await page.mouse.move(0,0);await settle();
  const box=await button.boundingBox(),rest=await shot('rest');
  const states=[];
  if(!touch){
   await button.hover();await settle();
   const pixels=blueDifference(rest,await shot('hover')),art=await visual();
   states.push({state:'hover',...pixels,...art});
   assert.equal(pixels.changed,0,`${name}: hover must not change the blue search-bar background outside the magnifier`);
   assert.equal(art.transform==='none',reducedMotion==='reduce');
   assert.match(art.filter,/brightness\(1\.16\)/);
   assert.deepEqual(await button.boundingBox(),box,'Hover must not move the hit area');
   await page.mouse.down();await settle();
   const press=blueDifference(rest,await shot('press'));states.push({state:'press',...press});
   assert.equal(press.changed,0);await page.mouse.up();
   await page.mouse.move(0,0);await button.evaluate(el=>el.blur());await settle();
  }
  await page.keyboard.press('Tab');await button.focus();await settle();
  assert.ok(await button.evaluate(el=>el.matches(':focus-visible')));
  const focus=blueDifference(rest,await shot('focus'));states.push({state:'focus',...focus,...await visual()});
  assert.equal(focus.changed,0,`${name}: keyboard focus must leave the blue background stationary`);
  await button.evaluate(el=>el.blur());await page.mouse.move(0,0);await settle();
  const returnedImage=await shot('returned');const returned=blueDifference(rest,returnedImage);assert.equal(returned.changed,0);
  // The resting state displays the complete authored PNG directly. Do not swap
  // identical img.src values to compare screenshots: Chromium can rerasterize a
  // fractional mobile clip differently even when the image bytes are identical.
  const restUsesOriginalPNG=await page.locator('.search-frame').evaluate(img=>img.src.endsWith('/images/search/frame-v3.png')&&getComputedStyle(img).visibility==='visible');
  assert.ok(restUsesOriginalPNG);
  assert.equal(await page.locator('.search-frame-background').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  assert.equal(await page.locator('.search-submit-art').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  await page.locator('#search-query').fill('SLD-0006');
  if(touch)await button.tap();else await button.click();
  await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===1);
  assert.match(await page.locator('.search-result').textContent(),/慢/);
  await page.locator('.search-result').click();
  await page.waitForFunction(()=>document.querySelector('#reader')?.open);
  assert.match(await page.locator('#reader-title').textContent(),/慢/);
  assert.deepEqual(errors,[]);
  report.push({name,states,hitAreaStable:true,restUsesOriginalPNG,searchAndRead:true,errors});
  await fs.writeFile(new URL('browser-summary.json',folder),JSON.stringify(report,null,2)+'\n');
  console.log(name,{backgroundChanges:states.map(s=>s.changed),restUsesOriginalPNG,searchAndRead:true});
  await page.close();
 }
}finally{await browser.close();}
