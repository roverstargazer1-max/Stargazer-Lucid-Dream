// Factor the native white glyph from its blue frame; no icon is redrawn.
// Run with pngjs available on NODE_PATH. Normal builds use the saved PNGs.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const root=new URL('../../../../assets/检索页/v3/',import.meta.url);
const input=fs.readFileSync(new URL('frame-v3.png',root));
const source=PNG.sync.read(input);
const background=new PNG({width:source.width,height:source.height});
source.data.copy(background.data);
const glyph=new PNG({width:source.width,height:source.height});
const mask=new Set();
for(let y=30;y<92;y++)for(let x=1090;x<1160;x++){
 const p=y*source.width+x;
 if(source.data[p*4]>36&&source.data[p*4+3]>0)mask.add(p);
}
assert.ok(mask.size>400&&mask.size<800);
const candidates=new Map();
for(const p of mask){
 const x=p%source.width,y=Math.floor(p/source.width),i=p*4;
 const samples=[];
 for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
  if(!dx&&!dy)continue;
  const q=(y+dy)*source.width+x+dx;
  if(mask.has(q)||source.data[q*4+3]<64)continue;
  samples.push({q,d:dx*dx+dy*dy});
 }
 samples.sort((a,b)=>a.d-b.d);
 const nearest=samples.slice(0,8),weights=nearest.map(s=>1/s.d),weight=weights.reduce((a,b)=>a+b,0);
 const blue=[0,1,2].map(c=>Math.round(nearest.reduce((sum,s,n)=>sum+source.data[s.q*4+c]*weights[n],0)/weight));
 const original=[0,1,2].map(c=>source.data[i+c]);
 const required=Math.max(...original.map((v,c)=>v>=blue[c]?(v-blue[c])/Math.max(1,255-blue[c]):(blue[c]-v)/Math.max(1,blue[c])));
 const originalAlpha=source.data[i+3]/255;
 const glyphAlpha=Math.min(source.data[i+3],Math.ceil(originalAlpha*required*255))/255;
 const ratio=glyphAlpha/originalAlpha;
 const foreground=original.map((v,c)=>Math.max(0,Math.min(255,Math.round(blue[c]+(v-blue[c])/ratio))));
 if(original[0]<70)continue;
 candidates.set(p,{blue,foreground,alpha:Math.round(glyphAlpha*255),backgroundAlpha:glyphAlpha===1?255:Math.round((originalAlpha-glyphAlpha)/(1-glyphAlpha)*255)});
}
// Keep only bright components attached to the native white strokes. Blue
// halftone specks are part of the stationary frame, even inside the icon bounds.
const selected=new Set();
const queue=[...candidates.keys()].filter(p=>source.data[p*4]>180&&source.data[p*4+1]>210);
for(let n=0;n<queue.length;n++){
 const p=queue[n];if(selected.has(p))continue;selected.add(p);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const q=p+dy*source.width+dx;if(candidates.has(q)&&!selected.has(q))queue.push(q);
 }
}
for(const p of selected){
 const i=p*4,part=candidates.get(p);
 for(let c=0;c<3;c++){background.data[i+c]=part.blue[c];glyph.data[i+c]=part.foreground[c];}
 background.data[i+3]=part.backgroundAlpha;glyph.data[i+3]=part.alpha;
}
let maxDifference=0;
for(let i=0;i<source.data.length;i+=4){
 const a=source.data[i+3]/255,b=background.data[i+3]/255,g=glyph.data[i+3]/255;
 for(const underneath of [[0,0,0],[255,255,255],[0,27,135]])for(let c=0;c<3;c++){
  const original=source.data[i+c]*a+underneath[c]*(1-a);
  const composed=glyph.data[i+c]*g+(background.data[i+c]*b+underneath[c]*(1-b))*(1-g);
  maxDifference=Math.max(maxDifference,Math.abs(Math.round(original)-Math.round(composed)));
 }
}
assert.ok(maxDifference<=2,`Native reconstruction differs by ${maxDifference}`);
fs.writeFileSync(new URL('frame-background-v3.png',root),PNG.sync.write(background));
fs.writeFileSync(new URL('magnifier-v3.png',root),PNG.sync.write(glyph));
const summary={sourceSHA256:crypto.createHash('sha256').update(input).digest('hex'),glyphPixels:selected.size,maxNativeRGBDifference:maxDifference};
fs.writeFileSync(new URL('./asset-summary.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(summary);
