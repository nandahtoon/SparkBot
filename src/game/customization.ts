import type { BotThemeId, PartId } from './engine';

export type BotCharacterId = 'sparkbot' | 'sprout' | 'nova' | 'robobuddy' | 'learnbot';

export const BOT_CHARACTER_ORDER: BotCharacterId[] = [
  'sparkbot',
  'sprout',
  'nova',
  'robobuddy',
  'learnbot'
];

export interface BotCharacterDef {
  id: BotCharacterId;
  name: string;
  title: string;
  portraitUrl: string | null;
  portraitPosition: string;
  portraitScale: number;
  portraitOrigin: string;
  accentCss: string;
  defaultBodyHex: string;
  defaultHeadHex: string;
  defaultAccentHex: string;
  voicePitch: number;
  greeting: string;
}

export const BOT_CHARACTERS: Record<BotCharacterId, BotCharacterDef> = {
  sparkbot: {
    id: 'sparkbot',
    name: 'SparkBot',
    title: 'Classic Workshop Bot',
    portraitUrl: null,
    portraitPosition: 'center',
    portraitScale: 1,
    portraitOrigin: '50% 50%',
    accentCss: '#fbbf24',
    defaultBodyHex: '#fbbf24',
    defaultHeadHex: '#dbeafe',
    defaultAccentHex: '#334155',
    voicePitch: 1.0,
    greeting: 'Beep-boop! SparkBot ready to build!'
  },
  sprout: {
    id: 'sprout',
    name: 'Sprout',
    title: 'Forest Trail Explorer',
    portraitUrl: '/assets/aistudio/image_7fdf8a7b.png',
    portraitPosition: '28% 26%',
    portraitScale: 2.15,
    portraitOrigin: '29% 22%',
    accentCss: '#fb923c',
    defaultBodyHex: '#f8fafc',
    defaultHeadHex: '#f1f5f9',
    defaultAccentHex: '#ea580c',
    voicePitch: 1.12,
    greeting: 'Yay! Sprout is ready for adventure!'
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    title: 'Sky Guide Owl-Bot',
    portraitUrl: '/assets/aistudio/image_94069a90.png',
    portraitPosition: '20% 20%',
    portraitScale: 2.35,
    portraitOrigin: '20% 16%',
    accentCss: '#38bdf8',
    defaultBodyHex: '#f8fafc',
    defaultHeadHex: '#e2e8f0',
    defaultAccentHex: '#f59e0b',
    voicePitch: 1.2,
    greeting: 'Hoo-beep! Nova wings powered up!'
  },
  robobuddy: {
    id: 'robobuddy',
    name: 'RoboBuddy',
    title: 'Star Scout Adventurer',
    portraitUrl: '/assets/aistudio/image_542ffeb1.png',
    portraitPosition: '18% 20%',
    portraitScale: 2.55,
    portraitOrigin: '18% 16%',
    accentCss: '#60a5fa',
    defaultBodyHex: '#f1f5f9',
    defaultHeadHex: '#f8fafc',
    defaultAccentHex: '#2563eb',
    voicePitch: 1.08,
    greeting: 'Big dreams ahead! RoboBuddy reporting!'
  },
  learnbot: {
    id: 'learnbot',
    name: 'LearnBot',
    title: 'Starry Learning Buddy',
    portraitUrl: '/assets/aistudio/image_abb9114d.png',
    portraitPosition: '12% 18%',
    portraitScale: 2.75,
    portraitOrigin: '10% 14%',
    accentCss: '#facc15',
    defaultBodyHex: '#fde047',
    defaultHeadHex: '#38bdf8',
    defaultAccentHex: '#0ea5e9',
    voicePitch: 1.16,
    greeting: 'Sparkle-beep! Let us learn and create!'
  }
};

export function normalizeBotCharacter(id?: string | null): BotCharacterId {
  if (
    id === 'sparkbot' ||
    id === 'sprout' ||
    id === 'nova' ||
    id === 'robobuddy' ||
    id === 'learnbot'
  ) {
    return id;
  }
  return 'sparkbot';
}

export type PaintPartKey = 'chassis' | 'head' | 'arms' | PartId;

export const PAINT_PART_ORDER: PaintPartKey[] = [
  'chassis',
  'head',
  'arms',
  'wheels',
  'treads',
  'thrusters',
  'booster',
  'laser',
  'magnet'
];

export const PAINT_PART_LABELS: Record<PaintPartKey, string> = {
  chassis: 'Chassis',
  head: 'Head',
  arms: 'Arms',
  wheels: 'Wheels',
  treads: 'Treads',
  thrusters: 'Thrusters',
  booster: 'Booster',
  laser: 'Laser',
  magnet: 'Magnet'
};

export type DecalId =
  | 'none'
  | 'stripes'
  | 'stars'
  | 'lightning'
  | 'flames'
  | 'leaf'
  | 'hearts'
  | 'checker';

export const DECAL_ORDER: DecalId[] = [
  'none',
  'stripes',
  'stars',
  'lightning',
  'flames',
  'leaf',
  'hearts',
  'checker'
];

export const DECAL_LABELS: Record<DecalId, string> = {
  none: 'Clean',
  stripes: 'Racing',
  stars: 'Stars',
  lightning: 'Bolt',
  flames: 'Flames',
  leaf: 'Leaf',
  hearts: 'Hearts',
  checker: 'Checker'
};

export const PAINT_COLOR_SWATCHES: Array<{ hex: string; name: string }> = [
  { hex: '#fbbf24', name: 'Solar Amber' },
  { hex: '#f8fafc', name: 'Cloud White' },
  { hex: '#38bdf8', name: 'Sky Cyan' },
  { hex: '#34d399', name: 'Nova Emerald' },
  { hex: '#f472b6', name: 'Neon Pink' },
  { hex: '#ef4444', name: 'Turbo Red' },
  { hex: '#fb923c', name: 'Sunset Orange' },
  { hex: '#a855f7', name: 'Cosmic Violet' },
  { hex: '#6366f1', name: 'Electric Indigo' },
  { hex: '#fde047', name: 'Star Yellow' },
  { hex: '#2dd4bf', name: 'Aqua Teal' },
  { hex: '#334155', name: 'Stealth Slate' }
];

export interface PartPaintSpec {
  color: string; // #rrggbb
  decal: DecalId;
}

export interface PaintBoothConfig {
  parts: Record<PaintPartKey, PartPaintSpec>;
}

export interface SavedPaintTheme {
  id: string;
  name: string;
  characterId?: BotCharacterId;
  config: PaintBoothConfig;
  updatedAt: number;
}

export const MAX_SAVED_PAINT_THEMES = 8;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeHexColor(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

export function normalizeDecalId(input: unknown): DecalId {
  if (
    input === 'none' ||
    input === 'stripes' ||
    input === 'stars' ||
    input === 'lightning' ||
    input === 'flames' ||
    input === 'leaf' ||
    input === 'hearts' ||
    input === 'checker'
  ) {
    return input;
  }
  return 'none';
}

export function createDefaultPaintConfig(
  theme: BotThemeId = 'amber',
  characterId: BotCharacterId = 'sparkbot'
): PaintBoothConfig {
  const charDef = BOT_CHARACTERS[normalizeBotCharacter(characterId)];
  const themeBody =
    theme === 'cobalt' ? '#38bdf8' : theme === 'emerald' ? '#34d399' : charDef.defaultBodyHex;
  const chassisColor = characterId === 'sparkbot' ? themeBody : charDef.defaultBodyHex;

  return {
    parts: {
      chassis: { color: chassisColor, decal: 'none' },
      head: { color: charDef.defaultHeadHex, decal: 'none' },
      arms: { color: '#dbeafe', decal: 'none' },
      wheels: { color: '#38bdf8', decal: 'none' },
      treads: { color: '#34d399', decal: 'none' },
      thrusters: { color: '#ef4444', decal: 'none' },
      booster: { color: '#f472b6', decal: 'none' },
      laser: { color: '#22d3ee', decal: 'none' },
      magnet: { color: '#818cf8', decal: 'none' }
    }
  };
}

export function normalizePaintConfig(
  input?: Partial<PaintBoothConfig> | null,
  fallbackTheme: BotThemeId = 'amber',
  fallbackChar: BotCharacterId = 'sparkbot'
): PaintBoothConfig {
  const base = createDefaultPaintConfig(fallbackTheme, fallbackChar);
  const rawParts = input?.parts || ({} as Partial<Record<PaintPartKey, Partial<PartPaintSpec>>>);
  const parts = {} as Record<PaintPartKey, PartPaintSpec>;
  for (const key of PAINT_PART_ORDER) {
    const raw = rawParts[key];
    parts[key] = {
      color: normalizeHexColor(raw?.color, base.parts[key].color),
      decal: normalizeDecalId(raw?.decal)
    };
  }
  return { parts };
}

export function setPartPaint(
  config: PaintBoothConfig,
  part: PaintPartKey,
  patch: Partial<PartPaintSpec>
): PaintBoothConfig {
  const current = config.parts[part];
  return {
    parts: {
      ...config.parts,
      [part]: {
        color: patch.color !== undefined ? normalizeHexColor(patch.color, current.color) : current.color,
        decal: patch.decal !== undefined ? normalizeDecalId(patch.decal) : current.decal
      }
    }
  };
}

export function normalizeSavedPaintThemes(input: unknown): SavedPaintTheme[] {
  if (!Array.isArray(input)) return [];
  const out: SavedPaintTheme[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<SavedPaintTheme>;
    const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim().slice(0, 48) : '';
    const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim().slice(0, 28) : '';
    if (!id || !name) continue;
    out.push({
      id,
      name,
      characterId: rec.characterId ? normalizeBotCharacter(rec.characterId) : undefined,
      config: normalizePaintConfig(rec.config),
      updatedAt: typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt) ? rec.updatedAt : Date.now()
    });
    if (out.length >= MAX_SAVED_PAINT_THEMES) break;
  }
  return out;
}

export function upsertSavedPaintTheme(
  themes: SavedPaintTheme[],
  name: string,
  config: PaintBoothConfig,
  characterId: BotCharacterId,
  nowMs = Date.now()
): SavedPaintTheme[] {
  const cleanName = name.trim().slice(0, 28) || `Custom Look ${themes.length + 1}`;
  const lower = cleanName.toLowerCase();
  const existingIdx = themes.findIndex((t) => t.name.toLowerCase() === lower);
  const clonedConfig = normalizePaintConfig(config);

  if (existingIdx >= 0) {
    const updated = [...themes];
    updated[existingIdx] = {
      ...updated[existingIdx],
      name: cleanName,
      characterId,
      config: clonedConfig,
      updatedAt: nowMs
    };
    return updated;
  }

  const nextTheme: SavedPaintTheme = {
    id: `theme_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    characterId,
    config: clonedConfig,
    updatedAt: nowMs
  };

  return [nextTheme, ...themes].slice(0, MAX_SAVED_PAINT_THEMES);
}

export function deleteSavedPaintTheme(themes: SavedPaintTheme[], id: string): SavedPaintTheme[] {
  return themes.filter((t) => t.id !== id);
}
