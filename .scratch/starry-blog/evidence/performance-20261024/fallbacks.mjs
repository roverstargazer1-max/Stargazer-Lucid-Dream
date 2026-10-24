import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true}),base='http://127.0.0.1:4175';
const data=await(await fetch(base+'/starry/index.json')).json(),article=new URL(data.articles[0].url,base).pathname,results=[];
try{
 for(const kind of ['no-js-home','no-js-article','no-js-journal','module-failure','room-failure','mask-failure','index-stalled','module-late','renderer-failure']){
  const page=await browser.newPage({javaScriptEnabled:!kind.startsWith('no-js')});
  let release;
  if(kind==='module-failure')await page.route('**/js/starfield/app.bundle.js*',r=>r.abort());
  if(kind==='room-failure')await page.route('**/images/optimized/scene-room-*.webp*',r=>r.abort());
  if(kind==='mask-failure')await page.route('**/image/starfield/*mask*.svg',r=>r.abort());
  if(kind==='index-stalled')await page.route('**/starry/index.json',()=>new Promise(()=>{}));
  if(kind==='module-late')await page.route('**/js/starfield/app.bundle.js*',async r=>{await new Promise(resolve=>release=resolve);await r.continue().catch(()=>{});});
  if(kind==='renderer-failure')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))return null;return original.call(this,type,...args);};});
  const path=kind==='no-js-article'?article:kind==='no-js-journal'?'/journal/':'/';
  await page.goto(base+path,{waitUntil:'commit'});
  if(['index-stalled','module-late'].includes(kind)){
   await page.waitForFunction(()=>window.starfieldStartup?.failed,{},{timeout:18000});
   if(release){release();await page.waitForTimeout(1000);}
  }
  if(kind==='no-js-article')await page.locator('#static-article-fallback #reader-content').waitFor({state:'visible'});
  else if(kind==='no-js-journal')await page.locator('.journal-entry').first().waitFor({state:'visible'});
  else await page.locator('#home-fallback').waitFor({state:'visible'});
  const row=await page.evaluate(()=>({ready:document.body.classList.contains('starry-ready'),loading:document.documentElement.classList.contains('starry-loading'),activePhotos:document.querySelectorAll('.journal-entry img').length,links:[...document.querySelectorAll('#home-fallback a[href]')].length,prose:document.querySelector('#reader-content')?.textContent.trim().length||0,entries:document.querySelectorAll('.journal-entry').length,rawImageLinks:document.querySelectorAll('.journal-image-fallback').length}));
  assert.equal(row.ready,false);assert.equal(row.loading,false);assert.equal(row.activePhotos,0);
  if(kind==='no-js-article')assert.ok(row.prose>20);else if(kind==='no-js-journal'){assert.equal(row.entries,13);assert.equal(row.rawImageLinks,2);}else assert.ok(row.links>2);
  results.push({kind,...row});console.log(JSON.stringify(results.at(-1)));await page.close();
 }
}finally{await browser.close();await fs.writeFile(new URL('fallbacks-summary.json',import.meta.url),JSON.stringify({preFixStalledModuleAt16s:{loading:true,fallbackVisible:false,windowDisabled:true},results},null,2)+'\n');}
