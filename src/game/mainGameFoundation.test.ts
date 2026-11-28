import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMainGameSnapshot, MAIN_GAME_PHASES, MAIN_GAME_POLICY } from './mainGameFoundation';
import { buildAdventureMap } from './adventureMap';

test('main game foundation preserves all existing campaign IDs, unlocks, stars and learning goals', () => {
  const save = {stars:{1:2}, bonusStars:{9:{stars:3,bonusStar:true}}, unlockedLevel:2};
  const before = JSON.stringify(save);
  const model = buildMainGameSnapshot(save);
  const nodes = model.chapters.flatMap(chapter => chapter.missions);
  assert.deepEqual(nodes.map(node => node.id), Array.from({length:24},(_,i)=>i+1));
  assert.deepEqual(nodes.map(({learning,...node})=>node), buildAdventureMap(save).flatMap(chapter=>chapter.missions));
  assert.ok(nodes.every(node=>node.learning !== null));
  assert.equal(model.recommendedMissionId,2);
  assert.equal(model.completedMissions,2);
  assert.equal(model.totalMissions,24);
  assert.equal(JSON.stringify(save),before);
});

test('fresh player starts at mission one; roadmap does not unlock new content', () => {
  const model = buildMainGameSnapshot({stars:{},bonusStars:{},unlockedLevel:1});
  assert.equal(model.recommendedMissionId,1);
  assert.equal(model.completedMissions,0);
  assert.equal(model.chapters.flatMap(chapter=>chapter.missions).find(node=>node.id===2)?.unlocked,false);
  assert.deepEqual(MAIN_GAME_PHASES,['discover','build','code','adventure','reward','upgrade']);
  assert.equal(MAIN_GAME_POLICY.missionCount,24);
  assert.equal(MAIN_GAME_POLICY.existingActivities,7);
  assert.equal(MAIN_GAME_POLICY.miniGameExpansion,'HOLD');
  assert.equal(MAIN_GAME_POLICY.production,'HOLD');
  assert.equal(MAIN_GAME_POLICY.experimentalIntegration,'HOLD');
});
