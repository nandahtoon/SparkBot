import test from 'node:test';
import assert from 'node:assert/strict';
import { getMissionPrototype } from './missionPrototypes';
import { getSurveyProgress,getSurveyStations,isMissionComplete,requiresMissionCircuit } from './missionObjectives';
import { simulateProgram,buildStepInspection,LEVELS,BONUS_LEVELS,type CodeBlock,type LevelDef } from './engine';
import { getBiomeForLevel } from './biomes';
const level=getMissionPrototype(6103)!;
const chassis=level.starterChassis!;
const blocks=(...types:CodeBlock['type'][]):CodeBlock[]=>types.map((type,i)=>({id:'survey'+i,type}));
test('reef survey requires a successful WAIT at each unique marked station',()=>{
 const noWait=simulateProgram(level,chassis,blocks('MOVE','MOVE','JUMP','MOVE','MOVE'));
 assert.equal(noWait.finalPos,6);assert.equal(noWait.failCode,'objective_unmet');
 const repeated=simulateProgram(level,chassis,blocks('MOVE','WAIT','WAIT','MOVE','JUMP','MOVE','MOVE'));
 assert.equal(getSurveyProgress(level,repeated.events),1);assert.equal(repeated.failCode,'objective_unmet');
 const wrong=simulateProgram(level,chassis,blocks('MOVE','MOVE','WAIT','JUMP','WAIT','MOVE','MOVE'));
 assert.equal(getSurveyProgress(level,wrong.events),1);assert.equal(wrong.status,'fail');
});
test('reef survey completes with observations at both stations and no optics',()=>{
 const won=simulateProgram(level,chassis,blocks('MOVE','WAIT','MOVE','JUMP','WAIT','MOVE','MOVE'));
 assert.equal(won.status,'win',won.failReason??undefined);
 assert.equal(getSurveyProgress(level,won.events),2);assert.equal(isMissionComplete(level,won),true);
 assert.equal(requiresMissionCircuit(level),false);
 assert.equal(buildStepInspection(level,chassis,won,1)?.surveysCompleted,1);
 assert.equal(buildStepInspection(level,chassis,won,4)?.surveysCompleted,2);
});
test('survey station validation fails closed for invalid or repeated locations',()=>{
 for(const stations of [[],[0],[3],[6],[1,1],[1.5],[99]]){
  const bad:LevelDef={...level,objective:{kind:'survey',stations}};
  assert.equal(getSurveyStations(bad),null);
  assert.equal(simulateProgram(bad,chassis,blocks('MOVE','WAIT','MOVE','JUMP','WAIT','MOVE','MOVE')).failCode,'objective_unmet');
 }
});
test('ocean theme is opt-in to Reef Survey; all twenty campaign themes remain non-ocean',()=>{
 assert.equal(getBiomeForLevel(level).id,'ocean_discovery');
 for(const mission of [...LEVELS,...BONUS_LEVELS])assert.notEqual(getBiomeForLevel(mission).id,'ocean_discovery');
 assert.notEqual(getBiomeForLevel({...level,isDaily:true}).id,'ocean_discovery');
 assert.notEqual(getBiomeForLevel(getMissionPrototype(6101)).id,'ocean_discovery');
});
