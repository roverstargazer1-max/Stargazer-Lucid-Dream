import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4175/');await page.waitForFunction(()=>document.body.classList.contains('starry-ready'));
 const box=await page.locator('#window-entry').boundingBox();await page.locator('#window-entry').click({position:{x:box.width*.35,y:box.height*.25}});await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
 const openingStart=await page.evaluate(()=>performance.now());await page.locator('#search-entry').click();await page.waitForFunction(()=>document.querySelector('#star-search').dataset.motion==='opening');
 const opening=await page.evaluate(()=>({bodyMotion:document.body.dataset.motion,reduce:matchMedia('(prefers-reduced-motion:reduce)').matches,animations:document.querySelector('#star-search').getAnimations().map(a=>a.effect.getTiming().duration)}));
 await page.waitForFunction(()=>!document.querySelector('#star-search').dataset.motion);opening.elapsedMs=await page.evaluate(start=>performance.now()-start,openingStart);
 const before=await page.locator('.search-map').boundingBox();await page.locator('#search-index-toggle').click();
 const transition=await page.evaluate(()=>({arrow:getComputedStyle(document.querySelector('.search-toggle-arrow')).transitionDuration,panel:getComputedStyle(document.querySelector('#star-search')).transitionDuration}));
 await page.waitForFunction(()=>document.querySelector('#star-search').getAnimations().length===0);const after=await page.locator('.search-map').boundingBox();assert.equal(before.width,after.width);assert.equal(transition.arrow,'0.36s');assert.deepEqual(opening.animations,[1000]);assert.ok(opening.elapsedMs>=400&&opening.elapsedMs<650);
 await page.screenshot({path:'.scratch/starry-search/evidence/v3-20261012/desktop-full-motion.png'});
 const closingStart=await page.evaluate(()=>performance.now());await page.locator('#close-search').click();await page.waitForFunction(()=>document.querySelector('#star-search').dataset.motion==='closing');
 const closing=await page.evaluate(()=>document.querySelector('#star-search').getAnimations().map(a=>a.effect.getTiming().duration));assert.deepEqual(closing,[1000]);await page.waitForFunction(()=>!document.querySelector('#star-search').open);const closingElapsedMs=await page.evaluate(start=>performance.now()-start,closingStart);assert.ok(closingElapsedMs>=200&&closingElapsedMs<450);
 await fs.writeFile('.scratch/starry-search/evidence/v3-20261012/motion-summary.json',JSON.stringify({opening,transition,closing,closingElapsedMs,stableMapWidth:after.width},null,2));console.log({opening,transition,closingElapsedMs});
}finally{await browser.close();}
