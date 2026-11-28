import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SPACE_BOT_FORMS,SPACE_BOT_FORM_INFO,SPACE_GUARD_RECHARGE,nextSpaceBotForm,spaceBotShots,spaceBotImpact,spaceBotTransformPose} from './spaceBotForms';
import {spawnSpaceWave,computeSpaceShooterReward,ALL_GAME_ROOM_GAMES} from './arcadeGames';
test('three transformations have distinct mechanics and round-trip order',()=>{
 assert.equal(nextSpaceBotForm('scout'),'pulse');assert.equal(nextSpaceBotForm('pulse'),'guard');assert.equal(nextSpaceBotForm('guard'),'scout');
 assert.ok(SPACE_BOT_FORM_INFO.scout.speed>SPACE_BOT_FORM_INFO.guard.speed);
 assert.equal(spaceBotShots('scout',100,200,500).length,2);const shots=spaceBotShots('pulse',100,200,500);assert.equal(shots.length,3);assert.ok(shots[0].vx<0&&shots[2].vx>0);
 assert.deepEqual(spaceBotImpact('guard',3,0),{absorbed:true,shields:3,guardCooldown:SPACE_GUARD_RECHARGE});
 assert.equal(spaceBotImpact('guard',3,1).shields,2);assert.equal(spaceBotImpact('scout',3,0).shields,2);
 assert.equal(spaceBotImpact('pulse',0,0).shields,0);
});
test('all transition endpoints are deterministic, geometry remains finite',()=>{
 for(const from of SPACE_BOT_FORMS)for(const to of SPACE_BOT_FORMS){assert.deepEqual(spaceBotTransformPose(from,to,0),spaceBotTransformPose(from,from,1));assert.deepEqual(spaceBotTransformPose(from,to,1),spaceBotTransformPose(to,to,1));for(let i=0;i<=10;i++)assert.ok(Object.values(spaceBotTransformPose(from,to,i/10)).every(Number.isFinite));}
});
test('legacy wave count and reward cap retained, one existing arcade activity',()=>{
 assert.equal(ALL_GAME_ROOM_GAMES.length,7);for(let wave=1;wave<=4;wave++)assert.equal(spawnSpaceWave(390,wave).length,Math.min(8,4+wave));assert.equal(computeSpaceShooterReward(9999,999),130);
 const ui=fs.readFileSync('src/components/GameRoomModal.tsx','utf8');assert.match(ui,/drawSpaceBot\(ctx,character/);assert.match(ui,/spaceBotImpact\(form,shields,guardCooldown\)/);assert.match(ui,/character=\{activeCharacter\}/);assert.match(ui,/transformRef.current = null/);assert.doesNotMatch(ui,/Draw robot starfighter/);
});
