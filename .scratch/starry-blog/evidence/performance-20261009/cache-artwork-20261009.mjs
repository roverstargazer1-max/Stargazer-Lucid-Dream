// Lossless delivery copies only. Original author assets stay untouched.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
import {chromium} from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const output='themes/stargazer-starfield/source/images/optimized';
await fs.mkdir(output,{recursive:true});
const copies=[['images/observation/silhouette-walk-frames.png','silhouette-walk-frames']];
for(const [src,name]of copies){const input=await fs.readFile(path.join('.preview/stargazer',src));const result=await sharp(input).keepIccProfile().webp({lossless:true,effort:6}).toBuffer();await fs.writeFile(`${output}/${name}.webp`,result);console.log({name,before:input.length,after:result.length});}
const browser=await chromium.launch({headless:true,executablePath:'/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4175/',{waitUntil:'load'});
 const source=await fs.readFile('.scratch/starry-blog/evidence/performance-20261009/cloud-artwork-baseline.js','utf8');
 const clouds=await page.evaluate(async source=>{const module=await import(URL.createObjectURL(new Blob([source.replace("'./dome.js'","'http://127.0.0.1:4175/js/starfield/dome.js'")+'\nexport {makeCloud};'],{type:'text/javascript'})));return[1,2,3].map(seed=>module.makeCloud(seed).canvas.toDataURL('image/png').split(',')[1]);},source);
 for(let i=0;i<clouds.length;i++){const image=Buffer.from(clouds[i],'base64');await fs.writeFile(`${output}/cloud-${i+1}.png`,image);console.log({cloud:i+1,bytes:image.length});}
}finally{await browser.close();}
