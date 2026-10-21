import {chromium} from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const {articles}=JSON.parse(await fs.readFile(new URL('../../../../.preview/stargazer/starry/index.json',import.meta.url)));
const values=['1.0','2.5','4.0'],report=[];
const profiles=[
 ['desktop-full',{width:1440,height:1000},false,'full','no-preference'],
 ['desktop-soft',{width:1440,height:1000},false,'soft','no-preference'],
 ['small-desktop',{width:1024,height:768},false,'full','no-preference'],
 ['mobile',{width:390,height:844},true,'full','no-preference'],
 ['narrow',{width:320,height:568},true,'full','no-preference'],
 ['landscape',{width:844,height:390},true,'full','no-preference'],
 ['reduced',{width:1440,height:1000},false,'full','reduce'],
];
try{
 for(const[name,viewport,touch,motion,reducedMotion]of profiles){
  const page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch,reducedMotion}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:4175/?motion=${motion}`);
  await page.waitForFunction(()=>document.body.classList.contains('starry-ready'));
  await page.locator('#window-entry').click({position:{x:40,y:40}});
  await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
  await page.locator('#search-entry').click();
  await page.waitForFunction(()=>!document.querySelector('#star-search').dataset.motion);
  await page.waitForTimeout(450);
  const results=page.locator('.search-result'),checks=[];
  const click=async button=>touch?button.tap({timeout:2000}):button.click({timeout:2000});
  const magnitude=value=>page.locator(`[data-filter=magnitude] button[data-value="${value}"]`);
  const hit=async button=>button.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el;});
  const checkOptions=async(year='')=>{
   const subset=articles.filter(a=>!year||a.date.startsWith(year));
   for(const value of values){
    const button=magnitude(value);
    assert.ok(await hit(button),`${name}: ${value} is covered by another layer`);
    await click(button);
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    const expected=subset.filter(a=>Number(a.magnitude)===Number(value));
    assert.equal(await results.count(),expected.length,`${name}: ${year} / ${value} results`);
    const ids=await results.evaluateAll(rows=>rows.map(el=>el.dataset.articleId).sort());
    assert.deepEqual(ids,expected.map(a=>a.id).sort());
    checks.push({year,magnitude:value,count:expected.length,realPointer:true});
    await click(button);
    assert.equal(await button.getAttribute('aria-pressed'),'false');
    assert.equal(await results.count(),subset.length);
   }
  };
  await checkOptions();
  const year=[...new Set(articles.map(a=>a.date.slice(0,4)))].sort()[0];
  const yearButton=page.locator(`[data-filter=year] button[data-value="${year}"]`);
  await click(yearButton);await checkOptions(year);await click(yearButton);
  const keywordArticle=articles.find(a=>a.magnitude===4);
  await page.locator('#search-query').fill(keywordArticle.catalogNumber);
  await click(magnitude('4.0'));assert.equal(await results.count(),1);
  await click(magnitude('2.5'));assert.equal(await results.count(),0);
  await click(magnitude('2.5'));assert.equal(await results.count(),1);
  await page.locator('#search-clear').click();assert.equal(await results.count(),articles.length);
  for(const value of values){
   const button=magnitude(value);await button.focus();await button.press('Enter');
   assert.equal(await button.getAttribute('aria-pressed'),'true');await button.press('Enter');
   assert.equal(await button.getAttribute('aria-pressed'),'false');
  }
  // The filter fix must leave real star points clickable in the circular map.
  const visibleStar=await page.locator('.search-map-star:not(:disabled)').evaluateAll(stars=>stars.find(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.search-map-star')===el;})?.dataset.articleId);
  assert.ok(visibleStar);await click(page.locator(`.search-map-star[data-article-id="${visibleStar}"]`));
  await page.waitForFunction(()=>document.body.dataset.reading==='open');
  await page.locator('#close-reader').click();
  await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
  if(name==='desktop-full')await page.screenshot({path:new URL(`${name}.png`,import.meta.url).pathname});
  assert.deepEqual(errors,[]);
  report.push({name,checks,keywordIntersection:true,repeatClickClears:true,keyboard:true,mapStarStillClickable:true,errors});
  await fs.writeFile(new URL('browser-summary.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(name,{magnitudes:values,realPointerChecks:checks.length,keywordIntersection:true,keyboard:true,mapStarStillClickable:true});
  await page.close();
 }
}finally{await browser.close();}
