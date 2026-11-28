import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONUS_LEVELS,
  cloneCircuitGrid,
  countBlocks,
  createEmptyChassis,
  defaultSaveProfile,
  getLevelById,
  LEVELS
} from './engine';
import {
  ACADEMY_PILLARS,
  buildParsonsStarterTemplate,
  buildParentProgressReport,
  computeAcademySkillBadges,
  computeAdaptiveHint,
  detectLearningMilestoneUnlocks,
  getFactCardById,
  getStoryChapterForLevel,
  getUnlockedFactCardsForLevel,
  recordLevelAttemptResult,
  serializeParentProgressJson,
  STEM_FACT_CARDS,
  STORY_CHAPTERS,
  STREAK_SHIELD_MAX,
  syncStreakWithShieldsOnCompletion,
  syncStreakWithShieldsOnLogin
} from './educationStrategy';
import {
  createMilestoneParticleBurst,
  MILESTONE_SOUND_PROFILES
} from './milestoneParticles';
import {
  BUG_DETECTIVE_PUZZLES,
  cloneProgramBlocks,
  computeBugDetectiveReward,
  computeLogicGateReward,
  cycleBugActionBlockType,
  cycleBugIfCondition,
  cycleBugLoopCount,
  evaluateBugDetectiveAttempt,
  evaluateLogicCircuit,
  LOGIC_GATE_PUZZLES,
  swapTopLevelBugBlocks,
  type LogicGateKind
} from './educationalMiniGames';

test('5-chapter story campaign covers Levels 1–20 with progressive Ages 6–12 bands', () => {
  assert.equal(STORY_CHAPTERS.length, 5);
  assert.equal(STORY_CHAPTERS[0].ageBand, 'Ages 6–8');
  assert.equal(STORY_CHAPTERS[1].ageBand, 'Ages 7–9');
  assert.equal(STORY_CHAPTERS[2].ageBand, 'Ages 8–11');
  assert.equal(STORY_CHAPTERS[3].ageBand, 'Ages 9–12');

  const covered = STORY_CHAPTERS.flatMap((c) => c.levelIds);
  assert.deepEqual(covered, [...LEVELS, ...BONUS_LEVELS].map((l) => l.id));
  assert.equal(getStoryChapterForLevel(1).id, 1);
  assert.equal(getStoryChapterForLevel(5).id, 2);
  assert.equal(getStoryChapterForLevel(11).id, 3);
  assert.equal(getStoryChapterForLevel(13).id, 4);
  assert.equal(getStoryChapterForLevel(16).id, 4);
  assert.equal(getStoryChapterForLevel(20).id, 5);
});

test('STEM Fact Cards registry has 14 cards and lookup helpers work', () => {
  assert.equal(STEM_FACT_CARDS.length, 14);
  const lvl1Facts = getUnlockedFactCardsForLevel(1);
  assert.ok(lvl1Facts.some((f) => f.id === 'wheels_friction'));
  assert.ok(lvl1Facts.some((f) => f.id === 'optics_reflection'));
  assert.equal(getFactCardById('debugging_mindset')?.triggerMiniGame, 'bug_detective');
  assert.equal(getFactCardById('digital_logic_gates')?.triggerMiniGame, 'logic_gate_lab');
  assert.ok(getUnlockedFactCardsForLevel(13).some((f) => f.id === 'branching_if_else'));
  assert.ok(getUnlockedFactCardsForLevel(14).some((f) => f.id === 'functions_abstraction'));
  assert.ok(getUnlockedFactCardsForLevel(16).some((f) => f.id === 'boss_systems_engineering'));
});

test('11-Pillar Academy Mastery computes Exploring, Practicing, Mastered across all 11 pillars', () => {
  assert.equal(ACADEMY_PILLARS.length, 11);
  const empty = computeAcademySkillBadges({});
  assert.equal(empty.length, 11);
  assert.ok(empty.every((b) => b.tier === 0 && b.stageLabel === 'Not Started'));

  const progressed = computeAcademySkillBadges({
    chassisBuilds: 8,
    jumpsCleared: 4,
    mudCleared: 1,
    loopsCompressed: 3,
    sensorsUsed: 6,
    circuitsSolved: 8,
    bugsDebugged: 4,
    logicGatesSolved: 3,
    elseBranchesUsed: 3,
    functionsUsed: 1,
    predictionsCorrect: 6
  });
  const byId = Object.fromEntries(progressed.map((b) => [b.id, b]));
  assert.equal(byId.chassis.tier, 3);
  assert.equal(byId.chassis.stageLabel, 'Mastered');
  assert.equal(byId.physics.tier, 2);
  assert.equal(byId.physics.stageLabel, 'Practicing');
  assert.equal(byId.mud.tier, 1);
  assert.equal(byId.mud.stageLabel, 'Exploring');
  assert.equal(byId.debugging.tier, 2);
  assert.equal(byId.logic.tier, 2);
  assert.equal(byId.branching.tier, 2);
  assert.equal(byId.functions.tier, 1);
  assert.equal(byId.prediction.tier, 3);
});

test('Bug Detective: all 6 starter programs fail and expected kid repairs pass simulation', () => {
  assert.equal(BUG_DETECTIVE_PUZZLES.length, 6);

  for (const puzzle of BUG_DETECTIVE_PUZZLES) {
    const starterFail = evaluateBugDetectiveAttempt(puzzle, puzzle.starterProgram);
    assert.notEqual(
      starterFail.status,
      'win',
      `Starter program for ${puzzle.id} should initially fail`
    );
  }

  // bug_1: add 1 MOVE
  const p1 = BUG_DETECTIVE_PUZZLES[0];
  const fix1 = [...cloneProgramBlocks(p1.starterProgram), { id: 'fix_m4', type: 'MOVE' as const }];
  assert.equal(evaluateBugDetectiveAttempt(p1, fix1).status, 'win');

  // bug_2: swap block 0 and 1
  const p2 = BUG_DETECTIVE_PUZZLES[1];
  const fix2 = swapTopLevelBugBlocks(cloneProgramBlocks(p2.starterProgram), 0, 1);
  assert.equal(evaluateBugDetectiveAttempt(p2, fix2).status, 'win');

  // bug_3: cycle LOOP count 2 -> 3
  const p3 = BUG_DETECTIVE_PUZZLES[2];
  const fix3 = cycleBugLoopCount(cloneProgramBlocks(p3.starterProgram), 'bd3_loop');
  assert.equal(evaluateBugDetectiveAttempt(p3, fix3).status, 'win');

  // bug_4: cycle IF condition MUD -> RAMP -> GAP
  const p4 = BUG_DETECTIVE_PUZZLES[3];
  let fix4 = cycleBugIfCondition(cloneProgramBlocks(p4.starterProgram), 'bd4_if');
  fix4 = cycleBugIfCondition(fix4, 'bd4_if');
  assert.equal(evaluateBugDetectiveAttempt(p4, fix4).status, 'win');

  // bug_5: cycle JUMP -> BOOST on bd5_2
  const p5 = BUG_DETECTIVE_PUZZLES[4];
  const fix5 = cycleBugActionBlockType(cloneProgramBlocks(p5.starterProgram), 'bd5_2');
  assert.equal(evaluateBugDetectiveAttempt(p5, fix5).status, 'win');

  // bug_6: reorder [BOOST, MOVE, JUMP] -> [JUMP, BOOST, MOVE]
  const p6 = BUG_DETECTIVE_PUZZLES[5];
  let fix6 = swapTopLevelBugBlocks(cloneProgramBlocks(p6.starterProgram), 1, 2); // [BOOST, JUMP, MOVE]
  fix6 = swapTopLevelBugBlocks(fix6, 0, 1); // [JUMP, BOOST, MOVE]
  assert.equal(evaluateBugDetectiveAttempt(p6, fix6).status, 'win');

  const reward = computeBugDetectiveReward(3, 2);
  assert.equal(reward.score, 370);
  assert.ok(reward.bolts >= 60);
});

test('Logic Gate Lab: all 6 boards start unsolved and resolve cleanly with target switches/gates', () => {
  assert.equal(LOGIC_GATE_PUZZLES.length, 6);

  for (const puzzle of LOGIC_GATE_PUZZLES) {
    const initSwitches: Record<string, boolean> = {};
    for (const inp of puzzle.inputs) initSwitches[inp.id] = inp.initialValue;
    const initEval = evaluateLogicCircuit(puzzle, initSwitches, {});
    assert.equal(
      initEval.solved,
      false,
      `Logic puzzle ${puzzle.id} should start unsolved`
    );
  }

  const solutions: Array<{ switches: Record<string, boolean>; gates: Record<string, LogicGateKind> }> = [
    { switches: { A: true, B: true }, gates: {} }, // logic_1 AND
    { switches: { A: true, B: false }, gates: {} }, // logic_2 OR
    { switches: { A: false }, gates: {} }, // logic_3 NOT
    { switches: { A: true, B: true }, gates: { G1: 'AND' } }, // logic_4 place AND
    { switches: { A: true, B: false }, gates: { G1: 'OR' } }, // logic_5 place OR
    { switches: { A: true, B: false }, gates: { G1: 'AND' } } // logic_6 place AND after NOT
  ];

  LOGIC_GATE_PUZZLES.forEach((puzzle, idx) => {
    const sol = solutions[idx];
    const res = evaluateLogicCircuit(puzzle, sol.switches, sol.gates);
    assert.equal(res.solved, true, `Expected solution to solve ${puzzle.id}`);
  });

  const reward = computeLogicGateReward(4, 4);
  assert.equal(reward.score, 465);
  assert.ok(reward.bolts >= 80);
});

test('3-tier adaptive hint ladder and Parsons starter templates scaffold build, code, and circuit', () => {
  const lvl4 = getLevelById(4)!;
  const emptyChassis = createEmptyChassis();
  const circuit = cloneCircuitGrid(lvl4.circuit);

  const buildT1 = computeAdaptiveHint({
    level: lvl4,
    phase: 'build',
    chassis: emptyChassis,
    program: [],
    circuitGrid: circuit,
    tier: 1,
    lastSimResult: null,
    failingBlockId: null
  });
  assert.equal(buildT1.tier, 1);
  assert.equal(buildT1.demoTopic, undefined);

  const buildT2 = computeAdaptiveHint({
    level: lvl4,
    phase: 'build',
    chassis: emptyChassis,
    program: [],
    circuitGrid: circuit,
    tier: 2,
    lastSimResult: null,
    failingBlockId: null
  });
  assert.equal(buildT2.tier, 2);
  assert.ok(buildT2.demoTopic);

  const codeT3 = computeAdaptiveHint({
    level: lvl4,
    phase: 'code',
    chassis: emptyChassis,
    program: [],
    circuitGrid: circuit,
    tier: 3,
    lastSimResult: null,
    failingBlockId: 'b_fail'
  });
  assert.equal(codeT3.tier, 3);
  assert.ok(codeT3.parsonsTemplate);
  assert.equal(codeT3.parsonsTemplate!.missingCount, 1);
  assert.ok(countBlocks(codeT3.parsonsTemplate!.blocks) >= 2);

  const parsonsLvl1 = buildParsonsStarterTemplate(getLevelById(1)!);
  assert.equal(parsonsLvl1.blocks.length, 4);

  const circuitT2 = computeAdaptiveHint({
    level: lvl4,
    phase: 'circuit',
    chassis: emptyChassis,
    program: [],
    circuitGrid: circuit,
    tier: 2,
    lastSimResult: null,
    failingBlockId: null
  });
  assert.ok(circuitT2.circuitTarget);
});

test('Forgiving Streak Shields earn on day-3 milestone, rescue 1-day gap, and respect cap', () => {
  const d1 = syncStreakWithShieldsOnLogin(undefined, 0, '2026-11-10');
  assert.equal(d1.daily.streak, 1);
  assert.equal(d1.streakShields, 0);

  const d2 = syncStreakWithShieldsOnLogin(d1.daily, d1.streakShields, '2026-11-11');
  assert.equal(d2.daily.streak, 2);
  assert.equal(d2.streakShields, 0);

  const d3 = syncStreakWithShieldsOnLogin(d2.daily, d2.streakShields, '2026-11-12');
  assert.equal(d3.daily.streak, 3);
  assert.equal(d3.shieldEarned, true);
  assert.equal(d3.streakShields, 1);

  // Skip 2026-11-13 and log in 2026-11-14 (gapDays === 2): Shield saves streak!
  const rescued = syncStreakWithShieldsOnLogin(d3.daily, d3.streakShields, '2026-11-14');
  assert.equal(rescued.shieldUsed, true);
  assert.equal(rescued.daily.streak, 4);
  assert.equal(rescued.streakShields, 0);

  // Skip 2 full days (2026-11-15, 2026-11-16) and log in 2026-11-17 with 1 shield -> resets to 1
  const broken = syncStreakWithShieldsOnLogin(rescued.daily, 1, '2026-11-17');
  assert.equal(broken.shieldUsed, false);
  assert.equal(broken.daily.streak, 1);

  // Daily completion hitting day 6 earns shield up to cap STREAK_SHIELD_MAX
  const nearMilestone = {
    dateKey: '2026-11-17',
    stars: 0,
    streak: 5,
    lastCompletedDate: '2026-11-17',
    lastLoginDate: '2026-11-17'
  };
  const comp = syncStreakWithShieldsOnCompletion(nearMilestone, 1, '2026-11-18', 3);
  assert.equal(comp.daily.streak, 6);
  assert.equal(comp.shieldEarned, true);
  assert.equal(comp.streakShields, STREAK_SHIELD_MAX);
});

test('Learning telemetry & Parent Progress Report build and serialize offline JSON cleanly', () => {
  const save = defaultSaveProfile();
  save.profileName = 'Nova';
  save.stars = { 1: 3, 2: 2 };
  save.unlockedFactIds = ['wheels_friction', 'optics_reflection'];
  save.streakShields = 1;
  save.daily.streak = 4;

  let tel = recordLevelAttemptResult(save.learningTelemetry, {
    levelId: 1,
    won: true,
    hintTierUsed: 0,
    fixedPriorFail: false
  });
  tel = recordLevelAttemptResult(tel, {
    levelId: 2,
    won: false,
    hintTierUsed: 1,
    fixedPriorFail: false,
    failureKind: 'gap'
  });
  tel = recordLevelAttemptResult(tel, {
    levelId: 2,
    won: true,
    hintTierUsed: 2,
    fixedPriorFail: true
  });
  save.learningTelemetry = tel;
  save.skillStats = {
    chassisBuilds: 0,
    jumpsCleared: 0,
    mudCleared: 0,
    loopsCompressed: 0,
    sensorsUsed: 0,
    circuitsSolved: 0,
    ...(save.skillStats || {}),
    bugsDebugged: 1
  };

  const report = buildParentProgressReport(save, '2026-11-22');
  assert.equal(report.profileName, 'Nova');
  assert.equal(report.missionsCleared, 2);
  assert.equal(report.totalStars, 5);
  assert.equal(report.factsUnlocked, 2);
  assert.equal(report.resilience.independentWins, 1);
  assert.equal(report.resilience.assistedWins, 1);
  assert.equal(report.resilience.independencePct, 50);
  assert.equal(report.resilience.bugFixes, 1);

  const jsonStr = serializeParentProgressJson(report);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.profileName, 'Nova');
  assert.equal(parsed.pillars.length, 11);
});

test('Milestone unlock detector celebrates strictly when a new STEM Fact Card or Badge tier unlocks', () => {
  const factWheels = getFactCardById('wheels_friction')!;
  const factLogic = getFactCardById('digital_logic_gates')!;

  // 1. Both new fact + badge tier 0->1 -> kind = 'both'
  const bothUnlock = detectLearningMilestoneUnlocks({
    prevSkillStats: { chassisBuilds: 0, circuitsSolved: 0 },
    nextSkillStats: { chassisBuilds: 1, circuitsSolved: 1 },
    prevUnlockedFactIds: [],
    candidateFacts: [factWheels, factWheels] // also verifies deduping
  });
  assert.equal(bothUnlock.shouldCelebrate, true);
  assert.equal(bothUnlock.kind, 'both');
  assert.equal(bothUnlock.newlyUnlockedFacts.length, 1);
  assert.deepEqual(
    bothUnlock.newlyUpgradedBadges.map((b) => b.id),
    ['chassis', 'optics']
  );

  // 2. Replaying level with existing fact and same tier (1 -> 2, below tier 2 threshold 4) -> NO celebration
  const replayNoUnlock = detectLearningMilestoneUnlocks({
    prevSkillStats: { chassisBuilds: 1, circuitsSolved: 1 },
    nextSkillStats: { chassisBuilds: 2, circuitsSolved: 2 },
    prevUnlockedFactIds: ['wheels_friction'],
    candidateFacts: [factWheels]
  });
  assert.equal(replayNoUnlock.shouldCelebrate, false);
  assert.equal(replayNoUnlock.kind, null);
  assert.equal(replayNoUnlock.newlyUnlockedFacts.length, 0);
  assert.equal(replayNoUnlock.newlyUpgradedBadges.length, 0);

  // 3. New fact only (no badge tier crossed) -> kind = 'fact'
  const factOnly = detectLearningMilestoneUnlocks({
    prevSkillStats: { logicGatesSolved: 1 },
    nextSkillStats: { logicGatesSolved: 2 },
    prevUnlockedFactIds: ['wheels_friction'],
    candidateFacts: [factLogic]
  });
  assert.equal(factOnly.shouldCelebrate, true);
  assert.equal(factOnly.kind, 'fact');
  assert.equal(factOnly.newlyUnlockedFacts[0].id, 'digital_logic_gates');
  assert.equal(factOnly.newlyUpgradedBadges.length, 0);

  // 4. New badge tier only (e.g. logicGatesSolved 2 -> 3 crosses threshold 3, tier 1->2) -> kind = 'badge'
  const badgeOnly = detectLearningMilestoneUnlocks({
    prevSkillStats: { logicGatesSolved: 2 },
    nextSkillStats: { logicGatesSolved: 3 },
    prevUnlockedFactIds: ['digital_logic_gates'],
    candidateFacts: [factLogic]
  });
  assert.equal(badgeOnly.shouldCelebrate, true);
  assert.equal(badgeOnly.kind, 'badge');
  assert.equal(badgeOnly.newlyUnlockedFacts.length, 0);
  assert.equal(badgeOnly.newlyUpgradedBadges.length, 1);
  assert.equal(badgeOnly.newlyUpgradedBadges[0].id, 'logic');
  assert.equal(badgeOnly.newlyUpgradedBadges[0].tier, 2);
});

test('Milestone particle burst generator and sound profiles scale cleanly for standard vs lowGraphics', () => {
  const stdBurst = createMilestoneParticleBurst('both', 7, false);
  const lowBurst = createMilestoneParticleBurst('fact', 7, true);
  assert.equal(stdBurst.particles.length, 26);
  assert.equal(stdBurst.halos.length, 2);
  assert.equal(lowBurst.particles.length, 10);
  assert.equal(lowBurst.halos.length, 1);

  assert.ok(MILESTONE_SOUND_PROFILES.fact.notesHz.length >= 5);
  assert.ok(MILESTONE_SOUND_PROFILES.badge.notesHz.length >= 5);
  assert.ok(MILESTONE_SOUND_PROFILES.both.notesHz.length >= 5);
  assert.notDeepEqual(
    MILESTONE_SOUND_PROFILES.fact.notesHz,
    MILESTONE_SOUND_PROFILES.badge.notesHz
  );
});
