import type { DemoTopic } from '../components/ConceptDemoPopover';
import {
  BONUS_LEVELS,
  computeChassisInfo,
  computeGhostPreviewPlan,
  countBlocks,
  createEmptyChassis,
  findCircuitFixCell,
  findShortestTrackPlan,
  getDailyDateKey,
  LEVELS,
  parseNonNegInt,
  recordDailyCompletion,
  recordDailyLogin,
  shiftDailyDateKey,
  simulateProgram,
  type ChassisGrid,
  type CircuitGrid,
  type CodeBlock,
  type DailyState,
  type LevelDef,
  type SaveProfile,
  type SensorCondition,
  type SimResult,
  type SkillStats,
  type StemPillarId
} from './engine';
import type { MilestoneUnlockKind } from './milestoneParticles';
import { getOceanPresentation } from './oceanPresentation';

/* ============================================================================
 * 1. STORY-DRIVEN 4-CHAPTER CAMPAIGN & AGE BAND SCAFFOLDING (Ages 6–12)
 * ========================================================================== */

export type StoryChapterId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StoryChapterDef {
  id: StoryChapterId;
  title: string;
  ageBand: string;
  subtitle: string;
  briefingLines: [string, string];
  stemFocus: string;
  levelIds: number[];
  accentColor: string;
}

export const STORY_CHAPTERS: StoryChapterDef[] = [
  {
    id: 1,
    title: 'Chapter 1 · Junkyard Mechanics',
    ageBand: 'Ages 6–8',
    subtitle: 'First Gears, Wheels & Safe Leaps',
    briefingLines: [
      'Beep-boop! Help SparkBot roll out of the Workshop Junkyard using wheels and thruster jets.',
      'Chain step-by-step MOVE and JUMP blocks and aim the front laser mirror at the gate!'
    ],
    stemFocus: 'Sequencing, Friction & Parabolic Jump Arcs',
    levelIds: [1, 2, 3],
    accentColor: '#38bdf8'
  },
  {
    id: 2,
    title: 'Chapter 2 · Swamp & Sky Physics',
    ageBand: 'Ages 7–9',
    subtitle: 'Traction, Steep Ramps & Pattern Loops',
    briefingLines: [
      'Sludge bogs and sky ramps block the valley! Swap in Monster Treads or Turbo Boosters.',
      'Compress repeating patterns with LOOP blocks and beam splitters to stay under energy budget!'
    ],
    stemFocus: 'Surface Traction, Inclined Ramps, Loops & Energy Budgets',
    levelIds: [4, 5, 6, 7],
    accentColor: '#34d399'
  },
  {
    id: 3,
    title: 'Chapter 3 · Starport Smart Sensors & Optics',
    ageBand: 'Ages 8–11',
    subtitle: 'IF Conditionals & Multi-Core Laser Grids',
    briefingLines: [
      'Welcome to Starport Sector! Teach SparkBot to scan obstacles ahead with IF sensor branches.',
      'Combine nested loops and optical splitters to power multiple starport cores at once!'
    ],
    stemFocus: 'Nested Loops, Sensor Conditionals & Multi-Beam Optics',
    levelIds: [8, 9, 10, 11, 12],
    accentColor: '#a78bfa'
  },
  {
    id: 4,
    title: 'Chapter 4 · Citadel of Motion',
    ageBand: 'Ages 9–12',
    subtitle: 'IF/ELSE, MY BLOCK Functions, Moving Hazards & Boss Rescue',
    briefingLines: [
      'The Overload Sentinel has locked the Citadel with timed laser gates and sweeping patrol drones!',
      'Master IF / ELSE decisions, reusable MY BLOCK functions, and timing beats to break all 3 Sentinel shields!'
    ],
    stemFocus: 'IF/ELSE Branching, Functions, Deterministic Timing & Boss Rescue',
    levelIds: [13, 14, 15, 16],
    accentColor: '#f59e0b'
  },
  {
    id: 5,
    title: 'Chapter 5 · Energy Explorers',
    ageBand: 'Ages 8–12',
    subtitle: 'Smart Builds & Sustainable Deliveries',
    briefingLines: ['Help SparkBot deliver supplies to remote stations.', 'Choose efficient parts, reuse code and plan safe delivery routes.'],
    stemFocus: 'Resource trade-offs, reusable code and timing',
    levelIds: [17, 18, 19, 20],
    accentColor: '#2dd4bf'
  },
  {
    id:6,title:'Chapter 6 · Ocean Discovery',ageBand:'Ages 8–12',subtitle:'Research Walkways & Ocean Beacon',
    briefingLines:['Explore a floating research walkway.','Collect samples, record observations, time your steps and restore the beacon.'],
    stemFocus:'Sampling, observation, periodic signals and repair',levelIds:[21,22,23,24],accentColor:'#67e8f9'
  }
];

export function getStoryChapterForLevel(levelId: number): StoryChapterDef {
  for (const ch of STORY_CHAPTERS) {
    if (ch.levelIds.includes(levelId)) return ch;
  }
  return STORY_CHAPTERS[0];
}

/* ============================================================================
 * 2. COLLECTIBLE REAL-WORLD STEM FACT CARDS
 * ========================================================================== */

export type AcademyPillarId =
  | StemPillarId
  | 'debugging'
  | 'logic'
  | 'branching'
  | 'functions'
  | 'prediction';

export type FactDiagramKey =
  | 'wheels'
  | 'thrusters'
  | 'treads'
  | 'booster'
  | 'loops'
  | 'mirror'
  | 'splitter'
  | 'sensors'
  | 'debugging'
  | 'logic'
  | 'branching'
  | 'functions'
  | 'timing'
  | 'boss';

export interface StemFactCardDef {
  id: string;
  title: string;
  pillar: AcademyPillarId;
  unlockedByLabel: string;
  triggerLevelIds: number[];
  triggerMiniGame?: 'bug_detective' | 'logic_gate_lab';
  summary: string;
  realWorldExample: string;
  diagramKey: FactDiagramKey;
}

export const STEM_FACT_CARDS: StemFactCardDef[] = [
  {
    id: 'wheels_friction',
    title: 'Rolling Friction & Wheels',
    pillar: 'chassis',
    unlockedByLabel: 'Level 1 · First Spark',
    triggerLevelIds: [1],
    summary:
      'Wheels spin freely so less energy is lost dragging against flat ground. Low rolling friction lets robots travel farther on the same battery.',
    realWorldExample: 'Mars rovers use aluminum wheels with cleats so they roll far on solar power.',
    diagramKey: 'wheels'
  },
  {
    id: 'optics_reflection',
    title: 'Law of Reflection',
    pillar: 'optics',
    unlockedByLabel: 'Level 1 or 3 Optics',
    triggerLevelIds: [1, 3],
    summary:
      'Light travels in straight lines until it strikes a mirror and bounces at a matching angle. Turning a mirror 90 degrees changes the beam path.',
    realWorldExample: 'Submarine periscopes and fiber-optic cables use reflection to steer light around corners.',
    diagramKey: 'mirror'
  },
  {
    id: 'thrusters_arc',
    title: 'Thrust & Parabolic Arcs',
    pillar: 'physics',
    unlockedByLabel: 'Level 2 or 3 · Leap Canyons',
    triggerLevelIds: [2, 3],
    summary:
      'Jump thrusters push down to lift the robot upward while forward speed carries it over a gap. Gravity pulls it back in a smooth curve called a parabola.',
    realWorldExample: 'Rocket liftoff and basketball free throws follow the exact same parabolic arc!',
    diagramKey: 'thrusters'
  },
  {
    id: 'treads_traction',
    title: 'Why Tank Treads Beat Mud',
    pillar: 'mud',
    unlockedByLabel: 'Level 4 · Mud Bog',
    triggerLevelIds: [4, 6],
    summary:
      'Wide treads spread a robot’s weight over a larger surface area so it does not sink in soft mud. Extra tread ribs grip slippery ground.',
    realWorldExample: 'Snowcats and rescue excavators use continuous tracks to cross deep mud and snow.',
    diagramKey: 'treads'
  },
  {
    id: 'optics_splitters',
    title: 'Beam Splitters & Parallel Power',
    pillar: 'optics',
    unlockedByLabel: 'Level 4 or 8 · Optics Lab',
    triggerLevelIds: [4, 8],
    summary:
      'A beam splitter lets half the light pass straight through while bouncing the other half sideways. One emitter can charge multiple targets at once!',
    realWorldExample: 'Hologram projectors and laser interferometers split beams to compare two paths.',
    diagramKey: 'splitter'
  },
  {
    id: 'ramps_incline',
    title: 'Inclined Planes & Boost Force',
    pillar: 'physics',
    unlockedByLabel: 'Level 5 or 7 · Sky Ramps',
    triggerLevelIds: [5, 7],
    summary:
      'Climbing an inclined ramp means lifting weight against gravity. A Turbo Booster adds forward push so the robot crests steep slopes cleanly.',
    realWorldExample: 'Highway on-ramps and skatepark launch ramps trade horizontal distance for height.',
    diagramKey: 'booster'
  },
  {
    id: 'loops_patterns',
    title: 'Compression & Loops',
    pillar: 'loops',
    unlockedByLabel: 'Level 6 or 7 · Loop Code',
    triggerLevelIds: [6, 7],
    summary:
      'Instead of repeating the same instructions over and over, programmers group a pattern inside a LOOP block. Shorter code is easier to read and debug.',
    realWorldExample: 'Traffic lights and animation frames run inside loops every second of the day.',
    diagramKey: 'loops'
  },
  {
    id: 'sensors_if',
    title: 'Smart Sensors: IF / THEN Decisions',
    pillar: 'sensors',
    unlockedByLabel: 'Levels 9–12 · Starport Sector',
    triggerLevelIds: [9, 10, 11, 12],
    summary:
      'An IF block checks what a robot sensor sees right ahead before acting. If the condition is false, the robot safely skips that action.',
    realWorldExample: 'Autonomous delivery bots scan curbs and puddles with ultrasonic sensors.',
    diagramKey: 'sensors'
  },
  {
    id: 'debugging_mindset',
    title: 'Bug Detective Mindset',
    pillar: 'debugging',
    unlockedByLabel: 'Bug Detective or Fixing a Run',
    triggerLevelIds: [],
    triggerMiniGame: 'bug_detective',
    summary:
      'Every engineer runs into bugs! Stepping through code one block at a time shows the exact spot where reality differed from your plan.',
    realWorldExample: 'NASA engineers use step-by-step telemetry simulations to test spacecraft patches before launch.',
    diagramKey: 'debugging'
  },
  {
    id: 'digital_logic_gates',
    title: 'Digital Logic: AND · OR · NOT',
    pillar: 'logic',
    unlockedByLabel: 'Logic Gate Lab',
    triggerLevelIds: [],
    triggerMiniGame: 'logic_gate_lab',
    summary:
      'Computers think with tiny switches called logic gates. AND needs both signals ON, OR needs either signal ON, and NOT flips ON to OFF.',
    realWorldExample: 'Car seatbelt alerts use logic gates: Seat Occupied AND Belt Unbuckled triggers a chime.',
    diagramKey: 'logic'
  },
  {
    id: 'branching_if_else',
    title: 'Two-Path Decisions: IF / ELSE',
    pillar: 'branching',
    unlockedByLabel: 'Level 12 or 13 · Citadel Entry',
    triggerLevelIds: [12, 13],
    summary:
      'IF / ELSE gives a robot a backup plan: when a sensor sees a hazard, run the THEN lane; otherwise immediately run the ELSE lane!',
    realWorldExample: 'Smart thermostats use IF/ELSE: IF room is cold, turn heater ON — ELSE switch to energy-saving standby.',
    diagramKey: 'branching'
  },
  {
    id: 'functions_abstraction',
    title: 'Reusable Functions (MY BLOCK)',
    pillar: 'functions',
    unlockedByLabel: 'Level 14 · Patrol Corridor',
    triggerLevelIds: [14, 15],
    summary:
      'Packaging a useful combo into a reusable function lets you call it anywhere in your program—and fixing it once fixes every call!',
    realWorldExample: 'Video game engines store a "Jump" function once and reuse it across every hero, platform, and level.',
    diagramKey: 'functions'
  },
  {
    id: 'timing_synchronization',
    title: 'Clock Beats & Synchronization',
    pillar: 'prediction',
    unlockedByLabel: 'Level 13 or 15 · Timed Hazards',
    triggerLevelIds: [13, 15],
    summary:
      'Waiting one clock beat lets moving barriers and patrol drones clear your path without wasting energy or colliding.',
    realWorldExample: 'Factory robot arms synchronize on shared clock cycles so two arms never collide while assembling cars.',
    diagramKey: 'timing'
  },
  {
    id: 'boss_systems_engineering',
    title: 'Systems Engineering & Boss Rescues',
    pillar: 'functions',
    unlockedByLabel: 'Level 16 · Overload Sentinel Boss',
    triggerLevelIds: [16],
    summary:
      'Real robotics missions combine hardware budgets, reusable software functions, timing sensors, and optical circuits into one reliable system.',
    realWorldExample: 'Spacecraft docking systems blend thrusters, lidar hazard timing, and automated computer routines working together.',
    diagramKey: 'boss'
  }
];

export function getUnlockedFactCardsForLevel(levelId: number): StemFactCardDef[] {
  return STEM_FACT_CARDS.filter((c) => c.triggerLevelIds.includes(levelId));
}

export function getFactCardById(id: string): StemFactCardDef | null {
  return STEM_FACT_CARDS.find((c) => c.id === id) || null;
}

/* ============================================================================
 * 3. 11-PILLAR STEM MASTERY SYSTEM (Ages 6–12)
 * ========================================================================== */

export interface AcademyPillarMeta {
  id: AcademyPillarId;
  label: string;
  shortLabel: string;
  category: 'Hardware & Physics' | 'Computational Thinking';
  thresholds: [number, number, number];
}

export const ACADEMY_PILLARS: AcademyPillarMeta[] = [
  {
    id: 'chassis',
    label: 'Chassis Engineering',
    shortLabel: 'Chassis',
    category: 'Hardware & Physics',
    thresholds: [1, 4, 8]
  },
  {
    id: 'physics',
    label: 'Jump & Boost Physics',
    shortLabel: 'Physics',
    category: 'Hardware & Physics',
    thresholds: [1, 4, 9]
  },
  {
    id: 'mud',
    label: 'Terrain Traction',
    shortLabel: 'Traction',
    category: 'Hardware & Physics',
    thresholds: [1, 3, 6]
  },
  {
    id: 'loops',
    label: 'Loop Compression',
    shortLabel: 'Loops',
    category: 'Computational Thinking',
    thresholds: [1, 3, 6]
  },
  {
    id: 'sensors',
    label: 'Smart Sensors',
    shortLabel: 'Sensors',
    category: 'Computational Thinking',
    thresholds: [1, 3, 6]
  },
  {
    id: 'optics',
    label: 'Laser Optics',
    shortLabel: 'Optics',
    category: 'Hardware & Physics',
    thresholds: [1, 4, 8]
  },
  {
    id: 'debugging',
    label: 'Bug Detective',
    shortLabel: 'Debugging',
    category: 'Computational Thinking',
    thresholds: [1, 4, 8]
  },
  {
    id: 'logic',
    label: 'Digital Logic',
    shortLabel: 'Logic Gates',
    category: 'Computational Thinking',
    thresholds: [1, 3, 6]
  },
  {
    id: 'branching',
    label: 'IF / ELSE Branching',
    shortLabel: 'IF / ELSE',
    category: 'Computational Thinking',
    thresholds: [1, 2, 4]
  },
  {
    id: 'functions',
    label: 'Functions & Reuse',
    shortLabel: 'MY BLOCK',
    category: 'Computational Thinking',
    thresholds: [1, 2, 4]
  },
  {
    id: 'prediction',
    label: 'Predict & Timing',
    shortLabel: 'Predict',
    category: 'Computational Thinking',
    thresholds: [1, 3, 6]
  }
];

export interface AcademyBadgeProgress {
  id: AcademyPillarId;
  label: string;
  shortLabel: string;
  category: 'Hardware & Physics' | 'Computational Thinking';
  count: number;
  tier: 0 | 1 | 2 | 3;
  stageLabel: 'Not Started' | 'Exploring' | 'Practicing' | 'Mastered';
  thresholds: [number, number, number];
  nextTarget: number;
  pct: number;
}

export function computeAcademySkillBadges(statsInput?: Partial<SkillStats>): AcademyBadgeProgress[] {
  const s = statsInput || {};
  const counts: Record<AcademyPillarId, number> = {
    chassis: parseNonNegInt(s.chassisBuilds),
    physics: parseNonNegInt(s.jumpsCleared),
    mud: parseNonNegInt(s.mudCleared),
    loops: parseNonNegInt(s.loopsCompressed),
    sensors: parseNonNegInt(s.sensorsUsed),
    optics: parseNonNegInt(s.circuitsSolved),
    debugging: parseNonNegInt(s.bugsDebugged),
    logic: parseNonNegInt(s.logicGatesSolved),
    branching: parseNonNegInt(s.elseBranchesUsed),
    functions: parseNonNegInt(s.functionsUsed),
    prediction: parseNonNegInt(s.predictionsCorrect)
  };

  return ACADEMY_PILLARS.map((meta) => {
    const count = counts[meta.id];
    const [t1, t2, t3] = meta.thresholds;
    const tier: 0 | 1 | 2 | 3 = count >= t3 ? 3 : count >= t2 ? 2 : count >= t1 ? 1 : 0;
    const stageLabel: AcademyBadgeProgress['stageLabel'] =
      tier === 3
        ? 'Mastered'
        : tier === 2
          ? 'Practicing'
          : tier === 1 || count > 0
            ? 'Exploring'
            : 'Not Started';
    const nextTarget = tier === 0 ? t1 : tier === 1 ? t2 : t3;
    const pct = Math.min(100, Math.round((count / Math.max(1, nextTarget)) * 100));
    return {
      id: meta.id,
      label: meta.label,
      shortLabel: meta.shortLabel,
      category: meta.category,
      count,
      tier,
      stageLabel,
      thresholds: meta.thresholds,
      nextTarget,
      pct
    };
  });
}

export interface LearningMilestoneDetection {
  newlyUnlockedFacts: StemFactCardDef[];
  newlyUpgradedBadges: AcademyBadgeProgress[];
  hasNewFact: boolean;
  hasNewBadge: boolean;
  shouldCelebrate: boolean;
  kind: MilestoneUnlockKind | null;
}

/**
 * Compares pre-reward and post-reward STEM Fact Cards and 8-pillar Mastery Badges
 * so celebratory sounds and particles trigger strictly for brand-new learning milestones.
 */
export function detectLearningMilestoneUnlocks(params: {
  prevSkillStats?: Partial<SkillStats>;
  nextSkillStats?: Partial<SkillStats>;
  prevUnlockedFactIds?: string[];
  candidateFacts?: StemFactCardDef[];
}): LearningMilestoneDetection {
  const prevFactSet = new Set(params.prevUnlockedFactIds || []);
  const seenCandidateIds = new Set<string>();
  const newlyUnlockedFacts: StemFactCardDef[] = [];

  for (const fact of params.candidateFacts || []) {
    if (!fact || prevFactSet.has(fact.id) || seenCandidateIds.has(fact.id)) continue;
    seenCandidateIds.add(fact.id);
    newlyUnlockedFacts.push(fact);
  }

  const beforeBadges = computeAcademySkillBadges(params.prevSkillStats);
  const afterBadges = computeAcademySkillBadges(params.nextSkillStats);
  const newlyUpgradedBadges = afterBadges.filter((b, i) => b.tier > (beforeBadges[i]?.tier ?? 0));

  const hasNewFact = newlyUnlockedFacts.length > 0;
  const hasNewBadge = newlyUpgradedBadges.length > 0;
  const shouldCelebrate = hasNewFact || hasNewBadge;
  const kind: MilestoneUnlockKind | null =
    hasNewFact && hasNewBadge ? 'both' : hasNewFact ? 'fact' : hasNewBadge ? 'badge' : null;

  return {
    newlyUnlockedFacts,
    newlyUpgradedBadges,
    hasNewFact,
    hasNewBadge,
    shouldCelebrate,
    kind
  };
}

/* ============================================================================
 * 4. 3-TIER ADAPTIVE HINT LADDER & PARSONS STARTER BLUEPRINTS
 * ========================================================================== */

export type AdaptiveHintTier = 1 | 2 | 3;

export interface ParsonsStarterTemplate {
  blocks: CodeBlock[];
  missingCount: number;
  instruction: string;
}

export interface AdaptiveHint {
  tier: AdaptiveHintTier;
  phase: 'build' | 'code' | 'circuit';
  headline: string;
  clue: string;
  demoTopic?: DemoTopic;
  demoCondition?: SensorCondition;
  highlightBlockId?: string | null;
  parsonsTemplate?: ParsonsStarterTemplate | null;
  circuitTarget?: { r: number; c: number } | null;
}

let parsonsUid = 1;
function pBlk(
  type: CodeBlock['type'],
  opts?: { count?: number; condition?: SensorCondition; children?: CodeBlock[]; elseChildren?: CodeBlock[] }
): CodeBlock {
  const id = `starter_${type.toLowerCase()}_${parsonsUid++}`;
  if (type === 'LOOP') {
    return { id, type: 'LOOP', count: opts?.count ?? 2, children: opts?.children ?? [] };
  }
  if (type === 'IF') {
    return {
      id,
      type: 'IF',
      condition: opts?.condition ?? 'GAP',
      children: opts?.children ?? [],
      ...(opts?.elseChildren ? { elseChildren: opts.elseChildren } : {})
    };
  }
  return { id, type };
}

/**
 * Generates a guided Parsons starter blueprint for the current level that handles
 * the setup structure and deliberately leaves 1–2 final blocks for the learner to add.
 */
export function buildParsonsStarterTemplate(level: LevelDef): ParsonsStarterTemplate {
  if (level.id === 1) {
    return {
      blocks: [pBlk('MOVE'), pBlk('MOVE'), pBlk('MOVE'), pBlk('MOVE')],
      missingCount: 1,
      instruction: 'Starter ready! Add 1 more MOVE block to reach the gate.'
    };
  }
  if (level.id === 4) {
    return {
      blocks: [pBlk('LOOP', { count: 3, children: [pBlk('MOVE')] })],
      missingCount: 1,
      instruction: 'Starter LOOP 3x ready! Drop 1 more MOVE inside the green LOOP.'
    };
  }
  if (level.id === 13) {
    return {
      blocks: [
        pBlk('LOOP', {
          count: 4,
          children: [
            pBlk('LOOP', {
              count: 2,
              children: [
                pBlk('IF', {
                  condition: 'HAZARD',
                  children: [pBlk('WAIT')],
                  elseChildren: []
                })
              ]
            })
          ]
        })
      ],
      missingCount: 1,
      instruction: 'Starter IF [HAZARD] / ELSE ready! Drop MOVE inside the amber ELSE lane.'
    };
  }
  if (level.id === 14) {
    return {
      blocks: [pBlk('LOOP', { count: 3, children: [pBlk('CALL_FUNC')] })],
      missingCount: 2,
      instruction: 'LOOP 3x calls MY BLOCK! Open the MY BLOCK tray and add MOVE + JUMP.'
    };
  }
  if (level.id === 15 || level.id === 16) {
    return {
      blocks: [pBlk('CALL_FUNC'), pBlk('JUMP'), pBlk('CALL_FUNC')],
      missingCount: 2,
      instruction: 'Put IF [HAZARD] -> WAIT and MOVE inside MY BLOCK, then add BOOST and calls to reach the gate!'
    };
  }
  if (level.ifUnlocked) {
    const cond: SensorCondition = level.track.some((t) => t.type === 'ramp')
      ? 'RAMP'
      : level.track.some((t) => t.type === 'mud')
        ? 'MUD'
        : 'GAP';
    const action: CodeBlock['type'] = cond === 'RAMP' ? 'BOOST' : 'JUMP';
    return {
      blocks: [
        pBlk('LOOP', {
          count: 3,
          children: [pBlk('MOVE'), pBlk('IF', { condition: cond, children: [] })]
        })
      ],
      missingCount: 1,
      instruction: `Starter LOOP + IF [${cond}] ready! Place ${action} inside the purple IF block.`
    };
  }

  const plan = findShortestTrackPlan(level);
  const seq = (plan?.sequence || ['MOVE', 'MOVE']) as CodeBlock['type'][];
  if (seq.length <= 2) {
    return {
      blocks: [pBlk(seq[0] || 'MOVE')],
      missingCount: 1,
      instruction: `Starter loaded! Add ${seq[1] || 'MOVE'} to complete the path.`
    };
  }
  const keepCount = Math.max(1, seq.length - 1);
  const missingCmd = seq[seq.length - 1];
  return {
    blocks: seq.slice(0, keepCount).map((cmd) => pBlk(cmd)),
    missingCount: 1,
    instruction: `Almost finished! Add ${missingCmd} at the end to reach the gate.`
  };
}

function demoForFailure(
  sim: SimResult | null,
  level: LevelDef
): { topic: DemoTopic; condition?: SensorCondition } {
  if (sim?.missingPart) {
    return { topic: sim.missingPart };
  }
  if (sim?.failCode === 'empty_function') {
    return { topic: 'CALL_FUNC' };
  }
  if (sim?.failCode === 'laser_gate' || sim?.failCode === 'patrol_drone') {
    return level.ifUnlocked ? { topic: 'IF', condition: 'HAZARD' } : { topic: 'WAIT' };
  }
  if (sim?.failCode === 'gap') {
    return level.ifUnlocked ? { topic: 'IF', condition: 'GAP' } : { topic: 'JUMP' };
  }
  if (sim?.failCode === 'mud') {
    return level.ifUnlocked ? { topic: 'IF', condition: 'MUD' } : { topic: 'treads' };
  }
  if (sim?.failCode === 'ramp') {
    return level.ifUnlocked ? { topic: 'IF', condition: 'RAMP' } : { topic: 'BOOST' };
  }
  if (level.loopUnlocked) return { topic: 'LOOP' };
  return { topic: 'MOVE' };
}

export function computeAdaptiveHint(params: {
  level: LevelDef;
  phase: 'build' | 'code' | 'circuit';
  chassis: ChassisGrid;
  program: CodeBlock[];
  functionBody?: CodeBlock[];
  circuitGrid: CircuitGrid;
  tier: AdaptiveHintTier;
  lastSimResult: SimResult | null;
  failingBlockId: string | null;
}): AdaptiveHint {
  const { level, phase, chassis, program, functionBody = [], circuitGrid, tier, lastSimResult, failingBlockId } = params;
  const info = computeChassisInfo(chassis || createEmptyChassis());
  const plan = findShortestTrackPlan(level);

  if (phase === 'build') {
    const missingPart = !info.hasDrive
      ? plan?.profile.treads
        ? 'treads'
        : 'wheels'
      : plan?.profile.treads && !info.hasTreads
        ? 'treads'
        : plan?.profile.thrusters && !info.hasThrusters
          ? 'thrusters'
          : plan?.profile.booster && !info.hasBooster
            ? 'booster'
            : !info.hasFrontLaser
              ? 'laser'
              : null;

    if (!missingPart) {
      return {
        tier,
        phase,
        headline: 'Chassis Ready for Code!',
        clue: 'All recommended parts are attached. Tap the green arrow to program SparkBot.'
      };
    }

    const partLabel =
      missingPart === 'treads'
        ? 'Monster Treads'
        : missingPart === 'wheels'
          ? 'Standard Wheels'
          : missingPart === 'thrusters'
            ? 'Jump Thrusters'
            : missingPart === 'booster'
              ? 'Turbo Booster'
              : 'Laser Emitter';

    if (tier === 1) {
      return {
        tier: 1,
        phase,
        headline: 'Workshop Nudge',
        clue:
          missingPart === 'laser'
            ? 'Check the glowing front slot on the right side — SparkBot needs its beam emitter there.'
            : `Look at the terrain on the track! Pick the part built to handle it (${partLabel}).`
      };
    }
    if (tier === 2) {
      return {
        tier: 2,
        phase,
        headline: `Spotlight · ${partLabel}`,
        clue:
          missingPart === 'laser'
            ? 'Tap Laser Emitter and snap it onto any slot in the right-hand FRONT column.'
            : `Select ${partLabel} from the dock and snap it onto a glowing robot slot.`,
        demoTopic: missingPart
      };
    }
    return {
      tier: 3,
      phase,
      headline: 'Ghost Blueprint Ready',
      clue: `Watch the glowing Ghost Preview show exactly where ${partLabel} snaps onto SparkBot!`,
      demoTopic: missingPart
    };
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    const kind = fix && circuitGrid[fix.r]?.[fix.c]?.type === 'splitter' ? 'Splitter' : 'Mirror';
    const demoTopic: DemoTopic = kind === 'Splitter' ? 'CIRCUIT_SPLITTER' : 'CIRCUIT_MIRROR';

    if (tier === 1) {
      return {
        tier: 1,
        phase,
        headline: 'Follow the Beam',
        clue: 'Trace where the cyan laser beam stops from the left edge and look for a mirror or wall blocking it.'
      };
    }
    if (tier === 2) {
      return {
        tier: 2,
        phase,
        headline: `Circuit Spotlight · ${kind}`,
        clue: fix
          ? `Check the ${kind} at Row ${fix.r + 1}, Col ${fix.c + 1} — rotating it redirects the beam!`
          : 'Rotate mirrors or splitters until every green Power Core lights up.',
        demoTopic,
        circuitTarget: fix ? { r: fix.r, c: fix.c } : null
      };
    }
    return {
      tier: 3,
      phase,
      headline: 'Circuit Ghost Target',
      clue: fix
        ? `Tap the highlighted ${kind} at Row ${fix.r + 1}, Col ${fix.c + 1} (${fix.flips} tap${fix.flips > 1 ? 's' : ''} away).`
        : 'All Power Cores are almost connected — check the final mirror angle!',
      demoTopic,
      circuitTarget: fix ? { r: fix.r, c: fix.c } : null
    };
  }

  // CODE PHASE: mission-specific nudges before generic route suggestions.
  const ocean=getOceanPresentation(level);
  if(ocean && tier<3) return {tier,phase,headline: tier===1?'Mission Hint':'Look Closely',clue:tier===1?ocean.hint:ocean.nextHint,highlightBlockId:failingBlockId};
  const demo = demoForFailure(lastSimResult, level);
  const blkCount = countBlocks(program || [], level.functionUnlocked ? functionBody : undefined);
  const ghostPlan = computeGhostPreviewPlan(level, 'code', chassis, program, circuitGrid, functionBody);

  if (tier === 1) {
    if (lastSimResult?.failCode === 'empty_function') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Empty MY BLOCK',
        clue: 'Open the fuchsia MY BLOCK tray and snap your reusable combo blocks inside before calling it!'
      };
    }
    if (lastSimResult?.failCode === 'laser_gate') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Timed Laser Barrier',
        clue: 'That laser cycles every beat! Add WAIT or IF [HAZARD] → WAIT / ELSE → MOVE to cross when it opens.'
      };
    }
    if (lastSimResult?.failCode === 'patrol_drone') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Patrol Drone',
        clue: 'A Patrol Drone swept that tile! Use Step to see its beat, then time a WAIT, JUMP, or IF [HAZARD] branch.'
      };
    }
    if (lastSimResult?.failCode === 'gap') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Open Gap',
        clue: 'SparkBot rolled into a pit! Try using Step By Step to see which tile needs a JUMP.'
      };
    }
    if (lastSimResult?.failCode === 'mud') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Sticky Mud',
        clue: 'Mud slowed SparkBot down! Equip Monster Treads or leap over the mud.'
      };
    }
    if (lastSimResult?.failCode === 'ramp') {
      return {
        tier: 1,
        phase,
        headline: 'Gentle Retry · Steep Ramp',
        clue: 'Standard wheels cannot climb steep ramps — try Turbo Booster + BOOST!'
      };
    }
    if (lastSimResult?.failCode === 'short' || blkCount === 0) {
      return {
        tier: 1,
        phase,
        headline: 'Count the Tiles Ahead',
        clue: level.loopUnlocked
          ? 'Spot the repeating pattern on the track and wrap it inside a LOOP block!'
          : 'Count each step to the finish gate and chain MOVE / JUMP blocks in order.'
      };
    }
    return {
      tier: 1,
      phase,
      headline: 'Check SparkBot’s Parts',
      clue: lastSimResult?.failReason || 'Double-check your hardware parts and code order.'
    };
  }

  if (tier === 2) {
    return {
      tier: 2,
      phase,
      headline: failingBlockId ? 'Bug Spotlight Found!' : 'Concept Spotlight',
      clue:
        lastSimResult?.failReason ||
        (ghostPlan?.kind === 'code'
          ? `Next helpful block: ${ghostPlan.missingBlockType}${ghostPlan.highlightCondition ? ` [${ghostPlan.highlightCondition}]` : ''}.`
          : 'Open the visual demo to see how this block works on the track.'),
      demoTopic: demo.topic,
      demoCondition: demo.condition,
      highlightBlockId: failingBlockId
    };
  }

  // Tier 3: Parsons Starter Blueprint + Ghost Preview
  const parsons = buildParsonsStarterTemplate(level);
  return {
    tier: 3,
    phase,
    headline: 'Starter Blueprint Ready',
    clue: parsons.instruction,
    demoTopic: demo.topic,
    demoCondition: demo.condition,
    highlightBlockId: failingBlockId,
    parsonsTemplate: parsons
  };
}

/* ============================================================================
 * 5. FORGIVING STREAK SHIELDS (grace days without breaking legacy daily API)
 * ========================================================================== */

export const STREAK_SHIELD_MAX = 2;

function daysBetweenDateKeys(olderKey: string, newerKey: string): number {
  if (!olderKey || !newerKey) return 999;
  const [y1, m1, d1] = olderKey.split('-').map(Number);
  const [y2, m2, d2] = newerKey.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 999;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

export function normalizeStreakShields(raw: unknown): number {
  return Math.min(STREAK_SHIELD_MAX, parseNonNegInt(raw));
}

export function syncStreakWithShieldsOnLogin(
  dailyState: Partial<DailyState> | undefined,
  prevShieldsInput: unknown,
  dateKeyInput?: Date | string
): {
  daily: DailyState;
  streakShields: number;
  shieldUsed: boolean;
  shieldEarned: boolean;
  hitMilestone: number;
} {
  const key = getDailyDateKey(dateKeyInput);
  const shields = normalizeStreakShields(prevShieldsInput);
  const ds = dailyState || {};
  const lastActivity =
    ds.lastLoginDate && ds.lastCompletedDate
      ? ds.lastLoginDate >= ds.lastCompletedDate
        ? ds.lastLoginDate
        : ds.lastCompletedDate
      : ds.lastLoginDate || ds.lastCompletedDate || '';

  const gapDays = lastActivity ? daysBetweenDateKeys(lastActivity, key) : 0;
  const prevStreak = parseNonNegInt(ds.streak);

  // Missed exactly 1 day (e.g., active on Nov 20, logging in Nov 22) -> shield saves streak!
  if (gapDays === 2 && shields > 0 && prevStreak > 0) {
    const rescuedStreak = prevStreak + 1;
    const nextDaily: DailyState = {
      dateKey: typeof ds.dateKey === 'string' ? ds.dateKey : '',
      stars: parseNonNegInt(ds.stars),
      streak: rescuedStreak,
      lastCompletedDate: typeof ds.lastCompletedDate === 'string' ? ds.lastCompletedDate : '',
      lastLoginDate: key
    };
    const nextShields = shields - 1;
    const shieldEarned = rescuedStreak % 3 === 0 && nextShields < STREAK_SHIELD_MAX;
    return {
      daily: nextDaily,
      streakShields: shieldEarned ? nextShields + 1 : nextShields,
      shieldUsed: true,
      shieldEarned,
      hitMilestone: rescuedStreak === 3 || rescuedStreak === 7 ? rescuedStreak : 0
    };
  }

  const loginRes = recordDailyLogin(dailyState, key);
  const shieldEarned =
    loginRes.changed &&
    loginRes.streak > 0 &&
    loginRes.streak % 3 === 0 &&
    shields < STREAK_SHIELD_MAX;

  return {
    daily: loginRes.daily,
    streakShields: shieldEarned ? Math.min(STREAK_SHIELD_MAX, shields + 1) : shields,
    shieldUsed: false,
    shieldEarned,
    hitMilestone: loginRes.hitMilestone
  };
}

export function syncStreakWithShieldsOnCompletion(
  dailyState: Partial<DailyState> | undefined,
  prevShieldsInput: unknown,
  dateKeyInput: Date | string,
  stars: number
): {
  daily: DailyState;
  streakShields: number;
  shieldEarned: boolean;
} {
  const key = getDailyDateKey(dateKeyInput);
  const shields = normalizeStreakShields(prevShieldsInput);
  const prevStreak = parseNonNegInt(dailyState?.streak);
  const updated = recordDailyCompletion(dailyState, key, stars);
  const advanced = updated.streak > prevStreak;
  const shieldEarned =
    advanced && updated.streak > 0 && updated.streak % 3 === 0 && shields < STREAK_SHIELD_MAX;

  return {
    daily: updated,
    streakShields: shieldEarned ? Math.min(STREAK_SHIELD_MAX, shields + 1) : shields,
    shieldEarned
  };
}

export function isStreakProtectedOrActive(
  dailyState: Partial<DailyState> | undefined,
  shieldsInput: unknown,
  todayKey: string
): boolean {
  const shields = normalizeStreakShields(shieldsInput);
  const ds = dailyState || {};
  const lastActivity =
    ds.lastLoginDate && ds.lastCompletedDate
      ? ds.lastLoginDate >= ds.lastCompletedDate
        ? ds.lastLoginDate
        : ds.lastCompletedDate
      : ds.lastLoginDate || ds.lastCompletedDate || '';
  if (!lastActivity) return false;
  const yesterday = shiftDailyDateKey(todayKey, -1);
  if (lastActivity === todayKey || lastActivity === yesterday) return true;
  return shields > 0 && daysBetweenDateKeys(lastActivity, todayKey) === 2;
}

/* ============================================================================
 * 6. LEARNING TELEMETRY & PARENT PROGRESS REPORT BUILDER
 * ========================================================================== */

export interface LevelAttemptRecord {
  attempts: number;
  independentWins: number;
  assistedWins: number;
  bugFixes: number;
  highestHintTier: 0 | 1 | 2 | 3;
  lastFailureKind: string | null;
}

export interface MiniGameTelemetry {
  bugDetectivePlayed: number;
  bugDetectiveWon: number;
  bugDetectivePerfect: number;
  logicLabPlayed: number;
  logicLabWon: number;
  logicGatesSolved: number;
}

export interface LearningTelemetry {
  levelAttempts: Record<string, LevelAttemptRecord>;
  miniGames: MiniGameTelemetry;
  totalBugFixes: number;
  stepDebugRuns: number;
}

export function defaultLearningTelemetry(): LearningTelemetry {
  return {
    levelAttempts: {},
    miniGames: {
      bugDetectivePlayed: 0,
      bugDetectiveWon: 0,
      bugDetectivePerfect: 0,
      logicLabPlayed: 0,
      logicLabWon: 0,
      logicGatesSolved: 0
    },
    totalBugFixes: 0,
    stepDebugRuns: 0
  };
}

export function normalizeLearningTelemetry(raw: unknown): LearningTelemetry {
  const base = defaultLearningTelemetry();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<LearningTelemetry>;
  const attemptsMap: Record<string, LevelAttemptRecord> = {};
  if (r.levelAttempts && typeof r.levelAttempts === 'object') {
    for (const [k, rec] of Object.entries(r.levelAttempts)) {
      if (!rec || typeof rec !== 'object') continue;
      const tierRaw = Number(rec.highestHintTier || 0);
      attemptsMap[k] = {
        attempts: parseNonNegInt(rec.attempts),
        independentWins: parseNonNegInt(rec.independentWins),
        assistedWins: parseNonNegInt(rec.assistedWins),
        bugFixes: parseNonNegInt(rec.bugFixes),
        highestHintTier: tierRaw === 1 || tierRaw === 2 || tierRaw === 3 ? tierRaw : 0,
        lastFailureKind: typeof rec.lastFailureKind === 'string' ? rec.lastFailureKind : null
      };
    }
  }
  const mg: Partial<MiniGameTelemetry> =
    r.miniGames && typeof r.miniGames === 'object'
      ? (r.miniGames as Partial<MiniGameTelemetry>)
      : {};
  return {
    levelAttempts: attemptsMap,
    miniGames: {
      bugDetectivePlayed: parseNonNegInt(mg.bugDetectivePlayed),
      bugDetectiveWon: parseNonNegInt(mg.bugDetectiveWon),
      bugDetectivePerfect: parseNonNegInt(mg.bugDetectivePerfect),
      logicLabPlayed: parseNonNegInt(mg.logicLabPlayed),
      logicLabWon: parseNonNegInt(mg.logicLabWon),
      logicGatesSolved: parseNonNegInt(mg.logicGatesSolved)
    },
    totalBugFixes: parseNonNegInt(r.totalBugFixes),
    stepDebugRuns: parseNonNegInt(r.stepDebugRuns)
  };
}

export function recordLevelAttemptResult(
  prevTelemetry: Partial<LearningTelemetry> | undefined,
  params: {
    levelId: number;
    won: boolean;
    hintTierUsed: 0 | 1 | 2 | 3;
    fixedPriorFail: boolean;
    failureKind?: string | null;
  }
): LearningTelemetry {
  const cur = normalizeLearningTelemetry(prevTelemetry);
  const key = String(params.levelId);
  const existing = cur.levelAttempts[key] || {
    attempts: 0,
    independentWins: 0,
    assistedWins: 0,
    bugFixes: 0,
    highestHintTier: 0 as const,
    lastFailureKind: null
  };

  const nextRec: LevelAttemptRecord = {
    attempts: existing.attempts + 1,
    independentWins: existing.independentWins + (params.won && params.hintTierUsed === 0 ? 1 : 0),
    assistedWins: existing.assistedWins + (params.won && params.hintTierUsed > 0 ? 1 : 0),
    bugFixes: existing.bugFixes + (params.won && params.fixedPriorFail ? 1 : 0),
    highestHintTier: Math.max(existing.highestHintTier, params.hintTierUsed) as 0 | 1 | 2 | 3,
    lastFailureKind: params.won ? null : params.failureKind || existing.lastFailureKind
  };

  return {
    ...cur,
    levelAttempts: {
      ...cur.levelAttempts,
      [key]: nextRec
    },
    totalBugFixes: cur.totalBugFixes + (params.won && params.fixedPriorFail ? 1 : 0)
  };
}

export interface ParentProgressReport {
  profileName: string;
  generatedDateKey: string;
  missionsCleared: number;
  totalMissions: number;
  totalStars: number;
  maxStars: number;
  bonusStarsEarned: number;
  activeStreak: number;
  streakShields: number;
  factsUnlocked: number;
  totalFacts: number;
  pillars: AcademyBadgeProgress[];
  resilience: {
    totalAttempts: number;
    independentWins: number;
    assistedWins: number;
    independencePct: number;
    bugFixes: number;
    stepDebugRuns: number;
    bugDetectiveWon: number;
    logicGatesSolved: number;
    strongestPillarLabel: string;
    recommendedPractice: string;
  };
}

export function buildParentProgressReport(
  save: SaveProfile,
  todayKey = getDailyDateKey()
): ParentProgressReport {
  const pillars = computeAcademySkillBadges(save.skillStats);
  const telemetry = normalizeLearningTelemetry(save.learningTelemetry);

  let mainCleared = 0;
  let totalStars = 0;
  for (const lvl of LEVELS) {
    const st = parseNonNegInt(save.stars?.[lvl.id]);
    if (st > 0) mainCleared++;
    totalStars += st;
  }

  let bonusCleared = 0;
  let bonusStarsEarned = 0;
  for (const bl of BONUS_LEVELS) {
    const rec = save.bonusStars?.[bl.id];
    const st = typeof rec === 'object' ? parseNonNegInt(rec.stars) : parseNonNegInt(rec);
    const hasBonus = typeof rec === 'object' ? Boolean(rec.bonusStar) : false;
    if (st > 0) bonusCleared++;
    totalStars += st;
    if (hasBonus) bonusStarsEarned++;
  }

  const missionsCleared = mainCleared + bonusCleared;
  const totalMissions = LEVELS.length + BONUS_LEVELS.length;

  let totalAttempts = 0;
  let independentWins = 0;
  let assistedWins = 0;
  for (const rec of Object.values(telemetry.levelAttempts)) {
    totalAttempts += rec.attempts;
    independentWins += rec.independentWins;
    assistedWins += rec.assistedWins;
  }
  const totalTrackedWins = independentWins + assistedWins;
  const independencePct =
    totalTrackedWins > 0 ? Math.round((independentWins / totalTrackedWins) * 100) : 100;

  const sortedByProgress = [...pillars].sort((a, b) => b.tier - a.tier || b.count - a.count);
  const strongestPillarLabel =
    sortedByProgress[0] && sortedByProgress[0].count > 0
      ? sortedByProgress[0].label
      : 'Getting Started in Chapter 1';

  const lowestPillar = [...pillars].sort((a, b) => a.tier - b.tier || a.count - b.count)[0];
  let recommendedPractice = 'Play Chapter 1 missions together and try Step-By-Step debugging.';
  if (missionsCleared >= 3 && (save.skillStats?.sensorsUsed || 0) === 0) {
    recommendedPractice = 'Ready to practice IF [SENSOR] branches in Starport Sector (Levels 9–12).';
  } else if (lowestPillar?.id === 'debugging') {
    recommendedPractice = 'Try Bug Detective in the Game Room to sharpen step-by-step troubleshooting.';
  } else if (lowestPillar?.id === 'logic') {
    recommendedPractice = 'Explore Logic Gate Lab in the Game Room to learn AND, OR, and NOT gates.';
  } else if (lowestPillar) {
    recommendedPractice = `Next focus area: ${lowestPillar.label} (${lowestPillar.count}/${lowestPillar.nextTarget} toward next medal).`;
  }

  const unlockedFacts = Array.isArray(save.unlockedFactIds) ? save.unlockedFactIds.length : 0;

  return {
    profileName: save.profileName || 'Cadet Engineer',
    generatedDateKey: todayKey,
    missionsCleared,
    totalMissions,
    totalStars,
    maxStars: totalMissions * 3,
    bonusStarsEarned,
    activeStreak: parseNonNegInt(save.daily?.streak),
    streakShields: normalizeStreakShields(save.streakShields),
    factsUnlocked: unlockedFacts,
    totalFacts: STEM_FACT_CARDS.length,
    pillars,
    resilience: {
      totalAttempts,
      independentWins,
      assistedWins,
      independencePct,
      bugFixes: Math.max(telemetry.totalBugFixes, parseNonNegInt(save.skillStats?.bugsDebugged)),
      stepDebugRuns: telemetry.stepDebugRuns,
      bugDetectiveWon: telemetry.miniGames.bugDetectiveWon,
      logicGatesSolved: Math.max(
        telemetry.miniGames.logicGatesSolved,
        parseNonNegInt(save.skillStats?.logicGatesSolved)
      ),
      strongestPillarLabel,
      recommendedPractice
    }
  };
}

export function serializeParentProgressJson(report: ParentProgressReport): string {
  return JSON.stringify(report, null, 2);
}
