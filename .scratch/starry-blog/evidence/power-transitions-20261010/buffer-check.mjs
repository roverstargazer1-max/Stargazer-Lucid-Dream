import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baselineUrl=process.env.BASELINE_URL||'http://127.0.0.1:4187/';
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try {
  const page=await browser.newPage({viewport:{width:1680,height:970},deviceScaleFactor:2});
  await page.route('**/js/starfield/baseline-renderer.js',async route=>{
    const response=await route.fetch({url:new URL('js/starfield/dome-renderer.js',baselineUrl).href});
    await route.fulfill({response,body:await response.text()});
  });
  await page.goto(process.env.STARFIELD_TEST_URL||'http://127.0.0.1:4175/');
  await page.waitForSelector('body.starry-ready',{state:'attached'});
  const results=await page.evaluate(async()=>{
    const before=await import('/js/starfield/baseline-renderer.js');
    const after=await import('/js/starfield/dome-renderer.js');
    const {skyProjection}=await import('/js/starfield/camera-bounds.js');
    const image=new Image();image.src=document.body.dataset.skyImage;await image.decode();
    const results=[];
    for(const [width,height] of [[640,360],[390,844]]) {
      for(const cap of [1.5,1,.75,1.5]) {
        before.setRenderQuality(cap);after.setRenderQuality(cap);
        for(const pitch of [.43,1.45])for(const overlay of [false,true]) {
          const camera={x:-180,y:-50,z:-420,yaw:1.05,pitch,zoom:.72};
          const settings=skyProjection(width,height,camera.zoom);
          const pixels=[before,after].map(renderer=>{
            const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
            const ctx=canvas.getContext('2d');ctx.scale(2,2);
            assertAvailable(renderer.paintDomeEnvironment(ctx,width,height,camera,settings,image,overlay));
            return ctx.getImageData(0,0,canvas.width,canvas.height).data;
          });
          let changed=0,maxDelta=0;
          for(let i=0;i<pixels[0].length;i++)if(pixels[0][i]!==pixels[1][i]){changed++;maxDelta=Math.max(maxDelta,Math.abs(pixels[0][i]-pixels[1][i]));}
          results.push({width,height,cap,pitch,overlay,changed,maxDelta});
        }
      }
    }
    function assertAvailable(ready){if(!ready)throw Error('Scene unavailable');}
    return results;
  });
  await fs.writeFile('.scratch/starry-blog/evidence/power-transitions-20261010/buffer-summary.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({samples:results.length,changedChannels:results.reduce((sum,r)=>sum+r.changed,0),maximumDelta:Math.max(...results.map(r=>r.maxDelta))}));
  assert.ok(results.every(result=>result.changed===0),'Reused buffers must retain every original pixel across quality and viewport changes');
} finally {await browser.close();}
