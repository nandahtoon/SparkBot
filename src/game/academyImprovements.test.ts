import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  LEVELS as ENGINE_LEVELS,
  simulateProgram as engineSimulateProgram,
  traceCircuit as engineTraceCircuit,
  SAVE_KEY,
  defaultSaveProfile
} from './engine';
import { LEVELS as MOD_LEVELS, makeCircuit } from './levels';
import { traceCircuit as modTraceCircuit } from './optics';
import { simulateProgram as modSimulateProgram } from './simulator';
import {
  createDefaultSandboxDraft,
  decodeChallengeCode,
  encodeChallengeCode,
  SANDBOX_PRESETS,
  sandboxDraftToLevelDef,
  scrambleCircuitToUnsolved,
  validateSandboxDraft
} from './sandboxCodec';
import {
  createRosterSlot,
  deleteRosterSlot,
  loadProfileRoster,
  MAX_PROFILE_SLOTS,
  ROSTER_KEY,
  saveActiveRosterProfile,
  switchRosterSlot
} from './profileRoster';
import { SPEECH } from './readAloud';

function createMemoryStorage(): Storage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    }
  };
}

test('modular engine barrel exports match domain modules', () => {
  assert.strictEqual(ENGINE_LEVELS, MOD_LEVELS);
  assert.strictEqual(engineTraceCircuit, modTraceCircuit);
  assert.strictEqual(engineSimulateProgram, modSimulateProgram);
});

test('sandbox presets validate cleanly as playable & solvable missions', () => {
  const defaultDraft = createDefaultSandboxDraft();
  assert.equal(validateSandboxDraft(defaultDraft).ok, true);

  for (const preset of SANDBOX_PRESETS) {
    const report = validateSandboxDraft(preset.draft);
    assert.equal(report.ok, true, `Preset ${preset.label} should be valid: ${report.issues.join('; ')}`);
    assert.equal(report.trackSolvable, true);
    assert.equal(report.circuitSolvable, true);
    const lvl = sandboxDraftToLevelDef(preset.draft);
    assert.equal(lvl.isSandbox, true);
    assert.equal(lvl.track.length, preset.draft.track.length);
  }
});

test('validateSandboxDraft flags impossible tracks, missing cores, and pre-solved circuits', () => {
  const missingCore = createDefaultSandboxDraft();
  missingCore.circuit = makeCircuit([]);
  const missingReport = validateSandboxDraft(missingCore);
  assert.equal(missingReport.ok, false);
  assert.equal(missingReport.circuitTotalCores, 0);

  const preSolved = createDefaultSandboxDraft();
  preSolved.circuit = makeCircuit([
    { r: 2, c: 2, type: 'mirror', rot: 0 }, // '/' reflects Right -> Up toward (0, 2)
    { r: 0, c: 2, type: 'core', rot: 0 }
  ]);
  const preSolvedReport = validateSandboxDraft(preSolved);
  assert.equal(preSolvedReport.ok, false);
  assert.equal(preSolvedReport.circuitStartsSolved, true);

  const scrambled = scrambleCircuitToUnsolved(preSolved.circuit);
  assert.ok(scrambled, 'scrambleCircuitToUnsolved should find a mirror flip that makes puzzle valid');
  const afterScramble = validateSandboxDraft({ ...preSolved, circuit: scrambled! });
  assert.equal(afterScramble.ok, true);

  // Back-to-back ramps/gaps impossible under minimum budget
  const tightTrack = createDefaultSandboxDraft();
  tightTrack.budget = 45; // cannot afford both thrusters (20) and treads (30) + laser (30)
  tightTrack.track = [
    { type: 'start', crystal: false },
    { type: 'gap', crystal: false },
    { type: 'mud', crystal: false },
    { type: 'gate', crystal: false }
  ];
  const tightReport = validateSandboxDraft(tightTrack);
  assert.equal(tightReport.ok, false);
  assert.equal(tightReport.trackSolvable, false);
});

test('classroom challenge code encodes, round-trips cleanly, and rejects tampering', () => {
  const draft = SANDBOX_PRESETS[2].draft;
  const code = encodeChallengeCode(draft);
  assert.match(code, /^SB1-[A-Za-z0-9_-]+-[0-9A-F]{4}$/);

  const decoded = decodeChallengeCode(code);
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.equal(decoded.draft.name, draft.name);
    assert.equal(decoded.draft.budget, draft.budget);
    assert.equal(decoded.draft.parBudget, draft.parBudget);
    assert.equal(decoded.draft.parBlocks, draft.parBlocks);
    assert.equal(decoded.draft.loopUnlocked, draft.loopUnlocked);
    assert.equal(decoded.draft.ifUnlocked, draft.ifUnlocked);
    assert.deepEqual(decoded.draft.track, draft.track);
    assert.deepEqual(decoded.draft.circuit, draft.circuit);
  }

  // Tamper checksum
  const lastChar = code.slice(-1);
  const badCode = `${code.slice(0, -1)}${lastChar === '0' ? '1' : '0'}`;
  const tampered = decodeChallengeCode(badCode);
  assert.equal(tampered.ok, false);

  // Reject invalid prefix
  const invalid = decodeChallengeCode('NOT_A_CODE');
  assert.equal(invalid.ok, false);
});

test('multi-learner roster migrates legacy single-slot save and manages up to MAX_PROFILE_SLOTS', () => {
  const storage = createMemoryStorage();
  const legacy = defaultSaveProfile();
  legacy.profileName = 'Maya';
  legacy.unlockedLevel = 5;
  legacy.totalBolts = 250;
  legacy.stars = { 1: 3, 2: 3, 3: 2, 4: 3 };
  storage.setItem(SAVE_KEY, JSON.stringify(legacy));

  const firstLoad = loadProfileRoster(storage);
  assert.equal(firstLoad.roster.slots.length, 1);
  assert.equal(firstLoad.activeSave.profileName, 'Maya');
  assert.equal(firstLoad.activeSave.unlockedLevel, 5);
  assert.ok(storage.getItem(ROSTER_KEY));

  // Create second slot
  const createRes = createRosterSlot('Leo', 'nova', storage);
  assert.equal(createRes.ok, true);
  assert.equal(createRes.roster.slots.length, 2);
  assert.equal(createRes.save.profileName, 'Leo');
  assert.equal(createRes.save.botCharacter, 'nova');
  assert.equal(createRes.save.unlockedLevel, 1);

  // Save updates to Leo, verify SAVE_KEY mirrors Leo, then switch back to Maya
  const updatedLeo = { ...createRes.save, totalBolts: 99 };
  saveActiveRosterProfile(updatedLeo, storage);
  const mirroredLeo = JSON.parse(storage.getItem(SAVE_KEY)!);
  assert.equal(mirroredLeo.profileName, 'Leo');
  assert.equal(mirroredLeo.totalBolts, 99);

  const switchBack = switchRosterSlot(firstLoad.roster.slots[0].id, storage);
  assert.equal(switchBack.ok, true);
  assert.equal(switchBack.save.profileName, 'Maya');
  assert.equal(switchBack.save.totalBolts, 250);

  // Reject blank slot name
  const badCreate = createRosterSlot('   ', 'sparkbot', storage);
  assert.equal(badCreate.ok, false);

  // Enforce MAX_PROFILE_SLOTS
  for (let i = 3; i <= MAX_PROFILE_SLOTS; i++) {
    const r = createRosterSlot(`Cadet ${i}`, 'sparkbot', storage);
    assert.equal(r.ok, true);
  }
  const overflow = createRosterSlot('Extra Cadet', 'sparkbot', storage);
  assert.equal(overflow.ok, false);

  // Cannot delete down to zero slots
  let curRoster = overflow.roster;
  while (curRoster.slots.length > 1) {
    const delRes = deleteRosterSlot(curRoster.slots[curRoster.slots.length - 1].id, storage);
    assert.equal(delRes.ok, true);
    curRoster = delRes.roster;
  }
  const lastDel = deleteRosterSlot(curRoster.slots[0].id, storage);
  assert.equal(lastDel.ok, false);
});

test('ReadAloudController safely no-ops in non-browser Node environment', () => {
  assert.equal(SPEECH.isSupported(), false);
  SPEECH.applySettings(false, 0.9);
  SPEECH.setEnabled(true);
  assert.equal(SPEECH.speak('Hello young engineer', 'test_id'), false);
  assert.equal(SPEECH.toggleSpeak('Another clue', 'test_id'), false);
  SPEECH.stop();
  SPEECH.setEnabled(false);
});

test('App.tsx dynamically imports Three.js world and lazy-loads heavy modals', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const source = fs.readFileSync(appPath, 'utf8');
  assert.equal(/import\s*\{[^}]*UnifiedWorldController[^}]*\}\s*from\s*['"]\.\/three\/worldScene['"]/.test(source), false);
  assert.match(source, /import\(['"]\.\/three\/worldScene['"]\)/);
  assert.match(source, /React\.lazy\(\(\)\s*=>\s*import\(['"]\.\/components\/SandboxCreatorModal['"]\)/);
  assert.match(source, /React\.lazy\(\(\)\s*=>\s*import\(['"]\.\/components\/ClassroomCodeModal['"]\)/);
  assert.match(source, /React\.lazy\(\(\)\s*=>\s*import\(['"]\.\/components\/TrophyShelfModal['"]\)/);
});
