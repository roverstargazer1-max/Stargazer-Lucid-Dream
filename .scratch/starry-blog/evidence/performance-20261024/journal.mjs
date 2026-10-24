import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const [name,width,height,standalone,soft]of [['desktop-modal',1440,900,false,false],['mobile-modal',390,650,false,false],['narrow-page',320,568,true,true],['retry',390,650,true,true]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500,reducedMotion:soft?'reduce':'no-preference'}),errors=[],photos=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/image/journal/'))photos.push(new URL(r.url()).pathname);});
  let fail=name==='retry';if(fail)await page.route('**/image/journal/*',r=>fail?r.fulfill({status:404,body:'Not found'}):r.continue());
  await page.goto('http://127.0.0.1:4175/'+(standalone?'journal/':'')+(soft?'?motion=soft':''));
  let sheet;
  if(standalone)sheet=page.locator('.journal-standalone');else{await page.waitForSelector('body.starry-ready',{state:'attached'});await page.locator('#room-journal-shortcut').evaluate(e=>e.click());await page.waitForSelector('#window-journal .journal-entry');sheet=page.locator('#window-journal');}
  assert.equal(photos.length,0);
  await sheet.locator('.journal-archive summary').click();await sheet.locator('[data-journal-month="2026-08"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-journal-months]').hasAttribute('aria-busy'));
  const toggle=sheet.locator('[data-month="2026-08"] [data-journal-image-toggle]').first();
  await toggle.hover();assert.equal(photos.length,0);await toggle.click();
  if(fail){await sheet.locator('[data-state="error"]').waitFor();fail=false;await toggle.click();}
  await sheet.locator('[data-state="loaded"]').waitFor();await page.waitForTimeout(300);
  const count=photos.length;assert.equal(count,name==='retry'?2:1);
  await toggle.press('Enter');await page.waitForTimeout(220);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.press('Enter');await page.waitForTimeout(300);assert.equal(photos.length,count);
  const image=sheet.locator('[data-state="loaded"] img');assert.ok(await image.isVisible());
  if(standalone)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));else await sheet.locator('[data-journal-scroll]').evaluate(e=>e.scrollTop=e.scrollHeight);
  const top=sheet.locator('[data-journal-top]');await page.waitForTimeout(100);await top.click();
  await page.waitForFunction(standalone?()=>window.scrollY===0:()=>document.querySelector('#window-journal [data-journal-scroll]').scrollTop===0);
  const layout=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,top:document.querySelector('[data-journal-top]').getBoundingClientRect().width}));
  assert.ok(layout.page<=layout.viewport+1);assert.equal(layout.top,44);assert.deepEqual(errors,[]);
  results.push({name,width,height,initialPhotoRequests:0,photoRequestsAfterExplicitClick:count,reopenAddsRequests:false,keyboard:true,backToTop:true,layout,errors});console.log(JSON.stringify(results.at(-1)));await page.close();
 }
}finally{await browser.close();await fs.writeFile(new URL('journal-summary.json',import.meta.url),JSON.stringify(results,null,2)+'\n');}
