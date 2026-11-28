import test from 'node:test';
import assert from 'node:assert/strict';
import {SPACE_EXPEDITION_STAGES,SPACE_RESCUE_GOAL,spaceStageCount,spaceRoundOutcome,spawnExpeditionWave,moveSpaceBotToward,rescueSignalPosition} from './spaceExpedition';
test('classic outcome unchanged, expedition requires actual rescue completion',()=>{
 assert.equal(spaceStageCount('classic'),4);assert.equal(spaceStageCount('expedition'),8);
 assert.equal(spaceRoundOutcome('classic',3,0,0,1,5,0),'won');assert.equal(spaceRoundOutcome('classic',0,3,120,3,1,0),'won');
 assert.equal(spaceRoundOutcome('expedition',3,0,200,4,0,0),'playing');
 assert.equal(spaceRoundOutcome('expedition',0,0,999,7,0,0),'lost');
 assert.equal(spaceRoundOutcome('expedition',3,0,999,8,0,2),'playing');
 assert.equal(spaceRoundOutcome('expedition',3,0,999,8,0,SPACE_RESCUE_GOAL),'won');
});
test('seven bounded distinct deterministic formations and friendly finale',()=>{
 assert.equal(new Set(SPACE_EXPEDITION_STAGES.map(s=>s.pattern)).size,8);
 for(const width of [320,390,800])for(let stage=1;stage<=7;stage++){const wave=spawnExpeditionWave(width,stage,100);assert.ok(wave.length>=4&&wave.length<=8);assert.equal(new Set(wave.map(e=>e.id)).size,wave.length);assert.deepEqual(wave,spawnExpeditionWave(width,stage,100));for(const e of wave){assert.ok(e.x>=e.radius+10&&e.x<=width-e.radius-10);assert.ok(e.y<0&&e.hp>=1&&e.hp<=2);}}
 assert.deepEqual(spawnExpeditionWave(390,8,1),[]);assert.equal(new Set([0,1,2].map(i=>rescueSignalPosition(390,i))).size,3);
});
test('pointer steering uses speed limits and never overshoots',()=>{assert.equal(moveSpaceBotToward(100,200,100,.5),150);assert.equal(moveSpaceBotToward(200,100,100,.5),150);assert.equal(moveSpaceBotToward(100,110,200,1),110);});
