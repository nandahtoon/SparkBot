import test from 'node:test';
import assert from 'node:assert/strict';
import { getLevelById } from './levels';
import {getOceanPresentation} from './oceanPresentation';
import {getBiomeForLevel} from './biomes';
import {computeAdaptiveHint} from './educationStrategy';
test('four Ocean missions have unique landmarks, guidance and victory feedback',()=>{
 const entries=[21,22,23,24].map(id=>getOceanPresentation(getLevelById(id))!);
 for(const key of ['zone','name','hint','victory'] as const)assert.equal(new Set(entries.map(x=>x[key])).size,4);
 for(const id of [21,22,23,24]){
  const level=getLevelById(id)!;
  assert.equal(getBiomeForLevel(level).oceanZone,getOceanPresentation(level)?.zone);
  for(const tier of [1,2] as const){
   const hint=computeAdaptiveHint({level,phase:'code',chassis:level.starterChassis!,program:[],circuitGrid:level.circuit,tier,lastSimResult:null,failingBlockId:null});
   assert.equal(hint.clue,tier===1?getOceanPresentation(level)?.hint:getOceanPresentation(level)?.nextHint);
  }
 }
});
test('legacy and custom levels never inherit an ocean campaign presentation',()=>{
 for(let i=1;i<=20;i++)assert.equal(getOceanPresentation(getLevelById(i)),null);
 const level=getLevelById(21)!;
 for(const flag of ['isDaily','isSandbox','isClassCode','isDebug'])assert.equal(getOceanPresentation({...level,[flag]:true}),null);
});
