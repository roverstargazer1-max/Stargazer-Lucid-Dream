import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:"C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"});
const index=JSON.parse(await fs.readFile('.preview/stargazer/starry/index.json','utf8'));
const article=index.articles.find(x=>x.title.includes('活在真实'));
const results=[];
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}],['landscape',{width:844,height:390}]]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4175/'+article.path,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#reader')?.open&&document.body.dataset.reading==='open');
 await page.screenshot({path:`.scratch/starry-blog/evidence/article-page-20261009/${name}-start.png`});
 const state=()=>page.evaluate(()=>{const s=document.querySelector('#reading-scroll'),c=document.querySelector('#reader-content'),j=document.querySelector('#reading-journey'),w=document.querySelector('.reading-walker'),r=document.querySelector('.reading-rail'),t=document.querySelector('#reader-title');return {percent:j.getAttribute('aria-valuenow'),fraction:+j.style.getPropertyValue('--reading-fraction'),overflow:s.scrollWidth>s.clientWidth,contentBottom:c.getBoundingClientRect().bottom-s.getBoundingClientRect().top+s.scrollTop,viewport:s.clientHeight,scrollTop:s.scrollTop,walker:w.getBoundingClientRect().x+w.getBoundingClientRect().width/2,railStart:r.getBoundingClientRect().left,railEnd:r.getBoundingClientRect().right,titleTop:t.getBoundingClientRect().top,titleBottom:t.getBoundingClientRect().bottom}});
 const start=await state();
 await page.evaluate(()=>{const s=document.querySelector('#reading-scroll'),c=document.querySelector('#reader-content');s.scrollTop=(c.getBoundingClientRect().bottom-s.getBoundingClientRect().top+s.scrollTop-s.clientHeight)/2});
 await page.waitForFunction(()=>document.querySelector('#reading-journey').getAttribute('aria-valuenow')==='50');
 await page.screenshot({path:`.scratch/starry-blog/evidence/article-page-20261009/${name}-half.png`});const half=await state();
 await page.evaluate(()=>{document.querySelector('#reading-scroll').scrollTop=1e8});
 await page.waitForFunction(()=>document.querySelector('#reading-journey').getAttribute('aria-valuenow')==='100');
 await page.screenshot({path:`.scratch/starry-blog/evidence/article-page-20261009/${name}-end.png`});const end=await state();
 await page.locator('#close-reader').click();await page.waitForFunction(()=>!document.querySelector('#reader').open);
 results.push({name,start,half,end,closed:true,errors});await page.close();
}
await fs.writeFile('.scratch/starry-blog/evidence/article-page-20261009/browser-checks.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));await browser.close();
