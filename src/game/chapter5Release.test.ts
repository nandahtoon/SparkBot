import test from 'node:test';
import assert from 'node:assert/strict';
import { getLevelById, createEmptyChassis, computeChassisInfo, simulateProgram, countBlocks, calculateStars, findShortestTrackPlan, traceCircuit, findCircuitFixCell, type CodeBlock, type BlockType } from './engine';
import { getBiomeForLevel } from './biomes';

for (const id of [17,18,19,20]) {
 test(`Chapter 5 mission ${id}: three stars achievable with real blocks and unsolved optics`,()=>{
  const level=getLevelById(id)!;
  const chassis=createEmptyChassis();
  chassis[2][1]=id===18?'treads':'wheels';
  chassis[1][2]='laser';
  if(id===18) chassis[1][0]='thrusters';
  if(id===19) chassis[0][1]='booster';
  const sequence: BlockType[]=id===17?Array(8).fill('MOVE'):id===18?['MOVE','JUMP','MOVE','JUMP','MOVE','MOVE','MOVE']:id===19?['BOOST','BOOST','BOOST']:findShortestTrackPlan(level)!.sequence as BlockType[];
  const program: CodeBlock[]=sequence.map((type,i)=>({id:`ch5-${i}`,type}));
  const result=simulateProgram(level,chassis,program);
  assert.equal(result.status,'win',result.failReason);
  assert.equal(result.collectedCrystals,result.totalCrystals);
  assert.equal(calculateStars(level,computeChassisInfo(chassis).cost,countBlocks(program),result.collectedCrystals,result.totalCrystals).stars,3);
  assert.equal(traceCircuit(level.circuit).solved,false);
  assert.ok(findCircuitFixCell(level.circuit));
  assert.equal(getBiomeForLevel(level).id,'energy_valley');
 });
}
test('Chapter 5 theme does not change Chapter 4 or custom/daily themes',()=>{
 const base=getLevelById(17)!;
 assert.equal(getBiomeForLevel(getLevelById(16)).id,'reactor_citadel');
 assert.notEqual(getBiomeForLevel({...base,isSandbox:true}).id,'energy_valley');
 assert.notEqual(getBiomeForLevel({...base,isDaily:true}).id,'energy_valley');
});
