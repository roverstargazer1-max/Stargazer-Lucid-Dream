import {direction,projectDome} from './dome.js';

// Small independent painted clouds. The same raster alpha drives paint and hit testing.
function makeCloud(seed){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=224;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,224);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+seed*43.3)*43758.5453;return n-Math.floor(n);};
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const noise=(x,y)=>{
    const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy);
    return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
  };
  const lobes=[[-.63,.21,.29,.29],[-.34,.02,.34,.43],[-.04,-.16,.30,.51],[.27,.06,.34,.38],[.58,.22,.31,.25],[-.42,.31,.32,.25],[.02,.35,.34,.25],[.40,.34,.30,.18]];
  for(let y=0;y<224;y++)for(let x=0;x<512;x++){
    const u=x/256-1,v=y/112-1,coarse=noise(u*11+9,v*9+7),fine=noise(u*41,v*31);
    let density=-1;
    for(const [cx,cy,rx,ry] of lobes){
      const offset=(hash(Math.round(cx*100),4)-.5)*.07;
      density=Math.max(density,1-((u-cx)/rx)**2-((v-cy-offset)/ry)**2);
    }
    density+=(coarse-.5)*.35+(fine-.5)*.09;
    const alpha=smooth(-.03,.20,density)*.84;
    if(!alpha)continue;
    const layer=smooth(.27,.40,coarse)*.45+smooth(.54,.64,coarse)*.55;
    const light=Math.min(1,Math.max(0,(.8-v)*.44+layer*.24));
    const i=(y*512+x)*4;
    pixels.data[i]=12+light*19;
    pixels.data[i+1]=32+light*35;
    pixels.data[i+2]=79+light*53;
    pixels.data[i+3]=alpha*255;
  }
  ctx.putImageData(pixels,0,0);
  const glow=document.createElement('canvas');glow.width=512;glow.height=224;
  const glowCtx=glow.getContext('2d');glowCtx.drawImage(canvas,0,0);
  glowCtx.globalCompositeOperation='source-atop';glowCtx.fillStyle='#83a8d230';glowCtx.fillRect(0,0,512,224);
  return {canvas,glow,alpha:pixels.data};
}

export function createInteractiveClouds(world){
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const clouds=[[-.38,.28,.36,.15],[1.94,.37,.40,.16],[4.18,.42,.44,.18]].map(([azimuth,elevation,width,height],i)=>{
    const button=document.createElement('button');button.className='cloud-target';button.hidden=true;
    button.setAttribute('aria-label',`轻触第 ${i+1} 朵云`);world.append(button);
    const cloud={id:i,azimuth,elevation,width,height,age:null,hover:0,sprite:makeCloud(i+1),button};
    button.onclick=e=>{if(e.detail===0)activate(cloud);};
    return cloud;
  });
  let frames=[],hovered=null,blocked=true;
  function activate(cloud){if(blocked||cloud.age!==null)return;cloud.age=0;}
  function hit(x,y){
    if(blocked)return null;
    for(const frame of [...frames].reverse()){
      const {a,b,c,d,tx,ty,cloud,opacity}=frame,det=a*d-b*c;
      const u=(d*(x-tx)-c*(y-ty))/det,v=(-b*(x-tx)+a*(y-ty))/det;
      if(u<0||u>=512||v<0||v>=224)continue;
      if(cloud.sprite.alpha[(Math.floor(v)*512+Math.floor(u))*4+3]*opacity>55)return cloud;
    }
    return null;
  }
  return {
    hover(x,y,enabled){hovered=enabled?hit(x,y)?.id:null;return hovered!==null&&hovered!==undefined;},
    clearHover(){hovered=null;},
    tap(x,y){const cloud=hit(x,y);if(!cloud)return false;activate(cloud);return true;},
    update(dt,isBlocked){
      blocked=isBlocked;
      if(blocked){hovered=null;return;}
      for(const cloud of clouds){
        if(cloud.age!==null){cloud.age+=dt;if(cloud.age>=(preference.matches?.85:7))cloud.age=null;}
        const target=hovered===cloud.id||cloud.button.matches(':focus-visible')?1:0;
        cloud.hover+=(target-cloud.hover)*(1-Math.exp(-dt*6));
      }
    },
    paint(ctx,w,h,camera,settings){
      frames=[];
      const visibleButtons=new Set();
      for(const cloud of clouds){
        const age=cloud.age||0;
        const strength=cloud.age===null?0:preference.matches?Math.sin(Math.PI*Math.min(1,age/.85)):age<1.2?Math.sin(age/1.2*Math.PI/2):((7-age)/5.8)**2;
        const shift=preference.matches?0:strength;
        const az=cloud.azimuth+shift*.043,el=cloud.elevation+shift*.012;
        const cw=cloud.width*(1+shift*.13),ch=cloud.height*(1+shift*.08);
        const project=(a,e)=>projectDome(direction(a,e,5300),camera,settings);
        const center=project(az,el),left=project(az-cw/2,el),right=project(az+cw/2,el),top=project(az,el+ch/2),bottom=project(az,el-ch/2);
        if(!center||!left||!right||!top||!bottom)continue;
        const a=(right.x-left.x)/512,b=(right.y-left.y)/512,c=(bottom.x-top.x)/224,d=(bottom.y-top.y)/224;
        const tx=center.x-a*256-c*112,ty=center.y-b*256-d*112;
        if(Math.abs(a*d-b*c)<.0001||Math.hypot(a,b)*512>w*2)continue;
        const corners=[[0,0],[512,0],[0,224],[512,224]].map(([x,y])=>({x:a*x+c*y+tx,y:b*x+d*y+ty}));
        if(corners.every(p=>p.x<0)||corners.every(p=>p.x>w)||corners.every(p=>p.y<0)||corners.every(p=>p.y>h))continue;
        const opacity=1-strength*(preference.matches?.25:.65);
        frames.push({a,b,c,d,tx,ty,cloud,opacity});
        ctx.save();ctx.transform(a,b,c,d,tx,ty);ctx.globalAlpha=opacity;
        ctx.drawImage(cloud.sprite.canvas,0,0);
        if(cloud.hover>.01){ctx.globalAlpha=opacity*cloud.hover*.30;ctx.drawImage(cloud.sprite.glow,0,0);}
        ctx.restore();
        if(!blocked&&center.x>=22&&center.x<=w-22&&center.y>=100&&center.y<=h-65)visibleButtons.add(cloud.id);
        cloud.button.style.left=center.x+'px';cloud.button.style.top=center.y+'px';
      }
      for(const cloud of clouds)cloud.button.hidden=!visibleButtons.has(cloud.id);
    }
  };
}
