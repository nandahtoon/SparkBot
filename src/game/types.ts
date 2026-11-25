import type { AudioSettings } from './audioConfig';
import type {
  BotCharacterId,
  PaintBoothConfig,
  SavedPaintTheme
} from './customization';

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
  isSandbox?: boolean;
  isClassCode?: boolean;
  dailyDateKey?: string;
  track: TrackTile[];
  circuit: CircuitGrid;
}

export interface SandboxMissionDraft {
  id: string;
  name: string;
  budget: number;
  parBudget: number;
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked: boolean;
  track: TrackTile[];
  circuit: CircuitGrid;
  updatedAt: number;
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
  bugsDebugged?: number;
  logicGatesSolved?: number;
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
  graphicsQuality?: import('./graphicsConfig').GraphicsQualityMode;
  challengeTimerEnabled?: boolean;
  readAloudEnabled?: boolean;
  hapticsEnabled?: boolean;
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
  streakShields?: number;
  unlockedFactIds?: string[];
  adaptiveHintsEnabled?: boolean;
  learningTelemetry?: import('./educationStrategy').LearningTelemetry;
  sandbox: {
    name?: string;
    budget: number;
    parBudget?: number;
    parBlocks?: number;
    loopUnlocked?: boolean;
    ifUnlocked?: boolean;
    track: TrackTile[];
    circuit: CircuitGrid;
    savedLevels?: SandboxMissionDraft[];
  };
}

export function parseNonNegInt(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}
