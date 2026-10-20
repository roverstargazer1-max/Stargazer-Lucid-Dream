import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_PATH||path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const executablePath=process.env.CHROMIUM_PATH||(process.platform==='darwin'?path.join(homedir(),'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'):undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const reports=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4175/')+'?motion=soft');
 await page.waitForSelector('body.starry-ready',{state:'attached'});
 await page.locator('#window-entry').evaluate(el=>el.click());await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
 await page.locator('#search-entry').click();await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
 await page.locator('[data-filter="year"] button[data-value="2025"]').click();await page.waitForTimeout(600);
 const muted=page.locator('.search-map-star[aria-label^="阅读：随笔2，"]');
 const box=await muted.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(300);
 const highlighted=await muted.evaluate(el=>el.classList.contains('is-highlighted'));
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(700);
 const result={muted:await muted.evaluate(el=>el.classList.contains('is-muted')),disabled:await muted.isDisabled(),highlighted,readerOpen:await page.locator('#reader').evaluate(el=>el.open)};
 console.log(JSON.stringify(result));reports.push(result);
 assert.equal(result.readerOpen,false,'clicking a filtered-out star must not open an article');
 assert.equal(result.highlighted,false,'hovering a filtered-out star must not select it');
 assert.equal(result.disabled,true,'filtered-out stars must be excluded from keyboard interaction');
 const state=async(label)=>{
  const value=await page.locator('.search-map-star').evaluateAll(stars=>{
   const rows=new Set([...document.querySelectorAll('.search-result')].map(el=>el.dataset.articleId));
   return {disabled:stars.filter(el=>el.disabled).length,total:stars.length,consistent:stars.every(el=>el.disabled===!rows.has(el.dataset.articleId)&&el.disabled===el.classList.contains('is-muted')),mutedOpacity:stars.filter(el=>el.disabled).map(el=>getComputedStyle(el).opacity)};
  });
  assert.equal(value.consistent,true);assert.ok(value.mutedOpacity.every(opacity=>opacity==='1'));reports.push({label,...value});return value;
 };
 assert.equal((await state('year')).disabled,5);
 await page.locator('#search-query').focus();let keyboardStars=0;
 for(let i=0;i<18;i++){
  await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>({star:document.activeElement.classList.contains('search-map-star'),muted:document.activeElement.classList.contains('is-muted')}));
  assert.equal(focus.muted,false);if(focus.star)keyboardStars++;
 }
 assert.ok(keyboardStars>0);
 const year=page.locator('[data-filter="year"] button[data-value="2025"]');
 await year.click();assert.equal((await state('year-cleared')).disabled,0);
 await muted.hover();await page.waitForTimeout(300);assert.equal(await muted.evaluate(el=>el.classList.contains('is-highlighted')),true);
 await year.evaluate(el=>el.click());
 assert.equal(await page.locator('.search-map-title').getAttribute('data-on'),'false');
 await muted.dispatchEvent('mouseenter');await muted.dispatchEvent('click');await page.waitForTimeout(350);
 assert.equal(await page.locator('#reader').evaluate(el=>el.open),false);
 assert.equal(await page.locator('.search-map-title').getAttribute('data-on'),'false');
 await page.locator('[data-filter="magnitude"] button[data-value="2.5"]').click();assert.equal((await state('empty-intersection')).disabled,10);
 await page.locator('#search-clear').click();assert.equal((await state('all-cleared')).disabled,0);
 await page.locator('#search-query').fill('SLD-0007');await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===1);
 assert.equal((await state('keyword')).disabled,9);
 await muted.click();await page.waitForFunction(()=>document.body.dataset.reading==='open');
 await page.locator('#close-reader').click();await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
 assert.equal(await page.locator('#search-query').inputValue(),'SLD-0007');assert.equal((await state('reading-return')).disabled,9);
 await page.locator('#search-query').fill('不存在的文章xyz');assert.equal((await state('no-keyword-matches')).disabled,10);
 await page.locator('#search-clear').click();assert.equal((await state('keyword-cleared')).disabled,0);
 reports.push({keyboardStars,staleHighlightCleared:true,guardedEvents:true,readingReturn:true});
 assert.deepEqual(errors,[]);
 await page.close();
 const phone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 phone.on('pageerror',error=>errors.push(error.message));
 await phone.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4175/')+'?motion=soft');await phone.waitForSelector('body.starry-ready',{state:'attached'});
 await phone.locator('#window-entry').evaluate(el=>el.click());await phone.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
 await phone.locator('#search-entry').tap();await phone.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
 await phone.locator('[data-filter="year"] button[data-value="2025"]').tap();await phone.waitForTimeout(600);
 const target=await phone.locator('.search-map-star.is-muted').evaluateAll(stars=>stars.map(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return {id:el.dataset.articleId,x,y,hit:document.elementFromPoint(x,y)?.closest('.search-map-star')===el};
 }).find(el=>el.hit));assert.ok(target);
 await phone.touchscreen.tap(target.x,target.y);await phone.waitForTimeout(500);assert.equal(await phone.locator('#reader').evaluate(el=>el.open),false);
 await phone.locator('[data-filter="year"] button[data-value="2025"]').tap();
 assert.equal(await phone.locator('.search-map-star:disabled').count(),0);
 const restored=phone.locator('.search-map-star[data-article-id="'+target.id+'"]');await restored.tap();await phone.waitForFunction(()=>document.body.dataset.reading==='open');
 reports.push({mobileMutedTapBlocked:true,mobileRestoredTapReadable:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:reports.length,keyboardStars,mobile:true,errors}));
 await fs.writeFile(new URL('browser-summary.json',import.meta.url),JSON.stringify({reports,errors},null,2));
}finally{await browser.close();}
