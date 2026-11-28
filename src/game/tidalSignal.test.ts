import test from 'node:test';
import assert from 'node:assert/strict';
import {getLevelById} from './levels';
import {simulateProgram,type CodeBlock,calculateStars,computeChassisInfo,countBlocks} from './engine';
import {getSignalPatterns} from './signalPatterns';
import {evaluateHazardAtTick} from './hazards';
const l=getLevelById(23)!;
const run=(...types:CodeBlock['type'][])=>simulateProgram(l,l.starterChassis!,types.map((type,i)=>({id:'sig'+i,type})));
test('two different tide patterns use actual hazard ticks, including second-gate failure',()=>{
 assert.deepEqual(l.hazards?.map(h=>h.kind==='laser_gate'?[h.tileIndex,h.period]:null),[[2,2],[5,3]]);
 const first=run('MOVE','MOVE');assert.equal(first.failCode,'laser_gate');
 const second=run('MOVE','WAIT','MOVE','MOVE','MOVE','MOVE','MOVE');
 assert.equal(second.failCode,'laser_gate');assert.equal(second.events.at(-1)?.toPos,5);
 const ok=run('MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE');
 assert.equal(ok.status,'win');assert.equal(ok.finalPos,6);
 assert.deepEqual(ok.events.filter(e=>e.action==='WAIT').map(e=>e.toPos),[1,4]);
 for(let tick=0;tick<12;tick++)for(const pattern of getSignalPatterns(l.hazards!,tick)){
  const hazard=l.hazards!.find(h=>h.id===pattern.id)!;
  assert.equal(pattern.nextActive,evaluateHazardAtTick(hazard,tick+1).active);
  assert.ok(pattern.beats.every(b=>b.blocked===evaluateHazardAtTick(hazard,b.tick).active));
 }
});
