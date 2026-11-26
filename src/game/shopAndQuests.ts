export type ShopCategory = 'drone' | 'accessory' | 'trail';

export type DroneId = 'scout_pip' | 'magneto_bee' | 'turbo_comet' | 'golden_owl';
export type AccessoryId = 'explorer_cap' | 'holo_visor' | 'star_crown' | 'antenna_halo';
export type TrailId = 'classic_spark' | 'cyan_plasma' | 'solar_gold' | 'rainbow_prism';

export interface ShopItemDef {
  id: string;
  category: ShopCategory;
  name: string;
  tagline: string;
  perkLabel: string;
  cost: number;
  primaryHex: string;
  accentHex: string;
  primaryNum: number;
  accentNum: number;
  freeStarter?: boolean;
}

export interface PlayerLoadout {
  ownedIds: string[];
  equippedDroneId: DroneId | null;
  equippedAccessoryId: AccessoryId | null;
  equippedTrailId: TrailId;
}

export const SHOP_CATALOG: readonly ShopItemDef[] = [
  // 3D Helper Drone Pets
  {
    id: 'scout_pip',
    category: 'drone',
    name: 'Scout Pip',
    tagline: 'Cheerful cobalt orb buddy that hovers beside SparkBot.',
    perkLabel: '3D Companion + Happy Chirp',
    cost: 60,
    primaryHex: '#38bdf8',
    accentHex: '#fde047',
    primaryNum: 0x38bdf8,
    accentNum: 0xfde047
  },
  {
    id: 'magneto_bee',
    category: 'drone',
    name: 'Magneto Bee',
    tagline: 'Buzzy amber-striped drone with twin magnetic wings.',
    perkLabel: 'Crystal Aura Sparkle',
    cost: 110,
    primaryHex: '#fbbf24',
    accentHex: '#34d399',
    primaryNum: 0xfbbf24,
    accentNum: 0x34d399
  },
  {
    id: 'turbo_comet',
    category: 'drone',
    name: 'Turbo Comet',
    tagline: 'Sleek magenta jet-wing drone with hyper-ring boosters.',
    perkLabel: 'Turbo Orbit Trail',
    cost: 150,
    primaryHex: '#f472b6',
    accentHex: '#22d3ee',
    primaryNum: 0xf472b6,
    accentNum: 0x22d3ee
  },
  {
    id: 'golden_owl',
    category: 'drone',
    name: 'Golden Owl',
    tagline: 'Royal gold STEM sage drone with glowing prism crown.',
    perkLabel: 'Firework Victory Spin',
    cost: 210,
    primaryHex: '#f59e0b',
    accentHex: '#a78bfa',
    primaryNum: 0xf59e0b,
    accentNum: 0xa78bfa
  },

  // 3D SparkBot Head/Chassis Accessories
  {
    id: 'explorer_cap',
    category: 'accessory',
    name: 'Explorer Cap',
    tagline: 'Adventure visor cap perched on SparkBot’s dome.',
    perkLabel: '3D Head Gear',
    cost: 70,
    primaryHex: '#10b981',
    accentHex: '#fef08a',
    primaryNum: 0x10b981,
    accentNum: 0xfef08a
  },
  {
    id: 'holo_visor',
    category: 'accessory',
    name: 'Holo Visor',
    tagline: 'Neon cyber scanner shield across SparkBot’s eyes.',
    perkLabel: 'Laser Glow Shade',
    cost: 100,
    primaryHex: '#22d3ee',
    accentHex: '#c084fc',
    primaryNum: 0x22d3ee,
    accentNum: 0xc084fc
  },
  {
    id: 'antenna_halo',
    category: 'accessory',
    name: 'Orbital Halo',
    tagline: 'Floating neon plasma ring spinning above the antenna.',
    perkLabel: 'Spinning Energy Ring',
    cost: 130,
    primaryHex: '#38bdf8',
    accentHex: '#f472b6',
    primaryNum: 0x38bdf8,
    accentNum: 0xf472b6
  },
  {
    id: 'star_crown',
    category: 'accessory',
    name: 'Star Crown',
    tagline: 'Championship gold crown for master robot engineers.',
    perkLabel: 'Champion Glow',
    cost: 180,
    primaryHex: '#fbbf24',
    accentHex: '#fb7185',
    primaryNum: 0xfbbf24,
    accentNum: 0xfb7185
  },

  // 3D Kinetic Motion Trails
  {
    id: 'classic_spark',
    category: 'trail',
    name: 'Classic Spark',
    tagline: 'Clean sky-blue workshop spark puffs.',
    perkLabel: 'Starter Trail',
    cost: 0,
    primaryHex: '#38bdf8',
    accentHex: '#fde047',
    primaryNum: 0x38bdf8,
    accentNum: 0xfde047,
    freeStarter: true
  },
  {
    id: 'cyan_plasma',
    category: 'trail',
    name: 'Cyan Plasma',
    tagline: 'Electric aqua energy stream behind wheels & jets.',
    perkLabel: 'Bright Plasma Sparks',
    cost: 75,
    primaryHex: '#06b6d4',
    accentHex: '#a5f3fc',
    primaryNum: 0x06b6d4,
    accentNum: 0xa5f3fc
  },
  {
    id: 'solar_gold',
    category: 'trail',
    name: 'Solar Comet',
    tagline: 'Warm golden stardust embers on every jump & boost.',
    perkLabel: 'Golden Comet Puffs',
    cost: 120,
    primaryHex: '#f59e0b',
    accentHex: '#fef08a',
    primaryNum: 0xf59e0b,
    accentNum: 0xfef08a
  },
  {
    id: 'rainbow_prism',
    category: 'trail',
    name: 'Prism Burst',
    tagline: 'Multi-color celebration sparks on every step & leap.',
    perkLabel: 'Prismatic Sparkles',
    cost: 165,
    primaryHex: '#ec4899',
    accentHex: '#34d399',
    primaryNum: 0xec4899,
    accentNum: 0x34d399
  }
];

const SHOP_BY_ID = new Map<string, ShopItemDef>(SHOP_CATALOG.map((item) => [item.id, item]));

export function getShopItemById(id: string | null | undefined): ShopItemDef | null {
  if (!id) return null;
  return SHOP_BY_ID.get(id) || null;
}

export function createDefaultLoadout(): PlayerLoadout {
  return {
    ownedIds: ['classic_spark'],
    equippedDroneId: null,
    equippedAccessoryId: null,
    equippedTrailId: 'classic_spark'
  };
}

export function normalizePlayerLoadout(raw: Partial<PlayerLoadout> | null | undefined): PlayerLoadout {
  const base = createDefaultLoadout();
  if (!raw || typeof raw !== 'object') return base;

  const ownedSet = new Set<string>(['classic_spark']);
  if (Array.isArray(raw.ownedIds)) {
    for (const id of raw.ownedIds) {
      if (typeof id === 'string' && SHOP_BY_ID.has(id)) {
        ownedSet.add(id);
      }
    }
  }

  const droneItem = getShopItemById(raw.equippedDroneId);
  const equippedDroneId: DroneId | null =
    droneItem && droneItem.category === 'drone' && ownedSet.has(droneItem.id)
      ? (droneItem.id as DroneId)
      : null;

  const accItem = getShopItemById(raw.equippedAccessoryId);
  const equippedAccessoryId: AccessoryId | null =
    accItem && accItem.category === 'accessory' && ownedSet.has(accItem.id)
      ? (accItem.id as AccessoryId)
      : null;

  const trailItem = getShopItemById(raw.equippedTrailId);
  const equippedTrailId: TrailId =
    trailItem && trailItem.category === 'trail' && ownedSet.has(trailItem.id)
      ? (trailItem.id as TrailId)
      : 'classic_spark';

  return {
    ownedIds: Array.from(ownedSet),
    equippedDroneId,
    equippedAccessoryId,
    equippedTrailId
  };
}

export function canBuyShopItem(
  loadout: PlayerLoadout,
  totalBolts: number,
  itemId: string
): { ok: boolean; reason?: 'not_found' | 'already_owned' | 'insufficient_bolts'; missingBolts?: number } {
  const item = getShopItemById(itemId);
  if (!item) return { ok: false, reason: 'not_found' };
  if (loadout.ownedIds.includes(item.id)) return { ok: false, reason: 'already_owned' };
  if (totalBolts < item.cost) {
    return { ok: false, reason: 'insufficient_bolts', missingBolts: item.cost - totalBolts };
  }
  return { ok: true };
}

export function purchaseShopItem(
  loadout: PlayerLoadout,
  totalBolts: number,
  itemId: string
): { ok: boolean; loadout: PlayerLoadout; totalBolts: number; item: ShopItemDef | null } {
  const item = getShopItemById(itemId);
  const check = canBuyShopItem(loadout, totalBolts, itemId);
  if (!check.ok || !item) {
    return { ok: false, loadout, totalBolts, item };
  }

  const ownedIds = Array.from(new Set([...loadout.ownedIds, item.id]));
  const nextLoadout: PlayerLoadout = {
    ownedIds,
    equippedDroneId: item.category === 'drone' ? (item.id as DroneId) : loadout.equippedDroneId,
    equippedAccessoryId:
      item.category === 'accessory' ? (item.id as AccessoryId) : loadout.equippedAccessoryId,
    equippedTrailId: item.category === 'trail' ? (item.id as TrailId) : loadout.equippedTrailId
  };
  return {
    ok: true,
    loadout: nextLoadout,
    totalBolts: Math.max(0, totalBolts - item.cost),
    item
  };
}

export function toggleEquipShopItem(loadout: PlayerLoadout, itemId: string): PlayerLoadout {
  const item = getShopItemById(itemId);
  if (!item || !loadout.ownedIds.includes(item.id)) return loadout;

  if (item.category === 'drone') {
    return {
      ...loadout,
      equippedDroneId: loadout.equippedDroneId === item.id ? null : (item.id as DroneId)
    };
  }
  if (item.category === 'accessory') {
    return {
      ...loadout,
      equippedAccessoryId: loadout.equippedAccessoryId === item.id ? null : (item.id as AccessoryId)
    };
  }
  return {
    ...loadout,
    equippedTrailId: item.id as TrailId
  };
}

export function getTrailPalette(trailId: TrailId | null | undefined): number[] {
  switch (trailId) {
    case 'cyan_plasma':
      return [0x06b6d4, 0x22d3ee, 0xa5f3fc];
    case 'solar_gold':
      return [0xf59e0b, 0xfbbf24, 0xfef08a];
    case 'rainbow_prism':
      return [0xec4899, 0x38bdf8, 0x34d399, 0xfbbf24, 0xa78bfa];
    case 'classic_spark':
    default:
      return [0x38bdf8, 0xfde047];
  }
}

// ---------------------------------------------------------------------------
// Mastery Skill Quests Engine
// ---------------------------------------------------------------------------

export interface QuestProgressCounters {
  missionsCleared: number;
  bugsSquashed: number;
  loopsUsed: number;
  conditionalsUsed: number;
  functionsUsed: number;
  predictionsCorrect: number;
  crystalsCollected: number;
  dailyCleared: number;
  shopBought: number;
}

export type QuestCounterKey = keyof QuestProgressCounters;

export interface MasteryQuestDef {
  id: string;
  title: string;
  description: string;
  skillLabel: string;
  counterKey: QuestCounterKey;
  target: number;
  boltReward: number;
  accent: 'emerald' | 'amber' | 'sky' | 'violet' | 'rose';
}

export interface EvaluatedQuest extends MasteryQuestDef {
  current: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
  ratio: number;
}

export const MASTERY_QUESTS: readonly MasteryQuestDef[] = [
  {
    id: 'q_first_bug',
    title: 'Bug Squasher',
    description: 'Solve 1 Bug Buster debugging mission.',
    skillLabel: 'Debugging',
    counterKey: 'bugsSquashed',
    target: 1,
    boltReward: 55,
    accent: 'violet'
  },
  {
    id: 'q_crystal_hunter',
    title: 'Crystal Sweeper',
    description: 'Collect 6 crystals across any coding missions.',
    skillLabel: 'Planning',
    counterKey: 'crystalsCollected',
    target: 6,
    boltReward: 50,
    accent: 'sky'
  },
  {
    id: 'q_loop_builder',
    title: 'Loop Optimizer',
    description: 'Win 2 missions using a LOOP block.',
    skillLabel: 'Loops',
    counterKey: 'loopsUsed',
    target: 2,
    boltReward: 65,
    accent: 'emerald'
  },
  {
    id: 'q_brain_spark',
    title: 'Code Predictor',
    description: 'Answer 2 Predict-Before-Run quizzes correctly.',
    skillLabel: 'Tracing',
    counterKey: 'predictionsCorrect',
    target: 2,
    boltReward: 60,
    accent: 'amber'
  },
  {
    id: 'q_sensor_pro',
    title: 'Smart Sensor Ace',
    description: 'Win 2 missions with IF / IF-ELSE sensor blocks.',
    skillLabel: 'Conditionals',
    counterKey: 'conditionalsUsed',
    target: 2,
    boltReward: 80,
    accent: 'violet'
  },
  {
    id: 'q_bug_detective',
    title: 'Chief Bug Detective',
    description: 'Squash 4 Bug Buster puzzles.',
    skillLabel: 'Debugging',
    counterKey: 'bugsSquashed',
    target: 4,
    boltReward: 110,
    accent: 'rose'
  },
  {
    id: 'q_subroutine_pro',
    title: 'Function Engineer',
    description: 'Win 2 missions using a MY BLOCK function.',
    skillLabel: 'Functions',
    counterKey: 'functionsUsed',
    target: 2,
    boltReward: 95,
    accent: 'sky'
  },
  {
    id: 'q_workshop_stylist',
    title: 'Workshop Stylist',
    description: 'Unlock 2 items in the Bolt Upgrade Shop.',
    skillLabel: 'Workshop',
    counterKey: 'shopBought',
    target: 2,
    boltReward: 70,
    accent: 'amber'
  }
];

export function createDefaultQuestCounters(): QuestProgressCounters {
  return {
    missionsCleared: 0,
    bugsSquashed: 0,
    loopsUsed: 0,
    conditionalsUsed: 0,
    functionsUsed: 0,
    predictionsCorrect: 0,
    crystalsCollected: 0,
    dailyCleared: 0,
    shopBought: 0
  };
}

export function normalizeQuestCounters(
  raw: Partial<QuestProgressCounters> | null | undefined
): QuestProgressCounters {
  const base = createDefaultQuestCounters();
  if (!raw || typeof raw !== 'object') return base;
  const clean = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    missionsCleared: clean(raw.missionsCleared),
    bugsSquashed: clean(raw.bugsSquashed),
    loopsUsed: clean(raw.loopsUsed),
    conditionalsUsed: clean(raw.conditionalsUsed),
    functionsUsed: clean(raw.functionsUsed),
    predictionsCorrect: clean(raw.predictionsCorrect),
    crystalsCollected: clean(raw.crystalsCollected),
    dailyCleared: clean(raw.dailyCleared),
    shopBought: clean(raw.shopBought)
  };
}

export function incrementQuestCounters(
  counters: QuestProgressCounters,
  deltas: Partial<QuestProgressCounters>
): QuestProgressCounters {
  const next = { ...counters };
  (Object.keys(deltas) as QuestCounterKey[]).forEach((key) => {
    const d = deltas[key];
    if (typeof d === 'number' && d > 0) {
      next[key] = (next[key] || 0) + Math.floor(d);
    }
  });
  return next;
}

export function evaluateMasteryQuests(
  counters: QuestProgressCounters,
  claimedQuestIds: readonly string[]
): EvaluatedQuest[] {
  const claimedSet = new Set(claimedQuestIds);
  return MASTERY_QUESTS.map((quest) => {
    const rawVal = counters[quest.counterKey] || 0;
    const current = Math.min(quest.target, rawVal);
    const completed = rawVal >= quest.target;
    const claimed = claimedSet.has(quest.id);
    return {
      ...quest,
      current,
      completed,
      claimed,
      claimable: completed && !claimed,
      ratio: Math.min(1, current / Math.max(1, quest.target))
    };
  });
}

export function countClaimableQuests(
  counters: QuestProgressCounters,
  claimedQuestIds: readonly string[]
): number {
  return evaluateMasteryQuests(counters, claimedQuestIds).filter((q) => q.claimable).length;
}

export function claimMasteryQuest(
  counters: QuestProgressCounters,
  claimedQuestIds: readonly string[],
  totalBolts: number,
  questId: string
): {
  ok: boolean;
  claimedQuestIds: string[];
  totalBolts: number;
  reward: number;
} {
  const evaluated = evaluateMasteryQuests(counters, claimedQuestIds).find((q) => q.id === questId);
  if (!evaluated || !evaluated.claimable) {
    return { ok: false, claimedQuestIds: [...claimedQuestIds], totalBolts, reward: 0 };
  }
  return {
    ok: true,
    claimedQuestIds: Array.from(new Set([...claimedQuestIds, questId])),
    totalBolts: totalBolts + evaluated.boltReward,
    reward: evaluated.boltReward
  };
}
