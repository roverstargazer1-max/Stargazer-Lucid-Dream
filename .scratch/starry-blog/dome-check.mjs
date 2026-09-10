import assert from 'node:assert/strict';
import {DOME_RADIUS,arrangeDome,domePosition,domeDestination,viewRay,domeIntersection,projectDome,direction,growDomeArticle} from '../../themes/hexo-theme-kira/prototypes/starfield/dome.js';
import {articles} from '../../themes/hexo-theme-kira/prototypes/starfield/mock.js';
import {buildPaths} from '../../themes/hexo-theme-kira/prototypes/starfield/navigation.js';
arrangeDome(articles);
const settings={cx:720,cy:414,focal:1134};
for(const mode of ['relation','time'])for(const [i,a] of articles.entries()){
  const p=domePosition(a,i,mode);
  assert(Math.abs(Math.hypot(p.x,p.y,p.z)-DOME_RADIUS)<1e-8);
  assert(p.y>0,'Article outside upper hemisphere');
}
let cases=0;
for(const yaw of [0,.4,Math.PI,Math.PI*2,Math.PI*7.7])for(const pitch of [0,.5,Math.PI/2-1e-8,Math.PI/2]){
  const camera={...direction(yaw,pitch,900),yaw,pitch,zoom:1};
  for(const [x,y] of [[720,414],[1,1],[1439,899],[1000,310]]){
    const ray=viewRay(x,y,camera,settings),point=domeIntersection(camera,ray),projected=projectDome(point,camera,settings);
    assert(projected&&Math.abs(projected.x-x)<1e-7&&Math.abs(projected.y-y)<1e-7,'Inverse and forward projection disagree');
    const turn=projectDome(point,{...camera,yaw:yaw+Math.PI*2},settings);
    assert(Math.abs(turn.x-x)<1e-7&&Math.abs(turn.y-y)<1e-7,'360° seam');cases++;
  }
  for(const [i,a] of articles.entries()){
    const target=domePosition(a,i,'relation'),destination=domeDestination(target,camera);
    assert(Math.hypot(destination.x,destination.y,destination.z)<=1200);
    assert(Math.abs(destination.yaw-camera.yaw)<=Math.PI+1e-9);
    const hit=projectDome(target,destination,{...settings,focal:settings.focal*destination.zoom});
    assert(hit&&hit.x>0&&hit.x<1440&&hit.y>0&&hit.y<900,'Target not reachable');
  }
}
const before=JSON.stringify(articles.map(a=>a.position));
const edges=buildPaths(articles),grown=growDomeArticle(articles,edges,{id:'dome-growth-check'});
assert(grown);assert(Math.abs(Math.hypot(...grown.article.position)-DOME_RADIUS)<1e-8);assert(grown.article.position[1]>0);
assert.equal(JSON.stringify(articles.map(a=>a.position)),before,'Growth moved existing stars');
console.log(`${cases} ray/projection/360° cases passed; 16 articles in both hemisphere layouts, every target reachable from zenith and all azimuths; growth preserves the shell and old positions.`);
