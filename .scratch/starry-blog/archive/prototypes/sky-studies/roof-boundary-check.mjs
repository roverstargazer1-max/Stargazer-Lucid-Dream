import { readFileSync } from 'node:fs';
const source=readFileSync('themes/hexo-theme-kira/prototypes/starfield/art.js','utf8');
let failures=0;
for(const style of ['photo','anime','minimal','paper','pixel']){
const asset=readFileSync(`themes/hexo-theme-kira/prototypes/starfield/assets/${style==='photo'?'rooftop-v2':style==='anime'?'roof-stargazer-v9':`roof-${style}-v4`}.png`);
const plate={complete:true,naturalWidth:asset.readUInt32BE(16),naturalHeight:asset.readUInt32BE(20)};
const paintRoof=new Function('roofPlate','roofPath','roofStyle','roofImages','roofFrames','study',source.slice(source.indexOf('export function paintRoof')).replace('export function','return function'))(plate,{},style,new Map([[style,plate]]),new Map([[style,plate]]),()=>({roof:'none'}));
for(const [width,height] of [[1920,1301],[390,844]]){
 for(const yaw of [-.4,0,.4]) for(const pitch of [-.25,0,.25]){
  let x=0,y=0,scale=1,drawn=false;
  const ctx={save(){},restore(){},translate(a,b){x=a;y=b},scale(a){scale=a},clip(){},drawImage(){drawn=true}};
  paintRoof(ctx,width,height,{x:0,y:0,z:0,yaw,pitch});
  // Illustrated frames now feather their right edge to transparent; only the
  // opaque photo must span the viewport. Left/bottom remain anchored for all.
  if(drawn&&(x>.5||(style==='photo'&&x+plate.naturalWidth*scale<width-.5)||y+plate.naturalHeight*scale<height-.5)){
   failures++; console.log(`FAIL ${style} ${width}x${height} yaw=${yaw} pitch=${pitch}: exposed image edge`);
  }
 }
}
}
console.log(failures?`${failures} exposed roof edges`:'PASS: rotation exposes no roof image boundary');
process.exitCode=failures?1:0;
