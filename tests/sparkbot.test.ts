import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as E from '../src/game/engine';

interface SparkBotEngineType {
  SAVE_KEY: string;
  PARTS: Record<string, { id: string; name: string; cost: number }>;
  LEVELS: Array<{
    id: number;
    name: string;
    budget: number;
    parBudget: number;
    parBlocks: number;
    loopUnlocked: boolean;
    ifUnlocked?: boolean;
    isBonus?: boolean;
    track: Array<{ type: string; crystal: boolean }>;
    circuit: Array<Array<{ type: string; rot: number }>>;
  }>;
  BONUS_LEVELS: Array<{
    id: number;
    name: string;
    budget: number;
    parBudget: number;
    parBlocks: number;
    loopUnlocked: boolean;
    ifUnlocked?: boolean;
    isBonus?: boolean;
    track: Array<{ type: string; crystal: boolean }>;
    circuit: Array<Array<{ type: string; rot: number }>>;
  }>;
  getLevelById: (id: number) => SparkBotEngineType['LEVELS'][number] | null;
  createEmptyChassis: () => (string | null)[][];
  computeChassisInfo: (chassis: (string | null)[][]) => {
    cost: number;
    hasWheels: boolean;
    hasTreads: boolean;
    hasDrive: boolean;
    hasThrusters: boolean;
    hasBooster: boolean;
    hasFrontLaser: boolean;
  };
  countBlocks: (blocks: unknown[]) => number;
  flattenBlocks: (blocks: unknown[], maxSteps?: number) => Array<{ type: string; blockId: string }>;
  simulateProgram: (
    level: SparkBotEngineType['LEVELS'][number],
    chassis: (string | null)[][],
    blocks: unknown[]
  ) => {
    status: 'win' | 'fail';
    failReason: string | null;
    missingPart: string | null;
    events: Array<{
      action: string;
      condition?: string;
      scanTile?: number;
      scanMatch?: boolean;
      status: string;
    }>;
    collectedCrystals: number;
    totalCrystals: number;
    finalPos: number;
  };
  traceCircuit: (grid: Array<Array<{ type: string; rot: number }>>) => {
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    litCores: Record<string, boolean>;
    litCount: number;
    totalCores: number;
    solved: boolean;
  };
  calculateStars: (
    level: SparkBotEngineType['LEVELS'][number],
    energyCost: number,
    blockCount: number,
    collectedCrystals: number,
    totalCrystals: number
  ) => { stars: number; allCrystals: number | boolean; withinPar: boolean };
  HINT_THRESHOLD_MS: number;
  generateStructuralHint: (
    level: SparkBotEngineType['LEVELS'][number],
    phase: 'build' | 'code' | 'circuit' | 'sandbox',
    chassis: (string | null)[][],
    program: unknown[],
    circuitGrid: Array<Array<{ type: string; rot: number }>>
  ) => string;
  getTutorialStep: (
    level: SparkBotEngineType['LEVELS'][number],
    phase: 'build' | 'code' | 'circuit' | 'sandbox',
    chassis: (string | null)[][],
    program: unknown[],
    circuitGrid: Array<Array<{ type: string; rot: number }>>,
    selectedPart: string | null
  ) => {
    stepNum: number;
    totalSteps: number;
    message: string;
    targetType: string | null;
    targetKey: string | null;
    circuitTarget: { r: number; c: number } | null;
  };
  findShortestTrackPlan: (level: SparkBotEngineType['LEVELS'][number]) => {
    profile: { label: string; cost: number; wheels: boolean; treads: boolean; thrusters: boolean; booster: boolean };
    sequence: string[];
  } | null;
  getDailyDateKey: (dateInput?: Date | string) => string;
  shiftDailyDateKey: (dateKey: string, deltaDays: number) => string;
  recordDailyLogin: (
    dailyState: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string; lastLoginDate?: string },
    dateKey: string
  ) => {
    daily: { dateKey: string; stars: number; streak: number; lastCompletedDate: string; lastLoginDate: string };
    prevStreak: number;
    streak: number;
    changed: boolean;
    hitMilestone: number;
  };
  recordDailyCompletion: (
    dailyState: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string; lastLoginDate?: string },
    dateKey: string,
    stars: number
  ) => { dateKey: string; stars: number; streak: number; lastCompletedDate: string; lastLoginDate?: string };
  getActiveDailyStreak: (
    dailyState: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string; lastLoginDate?: string },
    todayKey: string
  ) => number;
  getDailyStreakProgress: (streak: number) => {
    streak: number;
    tier: number;
    target: number;
    progress: number;
    label: string;
  };
  generateDailyChallenge: (dateInput?: Date | string) => SparkBotEngineType['LEVELS'][number] & {
    isDaily: boolean;
    dailyDateKey: string;
  };
  MAGBOT_PASSES_KEY: string;
  MAGBOT_BOLTS_KEY: string;
  MAGBOT_BOLTS_PER_PASS: number;
  getMagbotRewards: (storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }) => {
    passes: number;
    bolts: number;
  };
  syncMagbotStorage: (
    storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void },
    passes: number,
    bolts: number
  ) => { passes: number; bolts: number };
  awardMagbotPass: (storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }) => {
    passes: number;
    bolts: number;
  };
  buildMagbotLaunchUrl: (runs: number, bolts: number, fromLevel: string | number) => string;
  MAGBOT_PERKS_KEY: string;
  validateBonusStarConditions: (
    level: SparkBotEngineType['LEVELS'][number],
    energyCost: number,
    blockCount: number,
    collectedCrystals: number,
    totalCrystals: number
  ) => {
    earned: boolean;
    fullCrystals: boolean;
    withinBlockPar: boolean;
    withinBudgetPar: boolean;
    withinPar: boolean;
    collectedCrystals: number;
    totalCrystals: number;
    blockCount: number;
    parBlocks: number;
    energyCost: number;
    parBudget: number;
  };
  evaluateBonusStar: (
    level: SparkBotEngineType['LEVELS'][number],
    starInfo: { stars: number; allCrystals: boolean | number; withinPar: boolean }
  ) => boolean;
  computeMagbotPerks: (
    saveObj: {
      stars?: Record<string, number>;
      bonusStars?: Record<string, number>;
      unlockedBonus?: number;
      daily?: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string };
    },
    todayKey?: string
  ) => {
    totalStars: number;
    bonusCleared: number;
    bonusStars: number;
    dailyStreak: number;
    starterCube: boolean;
    goldenWave: boolean;
    overchargedAura: boolean;
  };
  syncMagbotPerks: (
    storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void },
    saveObj: {
      stars?: Record<string, number>;
      bonusStars?: Record<string, number>;
      unlockedBonus?: number;
      daily?: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string };
    },
    todayKey?: string
  ) => {
    totalStars: number;
    bonusCleared: number;
    bonusStars: number;
    dailyStreak: number;
    starterCube: boolean;
    goldenWave: boolean;
    overchargedAura: boolean;
  };
}

function makeChassis(parts: Array<[number, number, string]>): E.ChassisGrid {
  const grid = E.createEmptyChassis();
  for (const [r, c, id] of parts) {
    grid[r][c] = id as E.PartId;
  }
  return grid;
}

const b = (type: E.BlockType): E.CodeBlock => ({ id: type + '_' + Math.random(), type });
const loop = (count: number, children: E.CodeBlock[]): E.CodeBlock => ({ id: 'loop_' + Math.random(), type: 'LOOP', count, children });
const ifBlk = (condition: E.SensorCondition, children: E.CodeBlock[]): E.CodeBlock => ({ id: 'if_' + Math.random(), type: 'IF', condition, children });

test('all 8 levels exist and start with unsolved circuits', () => {
  assert.equal(E.LEVELS.length, 8);
  for (const lvl of E.LEVELS) {
    const trace = E.traceCircuit(lvl.circuit);
    assert.ok(trace.totalCores >= 1, `Level ${lvl.id} must have >= 1 power core`);
    assert.equal(trace.solved, false, `Level ${lvl.id} circuit must not start already solved`);
  }
});

test('missing part detection gives helpful speech reasons', () => {
  const lvl2 = E.LEVELS[1];
  const noThrusters = makeChassis([[2, 0, 'wheels'], [1, 2, 'laser']]);
  const res1 = E.simulateProgram(lvl2, noThrusters, [b('MOVE'), b('JUMP')]);
  assert.equal(res1.status, 'fail');
  assert.equal(res1.missingPart, 'thrusters');
  assert.match(res1.failReason || '', /Jump Thrusters/);

  const lvl4 = E.LEVELS[3];
  const wheelsOnly = makeChassis([[2, 0, 'wheels'], [1, 2, 'laser']]);
  const res2 = E.simulateProgram(lvl4, wheelsOnly, [b('MOVE')]);
  assert.equal(res2.status, 'fail');
  assert.equal(res2.missingPart, 'treads');

  const lvl1 = E.LEVELS[0];
  const noLaser = makeChassis([[2, 0, 'wheels']]);
  const res3 = E.simulateProgram(lvl1, noLaser, [b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE')]);
  assert.equal(res3.status, 'fail');
  assert.equal(res3.missingPart, 'laser');

  const wrongLaserSlot = makeChassis([[2, 0, 'wheels'], [1, 1, 'laser']]);
  assert.equal(E.computeChassisInfo(wrongLaserSlot).hasFrontLaser, false);
});

test('all 8 levels are 3-star solvable in Build, Code, and Circuit phases', () => {
  const solutions: Array<{
    parts: Array<[number, number, string]>;
    code: E.CodeBlock[];
    toggles: Array<[number, number]>;
  }> = [
    // Level 1
    {
      parts: [[2, 0, 'wheels'], [1, 2, 'laser']],
      code: [b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE')],
      toggles: [[2, 2]]
    },
    // Level 2
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'thrusters'], [1, 2, 'laser']],
      code: [b('MOVE'), b('JUMP'), b('MOVE'), b('JUMP')],
      toggles: [[2, 3], [4, 3]]
    },
    // Level 3
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'thrusters'], [1, 2, 'laser']],
      code: [b('JUMP'), b('MOVE'), b('JUMP'), b('MOVE'), b('MOVE')],
      toggles: [[2, 1], [0, 1], [0, 4]]
    },
    // Level 4
    {
      parts: [[2, 0, 'treads'], [1, 2, 'laser']],
      code: [loop(3, [b('MOVE'), b('MOVE')])],
      toggles: [[2, 2], [2, 4]]
    },
    // Level 5
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'booster'], [1, 2, 'laser']],
      code: [loop(2, [b('BOOST')]), b('MOVE')],
      toggles: [[2, 1], [4, 1], [2, 3]]
    },
    // Level 6
    {
      parts: [[2, 0, 'treads'], [1, 0, 'thrusters'], [1, 2, 'laser']],
      code: [loop(3, [b('MOVE'), b('JUMP')])],
      toggles: [[2, 2], [3, 2], [4, 2], [3, 4]]
    },
    // Level 7
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'booster'], [1, 2, 'laser']],
      code: [loop(3, [b('BOOST')])],
      toggles: [[2, 1], [0, 1], [0, 3], [0, 4], [4, 3]]
    },
    // Level 8
    {
      parts: [[2, 0, 'treads'], [0, 0, 'thrusters'], [1, 0, 'booster'], [1, 2, 'laser']],
      code: [loop(2, [loop(2, [b('MOVE'), b('JUMP')])]), b('BOOST')],
      toggles: [[2, 1], [4, 1], [4, 3], [1, 3], [0, 3]]
    }
  ];

  for (let i = 0; i < E.LEVELS.length; i++) {
    const lvl = E.LEVELS[i];
    const sol = solutions[i];
    const chassis = makeChassis(sol.parts);
    const info = E.computeChassisInfo(chassis);
    assert.ok(info.cost <= lvl.budget, `Level ${lvl.id} cost ${info.cost} exceeds budget ${lvl.budget}`);
    assert.ok(info.cost <= lvl.parBudget, `Level ${lvl.id} cost ${info.cost} exceeds parBudget ${lvl.parBudget}`);

    const blkCount = E.countBlocks(sol.code);
    assert.ok(blkCount <= lvl.parBlocks, `Level ${lvl.id} block count ${blkCount} exceeds parBlocks ${lvl.parBlocks}`);

    const sim = E.simulateProgram(lvl, chassis, sol.code);
    assert.equal(sim.status, 'win', `Level ${lvl.id} code failed: ${sim.failReason}`);
    assert.equal(sim.collectedCrystals, sim.totalCrystals, `Level ${lvl.id} missed crystals: ${sim.collectedCrystals}/${sim.totalCrystals}`);

    const starResult = E.calculateStars(lvl, info.cost, blkCount, sim.collectedCrystals, sim.totalCrystals);
    assert.equal(starResult.stars, 3, `Level ${lvl.id} did not achieve 3 stars`);

    const circuitCopy = JSON.parse(JSON.stringify(lvl.circuit));
    for (const [r, c] of sol.toggles) {
      circuitCopy[r][c].rot = circuitCopy[r][c].rot === 0 ? 1 : 0;
    }
    const trace = E.traceCircuit(circuitCopy);
    assert.equal(trace.solved, true, `Level ${lvl.id} circuit failed to solve (${trace.litCount}/${trace.totalCores})`);
  }
});

test('circuit raytracer handles closed mirror loops safely without hanging', () => {
  const loopGrid: E.CircuitGrid = E.LEVELS[0].circuit.map(row => row.map(() => ({ type: 'empty', rot: 0 })));
  loopGrid[2][1] = { type: 'mirror', rot: 1 }; // RIGHT -> DOWN
  loopGrid[3][1] = { type: 'mirror', rot: 0 }; // DOWN -> LEFT
  loopGrid[3][0] = { type: 'mirror', rot: 1 }; // LEFT -> UP
  loopGrid[2][0] = { type: 'mirror', rot: 0 }; // UP -> RIGHT
  const res = E.traceCircuit(loopGrid);
  assert.equal(res.solved, false);
  assert.ok(res.segments.length > 0 && res.segments.length < 20);
});

test('structural hint system suggests valid structures across all phases and 60s threshold', () => {
  assert.equal(E.HINT_THRESHOLD_MS, 60000);
  const empty = E.createEmptyChassis();

  for (const lvl of E.LEVELS) {
    const buildHint = E.generateStructuralHint(lvl, 'build', empty, [], lvl.circuit);
    assert.match(buildHint, /Laser/i, `Level ${lvl.id} build hint should mention Laser`);

    const codeHint = E.generateStructuralHint(lvl, 'code', empty, [], lvl.circuit);
    assert.ok(codeHint.length > 15, `Level ${lvl.id} code hint should be non-empty`);
    if (lvl.loopUnlocked) {
      assert.match(codeHint, /LOOP/i, `Level ${lvl.id} code hint should suggest LOOP structure`);
    }

    const circuitHint = E.generateStructuralHint(lvl, 'circuit', empty, [], lvl.circuit);
    assert.match(circuitHint, /Row \d, Col \d/, `Level ${lvl.id} circuit hint should pinpoint a structural rotation`);
  }

  // Verify Phase 2 code compression hint when player solved track with too many blocks on Level 4
  const lvl4 = E.LEVELS[3];
  const lvl4Chassis = makeChassis([[2, 0, 'treads'], [1, 2, 'laser']]);
  const longCode = [b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE')];
  const parHint = E.generateStructuralHint(lvl4, 'code', lvl4Chassis, longCode, lvl4.circuit);
  assert.match(parHint, /Par 3 blocks/i);
  assert.match(parHint, /LOOP/i);
});

test('getTutorialStep guides through Level 1 Build, Code, and Circuit steps', () => {
  const lvl1 = E.LEVELS[0];
  const empty = E.createEmptyChassis();

  // Build Step 1: Select wheels
  const s1 = E.getTutorialStep(lvl1, 'build', empty, [], lvl1.circuit, null);
  assert.equal(s1.stepNum, 1);
  assert.equal(s1.targetType, 'part');
  assert.equal(s1.targetKey, 'wheels');

  // Build Step 1b: Place wheels on slot 2,0
  const s1b = E.getTutorialStep(lvl1, 'build', empty, [], lvl1.circuit, 'wheels');
  assert.equal(s1b.stepNum, 1);
  assert.equal(s1b.targetType, 'slot');
  assert.equal(s1b.targetKey, '2,0');

  // Build Step 2: Select laser
  const withWheels = makeChassis([[2, 0, 'wheels']]);
  const s2 = E.getTutorialStep(lvl1, 'build', withWheels, [], lvl1.circuit, null);
  assert.equal(s2.stepNum, 2);
  assert.equal(s2.targetType, 'part');
  assert.equal(s2.targetKey, 'laser');

  // Build Step 2b: Place laser on front slot 1,2
  const s2b = E.getTutorialStep(lvl1, 'build', withWheels, [], lvl1.circuit, 'laser');
  assert.equal(s2b.stepNum, 2);
  assert.equal(s2b.targetType, 'slot');
  assert.equal(s2b.targetKey, '1,2');

  // Build Step 3: Proceed to Code
  const readyChassis = makeChassis([[2, 0, 'wheels'], [1, 2, 'laser']]);
  const s3 = E.getTutorialStep(lvl1, 'build', readyChassis, [], lvl1.circuit, null);
  assert.equal(s3.stepNum, 3);
  assert.equal(s3.targetType, 'button');
  assert.equal(s3.targetKey, 'toCodeBtn');

  // Code Step 4: Add MOVE blocks
  const s4 = E.getTutorialStep(lvl1, 'code', readyChassis, [b('MOVE')], lvl1.circuit, null);
  assert.equal(s4.stepNum, 4);
  assert.equal(s4.targetType, 'cmd');
  assert.equal(s4.targetKey, 'MOVE');
  assert.match(s4.message, /1 \/ 5/);

  // Code Step 5: Run SparkBot once valid
  const winningCode = [b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE'), b('MOVE')];
  const s5 = E.getTutorialStep(lvl1, 'code', readyChassis, winningCode, lvl1.circuit, null);
  assert.equal(s5.stepNum, 5);
  assert.equal(s5.targetType, 'button');
  assert.equal(s5.targetKey, 'runCodeBtn');

  // Circuit Step 6: Pinpoint mirror cell (2,2) on Level 1
  const s6 = E.getTutorialStep(lvl1, 'circuit', readyChassis, winningCode, lvl1.circuit, null);
  assert.equal(s6.stepNum, 6);
  assert.equal(s6.targetType, 'circuit');
  assert.equal(s6.circuitTarget?.r, 2);
  assert.equal(s6.circuitTarget?.c, 2);

  // Level 4 Build: Recommends Monster Treads for mud tiles
  const lvl4 = E.LEVELS[3];
  const s4Mud = E.getTutorialStep(lvl4, 'build', empty, [], lvl4.circuit, null);
  assert.equal(s4Mud.targetType, 'part');
  assert.equal(s4Mud.targetKey, 'treads');
});

test('Daily Challenge generator is deterministic per 24h day and varies across days', () => {
  const d1Key = E.getDailyDateKey(new Date(2026, 10, 20, 9, 30, 0));
  assert.equal(d1Key, '2026-11-20');
  assert.equal(E.getDailyDateKey('2026-11-20'), '2026-11-20');

  const dayA1 = E.generateDailyChallenge('2026-11-20');
  const dayA2 = E.generateDailyChallenge('2026-11-20');
  const dayB = E.generateDailyChallenge('2026-11-21');

  assert.deepEqual(dayA1, dayA2, 'Same dateKey must produce identical puzzle');
  assert.equal(dayA1.isDaily, true);
  assert.equal(dayA1.dailyDateKey, '2026-11-20');
  assert.notDeepEqual(
    { track: dayA1.track, circuit: dayA1.circuit },
    { track: dayB.track, circuit: dayB.circuit },
    'Next 24h day must produce a different procedural puzzle'
  );
});

test('Daily Challenge guarantees solvable tracks and circuits across 14 consecutive dates', () => {
  const dates = [
    '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24',
    '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
    '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'
  ];

  for (const dateKey of dates) {
    const daily = E.generateDailyChallenge(dateKey);
    assert.ok(daily.track.length >= 8 && daily.track.length <= 10, `${dateKey} track length valid`);
    assert.equal(daily.track[0].type, 'start');
    assert.equal(daily.track[daily.track.length - 1].type, 'gate');
    for (const tile of daily.track) {
      if (tile.crystal) {
        assert.notEqual(tile.type, 'gap', `${dateKey} crystal must never spawn over a gap`);
      }
    }

    // Track must be solvable within budget via findShortestTrackPlan + simulateProgram
    const plan = E.findShortestTrackPlan(daily);
    assert.ok(plan, `${dateKey} track must have a valid plan within budget`);
    assert.ok(plan.profile.cost <= daily.budget, `${dateKey} profile cost <= budget`);
    assert.ok(daily.parBudget <= daily.budget, `${dateKey} parBudget <= budget`);

    const parts: Array<[number, number, string]> = [[1, 2, 'laser']];
    parts.push([2, 0, plan.profile.treads ? 'treads' : 'wheels']);
    if (plan.profile.thrusters) parts.push([1, 0, 'thrusters']);
    if (plan.profile.booster) parts.push([0, 0, 'booster']);
    const sim = E.simulateProgram(daily, makeChassis(parts), plan.sequence.map((s) => b(s as E.BlockType)));
    assert.equal(sim.status, 'win', `${dateKey} shortest plan must win simulateProgram`);

    // Initial circuit must be unsolved with >= 1 core, and solvable by toggling mirrors/splitters
    const initialTrace = E.traceCircuit(daily.circuit);
    assert.ok(initialTrace.totalCores >= 1, `${dateKey} circuit must have >= 1 core`);
    assert.equal(initialTrace.solved, false, `${dateKey} circuit must start unsolved`);

    const toggleables: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const t = daily.circuit[r][c].type;
        if (t === 'mirror' || t === 'splitter') toggleables.push({ r, c });
      }
    }
    assert.ok(toggleables.length >= 1 && toggleables.length <= 6, `${dateKey} toggleable count in range`);

    let circuitSolved = false;
    const maxMask = 1 << toggleables.length;
    for (let mask = 1; mask < maxMask; mask++) {
      const copy = JSON.parse(JSON.stringify(daily.circuit));
      for (let i = 0; i < toggleables.length; i++) {
        if ((mask >> i) & 1) {
          const cell = copy[toggleables[i].r][toggleables[i].c];
          cell.rot = cell.rot === 0 ? 1 : 0;
        }
      }
      if (E.traceCircuit(copy).solved) {
        circuitSolved = true;
        break;
      }
    }
    assert.equal(circuitSolved, true, `${dateKey} circuit must be solvable`);
  }
});

test('MagBot Wall-Run reward tracking initializes at 0, increments passes +1 and bolts +50, and builds launch URL', () => {
  assert.equal(E.MAGBOT_PASSES_KEY, 'magbot_run_passes');
  assert.equal(E.MAGBOT_BOLTS_KEY, 'magbot_bonus_bolts');
  assert.equal(E.MAGBOT_BOLTS_PER_PASS, 50);

  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };

  const initial = E.getMagbotRewards(mockStorage);
  assert.equal(initial.passes, 0);
  assert.equal(initial.bolts, 0);
  assert.equal(mem.get('magbot_run_passes'), '0');
  assert.equal(mem.get('magbot_bonus_bolts'), '0');

  const firstClear = E.awardMagbotPass(mockStorage);
  assert.equal(firstClear.passes, 1);
  assert.equal(firstClear.bolts, 50);
  assert.equal(mem.get('magbot_run_passes'), '1');
  assert.equal(mem.get('magbot_bonus_bolts'), '50');

  const secondClear = E.awardMagbotPass(mockStorage);
  assert.equal(secondClear.passes, 2);
  assert.equal(secondClear.bolts, 100);
  assert.equal(mem.get('magbot_run_passes'), '2');
  assert.equal(mem.get('magbot_bonus_bolts'), '100');

  assert.equal(
    E.buildMagbotLaunchUrl(1, 50, 3),
    'magbot.html?runs=1&bolts=50&fromLevel=3'
  );
  assert.equal(
    E.buildMagbotLaunchUrl(2, 100, 'daily'),
    'magbot.html?runs=2&bolts=100&fromLevel=daily'
  );
});

test('Daily Challenge consecutive-day streak advances through 3-day and 7-day milestones and resets after a missed day', () => {
  assert.equal(E.shiftDailyDateKey('2026-11-30', 1), '2026-12-01');
  assert.equal(E.shiftDailyDateKey('2026-12-01', -1), '2026-11-30');

  let daily = { dateKey: '', stars: 0, streak: 0, lastCompletedDate: '' };
  assert.equal(E.getActiveDailyStreak(daily, '2026-11-20'), 0);
  assert.equal(E.getDailyStreakProgress(0).tier, 0);
  assert.equal(E.getDailyStreakProgress(0).progress, 0);

  // Day 1 -> Day 2 -> Day 3 (reaches 3-day streak tier)
  daily = E.recordDailyCompletion(daily, '2026-11-20', 2);
  assert.equal(daily.streak, 1);
  // Same day replay preserves streak and upgrades stars
  daily = E.recordDailyCompletion(daily, '2026-11-20', 3);
  assert.equal(daily.streak, 1);
  assert.equal(daily.stars, 3);

  daily = E.recordDailyCompletion(daily, '2026-11-21', 3);
  assert.equal(daily.streak, 2);
  assert.equal(E.getDailyStreakProgress(2).tier, 0);
  assert.ok(Math.abs(E.getDailyStreakProgress(2).progress - 2 / 3) < 0.001);

  daily = E.recordDailyCompletion(daily, '2026-11-22', 3);
  assert.equal(daily.streak, 3);
  const tier3 = E.getDailyStreakProgress(3);
  assert.equal(tier3.tier, 3);
  assert.equal(tier3.target, 7);
  assert.equal(tier3.label, '3-Day Streak');

  // Days 4..7 (reaches 7-day streak tier)
  for (let d = 23; d <= 26; d++) {
    daily = E.recordDailyCompletion(daily, `2026-11-${d}`, 3);
  }
  assert.equal(daily.streak, 7);
  const tier7 = E.getDailyStreakProgress(7);
  assert.equal(tier7.tier, 7);
  assert.equal(tier7.progress, 1);
  assert.equal(tier7.label, '7-Day Streak');

  // Still active the very next day before completing today, expires after 2 missed days
  assert.equal(E.getActiveDailyStreak(daily, '2026-11-27'), 7);
  assert.equal(E.getActiveDailyStreak(daily, '2026-11-28'), 0);

  // Completing after a gap resets streak to 1
  daily = E.recordDailyCompletion(daily, '2026-11-28', 2);
  assert.equal(daily.streak, 1);
});

test('consecutive-day logins increase streak count, hit 3-day and 7-day milestones, avoid same-day double counting, and reset on missed days', () => {
  let daily: { dateKey?: string; stars?: number; streak?: number; lastCompletedDate?: string; lastLoginDate?: string } = {
    dateKey: '',
    stars: 0,
    streak: 0,
    lastCompletedDate: '',
    lastLoginDate: ''
  };

  // Day 1 login
  const d1 = E.recordDailyLogin(daily, '2026-11-20');
  assert.equal(d1.streak, 1);
  assert.equal(d1.changed, true);
  assert.equal(d1.hitMilestone, 0);
  daily = d1.daily;

  // Same-day reload does not increment
  const d1Again = E.recordDailyLogin(daily, '2026-11-20');
  assert.equal(d1Again.streak, 1);
  assert.equal(d1Again.changed, false);

  // Completing Daily Challenge on Day 1 also stays at streak 1
  daily = E.recordDailyCompletion(daily, '2026-11-20', 3);
  assert.equal(daily.streak, 1);

  // Day 2 login -> streak 2
  const d2 = E.recordDailyLogin(daily, '2026-11-21');
  assert.equal(d2.streak, 2);
  assert.equal(d2.hitMilestone, 0);
  daily = d2.daily;

  // Day 3 login -> hits 3-day milestone
  const d3 = E.recordDailyLogin(daily, '2026-11-22');
  assert.equal(d3.streak, 3);
  assert.equal(d3.hitMilestone, 3);
  assert.equal(E.getDailyStreakProgress(d3.streak).tier, 3);
  daily = d3.daily;

  // Days 4..6 logins
  for (let day = 23; day <= 25; day++) {
    const res = E.recordDailyLogin(daily, `2026-11-${day}`);
    assert.equal(res.hitMilestone, 0);
    daily = res.daily;
  }
  assert.equal(daily.streak, 6);

  // Day 7 login -> hits 7-day milestone
  const d7 = E.recordDailyLogin(daily, '2026-11-26');
  assert.equal(d7.streak, 7);
  assert.equal(d7.hitMilestone, 7);
  assert.equal(E.getDailyStreakProgress(d7.streak).tier, 7);
  assert.equal(E.getDailyStreakProgress(d7.streak).progress, 1);
  daily = d7.daily;

  // Missing Nov 27 and logging in Nov 28 resets streak to 1
  assert.equal(E.getActiveDailyStreak(daily, '2026-11-28'), 0);
  const reset = E.recordDailyLogin(daily, '2026-11-28');
  assert.equal(reset.streak, 1);
  assert.equal(reset.changed, true);
});

test('IF conditional sensor blocks scan ahead, branch cleanly, and nest inside LOOP', () => {
  const lvl2 = E.LEVELS[1]; // start, flat, gap, flat, gap, gate
  const fullChassis = makeChassis([[2, 0, 'wheels'], [1, 0, 'thrusters'], [0, 0, 'booster'], [1, 2, 'laser']]);

  // Nested LOOP(2) { MOVE, IF(GAP) { JUMP } } solves Level 2 and emits SCAN events
  const program = [loop(2, [b('MOVE'), ifBlk('GAP', [b('JUMP')])])];
  assert.equal(E.countBlocks(program), 4);

  const winSim = E.simulateProgram(lvl2, fullChassis, program);
  assert.equal(winSim.status, 'win');
  assert.equal(winSim.collectedCrystals, winSim.totalCrystals);

  const scans = winSim.events.filter(ev => ev.action === 'SCAN');
  assert.equal(scans.length, 2);
  assert.equal(scans[0].condition, 'GAP');
  assert.equal(scans[0].scanTile, 2);
  assert.equal(scans[0].scanMatch, true);

  // When condition does NOT match (checking MUD on Level 2), child JUMP is skipped safely
  const skippedSim = E.simulateProgram(lvl2, fullChassis, [b('MOVE'), ifBlk('MUD', [b('JUMP')]), b('MOVE')]);
  assert.equal(skippedSim.status, 'fail'); // falls into gap because MUD didn't match
  const mudScan = skippedSim.events.find(ev => ev.action === 'SCAN');
  assert.equal(mudScan?.scanMatch, false);
  assert.equal(skippedSim.events.filter(ev => ev.action === 'JUMP').length, 0);
});

test('IF [GAP], IF [MUD], and IF [RAMP] buttons exist in code-dock and react to all 3 terrain hazards in simulator', () => {
  const codeDockSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CodeDock.tsx'), 'utf8');
  assert.match(codeDockSrc, /id="addIfGapBtn"/);
  assert.match(codeDockSrc, /data-add-cmd="IF"/);
  assert.match(codeDockSrc, /data-if-cond="GAP"/);
  assert.match(codeDockSrc, /id="addIfMudBtn"/);
  assert.match(codeDockSrc, /data-if-cond="MUD"/);
  assert.match(codeDockSrc, /id="addIfRampBtn"/);
  assert.match(codeDockSrc, /data-if-cond="RAMP"/);

  // Mixed-hazard level containing gap, mud, and ramp terrain hazards
  const mixedLevel: E.LevelDef = {
    id: 999,
    name: 'Mixed Hazard Test',
    ageLabel: 'Test',
    brief: 'Mixed hazard test',
    budget: 140,
    parBudget: 120,
    parBlocks: 10,
    loopUnlocked: true,
    ifUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'mud', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'ramp', crystal: true },
      { type: 'normal', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'gate', crystal: false }
    ],
    circuit: E.LEVELS[0].circuit
  };

  // Wheels + Thrusters + Booster + Laser (no Treads, so MUD must be jumped via IF [MUD]!)
  const wheelChassis = makeChassis([[2, 0, 'wheels'], [1, 0, 'thrusters'], [0, 0, 'booster'], [1, 2, 'laser']]);
  const reactiveProgram = [
    loop(3, [
      ifBlk('GAP', [b('JUMP')]),
      ifBlk('MUD', [b('JUMP')]),
      ifBlk('RAMP', [b('BOOST')]),
      b('MOVE')
    ])
  ];

  const sim = E.simulateProgram(mixedLevel, wheelChassis, reactiveProgram);
  assert.equal(sim.status, 'win', `Reactive hazard program failed: ${sim.failReason}`);
  assert.equal(sim.collectedCrystals, sim.totalCrystals);

  const matchedConds = sim.events
    .filter(ev => ev.action === 'SCAN' && ev.scanMatch)
    .map(ev => ev.condition);
  assert.ok(matchedConds.includes('GAP'));
  assert.ok(matchedConds.includes('MUD'));
  assert.ok(matchedConds.includes('RAMP'));
});

test('all 4 Bonus Sector levels (9-12) start unsolved, solve gently, and award Optional Bonus Stars within Par', () => {
  assert.deepEqual(Array.from(E.BONUS_LEVELS, l => l.id), [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const starportLevels = E.BONUS_LEVELS.filter(l => Number(l.id) >= 9 && Number(l.id) <= 12);
  for (const id of [9, 10, 11, 12]) {
    assert.equal(E.getLevelById(id)?.id, id);
    assert.equal(E.getLevelById(id)?.isBonus, true);
  }

  const bonusSolutions: Array<{
    parts: Array<[number, number, string]>;
    code: E.CodeBlock[];
    toggles: Array<[number, number]>;
  }> = [
    // Level 9: Sensor Gate
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'thrusters'], [1, 2, 'laser']],
      code: [loop(3, [b('MOVE'), ifBlk('GAP', [b('JUMP')])])],
      toggles: [[2, 2], [3, 2], [4, 2]]
    },
    // Level 10: Sludge Scanner
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'thrusters'], [1, 2, 'laser']],
      code: [loop(3, [b('MOVE'), ifBlk('MUD', [b('JUMP')])])],
      toggles: [[2, 1], [1, 1], [1, 4]]
    },
    // Level 11: Ramp Surge
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'booster'], [1, 2, 'laser']],
      code: [loop(3, [b('MOVE'), ifBlk('RAMP', [b('BOOST')])])],
      toggles: [[2, 2], [0, 2], [2, 4], [4, 4]]
    },
    // Level 12: Starport Finale
    {
      parts: [[2, 0, 'wheels'], [1, 0, 'thrusters'], [0, 0, 'booster'], [1, 2, 'laser']],
      code: [loop(2, [ifBlk('GAP', [b('JUMP')]), ifBlk('RAMP', [b('BOOST')]), b('MOVE')])],
      toggles: [[2, 1], [0, 1], [2, 3], [4, 3]]
    }
  ];

  for (let i = 0; i < starportLevels.length; i++) {
    const lvl = starportLevels[i];
    const sol = bonusSolutions[i];
    assert.equal(lvl.ifUnlocked, true);
    assert.equal(lvl.loopUnlocked, true);
    assert.ok(lvl.budget > lvl.parBudget, `Bonus level ${lvl.id} should offer gentle budget headroom`);

    const initTrace = E.traceCircuit(lvl.circuit);
    assert.ok(initTrace.totalCores >= 2);
    assert.equal(initTrace.solved, false, `Bonus level ${lvl.id} circuit must start unsolved`);

    const chassis = makeChassis(sol.parts);
    const info = E.computeChassisInfo(chassis);
    assert.ok(info.cost <= lvl.parBudget, `Bonus level ${lvl.id} cost ${info.cost} <= parBudget ${lvl.parBudget}`);

    const blkCount = E.countBlocks(sol.code);
    assert.ok(blkCount <= lvl.parBlocks, `Bonus level ${lvl.id} blocks ${blkCount} <= parBlocks ${lvl.parBlocks}`);

    const sim = E.simulateProgram(lvl, chassis, sol.code);
    assert.equal(sim.status, 'win', `Bonus level ${lvl.id} failed: ${sim.failReason}`);
    assert.equal(sim.collectedCrystals, sim.totalCrystals, `Bonus level ${lvl.id} missed crystals`);

    const stars = E.calculateStars(lvl, info.cost, blkCount, sim.collectedCrystals, sim.totalCrystals);
    assert.equal(stars.stars, 3);
    assert.equal(E.evaluateBonusStar(lvl, stars), true, `Bonus level ${lvl.id} should earn Optional Bonus Star`);
    assert.equal(E.evaluateBonusStar(lvl, { stars: 2, allCrystals: true, withinPar: false }), false);
    assert.equal(E.evaluateBonusStar(lvl, { stars: 3, allCrystals: false, withinPar: true }), false);

    const circuitCopy = JSON.parse(JSON.stringify(lvl.circuit));
    for (const [r, c] of sol.toggles) {
      circuitCopy[r][c].rot = circuitCopy[r][c].rot === 0 ? 1 : 0;
    }
    const solvedTrace = E.traceCircuit(circuitCopy);
    assert.equal(solvedTrace.solved, true, `Bonus level ${lvl.id} circuit failed to solve`);
  }
});

test('validateBonusStarConditions verifies full crystals + Par limits and Victory Modal includes Bonus Star badge elements', () => {
  const modalsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Modals.tsx'), 'utf8');
  assert.match(modalsSrc, /id="victoryBonusRow"/);
  assert.match(modalsSrc, /id="victoryBonusBadge"/);
  assert.match(modalsSrc, /id="victoryBonusCriteria"/);

  const lvl4 = E.LEVELS[3]; // parBudget 60, parBlocks 3
  const ok = E.validateBonusStarConditions(lvl4, 60, 3, 2, 2);
  assert.equal(ok.earned, true);
  assert.equal(ok.fullCrystals, true);
  assert.equal(ok.withinBlockPar, true);
  assert.equal(ok.withinBudgetPar, true);
  assert.equal(ok.withinPar, true);

  const missCrystal = E.validateBonusStarConditions(lvl4, 60, 3, 1, 2);
  assert.equal(missCrystal.earned, false);
  assert.equal(missCrystal.fullCrystals, false);
  assert.equal(missCrystal.withinPar, true);

  const overBlocks = E.validateBonusStarConditions(lvl4, 60, 5, 2, 2);
  assert.equal(overBlocks.earned, false);
  assert.equal(overBlocks.fullCrystals, true);
  assert.equal(overBlocks.withinBlockPar, false);
  assert.equal(overBlocks.withinPar, false);

  const overBudget = E.validateBonusStarConditions(lvl4, 95, 3, 2, 2);
  assert.equal(overBudget.earned, false);
  assert.equal(overBudget.withinBudgetPar, false);
  assert.equal(overBudget.withinPar, false);
});

test('shared magbot_perks_v1 milestones unlock cleanly from stars, bonus clears, and daily streak', () => {
  assert.equal(E.MAGBOT_PERKS_KEY, 'magbot_perks_v1');

  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };

  const base = E.computeMagbotPerks({ stars: { 1: 3, 2: 3 }, bonusStars: {} }, '2026-11-20');
  assert.equal(base.totalStars, 6);
  assert.equal(base.starterCube, false);
  assert.equal(base.goldenWave, false);
  assert.equal(base.overchargedAura, false);

  // Unlock Starter Cube via 1 bonus clear (or >= 10 stars)
  const p1 = E.computeMagbotPerks({ stars: { 1: 3 }, bonusStars: { 9: 2 } }, '2026-11-20');
  assert.equal(p1.bonusCleared, 1);
  assert.equal(p1.starterCube, true);
  assert.equal(p1.goldenWave, false);

  // Unlock Golden Wave via >= 18 stars
  const p2 = E.computeMagbotPerks({ stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 } }, '2026-11-20');
  assert.equal(p2.totalStars, 18);
  assert.equal(p2.starterCube, true);
  assert.equal(p2.goldenWave, true);
  assert.equal(p2.overchargedAura, false);

  // Unlock Overcharged Aura via 3-day active daily streak & persist to storage
  const synced = E.syncMagbotPerks(
    mockStorage,
    {
      stars: { 1: 3, 2: 3, 3: 3, 4: 3 },
      bonusStars: { 9: 3, 10: 3 },
      daily: { dateKey: '2026-11-20', stars: 3, streak: 3, lastCompletedDate: '2026-11-20' }
    },
    '2026-11-20'
  );
  assert.equal(synced.starterCube, true);
  assert.equal(synced.goldenWave, true);
  assert.equal(synced.overchargedAura, true);

  const stored = JSON.parse(mem.get('magbot_perks_v1') || '{}');
  assert.equal(stored.starterCube, true);
  assert.equal(stored.goldenWave, true);
  assert.equal(stored.overchargedAura, true);
});

test('TitleOverlay and TopHud include temporary Muted / Sound On visual flash indicator', () => {
  const titleSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TitleOverlay.tsx'), 'utf8');
  const topHudSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TopHud.tsx'), 'utf8');
  const muteIndSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/MuteIndicator.tsx'), 'utf8');

  assert.match(titleSrc, /MuteIndicator/);
  assert.match(titleSrc, /useMuteFlash/);
  assert.match(topHudSrc, /MuteIndicator/);
  assert.match(topHudSrc, /useMuteFlash/);
  assert.match(muteIndSrc, /aria-label=\{muted \? 'Muted' : 'Sound On'\}/);
  assert.match(muteIndSrc, /anim-mute-flash/);
});

test('TitleOverlay renders unified Mission Launch Console with daily mode, reward ladder, and kid HUD animations', () => {
  const titleSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TitleOverlay.tsx'), 'utf8');
  const topHudSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TopHud.tsx'), 'utf8');
  const cssSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

  assert.match(titleSrc, /id="dailyMissionSection"/);
  assert.match(titleSrc, /aria-label="Mission Launch Console"/);
  assert.match(titleSrc, /id="modeDailyTab"/);
  assert.match(titleSrc, /id="modeStoryTab"/);
  assert.match(titleSrc, /aria-label="Choose Play Mode"/);
  assert.match(titleSrc, /id=\{isDailyMode \? 'dailyMissionPlayBtn' : 'storyMissionPlayBtn'\}/);
  assert.match(titleSrc, /Play Daily Mission/);
  assert.match(titleSrc, /onStartDaily\(\)/);
  assert.match(titleSrc, /getDailyDateKey/);
  assert.match(titleSrc, /generateDailyChallenge/);
  assert.match(titleSrc, /aria-label="Daily Return Reward Ladder"/);
  assert.match(titleSrc, /Gift/);
  assert.match(titleSrc, /Crown/);

  for (const animClass of [
    'anim-calendar-pulse',
    'anim-flame-flicker',
    'anim-reward-hop',
    'anim-dot-pulse',
    'anim-stage-nudge'
  ]) {
    assert.match(cssSrc, new RegExp(`\\.${animClass}\\b`), `Missing CSS animation class .${animClass}`);
  }
  assert.match(titleSrc, /anim-reward-hop/);
  assert.match(titleSrc, /anim-dot-pulse/);
  assert.match(topHudSrc, /aria-label=\{isDaily \? 'Daily Challenge'/);
  assert.match(topHudSrc, /anim-stage-nudge/);
  assert.match(topHudSrc, /anim-reward-hop/);

  // Verify deterministic daily challenge generation for current date produces valid hazards/crystals
  const today = E.getDailyDateKey();
  const daily = E.generateDailyChallenge(today);
  assert.equal(daily.isDaily, true);
  assert.equal(daily.dailyDateKey, today);
  assert.ok(daily.track.length >= 4);
  assert.ok(daily.track.some((t) => t.crystal));
});

test('computeStemSkillBadges and recordSkillMastery track 6 STEM pillars and upgrade tiers cleanly', () => {
  const initialBadges = E.computeStemSkillBadges(E.defaultSkillStats());
  assert.equal(initialBadges.length, 6);
  assert.deepEqual(
    initialBadges.map((b) => b.id),
    ['chassis', 'physics', 'mud', 'loops', 'sensors', 'optics']
  );
  assert.ok(initialBadges.every((b) => b.tier === 0 && b.count === 0));

  // Level 6 has mud, gap, and loopUnlocked (solvable within Par 3 blocks)
  const lvl6 = E.LEVELS[5];
  const chassis = makeChassis([
    [2, 0, 'treads'],
    [1, 0, 'thrusters'],
    [1, 2, 'laser']
  ]);
  const prog = [loop(3, [b('MOVE'), b('JUMP')])];
  const sim = E.simulateProgram(lvl6, chassis, prog);
  assert.equal(sim.status, 'win');

  const first = E.recordSkillMastery(E.defaultSkillStats(), lvl6, chassis, prog, sim);
  assert.equal(first.next.chassisBuilds, 1);
  assert.equal(first.next.jumpsCleared, 1);
  assert.equal(first.next.mudCleared, 1);
  assert.equal(first.next.loopsCompressed, 1);
  assert.equal(first.next.circuitsSolved, 1);
  assert.ok(first.upgradedPillars.includes('chassis'));
  assert.ok(first.upgradedPillars.includes('optics'));

  // Advancing count to gold threshold promotes chassis & optics to tier 3
  const goldBadges = E.computeStemSkillBadges({
    chassisBuilds: 8,
    jumpsCleared: 9,
    mudCleared: 6,
    loopsCompressed: 6,
    sensorsUsed: 6,
    circuitsSolved: 8
  });
  assert.ok(goldBadges.every((b) => b.tier === 3));
});

test('computeGhostPreviewPlan computes exact Build, Code, and Circuit 3D preview plans', () => {
  const lvl4 = E.LEVELS[3]; // mud level needing treads
  const empty = E.createEmptyChassis();
  const buildPlan = E.computeGhostPreviewPlan(lvl4, 'build', empty, [], lvl4.circuit);
  assert.ok(buildPlan && buildPlan.kind === 'build');
  assert.equal(buildPlan.partId, 'treads');
  assert.deepEqual(buildPlan.targetSlot, [2, 0]);

  const readyChassis = makeChassis([
    [2, 0, 'treads'],
    [1, 2, 'laser']
  ]);
  const codePlan = E.computeGhostPreviewPlan(lvl4, 'code', readyChassis, [], lvl4.circuit);
  assert.ok(codePlan && codePlan.kind === 'code');
  assert.equal(codePlan.simResult.status, 'win');
  assert.ok(codePlan.simResult.events.length > 0);
  assert.equal(codePlan.missingBlockType, 'LOOP');

  const circuitPlan = E.computeGhostPreviewPlan(lvl4, 'circuit', readyChassis, [], lvl4.circuit);
  assert.ok(circuitPlan && circuitPlan.kind === 'circuit');
  assert.ok(circuitPlan.cell.r >= 0 && circuitPlan.cell.r < 5);
  assert.ok(circuitPlan.cell.c >= 0 && circuitPlan.cell.c < 5);
});

test('STEM Trophy Shelf, Visual Learning Demos, and Playable 3D Ghost Preview bindings are wired cleanly', () => {
  const titleSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TitleOverlay.tsx'), 'utf8');
  const topHudSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TopHud.tsx'), 'utf8');
  const buildSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BuildDock.tsx'), 'utf8');
  const codeSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CodeDock.tsx'), 'utf8');
  const worldSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/three/worldScene.ts'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');

  assert.match(titleSrc, /id="trophyShelfBtn"/);
  assert.match(topHudSrc, /id="playGhostFixBtn"/);
  assert.match(buildSrc, /data-demo-part=/);
  assert.match(codeSrc, /data-demo-cmd=/);
  assert.match(worldSrc, /public playGhostPreview\(/);
  assert.match(worldSrc, /createGearGeometry\(/);
  assert.match(appSrc, /ConceptDemoPopover/);
  assert.match(appSrc, /TrophyShelfModal/);
});

test('Bot Painter provides 3 curated chassis color themes, normalizes safely, persists default, and wires 3D/UI bindings', () => {
  assert.equal(E.BOT_THEME_ORDER.length, 3);
  assert.deepEqual(E.BOT_THEME_ORDER, ['amber', 'cobalt', 'emerald']);

  const bodyColors = new Set(E.BOT_THEME_ORDER.map((id) => E.BOT_THEMES[id].bodyHex));
  assert.equal(bodyColors.size, 3);

  assert.equal(E.normalizeBotTheme('amber'), 'amber');
  assert.equal(E.normalizeBotTheme('cobalt'), 'cobalt');
  assert.equal(E.normalizeBotTheme('emerald'), 'emerald');
  assert.equal(E.normalizeBotTheme('unknown'), 'amber');
  assert.equal(E.normalizeBotTheme(null), 'amber');

  const profile = E.defaultSaveProfile();
  assert.equal(profile.botTheme, 'amber');

  const buildSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BuildDock.tsx'), 'utf8');
  const rigSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/three/robotRig.ts'), 'utf8');
  const worldSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/three/worldScene.ts'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');

  assert.match(buildSrc, /id="botPainterBar"/);
  assert.match(buildSrc, /data-bot-theme=/);
  assert.match(rigSrc, /function setTheme\(/);
  assert.match(worldSrc, /public setBotTheme\(/);
  assert.match(appSrc, /handleChangeBotTheme/);
  assert.match(appSrc, /onChangeBotTheme=\{handleChangeBotTheme\}/);
});
