import { makeCircuit } from './levels';
import { cloneCircuitGrid, findCircuitFixCell, traceCircuit } from './optics';
import {
  computeCompressedBlockCount,
  findOptimalCrystalTrackSolution,
  findShortestTrackPlan
} from './simulator';
import type {
  ChassisGrid,
  CircuitCellType,
  CircuitGrid,
  CodeBlock,
  LevelDef,
  SandboxMissionDraft,
  TileType,
  TrackTile
} from './types';

const DEBUG_CMD_ENCODE: Record<string, number> = {
  MOVE: 0,
  JUMP: 1,
  BOOST: 2,
  WAIT: 3
};
const DEBUG_CMD_DECODE: Array<'MOVE' | 'JUMP' | 'BOOST' | 'WAIT'> = ['MOVE', 'JUMP', 'BOOST', 'WAIT'];
export const SANDBOX_MAX_BUG_CLUE_LEN = 64;
export const SANDBOX_MAX_STARTER_BLOCKS = 12;

export function sanitizeBugClue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SANDBOX_MAX_BUG_CLUE_LEN);
}

function normalizeStarterProgram(raw: CodeBlock[] | undefined): CodeBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: CodeBlock[] = [];
  for (const blk of raw) {
    if (out.length >= SANDBOX_MAX_STARTER_BLOCKS) break;
    if (blk && (blk.type === 'MOVE' || blk.type === 'JUMP' || blk.type === 'BOOST' || blk.type === 'WAIT')) {
      out.push({ id: `sb_dbg_${out.length + 1}`, type: blk.type });
    }
  }
  return out;
}

function buildAutoDebugChassis(track: TrackTile[]): ChassisGrid {
  const hasMud = track.some((t) => t.type === 'mud');
  const hasGap = track.some((t) => t.type === 'gap');
  const hasRamp = track.some((t) => t.type === 'ramp');
  return [
    [hasRamp ? 'booster' : null, null, null],
    [hasGap ? 'thrusters' : null, null, 'laser'],
    [hasMud ? 'treads' : 'wheels', null, null]
  ];
}

export const SANDBOX_MIN_TILES = 4;
export const SANDBOX_MAX_TILES = 14;
export const SANDBOX_MIN_BUDGET = 45;
export const SANDBOX_MAX_BUDGET = 160;
export const SANDBOX_MAX_SAVED = 6;
export const SANDBOX_MAX_NAME_LEN = 28;

const TILE_ENCODE: Record<TileType, number> = {
  start: 0,
  normal: 1,
  gap: 2,
  mud: 3,
  ramp: 4,
  gate: 5
};

const TILE_DECODE: TileType[] = ['start', 'normal', 'gap', 'mud', 'ramp', 'gate'];

const CELL_ENCODE: Record<CircuitCellType, number> = {
  empty: 0,
  mirror: 1,
  splitter: 2,
  core: 3,
  wall: 4
};

const CELL_DECODE: CircuitCellType[] = ['empty', 'mirror', 'splitter', 'core', 'wall'];

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? bytes[i + 1] : 0;
    const b2 = hasB2 ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    out += BASE64URL_ALPHABET[(triplet >> 18) & 0x3f];
    out += BASE64URL_ALPHABET[(triplet >> 12) & 0x3f];
    if (hasB1) out += BASE64URL_ALPHABET[(triplet >> 6) & 0x3f];
    if (hasB2) out += BASE64URL_ALPHABET[triplet & 0x3f];
  }
  return out;
}

function base64UrlToBytes(str: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) return null;
  if (str.length % 4 === 1) return null;
  const values: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const idx = BASE64URL_ALPHABET.indexOf(str[i]);
    if (idx < 0) return null;
    values.push(idx);
  }
  const byteLen = Math.floor((values.length * 3) / 4);
  const out = new Uint8Array(byteLen);
  let outIdx = 0;
  for (let i = 0; i < values.length; i += 4) {
    const v0 = values[i];
    const v1 = values[i + 1];
    const v2 = i + 2 < values.length ? values[i + 2] : 0;
    const v3 = i + 3 < values.length ? values[i + 3] : 0;
    const triplet = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
    if (outIdx < byteLen) out[outIdx++] = (triplet >> 16) & 0xff;
    if (i + 2 < values.length && outIdx < byteLen) out[outIdx++] = (triplet >> 8) & 0xff;
    if (i + 3 < values.length && outIdx < byteLen) out[outIdx++] = triplet & 0xff;
  }
  return out;
}

function fnv1a16Hex(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  const folded = ((h >>> 16) ^ (h & 0xffff)) & 0xffff;
  return folded.toString(16).toUpperCase().padStart(4, '0');
}

export function sanitizeSandboxName(raw: unknown): string {
  if (typeof raw !== 'string') return 'My Custom Lab';
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SANDBOX_MAX_NAME_LEN)
    .trim();
  return cleaned || 'My Custom Lab';
}

export function normalizeTrack(rawTrack: TrackTile[] | undefined): TrackTile[] {
  const src = Array.isArray(rawTrack) ? rawTrack : [];
  const clipped = src.slice(0, SANDBOX_MAX_TILES);
  while (clipped.length < SANDBOX_MIN_TILES) {
    clipped.splice(Math.max(1, clipped.length - 1), 0, { type: 'normal', crystal: false });
  }
  return clipped.map((tile, idx) => {
    if (idx === 0) return { type: 'start', crystal: false };
    if (idx === clipped.length - 1) return { type: 'gate', crystal: false };
    const t: TileType =
      tile?.type === 'gap' || tile?.type === 'mud' || tile?.type === 'ramp' || tile?.type === 'normal'
        ? tile.type
        : 'normal';
    return {
      type: t,
      crystal: t === 'gap' ? false : Boolean(tile?.crystal)
    };
  });
}

export function normalizeCircuit(rawCircuit: CircuitGrid | undefined): CircuitGrid {
  const base = makeCircuit([]);
  if (!Array.isArray(rawCircuit)) return base;
  for (let r = 0; r < 5; r++) {
    const row = rawCircuit[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < 5; c++) {
      const cell = row[c];
      if (!cell || typeof cell !== 'object') continue;
      const t: CircuitCellType =
        cell.type === 'mirror' ||
        cell.type === 'splitter' ||
        cell.type === 'core' ||
        cell.type === 'wall'
          ? cell.type
          : 'empty';
      const rot = t === 'mirror' || t === 'splitter' ? (cell.rot === 1 ? 1 : 0) : 0;
      base[r][c] = { type: t, rot };
    }
  }
  return base;
}

export function normalizeSandboxDraft(
  raw?: Partial<SandboxMissionDraft> & { track?: TrackTile[]; circuit?: CircuitGrid }
): SandboxMissionDraft {
  const track = normalizeTrack(raw?.track);
  const circuit = normalizeCircuit(raw?.circuit);
  const budget = Math.max(
    SANDBOX_MIN_BUDGET,
    Math.min(SANDBOX_MAX_BUDGET, Math.round(Number(raw?.budget) || 120))
  );
  const parBudget = Math.max(
    45,
    Math.min(budget, Math.round(Number(raw?.parBudget) || Math.min(budget, 95)))
  );
  const parBlocks = Math.max(1, Math.min(20, Math.round(Number(raw?.parBlocks) || 5)));
  const isDebugPuzzle = Boolean(raw?.isDebugPuzzle);
  const starterProgram = normalizeStarterProgram(raw?.starterProgram);
  const bugClue = sanitizeBugClue(raw?.bugClue);
  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : 'draft_active',
    name: sanitizeSandboxName(raw?.name),
    budget,
    parBudget,
    parBlocks,
    loopUnlocked: raw?.loopUnlocked !== undefined ? Boolean(raw.loopUnlocked) : true,
    ifUnlocked: raw?.ifUnlocked !== undefined ? Boolean(raw.ifUnlocked) : true,
    track,
    circuit,
    isDebugPuzzle,
    bugClue: bugClue || undefined,
    starterProgram: starterProgram.length > 0 ? starterProgram : undefined,
    updatedAt: typeof raw?.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now()
  };
}

export function createDefaultSandboxDraft(): SandboxMissionDraft {
  return normalizeSandboxDraft({
    id: 'draft_active',
    name: 'My Custom Lab',
    budget: 120,
    parBudget: 95,
    parBlocks: 4,
    loopUnlocked: true,
    ifUnlocked: true,
    track: [
      { type: 'start', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gap', crystal: false },
      { type: 'normal', crystal: false },
      { type: 'mud', crystal: true },
      { type: 'ramp', crystal: false },
      { type: 'normal', crystal: true },
      { type: 'gate', crystal: false }
    ],
    circuit: makeCircuit([
      { r: 2, c: 2, type: 'mirror', rot: 1 },
      { r: 0, c: 2, type: 'core', rot: 0 },
      { r: 4, c: 2, type: 'wall', rot: 0 }
    ])
  });
}

export const SANDBOX_PRESETS: Array<{ id: string; label: string; draft: SandboxMissionDraft }> = [
  {
    id: 'canyon_hop',
    label: 'Canyon Hop',
    draft: normalizeSandboxDraft({
      id: 'preset_canyon',
      name: 'Canyon Hop',
      budget: 110,
      parBudget: 80,
      parBlocks: 4,
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
        { r: 4, c: 2, type: 'mirror', rot: 1 },
        { r: 4, c: 4, type: 'core', rot: 0 },
        { r: 0, c: 2, type: 'wall', rot: 0 }
      ])
    })
  },
  {
    id: 'muddy_loop',
    label: 'Muddy Loop',
    draft: normalizeSandboxDraft({
      id: 'preset_mud',
      name: 'Muddy Loop',
      budget: 115,
      parBudget: 95,
      parBlocks: 3,
      track: [
        { type: 'start', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: false },
        { type: 'gate', crystal: false }
      ],
      circuit: makeCircuit([
        { r: 2, c: 1, type: 'splitter', rot: 1 },
        { r: 0, c: 1, type: 'core', rot: 0 },
        { r: 2, c: 4, type: 'mirror', rot: 0 },
        { r: 4, c: 4, type: 'core', rot: 0 }
      ])
    })
  },
  {
    id: 'starport_lab',
    label: 'Starport Lab',
    draft: normalizeSandboxDraft({
      id: 'preset_starport',
      name: 'Starport Lab',
      budget: 130,
      parBudget: 110,
      parBlocks: 5,
      track: [
        { type: 'start', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'ramp', crystal: false },
        { type: 'mud', crystal: true },
        { type: 'normal', crystal: false },
        { type: 'gap', crystal: false },
        { type: 'normal', crystal: true },
        { type: 'ramp', crystal: false },
        { type: 'normal', crystal: false },
        { type: 'gate', crystal: false }
      ],
      circuit: makeCircuit([
        { r: 2, c: 1, type: 'mirror', rot: 1 },
        { r: 0, c: 1, type: 'mirror', rot: 1 },
        { r: 0, c: 3, type: 'splitter', rot: 0 },
        { r: 0, c: 4, type: 'core', rot: 0 },
        { r: 3, c: 3, type: 'core', rot: 0 },
        { r: 2, c: 2, type: 'wall', rot: 0 }
      ])
    })
  }
];

export interface SandboxValidationReport {
  ok: boolean;
  trackSolvable: boolean;
  allCrystalsReachable: boolean;
  circuitTotalCores: number;
  circuitStartsSolved: boolean;
  circuitSolvable: boolean;
  recommendedProfileLabel: string | null;
  recommendedParBudget: number;
  recommendedParBlocks: number;
  issues: string[];
}

export function sandboxDraftToLevelDef(
  draft: SandboxMissionDraft,
  opts?: { isClassCode?: boolean }
): LevelDef {
  const norm = normalizeSandboxDraft(draft);
  const debugActive = Boolean(norm.isDebugPuzzle && norm.starterProgram && norm.starterProgram.length > 0);
  const clue = norm.bugClue || 'Find and fix the broken code blocks so SparkBot reaches the Gate!';
  return {
    id: opts?.isClassCode ? 901 : 900,
    name: norm.name,
    ageLabel: debugActive
      ? opts?.isClassCode
        ? 'Debug Class Code'
        : 'Debug Lab'
      : opts?.isClassCode
        ? 'Class Code'
        : 'Sandbox Lab',
    brief: debugActive
      ? `Debug Challenge "${norm.name}": ${clue}`
      : opts?.isClassCode
        ? `Classroom Challenge "${norm.name}": Build a chassis within budget, code to the gate, and power all cores!`
        : `Custom Sandbox Mission "${norm.name}": Test your track & laser puzzle!`,
    budget: norm.budget,
    parBudget: norm.parBudget,
    parBlocks: norm.parBlocks,
    loopUnlocked: norm.loopUnlocked,
    ifUnlocked: norm.ifUnlocked,
    isSandbox: true,
    isClassCode: Boolean(opts?.isClassCode),
    isDebug: debugActive,
    debugClue: debugActive ? clue : undefined,
    starterChassis: debugActive ? buildAutoDebugChassis(norm.track) : undefined,
    starterProgram: debugActive ? norm.starterProgram!.map((b) => ({ ...b })) : undefined,
    track: norm.track.map((t) => ({ ...t })),
    circuit: cloneCircuitGrid(norm.circuit)
  };
}

export function validateSandboxDraft(draft: SandboxMissionDraft): SandboxValidationReport {
  const norm = normalizeSandboxDraft(draft);
  const lvl = sandboxDraftToLevelDef(norm);
  const issues: string[] = [];

  const trackPlan = findShortestTrackPlan(lvl);
  const trackSolvable = Boolean(trackPlan);
  const crystalPlan = trackSolvable ? findOptimalCrystalTrackSolution(norm.track, norm.budget) : null;
  const allCrystalsReachable = Boolean(crystalPlan);

  if (!trackSolvable) {
    issues.push('Track cannot reach the Gate within budget (check back-to-back gaps/ramps or raise budget).');
  } else if (!allCrystalsReachable) {
    issues.push('At least one Energy Crystal cannot be collected while reaching the Gate.');
  }

  const trace = traceCircuit(norm.circuit);
  const circuitTotalCores = trace.totalCores;
  const circuitStartsSolved = trace.solved;
  const circuitFix = circuitTotalCores >= 1 && !circuitStartsSolved ? findCircuitFixCell(norm.circuit) : null;
  const circuitSolvable = circuitTotalCores >= 1 && !circuitStartsSolved && Boolean(circuitFix);

  if (circuitTotalCores < 1) {
    issues.push('Add at least 1 Power Core to the 5×5 Laser Circuit.');
  } else if (circuitStartsSolved) {
    issues.push('Laser Circuit starts already solved — tap a Mirror or Splitter once so players must solve it.');
  } else if (!circuitFix) {
    issues.push('No Mirror or Splitter rotation sequence can light all Power Cores yet.');
  }

  const chosenPlan = crystalPlan || trackPlan;
  const recommendedParBudget = chosenPlan ? chosenPlan.profile.cost : norm.parBudget;
  const recommendedParBlocks = chosenPlan
    ? Math.max(1, computeCompressedBlockCount(chosenPlan.sequence))
    : norm.parBlocks;

  return {
    ok: issues.length === 0,
    trackSolvable,
    allCrystalsReachable,
    circuitTotalCores,
    circuitStartsSolved,
    circuitSolvable,
    recommendedProfileLabel: chosenPlan ? chosenPlan.profile.label : null,
    recommendedParBudget,
    recommendedParBlocks,
    issues
  };
}

/**
 * Flips 1 mirror or splitter on a pre-solved circuit so it starts unsolved yet solvable,
 * helping kids turn a finished laser beam into a playable puzzle in one click.
 */
export function scrambleCircuitToUnsolved(circuit: CircuitGrid): CircuitGrid | null {
  const grid = normalizeCircuit(circuit);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].type === 'mirror' || grid[r][c].type === 'splitter') {
        const cand = cloneCircuitGrid(grid);
        cand[r][c].rot = cand[r][c].rot === 0 ? 1 : 0;
        if (!traceCircuit(cand).solved && findCircuitFixCell(cand)) {
          return cand;
        }
      }
    }
  }
  return null;
}

export function encodeChallengeCode(draft: SandboxMissionDraft): string {
  const norm = normalizeSandboxDraft(draft);
  const encoder = new TextEncoder();
  const rawNameBytes = encoder.encode(norm.name).slice(0, SANDBOX_MAX_NAME_LEN);
  const trackLen = norm.track.length;
  const starterBlocks = norm.isDebugPuzzle ? norm.starterProgram || [] : [];
  const isV2 = Boolean(norm.isDebugPuzzle && starterBlocks.length > 0);
  const rawClueBytes = isV2
    ? encoder.encode(norm.bugClue || '').slice(0, SANDBOX_MAX_BUG_CLUE_LEN)
    : new Uint8Array(0);

  // Compact binary format:
  // v1: [0]=1, [1]=budget, [2]=parBudget, [3]=parBlocks, [4]=flags, [5]=nameLen, ...name, trackLen, ...track, [25 circuit]
  // v2: same + [starterLen, ...starterCmdBytes, clueLen, ...clueBytes]
  const extraLen = isV2 ? 1 + starterBlocks.length + 1 + rawClueBytes.length : 0;
  const totalLen = 6 + rawNameBytes.length + 1 + trackLen + 25 + extraLen;
  const buf = new Uint8Array(totalLen);
  let p = 0;
  buf[p++] = isV2 ? 2 : 1;
  buf[p++] = norm.budget;
  buf[p++] = norm.parBudget;
  buf[p++] = norm.parBlocks;
  buf[p++] = (norm.loopUnlocked ? 1 : 0) | (norm.ifUnlocked ? 2 : 0) | (isV2 ? 4 : 0);
  buf[p++] = rawNameBytes.length;
  for (let i = 0; i < rawNameBytes.length; i++) {
    buf[p++] = rawNameBytes[i];
  }
  buf[p++] = trackLen;
  for (let i = 0; i < trackLen; i++) {
    const t = norm.track[i];
    buf[p++] = (TILE_ENCODE[t.type] & 0x07) | (t.crystal ? 0x08 : 0);
  }
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = norm.circuit[r][c];
      buf[p++] = (CELL_ENCODE[cell.type] & 0x07) | (cell.rot === 1 ? 0x08 : 0);
    }
  }
  if (isV2) {
    buf[p++] = starterBlocks.length;
    for (let i = 0; i < starterBlocks.length; i++) {
      buf[p++] = DEBUG_CMD_ENCODE[starterBlocks[i].type] ?? 0;
    }
    buf[p++] = rawClueBytes.length;
    for (let i = 0; i < rawClueBytes.length; i++) {
      buf[p++] = rawClueBytes[i];
    }
  }

  const payload = bytesToBase64Url(buf);
  const checksum = fnv1a16Hex(buf);
  return `SB1-${payload}-${checksum}`;
}

export function decodeChallengeCode(
  rawCode: string
): { ok: true; draft: SandboxMissionDraft } | { ok: false; error: string } {
  const cleaned = String(rawCode || '').trim().replace(/\s+/g, '');
  if (!cleaned) {
    return { ok: false, error: 'Paste a Classroom Challenge Code (starts with SB1-).' };
  }
  const match = /^SB1-([A-Za-z0-9_-]+)-([0-9A-Fa-f]{4})$/.exec(cleaned);
  if (!match) {
    return { ok: false, error: 'Code format invalid. Expected SB1-...-XXXX.' };
  }
  const [, payloadB64, givenHex] = match;
  const buf = base64UrlToBytes(payloadB64);
  if (!buf || buf.length < 32) {
    return { ok: false, error: 'Challenge code payload is corrupted or incomplete.' };
  }
  const expectedHex = fnv1a16Hex(buf);
  if (expectedHex !== givenHex.toUpperCase()) {
    return { ok: false, error: 'Challenge code checksum failed. Check for missing characters.' };
  }

  let p = 0;
  const version = buf[p++];
  if (version !== 1 && version !== 2) {
    return { ok: false, error: `Unsupported challenge code version (${version}).` };
  }
  const budget = buf[p++];
  const parBudget = buf[p++];
  const parBlocks = buf[p++];
  const flags = buf[p++];
  const nameLen = buf[p++];

  if (
    budget < SANDBOX_MIN_BUDGET ||
    budget > SANDBOX_MAX_BUDGET ||
    nameLen > SANDBOX_MAX_NAME_LEN ||
    p + nameLen + 1 >= buf.length
  ) {
    return { ok: false, error: 'Challenge code header bounds are invalid.' };
  }

  const nameBytes = buf.slice(p, p + nameLen);
  p += nameLen;
  const decoder = new TextDecoder();
  const name = sanitizeSandboxName(decoder.decode(nameBytes));

  const trackLen = buf[p++];
  if (
    trackLen < SANDBOX_MIN_TILES ||
    trackLen > SANDBOX_MAX_TILES ||
    (version === 1 && p + trackLen + 25 !== buf.length) ||
    (version === 2 && p + trackLen + 25 + 2 > buf.length)
  ) {
    return { ok: false, error: 'Challenge code track/circuit layout length mismatch.' };
  }

  const track: TrackTile[] = [];
  for (let i = 0; i < trackLen; i++) {
    const byte = buf[p++];
    const typeIdx = byte & 0x07;
    if (typeIdx >= TILE_DECODE.length) {
      return { ok: false, error: 'Challenge code contains an unknown tile type.' };
    }
    const type = TILE_DECODE[typeIdx];
    const crystal = Boolean(byte & 0x08);
    track.push({ type, crystal });
  }

  const circuit = makeCircuit([]);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const byte = buf[p++];
      const cellIdx = byte & 0x07;
      if (cellIdx >= CELL_DECODE.length) {
        return { ok: false, error: 'Challenge code contains an unknown circuit cell.' };
      }
      circuit[r][c] = {
        type: CELL_DECODE[cellIdx],
        rot: byte & 0x08 ? 1 : 0
      };
    }
  }

  let isDebugPuzzle = false;
  let starterProgram: CodeBlock[] | undefined;
  let bugClue: string | undefined;

  if (version === 2) {
    const starterLen = buf[p++];
    if (starterLen > SANDBOX_MAX_STARTER_BLOCKS || p + starterLen + 1 > buf.length) {
      return { ok: false, error: 'Debug challenge starter code payload is invalid.' };
    }
    const blocks: CodeBlock[] = [];
    for (let i = 0; i < starterLen; i++) {
      const cmdIdx = buf[p++];
      const cmdType = DEBUG_CMD_DECODE[cmdIdx];
      if (!cmdType) {
        return { ok: false, error: 'Debug challenge contains an unknown code block.' };
      }
      blocks.push({ id: `cc_dbg_${i + 1}`, type: cmdType });
    }
    const clueLen = buf[p++];
    if (clueLen > SANDBOX_MAX_BUG_CLUE_LEN || p + clueLen !== buf.length) {
      return { ok: false, error: 'Debug challenge clue payload is invalid.' };
    }
    const clueBytes = buf.slice(p, p + clueLen);
    isDebugPuzzle = Boolean(flags & 4) && blocks.length > 0;
    starterProgram = blocks;
    bugClue = sanitizeBugClue(decoder.decode(clueBytes)) || undefined;
  }

  const draft = normalizeSandboxDraft({
    id: `class_${givenHex.toLowerCase()}`,
    name,
    budget,
    parBudget,
    parBlocks,
    loopUnlocked: Boolean(flags & 1),
    ifUnlocked: Boolean(flags & 2),
    track,
    circuit,
    isDebugPuzzle,
    starterProgram,
    bugClue
  });

  return { ok: true, draft };
}
