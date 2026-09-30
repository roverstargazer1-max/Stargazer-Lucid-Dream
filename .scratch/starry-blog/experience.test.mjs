import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewMemory,dockTarget} from '../../themes/hexo-theme-kira/prototypes/starfield/experience.js';
import {domeDestination,projectDome,direction} from '../../themes/hexo-theme-kira/prototypes/starfield/dome.js';

test('only completed presentations repeat; cancellation and retargeting cannot complete stale tokens',()=>{
  const memory=createPreviewMemory();
  const first=memory.begin('night');assert.equal(first.repeat,false);
  memory.cancel();assert.equal(memory.complete(first),false);
  const interrupted=memory.begin('night');assert.equal(interrupted.repeat,false);
  const other=memory.begin('letter');assert.equal(memory.complete(interrupted),false);
  assert.equal(memory.complete(other),true);
  assert.equal(memory.begin('night').repeat,false);
  const letter=memory.begin('letter');assert.equal(letter.repeat,true);
  memory.cancel();assert.equal(memory.begin('letter').repeat,true);
  assert.equal(createPreviewMemory().begin('letter').repeat,false,'refresh/new visit has no persisted memory');
});

test('docking preserves world positions and lands in the requested safe frame, including polar articles',()=>{
  for(const [w,h] of [[320,568],[342,740],[390,844],[430,932],[568,320],[844,390],[1123,631],[1440,900]]){
    const landscape=w>h&&h<=500,mobile=w<=760;
    const preview={left:landscape?w*.53-16:mobile?16:w*.63,top:mobile?h-72-Math.min(h*.44,h-288):h*.25};
    const target=dockTarget(w,h,preview);
    const camera={x:0,y:0,z:0,yaw:2,pitch:.43,zoom:1};
    const settings={cx:w*(mobile?.56:.5),cy:h*(mobile?.49:.46),focal:Math.min(w,h*1.2)*1.05*1.55};
    for(const elevation of [.24,.6,1.35,Math.PI/2]){
      const point=direction(5.8,elevation,6000),copy={...point};
      const next=domeDestination(point,camera,settings,target),p=projectDome(point,next,settings);
      assert.ok(Math.abs(p.x-target.x)<1e-6&&Math.abs(p.y-target.y)<1e-6,`${w}×${h} at ${elevation}`);
      assert.deepEqual(point,copy);assert.ok(p.depth>24);
    }
    assert.ok(target.x>=22&&target.x<=w-22&&target.y>=22&&target.y<=h-22);
  }
});
