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
    elseUnlocked: true,
    name: 'Starport Finale',
    ageLabel: 'Bonus · Ages 8–10',
    brief: 'Combine everything! Pair IF/ELSE sensor logic inside LOOPs to sail past gaps, ramps, and mud!',
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
  },
  // ---------- CHAPTER 4: CITADEL OF MOTION (Ages 9–12) ----------
  {
    id: 13,
    isBonus: true,
    loopUnlocked: true,
    ifUnlocked: true,
    elseUnlocked: true,
    waitUnlocked: true,
    functionUnlocked: false,
    name: 'Rhythm Crossing',
    ageLabel: 'Ch. 4 · Ages 9–11',
    brief: 'Timed Laser Barriers pulse on every step! Use IF [HAZARD] -> WAIT ELSE -> MOVE inside a LOOP to glide through safely.',
    budget: 95,
    parBudget: 60,
    parBlocks: 6,
    hazards: [
      { id: 'hz_13_laser_1', kind: 'laser_gate', tileIndex: 2, period: 2, activeOffset: 0 },
      { id: 'hz_13_laser_2', kind: 'laser_gate', tileIndex: 4, period: 2, activeOffset: 1 }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'splitter', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 3, type: 'mirror', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 1 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 14,
    isBonus: true,
    loopUnlocked: true,
    ifUnlocked: true,
    elseUnlocked: true,
    waitUnlocked: true,
    functionUnlocked: true,
    name: 'Patrol Corridor',
    ageLabel: 'Ch. 4 · Ages 9–12',
    brief: 'Patrol Drones sweep the corridor! Build a reusable MY BLOCK routine (MOVE + JUMP) and call it 3 times to dodge every drone.',
    budget: 110,
    parBudget: 85,
    parBlocks: 5,
    hazards: [
      { id: 'hz_14_drone_1', kind: 'patrol_drone', minTile: 3, maxTile: 4, startTile: 4, startDir: -1 },
      { id: 'hz_14_drone_2', kind: 'patrol_drone', minTile: 6, maxTile: 7, startTile: 7, startDir: -1 }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'splitter', rot: 0 },
      { r: 4, c: 2, type: 'mirror', rot: 0 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 4, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 3, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 15,
    isBonus: true,
    loopUnlocked: true,
    ifUnlocked: true,
    elseUnlocked: true,
    waitUnlocked: true,
    functionUnlocked: true,
    name: 'Dual-Hazard Gauntlet',
    ageLabel: 'Ch. 4 · Ages 10–12',
    brief: 'Combine MY BLOCK smart stepping (IF [HAZARD] -> WAIT, MOVE) with BOOST over ramps and JUMP over gaps!',
    budget: 130,
    parBudget: 115,
    parBlocks: 10,
    hazards: [
      { id: 'hz_15_laser_1', kind: 'laser_gate', tileIndex: 2, period: 2, activeOffset: 0 },
      { id: 'hz_15_drone_1', kind: 'patrol_drone', minTile: 6, maxTile: 7, startTile: 6, startDir: 1 },
      { id: 'hz_15_laser_2', kind: 'laser_gate', tileIndex: 9, period: 2, activeOffset: 0 }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
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
      { r: 1, c: 3, type: 'wall', rot: 0 },
      { r: 3, c: 1, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 16,
    isBonus: true,
    isBoss: true,
    loopUnlocked: true,
    ifUnlocked: true,
    elseUnlocked: true,
    waitUnlocked: true,
    functionUnlocked: true,
    name: 'Overload Sentinel',
    ageLabel: 'BOSS · Ages 10–12',
    brief: 'Boss Rescue! Program MY BLOCK with IF [HAZARD] -> WAIT, navigate Patrol Drones & Laser Gates, then shatter all 3 Sentinel Shield Cores!',
    budget: 140,
    parBudget: 125,
    parBlocks: 10,
    bossMeta: {
      name: 'Overload Sentinel',
      title: 'Citadel Guardian',
      coreCount: 3,
      introLine: 'The Overload Sentinel locked the Citadel with rhythmic lasers and patrol drones! Use MY BLOCK, IF/ELSE, and your Front Laser to stabilize all 3 Shield Cores!',
      defeatLine: 'All 3 Sentinel Shield Cores stabilized! The Citadel of Motion is free!'
    },
    hazards: [
      { id: 'hz_16_laser_1', kind: 'laser_gate', tileIndex: 1, period: 2, activeOffset: 1 },
      { id: 'hz_16_drone_1', kind: 'patrol_drone', minTile: 4, maxTile: 5, startTile: 4, startDir: 1 },
      { id: 'hz_16_laser_2', kind: 'laser_gate', tileIndex: 8, period: 2, activeOffset: 0 },
      { id: 'hz_16_drone_2', kind: 'patrol_drone', minTile: 9, maxTile: 10, startTile: 10, startDir: -1 }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'ramp', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'splitter', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 3, type: 'splitter', rot: 0 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 1 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 4, type: 'core', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 17, name: "Lightweight Delivery", ageLabel: 'Ch. 5 · Ages 8–12',
    brief: "Carry the crystals to the station using only the parts you need. Find a short repeating program.",
    isBonus: true, loopUnlocked: true, ifUnlocked: true, elseUnlocked: true,
    functionUnlocked: true, waitUnlocked: false,
    budget: 55, parBudget: 45, parBlocks: 8,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 3, type: 'mirror', rot: 1 },
      { r: 0, c: 3, type: 'core', rot: 0 },
      { r: 4, c: 3, type: 'wall', rot: 0 }
    ])
  },
  {
    id: 18, name: "Marsh Supply Run", ageLabel: 'Ch. 5 · Ages 8–12',
    brief: "Deliver supplies across mud and gaps. Choose the right parts and plan your jumps.",
    isBonus: true, loopUnlocked: true, ifUnlocked: true, elseUnlocked: true,
    functionUnlocked: true, waitUnlocked: false,
    budget: 100, parBudget: 95, parBlocks: 9,
    track: [
      { type: 'start', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'normal', crystal: false },
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
    id: 19, name: "Sunrise Express", ageLabel: 'Ch. 5 · Ages 8–12',
    brief: "Use the ramp pattern to make an energy-smart delivery. Try a reusable routine.",
    isBonus: true, loopUnlocked: true, ifUnlocked: true, elseUnlocked: true,
    functionUnlocked: true, waitUnlocked: false,
    budget: 90, parBudget: 75, parBlocks: 9,
    track: [
      { type: 'start', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'ramp', crystal: false },
      { type: 'ramp', crystal: true },
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
    id: 20, name: "Power Station Rescue", ageLabel: 'Ch. 5 · Ages 8–12',
    brief: "Deliver energy to a station while its gates pulse. Plan safe steps and power both light cores.",
    isBonus: true, loopUnlocked: true, ifUnlocked: true, elseUnlocked: true,
    functionUnlocked: true, waitUnlocked: true,
    budget: 85, parBudget: 45, parBlocks: 12,
    hazards: [{"id":"hz_20_gate_a","kind":"laser_gate","tileIndex":2,"period":2,"activeOffset":0},{"id":"hz_20_gate_b","kind":"laser_gate","tileIndex":5,"period":2,"activeOffset":1}],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 1, type: 'splitter', rot: 1 },
      { r: 0, c: 1, type: 'mirror', rot: 1 },
      { r: 0, c: 4, type: 'core', rot: 0 },
      { r: 2, c: 3, type: 'mirror', rot: 0 },
      { r: 4, c: 3, type: 'mirror', rot: 1 },
      { r: 4, c: 4, type: 'core', rot: 0 },
      { r: 1, c: 2, type: 'wall', rot: 0 },
      { r: 3, c: 2, type: 'wall', rot: 0 }
    ])
  },
  {
    id:21,name:"Tide Survey",ageLabel:'Ch. 6',brief:"Collect every research crystal on the floating walkway. A shortcut can miss a sample.",
    isBonus:true,objective:{"kind":"collect","requiredCrystals":3},budget:80,parBudget:80,parBlocks:4,loopUnlocked:false,waitUnlocked:false,
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    track:[{type:'start',crystal:false},{type:'normal',crystal:true},{type:'normal',crystal:true},{type:'gap',crystal:false},{type:'normal',crystal:true},{type:'gate',crystal:false}],
    circuit:makeCircuit([])
  },
  {
    id:22,name:"Reef Survey",ageLabel:'Ch. 6',brief:"Visit the two marked research decks. Use WAIT to record an observation at each before returning.",
    isBonus:true,objective:{"kind":"survey","stations":[1,4]},budget:80,parBudget:80,parBlocks:7,loopUnlocked:true,waitUnlocked:true,
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    track:[{type:'start',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:false},{type:'gap',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:false},{type:'gate',crystal:false}],
    circuit:makeCircuit([])
  },
  {
    id:23,name:"Current Patterns",ageLabel:'Ch. 6',brief:"Two tide gates blink in different patterns. Watch their signals, wait on a safe deck, and cross when each gate is open.",
    isBonus:true,objective:{"kind":"delivery"},budget:45,parBudget:45,parBlocks:8,loopUnlocked:true,waitUnlocked:true,
    starterChassis:[[null,null,null],[null,null,'laser'],['wheels',null,null]],
    hazards:[{"id":"hz_23_tide_signal","kind":"laser_gate","tileIndex":2,"period":2,"activeOffset":0},{"id":"hz_23_outer_signal","kind":"laser_gate","tileIndex":5,"period":3,"activeOffset":0}],
    track:[{type:'start',crystal:false},{type:'normal',crystal:true},{type:'normal',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:true},{type:'normal',crystal:false},{type:'gate',crystal:false}],
    circuit:makeCircuit([])
  },
  {
    id:24,name:"Ocean Beacon",ageLabel:'Ch. 6',brief:"Repair the robot's broken repeating routine, then restore the beacon by lighting its two cores.",
    isBonus:true,objective:{"kind":"power"},budget:80,parBudget:80,parBlocks:4,loopUnlocked:true,waitUnlocked:false,
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    debugClue:'The repeating routine makes the robot roll into a gap. Inspect it and repair the commands.',
    starterProgram:[{id:'beacon-loop',type:'LOOP',count:2,children:[{id:'beacon-move',type:'MOVE'},{id:'beacon-bug',type:'MOVE'}]}],
    track:[{type:'start',crystal:false},{type:'normal',crystal:true},{type:'gap',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:true},{type:'gap',crystal:false},{type:'gate',crystal:false}],
    circuit:makeCircuit([{r:2,c:2,type:'splitter',rot:1},{r:0,c:2,type:'core',rot:0},{r:2,c:4,type:'mirror',rot:0},{r:4,c:4,type:'core',rot:0},{r:4,c:2,type:'wall',rot:0}])
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
