import test from 'node:test';
import assert from 'node:assert/strict';
import {getLevelById} from './levels';
import {simulateProgram,type CodeBlock,calculateStars,computeChassisInfo,countBlocks} from './engine';
import {getSignalPatterns} from './signalPatterns';
import {evaluateHazardAtTick} from './hazards';
import type {DynamicHazardDef} from './types';
const l=getLevelById(23)!;
const run=(...types:CodeBlock['type'][])=>simulateProgram(l,l.starterChassis!,types.map((type,i)=>({id:'sig'+i,type})));
test('three different tide patterns use actual hazard ticks, including second-gate failure',()=>{
 assert.deepEqual(l.hazards?.map(h=>h.kind==='laser_gate'?[h.tileIndex,h.period]:null),[[2,2],[5,3],[8,4]]);
 const first=run('MOVE','MOVE');assert.equal(first.failCode,'laser_gate');
 const second=run('MOVE','WAIT','MOVE','MOVE','MOVE','MOVE','MOVE');
 assert.equal(second.failCode,'laser_gate');assert.equal(second.events.at(-1)?.toPos,5);
 const third=run('MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE','MOVE','MOVE');
 assert.equal(third.failCode,'laser_gate');assert.equal(third.events.at(-1)?.toPos,8);
 const ok=run('MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE');
 assert.equal(ok.status,'win');assert.equal(ok.finalPos,9);
 assert.deepEqual(ok.events.filter(e=>e.action==='WAIT').map(e=>e.toPos),[1,4,7]);
 for(let tick=0;tick<12;tick++)for(const pattern of getSignalPatterns(l.hazards!,tick)){
  const hazard:DynamicHazardDef=l.hazards!.find(h=>h.id===pattern.id)!;
  assert.equal(pattern.nextActive,evaluateHazardAtTick(hazard,tick+1).active);
  assert.ok(pattern.beats.every(b=>b.blocked===evaluateHazardAtTick(hazard,b.tick).active));
 }
});
