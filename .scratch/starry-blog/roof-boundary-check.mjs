import { readFileSync } from 'node:fs';
const source=readFileSync('themes/hexo-theme-kira/prototypes/starfield/art.js','utf8');
const paintRoof=new Function('roofPlate','roofPath',source.slice(source.indexOf('export function paintRoof')).replace('export function','return function'))({complete:true,naturalWidth:1672},{});
let failures=0;
for(const [width,height] of [[1920,1301],[390,844]]){
 for(const yaw of [-.4,0,.4]) for(const pitch of [-.25,0,.25]){
  let x=0,y=0,scale=1,drawn=false;
  const ctx={save(){},restore(){},translate(a,b){x=a;y=b},scale(a){scale=a},clip(){},drawImage(){drawn=true}};
  paintRoof(ctx,width,height,{x:0,y:0,z:0,yaw,pitch});
  if(drawn&&(x>.5||x+1672*scale<width-.5||y+941*scale<height-.5)){
   failures++; console.log(`FAIL ${width}x${height} yaw=${yaw} pitch=${pitch}: left=${x.toFixed(1)}, right=${(x+1672*scale).toFixed(1)}, bottom=${(y+941*scale).toFixed(1)}`);
  }
 }
}
console.log(failures?`${failures} exposed roof edges`:'PASS: rotation exposes no roof image boundary');
process.exitCode=failures?1:0;
