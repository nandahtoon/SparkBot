// SB-M01: read-only campaign boundary. No renderer, save writes or experimental imports.
import { buildAdventureMap, canEnterCampaign, type AdventureSave } from './adventureMap';
import { getLevelById } from './levels';
import { getMissionLearningGoal, getRecommendedCampaignLevel } from './missionCurriculum';

export const MAIN_GAME_PHASES = ['discover','build','code','adventure','reward','upgrade'] as const;
export type MainGamePhase = typeof MAIN_GAME_PHASES[number];
export const MAIN_GAME_POLICY = Object.freeze({
  missionCount: 24, existingActivities: 7,
  miniGameExpansion: 'HOLD', production: 'HOLD',
  experimentalIntegration: 'HOLD',
} as const);

// Existing map, unlock and curriculum rules remain the sole authorities.
// This snapshot can later feed the main-game shell without a second progress store.
export function buildMainGameSnapshot(save: AdventureSave) {
  const chapters = buildAdventureMap(save).map(chapter => ({
    ...chapter,
    missions: chapter.missions.map(mission => {
      const level = getLevelById(mission.id);
      return { ...mission, learning: level ? getMissionLearningGoal(level) : null };
    }),
  }));
  const recommended = getRecommendedCampaignLevel(save);
  const nodes = chapters.flatMap(chapter => chapter.missions);
  const recommendedMissionId = canEnterCampaign(recommended, save) &&
    nodes.some(node => node.id === recommended.id && node.unlocked)
    ? recommended.id : null;
  return {
    chapters,
    recommendedMissionId,
    completedMissions: nodes.filter(node => node.stars > 0).length,
    totalMissions: nodes.length,
  };
}
