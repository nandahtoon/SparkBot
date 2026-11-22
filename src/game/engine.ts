import {
  DEFAULT_AUDIO_SETTINGS,
  normalizeAudioSettings,
  type AudioSettings
} from './audioConfig';
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
  type SavedPaintTheme
};

export const SAVE_KEY = 'sparkbot_save_v1';
export const MAGBOT_PASSES_KEY = 'magbot_run_passes';
export const MAGBOT_BOLTS_KEY = 'magbot_bonus_bolts';
export const MAGBOT_PERKS_KEY = 'magbot_perks_v1';
export const MAGBOT_BOLTS_PER_PASS = 50;
export const HINT_THRESHOLD_MS = 60000;

export type PartId = 'wheels' | 'treads' | 'thrusters' | 'booster' | 'laser' | 'magnet';

export interface PartDef {
  id: PartId;
  name: string;
  short: string;
  cost: number;
  role: string;
  color: string;
  preferredSlot: [number, number];
  unlocksLabel: string;
  placementHint: string;
  functionSummary: string;
  logicUseCase: string;
}

export const PARTS: Record<PartId, PartDef> = {
  wheels: {
    id: 'wheels',
    name: 'Standard Wheels',
    short: 'Wheels',
    cost: 20,
    role: 'Normal tiles',
    color: '#38bdf8',
    preferredSlot: [2, 0],
    unlocksLabel: 'MOVE',
    placementHint: 'Any chassis slot',
    functionSummary: 'Lightweight drive base for rolling smoothly across flat track tiles at low energy cost.',
    logicUseCase: 'Unlocks MOVE blocks. Pair with LOOP to cruise straight paths while saving budget for Thrusters or Boosters.'
  },
  treads: {
    id: 'treads',
    name: 'Monster Treads',
    short: 'Treads',
    cost: 35,
    role: 'Normal + Mud',
    color: '#34d399',
    preferredSlot: [2, 0],
    unlocksLabel: 'MOVE + MUD',
    placementHint: 'Any chassis slot',
    functionSummary: 'Heavy gripped tracks that power right through sticky mud tiles without bogging down.',
    logicUseCase: 'Lets MOVE and LOOP sequences roll straight across mud—skipping extra JUMP blocks or IF [MUD] branches.'
  },
  thrusters: {
    id: 'thrusters',
    name: 'Jump Thrusters',
    short: 'Thrusters',
    cost: 35,
    role: 'Enables JUMP',
    color: '#fbbf24',
    preferredSlot: [1, 0],
    unlocksLabel: 'JUMP',
    placementHint: 'Any chassis slot',
    functionSummary: 'Twin lift jets that launch your robot 2 tiles forward over open gaps and ground hazards.',
    logicUseCase: 'Unlocks JUMP blocks. Ideal inside IF [GAP] -> JUMP or IF [MUD] -> JUMP within a LOOP to clear repeating hazards.'
  },
  booster: {
    id: 'booster',
    name: 'Turbo Booster',
    short: 'Booster',
    cost: 30,
    role: 'Enables BOOST',
    color: '#f472b6',
    preferredSlot: [0, 0],
    unlocksLabel: 'BOOST',
    placementHint: 'Any chassis slot',
    functionSummary: 'High-thrust rocket pack that climbs steep ramps and blasts 2 tiles across open gaps.',
    logicUseCase: 'Unlocks BOOST blocks. Combine with IF [RAMP] -> BOOST inside a LOOP, or use on tight-budget stages to clear both ramps and gaps.'
  },
  laser: {
    id: 'laser',
    name: 'Laser Emitter',
    short: 'Laser',
    cost: 25,
    role: 'Front slot beam',
    color: '#22d3ee',
    preferredSlot: [1, 2],
    unlocksLabel: 'LASER GATE',
    placementHint: 'Front column (right) required',
    functionSummary: 'Optical beam emitter required on the front column to activate the security gate at the finish.',
    logicUseCase: 'Unlocks the 3D Laser Circuit puzzle after your code reaches the gate—route the beam via mirrors and splitters to power every core.'
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet Coils',
    short: 'Magnet',
    cost: 25,
    role: 'Wall-Run + Pull',
    color: '#818cf8',
    preferredSlot: [2, 1],
    unlocksLabel: 'WALL-RUN + PULL',
    placementHint: 'Any chassis slot',
    functionSummary: 'Electromagnetic side coils that pull nearby bolts and grip walls during Action Dash.',
    logicUseCase: 'Lowers bolts needed per shield cube in Action Dash and supports high-speed wall-runs after clearing the laser gate.'
  }
};

export interface PartTooltipInfo {
  part: PartDef;
  installedCount: number;
  remainingBudget: number;
  canAfford: boolean;
  budgetShortfall: number;
  requiresFrontColumn: boolean;
}

export function getPartTooltipInfo(
  partId: PartId,
  chassis: ChassisGrid,
  budget: number
): PartTooltipInfo {
  const part = PARTS[partId];
  let installedCount = 0;
  let usedCost = 0;
  for (let r = 0; r < chassis.length; r++) {
    for (let c = 0; c < chassis[r].length; c++) {
      const pid = chassis[r][c];
      if (!pid) continue;
      usedCost += PARTS[pid].cost;
      if (pid === partId) installedCount++;
    }
  }
  const remainingBudget = Math.max(0, budget - usedCost);
  const canAfford = usedCost + part.cost <= budget;
  const budgetShortfall = canAfford ? 0 : usedCost + part.cost - budget;
  return {
    part,
    installedCount,
    remainingBudget,
    canAfford,
    budgetShortfall,
    requiresFrontColumn: partId === 'laser'
  };
}

export type TileType = 'start' | 'normal' | 'gap' | 'mud' | 'ramp' | 'gate';

export interface TrackTile {
  type: TileType;
  crystal: boolean;
}

export type CircuitCellType = 'empty' | 'mirror' | 'splitter' | 'core' | 'wall';

export interface CircuitCell {
  type: CircuitCellType;
  rot: number;
}

export type CircuitGrid = CircuitCell[][];

export interface LevelDef {
  id: number;
  name: string;
  ageLabel: string;
  brief: string;
  budget: number;
  parBudget: number;
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked?: boolean;
  isBonus?: boolean;
  isDaily?: boolean;
  dailyDateKey?: string;
  track: TrackTile[];
  circuit: CircuitGrid;
}

export type ChassisGrid = (PartId | null)[][];

export type SensorCondition = 'GAP' | 'MUD' | 'RAMP';
export type BlockType = 'MOVE' | 'JUMP' | 'BOOST' | 'LOOP' | 'IF';

export interface CodeBlock {
  id: string;
  type: BlockType;
  count?: number;
  condition?: SensorCondition;
  children?: CodeBlock[];
}

export interface ChassisInfo {
  cost: number;
  partCount: number;
  hasWheels: boolean;
  hasTreads: boolean;
  hasDrive: boolean;
  hasThrusters: boolean;
  hasBooster: boolean;
  hasLaserAny: boolean;
  hasFrontLaser: boolean;
  hasMagnet: boolean;
}

export interface SimEvent {
  fromPos: number;
  toPos: number;
  action: 'MOVE' | 'JUMP' | 'BOOST' | 'SCAN';
  condition?: SensorCondition;
  scanTile?: number;
  scanMatch?: boolean;
  blockId: string;
  status: 'ok' | 'fail' | 'fall' | 'stuck';
  newCrystals: number[];
}

export interface SimResult {
  status: 'win' | 'fail';
  failReason: string | null;
  failCode: 'empty' | 'empty_container' | 'short' | 'missing_part' | 'gap' | 'mud' | 'ramp' | null;
  missingPart: PartId | null;
  events: SimEvent[];
  collectedCrystals: number;
  totalCrystals: number;
  finalPos: number;
}

export interface CircuitSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CircuitTraceResult {
  segments: CircuitSegment[];
  litCores: Record<string, boolean>;
  litCount: number;
  totalCores: number;
  solved: boolean;
}

export interface DailyState {
  dateKey: string;
  stars: number;
  streak: number;
  lastCompletedDate: string;
  lastLoginDate: string;
}

export interface SkillStats {
  chassisBuilds: number;
  jumpsCleared: number;
  mudCleared: number;
  loopsCompressed: number;
  sensorsUsed: number;
  circuitsSolved: number;
}

export type BotThemeId = 'amber' | 'cobalt' | 'emerald';

export const BOT_THEME_ORDER: BotThemeId[] = ['amber', 'cobalt', 'emerald'];

export interface BotThemeDef {
  id: BotThemeId;
  label: string;
  bodyHex: number;
  collarHex: number;
  swatchHex: string;
  ringHex: string;
}

export const BOT_THEMES: Record<BotThemeId, BotThemeDef> = {
  amber: {
    id: 'amber',
    label: 'Solar Amber',
    bodyHex: 0xfbbf24,
    collarHex: 0x334155,
    swatchHex: '#fbbf24',
    ringHex: '#fef08a'
  },
  cobalt: {
    id: 'cobalt',
    label: 'Cyber Cobalt',
    bodyHex: 0x38bdf8,
    collarHex: 0x1e3a8a,
    swatchHex: '#38bdf8',
    ringHex: '#bae6fd'
  },
  emerald: {
    id: 'emerald',
    label: 'Nova Emerald',
    bodyHex: 0x34d399,
    collarHex: 0x065f46,
    swatchHex: '#34d399',
    ringHex: '#a7f3d0'
  }
};

export function normalizeBotTheme(theme?: string | null): BotThemeId {
  if (theme === 'cobalt' || theme === 'emerald' || theme === 'amber') {
    return theme;
  }
  return 'amber';
}

export interface SaveProfile {
  profileName?: string;
  unlockedLevel: number;
  unlockedBonus: number;
  stars: Record<string, number>;
  bonusStars: Record<string, { stars: number; bonusStar: boolean } | number>;
  muted: boolean;
  audio?: AudioSettings;
  gentleSpeed: boolean;
  lowGraphics?: boolean;
  challengeTimerEnabled?: boolean;
  bestTimes?: Record<string, number>;
  tutorialDone: boolean;
  botTheme?: BotThemeId;
  botCharacter?: BotCharacterId;
  paintBooth?: PaintBoothConfig;
  savedPaintThemes?: SavedPaintTheme[];
  daily: DailyState;
  bestDashDistance: number;
  totalBolts: number;
  passes: number;
  skillStats?: SkillStats;
  sandbox: {
    budget: number;
    track: TrackTile[];
    circuit: CircuitGrid;
  };
}

export function makeCircuit(
  cells: Array<{ r: number; c: number; type: CircuitCellType; rot?: number }>
): CircuitGrid {
  const grid: CircuitGrid = [];
  for (let r = 0; r < 5; r++) {
    const row: CircuitCell[] = [];
    for (let c = 0; c < 5; c++) {
      row.push({ type: 'empty', rot: 0 });
    }
    grid.push(row);
  }
  for (let i = 0; i < cells.length; i++) {
    const item = cells[i];
    grid[item.r][item.c] = { type: item.type, rot: item.rot || 0 };
  }
  return grid;
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'First Spark',
    ageLabel: 'Ages 5-6',
    brief: 'Attach Standard Wheels and a front Laser Emitter, then program SparkBot to drive to the gate and bounce the laser!',
    budget: 100,
    parBudget: 45,
    parBlocks: 5,
    loopUnlocked: false,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'mirror', rot: 1 },
      { r: 0, c: 2, type: 'core', rot: 0 },
      { r: 4, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 2,
    name: 'Leap the Pit',
    ageLabel: 'Ages 5-7',
    brief: 'Watch out for open gaps! Add Jump Thrusters so SparkBot can use JUMP blocks to leap across pits.',
    budget: 110,
    parBudget: 80,
    parBlocks: 4,
    loopUnlocked: false,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 3, type: 'mirror', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 1 },
      { r: 4, c: 1, type: 'core', rot: 0 },
      { r: 0, c: 3, type: 'wall', rot: 0 },
      { r: 4, c: 4, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 3,
    name: 'Double Canyon',
    ageLabel: 'Ages 6-7',
    brief: 'Combine JUMP and MOVE to cross two canyons, then steer the laser around the security walls.',
    budget: 115,
    parBudget: 80,
    parBlocks: 5,
    loopUnlocked: false,
    track: [
      { type: 'start', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'mirror', rot: 0 },
      { r: 3, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 2, type: 'wall', rot: 0 },
      { r: 4, c: 1, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 4,
    name: 'Mud Bog & Loop',
    ageLabel: 'Ages 6-8',
    brief: 'Mud stops standard wheels! Equip Monster Treads and use the new LOOP block to repeat your pattern.',
    budget: 90,
    parBudget: 60,
    parBlocks: 3,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'mud', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'splitter', rot: 1 },
      { r: 0, c: 2, type: 'core', rot: 0 },
      { r: 2, c: 4, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 4, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 5,
    name: 'Steep Sky Ramp',
    ageLabel: 'Ages 6-8',
    brief: 'Steep ramps need Turbo Boosters! Use BOOST inside a LOOP to rocket up ramps and grab crystals.',
    budget: 100,
    parBudget: 75,
    parBlocks: 3,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'splitter', rot: 0 },
      { r: 4, c: 1, type: 'mirror', rot: 0 },
      { r: 4, c: 3, type: 'core', rot: 0 },
      { r: 2, c: 3, type: 'mirror', rot: 1 },
      { r: 0, c: 3, type: 'core', rot: 0 },
      { r: 0, c: 1, type: 'wall', rot: 0 },
      { r: 2, c: 4, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 6,
    name: 'Swamp Jumpers',
    ageLabel: 'Ages 7-8',
    brief: 'Spot the repeating mud-and-pit pattern! Compress your code with LOOP 3x to save blocks.',
    budget: 115,
    parBudget: 95,
    parBlocks: 3,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'mirror', rot: 0 },
      { r: 3, c: 2, type: 'splitter', rot: 0 },
      { r: 4, c: 2, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 3, c: 4, type: 'mirror', rot: 1 },
      { r: 1, c: 4, type: 'core', rot: 0 },
      { r: 0, c: 2, type: 'wall', rot: 0 },
      { r: 2, c: 3, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 7,
    name: 'Energy Crunch',
    ageLabel: 'Ages 7-9',
    brief: 'Tight energy budget! You cannot afford every part. Can Turbo Boosters fly over mud and gaps alike?',
    budget: 90,
    parBudget: 75,
    parBlocks: 2,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 3, type: 'splitter', rot: 0 },
      { r: 0, c: 4, type: 'mirror', rot: 0 },
      { r: 2, c: 4, type: 'core', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 1, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 8,
    name: 'Master Reactor',
    ageLabel: 'Ages 8+',
    brief: 'Final challenge! Use nested LOOPs to conquer the long course, then power 3 Reactor Cores simultaneously.',
    budget: 130,
    parBudget: 125,
    parBlocks: 5,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'mirror', rot: 0 },
      { r: 4, c: 1, type: 'mirror', rot: 0 },
      { r: 4, c: 3, type: 'splitter', rot: 1 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 1, c: 3, type: 'splitter', rot: 1 },
      { r: 1, c: 4, type: 'core', rot: 0 },
      { r: 0, c: 3, type: 'mirror', rot: 0 },
      { r: 0, c: 0, type: 'core', rot: 0 },
      { r: 2, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 }
    ])
  }
];

export const BONUS_LEVELS: LevelDef[] = [
  {
    id: 9,
    isBonus: true,
    ifUnlocked: true,
    name: 'Sensor Gate',
    ageLabel: 'Bonus · Ages 7+',
    brief: 'Welcome to Starport Sector! Nest IF [GAP] -> JUMP inside LOOP 3x to auto-leap pits, then collect every crystal for the Optional Bonus Star!',
    budget: 105,
    parBudget: 85,
    parBlocks: 4,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'mirror', rot: 0 },
      { r: 3, c: 2, type: 'splitter', rot: 0 },
      { r: 3, c: 4, type: 'core', rot: 0 },
      { r: 4, c: 2, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 0, c: 2, type: 'wall', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 10,
    isBonus: true,
    ifUnlocked: true,
    name: 'Sludge Scanner',
    ageLabel: 'Bonus · Ages 7+',
    brief: 'Skip Monster Treads by scanning MUD ahead! Use IF [MUD] -> JUMP inside LOOP 3x (or bring Treads for a chill run).',
    budget: 115,
    parBudget: 85,
    parBlocks: 4,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'mirror', rot: 1 },
      { r: 1, c: 1, type: 'splitter', rot: 1 },
      { r: 0, c: 1, type: 'core', rot: 0 },
      { r: 1, c: 4, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 3, c: 1, type: 'wall', rot: 0 },
      { r: 2, c: 3, type: 'wall', rot: 0 },
      { r: 0, c: 4, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 11,
    isBonus: true,
    ifUnlocked: true,
    name: 'Ramp Surge',
    ageLabel: 'Bonus · Ages 8+',
    brief: 'Steep ramps launch SparkBot forward when scanned! Combine MOVE and IF [RAMP] -> BOOST inside a LOOP 3x.',
    budget: 110,
    parBudget: 80,
    parBlocks: 4,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'splitter', rot: 1 },
      { r: 0, c: 2, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 4, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'mirror', rot: 1 },
      { r: 4, c: 1, type: 'core', rot: 0 },
      { r: 1, c: 4, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 12,
    isBonus: true,
    ifUnlocked: true,
    name: 'Starport Finale',
    ageLabel: 'Bonus · Master',
    brief: 'Combine everything! Pair IF [GAP] -> JUMP and IF [RAMP] -> BOOST inside LOOP 2x to sail past gaps, ramps, and mud!',
    budget: 135,
    parBudget: 115,
    parBlocks: 6,
    loopUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'ramp', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'ramp', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'splitter', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 3, type: 'splitter', rot: 0 },
      { r: 2, c: 4, type: 'core', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 1 },
      { r: 4, c: 0, type: 'core', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 },
      { r: 4, c: 4, type: 'wall', rot: 0 }
    ])
  }
];

export function getLevelById(id: number | string): LevelDef | null {
  const num = Number(id);
  for (const lvl of LEVELS) {
    if (lvl.id === num) return lvl;
  }
  for (const bl of BONUS_LEVELS) {
    if (bl.id === num) return bl;
  }
  return null;
}

export function createEmptyChassis(): ChassisGrid {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
}

export function cloneChassis(chassis: ChassisGrid): ChassisGrid {
  return chassis.map((row) => [...row]);
}

export function computeChassisInfo(chassis: ChassisGrid): ChassisInfo {
  let cost = 0;
  let hasWheels = false;
  let hasTreads = false;
  let hasThrusters = false;
  let hasBooster = false;
  let hasLaserAny = false;
  let hasFrontLaser = false;
  let hasMagnet = false;
  let partCount = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const partId = chassis[r]?.[c];
      if (!partId || !PARTS[partId]) continue;
      partCount++;
      cost += PARTS[partId].cost;
      if (partId === 'wheels') hasWheels = true;
      if (partId === 'treads') hasTreads = true;
      if (partId === 'thrusters') hasThrusters = true;
      if (partId === 'booster') hasBooster = true;
      if (partId === 'magnet') hasMagnet = true;
      if (partId === 'laser') {
        hasLaserAny = true;
        if (c === 2) hasFrontLaser = true;
      }
    }
  }
  return {
    cost,
    partCount,
    hasWheels,
    hasTreads,
    hasDrive: hasWheels || hasTreads,
    hasThrusters,
    hasBooster,
    hasLaserAny,
    hasFrontLaser,
    hasMagnet
  };
}

export function canPlacePartInSlot(
  chassis: ChassisGrid,
  budget: number,
  partId: PartId,
  r: number,
  c: number
): { ok: boolean; reason: 'invalid_slot' | 'laser_not_front' | 'over_budget' | null } {
  if (r < 0 || r > 2 || c < 0 || c > 2) return { ok: false, reason: 'invalid_slot' };
  if (partId === 'laser' && c !== 2) return { ok: false, reason: 'laser_not_front' };
  const next = cloneChassis(chassis);
  next[r][c] = partId;
  const info = computeChassisInfo(next);
  if (info.cost > budget) return { ok: false, reason: 'over_budget' };
  return { ok: true, reason: null };
}

export function countBlocks(blocks: CodeBlock[]): number {
  let total = 0;
  for (const blk of blocks) {
    total += 1;
    if ((blk.type === 'LOOP' || blk.type === 'IF') && Array.isArray(blk.children)) {
      total += countBlocks(blk.children);
    }
  }
  return total;
}

export function hasEmptyContainer(blocks: CodeBlock[]): boolean {
  for (const blk of blocks) {
    if (blk.type === 'LOOP' || blk.type === 'IF') {
      if (!blk.children || blk.children.length === 0) return true;
      if (hasEmptyContainer(blk.children)) return true;
    }
  }
  return false;
}

export function flattenBlocks(blocks: CodeBlock[], maxSteps = 64): Array<{ type: string; blockId: string }> {
  const out: Array<{ type: string; blockId: string }> = [];
  function walk(list: CodeBlock[]) {
    for (const b of list) {
      if (out.length >= maxSteps) return;
      if (b.type === 'LOOP') {
        const reps = Math.max(1, Math.min(5, b.count || 2));
        for (let k = 0; k < reps; k++) {
          walk(b.children || []);
          if (out.length >= maxSteps) return;
        }
      } else if (b.type === 'IF') {
        walk(b.children || []);
      } else {
        out.push({ type: b.type, blockId: b.id });
      }
    }
  }
  walk(blocks || []);
  return out;
}

export function simulateProgram(level: LevelDef, chassis: ChassisGrid, blocks: CodeBlock[]): SimResult {
  const info = computeChassisInfo(chassis);
  const track = level.track;
  const gateIndex = track.length - 1;
  let totalCrystals = 0;
  for (const t of track) {
    if (t.crystal) totalCrystals++;
  }

  let pos = 0;
  const collectedSet: Record<number, boolean> = {};
  const events: SimEvent[] = [];
  let execCount = 0;
  const MAX_EXEC = 96;
  let terminated: SimResult | null = null;

  function makeResult(
    status: 'win' | 'fail',
    failReason: string | null,
    failCode: SimResult['failCode'],
    missingPart: PartId | null
  ): SimResult {
    return {
      status,
      failReason,
      failCode,
      missingPart,
      events,
      collectedCrystals: Object.keys(collectedSet).length,
      totalCrystals,
      finalPos: pos
    };
  }

  function executeAction(action: 'MOVE' | 'JUMP' | 'BOOST', blockId: string) {
    const newCrystals: number[] = [];
    if (action === 'MOVE') {
      if (!info.hasDrive) {
        events.push({ fromPos: pos, toPos: pos, action, blockId, status: 'fail', newCrystals: [] });
        terminated = makeResult('fail', 'Need Standard Wheels or Monster Treads!', 'missing_part', 'wheels');
        return;
      }
      const nextPos = Math.min(pos + 1, gateIndex);
      const tile = track[nextPos];
      if (tile.type === 'gap') {
        events.push({ fromPos: pos, toPos: nextPos, action, blockId, status: 'fall', newCrystals: [] });
        pos = nextPos;
        terminated = makeResult('fail', 'Gap ahead! Use JUMP or BOOST to cross.', 'gap', info.hasThrusters ? null : 'thrusters');
        return;
      }
      if (tile.type === 'ramp') {
        events.push({ fromPos: pos, toPos: nextPos, action, blockId, status: 'fail', newCrystals: [] });
        terminated = makeResult(
          'fail',
          info.hasBooster ? 'Too steep to drive! Use BOOST!' : 'Need Turbo Booster for ramps!',
          info.hasBooster ? 'ramp' : 'missing_part',
          info.hasBooster ? null : 'booster'
        );
        return;
      }
      if (tile.type === 'mud' && !info.hasTreads) {
        events.push({ fromPos: pos, toPos: nextPos, action, blockId, status: 'stuck', newCrystals: [] });
        pos = nextPos;
        terminated = makeResult('fail', 'Stuck in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      pos = nextPos;
      if (tile.crystal && !collectedSet[pos]) {
        collectedSet[pos] = true;
        newCrystals.push(pos);
      }
      events.push({ fromPos: pos - 1, toPos: pos, action, blockId, status: 'ok', newCrystals });
    } else if (action === 'JUMP') {
      if (!info.hasThrusters) {
        events.push({ fromPos: pos, toPos: pos, action, blockId, status: 'fail', newCrystals: [] });
        terminated = makeResult('fail', 'Need Jump Thrusters!', 'missing_part', 'thrusters');
        return;
      }
      const fromJ = pos;
      const landJ = Math.min(pos + 2, gateIndex);
      const landTileJ = track[landJ];
      if (landTileJ.type === 'gap') {
        events.push({ fromPos: fromJ, toPos: landJ, action, blockId, status: 'fall', newCrystals: [] });
        pos = landJ;
        terminated = makeResult('fail', 'Landed in a gap! Adjust your JUMP spot.', 'gap', null);
        return;
      }
      if (landTileJ.type === 'ramp') {
        events.push({ fromPos: fromJ, toPos: landJ, action, blockId, status: 'fail', newCrystals: [] });
        terminated = makeResult('fail', 'Steep ramp! Use Turbo Booster + BOOST!', info.hasBooster ? 'ramp' : 'missing_part', info.hasBooster ? null : 'booster');
        return;
      }
      if (landTileJ.type === 'mud' && !info.hasTreads) {
        events.push({ fromPos: fromJ, toPos: landJ, action, blockId, status: 'stuck', newCrystals: [] });
        pos = landJ;
        terminated = makeResult('fail', 'Landed in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      pos = landJ;
      if (landTileJ.crystal && !collectedSet[pos]) {
        collectedSet[pos] = true;
        newCrystals.push(pos);
      }
      events.push({ fromPos: fromJ, toPos: pos, action, blockId, status: 'ok', newCrystals });
    } else if (action === 'BOOST') {
      if (!info.hasBooster) {
        events.push({ fromPos: pos, toPos: pos, action, blockId, status: 'fail', newCrystals: [] });
        terminated = makeResult('fail', 'Need Turbo Booster!', 'missing_part', 'booster');
        return;
      }
      const fromB = pos;
      const landB = Math.min(pos + 3, gateIndex);
      const landTileB = track[landB];
      for (let scan = fromB + 1; scan <= landB; scan++) {
        if (track[scan].crystal && track[scan].type !== 'gap' && !collectedSet[scan]) {
          collectedSet[scan] = true;
          newCrystals.push(scan);
        }
      }
      if (landTileB.type === 'gap') {
        events.push({ fromPos: fromB, toPos: landB, action, blockId, status: 'fall', newCrystals });
        pos = landB;
        terminated = makeResult('fail', 'Boosted into a gap!', 'gap', null);
        return;
      }
      if (landTileB.type === 'ramp') {
        events.push({ fromPos: fromB, toPos: landB, action, blockId, status: 'fail', newCrystals });
        pos = landB;
        terminated = makeResult('fail', 'Stopped on a steep ramp! Boost from further back.', 'ramp', null);
        return;
      }
      if (landTileB.type === 'mud' && !info.hasTreads) {
        events.push({ fromPos: fromB, toPos: landB, action, blockId, status: 'stuck', newCrystals });
        pos = landB;
        terminated = makeResult('fail', 'Landed in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      pos = landB;
      events.push({ fromPos: fromB, toPos: pos, action, blockId, status: 'ok', newCrystals });
    }

    if (pos === gateIndex) {
      if (!info.hasFrontLaser) {
        terminated = makeResult('fail', 'Reached the gate, but need Laser Emitter on front slot!', 'missing_part', 'laser');
        return;
      }
      terminated = makeResult('win', null, null, null);
    }
  }

  function runList(list: CodeBlock[]) {
    if (!Array.isArray(list)) return;
    for (const blk of list) {
      if (terminated || execCount >= MAX_EXEC) return;
      if (!blk) continue;
      if (blk.type === 'LOOP') {
        const reps = Math.max(1, Math.min(5, blk.count || 2));
        for (let r = 0; r < reps && !terminated && execCount < MAX_EXEC; r++) {
          runList(blk.children || []);
        }
      } else if (blk.type === 'IF') {
        execCount++;
        const rawCond = String(blk.condition || 'GAP').toUpperCase();
        const cond: SensorCondition =
          rawCond === 'GAP' || rawCond === 'MUD' || rawCond === 'RAMP' ? rawCond : 'GAP';
        const scanTile = Math.min(pos + 1, gateIndex);
        const aheadType = track[scanTile] ? String(track[scanTile].type || 'normal').toUpperCase() : 'NORMAL';
        const matched = aheadType === cond;
        events.push({
          fromPos: pos,
          toPos: pos,
          action: 'SCAN',
          condition: cond,
          scanTile,
          scanMatch: matched,
          blockId: blk.id,
          status: 'ok',
          newCrystals: []
        });
        if (matched) {
          runList(blk.children || []);
        }
      } else {
        execCount++;
        executeAction(blk.type, blk.id);
      }
    }
  }

  runList(blocks || []);

  if (events.length === 0) {
    const emptyChild = hasEmptyContainer(blocks || []);
    return makeResult(
      'fail',
      emptyChild ? 'Loop or IF block is empty!' : 'Add command blocks below before running SparkBot!',
      emptyChild ? 'empty_container' : 'empty',
      null
    );
  }
  if (terminated) return terminated;
  return makeResult('fail', 'Almost there! Add more blocks to reach the gate.', 'short', null);
}

export interface SimStepInspection {
  stepIndex: number;
  stepNumber: number;
  totalSteps: number;
  event: SimEvent;
  tilePosition: number;
  gateIndex: number;
  currentTileType: TileType;
  aheadTileType: TileType;
  crystalsCollected: number;
  totalCrystals: number;
  activeCapabilities: string[];
  statusLabel: string;
  isLastStep: boolean;
  isFailure: boolean;
}

/**
 * Pure helper computing the exact robot state snapshot at any single instruction
 * during Step-Through simulation so the inspector can show position, terrain,
 * front sensor view, collected crystals, active hardware, and outcome.
 */
export function buildStepInspection(
  level: LevelDef,
  chassis: ChassisGrid,
  result: SimResult,
  stepIndex: number
): SimStepInspection | null {
  if (!result || !Array.isArray(result.events) || result.events.length === 0) return null;
  const clampedIdx = Math.max(0, Math.min(result.events.length - 1, Math.floor(stepIndex)));
  const ev = result.events[clampedIdx];
  const gateIndex = Math.max(0, level.track.length - 1);
  const tilePosition = Math.max(0, Math.min(gateIndex, ev.toPos));
  const currentTileType: TileType = level.track[tilePosition]?.type ?? 'normal';
  const aheadIdx = Math.min(tilePosition + 1, gateIndex);
  const aheadTileType: TileType = level.track[aheadIdx]?.type ?? 'gate';

  const crystalSeen = new Set<number>();
  for (let i = 0; i <= clampedIdx; i++) {
    const arr = result.events[i]?.newCrystals;
    if (Array.isArray(arr)) {
      for (const cIdx of arr) crystalSeen.add(cIdx);
    }
  }

  const info = computeChassisInfo(chassis);
  const activeCapabilities: string[] = [];
  if (info.hasWheels) activeCapabilities.push('Wheels');
  if (info.hasTreads) activeCapabilities.push('Treads');
  if (info.hasThrusters) activeCapabilities.push('Thrusters');
  if (info.hasBooster) activeCapabilities.push('Booster');
  if (info.hasFrontLaser) activeCapabilities.push('Laser');
  if (info.hasMagnet) activeCapabilities.push('Magnet');

  let statusLabel = '';
  if (ev.action === 'SCAN') {
    const cond = ev.condition || 'GAP';
    statusLabel = ev.scanMatch
      ? `IF [${cond}] → TRUE (enter branch)`
      : `IF [${cond}] → FALSE (skip branch)`;
  } else if (ev.status === 'fall') {
    statusLabel = `${ev.action} → Fell into gap at Tile ${tilePosition}`;
  } else if (ev.status === 'stuck') {
    statusLabel = `${ev.action} → Stuck in mud at Tile ${tilePosition}`;
  } else if (ev.status === 'fail') {
    statusLabel = result.failReason || `${ev.action} blocked at Tile ${tilePosition}`;
  } else if (tilePosition === gateIndex) {
    statusLabel = `${ev.action} → Reached Laser Gate (Tile ${tilePosition})!`;
  } else if (ev.action === 'MOVE') {
    statusLabel = `MOVE → Rolled to Tile ${tilePosition}`;
  } else if (ev.action === 'JUMP') {
    statusLabel = `JUMP → Leaped to Tile ${tilePosition}`;
  } else {
    statusLabel = `BOOST → Surged to Tile ${tilePosition}`;
  }

  return {
    stepIndex: clampedIdx,
    stepNumber: clampedIdx + 1,
    totalSteps: result.events.length,
    event: ev,
    tilePosition,
    gateIndex,
    currentTileType,
    aheadTileType,
    crystalsCollected: crystalSeen.size,
    totalCrystals: result.totalCrystals,
    activeCapabilities,
    statusLabel,
    isLastStep: clampedIdx >= result.events.length - 1,
    isFailure: ev.status !== 'ok'
  };
}

/**
 * Returns the IDs of all enclosing LOOP / IF container blocks that contain targetId,
 * so Step-Through mode highlights both the active instruction and its enclosing containers.
 */
export function collectAncestorBlockIds(blocks: CodeBlock[], targetId: string | null): string[] {
  if (!targetId || !Array.isArray(blocks)) return [];
  const path: string[] = [];
  function dfs(list: CodeBlock[]): boolean {
    for (const blk of list) {
      if (blk.id === targetId) return true;
      if (Array.isArray(blk.children) && blk.children.length > 0) {
        path.push(blk.id);
        if (dfs(blk.children)) return true;
        path.pop();
      }
    }
    return false;
  }
  dfs(blocks);
  return path;
}

// Direction indices: 0=RIGHT, 1=DOWN, 2=LEFT, 3=UP
const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 }
];

export function reflectDir(dir: number, rot: number): number {
  if (rot === 0) {
    if (dir === 0) return 3;
    if (dir === 3) return 0;
    if (dir === 2) return 1;
    return 2;
  }
  if (dir === 0) return 1;
  if (dir === 1) return 0;
  if (dir === 2) return 3;
  return 2;
}

export function traceCircuit(grid: CircuitGrid): CircuitTraceResult {
  let totalCores = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].type === 'core') totalCores++;
    }
  }

  const segments: CircuitSegment[] = [];
  const litCores: Record<string, boolean> = {};
  const visited: Record<string, boolean> = {};
  const queue = [{ r: 2, c: 0, dir: 0, fromX: -0.5, fromY: 2.5 }];

  while (queue.length > 0) {
    const beam = queue.shift()!;
    const cr = beam.r;
    const cc = beam.c;
    const dir = beam.dir;
    const key = `${cr},${cc},${dir}`;
    if (visited[key]) continue;
    visited[key] = true;

    if (cr < 0 || cr >= 5 || cc < 0 || cc >= 5) continue;

    const cell = grid[cr][cc];
    const cx = cc + 0.5;
    const cy = cr + 0.5;

    if (cell.type === 'wall') {
      const hitX = cx - DIRS[dir].dc * 0.35;
      const hitY = cy - DIRS[dir].dr * 0.35;
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: hitX, y2: hitY });
      continue;
    }

    if (cell.type === 'core') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      litCores[`${cr},${cc}`] = true;
      continue;
    }

    if (cell.type === 'mirror') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      const nd = reflectDir(dir, cell.rot);
      queue.push({ r: cr + DIRS[nd].dr, c: cc + DIRS[nd].dc, dir: nd, fromX: cx, fromY: cy });
      continue;
    }

    if (cell.type === 'splitter') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      const sd = reflectDir(dir, cell.rot);
      const nr1 = cr + DIRS[dir].dr;
      const nc1 = cc + DIRS[dir].dc;
      if (nr1 < 0 || nr1 >= 5 || nc1 < 0 || nc1 >= 5) {
        segments.push({ x1: cx, y1: cy, x2: cx + DIRS[dir].dc * 0.5, y2: cy + DIRS[dir].dr * 0.5 });
      } else {
        queue.push({ r: nr1, c: nc1, dir, fromX: cx, fromY: cy });
      }
      const nr2 = cr + DIRS[sd].dr;
      const nc2 = cc + DIRS[sd].dc;
      if (nr2 < 0 || nr2 >= 5 || nc2 < 0 || nc2 >= 5) {
        segments.push({ x1: cx, y1: cy, x2: cx + DIRS[sd].dc * 0.5, y2: cy + DIRS[sd].dr * 0.5 });
      } else {
        queue.push({ r: nr2, c: nc2, dir: sd, fromX: cx, fromY: cy });
      }
      continue;
    }

    const nr = cr + DIRS[dir].dr;
    const nc = cc + DIRS[dir].dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx + DIRS[dir].dc * 0.5, y2: cy + DIRS[dir].dr * 0.5 });
    } else {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      queue.push({ r: nr, c: nc, dir, fromX: cx, fromY: cy });
    }
  }

  const litCount = Object.keys(litCores).length;
  return {
    segments,
    litCores,
    litCount,
    totalCores,
    solved: totalCores > 0 && litCount === totalCores
  };
}

export function calculateStars(
  level: LevelDef,
  energyCost: number,
  blockCount: number,
  collectedCrystals: number,
  totalCrystals: number
): { stars: number; allCrystals: boolean; withinPar: boolean } {
  const allCrystals = totalCrystals === 0 || collectedCrystals >= totalCrystals;
  const withinPar = blockCount <= level.parBlocks && energyCost <= level.parBudget;
  let stars = 1;
  if (allCrystals && withinPar) {
    stars = 3;
  } else if (allCrystals || withinPar) {
    stars = 2;
  }
  return { stars, allCrystals, withinPar };
}

export function findShortestTrackPlan(level: LevelDef): {
  profile: { label: string; cost: number; wheels: boolean; treads: boolean; thrusters: boolean; booster: boolean };
  sequence: string[];
} | null {
  const track = level?.track || [];
  const gateIndex = track.length - 1;
  if (gateIndex <= 0) return null;

  const profiles = [
    { label: 'Standard Wheels + Laser Emitter', cost: 45, wheels: true, treads: false, thrusters: false, booster: false },
    { label: 'Monster Treads + Laser Emitter', cost: 60, wheels: false, treads: true, thrusters: false, booster: false },
    { label: 'Standard Wheels + Turbo Booster + Laser Emitter', cost: 75, wheels: true, treads: false, thrusters: false, booster: true },
    { label: 'Standard Wheels + Jump Thrusters + Laser Emitter', cost: 80, wheels: true, treads: false, thrusters: true, booster: false },
    { label: 'Monster Treads + Jump Thrusters + Laser Emitter', cost: 95, wheels: false, treads: true, thrusters: true, booster: false },
    { label: 'Monster Treads + Turbo Booster + Laser Emitter', cost: 90, wheels: false, treads: true, thrusters: false, booster: true },
    { label: 'Standard Wheels + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 110, wheels: true, treads: false, thrusters: true, booster: true },
    { label: 'Monster Treads + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 125, wheels: false, treads: true, thrusters: true, booster: true }
  ];

  for (const prof of profiles) {
    if (prof.cost > level.budget) continue;
    const queue = [{ pos: 0, seq: [] as string[], crystals: 0 }];
    const bestAt: Record<string, number> = { '0': 0 };

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.pos === gateIndex) return { profile: prof, sequence: cur.seq };
      if (cur.seq.length >= 20) continue;

      if (prof.wheels || prof.treads) {
        const np = Math.min(cur.pos + 1, gateIndex);
        const nt = track[np];
        if (nt.type !== 'gap' && nt.type !== 'ramp' && (nt.type !== 'mud' || prof.treads)) {
          const nc = cur.crystals + (nt.crystal ? 1 : 0);
          const keyM = `${np}:${cur.seq.length}`;
          if (bestAt[keyM] === undefined || nc > bestAt[keyM]) {
            bestAt[keyM] = nc;
            queue.push({ pos: np, seq: [...cur.seq, 'MOVE'], crystals: nc });
          }
        }
      }

      if (prof.thrusters) {
        const jp = Math.min(cur.pos + 2, gateIndex);
        const jt = track[jp];
        if (jt.type !== 'gap' && jt.type !== 'ramp' && (jt.type !== 'mud' || prof.treads)) {
          const jc = cur.crystals + (jt.crystal ? 1 : 0);
          const keyJ = `${jp}:${cur.seq.length}`;
          if (bestAt[keyJ] === undefined || jc > bestAt[keyJ]) {
            bestAt[keyJ] = jc;
            queue.push({ pos: jp, seq: [...cur.seq, 'JUMP'], crystals: jc });
          }
        }
      }

      if (prof.booster) {
        const bp = Math.min(cur.pos + 3, gateIndex);
        const bt = track[bp];
        if (bt.type !== 'gap' && bt.type !== 'ramp' && (bt.type !== 'mud' || prof.treads)) {
          let bc = cur.crystals;
          for (let s = cur.pos + 1; s <= bp; s++) {
            if (track[s].crystal && track[s].type !== 'gap') bc++;
          }
          const keyB = `${bp}:${cur.seq.length}`;
          if (bestAt[keyB] === undefined || bc > bestAt[keyB]) {
            bestAt[keyB] = bc;
            queue.push({ pos: bp, seq: [...cur.seq, 'BOOST'], crystals: bc });
          }
        }
      }
    }
  }
  return null;
}

export function findCircuitFixCell(grid: CircuitGrid): { r: number; c: number; flips: number } | null {
  if (!grid || traceCircuit(grid).solved) return null;
  const toggleables: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].type === 'mirror' || grid[r][c].type === 'splitter') {
        toggleables.push({ r, c });
      }
    }
  }
  if (toggleables.length > 0 && toggleables.length <= 7) {
    const maxMask = 1 << toggleables.length;
    let bestDiff = 999;
    let bestFirst: { r: number; c: number } | null = null;
    for (let mask = 1; mask < maxMask; mask++) {
      const copy = cloneCircuitGrid(grid);
      let flips = 0;
      let firstFlip: { r: number; c: number } | null = null;
      for (let b = 0; b < toggleables.length; b++) {
        if ((mask >> b) & 1) {
          flips++;
          const tg = toggleables[b];
          if (!firstFlip) firstFlip = tg;
          copy[tg.r][tg.c].rot = copy[tg.r][tg.c].rot === 0 ? 1 : 0;
        }
      }
      if (traceCircuit(copy).solved && flips < bestDiff) {
        bestDiff = flips;
        bestFirst = firstFlip;
      }
    }
    if (bestFirst) return { r: bestFirst.r, c: bestFirst.c, flips: bestDiff };
  }
  return null;
}

function compressSequenceSuggestion(seq: string[]): string {
  if (!seq || seq.length === 0) return '';
  const allSame = seq.every((s) => s === seq[0]);
  if (allSame && seq.length >= 2 && seq.length <= 3) {
    return `Wrap [${seq[0]}] inside a LOOP ${seq.length}x block (${seq.length} repeats).`;
  }
  for (let k = 1; k <= 3; k++) {
    if (seq.length >= k * 2 && seq.length % k === 0) {
      const reps = seq.length / k;
      if (reps === 2 || reps === 3) {
        let match = true;
        for (let idx = 0; idx < seq.length; idx++) {
          if (seq[idx] !== seq[idx % k]) {
            match = false;
            break;
          }
        }
        if (match) return `Wrap [${seq.slice(0, k).join(' → ')}] inside a LOOP ${reps}x block.`;
      }
    }
  }
  if (seq.length >= 8) {
    const [p0, p1] = seq;
    if (seq[2] === p0 && seq[3] === p1 && seq[4] === p0 && seq[5] === p1 && seq[6] === p0 && seq[7] === p1) {
      const tail = seq.slice(8);
      return `Nest LOOP 2x [ ${p0} → ${p1} ] inside an outer LOOP 2x${tail.length > 0 ? `, then finish with ${tail.join(' → ')}.` : '.'}`;
    }
  }
  for (let pk = 1; pk <= 2; pk++) {
    for (let preps = 3; preps >= 2; preps--) {
      if (seq.length > pk * preps) {
        let pMatch = true;
        for (let pi = 0; pi < pk * preps; pi++) {
          if (seq[pi] !== seq[pi % pk]) {
            pMatch = false;
            break;
          }
        }
        if (pMatch) {
          const pTail = seq.slice(pk * preps);
          return `Wrap [${seq.slice(0, pk).join(' → ')}] inside a LOOP ${preps}x block, then add ${pTail.join(' → ')}.`;
        }
      }
    }
  }
  return `Sequence structure: ${seq.join(' → ')}.`;
}

export function generateStructuralHint(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit' | 'sandbox' | 'action',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid
): string {
  if (!level) return '';
  const info = computeChassisInfo(chassis || createEmptyChassis());
  const plan = findShortestTrackPlan(level);

  if (phase === 'build') {
    if (!info.hasFrontLaser) {
      return plan
        ? `Build structure: Equip ${plan.profile.label} (${plan.profile.cost} pts) with Laser on the right FRONT column.`
        : 'Build structure: Place a Laser Emitter on the right FRONT column and a drive base (Wheels or Treads).';
    }
    if (!info.hasDrive && (!plan || plan.profile.wheels || plan.profile.treads)) {
      return `Build structure: Add Standard Wheels (normal ground) or Monster Treads (mud + ground) within your ${level.budget}-pt budget.`;
    }
    if (plan) {
      const missing: string[] = [];
      if (plan.profile.treads && !info.hasTreads) missing.push('Monster Treads');
      if (plan.profile.thrusters && !info.hasThrusters) missing.push('Jump Thrusters');
      if (plan.profile.booster && !info.hasBooster) missing.push('Turbo Booster');
      if (missing.length > 0) {
        return `Build structure: Try adding ${missing.join(' + ')} (Recommended setup: ${plan.profile.label}, ${plan.profile.cost} pts).`;
      }
    }
    return 'Your chassis fits this course! Tap NEXT: CODE ➔ to program SparkBot.';
  }

  if (phase === 'code') {
    const blkCount = Array.isArray(program) ? countBlocks(program) : 0;
    if (blkCount > 0) {
      const sim = simulateProgram(level, chassis || createEmptyChassis(), program);
      if (sim.status === 'win') {
        if (blkCount > level.parBlocks && level.loopUnlocked && plan) {
          if (level.ifUnlocked) {
            return `Your code reaches the gate! To hit Par ${level.parBlocks} blocks, combine LOOP with IF [GAP / MUD / RAMP] sensor blocks!`;
          }
          return `Your code reaches the gate! To hit Par ${level.parBlocks} blocks: ${compressSequenceSuggestion(plan.sequence)}`;
        }
        return 'Code looks ready! Press ▶ RUN SPARKBOT to launch SparkBot to the gate.';
      }
      if (sim.missingPart) {
        return `Hardware check: ${sim.failReason} Tap Build below to adjust your chassis.`;
      }
    }

    if (plan) {
      if (level.ifUnlocked) {
        return `Code structure (Par ${level.parBlocks} blocks): Nest IF [GAP / MUD / RAMP] sensor blocks inside LOOP to react to hazards ahead!`;
      }
      if (level.loopUnlocked) {
        return `Code structure (Par ${level.parBlocks} blocks): ${compressSequenceSuggestion(plan.sequence)}`;
      }
      return `Code structure: Chain ${plan.sequence.join(' → ')} to cross every obstacle cleanly.`;
    }
    return 'Code structure: Chain MOVE, JUMP, and BOOST blocks to reach the gate.';
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    if (fix) {
      const kind = circuitGrid[fix.r][fix.c].type === 'splitter' ? 'Beam Splitter' : 'Mirror';
      return `Circuit structure (${fix.flips} rotation${fix.flips > 1 ? 's' : ''} away): Tap the ${kind} at Row ${fix.r + 1}, Col ${fix.c + 1} to redirect the beam.`;
    }
    return 'Trace the cyan laser from Row 3 left edge and rotate mirrors or splitters so all Power Cores light up.';
  }

  return '';
}

export interface TutorialStep {
  stepNum: number;
  totalSteps: number;
  message: string;
  targetType: 'part' | 'slot' | 'cmd' | 'button' | 'circuit' | null;
  targetKey: string | null;
  circuitTarget: { r: number; c: number } | null;
}

export function getTutorialStep(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit' | 'sandbox' | 'action',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid,
  selectedPart: PartId | null
): TutorialStep {
  const info = computeChassisInfo(chassis || createEmptyChassis());
  const plan = findShortestTrackPlan(level);
  const needsTreads = plan ? plan.profile.treads : false;
  const needsThrusters = plan ? plan.profile.thrusters : false;
  const needsBooster = plan ? plan.profile.booster : false;
  const drivePart: PartId = needsTreads ? 'treads' : 'wheels';
  const totalSteps = 6;

  if (phase === 'build') {
    if (!info.hasDrive) {
      if (selectedPart === drivePart) {
        return {
          stepNum: 1,
          totalSteps,
          message: 'Slot 2,0',
          targetType: 'slot',
          targetKey: '2,0',
          circuitTarget: null
        };
      }
      return {
        stepNum: 1,
        totalSteps,
        message: drivePart,
        targetType: 'part',
        targetKey: drivePart,
        circuitTarget: null
      };
    }
    if (needsTreads && !info.hasTreads) {
      return {
        stepNum: 1,
        totalSteps,
        message: 'treads',
        targetType: selectedPart === 'treads' ? 'slot' : 'part',
        targetKey: selectedPart === 'treads' ? '2,0' : 'treads',
        circuitTarget: null
      };
    }
    if (needsThrusters && !info.hasThrusters) {
      return {
        stepNum: 2,
        totalSteps,
        message: 'thrusters',
        targetType: selectedPart === 'thrusters' ? 'slot' : 'part',
        targetKey: selectedPart === 'thrusters' ? '1,0' : 'thrusters',
        circuitTarget: null
      };
    }
    if (needsBooster && !info.hasBooster) {
      return {
        stepNum: 2,
        totalSteps,
        message: 'booster',
        targetType: selectedPart === 'booster' ? 'slot' : 'part',
        targetKey: selectedPart === 'booster' ? '0,0' : 'booster',
        circuitTarget: null
      };
    }
    if (!info.hasFrontLaser) {
      if (selectedPart === 'laser') {
        return {
          stepNum: 2,
          totalSteps,
          message: 'Slot 1,2',
          targetType: 'slot',
          targetKey: '1,2',
          circuitTarget: null
        };
      }
      return {
        stepNum: 2,
        totalSteps,
        message: 'laser',
        targetType: 'part',
        targetKey: 'laser',
        circuitTarget: null
      };
    }
    return {
      stepNum: 3,
      totalSteps,
      message: 'toCodeBtn',
      targetType: 'button',
      targetKey: 'toCodeBtn',
      circuitTarget: null
    };
  }

  if (phase === 'code') {
    const sim = simulateProgram(level, chassis || createEmptyChassis(), program || []);
    if (sim.status === 'win') {
      return {
        stepNum: 5,
        totalSteps,
        message: 'runCodeBtn',
        targetType: 'button',
        targetKey: 'runCodeBtn',
        circuitTarget: null
      };
    }
    if (sim.missingPart) {
      return {
        stepNum: 1,
        totalSteps,
        message: 'toBuildBtn',
        targetType: 'button',
        targetKey: 'toBuildBtn',
        circuitTarget: null
      };
    }
    const flat = flattenBlocks(program || []);
    const seq = plan ? plan.sequence : ['MOVE'];
    const nextCmd = seq[Math.min(flat.length, seq.length - 1)] || 'MOVE';
    return {
      stepNum: 4,
      totalSteps,
      message: `${flat.length} / ${seq.length}`,
      targetType: 'cmd',
      targetKey: nextCmd,
      circuitTarget: null
    };
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    return {
      stepNum: 6,
      totalSteps,
      message: 'circuit',
      targetType: fix ? 'circuit' : null,
      targetKey: null,
      circuitTarget: fix ? { r: fix.r, c: fix.c } : null
    };
  }

  return {
    stepNum: 1,
    totalSteps,
    message: '',
    targetType: null,
    targetKey: null,
    circuitTarget: null
  };
}

// ---------- DAILY CHALLENGE & STREAKS ----------
export function parseNonNegInt(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

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

function computeCompressedBlockCount(seq: string[]): number {
  if (!seq || seq.length === 0) return 0;
  const memo: Record<string, number> = {};
  function minCost(sub: string[]): number {
    const key = sub.join(',');
    if (memo[key] !== undefined) return memo[key];
    let best = sub.length;
    const n = sub.length;
    for (let start = 0; start < n; start++) {
      for (let pLen = 1; pLen <= Math.floor((n - start) / 2); pLen++) {
        for (let reps = 2; reps <= 3; reps++) {
          if (start + pLen * reps > n) break;
          let ok = true;
          for (let idx = 0; idx < pLen * reps; idx++) {
            if (sub[start + idx] !== sub[start + (idx % pLen)]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            const inside = minCost(sub.slice(start, start + pLen));
            const candidate = start + (1 + inside) + minCost(sub.slice(start + pLen * reps));
            if (candidate < best) best = candidate;
          }
        }
      }
    }
    memo[key] = best;
    return best;
  }
  return minCost(seq);
}

function findOptimalCrystalTrackSolution(track: TrackTile[], maxBudget: number) {
  const gateIndex = track.length - 1;
  if (gateIndex <= 0) return null;
  const crystalMaskOf: Record<number, number> = {};
  let totalCrystals = 0;
  for (let i = 0; i < track.length; i++) {
    if (track[i].crystal && track[i].type !== 'gap') {
      crystalMaskOf[i] = 1 << totalCrystals;
      totalCrystals++;
    }
  }
  const targetMask = (1 << totalCrystals) - 1;

  const profiles = [
    { label: 'Standard Wheels + Laser Emitter', cost: 45, wheels: true, treads: false, thrusters: false, booster: false },
    { label: 'Monster Treads + Laser Emitter', cost: 60, wheels: false, treads: true, thrusters: false, booster: false },
    { label: 'Standard Wheels + Turbo Booster + Laser Emitter', cost: 75, wheels: true, treads: false, thrusters: false, booster: true },
    { label: 'Standard Wheels + Jump Thrusters + Laser Emitter', cost: 80, wheels: true, treads: false, thrusters: true, booster: false },
    { label: 'Monster Treads + Turbo Booster + Laser Emitter', cost: 90, wheels: false, treads: true, thrusters: false, booster: true },
    { label: 'Monster Treads + Jump Thrusters + Laser Emitter', cost: 95, wheels: false, treads: true, thrusters: true, booster: false },
    { label: 'Standard Wheels + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 110, wheels: true, treads: false, thrusters: true, booster: true },
    { label: 'Monster Treads + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 125, wheels: false, treads: true, thrusters: true, booster: true }
  ];

  for (const prof of profiles) {
    if (prof.cost > maxBudget) continue;
    const queue = [{ pos: 0, mask: 0, seq: [] as string[] }];
    const visited: Record<string, boolean> = { '0:0': true };

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.pos === gateIndex && cur.mask === targetMask) {
        return { profile: prof, sequence: cur.seq };
      }
      if (cur.seq.length >= 16) continue;

      if (prof.wheels || prof.treads) {
        const np = Math.min(cur.pos + 1, gateIndex);
        const nt = track[np];
        if (nt.type !== 'gap' && nt.type !== 'ramp' && (nt.type !== 'mud' || prof.treads)) {
          const nm = cur.mask | (crystalMaskOf[np] || 0);
          const mk = `${np}:${nm}`;
          if (!visited[mk]) {
            visited[mk] = true;
            queue.push({ pos: np, mask: nm, seq: [...cur.seq, 'MOVE'] });
          }
        }
      }

      if (prof.thrusters) {
        const jp = Math.min(cur.pos + 2, gateIndex);
        const jt = track[jp];
        if (jt.type !== 'gap' && jt.type !== 'ramp' && (jt.type !== 'mud' || prof.treads)) {
          const jm = cur.mask | (crystalMaskOf[jp] || 0);
          const jk = `${jp}:${jm}`;
          if (!visited[jk]) {
            visited[jk] = true;
            queue.push({ pos: jp, mask: jm, seq: [...cur.seq, 'JUMP'] });
          }
        }
      }

      if (prof.booster) {
        const bp = Math.min(cur.pos + 3, gateIndex);
        const bt = track[bp];
        if (bt.type !== 'gap' && bt.type !== 'ramp' && (bt.type !== 'mud' || prof.treads)) {
          let bm = cur.mask;
          for (let s = cur.pos + 1; s <= bp; s++) {
            bm |= crystalMaskOf[s] || 0;
          }
          const bk = `${bp}:${bm}`;
          if (!visited[bk]) {
            visited[bk] = true;
            queue.push({ pos: bp, mask: bm, seq: [...cur.seq, 'BOOST'] });
          }
        }
      }
    }
  }
  return null;
}

export function cloneCircuitGrid(grid: CircuitGrid): CircuitGrid {
  return grid.map((row) => row.map((cell) => ({ type: cell.type, rot: cell.rot })));
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

export function validateBonusStarConditions(
  level: LevelDef,
  energyCost: number,
  blockCount: number,
  collectedCrystals: number,
  totalCrystals: number
) {
  if (!level || typeof level !== 'object') {
    return {
      earned: false,
      fullCrystals: false,
      withinBlockPar: false,
      withinBudgetPar: false,
      withinPar: false,
      collectedCrystals: 0,
      totalCrystals: 0,
      blockCount: 0,
      parBlocks: 0,
      energyCost: 0,
      parBudget: 0
    };
  }
  const safeTotalCrystals = parseNonNegInt(totalCrystals);
  const safeCollected = parseNonNegInt(collectedCrystals);
  const safeBlocks = parseNonNegInt(blockCount);
  const safeCost = parseNonNegInt(energyCost);
  const parBlocks = parseNonNegInt(level.parBlocks);
  const parBudget = parseNonNegInt(level.parBudget);

  const fullCrystals = safeTotalCrystals === 0 || safeCollected >= safeTotalCrystals;
  const withinBlockPar = parBlocks > 0 ? safeBlocks <= parBlocks : true;
  const withinBudgetPar = parBudget > 0 ? safeCost <= parBudget : true;
  const withinPar = withinBlockPar && withinBudgetPar;

  return {
    earned: Boolean(fullCrystals && withinPar),
    fullCrystals,
    withinBlockPar,
    withinBudgetPar,
    withinPar,
    collectedCrystals: safeCollected,
    totalCrystals: safeTotalCrystals,
    blockCount: safeBlocks,
    parBlocks,
    energyCost: safeCost,
    parBudget
  };
}

export function evaluateBonusStar(
  level: LevelDef,
  starInfo: { stars: number; allCrystals: boolean | number; withinPar: boolean }
): boolean {
  if (!level || !level.isBonus || !starInfo) return false;
  return Boolean(starInfo.stars >= 3 && starInfo.allCrystals && starInfo.withinPar);
}

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
  lane: number; // 0=left, 1=center, 2=right (or 0=low, 1=high on walls)
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
  // rightWall
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
  tier: 0 | 1 | 2 | 3; // 0=locked, 1=bronze, 2=silver, 3=gold
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
    circuitsSolved: cur.circuitsSolved + 1
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

export type GhostPreviewPlan =
  | { kind: 'build'; partId: PartId; targetSlot: [number, number] }
  | {
      kind: 'code';
      actionSequence: Array<'MOVE' | 'JUMP' | 'BOOST'>;
      simResult: SimResult;
      missingBlockType: BlockType;
      highlightCondition?: SensorCondition;
    }
  | { kind: 'circuit'; cell: { r: number; c: number }; targetFlips: number };

export function computeGhostPreviewPlan(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid
): GhostPreviewPlan | null {
  const plan = findShortestTrackPlan(level);
  const info = computeChassisInfo(chassis || createEmptyChassis());

  if (phase === 'build') {
    const needsTreads = plan ? plan.profile.treads : false;
    const needsThrusters = plan ? plan.profile.thrusters : false;
    const needsBooster = plan ? plan.profile.booster : false;

    if (needsTreads && !info.hasTreads) {
      return { kind: 'build', partId: 'treads', targetSlot: PARTS.treads.preferredSlot };
    }
    if (!info.hasDrive) {
      return { kind: 'build', partId: 'wheels', targetSlot: PARTS.wheels.preferredSlot };
    }
    if (needsThrusters && !info.hasThrusters) {
      return { kind: 'build', partId: 'thrusters', targetSlot: PARTS.thrusters.preferredSlot };
    }
    if (needsBooster && !info.hasBooster) {
      return { kind: 'build', partId: 'booster', targetSlot: PARTS.booster.preferredSlot };
    }
    if (!info.hasFrontLaser) {
      return { kind: 'build', partId: 'laser', targetSlot: PARTS.laser.preferredSlot };
    }
    return null;
  }

  if (phase === 'code') {
    const seq = (plan?.sequence || ['MOVE']).filter(
      (s): s is 'MOVE' | 'JUMP' | 'BOOST' => s === 'MOVE' || s === 'JUMP' || s === 'BOOST'
    );
    // Build a valid ghost chassis guaranteeing the ghost bot can demonstrate the track solution cleanly
    const ghostChassis = cloneChassis(chassis);
    if (plan?.profile.treads) ghostChassis[2][0] = 'treads';
    else if (!info.hasDrive) ghostChassis[2][0] = 'wheels';
    if (plan?.profile.thrusters) ghostChassis[1][0] = 'thrusters';
    if (plan?.profile.booster) ghostChassis[0][0] = 'booster';
    ghostChassis[1][2] = 'laser';

    const ghostBlocks: CodeBlock[] = seq.map((act, idx) => ({
      id: `ghost_${idx}`,
      type: act
    }));
    const simResult = simulateProgram(level, ghostChassis, ghostBlocks);
    const flat = flattenBlocks(program || []);
    const nextAction = (seq[Math.min(flat.length, seq.length - 1)] || 'MOVE') as BlockType;

    let highlightCondition: SensorCondition | undefined;
    if (level.ifUnlocked) {
      if (level.track.some((t) => t.type === 'gap')) highlightCondition = 'GAP';
      else if (level.track.some((t) => t.type === 'mud')) highlightCondition = 'MUD';
      else if (level.track.some((t) => t.type === 'ramp')) highlightCondition = 'RAMP';
    }

    return {
      kind: 'code',
      actionSequence: seq,
      simResult,
      missingBlockType: level.loopUnlocked && seq.length >= 4 && flat.length === 0 ? 'LOOP' : nextAction,
      highlightCondition
    };
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    if (!fix) return null;
    return {
      kind: 'circuit',
      cell: { r: fix.r, c: fix.c },
      targetFlips: fix.flips
    };
  }

  return null;
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
    challengeTimerEnabled: false,
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
    sandbox: {
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
      circuit: cloneCircuitGrid(LEVELS[0].circuit)
    }
  };
}
