import test from 'node:test';
import assert from 'node:assert/strict';
import {RESCUE_MAPS,startRescue,stepRescue,traceRescue} from './rescueAdventure';
import {planRescueMotion,sampleRescueMotion} from './rescueSpatialMotion';
import {rescueWorldPosition} from './rescueSpatialPresentation';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
test('walk is bounded to adjacent legal tiles and ends exactly at the logical target',()=>{
 for(const map of RESCUE_MAPS){const initial=startRescue(map),next=stepRescue(map,initial,'up'),m=planRescueMotion(map,initial,next,true,false);assert.equal(m.kind,'walk');assert.equal(m.duration,220);assert.equal(m.heading,Math.PI);const p=sampleRescueMotion(m,110);assert.equal(p.x,m.from.x);assert.equal(p.z,(m.from.z+m.to.z)/2);assert.equal(p.done,false);const end=sampleRescueMotion(m,999);assert.deepEqual({x:end.x,z:end.z},rescueWorldPosition(map,next.row,next.col));assert.equal(end.done,true);assert.equal(end.bob<1e-9,true);
 assert.equal(planRescueMotion(map,initial,next,true,true).duration,0);assert.equal(planRescueMotion(map,initial,next,false,false).duration,0);assert.equal(planRescueMotion(map,next,initial,true,false).kind,'snap');
 const later={...next,row:next.row-2};assert.equal(planRescueMotion(map,next,later,true,false).kind,'snap');}
});
test('repair feedback, blocked action and completion do not mutate rules or cross water',()=>{
 const m=RESCUE_MAPS[0],states=traceRescue(m,['up','up','right','right','repair','down','right','right','down','repair','down','left','left','up','left','left']);
 const before=JSON.stringify(states),scene=createRescueSpatialScene(m);
 const repair=planRescueMotion(m,states[4],states[5],true,false);assert.equal(repair.kind,'repair');assert.equal(sampleRescueMotion(repair,150).repair,1);scene.update(states[5]);assert.equal(scene.animate(repair,150),true);assert.equal(scene.animate(repair,300),false);
 const last=states.at(-1)!;assert.equal(last.won,true);const victory=planRescueMotion(m,states.at(-2)!,last,true,false);assert.equal(victory.kind,'celebrate');scene.update(last);scene.animate(victory,320);assert.equal(scene.robot.position.x,victory.to.x);assert.equal(scene.robot.position.z,victory.to.z);
 const initial=startRescue(m),blocked=stepRescue(m,initial,'left'),b=planRescueMotion(m,initial,blocked,true,false);assert.equal(b.kind,'blocked');assert.deepEqual(b.from,b.to);assert.equal(JSON.stringify(states),before);scene.dispose();
});
