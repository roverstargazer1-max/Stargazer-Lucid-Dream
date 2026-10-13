// Opt-in, identical observer for the frozen and working scene. No per-frame DOM work.
const panel=document.createElement('aside');
panel.style.cssText='position:fixed;z-index:100;left:16px;bottom:92px;padding:10px;background:#071831;color:#e3e8ed;font:12px sans-serif;max-width:320px';
panel.innerHTML='<button id="frame-sample" style="font:inherit;color:inherit;padding:8px">记录 5 秒可见页面帧间隔</button><pre id="frame-result" style="white-space:pre-wrap;max-height:220px;overflow:auto"></pre>';
document.body.append(panel);
const button=panel.querySelector('button'),output=panel.querySelector('pre');
button.onclick=()=>{
  if(document.visibilityState!=='visible'){output.textContent='页面不可见，不记录。';return;}
  button.disabled=true;output.textContent='记录中';
  const intervals=[];let start=null,last=null,invalid=false;
  function frame(now){
    if(start===null)start=now;
    if(document.visibilityState!=='visible')invalid=true;
    if(last!==null)intervals.push(now-last);last=now;
    if(now-start<5000){requestAnimationFrame(frame);return;}
    const sorted=intervals.slice().sort((a,b)=>a-b),pick=p=>Number(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))].toFixed(2));
    const result={url:location.href,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,visibleThroughout:!invalid,elapsed:Math.round(now-start),frames:intervals.length,p50:pick(.5),p95:pick(.95),over50ms:intervals.filter(t=>t>50).length};
    output.textContent=JSON.stringify(result,null,2);button.disabled=false;
  }
  requestAnimationFrame(frame);
};
