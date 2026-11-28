import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMainGameSnapshot, getMainGameLaunch, MAIN_GAME_PHASES, MAIN_GAME_POLICY } from './mainGameFoundation';
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

test('title journey distinguishes start, continue, replay and missing eligible mission', () => {
  const fresh = buildMainGameSnapshot({stars:{},bonusStars:{},unlockedLevel:1});
  assert.deepEqual(getMainGameLaunch(fresh), {
    missionId:1,chapterId:1,chapterTitle:'Junkyard Mechanics',
    goal:'Make your robot move in order.',actionLabel:'Start Adventure',
  });
  const returning = buildMainGameSnapshot({stars:{1:2,2:3,3:1},bonusStars:{},unlockedLevel:4});
  assert.equal(getMainGameLaunch(returning).missionId,4);
  assert.equal(getMainGameLaunch(returning).chapterId,2);
  assert.equal(getMainGameLaunch(returning).actionLabel,'Continue Adventure');
  const allStars = Object.fromEntries(Array.from({length:24},(_,i)=>[i+1,3]));
  const complete = buildMainGameSnapshot({stars:allStars,bonusStars:allStars,unlockedLevel:24});
  assert.equal(complete.completedMissions,24);
  assert.equal(getMainGameLaunch(complete).actionLabel,'Replay Adventure');
  assert.equal(getMainGameLaunch({...fresh,recommendedMissionId:2}).missionId,null);
  assert.equal(getMainGameLaunch({...fresh,recommendedMissionId:2}).actionLabel,'Choose a Mission');
});

test('legacy main progression and bonus stars select the same recommended campaign level', () => {
  for(let unlockedLevel=1;unlockedLevel<=8;unlockedLevel++){
    const stars=Object.fromEntries(Array.from({length:unlockedLevel-1},(_,i)=>[i+1,2]));
    const snapshot=buildMainGameSnapshot({stars,bonusStars:{9:{stars:1,bonusStar:false}},unlockedLevel});
    assert.equal(getMainGameLaunch(snapshot).missionId,unlockedLevel);
    assert.equal(snapshot.completedMissions,unlockedLevel);
  }
});
