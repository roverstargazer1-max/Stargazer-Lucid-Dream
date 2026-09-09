// Round one: static light and palette studies. No time input or twinkle yet.
export const studies={
  ink:{name:'01 · 墨蓝冷夜',base:'#05070b',lift:'#111820',edge:'#030406',cloud:'#75818d',stars:'#ccd1d5',haze:'#655c49',roof:'saturate(0.42) brightness(0.78)',warm:[229,217,190],cool:[204,217,229]},
  umber:{name:'02 · 烟褐旧梦',base:'#090909',lift:'#201d1b',edge:'#040505',cloud:'#8d8379',stars:'#d5d0c5',haze:'#8b7152',roof:'sepia(0.28) saturate(0.36) brightness(0.76)',warm:[235,215,180],cool:[212,216,217]}
};
let current='ink';
export function setStudy(key){current=studies[key]?key:'ink';}
export function study(){return studies[current];}
function hash(id){let n=2166136261;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function starIdentity(id,forced){
  const seed=hash(id),value=(seed%1000)/1000;
  const kind=forced??(seed%17===0?'double':seed%11===0?'bright':seed%4===0?'warm':'pin');
  return {kind,size:.86+value*.48,light:.72+((seed>>>10)%100)/360,angle:((seed>>>6)%100)*.063,spread:7+((seed>>>16)%7)};
}
const rgba=(c,a)=>`rgba(${c.join(',')},${a})`;
export function paintArticleLight(ctx,x,y,id,{depth=1800,active=false,hover=false,kind,zoom=1}={}){
  const star=starIdentity(id,kind),palette=study();
  const color=star.kind==='warm'?palette.warm:palette.cool;
  const proximity=Math.max(.78,Math.min(1.2,Math.sqrt(1800/depth)));
  const r=star.size*proximity,energy=star.light*(active?1.18:hover?1.10:1);
  ctx.save();ctx.translate(x,y);ctx.scale(zoom,zoom);
  const point=(px,py,radius,power,spread)=>{
    const glow=ctx.createRadialGradient(px,py,0,px,py,spread);
    glow.addColorStop(0,rgba(color,.38*power));glow.addColorStop(.12,rgba(color,.15*power));
    glow.addColorStop(.38,rgba(color,.035*power));glow.addColorStop(1,rgba(color,0));
    ctx.fillStyle=glow;ctx.fillRect(px-spread,py-spread,spread*2,spread*2);
    const core=ctx.createRadialGradient(px,py,0,px,py,radius*1.7);
    core.addColorStop(0,`rgba(255,252,242,${Math.min(.98,power)})`);
    core.addColorStop(.35,rgba(color,.85*power));core.addColorStop(1,rgba(color,0));
    ctx.fillStyle=core;ctx.fillRect(px-radius*2,py-radius*2,radius*4,radius*4);
  };
  point(0,0,r,energy,star.kind==='warm'?star.spread*1.2:star.spread);
  if(star.kind==='double')point(Math.cos(star.angle)*5.4,Math.sin(star.angle)*5.4,r*.48,energy*.55,4);
  if(star.kind==='bright'){
    ctx.rotate(.08);ctx.lineWidth=.38;
    for(const [dx,dy] of [[5,0],[0,3.4]]){
      const ray=ctx.createLinearGradient(-dx,-dy,dx,dy);ray.addColorStop(0,rgba(color,0));ray.addColorStop(.5,rgba(color,.38));ray.addColorStop(1,rgba(color,0));
      ctx.strokeStyle=ray;ctx.beginPath();ctx.moveTo(-dx,-dy);ctx.lineTo(dx,dy);ctx.stroke();
    }
  }
  ctx.restore();
}
export function paintSpecimens(canvas){
  const width=Math.round(canvas.clientWidth)||940,columns=width<600?2:4;
  const cell=width/columns,rowHeight=360,rows=4/columns,height=rows*rowHeight+120;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=canvas.getContext('2d');
  canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';ctx.scale(dpr,dpr);
  ctx.fillStyle=study().base;ctx.fillRect(0,0,width,height);
  const labels=[['pin','清冷针点','小核心 · 清晰边缘'],['warm','温暖柔光','暖白 · 宽散射'],['double','微弱双星','主光点 · 微小伴星'],['bright','明亮主星','短星芒 · 少量出现']];
  for(let i=0;i<4;i++){
    const x=cell*(i%columns+.5),y=Math.floor(i/columns)*rowHeight;
    ctx.fillStyle='#b7b7b2';ctx.font='16px serif';ctx.textAlign='center';ctx.fillText(labels[i][1],x,y+35);
    paintArticleLight(ctx,x,y+92,'sample-'+i,{kind:labels[i][0]});
    paintArticleLight(ctx,x,y+220,'sample-'+i,{kind:labels[i][0],zoom:5});
    ctx.fillStyle='#777c80';ctx.font='11px sans-serif';ctx.fillText('原始大小',x,y+125);ctx.fillText('5 倍细节',x,y+294);ctx.fillText(labels[i][2],x,y+325);
  }
  const bottom=rows*rowHeight;
  ctx.strokeStyle='#ffffff10';ctx.beginPath();ctx.moveTo(15,bottom);ctx.lineTo(width-15,bottom);ctx.stroke();
  ctx.fillStyle='#858a90';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('同类也有差异 / 同一身份保持同一外观',15,bottom+28);
  for(let i=0;i<12;i++)paintArticleLight(ctx,(i+.5)*width/12,bottom+77,'identity-'+i);
}
