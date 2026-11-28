import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, BONUS_LEVELS, createEmptyChassis, simulateProgram, makeCircuit, traceCircuit, recordSkillMastery, type LevelDef, type CodeBlock } from './engine';
import { getMissionObjective, getCollectionRequirement, isMissionComplete, requiresMissionCircuit } from './missionObjectives';
import { buildLivePathPreview } from './pathPreview';
const chassis=createEmptyChassis();
chassis[2][1]='wheels'; chassis[1][2]='laser'; chassis[1][0]='thrusters';
const base: LevelDef={...LEVELS[0],id:21,track:[
 {type:'start',crystal:false},{type:'normal',crystal:true},{type:'normal',crystal:true},{type:'gate',crystal:false}
],circuit:makeCircuit([{r:2,c:2,type:'mirror',rot:0},{r:0,c:2,type:'core',rot:0}])};
const collect: LevelDef={...base,objective:{kind:'collect',requiredCrystals:2}};
const blocks=(...types: CodeBlock['type'][]):CodeBlock[]=>types.map((type,i)=>({id:`b${i}`,type}));
test('collection: reaching the station with too few crystals is a retry, not victory',()=>{
 const result=simulateProgram(collect,chassis,blocks('JUMP','MOVE'));
 assert.equal(result.finalPos,3);assert.equal(result.collectedCrystals,1);assert.equal(result.failCode,'objective_unmet');
 assert.equal(result.status,'fail');assert.equal(isMissionComplete(collect,result),false);
 assert.match(buildLivePathPreview(collect,chassis,blocks('JUMP','MOVE')).endpoint.summaryLabel,/Collect 2 crystals/);
});
test('collection: complete route and crystal target wins without optics',()=>{
 const result=simulateProgram(collect,chassis,blocks('MOVE','MOVE','MOVE'));
 assert.equal(result.collectedCrystals,2);assert.equal(result.status,'win');assert.equal(isMissionComplete(collect,result),true);
 assert.equal(requiresMissionCircuit(collect),false);
 assert.equal(recordSkillMastery(undefined,collect,chassis,blocks('MOVE','MOVE','MOVE'),result).next.circuitsSolved,0);
});
test('invalid collection targets fail closed',()=>{
 for(const n of [0,-1,1.5,3,NaN,Infinity]){
  const level:LevelDef={...base,objective:{kind:'collect',requiredCrystals:n}};
  assert.equal(getCollectionRequirement(level),null);
  assert.equal(simulateProgram(level,chassis,blocks('MOVE','MOVE','MOVE')).failCode,'objective_unmet');
 }
});
test('delivery and repair finish at station; power requires solved optics',()=>{
 for(const kind of ['delivery','repair','power'] as const){
  const level:LevelDef={...base,objective:{kind}};
  const win=simulateProgram(level,chassis,blocks('MOVE','MOVE','MOVE'));
  const fail=simulateProgram(level,chassis,blocks('MOVE'));
  assert.equal(isMissionComplete(level,fail),false);
  assert.equal(isMissionComplete(level,win),kind!=='power');
  assert.equal(isMissionComplete(level,win,traceCircuit(base.circuit)),true);
 }
});
test('unchanged legacy campaigns retain existing objective; revised campaign missions have explicit goals',()=>{
 for(const level of [...LEVELS,...BONUS_LEVELS].filter(l=>l.id<=20 && ![13,14,17,18].includes(l.id))){
  assert.equal(level.objective,undefined);
  assert.equal(getMissionObjective(level).kind,'power');assert.equal(requiresMissionCircuit(level),true);
 }
 for (const id of [13,14,17,18]) {
  const level=[...LEVELS,...BONUS_LEVELS].find(l=>l.id===id)!;
  assert.equal(requiresMissionCircuit(level),false);
  assert.equal(getMissionObjective(level).kind,id===14||id===17?'collect':'delivery');
 }
 assert.equal(requiresMissionCircuit({...base,isDebug:true}),false);
});
