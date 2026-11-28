import test from 'node:test';
import assert from 'node:assert/strict';
import {getLevelById,simulateProgram,traceCircuit,cloneCircuitGrid,calculateStars,countBlocks,computeChassisInfo,findShortestTrackPlan,type CodeBlock} from './engine';
import {isMissionComplete,requiresMissionCircuit,getSurveyProgress} from './missionObjectives';
import {getBiomeForLevel} from './biomes';
const blocks=(...types:CodeBlock['type'][]):CodeBlock[]=>types.map((type,i)=>({id:'ocean-'+i,type}));
const level=(id:number)=>getLevelById(id)!;
const run=(id:number,program:CodeBlock[])=>simulateProgram(level(id),level(id).starterChassis!,program);
const solutions:Record<number,CodeBlock[]>={21:blocks('MOVE','MOVE','JUMP','MOVE','JUMP','MOVE','MOVE'),22:blocks('MOVE','WAIT','MOVE','JUMP','WAIT','MOVE','JUMP','WAIT','MOVE','MOVE','MOVE'),23:blocks('MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE','MOVE','WAIT','MOVE','MOVE'),24:[{id:'fixed-loop',type:'LOOP',count:3,children:blocks('MOVE','JUMP')},{id:'approach1',type:'MOVE'},{id:'approach2',type:'MOVE'}]};
for(const id of [21,22,23,24])test(`Ocean ${id}: intended program meets route objective, budget and three-star par`,()=>{
 const l=level(id),result=run(id,solutions[id]);
 assert.equal(result.status,'win',result.failReason??undefined);
 assert.equal(calculateStars(l,computeChassisInfo(l.starterChassis!).cost,countBlocks(solutions[id]),result.collectedCrystals,result.totalCrystals).stars,3);
 assert.equal(getBiomeForLevel(l).id,'ocean_discovery');
 assert.equal(isMissionComplete(l,result),id!==24);
 assert.equal(requiresMissionCircuit(l),id===24);
 assert.ok(findShortestTrackPlan(l));
});
test('different failure modes: missed sample, missing observations, mistimed barrier, broken routine and unsolved beacon',()=>{
 assert.equal(run(21,blocks('JUMP','JUMP','MOVE','JUMP','MOVE','MOVE')).failCode,'objective_unmet');
 const skipped=run(22,blocks('MOVE','MOVE','JUMP','MOVE','JUMP','MOVE','MOVE','MOVE'));
 assert.equal(skipped.failCode,'objective_unmet');assert.equal(getSurveyProgress(level(22),skipped.events),0);
 assert.equal(run(23,blocks('MOVE','MOVE','MOVE','MOVE','MOVE')).failCode,'laser_gate');
 assert.equal(run(24,level(24).starterProgram!).failCode,'gap');
 const l=level(24),result=run(24,solutions[24]),grid=cloneCircuitGrid(l.circuit);
 assert.equal(traceCircuit(grid).solved,false);
 assert.equal(isMissionComplete(l,result,traceCircuit(grid)),false);
 let solved=false;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++){grid[2][2].rot=a;grid[2][4].rot=b;if(isMissionComplete(l,result,traceCircuit(grid)))solved=true;}
 assert.ok(solved);
});

test('reef survey requires both observations AND samples, not either one alone',()=>{
 const missingSample=run(22,blocks('MOVE','WAIT','MOVE','JUMP','WAIT','MOVE','JUMP','WAIT','JUMP','MOVE'));
 assert.equal(missingSample.finalPos,10);
 assert.equal(getSurveyProgress(level(22),missingSample.events),3);
 assert.equal(missingSample.collectedCrystals,2);
 assert.equal(missingSample.failCode,'objective_unmet');
 const missingObservations=run(22,blocks('MOVE','MOVE','JUMP','MOVE','JUMP','MOVE','MOVE','MOVE'));
 assert.equal(missingObservations.collectedCrystals,3);
 assert.equal(missingObservations.failCode,'objective_unmet');
 for(const requiredCrystals of [0,4,1.5]){
  const l={...level(22),objective:{kind:'survey' as const,stations:[1,4,7],requiredCrystals}};
  assert.equal(findShortestTrackPlan(l),null);
  assert.equal(simulateProgram(l,l.starterChassis!,solutions[22]).failCode,'objective_unmet');
 }
});
test('Ocean finale needs the approach after repairing the repeated crossing',()=>{
 const partial=run(24,[{id:'fixed',type:'LOOP',count:3,children:blocks('MOVE','JUMP')}]);
 assert.equal(partial.finalPos,9);assert.notEqual(partial.status,'win');
});
