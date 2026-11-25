import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings, type AudioSettings } from './audioConfig';
import {
  BOT_CHARACTER_ORDER,
  BOT_CHARACTERS,
  createDefaultPaintConfig,
  DECAL_LABELS,
  DECAL_ORDER,
  deleteSavedPaintTheme,
  MAX_SAVED_PAINT_THEMES,
  normalizeBotCharacter,
  normalizeDecalId,
  normalizeHexColor,
  normalizePaintConfig,
  normalizeSavedPaintThemes,
  PAINT_COLOR_SWATCHES,
  PAINT_PART_LABELS,
  PAINT_PART_ORDER,
  setPartPaint,
  upsertSavedPaintTheme,
  type BotCharacterDef,
  type BotCharacterId,
  type DecalId,
  type PaintBoothConfig,
  type PaintPartKey,
  type PartPaintSpec,
  type SavedPaintTheme
} from './customization';
import { BONUS_LEVELS, getLevelById, LEVELS, makeCircuit } from './levels';
import { cloneCircuitGrid, findCircuitFixCell, reflectDir, traceCircuit } from './optics';
import {
  buildStepInspection,
  calculateStars,
  canPlacePartInSlot,
  CHASSIS_SOLVER_PROFILES,
  cloneChassis,
  collectAncestorBlockIds,
  computeChassisInfo,
  computeCompressedBlockCount,
  computeGhostPreviewPlan,
  countBlocks,
  createEmptyChassis,
  evaluateBonusStar,
  findOptimalCrystalTrackSolution,
  findShortestTrackPlan,
  flattenBlocks,
  generateStructuralHint,
  getTutorialStep,
  hasEmptyContainer,
  simulateProgram,
  validateBonusStarConditions,
  type GhostPreviewPlan,
  type SimStepInspection,
  type TutorialStep
} from './simulator';
import {
  BOT_THEME_ORDER,
  BOT_THEMES,
  getPartTooltipInfo,
  HINT_THRESHOLD_MS,
  MAGBOT_BOLTS_KEY,
  MAGBOT_BOLTS_PER_PASS,
  MAGBOT_PASSES_KEY,
  MAGBOT_PERKS_KEY,
  normalizeBotTheme,
  parseNonNegInt,
  PARTS,
  SAVE_KEY,
  type BlockType,
  type BotThemeDef,
  type BotThemeId,
  type ChassisGrid,
  type ChassisInfo,
  type CircuitCell,
  type CircuitCellType,
  type CircuitGrid,
  type CircuitSegment,
  type CircuitTraceResult,
  type CodeBlock,
  type DailyState,
  type LevelDef,
  type PartDef,
  type PartId,
  type PartTooltipInfo,
  type SandboxMissionDraft,
  type SaveProfile,
  type SensorCondition,
  type SimEvent,
  type SimResult,
  type SkillStats,
  type TileType,
  type TrackTile
} from './types';

export {
  DEFAULT_AUDIO_SETTINGS,
  normalizeAudioSettings,
  type AudioSettings,
  BOT_CHARACTER_ORDER,
  BOT_CHARACTERS,
  createDefaultPaintConfig,
  DECAL_LABELS,
  DECAL_ORDER,
  deleteSavedPaintTheme,
  MAX_SAVED_PAINT_THEMES,
  normalizeBotCharacter,
  normalizeDecalId,
  normalizeHexColor,
  normalizePaintConfig,
  normalizeSavedPaintThemes,
  PAINT_COLOR_SWATCHES,
  PAINT_PART_LABELS,
  PAINT_PART_ORDER,
  setPartPaint,
  upsertSavedPaintTheme,
  type BotCharacterDef,
  type BotCharacterId,
  type DecalId,
  type PaintBoothConfig,
  type PaintPartKey,
  type PartPaintSpec,
  type SavedPaintTheme,
  makeCircuit,
  LEVELS,
  BONUS_LEVELS,
  getLevelById,
  reflectDir,
  cloneCircuitGrid,
  traceCircuit,
  findCircuitFixCell,
  createEmptyChassis,
  cloneChassis,
  computeChassisInfo,
  canPlacePartInSlot,
  countBlocks,
  hasEmptyContainer,
  flattenBlocks,
  simulateProgram,
  buildStepInspection,
  collectAncestorBlockIds,
  calculateStars,
  CHASSIS_SOLVER_PROFILES,
  findShortestTrackPlan,
  computeCompressedBlockCount,
  findOptimalCrystalTrackSolution,
  generateStructuralHint,
  getTutorialStep,
  validateBonusStarConditions,
  evaluateBonusStar,
  computeGhostPreviewPlan,
  type GhostPreviewPlan,
  type SimStepInspection,
  type TutorialStep,
  SAVE_KEY,
  MAGBOT_PASSES_KEY,
  MAGBOT_BOLTS_KEY,
  MAGBOT_PERKS_KEY,
  MAGBOT_BOLTS_PER_PASS,
  HINT_THRESHOLD_MS,
  PARTS,
  getPartTooltipInfo,
  BOT_THEME_ORDER,
  BOT_THEMES,
  normalizeBotTheme,
  parseNonNegInt,
  type BlockType,
  type BotThemeDef,
  type BotThemeId,
  type ChassisGrid,
  type ChassisInfo,
  type CircuitCell,
  type CircuitCellType,
  type CircuitGrid,
  type CircuitSegment,
  type CircuitTraceResult,
  type CodeBlock,
  type DailyState,
  type LevelDef,
  type PartDef,
  type PartId,
  type PartTooltipInfo,
  type SandboxMissionDraft,
  type SaveProfile,
  type SensorCondition,
  type SimEvent,
  type SimResult,
  type SkillStats,
  type TileType,
  type TrackTile
};

// ---------- DAILY CHALLENGE & STREAKS ----------
export function getDailyDateKey(dateInput?: Date | string): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = dateInput instanceof Date ? dateInput : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDailyDateKey(dateKey: string, deltaDays: number): string {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return getDailyDateKey();
  const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + (deltaDays || 0)));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDailyState(dailyState?: Partial<DailyState>): DailyState {
  const ds = dailyState || {};
  const dateKey = typeof ds.dateKey === 'string' ? ds.dateKey : '';
  const stars = parseNonNegInt(ds.stars);
  const lastCompletedDate =
    typeof ds.lastCompletedDate === 'string' && ds.lastCompletedDate
      ? ds.lastCompletedDate
      : stars > 0 && dateKey
        ? dateKey
        : '';
  const lastLoginDate = typeof ds.lastLoginDate === 'string' && ds.lastLoginDate ? ds.lastLoginDate : '';
  let streak = parseNonNegInt(ds.streak);
  if (streak === 0 && ((lastCompletedDate && stars > 0) || lastLoginDate)) streak = 1;
  return {
    dateKey,
    stars,
    streak,
    lastCompletedDate,
    lastLoginDate
  };
}

function getLatestDailyActivityDate(norm: DailyState): string {
  if (norm.lastLoginDate && norm.lastCompletedDate) {
    return norm.lastLoginDate >= norm.lastCompletedDate ? norm.lastLoginDate : norm.lastCompletedDate;
  }
  return norm.lastLoginDate || norm.lastCompletedDate || '';
}

export function getActiveDailyStreak(dailyState: Partial<DailyState> | undefined, todayKey: string): number {
  const norm = normalizeDailyState(dailyState);
  const today = getDailyDateKey(todayKey);
  const lastActivity = getLatestDailyActivityDate(norm);
  if (!lastActivity || norm.streak <= 0) return 0;
  const yesterday = shiftDailyDateKey(today, -1);
  if (lastActivity === today || lastActivity === yesterday) {
    return norm.streak;
  }
  return 0;
}

export function getDailyStreakProgress(streak: number): {
  streak: number;
  tier: number;
  target: number;
  progress: number;
  label: string;
} {
  const s = parseNonNegInt(streak);
  if (s >= 7) {
    return { streak: s, tier: 7, target: 7, progress: 1, label: `${s}-Day Streak` };
  }
  if (s >= 3) {
    return { streak: s, tier: 3, target: 7, progress: s / 7, label: `${s}-Day Streak` };
  }
  return { streak: s, tier: 0, target: 3, progress: s / 3, label: s > 0 ? `${s}/3 Streak` : '' };
}

export function recordDailyLogin(
  dailyState: Partial<DailyState> | undefined,
  dateKey: string
): {
  daily: DailyState;
  prevStreak: number;
  streak: number;
  changed: boolean;
  hitMilestone: number;
} {
  const norm = normalizeDailyState(dailyState);
  const key = getDailyDateKey(dateKey);
  const prevActive = getActiveDailyStreak(norm, key);
  const lastActivity = getLatestDailyActivityDate(norm);
  let nextStreak = norm.streak;
  let changed = false;

  if (norm.lastLoginDate === key) {
    nextStreak = Math.max(1, norm.streak);
  } else if (lastActivity === key) {
    nextStreak = Math.max(1, norm.streak);
    changed = true;
  } else if (lastActivity && shiftDailyDateKey(lastActivity, 1) === key) {
    nextStreak = Math.max(1, norm.streak) + 1;
    changed = true;
  } else {
    nextStreak = 1;
    changed = true;
  }

  const prevTier = getDailyStreakProgress(prevActive).tier;
  const nextTier = getDailyStreakProgress(nextStreak).tier;
  const hitMilestone = nextTier > prevTier ? nextTier : 0;

  return {
    daily: {
      dateKey: norm.dateKey,
      stars: norm.stars,
      streak: nextStreak,
      lastCompletedDate: norm.lastCompletedDate,
      lastLoginDate: key
    },
    prevStreak: prevActive,
    streak: nextStreak,
    changed,
    hitMilestone
  };
}

export function recordDailyCompletion(
  dailyState: Partial<DailyState> | undefined,
  dateKey: string,
  stars: number
): DailyState {
  const norm = normalizeDailyState(dailyState);
  const key = getDailyDateKey(dateKey);
  const safeStars = Math.max(1, Math.min(3, Number(stars) || 1));
  const lastActivity = getLatestDailyActivityDate(norm);
  let nextStreak = 1;
  if (lastActivity === key) {
    nextStreak = Math.max(1, norm.streak);
  } else if (lastActivity && shiftDailyDateKey(lastActivity, 1) === key) {
    nextStreak = Math.max(1, norm.streak) + 1;
  }
  const nextStars = norm.dateKey === key ? Math.max(norm.stars, safeStars) : safeStars;
  return {
    dateKey: key,
    stars: nextStars,
    streak: nextStreak,
    lastCompletedDate: key,
    lastLoginDate: norm.lastLoginDate
  };
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function rngPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function requiredTurnRot(inDir: number, outDir: number): number {
  return reflectDir(inDir, 0) === outDir ? 0 : 1;
}

function generateDailyCircuit(rng: () => number): CircuitGrid {
  let grid: CircuitGrid | null = null;

  for (let attempt = 0; attempt < 80; attempt++) {
    const cand = makeCircuit([]);
    const useSplitter = rng() < 0.45;
    const c1 = rngInt(rng, 1, useSplitter ? 3 : 4);
    const d1 = rng() < 0.5 ? 1 : 3;
    const r2 = d1 === 3 ? rngInt(rng, 0, 1) : rngInt(rng, 3, 4);

    if (!useSplitter) {
      cand[2][c1] = { type: 'mirror', rot: requiredTurnRot(0, d1) };
      const d2choices: number[] = [];
      if (c1 > 0) d2choices.push(2);
      if (c1 < 4) d2choices.push(0);
      const d2 = rngPick(rng, d2choices);
      cand[r2][c1] = { type: 'mirror', rot: requiredTurnRot(d1, d2) };
      const c2 = d2 === 2 ? rngInt(rng, 0, c1 - 1) : rngInt(rng, c1 + 1, 4);

      const numBounces = rngInt(rng, 2, 4);
      if (numBounces === 2) {
        cand[r2][c2] = { type: 'core', rot: 0 };
      } else {
        const d3choices: number[] = [];
        if (r2 > 0) d3choices.push(3);
        if (r2 < 4) d3choices.push(1);
        const d3 = rngPick(rng, d3choices);
        const r3 = d3 === 3 ? rngInt(rng, 0, r2 - 1) : rngInt(rng, r2 + 1, 4);
        cand[r2][c2] = { type: 'mirror', rot: requiredTurnRot(d2, d3) };
        if (numBounces === 3 || rng() < 0.5) {
          cand[r3][c2] = { type: 'core', rot: 0 };
        } else {
          const d4choices: number[] = [];
          if (c2 > 0) d4choices.push(2);
          if (c2 < 4) d4choices.push(0);
          const d4 = rngPick(rng, d4choices);
          const c3 = d4 === 2 ? rngInt(rng, 0, c2 - 1) : rngInt(rng, c2 + 1, 4);
          cand[r3][c2] = { type: 'mirror', rot: requiredTurnRot(d3, d4) };
          cand[r3][c3] = { type: 'core', rot: 0 };
        }
      }
    } else {
      cand[2][c1] = { type: 'splitter', rot: requiredTurnRot(0, d1) };
      const core1Col = rngInt(rng, c1 + 1, 4);
      cand[2][core1Col] = { type: 'core', rot: 0 };

      const sd2choices: number[] = [];
      if (c1 > 0) sd2choices.push(2);
      if (c1 < 4) sd2choices.push(0);
      const sd2 = rngPick(rng, sd2choices);
      cand[r2][c1] = { type: 'mirror', rot: requiredTurnRot(d1, sd2) };
      const sc2 = sd2 === 2 ? rngInt(rng, 0, c1 - 1) : rngInt(rng, c1 + 1, 4);

      if (rng() < 0.55) {
        cand[r2][sc2] = { type: 'core', rot: 0 };
      } else {
        const sd3choices: number[] = [];
        if (r2 > 0) sd3choices.push(3);
        if (r2 < 4) sd3choices.push(1);
        const sd3 = rngPick(rng, sd3choices);
        const sr3 = sd3 === 3 ? rngInt(rng, 0, r2 - 1) : rngInt(rng, r2 + 1, 4);
        cand[r2][sc2] = { type: 'mirror', rot: requiredTurnRot(sd2, sd3) };
        cand[sr3][sc2] = { type: 'core', rot: 0 };
      }
    }

    const solvedTrace = traceCircuit(cand);
    if (!solvedTrace.solved || solvedTrace.totalCores < 1) continue;

    let wallCount = rngInt(rng, 1, 3);
    for (let w = 0; w < wallCount * 4 && wallCount > 0; w++) {
      const wr = rngInt(rng, 0, 4);
      const wc = rngInt(rng, 0, 4);
      if (cand[wr][wc].type !== 'empty') continue;
      cand[wr][wc] = { type: 'wall', rot: 0 };
      if (traceCircuit(cand).solved) {
        wallCount--;
      } else {
        cand[wr][wc] = { type: 'empty', rot: 0 };
      }
    }

    const toggleables: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (cand[r][c].type === 'mirror' || cand[r][c].type === 'splitter') {
          toggleables.push({ r, c });
        }
      }
    }
    if (toggleables.length < 1 || toggleables.length > 6) continue;

    const scrambled = cloneCircuitGrid(cand);
    const flipsTarget = rngInt(rng, 1, Math.min(3, toggleables.length));
    const pool = toggleables.slice();
    for (let f = 0; f < flipsTarget && pool.length > 0; f++) {
      const pickIdx = rngInt(rng, 0, pool.length - 1);
      const tg = pool.splice(pickIdx, 1)[0];
      scrambled[tg.r][tg.c].rot = scrambled[tg.r][tg.c].rot === 0 ? 1 : 0;
    }
    if (traceCircuit(scrambled).solved) {
      for (const tg2 of toggleables) {
        scrambled[tg2.r][tg2.c].rot = scrambled[tg2.r][tg2.c].rot === 0 ? 1 : 0;
        if (!traceCircuit(scrambled).solved) break;
      }
    }
    if (!traceCircuit(scrambled).solved && findCircuitFixCell(scrambled)) {
      grid = scrambled;
      break;
    }
  }

  if (!grid) {
    grid = makeCircuit([
      { r: 2, c: 2, type: 'mirror', rot: 1 },
      { r: 0, c: 2, type: 'mirror', rot: 0 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 }
    ]);
  }
  return grid;
}

export function generateDailyChallenge(dateInput?: Date | string): LevelDef & { isDaily: true; dailyDateKey: string } {
  const dateKey = getDailyDateKey(dateInput);
  const rng = createSeededRng(hashSeed(`sparkbot-daily-v1-${dateKey}`));
  const themeIdx = rngInt(rng, 0, 4);
  const themeMeta = [
    { tag: 'Gap Hopper', tiles: ['normal', 'gap'] as TileType[], brief: 'Leap over wide laser-lab chasms and snag every crystal!' },
    { tag: 'Mud Runner', tiles: ['normal', 'mud', 'gap'] as TileType[], brief: 'Heavy sludge meets open pits — balance grip and boost!' },
    { tag: 'Turbo Ramp', tiles: ['normal', 'ramp', 'gap'] as TileType[], brief: 'Steep booster ramps ahead! Time every surge carefully.' },
    { tag: 'Tread Forge', tiles: ['normal', 'mud', 'ramp'] as TileType[], brief: 'Sticky mud pits and steep ramps block the gate!' },
    { tag: 'Reactor Mix', tiles: ['normal', 'mud', 'gap', 'ramp'] as TileType[], brief: 'All-terrain test! Mix parts smartly within budget.' }
  ][themeIdx];

  let bestLevel: (LevelDef & { isDaily: true; dailyDateKey: string }) | null = null;

  for (let attempt = 0; attempt < 36; attempt++) {
    const len = rngInt(rng, 8, 10);
    const track: TrackTile[] = [{ type: 'start', crystal: false }];
    for (let i = 1; i < len - 1; i++) {
      const prev = track[i - 1].type;
      let tType = rngPick(rng, themeMeta.tiles);
      if ((tType === 'gap' || tType === 'ramp') && (prev === 'gap' || prev === 'ramp') && i < len - 2) {
        tType = rng() < 0.65 ? 'normal' : themeMeta.tiles.includes('mud') ? 'mud' : 'normal';
      }
      if (i === len - 2 && tType === 'ramp') tType = 'normal';
      track.push({ type: tType, crystal: false });
    }
    track.push({ type: 'gate', crystal: false });

    const crystalCountTarget = rngInt(rng, 2, 3);
    const validCrystalSlots: number[] = [];
    for (let s = 1; s < len - 1; s++) {
      if (track[s].type !== 'gap') validCrystalSlots.push(s);
    }
    for (let c = 0; c < crystalCountTarget && validCrystalSlots.length > 0; c++) {
      const pick = rngInt(rng, 0, validCrystalSlots.length - 1);
      const tileIdx = validCrystalSlots.splice(pick, 1)[0];
      track[tileIdx].crystal = true;
    }

    const sol = findOptimalCrystalTrackSolution(track, 130);
    if (!sol) continue;

    const parBudget = sol.profile.cost;
    const extra = rngPick(rng, [10, 15, 20]);
    const budget = Math.min(130, Math.max(parBudget + 10, parBudget + extra));
    const parBlocks = Math.max(1, computeCompressedBlockCount(sol.sequence));

    bestLevel = {
      id: 0,
      isDaily: true,
      dailyDateKey: dateKey,
      name: `Daily Lab: ${themeMeta.tag}`,
      ageLabel: `Daily · ${dateKey}`,
      brief: `24h Challenge (${dateKey}): ${themeMeta.brief}`,
      budget,
      parBudget,
      parBlocks,
      loopUnlocked: true,
      ifUnlocked: true,
      track,
      circuit: generateDailyCircuit(rng)
    };
    break;
  }

  if (!bestLevel) {
    const fallbackTrack: TrackTile[] = [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'ramp', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ];
    const fbSol = findOptimalCrystalTrackSolution(fallbackTrack, 130);
    bestLevel = {
      id: 0,
      isDaily: true,
      dailyDateKey: dateKey,
      name: 'Daily Lab: Reactor Mix',
      ageLabel: `Daily · ${dateKey}`,
      brief: `24h Challenge (${dateKey}): ${themeMeta.brief}`,
      budget: 120,
      parBudget: fbSol ? fbSol.profile.cost : 110,
      parBlocks: fbSol ? Math.max(1, computeCompressedBlockCount(fbSol.sequence)) : 4,
      loopUnlocked: true,
      ifUnlocked: true,
      track: fallbackTrack,
      circuit: generateDailyCircuit(rng)
    };
  }

  return bestLevel;
}

// ---------- MAGBOT PERKS & SHARED REWARD STORAGE ----------
export function computeMagbotPerks(
  saveObj: {
    stars?: Record<string, number>;
    bonusStars?: Record<string, { stars: number; bonusStar: boolean } | number>;
    daily?: Partial<DailyState>;
  },
  todayKey?: string
) {
  const s = saveObj && typeof saveObj === 'object' ? saveObj : {};
  const starsMap = s.stars || {};
  const bonusMap = s.bonusStars || {};
  let totalStars = 0;
  for (const lvl of LEVELS) {
    totalStars += parseNonNegInt(starsMap[lvl.id]);
  }
  let bonusCleared = 0;
  let bonusStarsEarned = 0;
  for (const bl of BONUS_LEVELS) {
    const rec = bonusMap[bl.id];
    if (rec && typeof rec === 'object') {
      const bStars = parseNonNegInt(rec.stars);
      totalStars += bStars;
      if (bStars > 0) bonusCleared++;
      if (rec.bonusStar) bonusStarsEarned++;
    } else if (typeof rec === 'number' && rec > 0) {
      totalStars += parseNonNegInt(rec);
      bonusCleared++;
    }
  }
  const streak = getActiveDailyStreak(s.daily, todayKey || getDailyDateKey());
  return {
    totalStars,
    bonusCleared,
    bonusStars: bonusStarsEarned,
    dailyStreak: streak,
    starterCube: totalStars >= 10 || bonusCleared >= 1,
    goldenWave: totalStars >= 18 || bonusCleared >= 2,
    overchargedAura: streak >= 3 || bonusCleared >= 3 || bonusStarsEarned >= 2
  };
}

export function syncMagbotPerks(
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null,
  saveObj: {
    stars?: Record<string, number>;
    bonusStars?: Record<string, { stars: number; bonusStar: boolean } | number>;
    daily?: Partial<DailyState>;
  },
  todayKey?: string
) {
  const perks = computeMagbotPerks(saveObj, todayKey);
  if (storage) {
    try {
      storage.setItem(MAGBOT_PERKS_KEY, JSON.stringify(perks));
    } catch {}
  }
  return perks;
}

export function getMagbotRewards(
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null
) {
  let passes = 0;
  let bolts = 0;
  if (!storage) return { passes: 0, bolts: 0 };
  try {
    const rawPasses = storage.getItem(MAGBOT_PASSES_KEY);
    const rawBolts = storage.getItem(MAGBOT_BOLTS_KEY);
    passes = rawPasses === null ? 0 : parseNonNegInt(rawPasses);
    bolts = rawBolts === null ? 0 : parseNonNegInt(rawBolts);
    if (rawPasses === null) storage.setItem(MAGBOT_PASSES_KEY, String(passes));
    if (rawBolts === null) storage.setItem(MAGBOT_BOLTS_KEY, String(bolts));
  } catch {}
  return { passes, bolts };
}

export function syncMagbotStorage(
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null,
  passes: number,
  bolts: number
) {
  if (!storage) return { passes, bolts };
  const safePasses = parseNonNegInt(passes);
  const safeBolts = parseNonNegInt(bolts);
  try {
    storage.setItem(MAGBOT_PASSES_KEY, String(safePasses));
    storage.setItem(MAGBOT_BOLTS_KEY, String(safeBolts));
  } catch {}
  return { passes: safePasses, bolts: safeBolts };
}

export function awardMagbotPass(
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null
) {
  const current = getMagbotRewards(storage);
  return syncMagbotStorage(storage, current.passes + 1, current.bolts + MAGBOT_BOLTS_PER_PASS);
}

export function buildMagbotLaunchUrl(runs: number, bolts: number, fromLevel: string | number): string {
  const safeRuns = Math.max(1, parseNonNegInt(runs));
  const safeBolts = parseNonNegInt(bolts);
  const lvl = fromLevel !== undefined && fromLevel !== null && fromLevel !== '' ? String(fromLevel) : '1';
  return `magbot.html?runs=${encodeURIComponent(String(safeRuns))}&bolts=${encodeURIComponent(String(safeBolts))}&fromLevel=${encodeURIComponent(lvl)}`;
}

// ---------- UNIFIED 3D ACTION WALL-RUN HELPERS ----------
export interface ActionDashConfig {
  endless: boolean;
  gentleSpeed: boolean;
  chassisInfo: ChassisInfo;
}

export interface ActionDashMetrics {
  distance: number;
  targetDistance: number;
  bolts: number;
  cubes: number;
  boltMeter: number;
  boltPerCube: number;
  surface: 'floor' | 'leftWall' | 'rightWall';
  lane: number;
  turboTimer: number;
  magnetTimer: number;
  shieldActive: boolean;
  finished: boolean;
  crashed: boolean;
}

export function createActionDashMetrics(cfg: ActionDashConfig): ActionDashMetrics {
  const boltPerCube = cfg.chassisInfo.hasMagnet ? 5 : 7;
  return {
    distance: 0,
    targetDistance: cfg.endless ? 0 : 120,
    bolts: 0,
    cubes: 0,
    boltMeter: 0,
    boltPerCube,
    surface: 'floor',
    lane: 1,
    turboTimer: cfg.chassisInfo.hasBooster ? 1.5 : 0,
    magnetTimer: cfg.chassisInfo.hasMagnet ? 8 : 0,
    shieldActive: cfg.chassisInfo.hasFrontLaser,
    finished: false,
    crashed: false
  };
}

export function applyBoltCollection(metrics: ActionDashMetrics, count = 1): { cubesEarned: number } {
  metrics.bolts += count;
  metrics.boltMeter += count;
  let cubesEarned = 0;
  while (metrics.boltMeter >= metrics.boltPerCube) {
    metrics.boltMeter -= metrics.boltPerCube;
    metrics.cubes += 1;
    cubesEarned += 1;
  }
  return { cubesEarned };
}

export function stepActionSurfaceMove(
  surface: ActionDashMetrics['surface'],
  lane: number,
  dir: -1 | 1,
  allowWallRun: boolean
): { surface: ActionDashMetrics['surface']; lane: number } {
  if (surface === 'floor') {
    const next = lane + dir;
    if (next < 0) {
      return allowWallRun ? { surface: 'leftWall', lane: 0 } : { surface: 'floor', lane: 0 };
    }
    if (next > 2) {
      return allowWallRun ? { surface: 'rightWall', lane: 0 } : { surface: 'floor', lane: 2 };
    }
    return { surface: 'floor', lane: next };
  }
  if (surface === 'leftWall') {
    if (dir < 0) {
      return { surface: 'leftWall', lane: Math.min(1, lane + 1) };
    }
    if (lane > 0) return { surface: 'leftWall', lane: lane - 1 };
    return { surface: 'floor', lane: 0 };
  }
  if (dir > 0) {
    return { surface: 'rightWall', lane: Math.min(1, lane + 1) };
  }
  if (lane > 0) return { surface: 'rightWall', lane: lane - 1 };
  return { surface: 'floor', lane: 2 };
}

export function defaultSkillStats(): SkillStats {
  return {
    chassisBuilds: 0,
    jumpsCleared: 0,
    mudCleared: 0,
    loopsCompressed: 0,
    sensorsUsed: 0,
    circuitsSolved: 0
  };
}

export type StemPillarId = 'chassis' | 'physics' | 'mud' | 'loops' | 'sensors' | 'optics';

export interface StemBadgeProgress {
  id: StemPillarId;
  count: number;
  tier: 0 | 1 | 2 | 3;
  thresholds: [number, number, number];
  nextTarget: number;
}

const STEM_THRESHOLDS: Record<StemPillarId, [number, number, number]> = {
  chassis: [1, 4, 8],
  physics: [1, 4, 9],
  mud: [1, 3, 6],
  loops: [1, 3, 6],
  sensors: [1, 3, 6],
  optics: [1, 4, 8]
};

export function computeStemSkillBadges(statsInput?: Partial<SkillStats>): StemBadgeProgress[] {
  const s: SkillStats = { ...defaultSkillStats(), ...(statsInput || {}) };
  const mapCount: Record<StemPillarId, number> = {
    chassis: parseNonNegInt(s.chassisBuilds),
    physics: parseNonNegInt(s.jumpsCleared),
    mud: parseNonNegInt(s.mudCleared),
    loops: parseNonNegInt(s.loopsCompressed),
    sensors: parseNonNegInt(s.sensorsUsed),
    optics: parseNonNegInt(s.circuitsSolved)
  };
  const order: StemPillarId[] = ['chassis', 'physics', 'mud', 'loops', 'sensors', 'optics'];
  return order.map((id) => {
    const count = mapCount[id];
    const thresholds = STEM_THRESHOLDS[id];
    const tier: 0 | 1 | 2 | 3 =
      count >= thresholds[2] ? 3 : count >= thresholds[1] ? 2 : count >= thresholds[0] ? 1 : 0;
    const nextTarget =
      tier === 0 ? thresholds[0] : tier === 1 ? thresholds[1] : thresholds[2];
    return { id, count, tier, thresholds, nextTarget };
  });
}

function hasBlockTypeInProgram(blocks: CodeBlock[], target: BlockType): boolean {
  for (const b of blocks || []) {
    if (b.type === target) return true;
    if (b.children && hasBlockTypeInProgram(b.children, target)) return true;
  }
  return false;
}

export function recordSkillMastery(
  prevStats: Partial<SkillStats> | undefined,
  level: LevelDef,
  chassis: ChassisGrid,
  program: CodeBlock[],
  sim: SimResult
): { next: SkillStats; upgradedPillars: StemPillarId[] } {
  const cur: SkillStats = { ...defaultSkillStats(), ...(prevStats || {}) };
  const info = computeChassisInfo(chassis);
  const blkCount = countBlocks(program);

  const next: SkillStats = {
    chassisBuilds: cur.chassisBuilds + (info.cost <= level.budget && info.hasDrive ? 1 : 0),
    jumpsCleared:
      cur.jumpsCleared +
      (sim.status === 'win' &&
      (level.track.some((t) => t.type === 'gap' || t.type === 'ramp') ||
        info.hasThrusters ||
        info.hasBooster)
        ? 1
        : 0),
    mudCleared:
      cur.mudCleared +
      (sim.status === 'win' && level.track.some((t) => t.type === 'mud') && info.hasTreads ? 1 : 0),
    loopsCompressed:
      cur.loopsCompressed +
      (sim.status === 'win' && hasBlockTypeInProgram(program, 'LOOP') && blkCount <= level.parBlocks
        ? 1
        : 0),
    sensorsUsed:
      cur.sensorsUsed +
      (sim.status === 'win' &&
      hasBlockTypeInProgram(program, 'IF') &&
      sim.events.some((ev) => ev.action === 'SCAN' && ev.scanMatch)
        ? 1
        : 0),
    circuitsSolved: cur.circuitsSolved + 1,
    ...(cur.bugsDebugged !== undefined ? { bugsDebugged: cur.bugsDebugged } : {}),
    ...(cur.logicGatesSolved !== undefined ? { logicGatesSolved: cur.logicGatesSolved } : {})
  };

  const beforeBadges = computeStemSkillBadges(cur);
  const afterBadges = computeStemSkillBadges(next);
  const upgradedPillars: StemPillarId[] = [];
  for (let i = 0; i < afterBadges.length; i++) {
    if (afterBadges[i].tier > beforeBadges[i].tier) {
      upgradedPillars.push(afterBadges[i].id);
    }
  }

  return { next, upgradedPillars };
}

export function defaultSaveProfile(): SaveProfile {
  return {
    profileName: 'Cadet Engineer',
    unlockedLevel: 1,
    unlockedBonus: 9,
    stars: {},
    bonusStars: {},
    muted: false,
    audio: { ...DEFAULT_AUDIO_SETTINGS },
    gentleSpeed: true,
    lowGraphics: false,
    graphicsQuality: 'auto',
    challengeTimerEnabled: false,
    readAloudEnabled: false,
    hapticsEnabled: true,
    bestTimes: {},
    tutorialDone: false,
    botTheme: 'amber',
    botCharacter: 'sparkbot',
    paintBooth: createDefaultPaintConfig('amber', 'sparkbot'),
    savedPaintThemes: [],
    daily: {
      dateKey: '',
      stars: 0,
      streak: 0,
      lastCompletedDate: '',
      lastLoginDate: ''
    },
    bestDashDistance: 0,
    totalBolts: 0,
    passes: 0,
    skillStats: defaultSkillStats(),
    streakShields: 0,
    unlockedFactIds: [],
    adaptiveHintsEnabled: true,
    sandbox: {
      name: 'My Custom Lab',
      budget: 120,
      track: [
        { type: 'start', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'ramp', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gate', crystal: false }
      ],
      circuit: cloneCircuitGrid(LEVELS[0].circuit),
      savedLevels: []
    }
  };
}
