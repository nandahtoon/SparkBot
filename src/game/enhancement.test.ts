import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateProgram } from './simulator';
import { BONUS_LEVELS, LEVELS } from './levels';
import { generateDailyChallenge } from './engine';
import {
  DEBUG_MISSIONS,
  debugMissionToLevelDef,
  getDebugMissionById
} from './debugMissions';
import {
  SHOP_CATALOG,
  canBuyShopItem,
  claimMasteryQuest,
  countClaimableQuests,
  createDefaultLoadout,
  createDefaultQuestCounters,
  evaluateMasteryQuests,
  getTrailPalette,
  incrementQuestCounters,
  normalizePlayerLoadout,
  purchaseShopItem,
  toggleEquipShopItem
} from './shopAndQuests';
import { BIOME_THEMES, getBiomeForLevel } from './biomes';
import {
  createDefaultSandboxDraft,
  decodeChallengeCode,
  encodeChallengeCode,
  sandboxDraftToLevelDef
} from './sandboxCodec';
import { normalizeSaveProfileData } from './profileStorage';
import type { CodeBlock } from './types';

test('All 6 Debug Missions fail with starter code and win with intended fix', () => {
  assert.equal(DEBUG_MISSIONS.length, 6);

  const intendedFixes: Record<
    string,
    { program: CodeBlock[]; functionBody?: CodeBlock[] }
  > = {
    // debug_1: add 4th MOVE
    debug_1: {
      program: [
        { id: 'f1_1', type: 'MOVE' },
        { id: 'f1_2', type: 'MOVE' },
        { id: 'f1_3', type: 'MOVE' },
        { id: 'f1_4', type: 'MOVE' }
      ]
    },
    // debug_2: MOVE, JUMP, MOVE (jump over gap at tile 2 from tile 1 -> lands on tile 3, MOVE -> gate tile 4)
    debug_2: {
      program: [
        { id: 'f2_1', type: 'MOVE' },
        { id: 'f2_2', type: 'JUMP' },
        { id: 'f2_3', type: 'MOVE' }
      ]
    },
    // debug_3: LOOP count 3 of JUMP (0->2->4->6)
    debug_3: {
      program: [
        {
          id: 'f3_l',
          type: 'LOOP',
          count: 3,
          children: [{ id: 'f3_j', type: 'JUMP' }]
        }
      ]
    },
    // debug_4: IF GAP -> JUMP else MOVE inside LOOP 4
    debug_4: {
      program: [
        {
          id: 'f4_l',
          type: 'LOOP',
          count: 4,
          children: [
            {
              id: 'f4_if',
              type: 'IF',
              condition: 'GAP',
              children: [{ id: 'f4_j', type: 'JUMP' }],
              elseChildren: [{ id: 'f4_m', type: 'MOVE' }]
            }
          ]
        }
      ]
    },
    // debug_5: WAIT beat then 4 MOVEs past pulsing laser gate at tile 2
    debug_5: {
      program: [
        { id: 'f5_w', type: 'WAIT' },
        { id: 'f5_1', type: 'MOVE' },
        { id: 'f5_2', type: 'MOVE' },
        { id: 'f5_3', type: 'MOVE' },
        { id: 'f5_4', type: 'MOVE' }
      ]
    },
    // debug_6: fix MY BLOCK to [MOVE, JUMP] called twice (0->1->3->4->6)
    debug_6: {
      program: [
        { id: 'f6_c1', type: 'CALL_FUNC' },
        { id: 'f6_c2', type: 'CALL_FUNC' }
      ],
      functionBody: [
        { id: 'f6_m', type: 'MOVE' },
        { id: 'f6_j', type: 'JUMP' }
      ]
    }
  };

  for (const mission of DEBUG_MISSIONS) {
    assert.equal(getDebugMissionById(mission.id)?.id, mission.id);
    const lvl = debugMissionToLevelDef(mission);
    assert.equal(lvl.isDebug, true);
    assert.ok(lvl.starterChassis);
    assert.ok(lvl.starterProgram && lvl.starterProgram.length > 0);

    // 1. Starter buggy code MUST fail
    const buggyRes = simulateProgram(
      lvl,
      lvl.starterChassis!,
      lvl.starterProgram!,
      lvl.starterFunctionBody || []
    );
    assert.notEqual(
      buggyRes.status,
      'win',
      `Debug mission ${mission.id} starter program unexpectedly won!`
    );

    // 2. Intended fix MUST win
    const fix = intendedFixes[mission.id];
    assert.ok(fix, `Missing intended fix for ${mission.id}`);
    const fixedRes = simulateProgram(
      lvl,
      lvl.starterChassis!,
      fix.program,
      fix.functionBody || []
    );
    assert.equal(
      fixedRes.status,
      'win',
      `Debug mission ${mission.id} intended fix failed with ${fixedRes.status}`
    );
  }
});

test('Bolt Upgrade Shop catalog, buying, equipping, and trail palettes', () => {
  const drones = SHOP_CATALOG.filter((i) => i.category === 'drone');
  const accessories = SHOP_CATALOG.filter((i) => i.category === 'accessory');
  const trails = SHOP_CATALOG.filter((i) => i.category === 'trail');
  assert.equal(drones.length, 4);
  assert.equal(accessories.length, 4);
  assert.equal(trails.length, 4);

  let loadout = createDefaultLoadout();
  assert.deepEqual(loadout.ownedIds, ['classic_spark']);
  assert.equal(loadout.equippedDroneId, null);
  assert.equal(loadout.equippedAccessoryId, null);
  assert.equal(loadout.equippedTrailId, 'classic_spark');

  // Cannot buy if insufficient bolts
  const poorCheck = canBuyShopItem(loadout, 20, 'scout_pip');
  assert.equal(poorCheck.ok, false);
  assert.equal(poorCheck.reason, 'insufficient_bolts');
  assert.equal(poorCheck.missingBolts, 40);

  // Purchase drone with enough bolts auto-equips it
  const boughtDrone = purchaseShopItem(loadout, 150, 'scout_pip');
  assert.equal(boughtDrone.ok, true);
  assert.equal(boughtDrone.totalBolts, 90);
  assert.equal(boughtDrone.loadout.equippedDroneId, 'scout_pip');
  assert.ok(boughtDrone.loadout.ownedIds.includes('scout_pip'));
  loadout = boughtDrone.loadout;

  // Duplicate purchase blocked
  const dup = canBuyShopItem(loadout, 500, 'scout_pip');
  assert.equal(dup.ok, false);
  assert.equal(dup.reason, 'already_owned');

  // Toggle equip turns drone off and back on
  loadout = toggleEquipShopItem(loadout, 'scout_pip');
  assert.equal(loadout.equippedDroneId, null);
  loadout = toggleEquipShopItem(loadout, 'scout_pip');
  assert.equal(loadout.equippedDroneId, 'scout_pip');

  // Purchase accessory & trail
  const boughtAcc = purchaseShopItem(loadout, 300, 'star_crown');
  assert.equal(boughtAcc.ok, true);
  assert.equal(boughtAcc.loadout.equippedAccessoryId, 'star_crown');

  const boughtTrail = purchaseShopItem(boughtAcc.loadout, 300, 'rainbow_prism');
  assert.equal(boughtTrail.ok, true);
  assert.equal(boughtTrail.loadout.equippedTrailId, 'rainbow_prism');
  assert.ok(getTrailPalette('rainbow_prism').length >= 4);

  // Normalization strips unowned equipped items safely
  const sanitized = normalizePlayerLoadout({
    ownedIds: ['classic_spark'],
    equippedDroneId: 'golden_owl',
    equippedAccessoryId: 'holo_visor',
    equippedTrailId: 'solar_gold'
  });
  assert.equal(sanitized.equippedDroneId, null);
  assert.equal(sanitized.equippedAccessoryId, null);
  assert.equal(sanitized.equippedTrailId, 'classic_spark');
});

test('Mastery Skill Quests evaluation, counter increments, and single-claim rewards', () => {
  let counters = createDefaultQuestCounters();
  assert.equal(countClaimableQuests(counters, []), 0);

  counters = incrementQuestCounters(counters, {
    bugsSquashed: 1,
    crystalsCollected: 6,
    loopsUsed: 2
  });

  const evaluated = evaluateMasteryQuests(counters, []);
  const bugQuest = evaluated.find((q) => q.id === 'q_first_bug');
  assert.ok(bugQuest?.claimable);
  assert.equal(countClaimableQuests(counters, []), 3);

  // Claim once succeeds and adds bolts
  const claimed = claimMasteryQuest(counters, [], 100, 'q_first_bug');
  assert.equal(claimed.ok, true);
  assert.equal(claimed.totalBolts, 100 + bugQuest!.boltReward);
  assert.ok(claimed.claimedQuestIds.includes('q_first_bug'));

  // Double-claim rejected
  const doubleClaim = claimMasteryQuest(counters, claimed.claimedQuestIds, claimed.totalBolts, 'q_first_bug');
  assert.equal(doubleClaim.ok, false);
  assert.equal(doubleClaim.reward, 0);
  assert.equal(countClaimableQuests(counters, claimed.claimedQuestIds), 2);
});

test('Chapter Biomes map distinct environments across story, boss, daily, and debug missions', () => {
  assert.equal(getBiomeForLevel(LEVELS[0]).id, 'skyport_canyon');
  assert.equal(getBiomeForLevel(LEVELS[4]).id, 'solar_dunes');
  const ch3 = BONUS_LEVELS.find((l) => l.id === 9);
  const ch4 = BONUS_LEVELS.find((l) => l.id === 13);
  assert.ok(ch3);
  assert.ok(ch4);
  assert.equal(getBiomeForLevel(ch3).id, 'aurora_glade');
  assert.equal(getBiomeForLevel(ch4).id, 'reactor_citadel');

  const dbg1 = debugMissionToLevelDef(DEBUG_MISSIONS[0]);
  const dbg3 = debugMissionToLevelDef(DEBUG_MISSIONS[2]);
  const dbg5 = debugMissionToLevelDef(DEBUG_MISSIONS[4]);
  assert.equal(getBiomeForLevel(dbg1).id, 'solar_dunes');
  assert.equal(getBiomeForLevel(dbg3).id, 'aurora_glade');
  assert.equal(getBiomeForLevel(dbg5).id, 'reactor_citadel');

  const daily = generateDailyChallenge('2026-11-25');
  assert.ok(BIOME_THEMES[getBiomeForLevel(daily).id]);
});

test('Sandbox Codec encodes and decodes both v1 standard and v2 Debug Class Codes', () => {
  // v1 Standard sandbox draft (backward compatible)
  const v1Draft = createDefaultSandboxDraft();
  const v1Code = encodeChallengeCode(v1Draft);
  assert.match(v1Code, /^SB1-[A-Za-z0-9_-]+-[0-9A-F]{4}$/);
  const v1Decoded = decodeChallengeCode(v1Code);
  assert.equal(v1Decoded.ok, true);
  if (v1Decoded.ok) {
    assert.equal(v1Decoded.draft.isDebugPuzzle, false);
    assert.equal(v1Decoded.draft.name, v1Draft.name);
    assert.equal(v1Decoded.draft.track.length, v1Draft.track.length);
  }

  // v2 Debug Class Code
  const v2Draft = {
    ...createDefaultSandboxDraft(),
    name: 'Jump Bug Class',
    isDebugPuzzle: true,
    bugClue: 'Swap JUMP and MOVE to clear the canyon!',
    starterProgram: [
      { id: 'b1', type: 'JUMP' as const },
      { id: 'b2', type: 'MOVE' as const },
      { id: 'b3', type: 'WAIT' as const }
    ]
  };
  const v2Code = encodeChallengeCode(v2Draft);
  assert.match(v2Code, /^SB1-[A-Za-z0-9_-]+-[0-9A-F]{4}$/);
  const v2Decoded = decodeChallengeCode(v2Code);
  assert.equal(v2Decoded.ok, true);
  if (v2Decoded.ok) {
    assert.equal(v2Decoded.draft.isDebugPuzzle, true);
    assert.equal(v2Decoded.draft.bugClue, 'Swap JUMP and MOVE to clear the canyon!');
    assert.deepEqual(
      v2Decoded.draft.starterProgram?.map((b) => b.type),
      ['JUMP', 'MOVE', 'WAIT']
    );

    const lvl = sandboxDraftToLevelDef(v2Decoded.draft, { isClassCode: true });
    assert.equal(lvl.isDebug, true);
    assert.equal(lvl.isClassCode, true);
    assert.equal(lvl.debugClue, 'Swap JUMP and MOVE to clear the canyon!');
    assert.ok(lvl.starterChassis);
    assert.equal(lvl.starterProgram?.length, 3);
  }
});

test('Profile storage migrates legacy saves and preserves loadout, debugCompleted, and quests', () => {
  // Legacy save with none of the new fields
  const migrated = normalizeSaveProfileData({
    unlockedLevel: 5,
    totalBolts: 180
  });
  assert.equal(migrated.unlockedLevel, 5);
  assert.equal(migrated.totalBolts, 180);
  assert.deepEqual(migrated.loadout?.ownedIds, ['classic_spark']);
  assert.deepEqual(migrated.debugCompleted, {});
  assert.equal(migrated.questCounters?.bugsSquashed, 0);
  assert.deepEqual(migrated.claimedQuestIds, []);

  // Populated save retains new fields
  const populated = normalizeSaveProfileData({
    totalBolts: 90,
    loadout: {
      ownedIds: ['classic_spark', 'scout_pip', 'holo_visor'],
      equippedDroneId: 'scout_pip',
      equippedAccessoryId: 'holo_visor',
      equippedTrailId: 'classic_spark'
    },
    debugCompleted: { debug_1: true, debug_2: true },
    questCounters: {
      missionsCleared: 4,
      bugsSquashed: 2,
      loopsUsed: 1,
      conditionalsUsed: 0,
      functionsUsed: 0,
      predictionsCorrect: 1,
      crystalsCollected: 8,
      dailyCleared: 1,
      shopBought: 2
    },
    claimedQuestIds: ['q_first_bug']
  });
  assert.equal(populated.loadout?.equippedDroneId, 'scout_pip');
  assert.equal(populated.loadout?.equippedAccessoryId, 'holo_visor');
  assert.equal(populated.debugCompleted?.debug_1, true);
  assert.equal(populated.questCounters?.bugsSquashed, 2);
  assert.deepEqual(populated.claimedQuestIds, ['q_first_bug']);
});

test('Upgraded Wall Breaker spawns Bomb Cores, Prism Splitters, Bolt Vaults, radial blasts, and power-ups', async () => {
  const { createWallBreakerLayout, findBombBlastTargets, pickWallPowerUpKind } = await import(
    './arcadeGames'
  );
  const stage1 = createWallBreakerLayout(420, 640, 1);
  assert.equal(stage1.length, 21);

  const bombs = stage1.filter((b) => b.kind === 'bomb');
  const prisms = stage1.filter((b) => b.kind === 'prism');
  const vaults = stage1.filter((b) => b.kind === 'bolt_vault');
  assert.ok(bombs.length >= 2, 'Stage 1 should include at least 2 Bomb Cores');
  assert.ok(prisms.length >= 1, 'Stage 1 should include a Prism Splitter core');
  assert.ok(vaults.length >= 1, 'Stage 1 should include Bolt Vault bricks');

  // Bomb blast hits adjacent bricks but never includes itself
  const blastTargets = findBombBlastTargets(stage1, bombs[0]);
  assert.ok(blastTargets.length >= 3, 'Bomb blast should hit neighboring tiles');
  assert.ok(blastTargets.every((t) => t.id !== bombs[0].id));

  // Power-up mapping
  assert.equal(pickWallPowerUpKind(prisms[0], 0), 'multi');
  assert.equal(pickWallPowerUpKind(bombs[0], 0), 'fire');
  const validPowers = new Set(['wide', 'multi', 'laser', 'fire', 'bolt']);
  assert.ok(validPowers.has(pickWallPowerUpKind(vaults[0], 1)));
});
