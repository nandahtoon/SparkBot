import type { LevelDef } from './engine';

export type SpeedRunTier = 'gold' | 'silver' | 'bronze' | 'none';

export interface LevelTimeTargets {
  goldMs: number;
  silverMs: number;
  bronzeMs: number;
}

export interface SpeedRunEvaluation {
  enabled: boolean;
  earned: boolean;
  tier: SpeedRunTier;
  bonusBolts: number;
  label: string;
  elapsedMs: number;
  targets: LevelTimeTargets;
  nextTargetMs: number | null;
}

export const SPEED_RUN_BONUS_BOLTS: Record<SpeedRunTier, number> = {
  gold: 40,
  silver: 25,
  bronze: 15,
  none: 0
};

/**
 * Computes approachable Gold / Silver / Bronze completion-time targets for a level
 * based on track length, par block count, and bonus/daily complexity.
 */
export function getLevelTimeTargets(
  level: Pick<LevelDef, 'id' | 'parBlocks' | 'isBonus' | 'isDaily' | 'track'>
): LevelTimeTargets {
  const trackLen = Math.max(4, level.track?.length || 6);
  const hazardCount = (level.track || []).filter(
    (t) => t.type === 'gap' || t.type === 'mud' || t.type === 'ramp'
  ).length;
  const complexitySec =
    26 +
    Math.max(0, trackLen - 5) * 2.5 +
    hazardCount * 4 +
    Math.max(0, (level.parBlocks || 3) - 3) * 3 +
    (level.isBonus ? 8 : level.isDaily ? 6 : 0);

  const goldSec = Math.round(Math.max(30, Math.min(75, complexitySec)));
  const silverSec = Math.round(goldSec * 1.5);
  const bronzeSec = Math.round(goldSec * 2.2);

  return {
    goldMs: goldSec * 1000,
    silverMs: silverSec * 1000,
    bronzeMs: bronzeSec * 1000
  };
}

export function computeLiveTimerTier(
  elapsedMs: number,
  targets: LevelTimeTargets
): SpeedRunTier {
  const safeMs = Math.max(0, elapsedMs);
  if (safeMs <= targets.goldMs) return 'gold';
  if (safeMs <= targets.silverMs) return 'silver';
  if (safeMs <= targets.bronzeMs) return 'bronze';
  return 'none';
}

export function evaluateSpeedRunBonus(
  elapsedMs: number,
  level: Pick<LevelDef, 'id' | 'parBlocks' | 'isBonus' | 'isDaily' | 'track'>,
  timerEnabled: boolean
): SpeedRunEvaluation {
  const safeMs = Math.max(0, Math.round(elapsedMs));
  const targets = getLevelTimeTargets(level);

  if (!timerEnabled) {
    return {
      enabled: false,
      earned: false,
      tier: 'none',
      bonusBolts: 0,
      label: 'Timer Off',
      elapsedMs: safeMs,
      targets,
      nextTargetMs: null
    };
  }

  const tier = computeLiveTimerTier(safeMs, targets);
  const bonusBolts = SPEED_RUN_BONUS_BOLTS[tier];
  const label =
    tier === 'gold'
      ? 'Gold Speed-Run'
      : tier === 'silver'
        ? 'Silver Speed-Run'
        : tier === 'bronze'
          ? 'Bronze Speed-Run'
          : 'Completed';
  const nextTargetMs =
    tier === 'gold'
      ? null
      : tier === 'silver'
        ? targets.goldMs
        : tier === 'bronze'
          ? targets.silverMs
          : targets.bronzeMs;

  return {
    enabled: true,
    earned: bonusBolts > 0,
    tier,
    bonusBolts,
    label,
    elapsedMs: safeMs,
    targets,
    nextTargetMs
  };
}

/**
 * Formats milliseconds into compact stopwatch notation `M:SS.d` (e.g. `0:14.2`).
 */
export function formatChallengeTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const totalTenths = Math.floor(clamped / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function getTimerKeyForLevel(
  level: Pick<LevelDef, 'id' | 'isDaily' | 'dailyDateKey' | 'isBonus'>
): string {
  if (level.isDaily) {
    return `daily:${level.dailyDateKey || 'today'}`;
  }
  if (level.isBonus) {
    return `bonus:${level.id}`;
  }
  return `level:${level.id}`;
}

export function normalizeBestTimes(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k] = Math.round(v);
    }
  }
  return out;
}

export function updateBestCompletionTime(
  bestTimes: Record<string, number> | undefined,
  levelKey: string,
  elapsedMs: number
): {
  next: Record<string, number>;
  isNewRecord: boolean;
  previousBestMs: number | null;
  bestMs: number;
} {
  const clean = normalizeBestTimes(bestTimes);
  const safeMs = Math.max(100, Math.round(elapsedMs));
  const previousBestMs = typeof clean[levelKey] === 'number' ? clean[levelKey] : null;
  const isNewRecord = previousBestMs === null || safeMs < previousBestMs;
  const bestMs = isNewRecord ? safeMs : previousBestMs;
  const next = isNewRecord ? { ...clean, [levelKey]: safeMs } : clean;
  return {
    next,
    isNewRecord,
    previousBestMs,
    bestMs
  };
}
