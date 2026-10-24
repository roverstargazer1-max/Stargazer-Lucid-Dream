import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import('/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const [width,height,dpr,full]of [[1440,900,2,false],[1440,900,4,true],[390,844,3,false],[390,844,6,true]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:width<500,hasTouch:width<500}),requests=[];
  page.on('request',r=>{if(/(interface-entry-base-v1|\/optimized\/entry-base\.webp)/.test(r.url()))requests.push(new URL(r.url()).pathname);});
  await page.goto('http://127.0.0.1:4175/?motion=soft');await page.waitForSelector('body.starry-ready',{state:'attached'});
  await page.locator('#window-entry').click();await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
  await page.locator('#search-entry').waitFor({state:'visible'});
  const image=await page.locator('#search-entry .search-entry-disc img').first().evaluate(e=>({src:new URL(e.currentSrc).pathname,width:e.naturalWidth,complete:e.complete,slot:document.querySelector('#search-entry').getBoundingClientRect().width}));
  assert.equal(image.src.includes('/interface-entry-base-v1.webp'),!full); assert.equal(image.complete,true);assert.equal(requests.length,1,'sizes/srcset must select one candidate without a duplicate original request');
  results.push({viewportWidth:width,height,dpr,...image,requests});await page.close();
 }
}finally{await browser.close();await fs.writeFile(new URL('responsive-entry-summary.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
