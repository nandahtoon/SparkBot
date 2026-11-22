import { BONUS_LEVELS, generateDailyChallenge, LEVELS, type SaveProfile } from './engine';
import {
  computeLiveTimerTier,
  getLevelTimeTargets,
  getTimerKeyForLevel,
  normalizeBestTimes,
  type SpeedRunTier
} from './challengeTimer';

export interface BeatenLevelHistoryEntry {
  key: string;
  kind: 'main' | 'bonus' | 'daily';
  levelId: number;
  name: string;
  label: string;
  shortTag: string;
  stars: number;
  bonusStar: boolean;
  bestMs: number | null;
  speedTier: SpeedRunTier | null;
}

/**
 * Builds an ordered summary of levels the player has beaten (main levels, bonus sector levels,
 * and today's completed daily challenge) with their saved star ratings and best completion times.
 */
export function buildBeatenLevelHistory(save: SaveProfile): BeatenLevelHistoryEntry[] {
  const bestTimes = normalizeBestTimes(save.bestTimes);
  const entries: BeatenLevelHistoryEntry[] = [];

  for (const lvl of LEVELS) {
    const rawStars = save.stars?.[lvl.id] || 0;
    const stars = Math.max(0, Math.min(3, Math.floor(rawStars)));
    const timerKey = getTimerKeyForLevel(lvl);
    const bestMs = typeof bestTimes[timerKey] === 'number' ? bestTimes[timerKey] : null;
    if (stars <= 0 && bestMs === null) continue;

    entries.push({
      key: timerKey,
      kind: 'main',
      levelId: lvl.id,
      name: lvl.name,
      label: `Level ${lvl.id}`,
      shortTag: `L${lvl.id}`,
      stars,
      bonusStar: false,
      bestMs,
      speedTier: bestMs !== null ? computeLiveTimerTier(bestMs, getLevelTimeTargets(lvl)) : null
    });
  }

  for (const lvl of BONUS_LEVELS) {
    const rec = save.bonusStars?.[lvl.id];
    const rawStars =
      typeof rec === 'object' && rec !== null ? rec.stars : typeof rec === 'number' ? rec : 0;
    const stars = Math.max(0, Math.min(3, Math.floor(rawStars || 0)));
    const bonusStar = typeof rec === 'object' && rec !== null ? Boolean(rec.bonusStar) : false;
    const timerKey = getTimerKeyForLevel(lvl);
    const bestMs = typeof bestTimes[timerKey] === 'number' ? bestTimes[timerKey] : null;
    if (stars <= 0 && bestMs === null) continue;

    entries.push({
      key: timerKey,
      kind: 'bonus',
      levelId: lvl.id,
      name: lvl.name,
      label: `Bonus ${lvl.id}`,
      shortTag: `B${lvl.id}`,
      stars,
      bonusStar,
      bestMs,
      speedTier: bestMs !== null ? computeLiveTimerTier(bestMs, getLevelTimeTargets(lvl)) : null
    });
  }

  const dailyStars = Math.max(0, Math.min(3, Math.floor(save.daily?.stars || 0)));
  const dailyDateKey = save.daily?.dateKey || save.daily?.lastCompletedDate || '';
  if (dailyStars > 0 && dailyDateKey) {
    const dailyKey = `daily:${dailyDateKey}`;
    const bestMs = typeof bestTimes[dailyKey] === 'number' ? bestTimes[dailyKey] : null;
    const dailyTargets = getLevelTimeTargets(generateDailyChallenge(dailyDateKey));
    entries.push({
      key: dailyKey,
      kind: 'daily',
      levelId: 0,
      name: `Daily · ${dailyDateKey}`,
      label: 'Daily Challenge',
      shortTag: 'DAY',
      stars: dailyStars,
      bonusStar: false,
      bestMs,
      speedTier: bestMs !== null ? computeLiveTimerTier(bestMs, dailyTargets) : null
    });
  }

  return entries;
}
