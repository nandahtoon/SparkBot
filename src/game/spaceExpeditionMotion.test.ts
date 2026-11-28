import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnExpeditionWave} from './spaceExpedition';
import {advanceExpeditionObstacle,advanceSpaceTransition,SPACE_STAGE_TRANSITION_SECONDS} from './spaceExpeditionMotion';
test('stage transitions freeze simulation and reduced motion bypasses presentation',()=>{
 assert.deepEqual(advanceSpaceTransition(1,.1,false),{remaining:.9,gameplayDt:0});
 assert.equal(advanceSpaceTransition(.01,.04,false).gameplayDt,0);
 assert.deepEqual(advanceSpaceTransition(0,.03,false),{remaining:0,gameplayDt:.03});
 assert.equal(advanceSpaceTransition(SPACE_STAGE_TRANSITION_SECONDS,.04,true).remaining,0);
});
test('all obstacle trajectories are finite, horizontally bounded, descending, immutable',()=>{
 for(const width of [320,390,800])for(let stage=1;stage<=7;stage++){const source=spawnExpeditionWave(width,stage,100)[0],before={...source};let en=source;
 for(let i=0;i<600;i++){const next=advanceExpeditionObstacle(en,stage,i/60,1/60,width,1);assert.ok(Number.isFinite(next.x)&&Number.isFinite(next.y));assert.ok(next.x>=en.radius+10&&next.x<=width-en.radius-10);assert.ok(next.y>=en.y);en=next;}assert.deepEqual(source,before);}
});
test('different stage motion functions have distinct trajectories',()=>{const e=spawnExpeditionWave(390,1,1)[0];const paths=new Set(Array.from({length:7},(_,i)=>JSON.stringify(advanceExpeditionObstacle(e,i+1,.7,.02,390,1))));assert.equal(paths.size,7);});
