import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.RUNNER_TEMP + '/starfield-browser/node_modules/playwright/index.mjs');
const server = spawn(process.execPath, ['.scratch/starry-blog/evidence/performance-20261024/serve-production.mjs', '4187', '.preview/stargazer'], { stdio: ['ignore','pipe','inherit'] });
await new Promise((resolve,reject) => { server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code))); });
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader'] });
const summary = [];
async function check(name, url, width, height, candidate) {
  const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1, hasTouch:width<600 });
  try {
    const page = await context.newPage();
    const errors = [];
    let docs = 0, readerFragments = 0, fullPageFetches = 0;
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (path.includes('/starry/articles/') && path.endsWith('.json') && response.status() === 200) readerFragments++;
      if (response.request().resourceType() === 'fetch' && /^\/\d{4}\//.test(path)) fullPageFetches++;
    });
    page.on('request', req => { if(new URL(req.url()).pathname.endsWith('/starry/search.json')) docs++; });
    page.on('pageerror', err=> errors.push(err.message));
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.frameCallbacks = 0;
      window.requestAnimationFrame = callback => raf(now => { window.frameCallbacks++; callback(now); });
    });
    const response = await page.goto(url, {waitUntil:'domcontentloaded',timeout:25000});
    assert.equal(response.status(),200);
    await page.waitForSelector('body.starry-ready',{state:'attached',timeout:22000});
    const readyMs = Math.round(await page.evaluate(()=>performance.now()));
    async function idle() {
      await page.waitForTimeout(750);
      const from = await page.evaluate(()=>window.frameCallbacks);
      await page.waitForTimeout(2000);
      return await page.evaluate(()=>window.frameCallbacks)-from;
    }
    const room = await idle();
    await page.locator('#room-thought').click();
    await page.waitForFunction(()=>document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    await page.locator('#search-entry').click();
    const settled = () => page.waitForFunction(()=>document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
    await settled();
    const chart = await idle(), docsOnOpen = docs;
    assert.ok(await page.locator('.search-result').count()>0);
    await page.locator('[data-filter="magnitude"] [data-value="1.0"]').click();
    if(candidate) assert.equal(docs,0);
    await page.locator('[data-filter="magnitude"] [data-value="1.0"]').click();
    await page.locator('#search-query').fill('SLD-0001');
    await page.waitForFunction(()=>document.getElementById('search-results').children.length===1 && !document.getElementById('search-feedback').textContent.includes('准备'));
    assert.equal(docs,1);
    const entry = page.locator('.search-result').first();
    const articlePath = new URL(await entry.getAttribute('href'),url).pathname;
    await entry.click();
    await page.waitForFunction(()=>document.body.dataset.reading==='open');
    const articleTitle=await page.locator('#reader #reader-title').textContent();
    assert.ok(articleTitle);
    if (candidate) {
      assert.equal(readerFragments, 1, 'read the generated article fragment');
      assert.equal(fullPageFetches, 0, 'avoid the full page fetch');
    }
    await page.locator('#close-reader').click();
    await settled();
    assert.equal(await page.locator('#search-query').inputValue(),'SLD-0001');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#star-search').open);
    await page.locator('#home').click();
    await page.waitForFunction(()=>document.body.dataset.room==='inside');
    await page.goto(new URL(articlePath,url).href,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body.dataset.reading==='open',{},{timeout:25000});
    assert.equal(await page.locator('#reader #reader-title').textContent(),articleTitle);
    await page.locator('#close-reader').click();
    await page.waitForFunction(()=>!document.querySelector('#reader').open);
    assert.deepEqual(errors,[]);
    if(candidate){assert.equal(room,0);assert.equal(chart,0);}
    const result={name,width,readyMs,roomCallbacks2s:room,chartCallbacks2s:chart,docsOnOpen,readerFragments,fullPageFetches,articleTitle,errors};
    console.log('PERF '+JSON.stringify(result));summary.push(result);
  } finally { await context.close(); }
}
try {
  for(const [name,url,candidate] of [['local','http://127.0.0.1:4187/',true],['production','https://blog.stargazer-luciddream.top/',false],['preview','https://deploy-preview-13--stargazer-luciddream.netlify.app/',true]]) {
    for(const [w,h] of [[1440,900],[390,844]]) {
      try { await check(name,url,w,h,candidate); } catch(err) { console.error('QA failure '+name+' '+w,err);process.exitCode=1; }
    }
  }
} finally { await browser.close();server.kill(); }
