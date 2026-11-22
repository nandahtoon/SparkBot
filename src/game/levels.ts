import type { CircuitCell, CircuitCellType, CircuitGrid, LevelDef } from './types';

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
