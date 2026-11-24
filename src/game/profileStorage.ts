import {
  computeChassisInfo,
  createDefaultPaintConfig,
  createEmptyChassis,
  defaultSaveProfile,
  defaultSkillStats,
  getDailyDateKey,
  normalizeAudioSettings,
  normalizeBotCharacter,
  normalizeBotTheme,
  normalizePaintConfig,
  normalizeSavedPaintThemes,
  SAVE_KEY,
  syncMagbotPerks,
  type ChassisGrid,
  type LevelDef,
  type SaveProfile
} from './engine';
import { normalizeBestTimes } from './challengeTimer';
import {
  normalizeLearningTelemetry,
  normalizeStreakShields
} from './educationStrategy';

export const DEFAULT_PROFILE_NAME = 'Cadet Engineer';
export const MAX_PROFILE_NAME_LENGTH = 24;

function sanitizeProfileInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProfileName(raw: unknown): string {
  const cleaned = sanitizeProfileInput(raw);
  if (!cleaned) return DEFAULT_PROFILE_NAME;
  return cleaned.slice(0, MAX_PROFILE_NAME_LENGTH).trim() || DEFAULT_PROFILE_NAME;
}

export function validateProfileName(raw: string): {
  valid: boolean;
  normalized: string;
  error: string | null;
} {
  const cleaned = sanitizeProfileInput(raw);
  if (!cleaned) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a profile name.'
    };
  }
  if (cleaned.length > MAX_PROFILE_NAME_LENGTH) {
    return {
      valid: false,
      normalized: cleaned.slice(0, MAX_PROFILE_NAME_LENGTH).trim(),
      error: `Keep your profile name under ${MAX_PROFILE_NAME_LENGTH} characters.`
    };
  }
  return {
    valid: true,
    normalized: cleaned,
    error: null
  };
}

export function renameSaveProfile(
  save: SaveProfile,
  nextName: string
): { ok: boolean; save: SaveProfile; error: string | null } {
  const check = validateProfileName(nextName);
  if (!check.valid) {
    return { ok: false, save, error: check.error };
  }
  return {
    ok: true,
    save: { ...save, profileName: check.normalized },
    error: null
  };
}

export function normalizeSaveProfileData(parsed: Partial<SaveProfile> | null | undefined): SaveProfile {
  const base = defaultSaveProfile();
  if (!parsed || typeof parsed !== 'object') return base;
  const botTheme = normalizeBotTheme(parsed.botTheme);
  const botCharacter = normalizeBotCharacter(parsed.botCharacter);
  return {
    ...base,
    ...parsed,
    profileName: normalizeProfileName(parsed.profileName),
    audio: normalizeAudioSettings(parsed.audio),
    lowGraphics: Boolean(parsed.lowGraphics),
    challengeTimerEnabled: Boolean(parsed.challengeTimerEnabled),
    readAloudEnabled: Boolean(parsed.readAloudEnabled),
    hapticsEnabled: parsed.hapticsEnabled === undefined ? true : Boolean(parsed.hapticsEnabled),
    bestTimes: normalizeBestTimes(parsed.bestTimes),
    botTheme,
    botCharacter,
    paintBooth: parsed.paintBooth
      ? normalizePaintConfig(parsed.paintBooth, botTheme, botCharacter)
      : createDefaultPaintConfig(botTheme, botCharacter),
    savedPaintThemes: normalizeSavedPaintThemes(parsed.savedPaintThemes),
    stars: parsed.stars || base.stars,
    bonusStars: parsed.bonusStars || base.bonusStars,
    daily: { ...base.daily, ...(parsed.daily || {}) },
    skillStats: { ...defaultSkillStats(), ...(parsed.skillStats || {}) },
    streakShields: normalizeStreakShields(parsed.streakShields),
    unlockedFactIds: Array.isArray(parsed.unlockedFactIds)
      ? Array.from(new Set(parsed.unlockedFactIds.filter((x): x is string => typeof x === 'string')))
      : [],
    adaptiveHintsEnabled:
      parsed.adaptiveHintsEnabled === undefined ? true : Boolean(parsed.adaptiveHintsEnabled),
    learningTelemetry: normalizeLearningTelemetry(parsed.learningTelemetry),
    sandbox: parsed.sandbox ? { ...base.sandbox, ...parsed.sandbox } : base.sandbox
  };
}

export function loadSaveProfile(storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): SaveProfile {
  const base = defaultSaveProfile();
  if (!storage) return base;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveProfile>;
    return normalizeSaveProfileData(parsed);
  } catch {
    return base;
  }
}

export function persistSaveProfile(
  save: SaveProfile,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null
): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    syncMagbotPerks(storage, save, getDailyDateKey());
  } catch {
    // Ignore quota / private-browsing storage errors cleanly
  }
}

export function ensureActionDashChassis(chassis: ChassisGrid): ChassisGrid {
  if (computeChassisInfo(chassis).hasDrive) return chassis;
  const fallback = createEmptyChassis();
  fallback[2][0] = 'treads';
  fallback[1][0] = 'thrusters';
  fallback[0][0] = 'booster';
  fallback[1][2] = 'laser';
  fallback[2][1] = 'magnet';
  return fallback;
}

export function computeTotalStarsEarned(save: Pick<SaveProfile, 'stars' | 'bonusStars'>): number {
  let sum = 0;
  Object.values(save.stars).forEach((s) => {
    sum += s || 0;
  });
  Object.values(save.bonusStars).forEach((b) => {
    sum += typeof b === 'object' ? b.stars : typeof b === 'number' ? b : 0;
  });
  return sum;
}

export function getLevelSavedStars(save: SaveProfile, level: LevelDef): number {
  if (level.isSandbox || level.isClassCode) {
    return 0;
  }
  if (level.isDaily) {
    return save.daily.dateKey === level.dailyDateKey ? save.daily.stars : 0;
  }
  if (level.isBonus) {
    const rec = save.bonusStars[level.id];
    return typeof rec === 'object' ? rec.stars : typeof rec === 'number' ? rec : 0;
  }
  return save.stars[level.id] || 0;
}
