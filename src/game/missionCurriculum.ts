import { LEVELS, BONUS_LEVELS } from './levels';
import type { LevelDef, SaveProfile } from './types';

export interface MissionLearningGoal {
  skill: string;
  goal: string;
  reflect: string;
}

// Solution-free prompts; practice invitations are not mastery assessments.
export const MISSION_LEARNING_GOALS: Readonly<Record<number, MissionLearningGoal>> = {
  1: {skill:'Sequencing', goal:'Make your robot move in order.', reflect:'What happens if you use one fewer MOVE block?'},
  2: {skill:'Jumping', goal:'Choose when to jump over a gap.', reflect:'What changes when you jump too early?'},
  3: {skill:'Planning a route', goal:'Combine moves and jumps.', reflect:'Which safe tile should you land on next?'},
  4: {skill:'Traction and loops', goal:'Find a repeating pattern on mud.', reflect:'Why do treads work better on mud?'},
  5: {skill:'Ramps and energy', goal:'Use a booster to cross ramps.', reflect:'Why might moving alone not be enough?'},
  6: {skill:'Pattern recognition', goal:'Spot the pattern and repeat it.', reflect:'Can a loop make your code shorter?'},
  7: {skill:'Energy choices', goal:'Choose parts within the energy budget.', reflect:'Which part could you leave out and still finish?'},
  8: {skill:'Nested loops and optics', goal:'Repeat a pattern and light several cores.', reflect:'What does a beam splitter do to light?'},
  9: {skill:'Gap sensors', goal:'Teach your robot to notice a gap.', reflect:'How could the robot decide when to jump?'},
  10: {skill:'Mud sensors', goal:'Choose an action when mud is ahead.', reflect:'What should happen when there is no mud?'},
  11: {skill:'Ramp sensors', goal:'React when a ramp is ahead.', reflect:'Why check the track before using a booster?'},
  12: {skill:'Conditional choices', goal:'Combine sensor checks with movement.', reflect:'How could you handle two different obstacles?'},
  13: {skill:'Timing and IF/ELSE', goal:'Decide when to wait or move.', reflect:'Why can waiting help you reach the goal?'},
  14: {skill:'Reusable functions', goal:'Reuse a group of commands.', reflect:'What makes MY BLOCK useful?'},
  15: {skill:'Combining strategies', goal:'Plan for changing hazards and terrain.', reflect:'Which part of your code could you reuse?'},
  16: {skill:'Systems thinking', goal:'Combine timing, movement and light.', reflect:'Which strategy helped you solve the rescue mission?'},
  17: {"skill":"Efficient construction","goal":"Finish with a lightweight robot.","reflect":"Which parts did you not need?"},
  18: {"skill":"Resource trade-offs","goal":"Choose useful parts within the budget.","reflect":"Why is the cheapest robot not always the best?"},
  19: {"skill":"Reusable optimization","goal":"Reuse a route pattern across ramps.","reflect":"How does repeating a command group help?"},
  20: {"skill":"Timing and resource planning","goal":"Deliver energy with safe, timed steps.","reflect":"Why might waiting save resources?"},
  21: {"skill":"Complete sampling","goal":"Collect every sample before returning.","reflect":"Why might the fastest route miss a sample?"},
  22: {"skill":"Systematic observation","goal":"Pause at both marked observation stations.","reflect":"Why do repeated observations at one station not replace visiting another?"},
  23: {"skill":"Comparing periodic signals","goal":"Cross two gates with different repeating patterns.","reflect":"Why might the second gate need a different wait from the first?"},
  24: {"skill":"Repair and restoration","goal":"Fix the routine and power both beacon cores.","reflect":"How did you check that both the code and the beacon worked?"}
};

export function getMissionLearningGoal(level: LevelDef): MissionLearningGoal | null {
  if (level.isDaily || level.isSandbox || level.isClassCode || level.isDebug) return null;
  return MISSION_LEARNING_GOALS[level.id] ?? null;
}

type CampaignSave = Pick<SaveProfile, 'stars' | 'bonusStars' | 'unlockedLevel'>;
export function getCampaignStars(save: CampaignSave, level: LevelDef): number {
  const record = level.isBonus ? save.bonusStars?.[level.id] : save.stars?.[level.id];
  const stars = typeof record === 'object' && record !== null ? record.stars : record;
  return typeof stars === 'number' && Number.isFinite(stars) ? Math.max(0, Math.min(3, Math.floor(stars))) : 0;
}

// Recommend unfinished eligible main missions, then optional advanced missions.
// Preserve access rules and saves; replay finale when all missions are complete.
export function getRecommendedCampaignLevel(save: CampaignSave): LevelDef {
  const unlocked = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(save.unlockedLevel) || 1)));
  const main = LEVELS.find(level => level.id <= unlocked && getCampaignStars(save, level) === 0);
  if (main) return main;
  if (LEVELS.some(level => getCampaignStars(save, level) === 0)) return LEVELS[unlocked - 1];
  return BONUS_LEVELS.find(level => getCampaignStars(save, level) === 0) ?? BONUS_LEVELS[BONUS_LEVELS.length - 1];
}
