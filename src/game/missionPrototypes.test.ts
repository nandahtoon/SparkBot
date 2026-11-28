import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MISSION_PROTOTYPES,getMissionPrototype } from './missionPrototypes';
import { LEVELS,BONUS_LEVELS,simulateProgram,computeChassisInfo,type CodeBlock } from './engine';
import { isMissionComplete,requiresMissionCircuit } from './missionObjectives';
const blocks=(...types:CodeBlock['type'][]):CodeBlock[]=>types.map((type,i)=>({id:'b'+i,type}));
test('Crystal Courier requires collecting all three crystals, even when reaching the station',()=>{
 const level=MISSION_PROTOTYPES[0], chassis=level.starterChassis!;
 const missed=simulateProgram(level,chassis,blocks('JUMP','JUMP','MOVE'));
 assert.equal(missed.finalPos,5);assert.equal(missed.failCode,'objective_unmet');assert.equal(missed.collectedCrystals,2);
 const won=simulateProgram(level,chassis,blocks('MOVE','MOVE','JUMP','MOVE'));
 assert.equal(won.status,'win',won.failReason??undefined);assert.equal(won.collectedCrystals,3);
 assert.ok(isMissionComplete(level,won));assert.equal(requiresMissionCircuit(level),false);
});
test('Signal Repair begins with a genuinely failing program; corrected loop wins',()=>{
 const level=MISSION_PROTOTYPES[1], chassis=level.starterChassis!;
 const original=JSON.stringify(level.starterProgram);
 const failed=simulateProgram(level,chassis,level.starterProgram!);
 assert.equal(failed.status,'fail');assert.equal(failed.failCode,'gap');
 const fixed:CodeBlock[]=[{id:'fixed',type:'LOOP',count:2,children:blocks('MOVE','JUMP')}];
 const won=simulateProgram(level,chassis,fixed);
 assert.equal(won.status,'win',won.failReason??undefined);assert.ok(isMissionComplete(level,won));
 assert.equal(JSON.stringify(level.starterProgram),original);
});
test('practice definitions are isolated from all 24 saved campaign IDs',()=>{
 const ids=new Set([...LEVELS,...BONUS_LEVELS].map(l=>l.id));
 assert.equal(ids.size,24);
 for(const level of MISSION_PROTOTYPES){
  assert.equal(ids.has(level.id),false);assert.ok(level.isPrototype);assert.equal(getMissionPrototype(level.id),level);
  assert.ok(computeChassisInfo(level.starterChassis!).cost<=level.budget);
 }
 assert.equal(getMissionPrototype(1),undefined);
});
test('practice entry, completion and failure bypass campaign writes',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');
 const map=fs.readFileSync('src/components/Modals.tsx','utf8');
 assert.match(app,/onSelectPrototype=\{/);assert.match(map,/Try New Challenges/);
 assert.match(app,/if \(cur.currentLevel.isPrototype\) \{[\s\S]*?return; \/\/ Practice only/);
 assert.match(app,/if \(!cur.currentLevel.isPrototype\) setSave/);
 assert.match(app,/!currentLevel.isPrototype && !showGameRoom/);
});
