import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.PLAYWRIGHT_PATH||path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(runtime).href);
const executablePath=process.env.CHROMIUM_PATH||(process.platform==='darwin'?path.join(homedir(),'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'):undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const output=new URL('./',import.meta.url);
const metrics=async(page,title)=>page.locator('#search-results').evaluate((list,title)=>{
 const row=[...list.querySelectorAll('.search-result')].find(row=>row.querySelector('.search-result-name > span').textContent===title);
 const a=list.getBoundingClientRect(),b=row.getBoundingClientRect();
 return{scrollTop:list.scrollTop,listTop:a.top,listBottom:a.bottom,rowTop:b.top,rowBottom:b.bottom,fullyVisible:b.top>=a.top-1&&b.bottom<=a.bottom+1,highlighted:row.classList.contains('is-highlighted')};
},title);
try{
 const page=await browser.newPage({viewport:{width:1440,height:700}});
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4175/')+'?motion=soft');
 await page.waitForSelector('body.starry-ready',{state:'attached'});
 await page.locator('#window-entry').evaluate(el=>el.click());
 await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
 await page.locator('#search-entry').click();
 await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
 await page.locator('#search-index-toggle').click();await page.waitForTimeout(700);
 await page.locator('#search-results').evaluate(el=>{el.scrollTop=0;});
 const before=await metrics(page,'随笔1');assert.equal(before.fullyVisible,false);
 await page.getByRole('button',{name:/^阅读：随笔1，/}).hover();await page.waitForTimeout(700);
 const after=await metrics(page,'随笔1');
 console.log(JSON.stringify({before,after}));
 await page.screenshot({path:new URL('desktop.png',output).pathname});
 await fs.writeFile(new URL('reproduction.json',output),JSON.stringify({before,after},null,2));
 assert.equal(after.highlighted,true,'the matching index row must be highlighted');
 assert.equal(after.fullyVisible,true,'hovering the article star must reveal the entire matching index row');
}finally{await browser.close();}
