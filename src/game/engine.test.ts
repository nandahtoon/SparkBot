import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from './engine';
import {
  composeWallEPhrase,
  getEmoteWaveBars,
  getRobotMoodEmoji,
  VOWEL_FORMANTS,
  type RobotMoodCue,
  type WallEPhraseId
} from './robotVoice';
import { computeBuildEquipmentGuide } from './buildHints';
import * as Arcade from './arcadeGames';
import { getPartPlacementSoundProfile, PART_PLACEMENT_SOUND_PROFILES } from './partAudio';
import * as ActionTrail from './actionTrail';
import * as ProfileStorage from './profileStorage';
import * as PartTooltips from './partTooltips';
import * as GraphicsConfig from './graphicsConfig';
import * as ChallengeTimer from './challengeTimer';
import * as LevelHistory from './levelHistory';
import * as PlanetAdv from './planetAdventure';
import * as ResponsiveCamera from '../three/responsiveCamera';
import * as AndroidApp from './androidApp';
import * as TrackSurface from './trackSurface';
import * as THREE from 'three';
import { clearAndDisposeGroup, disposeObject3D } from '../three/disposeUtils';

test('magnet part attaches cleanly to chassis and lowers Action Dash bolt-per-cube threshold', () => {
  const chassis = E.createEmptyChassis();
  chassis[2][0] = 'treads';
  chassis[1][2] = 'laser';
  chassis[2][1] = 'magnet';

  const info = E.computeChassisInfo(chassis);
  assert.equal(info.hasMagnet, true);
  assert.equal(info.cost, 35 + 25 + 25);

  const mWithMagnet = E.createActionDashMetrics({ endless: false, gentleSpeed: true, chassisInfo: info });
  assert.equal(mWithMagnet.boltPerCube, 5);
  assert.equal(mWithMagnet.shieldActive, true);
  assert.ok(mWithMagnet.magnetTimer > 0);

  const res = E.applyBoltCollection(mWithMagnet, 5);
  assert.equal(res.cubesEarned, 1);
  assert.equal(mWithMagnet.cubes, 1);
});

test('canPlacePartInSlot enforces front column for laser and level budget cap', () => {
  const chassis = E.createEmptyChassis();
  assert.equal(E.canPlacePartInSlot(chassis, 100, 'laser', 1, 1).ok, false);
  assert.equal(E.canPlacePartInSlot(chassis, 100, 'laser', 1, 1).reason, 'laser_not_front');
  assert.equal(E.canPlacePartInSlot(chassis, 100, 'laser', 1, 2).ok, true);
  assert.equal(E.canPlacePartInSlot(chassis, 15, 'wheels', 2, 0).reason, 'over_budget');
});

test('Action Dash wall-run steering transitions smoothly across floor, leftWall, and rightWall', () => {
  let s = E.stepActionSurfaceMove('floor', 1, -1, true);
  assert.deepEqual(s, { surface: 'floor', lane: 0 });

  s = E.stepActionSurfaceMove(s.surface, s.lane, -1, true);
  assert.deepEqual(s, { surface: 'leftWall', lane: 0 });

  s = E.stepActionSurfaceMove(s.surface, s.lane, -1, true);
  assert.deepEqual(s, { surface: 'leftWall', lane: 1 });

  s = E.stepActionSurfaceMove(s.surface, s.lane, 1, true);
  assert.deepEqual(s, { surface: 'leftWall', lane: 0 });

  s = E.stepActionSurfaceMove(s.surface, s.lane, 1, true);
  assert.deepEqual(s, { surface: 'floor', lane: 0 });

  // Without wall-run, floor clamps cleanly at lane 0..2
  assert.deepEqual(E.stepActionSurfaceMove('floor', 0, -1, false), { surface: 'floor', lane: 0 });
  assert.deepEqual(E.stepActionSurfaceMove('floor', 2, 1, false), { surface: 'floor', lane: 2 });
});

test('empty LOOP/IF container triggers empty_container failCode for confused pose', () => {
  const chassis = E.createEmptyChassis();
  chassis[2][0] = 'wheels';
  chassis[1][2] = 'laser';
  const sim = E.simulateProgram(E.LEVELS[0], chassis, [{ id: 'loop1', type: 'LOOP', count: 2, children: [] }]);
  assert.equal(sim.status, 'fail');
  assert.equal(sim.failCode, 'empty_container');
});

test('audio volume channels normalize cleanly and stay independent of master mute', async () => {
  const AC = await import('./audioConfig');
  const norm = AC.normalizeAudioSettings({ sfxVolume: 1.8, uiVolume: -0.2, voiceVolume: 0.45 });
  assert.deepEqual(norm, { sfxVolume: 1, uiVolume: 0, voiceVolume: 0.45, musicVolume: 0.28, ambienceVolume: 0.22 });

  // Master mute returns 0 gain without altering underlying channel volumes
  assert.equal(AC.computeEffectiveChannelGain(true, norm.voiceVolume), 0);
  assert.equal(AC.computeEffectiveChannelGain(false, norm.voiceVolume), 0.45);
  assert.equal(AC.computeEffectiveChannelGain(false, norm.sfxVolume), 1);
  assert.equal(AC.computeEffectiveChannelGain(false, norm.uiVolume), 0);

  // Boosted output gains amplify voice, SFX, and UI channels cleanly while honoring master mute
  assert.ok(AC.MASTER_OUTPUT_BOOST > 1.1);
  assert.ok(AC.CHANNEL_OUTPUT_BOOST.voice >= 2.0);
  assert.ok(AC.CHANNEL_OUTPUT_BOOST.sfx >= 2.0);
  assert.ok(AC.CHANNEL_OUTPUT_BOOST.ui >= 2.0);
  assert.equal(AC.computeAudioOutputGain(true, 'voice', 1), 0);
  assert.ok(AC.computeAudioOutputGain(false, 'voice', 1) > 2.0);
  assert.ok(
    AC.computeAudioOutputGain(false, 'voice', 1) > AC.computeAudioOutputGain(false, 'voice', 0.5)
  );
  assert.ok(AC.computeAudioOutputGain(false, 'sfx', 0.9) > 2.0);
  assert.ok(AC.computeAudioOutputGain(false, 'ui', 0.8) > 2.0);

  const audioSrc = fs.readFileSync('src/game/audio.ts', 'utf8');
  assert.ok(audioSrc.includes('createDynamicsCompressor'), 'master bus includes soft limiter');

  // Default profile initializes granular audio channels
  const def = E.defaultSaveProfile();
  assert.deepEqual(def.audio, AC.DEFAULT_AUDIO_SETTINGS);
});

test('workshop 3D orbit clamps polar elevation and distance while wrapping azimuth', async () => {
  const AC = await import('./audioConfig');
  const clamped = AC.clampWorkshopOrbit({
    azimuth: Math.PI * 3.5,
    polar: 2.8,
    distance: 20
  });
  assert.equal(clamped.polar, AC.ORBIT_POLAR_MAX);
  assert.equal(clamped.distance, AC.ORBIT_DIST_MAX);
  assert.ok(clamped.azimuth >= -Math.PI && clamped.azimuth <= Math.PI);

  const minClamped = AC.clampWorkshopOrbit({
    azimuth: -Math.PI * 2.5,
    polar: 0.05,
    distance: 1.0
  });
  assert.equal(minClamped.polar, AC.ORBIT_POLAR_MIN);
  assert.equal(minClamped.distance, AC.ORBIT_DIST_MIN);
  assert.ok(minClamped.azimuth >= -Math.PI && minClamped.azimuth <= Math.PI);
});

test('robot voice responses vary cleanly across touch zones, part installs, and paint themes without text', async () => {
  const RV = await import('./robotVoice');
  const headResp = RV.pickTouchResponse('head', 0);
  assert.equal(headResp.mood, 'playful');
  assert.equal(headResp.phrase, 'giggle');
  assert.equal(headResp.emote, 'hearts');
  assert.equal('text' in headResp, false);
  assert.notEqual(headResp.variant, RV.pickTouchResponse('head', 1).variant);

  const partResp = RV.pickTouchResponse('thrusters', 0);
  assert.equal(partResp.mood, 'excited');
  assert.equal(partResp.phrase, 'excited');
  assert.equal(partResp.emote, 'part');
  assert.equal(partResp.partId, 'thrusters');

  const installResp = RV.pickInstallResponse('wheels', 0);
  assert.equal(installResp.mood, 'proud');
  assert.equal(installResp.phrase, 'proud');
  assert.equal(installResp.emote, 'part');
  assert.equal(installResp.partId, 'wheels');

  const paintResp = RV.pickPaintResponse('cobalt', 0);
  assert.equal(paintResp.mood, 'happy');
  assert.equal(paintResp.phrase, 'paint');
  assert.equal(paintResp.emote, 'paint');
  assert.ok(paintResp.accentColor?.startsWith('#'));

  const customPaintResp = RV.pickCustomPaintResponse('Wheels', 'Stars', 0, '#ec4899');
  assert.equal(customPaintResp.mood, 'excited');
  assert.equal(customPaintResp.emote, 'paint');
  assert.equal(customPaintResp.accentColor, '#ec4899');

  const charResp = RV.pickCharacterSwitchResponse('', 1.22, '#38bdf8');
  assert.equal(charResp.phrase, 'greeting');
  assert.equal(charResp.emote, 'stars');
  assert.equal(charResp.pitchScale, 1.22);
});

test('Paint Booth part colors, decals, and Bot Character normalization enforce safe defaults', () => {
  assert.equal(E.normalizeBotCharacter('nova'), 'nova');
  assert.equal(E.normalizeBotCharacter('sprout'), 'sprout');
  assert.equal(E.normalizeBotCharacter('robobuddy'), 'robobuddy');
  assert.equal(E.normalizeBotCharacter('learnbot'), 'learnbot');
  assert.equal(E.normalizeBotCharacter('unknown-bot'), 'sparkbot');

  assert.equal(E.normalizeHexColor('#38BDF8', '#000000'), '#38bdf8');
  assert.equal(E.normalizeHexColor('not-a-color', '#f59e0b'), '#f59e0b');
  assert.equal(E.normalizeDecalId('stars'), 'stars');
  assert.equal(E.normalizeDecalId('invalid'), 'none');

  const cfg = E.createDefaultPaintConfig('amber', 'learnbot');
  assert.equal(cfg.parts.chassis.color, E.BOT_CHARACTERS.learnbot.defaultBodyHex);
  assert.equal(cfg.parts.head.color, E.BOT_CHARACTERS.learnbot.defaultHeadHex);

  const painted = E.setPartPaint(cfg, 'wheels', { color: '#EC4899', decal: 'lightning' });
  assert.equal(painted.parts.wheels.color, '#ec4899');
  assert.equal(painted.parts.wheels.decal, 'lightning');
  // Original config stays immutable
  assert.equal(cfg.parts.wheels.decal, 'none');
});

test('Saved Paint Booth profile themes support upsert, case-insensitive overwrite, cap limit, and delete', () => {
  const baseCfg = E.createDefaultPaintConfig('cobalt', 'nova');
  const neonCfg = E.setPartPaint(baseCfg, 'chassis', { color: '#ec4899', decal: 'stars' });

  let list = E.upsertSavedPaintTheme([], 'Cosmic Racer', neonCfg, 'nova');
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Cosmic Racer');
  assert.equal(list[0].characterId, 'nova');
  assert.equal(list[0].config.parts.chassis.decal, 'stars');

  // Updating with same name (different case) overwrites instead of duplicating
  const updatedCfg = E.setPartPaint(neonCfg, 'head', { color: '#10b981', decal: 'leaf' });
  list = E.upsertSavedPaintTheme(list, 'cosmic racer', updatedCfg, 'sprout');
  assert.equal(list.length, 1);
  assert.equal(list[0].config.parts.head.color, '#10b981');
  assert.equal(list[0].characterId, 'sprout');

  // Enforces MAX_SAVED_PAINT_THEMES cap
  for (let i = 0; i < E.MAX_SAVED_PAINT_THEMES + 3; i++) {
    list = E.upsertSavedPaintTheme(list, `Theme ${i}`, baseCfg, 'sparkbot');
  }
  assert.equal(list.length, E.MAX_SAVED_PAINT_THEMES);

  const removedId = list[0].id;
  const afterDelete = E.deleteSavedPaintTheme(list, removedId);
  assert.equal(afterDelete.length, E.MAX_SAVED_PAINT_THEMES - 1);
  assert.equal(afterDelete.some((t) => t.id === removedId), false);
});

test('WALL-E vocal formant composer generates valid phrases with zero human SpeechSynthesis APIs', () => {
  const phrases: WallEPhraseId[] = [
    'greeting',
    'giggle',
    'excited',
    'proud',
    'paint',
    'curious',
    'sad',
    'celebrate'
  ];
  for (const p of phrases) {
    const syls = composeWallEPhrase(p, 1.1, 0);
    assert.ok(syls.length >= 1, `${p} has syllables`);
    for (const s of syls) {
      assert.ok(s.dur > 0.04 && s.dur <= 0.35);
      assert.ok(s.fStart >= 150 && s.fEnd >= 150);
      assert.ok(VOWEL_FORMANTS[s.vowelFrom], 'valid start vowel formant');
      assert.ok(VOWEL_FORMANTS[s.vowelTo], 'valid end vowel formant');
    }
  }

  // Pitch scale clamps safely to prevent chipmunk or sub-audible distortion
  const clampedHigh = composeWallEPhrase('greeting', 3.0, 0);
  const maxAllowed = composeWallEPhrase('greeting', 1.28, 0);
  assert.deepEqual(clampedHigh, maxAllowed);

  // Equalizer wave bars return 5 normalized heights across all engine mood cues
  const moodList: RobotMoodCue[] = [
    'happy',
    'playful',
    'excited',
    'proud',
    'sad',
    'confused',
    'curious',
    'celebrate',
    'boost',
    'build',
    'neutral'
  ];
  const emojis = new Set<string>();
  for (const m of moodList) {
    const bars = getEmoteWaveBars(m, 1);
    assert.equal(bars.length, 5);
    assert.ok(bars.every((b) => b > 0 && b <= 1));
    const info = getRobotMoodEmoji(m);
    assert.ok(info.emoji.length > 0 && info.label.length > 0);
    emojis.add(info.emoji);
  }
  // Distinct robot emoji characters across moods
  assert.equal(emojis.size, moodList.length);
  assert.equal(getRobotMoodEmoji('happy', 'greeting').emoji, '🤖');
  assert.equal(getRobotMoodEmoji('playful', 'curious', 'curious').emoji, '🧐');

  // Verify RobotSpeechBubble consumes moodCue, renders robot-mood-emoji, and applies speaking bounce animation
  const bubbleSrc = fs.readFileSync('src/components/RobotSpeechBubble.tsx', 'utf8');
  assert.match(bubbleSrc, /getRobotMoodEmoji/);
  assert.match(bubbleSrc, /moodCue/);
  assert.match(bubbleSrc, /robot-mood-emoji/);
  assert.match(bubbleSrc, /data-speaking/);
  assert.match(bubbleSrc, /anim-speech-bounce/);

  const cssSrc = fs.readFileSync('src/index.css', 'utf8');
  assert.match(cssSrc, /speechHoverBounce/);
  assert.match(cssSrc, /\.anim-speech-bounce/);

  // Verify zero human SpeechSynthesis usage remains in audio.ts
  const audioSrc = fs.readFileSync('src/game/audio.ts', 'utf8');
  assert.equal(/speechSynthesis|SpeechSynthesisUtterance/i.test(audioSrc), false);
});

test('BuildDock part tooltips expose function, logic use case, placement rules, and live budget state', () => {
  const allParts: E.PartId[] = ['wheels', 'treads', 'thrusters', 'booster', 'laser', 'magnet'];
  for (const pid of allParts) {
    const def = E.PARTS[pid];
    assert.ok(def.functionSummary.length >= 20, `${pid} has informative function summary`);
    assert.ok(def.logicUseCase.length >= 20, `${pid} has informative logic use case`);
    assert.ok(def.placementHint.length > 0, `${pid} has placement hint`);
    assert.ok(def.unlocksLabel.length > 0, `${pid} has unlock tag`);
  }

  const chassis = E.createEmptyChassis();
  chassis[2][0] = 'wheels';
  chassis[1][2] = 'laser';

  const laserTip = E.getPartTooltipInfo('laser', chassis, 70);
  assert.equal(laserTip.installedCount, 1);
  assert.equal(laserTip.remainingBudget, 25);
  assert.equal(laserTip.canAfford, true);
  assert.equal(laserTip.budgetShortfall, 0);
  assert.equal(laserTip.requiresFrontColumn, true);

  const thrusterTip = E.getPartTooltipInfo('thrusters', chassis, 70);
  assert.equal(thrusterTip.installedCount, 0);
  assert.equal(thrusterTip.canAfford, false);
  assert.equal(thrusterTip.budgetShortfall, 10);
  assert.equal(thrusterTip.requiresFrontColumn, false);
});

test('Step-through inspector tracks tile position, ahead sensor, cumulative crystals, capabilities, and ancestor blocks', () => {
  const level = E.LEVELS[1]; // Level 2 has a GAP on the track
  const chassis = E.createEmptyChassis();
  chassis[2][0] = 'wheels';
  chassis[2][1] = 'thrusters';
  chassis[1][2] = 'laser';

  const program: E.CodeBlock[] = [
    {
      id: 'loop-1',
      type: 'LOOP',
      count: 2,
      children: [
        {
          id: 'if-1',
          type: 'IF',
          condition: 'GAP',
          children: [{ id: 'jump-1', type: 'JUMP' }]
        },
        { id: 'move-1', type: 'MOVE' }
      ]
    }
  ];

  const sim = E.simulateProgram(level, chassis, program);
  assert.ok(sim.events.length >= 2, 'simulation produces step events');

  // Inspect first event
  const step0 = E.buildStepInspection(level, chassis, sim, 0);
  assert.ok(step0);
  assert.equal(step0.stepNumber, 1);
  assert.equal(step0.totalSteps, sim.events.length);
  assert.ok(step0.activeCapabilities.includes('Wheels'));
  assert.ok(step0.activeCapabilities.includes('Thrusters'));
  assert.ok(step0.activeCapabilities.includes('Laser'));
  assert.equal(step0.totalCrystals, sim.totalCrystals);

  // Inspect a SCAN event from IF block
  const scanIdx = sim.events.findIndex((e) => e.action === 'SCAN');
  assert.ok(scanIdx >= 0, 'contains SCAN event from IF block');
  const scanInspect = E.buildStepInspection(level, chassis, sim, scanIdx);
  assert.ok(scanInspect);
  assert.equal(scanInspect.event.action, 'SCAN');
  assert.ok(scanInspect.statusLabel.includes('IF [GAP]'));

  // Out-of-range step index clamps safely; empty events returns null
  assert.equal(E.buildStepInspection(level, chassis, sim, -5)?.stepIndex, 0);
  assert.equal(E.buildStepInspection(level, chassis, sim, 999)?.isLastStep, true);
  const emptySim = E.simulateProgram(level, chassis, []);
  assert.equal(E.buildStepInspection(level, chassis, emptySim, 0), null);

  // Ancestor block IDs highlight enclosing LOOP and IF containers
  const ancestors = E.collectAncestorBlockIds(program, 'jump-1');
  assert.deepEqual(ancestors, ['loop-1', 'if-1']);
  assert.deepEqual(E.collectAncestorBlockIds(program, 'move-1'), ['loop-1']);
  assert.deepEqual(E.collectAncestorBlockIds(program, 'loop-1'), []);
  assert.deepEqual(E.collectAncestorBlockIds(program, 'missing'), []);
});

test('Part placement particles generate distinct color-coded palettes, subtle UI bursts, and buoyant 3D puffs/sparkles', async () => {
  const PP = await import('./partParticles');
  const allParts: E.PartId[] = ['wheels', 'treads', 'thrusters', 'booster', 'laser', 'magnet'];
  const primaryColors = new Set<string>();

  for (const part of allParts) {
    const pal = PP.getPartParticlePalette(part);
    assert.ok(pal.primaryCss.startsWith('#'), `${part} has hex primary color`);
    assert.ok(pal.puffCss.startsWith('#'), `${part} has hex puff color`);
    assert.ok(pal.sparkleCss.startsWith('#'), `${part} has hex sparkle color`);
    primaryColors.add(pal.primaryCss);

    const uiBurst = PP.createPartPlacementBurst(part, 420, 310, 7);
    assert.equal(uiBurst.part, part);
    assert.equal(uiBurst.x, 420);
    assert.equal(uiBurst.y, 310);
    assert.equal(uiBurst.particles.length, 10);
    assert.equal(uiBurst.particles.filter((p) => p.kind === 'puff').length, 4);
    assert.equal(uiBurst.particles.filter((p) => p.kind === 'sparkle').length, 4);
    assert.equal(uiBurst.particles.filter((p) => p.kind === 'dot').length, 2);

    const burst3D = PP.createPartPlacement3DBurst(part, 7);
    assert.equal(burst3D.filter((p) => p.kind === 'puff').length, 6);
    assert.equal(burst3D.filter((p) => p.kind === 'sparkle').length, 8);
    assert.ok(burst3D.every((p) => p.vy > 0 && p.maxLife > 0.3 && p.maxLife <= 1.2));
  }

  // Every part has its own distinct signature color
  assert.equal(primaryColors.size, allParts.length);

  // Pillowy puff scale peaks near t=0.25 and fades cleanly to 0 at t=1
  assert.ok(PP.evaluatePuffScale(0.25) > 0.95);
  assert.ok(PP.evaluatePuffScale(0.25) > PP.evaluatePuffScale(0));
  assert.equal(PP.evaluatePuffScale(1), 0);
});

test('Code block complexity feedback classifies MOVE, JUMP/BOOST, LOOP, IF, and nested logic using existing BotMood states', async () => {
  const CF = await import('./codeFeedback');
  const validMoods = new Set(['neutral', 'happy', 'sad', 'confused', 'build', 'scan', 'boost', 'wallrun']);

  const simpleFb = CF.classifyCodeBlockFeedback('MOVE', 0);
  assert.equal(simpleFb.tier, 'simple');
  assert.equal(simpleFb.mood, 'happy');
  assert.equal(simpleFb.voicePhrase, null);
  assert.ok(validMoods.has(simpleFb.mood));

  const jumpFb = CF.classifyCodeBlockFeedback('JUMP', 0);
  assert.equal(jumpFb.tier, 'dynamic');
  assert.equal(jumpFb.mood, 'happy');

  const boostFb = CF.classifyCodeBlockFeedback('BOOST', 0);
  assert.equal(boostFb.tier, 'dynamic');
  assert.equal(boostFb.mood, 'boost');

  const loopFb = CF.classifyCodeBlockFeedback('LOOP', 0);
  assert.equal(loopFb.tier, 'loop');
  assert.equal(loopFb.mood, 'happy');
  assert.equal(loopFb.voicePhrase, 'giggle');
  assert.ok(loopFb.duration > simpleFb.duration);

  const ifGapFb = CF.classifyCodeBlockFeedback('IF', 0, 'GAP');
  assert.equal(ifGapFb.tier, 'conditional');
  assert.equal(ifGapFb.mood, 'scan');
  assert.equal(ifGapFb.voicePhrase, 'curious');

  const nested1Fb = CF.classifyCodeBlockFeedback('MOVE', 1);
  assert.equal(nested1Fb.tier, 'nested');
  assert.equal(nested1Fb.mood, 'happy');
  assert.equal(nested1Fb.voicePhrase, 'proud');

  const deepNestedFb = CF.classifyCodeBlockFeedback('JUMP', 2);
  assert.equal(deepNestedFb.tier, 'nested');
  assert.equal(deepNestedFb.voicePhrase, 'celebrate');
  assert.ok(deepNestedFb.duration > nested1Fb.duration);
  assert.ok(deepNestedFb.sparkCount > simpleFb.sparkCount);

  // Nesting depth calculation matches container hierarchy
  const prog: E.CodeBlock[] = [
    {
      id: 'root-move',
      type: 'MOVE'
    },
    {
      id: 'loop-a',
      type: 'LOOP',
      count: 2,
      children: [
        {
          id: 'if-b',
          type: 'IF',
          condition: 'GAP',
          children: [{ id: 'jump-c', type: 'JUMP' }]
        }
      ]
    }
  ];
  assert.equal(CF.computeBlockNestingDepth(prog, 'root-move'), 0);
  assert.equal(CF.computeBlockNestingDepth(prog, 'loop-a'), 0);
  assert.equal(CF.computeBlockNestingDepth(prog, 'if-b'), 1);
  assert.equal(CF.computeBlockNestingDepth(prog, 'jump-c'), 2);
});

test('Build equipment hints guide early levels step-by-step from empty chassis to code-ready', () => {
  // Level 1: recommends Wheels -> Laser and auto-shows
  const lvl1 = E.LEVELS[0];
  const empty = E.createEmptyChassis();
  const step1 = computeBuildEquipmentGuide(lvl1, empty, null);
  assert.equal(step1.autoShow, true);
  assert.equal(step1.nextStep?.part, 'wheels');
  assert.equal(step1.nextStep?.slotKey, '2,0');
  assert.equal(step1.completedCount, 0);
  assert.equal(step1.allRecommendedEquipped, false);

  // After attaching wheels, advances to front laser
  const withWheels = E.cloneChassis(empty);
  withWheels[2][0] = 'wheels';
  const step2 = computeBuildEquipmentGuide(lvl1, withWheels, null);
  assert.equal(step2.nextStep?.part, 'laser');
  assert.equal(step2.nextStep?.slotKey, '1,2');
  assert.equal(step2.completedCount, 1);

  // After attaching laser, bot is ready for coding
  const ready = E.cloneChassis(withWheels);
  ready[1][2] = 'laser';
  const done = computeBuildEquipmentGuide(lvl1, ready, null);
  assert.equal(done.allRecommendedEquipped, true);
  assert.equal(done.readyForCode, true);
  assert.equal(done.nextStep, null);

  // Level 2 (gaps): includes Jump Thrusters in recommended steps
  const lvl2Guide = computeBuildEquipmentGuide(E.LEVELS[1], empty, null);
  assert.equal(lvl2Guide.autoShow, true);
  assert.ok(lvl2Guide.steps.some((s) => s.part === 'thrusters'));

  // Level 4 (mud): recommends Monster Treads as drive base
  const lvl4Guide = computeBuildEquipmentGuide(E.LEVELS[3], empty, null);
  assert.equal(lvl4Guide.autoShow, true);
  assert.equal(lvl4Guide.nextStep?.part, 'treads');

  // Level 5 (ramps): recommends Turbo Booster
  const lvl5Guide = computeBuildEquipmentGuide(E.LEVELS[4], empty, null);
  assert.equal(lvl5Guide.autoShow, true);
  assert.ok(lvl5Guide.steps.some((s) => s.part === 'booster'));
});

test('Arcade Game Room includes all 5 action games and verifies solvable Power Connect, Wall Breaker, and Space Shooter logic', () => {
  const ids = Arcade.ARCADE_GAMES.map((g) => g.id);
  assert.deepEqual(ids, ['break_wall', 'connect_nodes', 'robot_run', 'space_shooter', 'planet_adventure']);

  // Wall Breaker layout + reward calculation
  const bricks1 = Arcade.createWallBreakerLayout(720, 420, 1);
  assert.equal(bricks1.length, 21);
  assert.ok(bricks1.some((b) => b.maxHp === 2));
  assert.ok(bricks1.some((b) => b.hasBonusBolt));
  assert.ok(Arcade.computeWallBreakerReward(240, true) > Arcade.computeWallBreakerReward(120, false));

  // Power Connect: all 3 boards start scrambled (unsolved) and solve cleanly when rotated to solved orientation
  for (let idx = 0; idx < 3; idx++) {
    const scrambled = Arcade.createConnectPuzzle(idx, false);
    assert.equal(scrambled.solved, false, `Board ${idx + 1} should start scrambled`);
    assert.ok(scrambled.totalCores >= 2);

    const solved = Arcade.createConnectPuzzle(idx, true);
    assert.equal(solved.solved, true, `Board ${idx + 1} should be 100% solvable`);
    assert.equal(solved.poweredCores, solved.totalCores);
  }

  // Rotating a rotatable tile increments its rotation mod 4 while locked tiles stay unchanged
  const b0 = Arcade.createConnectPuzzle(0, false);
  const rotatedSource = Arcade.rotateConnectTile(b0, 1, 0);
  assert.equal(rotatedSource.grid[1][0].rot, b0.grid[1][0].rot);
  const rotatedPipe = Arcade.rotateConnectTile(b0, 1, 1);
  assert.equal(rotatedPipe.grid[1][1].rot, (b0.grid[1][1].rot + 1) % 4);
  assert.ok(Arcade.computeConnectReward(3, 18) >= 75);

  // Space Shooter wave spawning & scoring
  const wave1 = Arcade.spawnSpaceWave(720, 1);
  const wave3 = Arcade.spawnSpaceWave(720, 3);
  assert.ok(wave1.length >= 5);
  assert.ok(wave3.length > wave1.length);
  assert.ok(wave3.some((e) => e.kind === 'saucer' && e.maxHp === 2));
  assert.ok(Arcade.computeSpaceShooterReward(300, 5) > Arcade.computeSpaceShooterReward(80, 1));
});

test('Part placement audio maps every PartId to a unique acoustic profile (mechanical clanks vs propulsion vs electronic hum)', () => {
  const allParts: E.PartId[] = ['wheels', 'treads', 'thrusters', 'booster', 'laser', 'magnet'];
  const profiles = allParts.map((p) => getPartPlacementSoundProfile(p));

  assert.equal(Object.keys(PART_PLACEMENT_SOUND_PROFILES).length, 6);
  // Every part must have a unique soundId and distinct base frequency
  const soundIds = new Set(profiles.map((p) => p.soundId));
  const baseFreqs = new Set(profiles.map((p) => p.baseFreqHz));
  assert.equal(soundIds.size, 6);
  assert.equal(baseFreqs.size, 6);

  // Actuators use mechanical clanks; logic/sensor parts use electronic humming; jets use propulsion signatures
  assert.equal(getPartPlacementSoundProfile('wheels').family, 'mechanical_actuator');
  assert.ok(getPartPlacementSoundProfile('wheels').characteristics.includes('mechanical_clank'));
  assert.equal(getPartPlacementSoundProfile('treads').family, 'mechanical_actuator');
  assert.ok(getPartPlacementSoundProfile('treads').characteristics.includes('heavy_iron_clank'));

  assert.equal(getPartPlacementSoundProfile('thrusters').family, 'propulsion_actuator');
  assert.equal(getPartPlacementSoundProfile('booster').family, 'propulsion_actuator');

  assert.equal(getPartPlacementSoundProfile('laser').family, 'electronic_logic');
  assert.ok(getPartPlacementSoundProfile('laser').characteristics.includes('electronic_hum'));
  assert.equal(getPartPlacementSoundProfile('magnet').family, 'electronic_logic');
  assert.ok(getPartPlacementSoundProfile('magnet').characteristics.includes('electronic_hum'));

  for (const prof of profiles) {
    assert.ok(prof.followUpDelayMs >= 80 && prof.followUpDelayMs <= 200);
    assert.ok(prof.label.length > 0);
  }
});

test('Action Dash trailing particle system scales emission & streak length by speed, surface, and turbo state', () => {
  const cruiseSlow = ActionTrail.computeActionTrailEmitConfig({
    speed: 11.5,
    surface: 'floor',
    isAirborne: false,
    turboActive: false,
    hasBooster: false,
    hasMagnet: false
  });
  const cruiseFast = ActionTrail.computeActionTrailEmitConfig({
    speed: 17.5,
    surface: 'floor',
    isAirborne: false,
    turboActive: false,
    hasBooster: true,
    hasMagnet: false
  });
  const wallRun = ActionTrail.computeActionTrailEmitConfig({
    speed: 15.5,
    surface: 'leftWall',
    isAirborne: false,
    turboActive: false,
    hasBooster: false,
    hasMagnet: true
  });
  const airborne = ActionTrail.computeActionTrailEmitConfig({
    speed: 15.5,
    surface: 'floor',
    isAirborne: true,
    turboActive: false,
    hasBooster: false,
    hasMagnet: false
  });
  const turbo = ActionTrail.computeActionTrailEmitConfig({
    speed: 24,
    surface: 'rightWall',
    isAirborne: false,
    turboActive: true,
    hasBooster: true,
    hasMagnet: true
  });

  assert.equal(cruiseSlow.state, 'cruise');
  assert.equal(wallRun.state, 'wallrun');
  assert.equal(airborne.state, 'airborne');
  assert.equal(turbo.state, 'turbo');

  // Higher speeds and turbo emit denser, longer streaks
  assert.ok(cruiseFast.spawnRatePerSec > cruiseSlow.spawnRatePerSec);
  assert.ok(cruiseFast.streakLength > cruiseSlow.streakLength);
  assert.ok(turbo.spawnRatePerSec > wallRun.spawnRatePerSec);
  assert.ok(turbo.streakLength > cruiseFast.streakLength);
  assert.ok(cruiseFast.palette.includes(0xf472b6), 'Booster adds pink accent to cruise trail');

  // Emitter anchors rotate cleanly by +/-90 deg when wall-running
  const floorAnchors = ActionTrail.computeTrailEmitterOffsets(0, true, true);
  assert.equal(floorAnchors.length, 5);
  const leftWallAnchors = ActionTrail.computeTrailEmitterOffsets(-Math.PI / 2, false, false);
  assert.equal(leftWallAnchors.length, 3);
  // Left/right wheel X offsets rotate into Y offsets when rolled -90 deg
  assert.ok(Math.abs(leftWallAnchors[0].offsetY - 0.56) < 0.01);
  assert.ok(Math.abs(leftWallAnchors[1].offsetY + 0.56) < 0.01);

  // Spawn sample places trail behind the bot (+Z) and drifting rearward (+vz)
  const sample = ActionTrail.createActionTrailSpawnSample({
    botX: 2.2,
    botY: 0.4,
    botZ: -40,
    botVx: 1.5,
    botVy: 0,
    speed: 18,
    anchor: floorAnchors[0],
    config: turbo,
    jitterX: 0.2,
    jitterY: -0.1,
    colorIdx: 1,
    lifeJitter: 0.5
  });
  assert.ok(sample.z > -40, 'Trail particle spawns behind the robot (+Z)');
  assert.ok(sample.vz > 0, 'Trail particle streams rearward (+Z)');
  assert.ok(turbo.palette.includes(sample.color));

  // Aerodynamic taper peaks near start and fades smoothly to 0 brightness at end of life
  const peak = ActionTrail.evaluateTrailParticleTransform(0.12, 1.0, 1.2);
  const mid = ActionTrail.evaluateTrailParticleTransform(0.55, 1.0, 1.2);
  const end = ActionTrail.evaluateTrailParticleTransform(1.0, 1.0, 1.2);
  assert.ok(peak.brightness > mid.brightness && mid.brightness > end.brightness);
  assert.equal(end.brightness, 0);
  assert.ok(peak.scaleZ > peak.scaleX * 0.8);

  // Continuous slipstream ribbon tapers cleanly from full glow at robot (t=0) to black/transparent at tail (t=1)
  const ribHead = ActionTrail.computeRibbonSegmentSample(0, 0.16, 0x38bdf8);
  const ribMid = ActionTrail.computeRibbonSegmentSample(0.5, 0.16, 0x38bdf8);
  const ribTail = ActionTrail.computeRibbonSegmentSample(1, 0.16, 0x38bdf8);
  assert.ok(ribHead.halfWidth > ribMid.halfWidth && ribMid.halfWidth > ribTail.halfWidth);
  assert.ok(ribHead.b > ribMid.b && ribMid.b > ribTail.b);
  assert.equal(ribTail.r, 0);
  assert.equal(ribTail.g, 0);
  assert.equal(ribTail.b, 0);
});

test('profileStorage persists, loads, computes stars, and builds fallback Action Dash chassis', () => {
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };

  // Empty storage falls back to default save profile
  const initial = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(initial.unlockedLevel, 1);
  assert.equal(ProfileStorage.computeTotalStarsEarned(initial), 0);

  // Persist custom stars + bonus stars and verify round-trip
  const custom: E.SaveProfile = {
    ...initial,
    unlockedLevel: 4,
    stars: { 1: 3, 2: 2, 3: 3 },
    bonusStars: { 9: { stars: 3, bonusStar: true } },
    daily: { ...initial.daily, dateKey: '2026-05-01', stars: 2 }
  };
  ProfileStorage.persistSaveProfile(custom, mockStorage);
  const reloaded = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(reloaded.unlockedLevel, 4);
  assert.equal(ProfileStorage.computeTotalStarsEarned(reloaded), 11);

  const lvl2 = E.getLevelById(2)!;
  const lvl9 = E.getLevelById(9)!;
  const dailyLvl = E.generateDailyChallenge('2026-05-01');
  assert.equal(ProfileStorage.getLevelSavedStars(reloaded, lvl2), 2);
  assert.equal(ProfileStorage.getLevelSavedStars(reloaded, lvl9), 3);
  assert.equal(ProfileStorage.getLevelSavedStars(reloaded, dailyLvl), 2);

  // ensureActionDashChassis populates full loadout when empty, preserves custom drive chassis
  const empty = E.createEmptyChassis();
  const filled = ProfileStorage.ensureActionDashChassis(empty);
  const filledInfo = E.computeChassisInfo(filled);
  assert.equal(filledInfo.hasDrive, true);
  assert.equal(filledInfo.hasFrontLaser, true);
  assert.equal(filledInfo.hasMagnet, true);

  const customChassis = E.createEmptyChassis();
  customChassis[2][1] = 'wheels';
  assert.strictEqual(ProfileStorage.ensureActionDashChassis(customChassis), customChassis);
});

test('responsiveCamera adapts 3D framing cleanly across phone portrait, phone landscape, tablet, and desktop', () => {
  assert.equal(ResponsiveCamera.classifyViewport(390, 844), 'phone-portrait');
  assert.equal(ResponsiveCamera.classifyViewport(844, 390), 'phone-landscape');
  assert.equal(ResponsiveCamera.classifyViewport(768, 1024), 'tablet');
  assert.equal(ResponsiveCamera.classifyViewport(1440, 900), 'desktop');

  const phoneBuild = ResponsiveCamera.computeResponsiveCameraFraming('BUILD_3D', 390, 844);
  const tabletBuild = ResponsiveCamera.computeResponsiveCameraFraming('BUILD_3D', 768, 1024);
  const desktopBuild = ResponsiveCamera.computeResponsiveCameraFraming('BUILD_3D', 1440, 900);

  // Narrow portrait screens pull camera further back & widen FOV so 3D robot & circuit board never clip
  assert.ok(phoneBuild.distanceScale > tabletBuild.distanceScale);
  assert.ok(tabletBuild.distanceScale > desktopBuild.distanceScale);
  assert.equal(desktopBuild.distanceScale, 1);
  assert.ok(phoneBuild.baseFov > desktopBuild.baseFov);
  assert.ok(phoneBuild.lookYOffset < 0, 'Phone portrait shifts look-at downward to frame robot above bottom dock');

  const phoneCircuit = ResponsiveCamera.computeResponsiveCameraFraming('CIRCUIT_3D', 390, 844);
  const desktopCircuit = ResponsiveCamera.computeResponsiveCameraFraming('CIRCUIT_3D', 1440, 900);
  assert.ok(phoneCircuit.distanceScale > 1.45 && desktopCircuit.distanceScale === 1);
});

test('save profile renaming validates, normalizes, migrates legacy saves, and persists across reloads', () => {
  // Normalization trims, collapses whitespace, strips control chars, truncates, and defaults safely
  assert.equal(ProfileStorage.normalizeProfileName(''), ProfileStorage.DEFAULT_PROFILE_NAME);
  assert.equal(ProfileStorage.normalizeProfileName('   \t\n  '), ProfileStorage.DEFAULT_PROFILE_NAME);
  assert.equal(ProfileStorage.normalizeProfileName(null), ProfileStorage.DEFAULT_PROFILE_NAME);
  assert.equal(ProfileStorage.normalizeProfileName('  Captain   Maya \u0007 '), 'Captain Maya');
  const overlong = 'Super Long Academy Engineer Name Beyond Limit';
  assert.equal(
    ProfileStorage.normalizeProfileName(overlong).length <= ProfileStorage.MAX_PROFILE_NAME_LENGTH,
    true
  );

  // Validation rejects empty/whitespace-only and overlong names with clear errors
  const emptyCheck = ProfileStorage.validateProfileName('   ');
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.error && emptyCheck.error.length > 0);

  const longCheck = ProfileStorage.validateProfileName('A'.repeat(ProfileStorage.MAX_PROFILE_NAME_LENGTH + 1));
  assert.equal(longCheck.valid, false);
  assert.ok(longCheck.error && longCheck.error.includes(String(ProfileStorage.MAX_PROFILE_NAME_LENGTH)));

  const okCheck = ProfileStorage.validateProfileName('  Nova   Builder  ');
  assert.equal(okCheck.valid, true);
  assert.equal(okCheck.normalized, 'Nova Builder');
  assert.equal(okCheck.error, null);

  // renameSaveProfile updates immutably on valid name and leaves save intact on invalid input
  const base = E.defaultSaveProfile();
  assert.equal(base.profileName, ProfileStorage.DEFAULT_PROFILE_NAME);

  const failedRename = ProfileStorage.renameSaveProfile(base, '   ');
  assert.equal(failedRename.ok, false);
  assert.strictEqual(failedRename.save, base);
  assert.ok(failedRename.error);

  const renamed = ProfileStorage.renameSaveProfile(base, '  Captain Maya  ');
  assert.equal(renamed.ok, true);
  assert.equal(renamed.error, null);
  assert.equal(renamed.save.profileName, 'Captain Maya');
  assert.equal(base.profileName, ProfileStorage.DEFAULT_PROFILE_NAME);

  // Legacy saves without profileName migrate cleanly and renamed profiles round-trip via storage
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };

  mockStorage.setItem(
    E.SAVE_KEY,
    JSON.stringify({ unlockedLevel: 3, totalBolts: 120, stars: { 1: 3 } })
  );
  const migrated = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(migrated.profileName, ProfileStorage.DEFAULT_PROFILE_NAME);
  assert.equal(migrated.unlockedLevel, 3);

  const updated = ProfileStorage.renameSaveProfile(migrated, 'Chief Leo');
  assert.equal(updated.ok, true);
  ProfileStorage.persistSaveProfile(updated.save, mockStorage);
  const reloaded = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(reloaded.profileName, 'Chief Leo');
  assert.equal(reloaded.unlockedLevel, 3);
  assert.equal(reloaded.totalBolts, 120);
});

test('BuildDock hover tooltip planner computes projected energy, drive swaps, par status, and level hazard relevance', () => {
  const lvl1 = E.LEVELS[0]; // Flat track, budget 100
  const lvl2 = E.LEVELS[1]; // Gap track
  const lvl4 = E.LEVELS[3]; // Mud track
  const lvl5 = E.LEVELS[4]; // Ramp track

  const empty = E.createEmptyChassis();
  const wheelsPlan = PartTooltips.computePartBuildPlan('wheels', empty, lvl1);
  assert.equal(wheelsPlan.part.cost, 20);
  assert.equal(wheelsPlan.netEnergyDelta, 20);
  assert.equal(wheelsPlan.projectedEnergy, 20);
  assert.equal(wheelsPlan.remainingAfter, lvl1.budget - 20);
  assert.equal(wheelsPlan.canAfford, true);
  assert.equal(wheelsPlan.withinParBudget, true);
  assert.equal(wheelsPlan.missionRelevance, 'required');

  // Equipping wheels and hovering treads shows net swap delta (+15) instead of double-counting (55)
  const withWheels = E.cloneChassis(empty);
  withWheels[2][0] = 'wheels';
  const treadsSwap = PartTooltips.computePartBuildPlan('treads', withWheels, lvl4);
  assert.equal(treadsSwap.replacesDrivePart, 'wheels');
  assert.equal(treadsSwap.netEnergyDelta, 15);
  assert.equal(treadsSwap.projectedEnergy, 35);
  assert.equal(treadsSwap.missionRelevance, 'recommended');
  assert.ok(treadsSwap.missionReason.toLowerCase().includes('mud'));

  // Equipping treads and hovering wheels shows energy savings (-15)
  const withTreads = E.cloneChassis(empty);
  withTreads[2][0] = 'treads';
  const wheelsSwap = PartTooltips.computePartBuildPlan('wheels', withTreads, lvl1);
  assert.equal(wheelsSwap.replacesDrivePart, 'treads');
  assert.equal(wheelsSwap.netEnergyDelta, -15);
  assert.equal(wheelsSwap.projectedEnergy, 20);

  // Level-specific hazard recommendations
  assert.equal(PartTooltips.computePartBuildPlan('thrusters', empty, lvl2).missionRelevance, 'recommended');
  assert.equal(PartTooltips.computePartBuildPlan('booster', empty, lvl5).missionRelevance, 'recommended');
  assert.equal(PartTooltips.computePartBuildPlan('laser', empty, lvl1).requiresFrontColumn, true);
  assert.equal(PartTooltips.computePartBuildPlan('laser', empty, lvl1).missionRelevance, 'required');

  // Over-budget calculation reports exact shortfall
  const tightLevel = { ...lvl1, budget: 50, parBudget: 45 };
  const nearFull = E.cloneChassis(empty);
  nearFull[2][0] = 'wheels'; // 20
  nearFull[1][2] = 'laser'; // 25 => used 45
  const overPlan = PartTooltips.computePartBuildPlan('thrusters', nearFull, tightLevel);
  assert.equal(overPlan.canAfford, false);
  assert.equal(overPlan.projectedEnergy, 80);
  assert.equal(overPlan.budgetShortfall, 30);
  assert.equal(overPlan.withinParBudget, false);
});

test('Low-Graphics mode reduces spark, puff, confetti, UI burst, and Action Dash trail particle counts and persists in SaveProfile', async () => {
  const PP = await import('./partParticles');
  const std = GraphicsConfig.getGraphicsQualityBudget(false);
  const low = GraphicsConfig.getGraphicsQualityBudget(true);

  assert.equal(std.lowGraphics, false);
  assert.equal(std.ambientMotesVisible, true);
  assert.equal(std.shadowsEnabled, true);
  assert.equal(std.maxRibbonCount, 3);

  assert.equal(low.lowGraphics, true);
  assert.equal(low.ambientMotesVisible, false);
  assert.equal(low.shadowsEnabled, false);
  assert.equal(low.maxPixelRatio, 1);
  assert.equal(low.maxRibbonCount, 1);
  assert.ok(low.sparkScale < 0.5 && low.puffScale < 0.5 && low.confettiScale < 0.5);

  // scaleParticleCount preserves minimum feedback while cutting counts substantially
  assert.equal(GraphicsConfig.scaleParticleCount(24, low.sparkScale, 2), 7);
  assert.equal(GraphicsConfig.scaleParticleCount(0, low.sparkScale, 2), 0);
  assert.equal(GraphicsConfig.scaleParticleCount(3, low.sparkScale, 2), 2);

  // 2D & 3D part placement bursts emit far fewer puffs/sparkles in low-graphics mode
  const uiStd = PP.createPartPlacementBurst('laser', 200, 200, 3, false);
  const uiLow = PP.createPartPlacementBurst('laser', 200, 200, 3, true);
  assert.equal(uiStd.particles.length, 10);
  assert.equal(uiLow.particles.length, 3);
  assert.equal(uiLow.particles.filter((p) => p.kind === 'puff').length, 1);
  assert.equal(uiLow.particles.filter((p) => p.kind === 'sparkle').length, 2);

  const burst3DStd = PP.createPartPlacement3DBurst('thrusters', 5, false);
  const burst3DLow = PP.createPartPlacement3DBurst('thrusters', 5, true);
  assert.equal(burst3DStd.length, 14);
  assert.ok(burst3DLow.length <= 6 && burst3DLow.length >= 4);

  // Action Dash trail emission rate and jump burst shrink cleanly in low-graphics mode
  const trailStd = ActionTrail.computeActionTrailEmitConfig({
    speed: 20,
    surface: 'floor',
    isAirborne: false,
    turboActive: true,
    hasBooster: true,
    hasMagnet: false,
    lowGraphics: false
  });
  const trailLow = ActionTrail.computeActionTrailEmitConfig({
    speed: 20,
    surface: 'floor',
    isAirborne: false,
    turboActive: true,
    hasBooster: true,
    hasMagnet: false,
    lowGraphics: true
  });
  assert.ok(trailLow.spawnRatePerSec < trailStd.spawnRatePerSec * 0.5);
  assert.ok(trailLow.burstCount < trailStd.burstCount * 0.5);

  // SaveProfile defaults lowGraphics to false, migrates legacy saves, and persists true across reloads
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };
  assert.equal(E.defaultSaveProfile().lowGraphics, false);
  mockStorage.setItem(E.SAVE_KEY, JSON.stringify({ unlockedLevel: 2 }));
  const migrated = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(migrated.lowGraphics, false);

  ProfileStorage.persistSaveProfile({ ...migrated, lowGraphics: true }, mockStorage);
  const reloaded = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(reloaded.lowGraphics, true);
});

test('Optional Challenge Timer computes level targets, evaluates speed-run bonus tiers, formats time, and persists best times', () => {
  // Formatting into compact M:SS.d notation
  assert.equal(ChallengeTimer.formatChallengeTime(0), '0:00.0');
  assert.equal(ChallengeTimer.formatChallengeTime(14250), '0:14.2');
  assert.equal(ChallengeTimer.formatChallengeTime(65999), '1:05.9');
  assert.equal(ChallengeTimer.formatChallengeTime(-500), '0:00.0');

  // Later / hazard-rich / bonus levels receive more generous target times than Level 1
  const lvl1Targets = ChallengeTimer.getLevelTimeTargets(E.LEVELS[0]);
  const lvl8Targets = ChallengeTimer.getLevelTimeTargets(E.LEVELS[7]);
  const bonusTargets = ChallengeTimer.getLevelTimeTargets(E.BONUS_LEVELS[0]);
  assert.ok(lvl1Targets.goldMs >= 30000);
  assert.ok(lvl1Targets.silverMs > lvl1Targets.goldMs);
  assert.ok(lvl1Targets.bronzeMs > lvl1Targets.silverMs);
  assert.ok(lvl8Targets.goldMs > lvl1Targets.goldMs);
  assert.ok(bonusTargets.goldMs > lvl1Targets.goldMs);

  // Speed-run evaluation awards Gold/Silver/Bronze bonus bolts only when timer is enabled
  const offEval = ChallengeTimer.evaluateSpeedRunBonus(10000, E.LEVELS[0], false);
  assert.equal(offEval.enabled, false);
  assert.equal(offEval.earned, false);
  assert.equal(offEval.bonusBolts, 0);

  const goldEval = ChallengeTimer.evaluateSpeedRunBonus(lvl1Targets.goldMs - 2000, E.LEVELS[0], true);
  assert.equal(goldEval.enabled, true);
  assert.equal(goldEval.tier, 'gold');
  assert.equal(goldEval.bonusBolts, ChallengeTimer.SPEED_RUN_BONUS_BOLTS.gold);
  assert.equal(goldEval.nextTargetMs, null);

  const silverEval = ChallengeTimer.evaluateSpeedRunBonus(lvl1Targets.goldMs + 1000, E.LEVELS[0], true);
  assert.equal(silverEval.tier, 'silver');
  assert.equal(silverEval.bonusBolts, ChallengeTimer.SPEED_RUN_BONUS_BOLTS.silver);
  assert.equal(silverEval.nextTargetMs, lvl1Targets.goldMs);

  const bronzeEval = ChallengeTimer.evaluateSpeedRunBonus(lvl1Targets.silverMs + 1000, E.LEVELS[0], true);
  assert.equal(bronzeEval.tier, 'bronze');
  assert.equal(bronzeEval.bonusBolts, ChallengeTimer.SPEED_RUN_BONUS_BOLTS.bronze);
  assert.equal(bronzeEval.nextTargetMs, lvl1Targets.silverMs);

  const slowEval = ChallengeTimer.evaluateSpeedRunBonus(lvl1Targets.bronzeMs + 5000, E.LEVELS[0], true);
  assert.equal(slowEval.tier, 'none');
  assert.equal(slowEval.earned, false);
  assert.equal(slowEval.bonusBolts, 0);

  // Personal best time updates immutably only on faster completions
  const key = ChallengeTimer.getTimerKeyForLevel(E.LEVELS[0]);
  assert.equal(key, 'level:1');
  assert.equal(ChallengeTimer.getTimerKeyForLevel(E.BONUS_LEVELS[0]), `bonus:${E.BONUS_LEVELS[0].id}`);
  assert.equal(
    ChallengeTimer.getTimerKeyForLevel(E.generateDailyChallenge('2026-06-15')),
    'daily:2026-06-15'
  );

  const first = ChallengeTimer.updateBestCompletionTime(undefined, key, 28500);
  assert.equal(first.isNewRecord, true);
  assert.equal(first.bestMs, 28500);

  const slower = ChallengeTimer.updateBestCompletionTime(first.next, key, 31000);
  assert.equal(slower.isNewRecord, false);
  assert.equal(slower.bestMs, 28500);

  const faster = ChallengeTimer.updateBestCompletionTime(slower.next, key, 19400);
  assert.equal(faster.isNewRecord, true);
  assert.equal(faster.bestMs, 19400);
  assert.equal(first.next[key], 28500);

  // SaveProfile defaults challengeTimerEnabled to false and persists toggle + bestTimes cleanly
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };
  assert.equal(E.defaultSaveProfile().challengeTimerEnabled, false);
  mockStorage.setItem(E.SAVE_KEY, JSON.stringify({ unlockedLevel: 2 }));
  const migrated = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(migrated.challengeTimerEnabled, false);
  assert.deepEqual(migrated.bestTimes, {});

  ProfileStorage.persistSaveProfile(
    { ...migrated, challengeTimerEnabled: true, bestTimes: faster.next },
    mockStorage
  );
  const reloaded = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(reloaded.challengeTimerEnabled, true);
  assert.equal(reloaded.bestTimes?.[key], 19400);
});

test('buildBeatenLevelHistory lists beaten main, bonus, and daily levels with star ratings and best completion times', () => {
  const emptySave = E.defaultSaveProfile();
  assert.deepEqual(LevelHistory.buildBeatenLevelHistory(emptySave), []);

  const populated: E.SaveProfile = {
    ...emptySave,
    unlockedLevel: 4,
    stars: {
      1: 3,
      2: 2,
      3: 0
    },
    bonusStars: {
      9: { stars: 3, bonusStar: true },
      10: 1
    },
    daily: {
      dateKey: '2026-11-22',
      stars: 3,
      streak: 2,
      lastCompletedDate: '2026-11-22',
      lastLoginDate: '2026-11-22'
    },
    bestTimes: {
      'level:1': 18400,
      'bonus:9': 34500,
      'daily:2026-11-22': 27200
    }
  };

  const history = LevelHistory.buildBeatenLevelHistory(populated);
  assert.equal(history.length, 5);

  assert.deepEqual(
    history.map((h) => h.key),
    ['level:1', 'level:2', 'bonus:9', 'bonus:10', 'daily:2026-11-22']
  );

  // Level 1: 3 stars + Gold speed-run best time
  assert.equal(history[0].kind, 'main');
  assert.equal(history[0].stars, 3);
  assert.equal(history[0].bestMs, 18400);
  assert.equal(history[0].speedTier, 'gold');

  // Level 2: 2 stars + untimed
  assert.equal(history[1].stars, 2);
  assert.equal(history[1].bestMs, null);
  assert.equal(history[1].speedTier, null);

  // Bonus Level 9: 3 stars + bonusStar + timed
  assert.equal(history[2].kind, 'bonus');
  assert.equal(history[2].stars, 3);
  assert.equal(history[2].bonusStar, true);
  assert.equal(history[2].bestMs, 34500);

  // Bonus Level 10: legacy numeric format 1 star + untimed
  assert.equal(history[3].kind, 'bonus');
  assert.equal(history[3].stars, 1);
  assert.equal(history[3].bonusStar, false);
  assert.equal(history[3].bestMs, null);

  // Daily Challenge: 3 stars + timed
  assert.equal(history[4].kind, 'daily');
  assert.equal(history[4].stars, 3);
  assert.equal(history[4].bestMs, 27200);
});

test('Planet Expedition derives abilities directly from equipped mission chassis parts and enforces terrain, bog, laser, magnet, and Exit Gate logic', () => {
  // Minimal Level 1 chassis (wheels + laser only)
  const basicChassis = E.createEmptyChassis();
  basicChassis[2][0] = 'wheels';
  basicChassis[1][2] = 'laser';
  const basicCaps = PlanetAdv.derivePlanetCapabilities(E.computeChassisInfo(basicChassis));
  assert.equal(basicCaps.hasWheels, true);
  assert.equal(basicCaps.hasLaser, true);
  assert.equal(basicCaps.hasTreads, false);
  assert.equal(basicCaps.hasThrusters, false);
  assert.equal(basicCaps.hasBooster, false);
  assert.equal(basicCaps.hasMagnet, false);

  // Full heavy explorer chassis
  const fullChassis = E.createEmptyChassis();
  fullChassis[2][0] = 'treads';
  fullChassis[2][1] = 'thrusters';
  fullChassis[2][2] = 'booster';
  fullChassis[1][2] = 'laser';
  fullChassis[0][1] = 'magnet';
  const fullCaps = PlanetAdv.derivePlanetCapabilities(E.computeChassisInfo(fullChassis));
  assert.equal(fullCaps.hasTreads, true);
  assert.equal(fullCaps.hasThrusters, true);
  assert.equal(fullCaps.hasBooster, true);
  assert.equal(fullCaps.hasLaser, true);
  assert.equal(fullCaps.hasMagnet, true);

  // Terrain ground elevation: spawn flat floor, smoothly sloped ramp, plateau top
  assert.equal(PlanetAdv.getPlanetGroundY(0, 3.5), 0);
  const rampMidY = PlanetAdv.getPlanetGroundY(0, -21.7);
  assert.ok(rampMidY > 0.2 && rampMidY < 1.35, `Ramp midpoint height should slope smoothly (got ${rampMidY})`);
  assert.equal(PlanetAdv.getPlanetGroundY(0, -28), 1.4);

  // Alien Spore Bog slowdown vs Treads immunity & airborne jump bypass
  const bogCheck = PlanetAdv.isPointInPlanetBog(0, -11.5);
  assert.equal(bogCheck.inBog, true);
  assert.equal(PlanetAdv.getPlanetBogSpeedMultiplier(basicCaps, true, false), 0.48);
  assert.equal(PlanetAdv.getPlanetBogSpeedMultiplier(basicCaps, true, true), 1);
  assert.equal(PlanetAdv.getPlanetBogSpeedMultiplier(fullCaps, true, false), 1);

  // Magnet Coil expands core/bolt attraction radius
  assert.ok(PlanetAdv.getPlanetPullRadius(fullCaps) > PlanetAdv.getPlanetPullRadius(basicCaps) * 2.5);

  // Laser cone targeting shatters crystal barriers in front of bot (yaw = 0 faces -Z)
  const activeBarriers = PlanetAdv.PLANET_CRYSTAL_BARRIERS.map((b) => ({ ...b, active: true }));
  const hitNorth = PlanetAdv.findLaserTargetBarrier(0, -12.0, 0, activeBarriers);
  assert.equal(hitNorth?.id, 'crystal_center');
  const missSouth = PlanetAdv.findLaserTargetBarrier(0, -12.0, Math.PI, activeBarriers);
  assert.equal(missSouth, null);

  // Waypoint compass switches from remaining Energy Cores to Exit Gate once all cores are collected
  const guideToCore = PlanetAdv.computePlanetObjectiveGuide(0, 3.5, PlanetAdv.PLANET_CORES, false);
  assert.equal(guideToCore.isGate, false);
  const guideToGate = PlanetAdv.computePlanetObjectiveGuide(0, -10, [], true);
  assert.equal(guideToGate.isGate, true);
  assert.equal(guideToGate.targetLabel, 'Exit Gate');

  // Reward math rewards winning with cores & speed higher than early exit
  const winReward = PlanetAdv.computePlanetAdventureReward({
    coresCollected: 5,
    boltsCollected: 8,
    crystalsShattered: 2,
    elapsedSeconds: 42,
    status: 'won'
  });
  const partialReward = PlanetAdv.computePlanetAdventureReward({
    coresCollected: 2,
    boltsCollected: 3,
    crystalsShattered: 0,
    elapsedSeconds: 30,
    status: 'exited'
  });
  assert.ok(winReward.boltsEarned > partialReward.boltsEarned);
  assert.ok(winReward.score > partialReward.score);
  assert.ok(ResponsiveCamera.computeResponsiveCameraFraming('PLANET_ADVENTURE_3D', 390, 844).baseFov >= 56);
});

test('Android app platform detection, tactile haptics, Back navigation priority, and PWA/Capacitor assets', () => {
  // Platform detection
  assert.equal(
    AndroidApp.detectMobilePlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'),
    'android'
  );
  assert.equal(
    AndroidApp.detectMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    'ios'
  );
  assert.equal(
    AndroidApp.detectMobilePlatform('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
    'desktop'
  );

  // Haptics controller respects enabled flag and dispatches expected vibration patterns
  const calls: Array<number | number[]> = [];
  const fakeVibrate = (p: number | number[]) => {
    calls.push(p);
    return true;
  };
  AndroidApp.HAPTICS.setEnabled(true);
  assert.equal(AndroidApp.HAPTICS.trigger('snapPart', fakeVibrate), true);
  assert.deepEqual(calls[0], AndroidApp.HAPTIC_PATTERNS.snapPart);
  AndroidApp.HAPTICS.setEnabled(false);
  assert.equal(AndroidApp.HAPTICS.trigger('victory', fakeVibrate), false);
  assert.equal(calls.length, 1);
  AndroidApp.HAPTICS.setEnabled(true);

  // Back button priority resolver
  const baseBack: AndroidApp.AndroidBackState = {
    mode: 'BUILD_3D',
    paused: false,
    hasActiveDemo: false,
    showClassCode: false,
    showSandbox: false,
    showParentDashboard: false,
    showGameRoom: false,
    showTrophies: false,
    showProfile: false,
    showSettings: false,
    showMap: false
  };
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, showSettings: true, showMap: true }),
    'close_settings'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, paused: true }),
    'resume_pause'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, mode: 'PAINT_BOOTH' }),
    'exit_paint_booth'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, mode: 'PLANET_ADVENTURE_3D' }),
    'exit_planet_adventure'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, mode: 'BUILD_3D' }),
    'open_pause'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, mode: 'VICTORY' }),
    'return_title_from_victory'
  );
  assert.equal(
    AndroidApp.resolveAndroidBackAction({ ...baseBack, mode: 'TITLE' }),
    'none'
  );

  // hapticsEnabled default + save persistence
  const def = E.defaultSaveProfile();
  assert.equal(def.hapticsEnabled, true);
  assert.equal(ProfileStorage.normalizeSaveProfileData({}).hapticsEnabled, true);
  assert.equal(ProfileStorage.normalizeSaveProfileData({ hapticsEnabled: false }).hapticsEnabled, false);

  // Required Android PWA icons & Capacitor packaging files exist
  for (const rel of [
    'public/icon.svg',
    'public/icon-maskable.svg',
    'public/apple-touch-icon.png',
    'public/pwa-192x192.png',
    'public/pwa-512x512.png',
    'public/pwa-maskable-512x512.png',
    'capacitor.config.ts',
    'ANDROID_BUILD.md'
  ]) {
    assert.ok(fs.existsSync(rel), `Expected Android asset to exist: ${rel}`);
    assert.ok(fs.statSync(rel).size > 200, `Expected non-empty Android asset: ${rel}`);
  }
});

test('trackSurface keeps robot flush on top of inclined pink ramps, mud basins, and flat tiles without sinking', () => {
  const track: E.TrackTile[] = [
    { type: 'start', crystal: false },
    { type: 'normal', crystal: false },
    { type: 'ramp', crystal: false },
    { type: 'mud', crystal: false },
    { type: 'gate', crystal: false }
  ];

  // Workshop turntable sits at y = 0, pitchX = 0; Tile 0 aligns with the blue Start pad (TRACK_START_Z)
  const workshop = TrackSurface.sampleTrackSurfaceAtZ(track, 0);
  assert.equal(workshop.y, 0);
  assert.equal(workshop.pitchX, 0);

  const startZ = TrackSurface.getTrackTileCenterZ(0);
  assert.equal(startZ, TrackSurface.TRACK_START_Z);
  assert.equal(TrackSurface.getTrackBotStopZ(track, 0), TrackSurface.TRACK_START_Z);

  const normalZ = TrackSurface.getTrackTileCenterZ(1);
  assert.ok(
    Math.abs(Math.abs(normalZ - startZ) - TrackSurface.TRACK_TILE_SPACING) < 1e-6,
    'First MOVE step from Tile 0 to Tile 1 must span exactly 1 tile spacing'
  );
  const normalSurf = TrackSurface.sampleTrackSurfaceAtZ(track, normalZ);
  assert.equal(normalSurf.y, 0);
  assert.equal(normalSurf.pitchX, 0);

  // Ramp tile elevates bot cleanly above wedge top (~0.358 at center) and slopes up along -Z
  const rampCenterZ = TrackSurface.getTrackTileCenterZ(2);
  const rampLow = TrackSurface.sampleTrackSurfaceAtZ(track, rampCenterZ + 1.0);
  const rampMid = TrackSurface.sampleTrackSurfaceAtZ(track, rampCenterZ);
  const rampHigh = TrackSurface.sampleTrackSurfaceAtZ(track, rampCenterZ - 1.0);
  assert.ok(rampMid.y > 0.35 && rampMid.y < 0.37, `Ramp center height should clear wedge top (got ${rampMid.y})`);
  assert.ok(rampHigh.y > rampMid.y && rampMid.y > rampLow.y, 'Ramp height must increase monotonically along -Z');
  assert.equal(rampMid.pitchX, TrackSurface.RAMP_WEDGE_ROT_X);

  // Mud tile top clearance matches mudTop slab
  const mudSurf = TrackSurface.sampleTrackSurfaceAtZ(track, TrackSurface.getTrackTileCenterZ(3));
  assert.equal(mudSurf.y, TrackSurface.MUD_TOP_SURFACE_Y);
  assert.equal(mudSurf.pitchX, 0);
});

test('disposeUtils recursively disposes geometries, materials, and non-shared textures while preserving shared atlases and preserved children', () => {
  const sharedTex = new THREE.Texture();
  let sharedDisposed = false;
  sharedTex.dispose = () => {
    sharedDisposed = true;
  };

  const ownedTex = new THREE.Texture();
  let ownedDisposed = false;
  ownedTex.dispose = () => {
    ownedDisposed = true;
  };

  const group = new THREE.Group();
  const preserved = new THREE.Group();
  const matShared = new THREE.MeshStandardMaterial({ map: sharedTex });
  const matOwned = new THREE.MeshStandardMaterial({ map: ownedTex });
  const meshA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matShared);
  const meshB = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), matOwned);
  const keptMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial());
  preserved.add(keptMesh);
  group.add(meshA, meshB, preserved);

  const stats = clearAndDisposeGroup(
    group,
    new Set([sharedTex]),
    new Set<THREE.Object3D>([preserved])
  );

  assert.equal(stats.geometries, 2);
  assert.equal(stats.materials, 2);
  assert.equal(stats.textures, 1);
  assert.equal(sharedDisposed, false, 'Shared atlas texture must not be disposed');
  assert.equal(ownedDisposed, true, 'Non-shared texture must be disposed');
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0], preserved);

  const keptStats = disposeObject3D(preserved);
  assert.equal(keptStats.geometries, 1);
  assert.equal(keptStats.materials, 1);
});

test('responsiveCamera adapts seamlessly for Android tablets in both landscape (1280x800) and portrait (800x1280)', () => {
  assert.equal(ResponsiveCamera.classifyViewport(1280, 800, true), 'tablet');
  assert.equal(ResponsiveCamera.classifyViewport(1024, 768, true), 'tablet');
  assert.equal(ResponsiveCamera.classifyViewport(800, 1280, true), 'tablet');
  assert.equal(ResponsiveCamera.classifyViewport(1440, 900, false), 'desktop');

  const tabLand = ResponsiveCamera.computeResponsiveCameraFraming('BUILD_3D', 1280, 800, true);
  const tabPort = ResponsiveCamera.computeResponsiveCameraFraming('BUILD_3D', 800, 1280, true);
  assert.equal(tabLand.formFactor, 'tablet');
  assert.equal(tabLand.orientation, 'landscape');
  assert.equal(tabPort.formFactor, 'tablet');
  assert.equal(tabPort.orientation, 'portrait');
  assert.ok(tabPort.distanceScale > tabLand.distanceScale);
  assert.ok(tabLand.lookYOffset < 0 && tabPort.lookYOffset < tabLand.lookYOffset);
});

test('native Capacitor Android tablet project and PWA manifest are configured for full-frame adaptive rotation', () => {
  const manifestXml = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  assert.ok(manifestXml.includes('android:screenOrientation="fullUser"'), 'Manifest should enable adaptive fullUser rotation');
  assert.ok(manifestXml.includes('android:resizeableActivity="true"'), 'Manifest should enable resizeableActivity for tablets');
  assert.ok(manifestXml.includes('android:largeScreens="true"'), 'Manifest should declare largeScreens support');
  assert.ok(manifestXml.includes('android:xlargeScreens="true"'), 'Manifest should declare xlargeScreens support');
  assert.ok(manifestXml.includes('android.permission.VIBRATE'), 'Manifest should include VIBRATE permission');

  const mainActivity = fs.readFileSync(
    'android/app/src/main/java/com/sparkbot/academy/MainActivity.java',
    'utf8'
  );
  assert.ok(mainActivity.includes('setDecorFitsSystemWindows'), 'MainActivity should configure edge-to-edge window');
  assert.ok(
    mainActivity.includes('BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE'),
    'MainActivity should enable sticky immersive full-frame mode'
  );
  assert.ok(mainActivity.includes('FLAG_KEEP_SCREEN_ON'), 'MainActivity should keep tablet screen awake');

  const viteCfg = fs.readFileSync('vite.config.ts', 'utf8');
  assert.ok(viteCfg.includes("display: 'fullscreen'"), 'PWA manifest should use fullscreen display');
  assert.ok(viteCfg.includes("orientation: 'any'"), 'PWA manifest should support adaptive orientation');
});

test('CodeDock tiered complexity system classifies T1/T2/T3 paths and drives optimal vs. sub-optimal drop-zone feedback', async () => {
  const CF = await import('./codeFeedback');

  // 1. Individual block tier classification (Tier 1 Linear -> Tier 2 Structured -> Tier 3 Nested)
  assert.equal(CF.classifyBlockComplexityTier('MOVE', 0).tierRank, 1);
  assert.equal(CF.classifyBlockComplexityTier('MOVE', 0).complexityTier, 'tier1_linear');
  assert.equal(CF.classifyBlockComplexityTier('JUMP', 0).tierRank, 1);
  assert.equal(CF.classifyBlockComplexityTier('LOOP', 0).tierRank, 2);
  assert.equal(CF.classifyBlockComplexityTier('IF', 0).complexityTier, 'tier2_structured');
  assert.equal(CF.classifyBlockComplexityTier('MOVE', 1).tierRank, 2);
  assert.equal(CF.classifyBlockComplexityTier('IF', 1).tierRank, 3);
  assert.equal(CF.classifyBlockComplexityTier('IF', 1).complexityTier, 'tier3_nested');
  assert.equal(CF.classifyBlockComplexityTier('JUMP', 2).tierRank, 3);

  // 2. Empty program -> idle Tier 1
  const emptyEval = CF.evaluateProgramLogicTiers([], {
    parBlocks: 3,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(emptyEval.tierRank, 1);
  assert.equal(emptyEval.optimality, 'idle');
  assert.equal(emptyEval.reason, 'empty');
  assert.equal(emptyEval.zoneStates.ROOT.optimality, 'idle');

  // 3. Clean linear path within par -> Tier 1 optimal
  const linearProg: E.CodeBlock[] = [
    { id: 'm1', type: 'MOVE' },
    { id: 'j1', type: 'JUMP' }
  ];
  const linearEval = CF.evaluateProgramLogicTiers(linearProg, {
    parBlocks: 2,
    loopUnlocked: false,
    ifUnlocked: false
  });
  assert.equal(linearEval.tierRank, 1);
  assert.equal(linearEval.optimality, 'optimal');
  assert.equal(linearEval.reason, 'within_par_clean');
  assert.equal(linearEval.zoneStates.ROOT.optimality, 'optimal');

  // 4. Structured LOOP with child within par -> Tier 2 optimal on both ROOT and LOOP drop zones
  const loopProg: E.CodeBlock[] = [
    { id: 'loop1', type: 'LOOP', count: 3, children: [{ id: 'm1', type: 'MOVE' }] }
  ];
  const loopEval = CF.evaluateProgramLogicTiers(loopProg, {
    parBlocks: 2,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(loopEval.tierRank, 2);
  assert.equal(loopEval.optimality, 'optimal');
  assert.equal(loopEval.reason, 'within_par_structured');
  assert.equal(loopEval.zoneStates.ROOT.optimality, 'optimal');
  assert.equal(loopEval.zoneStates.loop1.optimality, 'optimal');

  // 5. Nested LOOP -> IF -> JUMP within par -> Tier 3 optimal
  const nestedProg: E.CodeBlock[] = [
    {
      id: 'loop1',
      type: 'LOOP',
      count: 3,
      children: [
        { id: 'if1', type: 'IF', condition: 'GAP', children: [{ id: 'j1', type: 'JUMP' }] }
      ]
    }
  ];
  const nestedEval = CF.evaluateProgramLogicTiers(nestedProg, {
    parBlocks: 3,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(nestedEval.tierRank, 3);
  assert.equal(nestedEval.optimality, 'optimal');
  assert.equal(nestedEval.zoneStates.loop1.tierRank, 3);
  assert.equal(nestedEval.zoneStates.if1.optimality, 'optimal');

  // 6. Empty container -> suboptimal (empty_container) on both container drop zone and ROOT
  const emptyLoopProg: E.CodeBlock[] = [{ id: 'loopEmpty', type: 'LOOP', count: 2, children: [] }];
  const emptyLoopEval = CF.evaluateProgramLogicTiers(emptyLoopProg, {
    parBlocks: 2,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(emptyLoopEval.optimality, 'suboptimal');
  assert.equal(emptyLoopEval.reason, 'empty_container');
  assert.equal(emptyLoopEval.zoneStates.loopEmpty.optimality, 'suboptimal');
  assert.equal(emptyLoopEval.zoneStates.loopEmpty.reason, 'empty_container');

  // 7. 3+ repeated MOVE blocks when LOOP is unlocked -> suboptimal (redundant_sequence)
  const unrolledProg: E.CodeBlock[] = [
    { id: 'm1', type: 'MOVE' },
    { id: 'm2', type: 'MOVE' },
    { id: 'm3', type: 'MOVE' }
  ];
  const unrolledEval = CF.evaluateProgramLogicTiers(unrolledProg, {
    parBlocks: 4,
    loopUnlocked: true,
    ifUnlocked: false
  });
  assert.equal(unrolledEval.optimality, 'suboptimal');
  assert.equal(unrolledEval.reason, 'redundant_sequence');

  // 8. Duplicate nested IF [GAP] inside IF [GAP] -> suboptimal (redundant_nesting)
  const dupIfProg: E.CodeBlock[] = [
    {
      id: 'ifOuter',
      type: 'IF',
      condition: 'GAP',
      children: [
        { id: 'ifInner', type: 'IF', condition: 'GAP', children: [{ id: 'j1', type: 'JUMP' }] }
      ]
    }
  ];
  const dupIfEval = CF.evaluateProgramLogicTiers(dupIfProg, {
    parBlocks: 4,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(dupIfEval.optimality, 'suboptimal');
  assert.equal(dupIfEval.reason, 'redundant_nesting');
  assert.equal(dupIfEval.zoneStates.ifOuter.optimality, 'suboptimal');

  // 9. Over-par program -> suboptimal (over_par)
  const overParProg: E.CodeBlock[] = [
    { id: 'l1', type: 'LOOP', count: 2, children: [{ id: 'm1', type: 'MOVE' }] },
    { id: 'b1', type: 'BOOST' },
    { id: 'j1', type: 'JUMP' },
    { id: 'm2', type: 'MOVE' }
  ];
  const overParEval = CF.evaluateProgramLogicTiers(overParProg, {
    parBlocks: 2,
    loopUnlocked: true,
    ifUnlocked: true
  });
  assert.equal(overParEval.optimality, 'suboptimal');
  assert.equal(overParEval.reason, 'over_par');

  // 10. Live drop-zone preview: dragging MOVE over empty LOOP predicts optimal; duplicate IF predicts suboptimal; TRASH returns null
  const previewFillLoop = CF.previewDropTargetOptimality(
    emptyLoopProg,
    { parBlocks: 2, loopUnlocked: true, ifUnlocked: true },
    { kind: 'new', type: 'MOVE', targetZoneId: 'loopEmpty' }
  );
  assert.ok(previewFillLoop);
  assert.equal(previewFillLoop?.isPreview, true);
  assert.equal(previewFillLoop?.optimality, 'optimal');

  const baseIfProg: E.CodeBlock[] = [
    { id: 'ifA', type: 'IF', condition: 'GAP', children: [{ id: 'j1', type: 'JUMP' }] }
  ];
  const previewDupIf = CF.previewDropTargetOptimality(
    baseIfProg,
    { parBlocks: 4, loopUnlocked: true, ifUnlocked: true },
    { kind: 'new', type: 'IF', condition: 'GAP', targetZoneId: 'ifA' }
  );
  assert.ok(previewDupIf);
  assert.equal(previewDupIf?.optimality, 'suboptimal');
  assert.equal(previewDupIf?.reason, 'redundant_nesting');

  const previewTrash = CF.previewDropTargetOptimality(
    baseIfProg,
    { parBlocks: 4, loopUnlocked: true, ifUnlocked: true },
    { kind: 'existing', type: 'JUMP', blockId: 'j1', targetZoneId: 'TRASH' }
  );
  assert.equal(previewTrash, null);
});

test('CodeBlock magnetic snap pulls dragged blocks toward valid slots, scales up on engagement, and guards descendant drops', async () => {
  const CF = await import('./codeFeedback');

  const slotRect = { left: 100, top: 500, right: 360, bottom: 556, width: 260, height: 56 };
  const lastBlockRect = { left: 110, top: 506, right: 154, bottom: 550, width: 44, height: 44 };

  // Empty slot anchor centers inside the slot; populated slot trails last child clamped inside bounds
  const emptyAnchor = CF.computeSlotAnchorPoint(slotRect, null);
  assert.equal(emptyAnchor.x, 230);
  assert.equal(emptyAnchor.y, 528);

  const trailingAnchor = CF.computeSlotAnchorPoint(slotRect, lastBlockRect, 44);
  assert.equal(trailingAnchor.x, 154 + 22 + 6);
  assert.equal(trailingAnchor.y, 528);

  // Far away pointer stays unengaged with zero pull and neutral 1.0 scale
  const far = CF.computeMagneticDragPosition(10, 200, slotRect, null);
  assert.equal(far.engaged, false);
  assert.equal(far.x, 10);
  assert.equal(far.y, 200);
  assert.equal(far.pullFactor, 0);
  assert.equal(far.scale, 1);

  // Approaching within proximity margin engages subtle magnetic pull & gentle scale-up
  const nearEdge = CF.computeMagneticDragPosition(230, 488, slotRect, null);
  assert.equal(nearEdge.engaged, true);
  assert.ok(nearEdge.y > 488, 'Magnetic pull should gently tug pointer downward toward slot center');
  assert.ok(nearEdge.scale > 1 && nearEdge.scale <= 1.07);

  // Directly inside the slot pulls toward trailing slot anchor with clamped offset and peak subtle scale-up
  const inside = CF.computeMagneticDragPosition(260, 540, slotRect, lastBlockRect);
  assert.equal(inside.engaged, true);
  assert.ok(inside.x < 260, 'Should pull left toward trailing anchor inside slot');
  assert.ok(inside.y < 540, 'Should pull upward toward vertical slot center');
  assert.ok(Math.hypot(inside.x - 260, inside.y - 540) <= 24.01, 'Magnetic offset stays subtly bounded');
  assert.equal(inside.scale, 1.07);

  // Descendant guard prevents dropping a LOOP/IF container into itself or its nested children
  const prog: E.CodeBlock[] = [
    {
      id: 'outerLoop',
      type: 'LOOP',
      count: 2,
      children: [{ id: 'innerIf', type: 'IF', condition: 'GAP', children: [{ id: 'j1', type: 'JUMP' }] }]
    },
    { id: 'siblingLoop', type: 'LOOP', count: 2, children: [] }
  ];
  assert.equal(CF.isDescendantBlockId(prog, 'outerLoop', 'outerLoop'), true);
  assert.equal(CF.isDescendantBlockId(prog, 'outerLoop', 'innerIf'), true);
  assert.equal(CF.isDescendantBlockId(prog, 'outerLoop', 'j1'), true);
  assert.equal(CF.isDescendantBlockId(prog, 'outerLoop', 'siblingLoop'), false);
  assert.equal(CF.isDescendantBlockId(prog, 'outerLoop', 'ROOT'), false);
});

test('trackSurface stops robot cleanly in front of the closed gate wall and 3D circuit board at the end of the track', () => {
  const track = E.LEVELS[0].track;
  const gateIdx = track.length - 1;
  const gateTileZ = TrackSurface.getTrackTileCenterZ(gateIdx);
  const gateWallZ = TrackSurface.getGateWallZ(track);
  const circuitBoardZ = TrackSurface.getCircuitBoardZ(track);
  const botStopZ = TrackSurface.getTrackBotStopZ(track, gateIdx);

  // Robot stands squarely on the gate deck slab (within +/- 1.67 of gateTileZ)
  assert.ok(Math.abs(botStopZ - gateTileZ) < 1.5, 'Bot stop Z should remain on the gate tile deck');

  // Robot front bumper/laser stays strictly in front (+Z) of both the circuit board front (+0.28) and steel doors (+0.175)
  const botNoseZ = botStopZ - TrackSurface.BOT_FRONT_EXTENT_Z;
  const circuitFrontZ = circuitBoardZ + 0.28;
  const doorFrontZ = gateWallZ + 0.175;
  assert.ok(botNoseZ > circuitFrontZ + 0.5, `Expected >0.5m clearance before circuit board (got ${botNoseZ - circuitFrontZ})`);
  assert.ok(botNoseZ > doorFrontZ + 0.9, `Expected >0.9m clearance before closed gate doors (got ${botNoseZ - doorFrontZ})`);

  // Overshooting tile index or raw Z coordinate is strictly clamped at the stop line while gate is closed
  assert.equal(TrackSurface.getTrackBotStopZ(track, gateIdx + 4), botStopZ);
  assert.equal(TrackSurface.clampTrackBotZBeforeClosedGate(track, gateWallZ - 5, false), botStopZ);

  // Once the gate opens (Action Dash), Z is no longer clamped by the closed gate barrier
  assert.equal(TrackSurface.clampTrackBotZBeforeClosedGate(track, gateWallZ - 5, true), gateWallZ - 5);

  // In CIRCUIT_3D, the robot's wheels stay 100% supported on the widened Gate Landing Bay (never hanging over air or a preceding gap)
  const deckHalfW = TrackSurface.GATE_DECK_WIDTH * 0.5;
  assert.ok(
    Math.abs(TrackSurface.CIRCUIT_BOT_X) + TrackSurface.BOT_HALF_WIDTH_X <= deckHalfW - 0.1,
    'All robot wheels must remain supported inside the Gate Landing Bay width'
  );
  // Circuit board laser emitter sits cleanly above robot head height (~1.7m)
  assert.ok(TrackSurface.CIRCUIT_BOARD_Y >= 2.9, 'Circuit board emitter should sit clearly above robot head');
});

test('First Mission guided interactive tutorial progresses cleanly through Build and Code phases with non-overlapping spotlight card placement', async () => {
  const MT = await import('./missionTutorial');
  const lvl1 = E.LEVELS[0];
  const lvl2 = E.LEVELS[1];

  // Activation gating: only shows on Mission 1 story level during BUILD_3D or CODE_3D when not done (or replayed)
  assert.equal(
    MT.shouldShowMissionTutorial({
      level: lvl1,
      mode: 'BUILD_3D',
      tutorialDone: false,
      tutorialForceActive: false,
      tutorialDismissed: false,
      hasBlockingOverlay: false
    }),
    true
  );
  assert.equal(
    MT.shouldShowMissionTutorial({
      level: lvl1,
      mode: 'BUILD_3D',
      tutorialDone: true,
      tutorialForceActive: false,
      tutorialDismissed: false,
      hasBlockingOverlay: false
    }),
    false
  );
  assert.equal(
    MT.shouldShowMissionTutorial({
      level: lvl1,
      mode: 'BUILD_3D',
      tutorialDone: true,
      tutorialForceActive: true,
      tutorialDismissed: false,
      hasBlockingOverlay: false
    }),
    true
  );
  assert.equal(
    MT.shouldShowMissionTutorial({
      level: lvl2,
      mode: 'BUILD_3D',
      tutorialDone: false,
      tutorialForceActive: false,
      tutorialDismissed: false,
      hasBlockingOverlay: false
    }),
    false
  );
  assert.equal(
    MT.shouldShowMissionTutorial({
      level: lvl1,
      mode: 'SIMULATING',
      tutorialDone: false,
      tutorialForceActive: false,
      tutorialDismissed: false,
      hasBlockingOverlay: false
    }),
    false
  );

  // Step 1: Energy budget spotlight on fresh empty Mission 1 chassis
  const ack = new Set<import('./missionTutorial').MissionTutorialStepId>();
  const chassis = E.createEmptyChassis();
  const s1 = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'BUILD_3D',
    chassis,
    program: [],
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s1?.id, 'build_budget');
  assert.equal(s1?.stepNumber, 1);
  assert.equal(s1?.primarySelector, '[data-testid="dock-energy-meter"]');

  // Step 2: Acknowledging budget highlights Wheels part + bottom slot; selecting Wheels shifts primary spotlight to slot 2,0
  ack.add('build_budget');
  const s2Part = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'BUILD_3D',
    chassis,
    program: [],
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s2Part?.id, 'build_wheels');
  assert.equal(s2Part?.primarySelector, '[data-part="wheels"]');
  assert.equal(s2Part?.secondarySelector, '[data-slot="2,0"]');

  const s2Slot = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'BUILD_3D',
    chassis,
    program: [],
    selectedPart: 'wheels',
    acknowledgedSteps: ack
  });
  assert.equal(s2Slot?.id, 'build_wheels');
  assert.equal(s2Slot?.primarySelector, '[data-slot="2,0"]');
  assert.equal(s2Slot?.secondarySelector, undefined);

  // Step 3: Equipping wheels advances automatically to Front Laser spotlight
  chassis[2][0] = 'wheels';
  const s3 = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'BUILD_3D',
    chassis,
    program: [],
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s3?.id, 'build_laser');
  assert.equal(s3?.primarySelector, '[data-part="laser"]');
  assert.equal(s3?.secondarySelector, '[data-slot="1,2"]');

  // Step 4: Equipping front laser advances automatically to #toCodeBtn
  chassis[1][2] = 'laser';
  const s4 = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'BUILD_3D',
    chassis,
    program: [],
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s4?.id, 'build_next_phase');
  assert.equal(s4?.primarySelector, '#toCodeBtn');

  // Step 5: Entering CODE_3D highlights MOVE block + ROOT rail with live 0/5 -> 2/5 progress
  const s5Empty = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'CODE_3D',
    chassis,
    program: [],
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s5Empty?.id, 'code_add_move');
  assert.equal(s5Empty?.progress?.current, 0);
  assert.equal(s5Empty?.progress?.target, 5);
  assert.equal(s5Empty?.allowManualNext, false);

  const partialProgram: E.CodeBlock[] = [
    { id: 'm1', type: 'MOVE' },
    { id: 'm2', type: 'MOVE' }
  ];
  const s5Partial = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'CODE_3D',
    chassis,
    program: partialProgram,
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s5Partial?.id, 'code_add_move');
  assert.equal(s5Partial?.progress?.current, 2);
  assert.equal(s5Partial?.allowManualNext, true);

  // Step 6: Adding 5 MOVE blocks auto-advances to inspecting the program rail
  const fullProgram: E.CodeBlock[] = [
    { id: 'm1', type: 'MOVE' },
    { id: 'm2', type: 'MOVE' },
    { id: 'm3', type: 'MOVE' },
    { id: 'm4', type: 'MOVE' },
    { id: 'm5', type: 'MOVE' }
  ];
  const s6 = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'CODE_3D',
    chassis,
    program: fullProgram,
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s6?.id, 'code_rail_review');
  assert.equal(s6?.primarySelector, '[data-drop-zone="ROOT"]');

  // Step 7: Acknowledging rail review advances to final Run Program spotlight (#runCodeBtn)
  ack.add('code_rail_review');
  const s7 = MT.resolveMissionTutorialStep({
    level: lvl1,
    mode: 'CODE_3D',
    chassis,
    program: fullProgram,
    selectedPart: null,
    acknowledgedSteps: ack
  });
  assert.equal(s7?.id, 'code_run');
  assert.equal(s7?.stepNumber, 7);
  assert.equal(s7?.primarySelector, '#runCodeBtn');
  assert.equal(s7?.secondarySelector, '#stepCodeBtn');

  // Spotlight card placement clamps safely inside mobile portrait viewports and stays above bottom dock targets
  const placedMobile = MT.computeSpotlightCardPosition({
    viewportWidth: 360,
    viewportHeight: 740,
    primaryRect: { left: 28, top: 650, width: 64, height: 64 },
    secondaryRect: { left: 140, top: 380, width: 48, height: 48 },
    cardHeight: 170
  });
  assert.ok(placedMobile.left >= 12 && placedMobile.left + placedMobile.width <= 348);
  assert.ok(placedMobile.top >= 96 && placedMobile.top + 170 <= 650);
});

test('buildLivePathPreview maps MOVE/JUMP/BOOST/LOOP/IF trajectories, gate-stop Z, hazards, and ancestor hover matching', async () => {
  const PP = await import('./pathPreview');
  const lvl2 = E.LEVELS[1]; // Level 2 has a gap tile
  const chassis = E.createEmptyChassis();
  chassis[2][0] = 'wheels';
  chassis[1][0] = 'thrusters';
  chassis[1][2] = 'laser';

  // Empty program yields empty endpoint
  const emptyPrev = PP.buildLivePathPreview(lvl2, chassis, []);
  assert.equal(emptyPrev.endpoint.status, 'empty');
  assert.equal(emptyPrev.segments.length, 0);

  // Empty container yields empty status with helpful label
  const emptyLoopPrev = PP.buildLivePathPreview(lvl2, chassis, [
    { id: 'loop0', type: 'LOOP', count: 2, children: [] }
  ]);
  assert.equal(emptyLoopPrev.endpoint.status, 'empty');
  assert.match(emptyLoopPrev.endpoint.summaryLabel, /Empty Loop/i);

  // Short program stops cleanly at exact intermediate tile Z
  const shortPrev = PP.buildLivePathPreview(lvl2, chassis, [{ id: 'm1', type: 'MOVE' }]);
  assert.equal(shortPrev.endpoint.status, 'short');
  assert.equal(shortPrev.endpoint.tileIndex, 1);
  assert.equal(shortPrev.endpoint.z, TrackSurface.getTrackBotStopZ(lvl2.track, 1));

  // Missing front laser at gate reports missing_part hazard at gateIndex
  const noLaserChassis = E.cloneChassis(chassis);
  noLaserChassis[1][2] = null;
  const lvl1 = E.LEVELS[0];
  const fiveMoves: E.CodeBlock[] = Array.from({ length: 5 }, (_, i) => ({
    id: `m_${i}`,
    type: 'MOVE' as const
  }));
  const noLaserPrev = PP.buildLivePathPreview(lvl1, noLaserChassis, fiveMoves);
  assert.equal(noLaserPrev.endpoint.status, 'hazard');
  assert.equal(noLaserPrev.endpoint.missingPart, 'laser');

  // Complete Level 1 with full chassis reaches gate cleanly and collects all crystals
  const winPrev = PP.buildLivePathPreview(lvl1, chassis, fiveMoves);
  assert.equal(winPrev.endpoint.status, 'win');
  assert.equal(winPrev.endpoint.tileIndex, lvl1.track.length - 1);
  assert.equal(
    winPrev.endpoint.z,
    TrackSurface.getTrackBotStopZ(lvl1.track, lvl1.track.length - 1)
  );
  assert.equal(winPrev.endpoint.collectedCrystals, winPrev.endpoint.totalCrystals);

  // LOOP + IF program produces repeated segments with ancestorBlockIds and SCAN markers
  const loopIfProg: E.CodeBlock[] = [
    {
      id: 'loop_outer',
      type: 'LOOP',
      count: 3,
      children: [
        {
          id: 'if_gap',
          type: 'IF',
          condition: 'GAP',
          children: [{ id: 'jump_inner', type: 'JUMP' }]
        },
        { id: 'move_inner', type: 'MOVE' }
      ]
    }
  ];
  const loopPrev = PP.buildLivePathPreview(lvl2, chassis, loopIfProg);
  assert.ok(loopPrev.scans.length >= 1, 'IF sensor scan markers recorded');
  const jumpSeg = loopPrev.segments.find((s) => s.action === 'JUMP');
  assert.ok(jumpSeg, 'IF [GAP] matched and generated a JUMP segment');
  assert.deepEqual(jumpSeg.ancestorBlockIds, ['loop_outer', 'if_gap']);

  // Ancestor hover highlights child JUMP & MOVE when hovering outer LOOP
  assert.equal(PP.isPreviewItemHighlighted(jumpSeg, 'loop_outer'), true);
  assert.equal(PP.isPreviewItemHighlighted(jumpSeg, 'if_gap'), true);
  assert.equal(PP.isPreviewItemHighlighted(jumpSeg, 'jump_inner'), true);
  assert.equal(PP.isPreviewItemHighlighted(jumpSeg, 'unrelated_id'), false);

  // JUMP parabolic arc rises clearly above track surface at midpoint
  const jumpMid = PP.samplePathSegmentPoint(lvl2.track, jumpSeg, 0.5);
  assert.ok(jumpMid.y > 1.5, 'JUMP trajectory peak rises >1.5m above track deck');

  // Stepping into a gap without jumping produces gap hazard beacon on the gap tile
  const gapFailPrev = PP.buildLivePathPreview(lvl2, chassis, [
    { id: 'm_a', type: 'MOVE' },
    { id: 'm_b', type: 'MOVE' },
    { id: 'm_c', type: 'MOVE' }
  ]);
  assert.equal(gapFailPrev.endpoint.status, 'hazard');
  assert.equal(gapFailPrev.endpoint.failCode, 'gap');
  assert.equal(gapFailPrev.segments[gapFailPrev.segments.length - 1].status, 'fall');
});

test('programHistory enforces structural dedupe, 30-step cap, undo/redo round-trips, and branch clearing', async () => {
  const PH = await import('./programHistory');
  let hist = PH.createEmptyProgramHistory();
  let cur: E.CodeBlock[] = [];

  // Structural equality ignores no-op updates
  const noOpHist = PH.pushProgramHistory(hist, [], []);
  assert.strictEqual(noOpHist, hist);

  // Push 35 distinct steps -> bounded cleanly to MAX_PROGRAM_HISTORY (30)
  for (let i = 1; i <= 35; i++) {
    const next: E.CodeBlock[] = [...cur, { id: `b_${i}`, type: 'MOVE' }];
    hist = PH.pushProgramHistory(hist, cur, next);
    cur = next;
  }
  assert.equal(hist.past.length, PH.MAX_PROGRAM_HISTORY);
  assert.equal(hist.future.length, 0);
  assert.equal(cur.length, 35);

  // Undo steps backward and restores deep-cloned previous states
  const u1 = PH.undoProgramHistory(hist, cur);
  assert.equal(u1.changed, true);
  assert.equal(u1.program.length, 34);
  assert.equal(u1.history.past.length, 29);
  assert.equal(u1.history.future.length, 1);

  // Redo restores undone state
  const r1 = PH.redoProgramHistory(u1.history, u1.program);
  assert.equal(r1.changed, true);
  assert.equal(r1.program.length, 35);
  assert.equal(r1.history.future.length, 0);

  // Editing after undo clears redo stack
  const u2 = PH.undoProgramHistory(r1.history, r1.program);
  const branched: E.CodeBlock[] = [...u2.program, { id: 'branch_jump', type: 'JUMP' }];
  const branchHist = PH.pushProgramHistory(u2.history, u2.program, branched);
  assert.equal(branchHist.future.length, 0);
  assert.equal(branchHist.past.length, 30);

  // Undo on empty history is safe no-op
  const emptyUndo = PH.undoProgramHistory(PH.createEmptyProgramHistory(), cur);
  assert.equal(emptyUndo.changed, false);
});

test('springPhysics second-order dynamics, robot impact squash-and-stretch, large-dt stability, and CameraJuice reduced-motion attenuation', async () => {
  const SP = await import('./springPhysics');

  // Scalar spring converges smoothly toward target without NaN even under huge dt spikes
  const scalar = { value: 0, velocity: 0 };
  const cfg = { stiffness: 180, damping: 18 };
  for (let i = 0; i < 120; i++) {
    SP.stepSpringScalar(scalar, 1, cfg, 1 / 60);
  }
  assert.ok(Math.abs(scalar.value - 1) < 0.01, `Expected spring to settle near 1, got ${scalar.value}`);
  SP.stepSpringScalar(scalar, 0, { stiffness: 220, damping: 14 }, 5.0); // huge tab-resume dt clamped internally
  assert.ok(Number.isFinite(scalar.value) && Number.isFinite(scalar.velocity));

  // RobotKinematicsController responds to landing impact with squash/suspension compression and settles back
  const kin = new SP.RobotKinematicsController();
  kin.injectImpact(0.95, 0.35, 0);
  const impactSample = kin.step({
    dt: 0.016,
    targetSquash: 1,
    speed: 0,
    isAirborne: false,
    targetPitch: 0,
    targetRoll: 0
  });
  assert.ok(impactSample.squashY < 1.0, 'Positive impact compresses squashY');
  assert.ok(impactSample.squashXZ > 1.0, 'Volume-preserving squash expands squashXZ');
  assert.ok(impactSample.suspensionOffset < 0, 'Impact compresses wheel suspension struts');

  let settled = impactSample;
  for (let i = 0; i < 180; i++) {
    settled = kin.step({
      dt: 1 / 60,
      targetSquash: 1,
      speed: 0,
      isAirborne: false,
      targetPitch: 0,
      targetRoll: 0
    });
  }
  assert.ok(Math.abs(settled.squashY - 1) < 0.01);
  assert.ok(Math.abs(settled.suspensionOffset) < 0.01);

  // CameraJuiceController decays impulses and respects reduced-motion attenuation
  const camFull = new SP.CameraJuiceController();
  camFull.addImpulse(1.2, -0.9, 0.4, 3.0);
  const fullPeak = camFull.step(0.016, 0);
  assert.ok(Math.abs(fullPeak.offsetX) > 0.005 || Math.abs(fullPeak.offsetY) > 0.005);
  assert.ok(fullPeak.fovBoost > 0.02);

  const camReduced = new SP.CameraJuiceController();
  camReduced.setReducedMotion(true);
  camReduced.addImpulse(1.2, -0.9, 0.4, 3.0);
  const reducedPeak = camReduced.step(0.016, 0);
  assert.ok(Math.abs(reducedPeak.offsetX) < Math.abs(fullPeak.offsetX));
  assert.ok(reducedPeak.fovBoost < fullPeak.fovBoost);
});

test('AdaptiveQualityMonitor enforces Software WebGL lock, hysteresis transitions, tab-spike immunity, and GraphicsQualityMode save migration', () => {
  // Explicit tiers & Software WebGL protection
  const ultraHw = GraphicsConfig.getQualityBudgetForTier('ultra', false);
  const balancedHw = GraphicsConfig.getQualityBudgetForTier('balanced', false);
  const ecoHw = GraphicsConfig.getQualityBudgetForTier('eco', false);
  const ultraSw = GraphicsConfig.getQualityBudgetForTier('ultra', true);

  assert.equal(ultraHw.bloomEnabled, true);
  assert.equal(ultraHw.softboxEnabled, true);
  assert.equal(ultraHw.shadowMapSize, 2048);
  assert.equal(balancedHw.bloomEnabled, true);
  assert.equal(balancedHw.shadowMapSize, 1024);
  assert.equal(ecoHw.bloomEnabled, false);
  assert.equal(ecoHw.shadowsEnabled, false);
  assert.equal(ecoHw.lowGraphics, true);

  // Software WebGL strictly disables bloom, shadows, softboxes, and locks DPR to 1
  assert.equal(ultraSw.bloomEnabled, false);
  assert.equal(ultraSw.shadowsEnabled, false);
  assert.equal(ultraSw.softboxEnabled, false);
  assert.equal(ultraSw.maxPixelRatio, 1);

  // AdaptiveQualityMonitor ignores background tab resume spikes (> 0.25s)
  const mon = new GraphicsConfig.AdaptiveQualityMonitor({ isSoftwareGl: false, initialMode: 'auto' });
  assert.equal(mon.getTier(), 'ultra');
  for (let i = 0; i < 40; i++) {
    assert.equal(mon.recordFrame(0.6), null);
  }
  assert.equal(mon.getTier(), 'ultra');

  // Sustained slow frames (~34ms -> 0.034s) step down ultra -> balanced
  let steppedToBalanced = false;
  for (let i = 0; i < 120; i++) {
    const next = mon.recordFrame(0.034);
    if (next && next.tier === 'balanced') {
      steppedToBalanced = true;
      break;
    }
  }
  assert.equal(steppedToBalanced, true);
  assert.equal(mon.getTier(), 'balanced');

  // Sustained fast frames (~12ms -> 0.012s) step back up balanced -> ultra after cooldown + sustain window
  let steppedBackToUltra = false;
  for (let i = 0; i < 700; i++) {
    const next = mon.recordFrame(0.012);
    if (next && next.tier === 'ultra') {
      steppedBackToUltra = true;
      break;
    }
  }
  assert.equal(steppedBackToUltra, true);
  assert.equal(mon.getTier(), 'ultra');

  // Legacy SaveProfile migration maps lowGraphics: true -> graphicsQuality: 'eco'
  assert.equal(GraphicsConfig.normalizeGraphicsQualityMode(undefined, true), 'eco');
  assert.equal(GraphicsConfig.normalizeGraphicsQualityMode(undefined, false), 'auto');
  assert.equal(GraphicsConfig.normalizeGraphicsQualityMode('balanced', true), 'balanced');

  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };
  mockStorage.setItem(E.SAVE_KEY, JSON.stringify({ unlockedLevel: 3, lowGraphics: true }));
  const migratedEco = ProfileStorage.loadSaveProfile(mockStorage);
  assert.equal(migratedEco.graphicsQuality, 'eco');
  assert.equal(migratedEco.lowGraphics, true);
});
