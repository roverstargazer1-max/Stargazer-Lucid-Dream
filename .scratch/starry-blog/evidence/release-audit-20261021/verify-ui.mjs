import {chromium} from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const output=path.dirname(new URL(import.meta.url).pathname);
const origin=process.env.STARFIELD_TEST_URL||'http://127.0.0.1:4175';
const expected=createHash('sha256').update(await fs.readFile('source/image/starfield/room-poster-detail-v20.webp')).digest('hex');
const reports=[];
const local=origin.includes('127.0.0.1');
const prefix=local?'':'live-';
const browser=await chromium.launch({headless:true,executablePath:process.env.STARFIELD_BROWSER_PATH||'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try{
 for(const[name,width,height,reduce]of[['desktop',1440,900,false],['mobile',390,844,false],['narrow',320,568,false],['mobile-landscape',740,390,false],['reduced',390,844,true]].filter(([name])=>local||name==='desktop'||name==='mobile')){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760,reducedMotion:reduce?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?motion=soft',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.classList.contains('starry-ready')&&document.body.dataset.liveWindow==='ready',{},{timeout:30000});
  const room=await page.locator('.room-image').getAttribute('src');assert.equal(new URL(room,origin).searchParams.get('v'),expected.slice(0,16));
  const bytes=await (await page.request.get(origin+room)).body();assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
  if(name==='desktop')await page.screenshot({path:path.join(output,prefix+'room-without-cat.png')});
  await page.locator('#window-entry').click();await page.waitForFunction(()=>document.body.dataset.room==='outside');
  await page.locator('#search-entry').click();await page.waitForFunction(()=>document.getElementById('star-search').open&&document.getElementById('star-search').dataset.indexOpen==='true'&&!document.getElementById('star-search').dataset.motion);
  await page.waitForFunction(()=>[...document.querySelectorAll('#star-search img[src]')].every(image=>image.complete&&image.naturalWidth>0),{},{timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  const inspect=()=>page.locator('#close-search').evaluate(button=>{const panel=document.querySelector('.search-artboard').getBoundingClientRect(),r=button.getBoundingClientRect(),title=document.querySelector('.search-heading').getBoundingClientRect();return{left:r.left-panel.left,top:r.top-panel.top,width:r.width,height:r.height,right:panel.right-r.right,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id,overlapsTitle:r.left<title.right&&r.right>title.left&&r.top<title.bottom&&r.bottom>title.top};});
  const expanded=await inspect();assert.ok(expanded.width>=44&&expanded.height>=44);assert.equal(expanded.hit,'close-search');assert.equal(expanded.overlapsTitle,false);
  if(width<=760){assert.ok(expanded.left<60&&expanded.top<60);}else{assert.ok(expanded.right<10&&expanded.top<10);}
  await page.screenshot({path:path.join(output,`${prefix}${name}-expanded.png`)});
  await page.locator('#search-index-toggle').click();await page.waitForFunction(()=>document.getElementById('star-search').dataset.indexOpen==='false');
  if(width<=760){assert.equal(await page.locator('#close-search').isVisible(),true);const collapsed=await inspect();assert.ok(collapsed.left<60&&collapsed.top<60);await page.locator('#close-search').click();}
  else{await page.locator('#search-index-toggle').click();await page.waitForFunction(()=>document.getElementById('star-search').dataset.indexOpen==='true');await page.locator('#close-search').click();}
  await page.waitForFunction(()=>!document.getElementById('star-search').open);assert.deepEqual(errors,[]);
  reports.push({name,room,catRemoved:true,expanded,closeAfterToggle:true,errors});await page.close();
 }
 await fs.writeFile(path.join(output,local?'ui-summary.json':'live-ui-report.json'),JSON.stringify({origin,reports},null,2)+'\n');console.log(JSON.stringify({origin,reports},null,2));
}finally{await browser.close();}
