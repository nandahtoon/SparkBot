import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateStars,
  cloneCircuitGrid,
  computeChassisInfo,
  countBlocks,
  createEmptyChassis,
  evaluateAllHazardsAtTick,
  findCircuitFixCell,
  getLevelById,
  levelHasDynamicHazards,
  recordSkillMastery,
  simulateProgram,
  traceCircuit,
  type ChassisGrid,
  type CodeBlock
} from './engine';
import { buildLivePathPreview, isPreviewItemHighlighted } from './pathPreview';
import { buildPredictBeforeRunQuestion, shouldPromptPredictQuiz } from './predictQuiz';
import {
  clampCodeCameraState,
  computeCodeCameraPreset,
  computeTileFocusCameraState,
  evaluateCodeCameraVectors,
  getNextCodeCameraPreset
} from '../three/codeCamera';
import { getTrackTileCenterZ } from './trackSurface';

function makeChassis(parts: {
  drive?: 'wheels' | 'treads';
  thrusters?: boolean;
  booster?: boolean;
  laser?: boolean;
}): ChassisGrid {
  const g = createEmptyChassis();
  if (parts.drive) g[2][1] = parts.drive;
  if (parts.thrusters) g[1][0] = 'thrusters';
  if (parts.booster) g[0][1] = 'booster';
  if (parts.laser !== false) g[1][2] = 'laser';
  return g;
}

test('Chapter 4 Level 13 (Rhythm Crossing): Timed Laser Barriers, IF/ELSE & WAIT earn 3 stars', () => {
  const lvl = getLevelById(13)!;
  assert.ok(lvl);
  assert.equal(lvl.elseUnlocked, true);
  assert.equal(lvl.waitUnlocked, true);
  assert.equal(levelHasDynamicHazards(lvl), true);

  const chassis = makeChassis({ drive: 'wheels', laser: true });
  const info = computeChassisInfo(chassis);
  assert.ok(info.cost <= lvl.parBudget, `Cost ${info.cost} should be <= parBudget ${lvl.parBudget}`);

  // Naive MOVE x6 should collide with Timed Laser Barrier at tile 2
  const naiveProgram: CodeBlock[] = Array.from({ length: 6 }, (_, i) => ({
    id: `m_${i}`,
    type: 'MOVE'
  }));
  const failSim = simulateProgram(lvl, chassis, naiveProgram);
  assert.equal(failSim.status, 'fail');
  assert.equal(failSim.failCode, 'laser_gate');

  // Smart IF [HAZARD] { WAIT } ELSE { MOVE } inside LOOP solves cleanly within block par!
  const smartProgram: CodeBlock[] = [
    {
      id: 'loop_outer',
      type: 'LOOP',
      count: 4,
      children: [
        {
          id: 'loop_inner',
          type: 'LOOP',
          count: 3,
          children: [
            {
              id: 'if_haz',
              type: 'IF',
              condition: 'HAZARD',
              children: [{ id: 'w1', type: 'WAIT' }],
              elseChildren: [{ id: 'mv1', type: 'MOVE' }]
            }
          ]
        }
      ]
    }
  ];

  const sim = simulateProgram(lvl, chassis, smartProgram);
  assert.equal(sim.status, 'win', `Expected Level 13 win, got ${sim.failCode}: ${sim.failReason}`);
  assert.equal(sim.usedElseBranch, true);
  assert.equal(sim.usedWait, true);
  assert.equal(sim.collectedCrystals, sim.totalCrystals);

  const blkCount = countBlocks(smartProgram);
  assert.ok(blkCount <= lvl.parBlocks, `Blocks ${blkCount} should be <= parBlocks ${lvl.parBlocks}`);
  const stars = calculateStars(lvl, info.cost, blkCount, sim.collectedCrystals, sim.totalCrystals);
  assert.equal(stars.stars, 3);
});

test('Chapter 4 Level 14 (Patrol Corridor): MY BLOCK (CALL_FUNC) & Patrol Drones earn 3 stars', () => {
  const lvl = getLevelById(14)!;
  assert.ok(lvl);
  assert.equal(lvl.functionUnlocked, true);
  assert.equal(levelHasDynamicHazards(lvl), true);

  const chassis = makeChassis({ drive: 'wheels', thrusters: true, laser: true });
  const info = computeChassisInfo(chassis);
  assert.ok(info.cost <= lvl.parBudget);

  // Calling empty MY BLOCK fails cleanly with empty_function
  const emptyCallRes = simulateProgram(lvl, chassis, [{ id: 'c0', type: 'CALL_FUNC' }], []);
  assert.equal(emptyCallRes.status, 'fail');
  assert.equal(emptyCallRes.failCode, 'empty_function');

  // Define MY BLOCK = [MOVE, JUMP] and call it 3x inside a LOOP (total 4 blocks <= 5 par!)
  const funcBody: CodeBlock[] = [
    { id: 'f_mv', type: 'MOVE' },
    { id: 'f_jp', type: 'JUMP' }
  ];
  const mainProgram: CodeBlock[] = [
    {
      id: 'lp_fn',
      type: 'LOOP',
      count: 3,
      children: [{ id: 'call_1', type: 'CALL_FUNC' }]
    }
  ];

  const sim = simulateProgram(lvl, chassis, mainProgram, funcBody);
  assert.equal(sim.status, 'win', `Expected Level 14 win, got ${sim.failCode}: ${sim.failReason}`);
  assert.equal(sim.usedFunctionCall, true);
  assert.equal(sim.collectedCrystals, sim.totalCrystals);

  const blkCount = countBlocks(mainProgram, funcBody);
  assert.equal(blkCount, 4);
  assert.ok(blkCount <= lvl.parBlocks);
  const stars = calculateStars(lvl, info.cost, blkCount, sim.collectedCrystals, sim.totalCrystals);
  assert.equal(stars.stars, 3);

  // Live path preview links MY BLOCK segments back to callerBlockId
  const preview = buildLivePathPreview(lvl, chassis, mainProgram, funcBody);
  assert.equal(preview.endpoint.status, 'win');
  assert.ok(preview.segments.some((s) => s.callerBlockId === 'call_1'));
  assert.ok(preview.segments.some((s) => isPreviewItemHighlighted(s, 'call_1')));
});

test('Chapter 4 Level 15 (Dual-Hazard Gauntlet): combined lasers, drone, ramp & MY BLOCK win within par', () => {
  const lvl = getLevelById(15)!;
  assert.ok(lvl);
  const chassis = makeChassis({ drive: 'wheels', thrusters: true, booster: true, laser: true });
  const info = computeChassisInfo(chassis);
  assert.ok(info.cost <= lvl.parBudget);

  const funcBody: CodeBlock[] = [
    {
      id: 'f15_if',
      type: 'IF',
      condition: 'HAZARD',
      children: [{ id: 'f15_w', type: 'WAIT' }]
    },
    { id: 'f15_m', type: 'MOVE' }
  ];
  const mainProgram: CodeBlock[] = [
    { id: 'l15_a', type: 'LOOP', count: 2, children: [{ id: 'c15_a', type: 'CALL_FUNC' }] },
    { id: 'b15', type: 'BOOST' },
    { id: 'l15_b', type: 'LOOP', count: 2, children: [{ id: 'c15_b', type: 'CALL_FUNC' }] },
    { id: 'j15', type: 'JUMP' },
    { id: 'c15_c', type: 'CALL_FUNC' }
  ];

  const sim = simulateProgram(lvl, chassis, mainProgram, funcBody);
  assert.equal(sim.status, 'win', `Expected Level 15 win, got ${sim.failCode}: ${sim.failReason}`);
  assert.equal(sim.collectedCrystals, sim.totalCrystals);
  const blkCount = countBlocks(mainProgram, funcBody);
  assert.ok(blkCount <= lvl.parBlocks, `Blocks ${blkCount} should be <= ${lvl.parBlocks}`);
});

test('Chapter 4 Level 16 (Overload Sentinel Boss): full multi-hazard Boss Mission wins with 3 stars & mastery stats', () => {
  const lvl = getLevelById(16)!;
  assert.ok(lvl);
  assert.equal(lvl.isBoss, true);
  assert.equal(lvl.bossMeta?.coreCount, 3);

  const chassis = makeChassis({ drive: 'wheels', thrusters: true, booster: true, laser: true });
  const info = computeChassisInfo(chassis);
  assert.ok(info.cost <= lvl.parBudget);

  const funcBody: CodeBlock[] = [
    {
      id: 'f16_if',
      type: 'IF',
      condition: 'HAZARD',
      children: [{ id: 'f16_w', type: 'WAIT' }]
    },
    { id: 'f16_m', type: 'MOVE' }
  ];
  const mainProgram: CodeBlock[] = [
    { id: 'c16_1', type: 'CALL_FUNC' },
    { id: 'j16', type: 'JUMP' },
    { id: 'l16_1', type: 'LOOP', count: 2, children: [{ id: 'c16_2', type: 'CALL_FUNC' }] },
    { id: 'b16', type: 'BOOST' },
    { id: 'l16_2', type: 'LOOP', count: 3, children: [{ id: 'c16_3', type: 'CALL_FUNC' }] }
  ];

  const sim = simulateProgram(lvl, chassis, mainProgram, funcBody);
  assert.equal(sim.status, 'win', `Expected Level 16 Boss win, got ${sim.failCode}: ${sim.failReason}`);
  assert.equal(sim.collectedCrystals, sim.totalCrystals);
  assert.equal(sim.usedFunctionCall, true);

  const blkCount = countBlocks(mainProgram, funcBody);
  assert.ok(blkCount <= lvl.parBlocks, `Boss blocks ${blkCount} <= ${lvl.parBlocks}`);
  const stars = calculateStars(lvl, info.cost, blkCount, sim.collectedCrystals, sim.totalCrystals);
  assert.equal(stars.stars, 3);

  const mastery = recordSkillMastery(undefined, lvl, chassis, mainProgram, sim, funcBody);
  assert.equal(mastery.next.bossesDefeated, 1);
  assert.equal(mastery.next.functionsUsed, 1);
});

test('Chapter 4 optical circuits (Levels 13–16) all start unsolved and are solvable via mirror/splitter flips', () => {
  for (const id of [13, 14, 15, 16]) {
    const lvl = getLevelById(id)!;
    const grid = cloneCircuitGrid(lvl.circuit);
    const initialTrace = traceCircuit(grid);
    assert.equal(initialTrace.solved, false, `Level ${id} circuit should start unsolved`);

    let solved = false;
    for (let step = 0; step < 8; step++) {
      const fix = findCircuitFixCell(grid);
      if (!fix) break;
      grid[fix.r][fix.c].rot = grid[fix.r][fix.c].rot === 0 ? 1 : 0;
      if (traceCircuit(grid).solved) {
        solved = true;
        break;
      }
    }
    assert.equal(solved, true, `Level ${id} circuit must be solvable via mirror/splitter flips`);
  }
});

test('Deterministic hazards, recursion guard, and Predict-Before-Run quiz accuracy', () => {
  const lvl13 = getLevelById(13)!;
  const tick0 = evaluateAllHazardsAtTick(lvl13, 0);
  const tick1 = evaluateAllHazardsAtTick(lvl13, 1);
  assert.equal(tick0[0].active, true);
  assert.equal(tick1[0].active, false);

  // Recursion guard: CALL_FUNC inside functionBody never hangs
  const lvl14 = getLevelById(14)!;
  const ch14 = makeChassis({ drive: 'wheels', thrusters: true, laser: true });
  const recursiveSim = simulateProgram(
    lvl14,
    ch14,
    [{ id: 'top_call', type: 'CALL_FUNC' }],
    [{ id: 'inner_call', type: 'CALL_FUNC' }, { id: 'inner_mv', type: 'MOVE' }]
  );
  assert.ok(recursiveSim.events.length <= 128);

  // Predict-Before-Run prompt policy & accurate option generation
  const lvl1 = getLevelById(1)!;
  assert.equal(
    shouldPromptPredictQuiz({ enabled: true, level: lvl1, alreadyPromptedLevelKey: null, levelKey: 'lvl_1' }),
    false
  );
  assert.equal(
    shouldPromptPredictQuiz({ enabled: true, level: lvl13, alreadyPromptedLevelKey: null, levelKey: 'lvl_13' }),
    true
  );
  assert.equal(
    shouldPromptPredictQuiz({ enabled: true, level: lvl13, alreadyPromptedLevelKey: 'lvl_13', levelKey: 'lvl_13' }),
    false
  );

  const q13 = buildPredictBeforeRunQuestion({
    level: lvl13,
    chassis: makeChassis({ drive: 'wheels', laser: true }),
    program: [
      {
        id: 'if1',
        type: 'IF',
        condition: 'HAZARD',
        children: [{ id: 'w1', type: 'WAIT' }],
        elseChildren: [{ id: 'm1', type: 'MOVE' }]
      }
    ]
  });
  assert.ok(q13);
  assert.ok(q13!.options.some((o) => o.id === q13!.correctOptionId));

  const q14 = buildPredictBeforeRunQuestion({
    level: lvl14,
    chassis: ch14,
    program: [{ id: 'c1', type: 'CALL_FUNC' }, { id: 'c2', type: 'CALL_FUNC' }],
    functionBody: [{ id: 'fm', type: 'MOVE' }, { id: 'fj', type: 'JUMP' }]
  });
  assert.ok(q14);
  assert.ok(q14!.options.some((o) => o.id === q14!.correctOptionId));

  // Missing-part at Tile 0 skips Predict-Before-Run quiz instead of showing Tile 0 confusion
  const qNoWheels = buildPredictBeforeRunQuestion({
    level: lvl13,
    chassis: createEmptyChassis(),
    program: [{ id: 'm_empty', type: 'MOVE' }]
  });
  assert.equal(qNoWheels, null);

  // IF [HAZARD] with ELSE branch keeps ELSE label even when condition matches TRUE (no answer giveaway)
  const q13ElseMatch = buildPredictBeforeRunQuestion({
    level: lvl13,
    chassis: makeChassis({ drive: 'wheels', laser: true }),
    program: [
      { id: 'mv_pre', type: 'MOVE' },
      {
        id: 'if_haz_else',
        type: 'IF',
        condition: 'HAZARD',
        children: [{ id: 'w_t', type: 'WAIT' }],
        elseChildren: [{ id: 'm_e', type: 'MOVE' }]
      }
    ]
  });
  assert.ok(q13ElseMatch);
  assert.equal(q13ElseMatch!.correctOptionId, 'blocked');
  assert.match(q13ElseMatch!.options[1].label, /ELSE/i);
});

test('Hazard-aware Ghost Demo solver clears all Chapter 4 missions (13–16) without colliding', async () => {
  const { computeGhostPreviewPlan, findShortestTrackPlan } = await import('./engine');
  const { computeAdaptiveHint } = await import('./educationStrategy');

  for (const id of [13, 14, 15, 16]) {
    const lvl = getLevelById(id)!;
    const plan = findShortestTrackPlan(lvl);
    assert.ok(plan, `Level ${id} should have a hazard-safe shortest plan`);
    const ghost = computeGhostPreviewPlan(lvl, 'code', createEmptyChassis(), [], lvl.circuit, []);
    assert.ok(ghost && ghost.kind === 'code');
    if (ghost && ghost.kind === 'code') {
      assert.equal(
        ghost.simResult.status,
        'win',
        `Ghost preview on Chapter 4 Level ${id} must win without hitting hazards (got ${ghost.simResult.failCode})`
      );
      assert.equal(ghost.highlightCondition, 'HAZARD');
    }
  }

  // Chapter 4 Gentle Retry Tier 1 hints match laser_gate, patrol_drone, and empty_function
  const lvl13 = getLevelById(13)!;
  const laserHint = computeAdaptiveHint({
    level: lvl13,
    phase: 'code',
    chassis: makeChassis({ drive: 'wheels', laser: true }),
    program: [{ id: 'm1', type: 'MOVE' }],
    circuitGrid: lvl13.circuit,
    tier: 1,
    lastSimResult: {
      status: 'fail',
      failReason: 'Laser active',
      failCode: 'laser_gate',
      missingPart: null,
      events: [],
      collectedCrystals: 0,
      totalCrystals: 2,
      finalPos: 2
    },
    failingBlockId: 'm1'
  });
  assert.match(laserHint.headline, /Laser/i);
});

test('CODE_3D interactive track camera frames full track on portrait phones, clamps orbit/pan, and focuses tapped tiles', () => {
  const phoneShort = computeCodeCameraPreset('overview', 7, 390, 844, 56);
  const phoneLong = computeCodeCameraPreset('overview', 12, 390, 844, 56);
  // Portrait overview orients nearly straight down the track (low yaw) and pulls farther back for longer courses
  assert.ok(Math.abs(phoneShort.yaw) < 0.35);
  assert.ok(phoneLong.distance > phoneShort.distance);
  assert.ok(phoneShort.lookYBias < -1.5, 'Portrait overview pushes track cleanly above CodeDock');

  // Top-down portrait aligns straight vertically along the track
  const phoneTop = computeCodeCameraPreset('top', 9, 390, 844, 56);
  assert.equal(phoneTop.yaw, 0);
  assert.ok(phoneTop.pitch > 1.1);

  // Desktop landscape overview stays wide 3/4 side view
  const desktopOverview = computeCodeCameraPreset('overview', 9, 1440, 900, 52);
  assert.ok(desktopOverview.yaw > 0.6);

  // Focusing Tile 6 glides focusZ directly onto Tile 6 center
  const tileFocus = computeTileFocusCameraState(phoneShort, 6, 9, 390, 844);
  assert.equal(tileFocus.focusZ, getTrackTileCenterZ(6));

  // Orbit/pan/zoom clamping keeps camera inside safe track bounds
  const clamped = clampCodeCameraState(
    { yaw: 9, pitch: -4, distance: 200, focusZ: -999, lookYBias: -20 },
    8
  );
  assert.ok(clamped.yaw <= 1.5);
  assert.ok(clamped.pitch >= 0.24);
  assert.ok(clamped.distance <= 48);
  assert.ok(clamped.focusZ >= getTrackTileCenterZ(7) - 1.5);

  // Vector evaluation yields finite 3D coordinates behind focusZ
  const vecs = evaluateCodeCameraVectors(phoneShort, -0.32);
  assert.ok(Number.isFinite(vecs.camX) && Number.isFinite(vecs.camY) && Number.isFinite(vecs.camZ));
  assert.ok(vecs.camZ > vecs.lookZ);

  // Preset cycling loops cleanly: overview -> top -> follow -> overview
  assert.equal(getNextCodeCameraPreset('overview'), 'top');
  assert.equal(getNextCodeCameraPreset('top'), 'follow');
  assert.equal(getNextCodeCameraPreset('follow'), 'overview');
});


