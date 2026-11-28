import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, BONUS_LEVELS } from './levels';
import { defaultSaveProfile } from './engine';
import { MISSION_LEARNING_GOALS, getMissionLearningGoal, getRecommendedCampaignLevel } from './missionCurriculum';

test('all 16 missions have distinct skill, goal and reflection prompts', () => {
 const levels = [...LEVELS,...BONUS_LEVELS];
 assert.equal(Object.keys(MISSION_LEARNING_GOALS).length,16);
 const goals = levels.map(level=>getMissionLearningGoal(level));
 assert.ok(goals.every(goal=>goal && goal.goal.length>0 && goal.reflect.endsWith('?')));
 assert.equal(new Set(goals.map(goal=>goal?.skill)).size,16);
 for(const flag of ['isDaily','isSandbox','isClassCode','isDebug']) {
  assert.equal(getMissionLearningGoal({...LEVELS[0],[flag]:true}),null);
 }
});
test('campaign recommends the next eligible incomplete mission without modifying saved progress',()=>{
 const save=defaultSaveProfile();
 assert.equal(getRecommendedCampaignLevel(save).id,1);
 save.stars[1]=3; save.unlockedLevel=2;
 assert.equal(getRecommendedCampaignLevel(save).id,2);
 for(const level of LEVELS) save.stars[level.id]=1;
 save.unlockedLevel=8;
 assert.equal(getRecommendedCampaignLevel(save).id,9);
 save.bonusStars[9]=2;
 save.bonusStars[10]={stars:1,bonusStar:false};
 assert.equal(getRecommendedCampaignLevel(save).id,11);
 for(const level of BONUS_LEVELS) save.bonusStars[level.id]={stars:3,bonusStar:true};
 const snapshot=JSON.stringify(save);
 assert.equal(getRecommendedCampaignLevel(save).id,16);
 assert.equal(JSON.stringify(save),snapshot);
});
test('missing or locked main mission does not silently skip to advanced bonus levels',()=>{
 const save=defaultSaveProfile(); save.stars[1]=2;
 assert.equal(getRecommendedCampaignLevel(save).id,1);
 save.unlockedLevel=8; save.stars[8]=3;
 assert.equal(getRecommendedCampaignLevel(save).id,2);
});
