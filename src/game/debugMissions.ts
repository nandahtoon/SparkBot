import { makeCircuit } from './levels';
import type { ChassisGrid, CodeBlock, DynamicHazardDef, LevelDef, TrackTile } from './types';

export interface DebugMissionDef {
  id: string;
  order: number;
  name: string;
  ageLabel: string;
  skillTag: string;
  clue: string;
  boltReward: number;
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked: boolean;
  elseUnlocked?: boolean;
  functionUnlocked?: boolean;
  waitUnlocked?: boolean;
  hazards?: DynamicHazardDef[];
  starterChassis: ChassisGrid;
  starterProgram: CodeBlock[];
  starterFunctionBody?: CodeBlock[];
  track: TrackTile[];
}

function cloneBlocks(blocks: CodeBlock[]): CodeBlock[] {
  return blocks.map((b) => ({
    ...b,
    children: b.children ? cloneBlocks(b.children) : undefined,
    elseChildren: b.elseChildren ? cloneBlocks(b.elseChildren) : undefined
  }));
}

function buildStarterChassis(parts: {
  drive?: 'wheels' | 'treads';
  thrusters?: boolean;
  booster?: boolean;
  laser?: boolean;
  magnet?: boolean;
}): ChassisGrid {
  return [
    [parts.booster ? 'booster' : null, null, null],
    [parts.thrusters ? 'thrusters' : null, null, parts.laser ? 'laser' : null],
    [parts.drive || 'wheels', parts.magnet ? 'magnet' : null, null]
  ];
}

const SIMPLE_SOLVED_CIRCUIT = makeCircuit([
  { r: 2, c: 2, type: 'mirror', rot: 1 },
  { r: 0, c: 2, type: 'core', rot: 0 }
]);

export const DEBUG_MISSIONS: readonly DebugMissionDef[] = [
  {
    id: 'debug_1',
    order: 1,
    name: 'Short of the Gate',
    ageLabel: 'Ages 6–7',
    skillTag: 'Sequence',
    clue: 'SparkBot stops 1 tile early! Add the missing MOVE block.',
    boltReward: 40,
    parBlocks: 4,
    loopUnlocked: false,
    ifUnlocked: false,
    starterChassis: buildStarterChassis({ drive: 'wheels', laser: true }),
    starterProgram: [
      { id: 'dbg1_m1', type: 'MOVE' },
      { id: 'dbg1_m2', type: 'MOVE' },
      { id: 'dbg1_m3', type: 'MOVE' }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ]
  },
  {
    id: 'debug_2',
    order: 2,
    name: 'Jump Too Soon!',
    ageLabel: 'Ages 6–8',
    skillTag: 'Jump Timing',
    clue: 'SparkBot jumps onto the Gap instead of over it! Reorder MOVE and JUMP.',
    boltReward: 45,
    parBlocks: 4,
    loopUnlocked: false,
    ifUnlocked: false,
    starterChassis: buildStarterChassis({ drive: 'wheels', thrusters: true, laser: true }),
    starterProgram: [
      { id: 'dbg2_j1', type: 'JUMP' },
      { id: 'dbg2_m1', type: 'MOVE' },
      { id: 'dbg2_m2', type: 'MOVE' }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ]
  },
  {
    id: 'debug_3',
    order: 3,
    name: 'Under-Counted Loop',
    ageLabel: 'Ages 7–9',
    skillTag: 'Loops',
    clue: 'This LOOP only runs 2 times! Tap the LOOP badge to fix its repeat count.',
    boltReward: 55,
    parBlocks: 3,
    loopUnlocked: true,
    ifUnlocked: false,
    starterChassis: buildStarterChassis({ drive: 'treads', thrusters: true, laser: true }),
    starterProgram: [
      {
        id: 'dbg3_l1',
        type: 'LOOP',
        count: 2,
        children: [{ id: 'dbg3_j1', type: 'JUMP' }]
      }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ]
  },
  {
    id: 'debug_4',
    order: 4,
    name: 'Wrong Sensor Bug',
    ageLabel: 'Ages 8–10',
    skillTag: 'IF-ELSE',
    clue: 'The IF block checks for MUD instead of GAP! Swap it so SparkBot jumps gaps.',
    boltReward: 65,
    parBlocks: 5,
    loopUnlocked: true,
    ifUnlocked: true,
    elseUnlocked: true,
    starterChassis: buildStarterChassis({ drive: 'treads', thrusters: true, laser: true }),
    starterProgram: [
      {
        id: 'dbg4_l1',
        type: 'LOOP',
        count: 4,
        children: [
          {
            id: 'dbg4_if1',
            type: 'IF',
            condition: 'MUD',
            children: [{ id: 'dbg4_j1', type: 'JUMP' }],
            elseChildren: [{ id: 'dbg4_m1', type: 'MOVE' }]
          }
        ]
      }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ]
  },
  {
    id: 'debug_5',
    order: 5,
    name: 'Laser Beat Slip',
    ageLabel: 'Ages 9–11',
    skillTag: 'WAIT Timing',
    clue: 'SparkBot walks right into the pulsing Laser Gate! Add a WAIT beat before moving.',
    boltReward: 75,
    parBlocks: 5,
    loopUnlocked: true,
    ifUnlocked: true,
    waitUnlocked: true,
    hazards: [{ id: 'hz_dbg5_laser', kind: 'laser_gate', tileIndex: 2, period: 2, activeOffset: 0 }],
    starterChassis: buildStarterChassis({ drive: 'wheels', thrusters: true, laser: true }),
    starterProgram: [
      { id: 'dbg5_m1', type: 'MOVE' },
      { id: 'dbg5_m2', type: 'MOVE' },
      { id: 'dbg5_m3', type: 'MOVE' },
      { id: 'dbg5_m4', type: 'MOVE' }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ]
  },
  {
    id: 'debug_6',
    order: 6,
    name: 'Broken My Block',
    ageLabel: 'Ages 10–12',
    skillTag: 'Functions',
    clue: 'MY BLOCK uses MOVE instead of JUMP over the canyons! Fix the block inside MY BLOCK.',
    boltReward: 90,
    parBlocks: 5,
    loopUnlocked: true,
    ifUnlocked: true,
    functionUnlocked: true,
    starterChassis: buildStarterChassis({ drive: 'wheels', thrusters: true, laser: true }),
    starterFunctionBody: [
      { id: 'dbg6_fm1', type: 'MOVE' },
      { id: 'dbg6_fm2', type: 'MOVE' }
    ],
    starterProgram: [
      { id: 'dbg6_c1', type: 'CALL_FUNC' },
      { id: 'dbg6_c2', type: 'CALL_FUNC' }
    ],
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'gate', crystal: false }
    ]
  }
];

export function getDebugMissionById(id: string | null | undefined): DebugMissionDef | null {
  if (!id) return null;
  return DEBUG_MISSIONS.find((m) => m.id === id) || null;
}

export function debugMissionToLevelDef(mission: DebugMissionDef): LevelDef {
  return {
    id: 2000 + mission.order,
    name: `Bug #${mission.order}: ${mission.name}`,
    ageLabel: `Debug · ${mission.ageLabel}`,
    brief: mission.clue,
    budget: 140,
    parBudget: 120,
    parBlocks: mission.parBlocks,
    loopUnlocked: mission.loopUnlocked,
    ifUnlocked: mission.ifUnlocked,
    elseUnlocked: Boolean(mission.elseUnlocked),
    functionUnlocked: Boolean(mission.functionUnlocked),
    waitUnlocked: Boolean(mission.waitUnlocked),
    hazards: mission.hazards ? mission.hazards.map((h) => ({ ...h })) : undefined,
    isDebug: true,
    debugMissionId: mission.id,
    debugClue: mission.clue,
    debugBoltReward: mission.boltReward,
    starterChassis: mission.starterChassis.map((row) => [...row]),
    starterProgram: cloneBlocks(mission.starterProgram),
    starterFunctionBody: mission.starterFunctionBody ? cloneBlocks(mission.starterFunctionBody) : [],
    track: mission.track.map((t) => ({ ...t })),
    circuit: SIMPLE_SOLVED_CIRCUIT.map((row) => row.map((c) => ({ ...c })))
  };
}
