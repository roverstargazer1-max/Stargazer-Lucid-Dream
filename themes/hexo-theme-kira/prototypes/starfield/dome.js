// Shared hemisphere geometry: +Y is zenith; azimuth 0 faces +Z (north).
export const DOME_RADIUS=6000;
export const HOME_ELEVATION=.43;
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function direction(azimuth,elevation,radius=1){
  const c=Math.cos(elevation);
  return {x:Math.sin(azimuth)*c*radius,y:Math.sin(elevation)*radius,z:Math.cos(azimuth)*c*radius};
}
export function angles(p){return {azimuth:Math.atan2(p.x,p.z),elevation:Math.atan2(p.y,Math.hypot(p.x,p.z))};}
export function viewRay(x,y,camera,{cx,cy,focal}){
  const rx=(x-cx)/focal,ry=(cy-y)/focal;
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch),ca=Math.cos(camera.yaw),sa=Math.sin(camera.yaw);
  const y0=ry*cp+sp,z0=cp-ry*sp;
  const ray={x:rx*ca+z0*sa,y:y0,z:z0*ca-rx*sa};
  const length=Math.hypot(ray.x,ray.y,ray.z);
  return {x:ray.x/length,y:ray.y/length,z:ray.z/length};
}
export function domeIntersection(origin,ray,radius=DOME_RADIUS){
  const b=origin.x*ray.x+origin.y*ray.y+origin.z*ray.z;
  const c=origin.x**2+origin.y**2+origin.z**2-radius**2;
  const t=-b+Math.sqrt(Math.max(0,b*b-c));
  return {x:origin.x+ray.x*t,y:origin.y+ray.y*t,z:origin.z+ray.z*t};
}
export function projectDome(point,camera,{cx,cy,focal}){
  const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;
  const ca=Math.cos(camera.yaw),sa=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const rx=dx*ca-dz*sa,rz=dx*sa+dz*ca,ry=dy*cp-rz*sp,depth=dy*sp+rz*cp;
  return depth>24?{x:cx+rx*focal/depth,y:cy-ry*focal/depth,depth,scale:focal/depth}:null;
}
const initialAngles=[[-14,30],[17,23],[65,20],[88,45],[-26,49],[122,23],[158,53],[193,18],[221,44],[261,25],[302,50],[336,68],[30,78],[148,79],[242,74],[355,14]];
export function arrangeDome(articles){
  articles.forEach((article,i)=>{
    const [az,el]=initialAngles[i]||[i*137.508%360,25+i*17%60];
    const p=direction(az*Math.PI/180,el*Math.PI/180,DOME_RADIUS);
    article.position=[p.x,p.y,p.z];
  });
}
export function domePosition(article,index,mode){
  if(mode==='relation')return {x:article.position[0],y:article.position[1],z:article.position[2]};
  // A continuous dated spiral climbs from the horizon toward the zenith.
  return direction(index*.52-.3,.24+1.23*(1-Math.exp(-index/16)),DOME_RADIUS);
}
export function domeDestination(point,camera){
  const a=angles(point),origin=direction(a.azimuth,a.elevation,900);
  return {...origin,yaw:camera.yaw+wrapAngle(a.azimuth-camera.yaw),pitch:clamp(a.elevation-.075,0,Math.PI/2),zoom:1.65};
}
export function growDomeArticle(articles,edges,{id,importance='ordinary',isolated=false}){
  let seed=0;for(const ch of id)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const degree=new Map(articles.map(a=>[a.id,0]));
  edges.forEach(([a,b])=>{degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);});
  for(let attempt=0;attempt<800;attempt++){
    const p=direction(random()*Math.PI*2,Math.asin(.22+random()*.765),DOME_RADIUS);
    const neighbors=articles.map(a=>({a,d:Math.hypot(p.x-a.position[0],p.y-a.position[1],p.z-a.position[2])})).sort((a,b)=>a.d-b.d);
    if(neighbors[0]?.d<(isolated?1800:1050))continue;
    const reachable=neighbors.filter(({a,d})=>!a.isolated&&degree.get(a.id)<3&&d<3400);
    if(!isolated&&!reachable.length)continue;
    return {article:{id,position:[p.x,p.y,p.z],importance,isolated},edges:isolated?[]:reachable.slice(0,1).map(({a})=>[id,a.id])};
  }
  return null;
}
