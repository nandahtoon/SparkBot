import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_CHARACTER_ORDER} from './customization';
import {sampleCompanionPose,interpolateCompanionHeading} from './rescueCompanionPose';
import {RESCUE_MAPS,startRescue,stepRescue} from './rescueAdventure';
import {planRescueMotion} from './rescueSpatialMotion';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';

test('five personalities, finite bounded gestures and neutral endpoints',()=>{
 const kinds=['walk','repair','celebrate','blocked','snap'] as const;
 for(const id of BOT_CHARACTER_ORDER)for(const kind of kinds){
  for(const t of [0,.1,.25,.5,.72,.9,1]){const p=sampleCompanionPose(id,kind,t);assert.ok(Object.values(p).every(v=>Number.isFinite(v)&&Math.abs(v)<=1.5));if(t===0||t===1)assert.ok(Object.values(p).every(v=>Math.abs(v)<1e-8));}
 }
 assert.notDeepEqual(sampleCompanionPose('sprout','walk',.25),sampleCompanionPose('nova','walk',.25));
 assert.ok(sampleCompanionPose('nova','celebrate',.5).wing>0);
 assert.ok(sampleCompanionPose('sprout','repair',.5).armR<-.8);
 assert.ok(sampleCompanionPose('sparkbot','repair',.5).armL<-.8);
 assert.equal(sampleCompanionPose('learnbot','walk',.72).blink,1);
});
test('turn follows short arc and lands exactly on commanded heading',()=>{
 assert.equal(interpolateCompanionHeading(3,-3,0),3);
 assert.ok(interpolateCompanionHeading(3,-3,.1)>3);
 assert.equal(interpolateCompanionHeading(3,-3,1),-3);
});
test('actual scene poses animate and reset for every companion without changing board position',()=>{
 for(const id of BOT_CHARACTER_ORDER){const map=RESCUE_MAPS[0],s=startRescue(map),n=stepRescue(map,s,'up'),motion=planRescueMotion(map,s,n,true,false),world=createRescueSpatialScene(map,id);
  const head=world.robot.getObjectByName('companion-head')!,arm=world.robot.getObjectByName('companion-arm-0')!,eye=world.robot.getObjectByName('companion-eye-0')!;
  world.update(n);world.animate(motion,motion.duration*.25);assert.notEqual(arm.rotation.x,0);assert.notEqual(head.rotation.z,0);
  world.animate(motion,motion.duration*.72);assert.ok(eye.scale.y<.03);
  world.animate(motion,motion.duration);assert.equal(head.rotation.z,0);assert.equal(arm.rotation.x,0);assert.equal(eye.scale.y,.105);assert.equal(world.robot.position.z,motion.to.z);
  world.update(s);assert.equal(world.robot.rotation.y,0);world.dispose();
 }
});
