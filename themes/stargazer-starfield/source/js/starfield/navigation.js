// Spatial exploration routes are independent of author-written content relationships.
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const distance=(a,b)=>Math.hypot(...a.position.map((v,i)=>v-b.position[i]));
export const maxLinkDistance=3400;
export function buildTimePaths(orderedArticles){
  const connected=orderedArticles.filter(article=>!article.isolated);
  return connected.slice(1).map((article,index)=>[connected[index].id,article.id]);
}
export function degrees(articles,edges){
  const result=new Map(articles.map(a=>[a.id,0]));
  for(const [a,b] of edges){result.set(a,result.get(a)+1);result.set(b,result.get(b)+1);}return result;
}
export function buildPaths(articles){
  const edges=[],degree=degrees(articles,edges),pairs=[];
  for(let i=0;i<articles.length;i++)for(let j=i+1;j<articles.length;j++){
    const a=articles[i],b=articles[j],d=distance(a,b);
    if(!a.isolated&&!b.isolated&&d<=maxLinkDistance)pairs.push({a:a.id,b:b.id,d,score:d*(.85+(hash(a.id+b.id)%100)/330)});
  }
  pairs.sort((a,b)=>a.score-b.score);
  const parents=new Map(articles.map(a=>[a.id,a.id]));
  const root=id=>{while(parents.get(id)!==id)id=parents.get(id);return id;};
  const connect=p=>{edges.push([p.a,p.b]);degree.set(p.a,degree.get(p.a)+1);degree.set(p.b,degree.get(p.b)+1);parents.set(root(p.a),root(p.b));};
  // Give as many nodes as possible one route before introducing junctions.
  for(const p of pairs)if((!degree.get(p.a)||!degree.get(p.b))&&degree.get(p.a)<3&&degree.get(p.b)<3)connect(p);
  // Join reachable small groups rather than stranding the opening stars in a loop.
  for(const p of pairs)if(root(p.a)!==root(p.b)&&degree.get(p.a)<3&&degree.get(p.b)<3)connect(p);
  for(const p of pairs)if(degree.get(p.a)<2&&degree.get(p.b)<2&&!edges.some(e=>e[0]===p.a&&e[1]===p.b)&&hash(p.a+'extra'+p.b)%3===0)connect(p);
  return edges;
}
export function clipSegment(a,b,box){
  let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const [p,q] of [[-dx,a.x-box.left],[dx,box.right-a.x],[-dy,a.y-box.top],[dy,box.bottom-a.y]]){
    if(p===0){if(q<0)return null;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;
  }
  return {a:{x:a.x+lo*dx,y:a.y+lo*dy},b:{x:a.x+hi*dx,y:a.y+hi*dy},lo,hi};
}
export function crosses(a,b,c,d){
  const turn=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return turn(a,b,c)*turn(a,b,d)<0&&turn(c,d,a)*turn(c,d,b)<0;
}
