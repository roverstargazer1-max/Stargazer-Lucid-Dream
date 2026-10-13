import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless:true, executablePath:'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const summaries = [];
try {
  for (const [name, viewport] of [['desktop',{width:1440,height:1000}], ['mobile',{width:390,height:844}], ['narrow',{width:320,height:568}], ['landscape',{width:844,height:390}]]) {
    const page = await browser.newPage({viewport,reducedMotion:'reduce'});
    const errors = []; page.on('pageerror',error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4175/?motion=soft');
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'));
    assert.equal(await page.locator('body > .blog-theme-switch-fixed').isVisible(),true);
    const entry = await page.locator('#window-entry').boundingBox();
    await page.locator('#window-entry').click({position:{x:entry.width*.35,y:entry.height*.25}});
    await page.waitForFunction(() => document.body.dataset.room==='outside' && !document.body.dataset.arrival);
    await page.locator('body > .blog-theme-switch-fixed').waitFor({state:'hidden'});
    const measured = await page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,centerY:r.y+r.height/2}; };
      const legacy = document.querySelector('.blog-theme-switch-sky');
      const home = document.querySelector('#home');
      const r = legacy.getBoundingClientRect();
      return {viewport:{width:innerWidth,height:innerHeight}, legacy:rect(legacy), home:rect(home), brand:rect(document.querySelector('#brand')), fixedVisibility:getComputedStyle(document.querySelector('body > .blog-theme-switch-fixed')).visibility, hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a')?.classList.contains('blog-theme-switch-sky'), overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(measured.fixedVisibility,'hidden');
    assert.ok(Math.abs(measured.legacy.centerY-measured.home.centerY)<1);
    assert.ok(measured.legacy.x>=measured.home.right+4);
    assert.ok(measured.legacy.right<=viewport.width-15);
    assert.ok(measured.brand.right<measured.home.x);
    assert.ok(measured.legacy.height>=43.9);
    assert.equal(measured.hit,true);
    assert.equal(measured.overflow,false);
    await page.screenshot({path:fileURLToPath(new URL(`${name}-recheck.png`,dir))});
    if(name==='desktop') {
      await page.locator('.blog-theme-switch-sky').click();
      await page.waitForURL('**/legacy/?motion=soft');
      await page.waitForSelector('.kira-posts');
      await page.locator('.blog-theme-switch-legacy.blog-theme-switch-fixed').click();
      await page.waitForURL('http://127.0.0.1:4175/?motion=soft');
      await page.waitForFunction(() => document.body.dataset.room==='inside');
    }
    assert.deepEqual(errors,[]);
    summaries.push({name,passed:true,...measured,errors});
    await page.close();
  }
  await fs.writeFile(new URL('recheck-summary.json',dir),JSON.stringify({date:'2026-10-12',themeRoundTripPassed:true,viewports:summaries},null,2));
  console.log(JSON.stringify(summaries));
} finally { await browser.close(); }
