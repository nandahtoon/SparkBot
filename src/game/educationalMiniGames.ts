import {
  createEmptyChassis,
  simulateProgram,
  type ChassisGrid,
  type CodeBlock,
  type LevelDef,
  type PartId,
  type SensorCondition,
  type SimResult
} from './engine';

/* ============================================================================
 * 1. BUG DETECTIVE (Coding & Debugging Mini-Game)
 * ========================================================================== */

export type BugOperationHint = 'add_or_cycle' | 'reorder' | 'loop_count' | 'if_cond' | 'swap_cmd';

export interface BugDetectivePuzzle {
  id: string;
  roundNumber: number;
  title: string;
  ageBand: string;
  bugLesson: string;
  prompt: string;
  operationHint: BugOperationHint;
  allowAddMove?: boolean;
  level: LevelDef;
  chassisParts: Array<[number, number, PartId]>;
  starterProgram: CodeBlock[];
}

function makeChassisFromParts(parts: Array<[number, number, PartId]>): ChassisGrid {
  const g = createEmptyChassis();
  for (const [r, c, p] of parts) {
    g[r][c] = p;
  }
  return g;
}

export function cloneProgramBlocks(blocks: CodeBlock[]): CodeBlock[] {
  return blocks.map((b) => ({
    ...b,
    children: b.children ? cloneProgramBlocks(b.children) : undefined
  }));
}

const dummyCircuit = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => ({ type: 'empty' as const, rot: 0 }))
);

export const BUG_DETECTIVE_PUZZLES: BugDetectivePuzzle[] = [
  {
    id: 'bug_1',
    roundNumber: 1,
    title: 'Off-by-One Roll',
    ageBand: 'Ages 6–7',
    bugLesson: 'Counting Steps',
    prompt: 'SparkBot stops 1 tile short of the Gate! Add 1 MOVE block to reach the finish.',
    operationHint: 'add_or_cycle',
    allowAddMove: true,
    chassisParts: [
      [2, 0, 'wheels'],
      [1, 2, 'laser']
    ],
    level: {
      id: 901,
      name: 'Off-by-One Roll',
      ageLabel: 'Ages 6–7',
      brief: 'Reach tile 4',
      budget: 100,
      parBudget: 45,
      parBlocks: 4,
      loopUnlocked: false,
      track: [
        { type: 'start', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'normal', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gate', crystal: false }
      ],
      circuit: dummyCircuit
    },
    starterProgram: [
      { id: 'bd1_1', type: 'MOVE' },
      { id: 'bd1_2', type: 'MOVE' },
      { id: 'bd1_3', type: 'MOVE' }
    ]
  },
  {
    id: 'bug_2',
    roundNumber: 2,
    title: 'Swapped Jump Order',
    ageBand: 'Ages 6–7',
    bugLesson: 'Sequence Order',
    prompt: 'SparkBot jumps too early and lands right in the gap! Swap the first two blocks.',
    operationHint: 'reorder',
    chassisParts: [
      [2, 0, 'wheels'],
      [1, 0, 'thrusters'],
      [1, 2, 'laser']
    ],
    level: {
      id: 902,
      name: 'Swapped Jump Order',
      ageLabel: 'Ages 6–7',
      brief: 'Fix sequence order',
      budget: 100,
      parBudget: 80,
      parBlocks: 3,
      loopUnlocked: false,
      track: [
        { type: 'start', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gate', crystal: false }
      ],
      circuit: dummyCircuit
    },
    starterProgram: [
      { id: 'bd2_1', type: 'JUMP' },
      { id: 'bd2_2', type: 'MOVE' },
      { id: 'bd2_3', type: 'MOVE' }
    ]
  },
  {
    id: 'bug_3',
    roundNumber: 3,
    title: 'Loop Counter Bug',
    ageBand: 'Ages 7–8',
    bugLesson: 'Loop Repeats',
    prompt: 'The mud track needs 6 moves total, not 4! Tap the green LOOP counter to set ×3.',
    operationHint: 'loop_count',
    chassisParts: [
      [2, 0, 'treads'],
      [1, 2, 'laser']
    ],
    level: {
      id: 903,
      name: 'Loop Counter Bug',
      ageLabel: 'Ages 7–8',
      brief: 'Adjust LOOP count',
      budget: 100,
      parBudget: 60,
      parBlocks: 3,
      loopUnlocked: true,
      track: [
        { type: 'start', crystal: false },
        { type: 'mud', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'mud', crystal: false },
        { type: 'mud', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'gate', crystal: false }
      ],
      circuit: dummyCircuit
    },
    starterProgram: [
      {
        id: 'bd3_loop',
        type: 'LOOP',
        count: 2,
        children: [
          { id: 'bd3_m1', type: 'MOVE' },
          { id: 'bd3_m2', type: 'MOVE' }
        ]
      }
    ]
  },
  {
    id: 'bug_4',
    roundNumber: 4,
    title: 'Wrong Sensor Condition',
    ageBand: 'Ages 8–9',
    bugLesson: 'IF Conditionals',
    prompt: 'The sensor is looking for MUD instead of GAP! Tap IF [MUD] to switch it to GAP.',
    operationHint: 'if_cond',
    chassisParts: [
      [2, 0, 'wheels'],
      [1, 0, 'thrusters'],
      [1, 2, 'laser']
    ],
    level: {
      id: 904,
      name: 'Wrong Sensor Condition',
      ageLabel: 'Ages 8–9',
      brief: 'Fix IF condition',
      budget: 110,
      parBudget: 80,
      parBlocks: 4,
      loopUnlocked: true,
      ifUnlocked: true,
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
      circuit: dummyCircuit
    },
    starterProgram: [
      {
        id: 'bd4_loop',
        type: 'LOOP',
        count: 3,
        children: [
          { id: 'bd4_m1', type: 'MOVE' },
          {
            id: 'bd4_if',
            type: 'IF',
            condition: 'MUD',
            children: [{ id: 'bd4_j1', type: 'JUMP' }]
          }
        ]
      }
    ]
  },
  {
    id: 'bug_5',
    roundNumber: 5,
    title: 'Wrong Ramp Action',
    ageBand: 'Ages 9–10',
    bugLesson: 'Distance & Action Choice',
    prompt: 'JUMP (+2) lands right on the second steep ramp! Switch JUMP to BOOST (+3).',
    operationHint: 'swap_cmd',
    chassisParts: [
      [2, 0, 'wheels'],
      [1, 0, 'thrusters'],
      [0, 0, 'booster'],
      [1, 2, 'laser']
    ],
    level: {
      id: 905,
      name: 'Wrong Ramp Action',
      ageLabel: 'Ages 9–10',
      brief: 'Switch JUMP to BOOST',
      budget: 120,
      parBudget: 110,
      parBlocks: 4,
      loopUnlocked: false,
      track: [
        { type: 'start', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'ramp', crystal: false },
        { type: 'ramp', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'normal', crystal: false },
        { type: 'gate', crystal: false }
      ],
      circuit: dummyCircuit
    },
    starterProgram: [
      { id: 'bd5_1', type: 'MOVE' },
      { id: 'bd5_2', type: 'JUMP' },
      { id: 'bd5_3', type: 'MOVE' },
      { id: 'bd5_4', type: 'MOVE' }
    ]
  },
  {
    id: 'bug_6',
    roundNumber: 6,
    title: 'Starport Parsons Scramble',
    ageBand: 'Ages 9–11',
    bugLesson: 'Parsons Sequence Repair',
    prompt: 'All 3 blocks are here, just scrambled! Reorder them so SparkBot leaps the pit, boosts the ramps, and enters the gate.',
    operationHint: 'reorder',
    chassisParts: [
      [2, 0, 'wheels'],
      [1, 0, 'thrusters'],
      [0, 0, 'booster'],
      [1, 2, 'laser']
    ],
    level: {
      id: 906,
      name: 'Starport Parsons Scramble',
      ageLabel: 'Ages 9–11',
      brief: 'Reorder Parsons blocks',
      budget: 120,
      parBudget: 110,
      parBlocks: 3,
      loopUnlocked: false,
      track: [
        { type: 'start', crystal: false },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'ramp', crystal: false },
        { type: 'ramp', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'gate', crystal: false }
      ],
      circuit: dummyCircuit
    },
    starterProgram: [
      { id: 'bd6_1', type: 'BOOST' },
      { id: 'bd6_2', type: 'MOVE' },
      { id: 'bd6_3', type: 'JUMP' }
    ]
  }
];

export function evaluateBugDetectiveAttempt(
  puzzle: BugDetectivePuzzle,
  program: CodeBlock[]
): SimResult {
  const chassis = makeChassisFromParts(puzzle.chassisParts);
  return simulateProgram(puzzle.level, chassis, program);
}

export function cycleBugLoopCount(blocks: CodeBlock[], targetId: string): CodeBlock[] {
  return blocks.map((blk) => {
    if (blk.id === targetId && blk.type === 'LOOP') {
      const cur = blk.count || 2;
      const next = cur >= 4 ? 2 : cur + 1;
      return { ...blk, count: next };
    }
    if (blk.children) {
      return { ...blk, children: cycleBugLoopCount(blk.children, targetId) };
    }
    return blk;
  });
}

export function cycleBugIfCondition(blocks: CodeBlock[], targetId: string): CodeBlock[] {
  const order: SensorCondition[] = ['GAP', 'MUD', 'RAMP'];
  return blocks.map((blk) => {
    if (blk.id === targetId && blk.type === 'IF') {
      const curIdx = order.indexOf(blk.condition || 'GAP');
      const nextCond = order[(curIdx + 1) % order.length];
      return { ...blk, condition: nextCond };
    }
    if (blk.children) {
      return { ...blk, children: cycleBugIfCondition(blk.children, targetId) };
    }
    return blk;
  });
}

export function cycleBugActionBlockType(blocks: CodeBlock[], targetId: string): CodeBlock[] {
  const order: Array<'MOVE' | 'JUMP' | 'BOOST'> = ['MOVE', 'JUMP', 'BOOST'];
  return blocks.map((blk) => {
    if (blk.id === targetId && (blk.type === 'MOVE' || blk.type === 'JUMP' || blk.type === 'BOOST')) {
      const idx = order.indexOf(blk.type);
      return { ...blk, type: order[(idx + 1) % order.length] };
    }
    if (blk.children) {
      return { ...blk, children: cycleBugActionBlockType(blk.children, targetId) };
    }
    return blk;
  });
}

export function swapTopLevelBugBlocks(blocks: CodeBlock[], idxA: number, idxB: number): CodeBlock[] {
  if (idxA < 0 || idxB < 0 || idxA >= blocks.length || idxB >= blocks.length || idxA === idxB) {
    return blocks;
  }
  const copy = blocks.slice();
  const tmp = copy[idxA];
  copy[idxA] = copy[idxB];
  copy[idxB] = tmp;
  return copy;
}

export function computeBugDetectiveReward(puzzlesSolved: number, firstTryFixes: number): {
  score: number;
  bolts: number;
} {
  const score = puzzlesSolved * 100 + firstTryFixes * 35;
  const bolts = Math.min(120, Math.max(15, puzzlesSolved * 20 + firstTryFixes * 10));
  return { score, bolts };
}

/* ============================================================================
 * 2. LOGIC GATE LAB (Circuit & Digital Logic Mini-Game)
 * ========================================================================== */

export type LogicGateKind = 'AND' | 'OR' | 'NOT';

export interface LogicInputSwitch {
  id: string;
  label: string;
  initialValue: boolean;
}

export interface LogicGateNode {
  id: string;
  kind: LogicGateKind;
  locked: boolean;
  inputIds: string[];
  label: string;
}

export interface LogicTruthTestCase {
  inputs: Record<string, boolean>;
  expectedOutput: boolean;
}

export interface LogicGatePuzzle {
  id: string;
  roundNumber: number;
  title: string;
  ageBand: string;
  mode: 'toggle_inputs' | 'place_gate';
  ruleSummary: string;
  hint: string;
  inputs: LogicInputSwitch[];
  gates: LogicGateNode[];
  outputNodeId: string;
  outputLabel: string;
  truthTests?: LogicTruthTestCase[];
}

export const LOGIC_GATE_PUZZLES: LogicGatePuzzle[] = [
  {
    id: 'logic_1',
    roundNumber: 1,
    title: 'Dual Key AND Lock',
    ageBand: 'Ages 6–8',
    mode: 'toggle_inputs',
    ruleSummary: 'An AND gate powers the Vault Core only when BOTH Sensor A and Sensor B are ON.',
    hint: 'Flip both switches to ON (1) to fire the AND gate.',
    inputs: [
      { id: 'A', label: 'Light Sensor', initialValue: true },
      { id: 'B', label: 'Weight Pad', initialValue: false }
    ],
    gates: [{ id: 'G1', kind: 'AND', locked: true, inputIds: ['A', 'B'], label: 'Vault AND' }],
    outputNodeId: 'G1',
    outputLabel: 'Vault Core'
  },
  {
    id: 'logic_2',
    roundNumber: 2,
    title: 'Backup OR Beacon',
    ageBand: 'Ages 6–8',
    mode: 'toggle_inputs',
    ruleSummary: 'An OR gate turns ON if EITHER Solar A or Battery B is ON.',
    hint: 'Turn on at least one input switch to power the Beacon Core.',
    inputs: [
      { id: 'A', label: 'Solar Panel', initialValue: false },
      { id: 'B', label: 'Reserve Cell', initialValue: false }
    ],
    gates: [{ id: 'G1', kind: 'OR', locked: true, inputIds: ['A', 'B'], label: 'Power OR' }],
    outputNodeId: 'G1',
    outputLabel: 'Beacon Core'
  },
  {
    id: 'logic_3',
    roundNumber: 3,
    title: 'Night-Light NOT Inverter',
    ageBand: 'Ages 7–9',
    mode: 'toggle_inputs',
    ruleSummary: 'A NOT gate flips a signal: Daylight ON becomes Lamp OFF, and Daylight OFF turns Lamp ON!',
    hint: 'Turn Daylight OFF (0) so the NOT gate flips it to ON (1).',
    inputs: [{ id: 'A', label: 'Daylight Sensor', initialValue: true }],
    gates: [{ id: 'G1', kind: 'NOT', locked: true, inputIds: ['A'], label: 'Inverter NOT' }],
    outputNodeId: 'G1',
    outputLabel: 'Night Beacon'
  },
  {
    id: 'logic_4',
    roundNumber: 4,
    title: 'Airlock Safety Gate',
    ageBand: 'Ages 8–10',
    mode: 'place_gate',
    ruleSummary: 'Choose a gate chip for Socket G1 so the airlock opens ONLY when BOTH Helmet A and Seal B are ON.',
    hint: 'Pick the chip that passes all 3 safety checks (requires both inputs ON).',
    inputs: [
      { id: 'A', label: 'Helmet Lock', initialValue: true },
      { id: 'B', label: 'Door Seal', initialValue: true }
    ],
    gates: [{ id: 'G1', kind: 'OR', locked: false, inputIds: ['A', 'B'], label: 'Socket G1' }],
    outputNodeId: 'G1',
    outputLabel: 'Airlock Core',
    truthTests: [
      { inputs: { A: true, B: false }, expectedOutput: false },
      { inputs: { A: false, B: true }, expectedOutput: false },
      { inputs: { A: true, B: true }, expectedOutput: true }
    ]
  },
  {
    id: 'logic_5',
    roundNumber: 5,
    title: 'Emergency Alarm Gate',
    ageBand: 'Ages 8–11',
    mode: 'place_gate',
    ruleSummary: 'Choose a gate chip for Socket G1 so the shield activates whenever EITHER Meteor A or Heat B detects danger.',
    hint: 'Pick the chip that turns ON if either Sensor A or Sensor B fires.',
    inputs: [
      { id: 'A', label: 'Meteor Radar', initialValue: true },
      { id: 'B', label: 'Heat Sensor', initialValue: false }
    ],
    gates: [{ id: 'G1', kind: 'AND', locked: false, inputIds: ['A', 'B'], label: 'Socket G1' }],
    outputNodeId: 'G1',
    outputLabel: 'Shield Core',
    truthTests: [
      { inputs: { A: false, B: false }, expectedOutput: false },
      { inputs: { A: true, B: false }, expectedOutput: true },
      { inputs: { A: false, B: true }, expectedOutput: true },
      { inputs: { A: true, B: true }, expectedOutput: true }
    ]
  },
  {
    id: 'logic_6',
    roundNumber: 6,
    title: 'Starport Override Chain',
    ageBand: 'Ages 9–11',
    mode: 'place_gate',
    ruleSummary: 'Sensor B passes through a NOT gate before Socket G1. Pick the gate for G1 so Starport launches when Key A=ON and Lock B=OFF.',
    hint: 'With Key A=1 and Lock B=0 (so NOT=1), both wires into G1 are ON! Which gate requires both?',
    inputs: [
      { id: 'A', label: 'Launch Key', initialValue: true },
      { id: 'B', label: 'Safety Lock', initialValue: false }
    ],
    gates: [
      { id: 'G_NOT', kind: 'NOT', locked: true, inputIds: ['B'], label: 'Lock Inverter' },
      { id: 'G1', kind: 'OR', locked: false, inputIds: ['A', 'G_NOT'], label: 'Socket G1' }
    ],
    outputNodeId: 'G1',
    outputLabel: 'Launch Core',
    truthTests: [
      { inputs: { A: true, B: false }, expectedOutput: true },
      { inputs: { A: true, B: true }, expectedOutput: false },
      { inputs: { A: false, B: false }, expectedOutput: false }
    ]
  }
];

export interface LogicEvaluationResult {
  nodeValues: Record<string, boolean>;
  outputActive: boolean;
  truthResults: Array<{
    inputs: Record<string, boolean>;
    expected: boolean;
    actual: boolean;
    passed: boolean;
  }>;
  solved: boolean;
}

function evalGate(kind: LogicGateKind, values: boolean[]): boolean {
  if (kind === 'NOT') {
    return !Boolean(values[0]);
  }
  if (kind === 'AND') {
    return values.length > 0 && values.every(Boolean);
  }
  return values.some(Boolean);
}

export function evaluateLogicCircuit(
  puzzle: LogicGatePuzzle,
  switchValues: Record<string, boolean>,
  gateOverrides: Record<string, LogicGateKind>
): LogicEvaluationResult {
  const evalWithInputs = (inputsMap: Record<string, boolean>): Record<string, boolean> => {
    const vals: Record<string, boolean> = { ...inputsMap };
    // Topological pass (gates are listed in dependency order, iterate safely)
    for (let pass = 0; pass < puzzle.gates.length; pass++) {
      for (const gate of puzzle.gates) {
        const kind = gate.locked ? gate.kind : gateOverrides[gate.id] || gate.kind;
        const inVals = gate.inputIds.map((id) => Boolean(vals[id]));
        vals[gate.id] = evalGate(kind, inVals);
      }
    }
    return vals;
  };

  const nodeValues = evalWithInputs(switchValues);
  const outputActive = Boolean(nodeValues[puzzle.outputNodeId]);

  const truthResults = (puzzle.truthTests || []).map((tc) => {
    const resMap = evalWithInputs(tc.inputs);
    const actual = Boolean(resMap[puzzle.outputNodeId]);
    return {
      inputs: tc.inputs,
      expected: tc.expectedOutput,
      actual,
      passed: actual === tc.expectedOutput
    };
  });

  const solved =
    puzzle.mode === 'toggle_inputs'
      ? outputActive
      : truthResults.length > 0 && truthResults.every((r) => r.passed);

  return {
    nodeValues,
    outputActive,
    truthResults,
    solved
  };
}

export function computeLogicGateReward(boardsSolved: number, totalChecks: number): {
  score: number;
  bolts: number;
} {
  const efficiencyBonus = boardsSolved > 0 && totalChecks <= boardsSolved + 2 ? 25 : 0;
  const score = boardsSolved * 110 + efficiencyBonus;
  const bolts = Math.min(120, Math.max(20, boardsSolved * 20 + (efficiencyBonus > 0 ? 15 : 0)));
  return { score, bolts };
}
