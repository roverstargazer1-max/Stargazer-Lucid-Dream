import assert from 'node:assert/strict';
const { chromium } = await import(process.env.RUNNER_TEMP + '/starfield-browser/node_modules/playwright/index.mjs');
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try {
  for(const width of [1440,390]) for(const [version,port] of [['before',4188],['after',4187]]) {
    const context = await browser.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390});
    try {
      const page = await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+port+'/');
      await page.waitForSelector('body.starry-ready',{state:'attached'});
      await page.locator('#room-thought').click();
      await page.waitForFunction(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
      await page.locator('#search-entry').click();
      await page.waitForFunction(()=>document.querySelector('#star-search').open&&!document.querySelector('#star-search').dataset.motion);
      const link=page.locator('.search-result').first();
      const path=new URL(await link.getAttribute('href'),'http://local').pathname;
      await page.route(url=>url.pathname===path,async route=>{await new Promise(r=>setTimeout(r,400));await route.continue();});
      await page.evaluate(path=>{
        const trace=window.starryTiming={};
        document.addEventListener('click',ev=>{if(ev.target.closest('.search-result')) trace.click=performance.now();},{capture:true});
        const original=window.fetch;window.fetch=function(url,options){if(new URL(url,location.href).pathname===path)trace.request=performance.now();return original.call(this,url,options);};
        const modal=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='reader')trace.dialog=performance.now();return modal.call(this);};
      },path);
      await link.click();
      await page.waitForFunction(()=>document.body.dataset.reading==='open');
      const timing=await page.evaluate(()=>({toRequestMs:Math.round(window.starryTiming.request-window.starryTiming.click),toDialogMs:Math.round(window.starryTiming.dialog-window.starryTiming.click)}));
      assert.ok(Number.isFinite(timing.toRequestMs)&&Number.isFinite(timing.toDialogMs));assert.deepEqual(errors,[]);
      console.log('ARTICLE '+JSON.stringify({version,width,...timing}));
    } finally {await context.close();}
  }
} finally {await browser.close();}
