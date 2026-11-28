import {
  detectHazardAheadForNextTick,
  evaluateAllHazardsAtTick,
  getBlockingHazardAtTile,
  levelHasDynamicHazards
} from './hazards';
import { findCircuitFixCell } from './optics';
import { getRouteObjectiveFailure, getSurveyProgress, getSurveyStations } from './missionObjectives';
import {
  PARTS,
  parseNonNegInt,
  type BlockType,
  type ChassisGrid,
  type ChassisInfo,
  type CircuitGrid,
  type CodeBlock,
  type LevelDef,
  type PartId,
  type SensorCondition,
  type SimEvent,
  type SimResult,
  type TileType,
  type TrackTile
} from './types';

export function createEmptyChassis(): ChassisGrid {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
}

export function cloneChassis(chassis: ChassisGrid): ChassisGrid {
  return chassis.map((row) => [...row]);
}

export function computeChassisInfo(chassis: ChassisGrid): ChassisInfo {
  let cost = 0;
  let hasWheels = false;
  let hasTreads = false;
  let hasThrusters = false;
  let hasBooster = false;
  let hasLaserAny = false;
  let hasFrontLaser = false;
  let hasMagnet = false;
  let partCount = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const partId = chassis[r]?.[c];
      if (!partId || !PARTS[partId]) continue;
      partCount++;
      cost += PARTS[partId].cost;
      if (partId === 'wheels') hasWheels = true;
      if (partId === 'treads') hasTreads = true;
      if (partId === 'thrusters') hasThrusters = true;
      if (partId === 'booster') hasBooster = true;
      if (partId === 'magnet') hasMagnet = true;
      if (partId === 'laser') {
        hasLaserAny = true;
        if (c === 2) hasFrontLaser = true;
      }
    }
  }
  return {
    cost,
    partCount,
    hasWheels,
    hasTreads,
    hasDrive: hasWheels || hasTreads,
    hasThrusters,
    hasBooster,
    hasLaserAny,
    hasFrontLaser,
    hasMagnet
  };
}

export function canPlacePartInSlot(
  chassis: ChassisGrid,
  budget: number,
  partId: PartId,
  r: number,
  c: number
): { ok: boolean; reason: 'invalid_slot' | 'laser_not_front' | 'over_budget' | null } {
  if (r < 0 || r > 2 || c < 0 || c > 2) return { ok: false, reason: 'invalid_slot' };
  if (partId === 'laser' && c !== 2) return { ok: false, reason: 'laser_not_front' };
  const next = cloneChassis(chassis);
  next[r][c] = partId;
  const info = computeChassisInfo(next);
  if (info.cost > budget) return { ok: false, reason: 'over_budget' };
  return { ok: true, reason: null };
}

export function countBlocks(blocks: CodeBlock[], functionBody?: CodeBlock[]): number {
  let total = 0;
  for (const blk of blocks || []) {
    total += 1;
    if ((blk.type === 'LOOP' || blk.type === 'IF') && Array.isArray(blk.children)) {
      total += countBlocks(blk.children);
    }
    if (blk.type === 'IF' && Array.isArray(blk.elseChildren)) {
      total += countBlocks(blk.elseChildren);
    }
  }
  if (Array.isArray(functionBody) && functionBody.length > 0) {
    total += countBlocks(functionBody);
  }
  return total;
}

export function hasEmptyContainer(blocks: CodeBlock[]): boolean {
  for (const blk of blocks || []) {
    if (blk.type === 'LOOP') {
      if (!blk.children || blk.children.length === 0) return true;
      if (hasEmptyContainer(blk.children)) return true;
    } else if (blk.type === 'IF') {
      const hasThen = Array.isArray(blk.children) && blk.children.length > 0;
      const hasElse = Array.isArray(blk.elseChildren) && blk.elseChildren.length > 0;
      if (!hasThen && !hasElse) return true;
      if (hasThen && hasEmptyContainer(blk.children!)) return true;
      if (hasElse && hasEmptyContainer(blk.elseChildren!)) return true;
    }
  }
  return false;
}

export function flattenBlocks(
  blocks: CodeBlock[],
  maxSteps = 64,
  functionBody: CodeBlock[] = []
): Array<{ type: string; blockId: string }> {
  const out: Array<{ type: string; blockId: string }> = [];
  function walk(list: CodeBlock[], callDepth: number) {
    for (const b of list) {
      if (out.length >= maxSteps) return;
      if (b.type === 'LOOP') {
        const reps = Math.max(1, Math.min(5, b.count || 2));
        for (let k = 0; k < reps; k++) {
          walk(b.children || [], callDepth);
          if (out.length >= maxSteps) return;
        }
      } else if (b.type === 'IF') {
        walk(b.children || [], callDepth);
        if (Array.isArray(b.elseChildren) && b.elseChildren.length > 0) {
          walk(b.elseChildren, callDepth);
        }
      } else if (b.type === 'CALL_FUNC') {
        if (callDepth < 2 && functionBody.length > 0) {
          walk(functionBody, callDepth + 1);
        }
      } else {
        out.push({ type: b.type, blockId: b.id });
      }
    }
  }
  walk(blocks || [], 0);
  return out;
}

export function simulateProgram(
  level: LevelDef,
  chassis: ChassisGrid,
  blocks: CodeBlock[],
  functionBody: CodeBlock[] = []
): SimResult {
  const info = computeChassisInfo(chassis);
  const track = level.track;
  const gateIndex = track.length - 1;
  const hasHazards = levelHasDynamicHazards(level);
  let totalCrystals = 0;
  for (const t of track) {
    if (t.crystal) totalCrystals++;
  }

  let pos = 0;
  let tick = 0;
  let usedElseBranch = false;
  let usedFunctionCall = false;
  let usedWait = false;
  const collectedSet: Record<number, boolean> = {};
  const events: SimEvent[] = [];
  let execCount = 0;
  const MAX_EXEC = 128;
  let terminated: SimResult | null = null;

  function snapHazards(t: number) {
    return hasHazards ? evaluateAllHazardsAtTick(level, t) : undefined;
  }

  function makeResult(
    status: 'win' | 'fail',
    failReason: string | null,
    failCode: SimResult['failCode'],
    missingPart: PartId | null
  ): SimResult {
    return {
      status,
      failReason,
      failCode,
      missingPart,
      events,
      collectedCrystals: Object.keys(collectedSet).length,
      totalCrystals,
      finalPos: pos,
      finalTick: tick,
      usedElseBranch,
      usedFunctionCall,
      usedWait
    };
  }

  function checkDynamicHazardCollision(
    fromPos: number,
    landPos: number,
    action: 'MOVE' | 'JUMP' | 'BOOST' | 'WAIT',
    blockId: string,
    callerBlockId: string | null,
    newCrystals: number[],
    nextTick: number
  ): boolean {
    if (!hasHazards) return false;
    const hit = getBlockingHazardAtTile(level, landPos, nextTick);
    if (!hit) return false;
    tick = nextTick;
    pos = landPos;
    events.push({
      fromPos,
      toPos: landPos,
      action,
      tick,
      blockId,
      callerBlockId,
      hazardId: hit.id,
      hazardSnapshots: snapHazards(tick),
      status: 'fail',
      newCrystals
    });
    if (hit.kind === 'laser_gate') {
      terminated = makeResult(
        'fail',
        `Laser Barrier active at Tile ${landPos}! Use WAIT or IF [HAZARD] -> WAIT to pass on the open beat.`,
        'laser_gate',
        null
      );
    } else {
      terminated = makeResult(
        'fail',
        `Patrol Drone swept Tile ${landPos}! Time your step with WAIT, JUMP, or IF [HAZARD].`,
        'patrol_drone',
        null
      );
    }
    return true;
  }

  function executeAction(
    action: 'MOVE' | 'JUMP' | 'BOOST' | 'WAIT',
    blockId: string,
    callerBlockId: string | null
  ) {
    const newCrystals: number[] = [];

    if (action === 'WAIT') {
      usedWait = true;
      const nextTick = tick + 1;
      if (checkDynamicHazardCollision(pos, pos, action, blockId, callerBlockId, newCrystals, nextTick)) {
        return;
      }
      tick = nextTick;
      events.push({
        fromPos: pos,
        toPos: pos,
        action: 'WAIT',
        tick,
        blockId,
        callerBlockId,
        hazardSnapshots: snapHazards(tick),
        status: 'ok',
        newCrystals: []
      });
      return;
    }

    if (action === 'MOVE') {
      if (!info.hasDrive) {
        events.push({
          fromPos: pos,
          toPos: pos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals: []
        });
        terminated = makeResult('fail', 'Need Standard Wheels or Monster Treads!', 'missing_part', 'wheels');
        return;
      }
      const nextTick = tick + 1;
      const nextPos = Math.min(pos + 1, gateIndex);
      const tile = track[nextPos];
      if (tile.type === 'gap') {
        tick = nextTick;
        events.push({
          fromPos: pos,
          toPos: nextPos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fall',
          newCrystals: []
        });
        pos = nextPos;
        terminated = makeResult('fail', 'Gap ahead! Use JUMP or BOOST to cross.', 'gap', info.hasThrusters ? null : 'thrusters');
        return;
      }
      if (tile.type === 'ramp') {
        tick = nextTick;
        events.push({
          fromPos: pos,
          toPos: nextPos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals: []
        });
        terminated = makeResult(
          'fail',
          info.hasBooster ? 'Too steep to drive! Use BOOST!' : 'Need Turbo Booster for ramps!',
          info.hasBooster ? 'ramp' : 'missing_part',
          info.hasBooster ? null : 'booster'
        );
        return;
      }
      if (tile.type === 'mud' && !info.hasTreads) {
        tick = nextTick;
        events.push({
          fromPos: pos,
          toPos: nextPos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'stuck',
          newCrystals: []
        });
        pos = nextPos;
        terminated = makeResult('fail', 'Stuck in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      if (checkDynamicHazardCollision(pos, nextPos, action, blockId, callerBlockId, newCrystals, nextTick)) {
        return;
      }
      const fromM = pos;
      pos = nextPos;
      tick = nextTick;
      if (tile.crystal && !collectedSet[pos]) {
        collectedSet[pos] = true;
        newCrystals.push(pos);
      }
      events.push({
        fromPos: fromM,
        toPos: pos,
        action,
        tick,
        blockId,
        callerBlockId,
        hazardSnapshots: snapHazards(tick),
        status: 'ok',
        newCrystals
      });
    } else if (action === 'JUMP') {
      if (!info.hasThrusters) {
        events.push({
          fromPos: pos,
          toPos: pos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals: []
        });
        terminated = makeResult('fail', 'Need Jump Thrusters!', 'missing_part', 'thrusters');
        return;
      }
      const nextTick = tick + 1;
      const fromJ = pos;
      const landJ = Math.min(pos + 2, gateIndex);
      const landTileJ = track[landJ];
      if (landTileJ.type === 'gap') {
        tick = nextTick;
        events.push({
          fromPos: fromJ,
          toPos: landJ,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fall',
          newCrystals: []
        });
        pos = landJ;
        terminated = makeResult('fail', 'Landed in a gap! Adjust your JUMP spot.', 'gap', null);
        return;
      }
      if (landTileJ.type === 'ramp') {
        tick = nextTick;
        events.push({
          fromPos: fromJ,
          toPos: landJ,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals: []
        });
        terminated = makeResult('fail', 'Steep ramp! Use Turbo Booster + BOOST!', info.hasBooster ? 'ramp' : 'missing_part', info.hasBooster ? null : 'booster');
        return;
      }
      if (landTileJ.type === 'mud' && !info.hasTreads) {
        tick = nextTick;
        events.push({
          fromPos: fromJ,
          toPos: landJ,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'stuck',
          newCrystals: []
        });
        pos = landJ;
        terminated = makeResult('fail', 'Landed in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      if (checkDynamicHazardCollision(fromJ, landJ, action, blockId, callerBlockId, newCrystals, nextTick)) {
        return;
      }
      pos = landJ;
      tick = nextTick;
      if (landTileJ.crystal && !collectedSet[pos]) {
        collectedSet[pos] = true;
        newCrystals.push(pos);
      }
      events.push({
        fromPos: fromJ,
        toPos: pos,
        action,
        tick,
        blockId,
        callerBlockId,
        hazardSnapshots: snapHazards(tick),
        status: 'ok',
        newCrystals
      });
    } else if (action === 'BOOST') {
      if (!info.hasBooster) {
        events.push({
          fromPos: pos,
          toPos: pos,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals: []
        });
        terminated = makeResult('fail', 'Need Turbo Booster!', 'missing_part', 'booster');
        return;
      }
      const nextTick = tick + 1;
      const fromB = pos;
      const landB = Math.min(pos + 3, gateIndex);
      const landTileB = track[landB];
      for (let scan = fromB + 1; scan <= landB; scan++) {
        if (track[scan].crystal && track[scan].type !== 'gap' && !collectedSet[scan]) {
          collectedSet[scan] = true;
          newCrystals.push(scan);
        }
      }
      if (landTileB.type === 'gap') {
        tick = nextTick;
        events.push({
          fromPos: fromB,
          toPos: landB,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fall',
          newCrystals
        });
        pos = landB;
        terminated = makeResult('fail', 'Boosted into a gap!', 'gap', null);
        return;
      }
      if (landTileB.type === 'ramp') {
        tick = nextTick;
        events.push({
          fromPos: fromB,
          toPos: landB,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'fail',
          newCrystals
        });
        pos = landB;
        terminated = makeResult('fail', 'Stopped on a steep ramp! Boost from further back.', 'ramp', null);
        return;
      }
      if (landTileB.type === 'mud' && !info.hasTreads) {
        tick = nextTick;
        events.push({
          fromPos: fromB,
          toPos: landB,
          action,
          tick,
          blockId,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'stuck',
          newCrystals
        });
        pos = landB;
        terminated = makeResult('fail', 'Landed in mud! Need Monster Treads!', 'mud', 'treads');
        return;
      }
      if (checkDynamicHazardCollision(fromB, landB, action, blockId, callerBlockId, newCrystals, nextTick)) {
        return;
      }
      pos = landB;
      tick = nextTick;
      events.push({
        fromPos: fromB,
        toPos: pos,
        action,
        tick,
        blockId,
        callerBlockId,
        hazardSnapshots: snapHazards(tick),
        status: 'ok',
        newCrystals
      });
    }

    if (pos === gateIndex) {
      if (!info.hasFrontLaser) {
        terminated = makeResult('fail', 'Reached the gate, but need Laser Emitter on front slot!', 'missing_part', 'laser');
        return;
      }
      const objectiveFailure = getRouteObjectiveFailure(level, Object.keys(collectedSet).length, events);
      terminated = objectiveFailure
        ? makeResult('fail', objectiveFailure, 'objective_unmet', null)
        : makeResult('win', null, null, null);
    }
  }

  function runList(list: CodeBlock[], callerBlockId: string | null, callDepth: number) {
    if (!Array.isArray(list)) return;
    for (const blk of list) {
      if (terminated || execCount >= MAX_EXEC) return;
      if (!blk) continue;
      if (blk.type === 'LOOP') {
        const reps = Math.max(1, Math.min(5, blk.count || 2));
        for (let r = 0; r < reps && !terminated && execCount < MAX_EXEC; r++) {
          runList(blk.children || [], callerBlockId, callDepth);
        }
      } else if (blk.type === 'IF') {
        execCount++;
        const rawCond = String(blk.condition || 'GAP').toUpperCase();
        const cond: SensorCondition =
          rawCond === 'GAP' || rawCond === 'MUD' || rawCond === 'RAMP' || rawCond === 'HAZARD'
            ? rawCond
            : 'GAP';
        const scanTile = Math.min(pos + 1, gateIndex);
        let matched = false;
        if (cond === 'HAZARD') {
          matched = Boolean(detectHazardAheadForNextTick(level, pos, tick));
        } else {
          const aheadType = track[scanTile] ? String(track[scanTile].type || 'normal').toUpperCase() : 'NORMAL';
          matched = aheadType === cond;
        }
        const hasElse = Array.isArray(blk.elseChildren) && blk.elseChildren.length > 0;
        const branchTaken: 'then' | 'else' | 'skip' = matched ? 'then' : hasElse ? 'else' : 'skip';
        if (branchTaken === 'else') {
          usedElseBranch = true;
        }
        events.push({
          fromPos: pos,
          toPos: pos,
          action: 'SCAN',
          tick,
          condition: cond,
          scanTile,
          scanMatch: matched,
          branchTaken,
          blockId: blk.id,
          callerBlockId,
          hazardSnapshots: snapHazards(tick),
          status: 'ok',
          newCrystals: []
        });
        if (matched) {
          runList(blk.children || [], callerBlockId, callDepth);
        } else if (hasElse) {
          runList(blk.elseChildren || [], callerBlockId, callDepth);
        }
      } else if (blk.type === 'CALL_FUNC') {
        usedFunctionCall = true;
        if (!Array.isArray(functionBody) || functionBody.length === 0) {
          terminated = makeResult(
            'fail',
            'MY BLOCK is empty! Snap 1 or more blocks into the MY BLOCK tray first.',
            'empty_function',
            null
          );
          return;
        }
        if (callDepth >= 2) {
          continue;
        }
        runList(functionBody, blk.id, callDepth + 1);
      } else {
        execCount++;
        executeAction(blk.type, blk.id, callerBlockId);
      }
    }
  }

  runList(blocks || [], null, 0);

  if (terminated) return terminated;

  if (events.length === 0) {
    const emptyChild = hasEmptyContainer(blocks || []);
    return makeResult(
      'fail',
      emptyChild ? 'Loop or IF block is empty!' : 'Add command blocks below before running SparkBot!',
      emptyChild ? 'empty_container' : 'empty',
      null
    );
  }
  return makeResult('fail', 'Almost there! Add more blocks to reach the gate.', 'short', null);
}

export interface SimStepInspection {
  stepIndex: number;
  stepNumber: number;
  totalSteps: number;
  event: SimEvent;
  tilePosition: number;
  gateIndex: number;
  currentTileType: TileType;
  aheadTileType: TileType;
  crystalsCollected: number;
  totalCrystals: number;
  surveysCompleted?: number;
  activeCapabilities: string[];
  statusLabel: string;
  isLastStep: boolean;
  isFailure: boolean;
}

export function buildStepInspection(
  level: LevelDef,
  chassis: ChassisGrid,
  result: SimResult,
  stepIndex: number
): SimStepInspection | null {
  if (!result || !Array.isArray(result.events) || result.events.length === 0) return null;
  const clampedIdx = Math.max(0, Math.min(result.events.length - 1, Math.floor(stepIndex)));
  const ev = result.events[clampedIdx];
  const gateIndex = Math.max(0, level.track.length - 1);
  const tilePosition = Math.max(0, Math.min(gateIndex, ev.toPos));
  const currentTileType: TileType = level.track[tilePosition]?.type ?? 'normal';
  const aheadIdx = Math.min(tilePosition + 1, gateIndex);
  const aheadTileType: TileType = level.track[aheadIdx]?.type ?? 'gate';

  const crystalSeen = new Set<number>();
  for (let i = 0; i <= clampedIdx; i++) {
    const arr = result.events[i]?.newCrystals;
    if (Array.isArray(arr)) {
      for (const cIdx of arr) crystalSeen.add(cIdx);
    }
  }

  const info = computeChassisInfo(chassis);
  const activeCapabilities: string[] = [];
  if (info.hasWheels) activeCapabilities.push('Wheels');
  if (info.hasTreads) activeCapabilities.push('Treads');
  if (info.hasThrusters) activeCapabilities.push('Thrusters');
  if (info.hasBooster) activeCapabilities.push('Booster');
  if (info.hasFrontLaser) activeCapabilities.push('Laser');
  if (info.hasMagnet) activeCapabilities.push('Magnet');

  let statusLabel = '';
  const fnPrefix = ev.callerBlockId ? 'MY BLOCK · ' : '';
  if (ev.action === 'SCAN') {
    const cond = ev.condition || 'GAP';
    if (ev.scanMatch) {
      statusLabel = `${fnPrefix}IF [${cond}] → TRUE (run THEN)`;
    } else if (ev.branchTaken === 'else') {
      statusLabel = `${fnPrefix}IF [${cond}] → FALSE (run ELSE)`;
    } else {
      statusLabel = `${fnPrefix}IF [${cond}] → FALSE (skip branch)`;
    }
  } else if (ev.action === 'WAIT') {
    statusLabel =
      ev.status === 'fail'
        ? `${fnPrefix}${result.failReason || `WAIT blocked at Tile ${tilePosition}`}`
        : `${fnPrefix}WAIT → Held on Tile ${tilePosition} (Beat ${ev.tick ?? 1})`;
  } else if (ev.status === 'fall') {
    statusLabel = `${fnPrefix}${ev.action} → Fell into gap at Tile ${tilePosition}`;
  } else if (ev.status === 'stuck') {
    statusLabel = `${fnPrefix}${ev.action} → Stuck in mud at Tile ${tilePosition}`;
  } else if (ev.status === 'fail') {
    statusLabel = `${fnPrefix}${result.failReason || `${ev.action} blocked at Tile ${tilePosition}`}`;
  } else if (tilePosition === gateIndex) {
    statusLabel = `${fnPrefix}${ev.action} → Reached Laser Gate (Tile ${tilePosition})!`;
  } else if (ev.action === 'MOVE') {
    statusLabel = `${fnPrefix}MOVE → Rolled to Tile ${tilePosition}`;
  } else if (ev.action === 'JUMP') {
    statusLabel = `${fnPrefix}JUMP → Leaped to Tile ${tilePosition}`;
  } else {
    statusLabel = `${fnPrefix}BOOST → Surged to Tile ${tilePosition}`;
  }

  return {
    stepIndex: clampedIdx,
    stepNumber: clampedIdx + 1,
    totalSteps: result.events.length,
    event: ev,
    tilePosition,
    gateIndex,
    currentTileType,
    aheadTileType,
    crystalsCollected: crystalSeen.size,
    totalCrystals: result.totalCrystals,
    ...(getSurveyStations(level) ? {surveysCompleted:getSurveyProgress(level,result.events.slice(0,clampedIdx+1))} : {}),
    activeCapabilities,
    statusLabel,
    isLastStep: clampedIdx >= result.events.length - 1,
    isFailure: ev.status !== 'ok'
  };
}

export function collectAncestorBlockIds(
  blocks: CodeBlock[],
  targetId: string | null,
  functionBody?: CodeBlock[]
): string[] {
  if (!targetId || !Array.isArray(blocks)) return [];
  const path: string[] = [];
  function dfs(list: CodeBlock[]): boolean {
    for (const blk of list) {
      if (blk.id === targetId) return true;
      if (Array.isArray(blk.children) && blk.children.length > 0) {
        path.push(blk.id);
        if (dfs(blk.children)) return true;
        path.pop();
      }
      if (Array.isArray(blk.elseChildren) && blk.elseChildren.length > 0) {
        path.push(blk.id);
        if (dfs(blk.elseChildren)) return true;
        path.pop();
      }
    }
    return false;
  }
  if (dfs(blocks)) return path;
  if (Array.isArray(functionBody) && functionBody.length > 0) {
    path.length = 0;
    if (dfs(functionBody)) return path;
  }
  return [];
}

export function calculateStars(
  level: LevelDef,
  energyCost: number,
  blockCount: number,
  collectedCrystals: number,
  totalCrystals: number
): { stars: number; allCrystals: boolean; withinPar: boolean } {
  const allCrystals = totalCrystals === 0 || collectedCrystals >= totalCrystals;
  const withinPar = blockCount <= level.parBlocks && energyCost <= level.parBudget;
  let stars = 1;
  if (allCrystals && withinPar) {
    stars = 3;
  } else if (allCrystals || withinPar) {
    stars = 2;
  }
  return { stars, allCrystals, withinPar };
}

export const CHASSIS_SOLVER_PROFILES = [
  { label: 'Standard Wheels + Laser Emitter', cost: 45, wheels: true, treads: false, thrusters: false, booster: false },
  { label: 'Monster Treads + Laser Emitter', cost: 60, wheels: false, treads: true, thrusters: false, booster: false },
  { label: 'Standard Wheels + Turbo Booster + Laser Emitter', cost: 75, wheels: true, treads: false, thrusters: false, booster: true },
  { label: 'Standard Wheels + Jump Thrusters + Laser Emitter', cost: 80, wheels: true, treads: false, thrusters: true, booster: false },
  { label: 'Monster Treads + Turbo Booster + Laser Emitter', cost: 90, wheels: false, treads: true, thrusters: false, booster: true },
  { label: 'Monster Treads + Jump Thrusters + Laser Emitter', cost: 95, wheels: false, treads: true, thrusters: true, booster: false },
  { label: 'Standard Wheels + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 110, wheels: true, treads: false, thrusters: true, booster: true },
  { label: 'Monster Treads + Jump Thrusters + Turbo Booster + Laser Emitter', cost: 125, wheels: false, treads: true, thrusters: true, booster: true }
];

export function findShortestTrackPlan(level: LevelDef): {
  profile: (typeof CHASSIS_SOLVER_PROFILES)[number];
  sequence: string[];
} | null {
  const track = level?.track || [];
  const gateIndex = track.length - 1;
  if (gateIndex <= 0) return null;
  const hasHazards = levelHasDynamicHazards(level);
  const canWait = Boolean(level.waitUnlocked);

  for (const prof of CHASSIS_SOLVER_PROFILES) {
    if (prof.cost > level.budget) continue;
    const queue = [{ pos: 0, tick: 0, seq: [] as string[], crystals: 0 }];
    const bestAt: Record<string, number> = { '0:0': 0 };

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.pos === gateIndex) return { profile: prof, sequence: cur.seq };
      if (cur.seq.length >= 22) continue;

      const nextTick = cur.tick + 1;

      if (prof.wheels || prof.treads) {
        const np = Math.min(cur.pos + 1, gateIndex);
        const nt = track[np];
        const hazardBlocked = hasHazards && Boolean(getBlockingHazardAtTile(level, np, nextTick));
        if (!hazardBlocked && nt.type !== 'gap' && nt.type !== 'ramp' && (nt.type !== 'mud' || prof.treads)) {
          const nc = cur.crystals + (nt.crystal ? 1 : 0);
          const keyM = hasHazards ? `${np}:${nextTick}` : `${np}:${cur.seq.length}`;
          if (bestAt[keyM] === undefined || nc > bestAt[keyM]) {
            bestAt[keyM] = nc;
            queue.push({ pos: np, tick: nextTick, seq: [...cur.seq, 'MOVE'], crystals: nc });
          }
        }
      }

      if (prof.thrusters) {
        const jp = Math.min(cur.pos + 2, gateIndex);
        const jt = track[jp];
        const hazardBlocked = hasHazards && Boolean(getBlockingHazardAtTile(level, jp, nextTick));
        if (!hazardBlocked && jt.type !== 'gap' && jt.type !== 'ramp' && (jt.type !== 'mud' || prof.treads)) {
          const jc = cur.crystals + (jt.crystal ? 1 : 0);
          const keyJ = hasHazards ? `${jp}:${nextTick}` : `${jp}:${cur.seq.length}`;
          if (bestAt[keyJ] === undefined || jc > bestAt[keyJ]) {
            bestAt[keyJ] = jc;
            queue.push({ pos: jp, tick: nextTick, seq: [...cur.seq, 'JUMP'], crystals: jc });
          }
        }
      }

      if (prof.booster) {
        const bp = Math.min(cur.pos + 3, gateIndex);
        const bt = track[bp];
        const hazardBlocked = hasHazards && Boolean(getBlockingHazardAtTile(level, bp, nextTick));
        if (!hazardBlocked && bt.type !== 'gap' && bt.type !== 'ramp' && (bt.type !== 'mud' || prof.treads)) {
          let bc = cur.crystals;
          for (let s = cur.pos + 1; s <= bp; s++) {
            if (track[s].crystal && track[s].type !== 'gap') bc++;
          }
          const keyB = hasHazards ? `${bp}:${nextTick}` : `${bp}:${cur.seq.length}`;
          if (bestAt[keyB] === undefined || bc > bestAt[keyB]) {
            bestAt[keyB] = bc;
            queue.push({ pos: bp, tick: nextTick, seq: [...cur.seq, 'BOOST'], crystals: bc });
          }
        }
      }

      if (hasHazards && canWait) {
        const waitBlocked = Boolean(getBlockingHazardAtTile(level, cur.pos, nextTick));
        if (!waitBlocked) {
          const keyW = `${cur.pos}:${nextTick}`;
          if (bestAt[keyW] === undefined || cur.crystals > bestAt[keyW]) {
            bestAt[keyW] = cur.crystals;
            queue.push({ pos: cur.pos, tick: nextTick, seq: [...cur.seq, 'WAIT'], crystals: cur.crystals });
          }
        }
      }
    }
  }
  return null;
}

export function computeCompressedBlockCount(seq: string[]): number {
  if (!seq || seq.length === 0) return 0;
  const memo: Record<string, number> = {};
  function minCost(sub: string[]): number {
    const key = sub.join(',');
    if (memo[key] !== undefined) return memo[key];
    let best = sub.length;
    const n = sub.length;
    for (let start = 0; start < n; start++) {
      for (let pLen = 1; pLen <= Math.floor((n - start) / 2); pLen++) {
        for (let reps = 2; reps <= 3; reps++) {
          if (start + pLen * reps > n) break;
          let ok = true;
          for (let idx = 0; idx < pLen * reps; idx++) {
            if (sub[start + idx] !== sub[start + (idx % pLen)]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            const inside = minCost(sub.slice(start, start + pLen));
            const candidate = start + (1 + inside) + minCost(sub.slice(start + pLen * reps));
            if (candidate < best) best = candidate;
          }
        }
      }
    }
    memo[key] = best;
    return best;
  }
  return minCost(seq);
}

export function findOptimalCrystalTrackSolution(track: TrackTile[], maxBudget: number) {
  const gateIndex = track.length - 1;
  if (gateIndex <= 0) return null;
  const crystalMaskOf: Record<number, number> = {};
  let totalCrystals = 0;
  for (let i = 0; i < track.length; i++) {
    if (track[i].crystal && track[i].type !== 'gap') {
      crystalMaskOf[i] = 1 << totalCrystals;
      totalCrystals++;
    }
  }
  const targetMask = (1 << totalCrystals) - 1;

  for (const prof of CHASSIS_SOLVER_PROFILES) {
    if (prof.cost > maxBudget) continue;
    const queue = [{ pos: 0, mask: 0, seq: [] as string[] }];
    const visited: Record<string, boolean> = { '0:0': true };

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.pos === gateIndex && cur.mask === targetMask) {
        return { profile: prof, sequence: cur.seq };
      }
      if (cur.seq.length >= 16) continue;

      if (prof.wheels || prof.treads) {
        const np = Math.min(cur.pos + 1, gateIndex);
        const nt = track[np];
        if (nt.type !== 'gap' && nt.type !== 'ramp' && (nt.type !== 'mud' || prof.treads)) {
          const nm = cur.mask | (crystalMaskOf[np] || 0);
          const mk = `${np}:${nm}`;
          if (!visited[mk]) {
            visited[mk] = true;
            queue.push({ pos: np, mask: nm, seq: [...cur.seq, 'MOVE'] });
          }
        }
      }

      if (prof.thrusters) {
        const jp = Math.min(cur.pos + 2, gateIndex);
        const jt = track[jp];
        if (jt.type !== 'gap' && jt.type !== 'ramp' && (jt.type !== 'mud' || prof.treads)) {
          const jm = cur.mask | (crystalMaskOf[jp] || 0);
          const jk = `${jp}:${jm}`;
          if (!visited[jk]) {
            visited[jk] = true;
            queue.push({ pos: jp, mask: jm, seq: [...cur.seq, 'JUMP'] });
          }
        }
      }

      if (prof.booster) {
        const bp = Math.min(cur.pos + 3, gateIndex);
        const bt = track[bp];
        if (bt.type !== 'gap' && bt.type !== 'ramp' && (bt.type !== 'mud' || prof.treads)) {
          let bm = cur.mask;
          for (let s = cur.pos + 1; s <= bp; s++) {
            bm |= crystalMaskOf[s] || 0;
          }
          const bk = `${bp}:${bm}`;
          if (!visited[bk]) {
            visited[bk] = true;
            queue.push({ pos: bp, mask: bm, seq: [...cur.seq, 'BOOST'] });
          }
        }
      }
    }
  }
  return null;
}

function compressSequenceSuggestion(seq: string[]): string {
  if (!seq || seq.length === 0) return '';
  const allSame = seq.every((s) => s === seq[0]);
  if (allSame && seq.length >= 2 && seq.length <= 3) {
    return `Wrap [${seq[0]}] inside a LOOP ${seq.length}x block (${seq.length} repeats).`;
  }
  for (let k = 1; k <= 3; k++) {
    if (seq.length >= k * 2 && seq.length % k === 0) {
      const reps = seq.length / k;
      if (reps === 2 || reps === 3) {
        let match = true;
        for (let idx = 0; idx < seq.length; idx++) {
          if (seq[idx] !== seq[idx % k]) {
            match = false;
            break;
          }
        }
        if (match) return `Wrap [${seq.slice(0, k).join(' → ')}] inside a LOOP ${reps}x block.`;
      }
    }
  }
  if (seq.length >= 8) {
    const [p0, p1] = seq;
    if (seq[2] === p0 && seq[3] === p1 && seq[4] === p0 && seq[5] === p1 && seq[6] === p0 && seq[7] === p1) {
      const tail = seq.slice(8);
      return `Nest LOOP 2x [ ${p0} → ${p1} ] inside an outer LOOP 2x${tail.length > 0 ? `, then finish with ${tail.join(' → ')}.` : '.'}`;
    }
  }
  for (let pk = 1; pk <= 2; pk++) {
    for (let preps = 3; preps >= 2; preps--) {
      if (seq.length > pk * preps) {
        let pMatch = true;
        for (let pi = 0; pi < pk * preps; pi++) {
          if (seq[pi] !== seq[pi % pk]) {
            pMatch = false;
            break;
          }
        }
        if (pMatch) {
          const pTail = seq.slice(pk * preps);
          return `Wrap [${seq.slice(0, pk).join(' → ')}] inside a LOOP ${preps}x block, then add ${pTail.join(' → ')}.`;
        }
      }
    }
  }
  return `Sequence structure: ${seq.join(' → ')}.`;
}

export function generateStructuralHint(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit' | 'sandbox' | 'action',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid,
  functionBody: CodeBlock[] = []
): string {
  if (!level) return '';
  const info = computeChassisInfo(chassis || createEmptyChassis());
  const plan = findShortestTrackPlan(level);

  if (phase === 'build') {
    if (!info.hasFrontLaser) {
      return plan
        ? `Build structure: Equip ${plan.profile.label} (${plan.profile.cost} pts) with Laser on the right FRONT column.`
        : 'Build structure: Place a Laser Emitter on the right FRONT column and a drive base (Wheels or Treads).';
    }
    if (!info.hasDrive && (!plan || plan.profile.wheels || plan.profile.treads)) {
      return `Build structure: Add Standard Wheels (normal ground) or Monster Treads (mud + ground) within your ${level.budget}-pt budget.`;
    }
    if (plan) {
      const missing: string[] = [];
      if (plan.profile.treads && !info.hasTreads) missing.push('Monster Treads');
      if (plan.profile.thrusters && !info.hasThrusters) missing.push('Jump Thrusters');
      if (plan.profile.booster && !info.hasBooster) missing.push('Turbo Booster');
      if (missing.length > 0) {
        return `Build structure: Try adding ${missing.join(' + ')} (Recommended setup: ${plan.profile.label}, ${plan.profile.cost} pts).`;
      }
    }
    return 'Your chassis fits this course! Tap NEXT: CODE ➔ to program SparkBot.';
  }

  if (phase === 'code') {
    const blkCount = Array.isArray(program)
      ? countBlocks(program, level.functionUnlocked ? functionBody : undefined)
      : 0;
    if (blkCount > 0) {
      const sim = simulateProgram(level, chassis || createEmptyChassis(), program, functionBody);
      if (sim.status === 'win') {
        if (blkCount > level.parBlocks && level.loopUnlocked && plan) {
          if (level.ifUnlocked) {
            return `Your code reaches the gate! To hit Par ${level.parBlocks} blocks, combine LOOP with IF [GAP / MUD / RAMP] sensor blocks!`;
          }
          return `Your code reaches the gate! To hit Par ${level.parBlocks} blocks: ${compressSequenceSuggestion(plan.sequence)}`;
        }
        return 'Code looks ready! Press ▶ RUN SPARKBOT to launch SparkBot to the gate.';
      }
      if (sim.missingPart) {
        return `Hardware check: ${sim.failReason} Tap Build below to adjust your chassis.`;
      }
    }

    if (plan) {
      if (level.ifUnlocked) {
        return `Code structure (Par ${level.parBlocks} blocks): Nest IF [GAP / MUD / RAMP] sensor blocks inside LOOP to react to hazards ahead!`;
      }
      if (level.loopUnlocked) {
        return `Code structure (Par ${level.parBlocks} blocks): ${compressSequenceSuggestion(plan.sequence)}`;
      }
      return `Code structure: Chain ${plan.sequence.join(' → ')} to cross every obstacle cleanly.`;
    }
    return 'Code structure: Chain MOVE, JUMP, and BOOST blocks to reach the gate.';
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    if (fix) {
      const kind = circuitGrid[fix.r][fix.c].type === 'splitter' ? 'Beam Splitter' : 'Mirror';
      return `Circuit structure (${fix.flips} rotation${fix.flips > 1 ? 's' : ''} away): Tap the ${kind} at Row ${fix.r + 1}, Col ${fix.c + 1} to redirect the beam.`;
    }
    return 'Trace the cyan laser from Row 3 left edge and rotate mirrors or splitters so all Power Cores light up.';
  }

  return '';
}

export interface TutorialStep {
  stepNum: number;
  totalSteps: number;
  message: string;
  targetType: 'part' | 'slot' | 'cmd' | 'button' | 'circuit' | null;
  targetKey: string | null;
  circuitTarget: { r: number; c: number } | null;
}

export function getTutorialStep(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit' | 'sandbox' | 'action',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid,
  selectedPart: PartId | null,
  functionBody: CodeBlock[] = []
): TutorialStep {
  const info = computeChassisInfo(chassis || createEmptyChassis());
  const plan = findShortestTrackPlan(level);
  const needsTreads = plan ? plan.profile.treads : false;
  const needsThrusters = plan ? plan.profile.thrusters : false;
  const needsBooster = plan ? plan.profile.booster : false;
  const drivePart: PartId = needsTreads ? 'treads' : 'wheels';
  const totalSteps = 6;

  if (phase === 'build') {
    if (!info.hasDrive) {
      if (selectedPart === drivePart) {
        return {
          stepNum: 1,
          totalSteps,
          message: 'Slot 2,0',
          targetType: 'slot',
          targetKey: '2,0',
          circuitTarget: null
        };
      }
      return {
        stepNum: 1,
        totalSteps,
        message: drivePart,
        targetType: 'part',
        targetKey: drivePart,
        circuitTarget: null
      };
    }
    if (needsTreads && !info.hasTreads) {
      return {
        stepNum: 1,
        totalSteps,
        message: 'treads',
        targetType: selectedPart === 'treads' ? 'slot' : 'part',
        targetKey: selectedPart === 'treads' ? '2,0' : 'treads',
        circuitTarget: null
      };
    }
    if (needsThrusters && !info.hasThrusters) {
      return {
        stepNum: 2,
        totalSteps,
        message: 'thrusters',
        targetType: selectedPart === 'thrusters' ? 'slot' : 'part',
        targetKey: selectedPart === 'thrusters' ? '1,0' : 'thrusters',
        circuitTarget: null
      };
    }
    if (needsBooster && !info.hasBooster) {
      return {
        stepNum: 2,
        totalSteps,
        message: 'booster',
        targetType: selectedPart === 'booster' ? 'slot' : 'part',
        targetKey: selectedPart === 'booster' ? '0,0' : 'booster',
        circuitTarget: null
      };
    }
    if (!info.hasFrontLaser) {
      if (selectedPart === 'laser') {
        return {
          stepNum: 2,
          totalSteps,
          message: 'Slot 1,2',
          targetType: 'slot',
          targetKey: '1,2',
          circuitTarget: null
        };
      }
      return {
        stepNum: 2,
        totalSteps,
        message: 'laser',
        targetType: 'part',
        targetKey: 'laser',
        circuitTarget: null
      };
    }
    return {
      stepNum: 3,
      totalSteps,
      message: 'toCodeBtn',
      targetType: 'button',
      targetKey: 'toCodeBtn',
      circuitTarget: null
    };
  }

  if (phase === 'code') {
    const sim = simulateProgram(level, chassis || createEmptyChassis(), program || [], functionBody);
    if (sim.status === 'win') {
      return {
        stepNum: 5,
        totalSteps,
        message: 'runCodeBtn',
        targetType: 'button',
        targetKey: 'runCodeBtn',
        circuitTarget: null
      };
    }
    if (sim.missingPart) {
      return {
        stepNum: 1,
        totalSteps,
        message: 'toBuildBtn',
        targetType: 'button',
        targetKey: 'toBuildBtn',
        circuitTarget: null
      };
    }
    const flat = flattenBlocks(program || [], 64, functionBody);
    const seq = plan ? plan.sequence : ['MOVE'];
    const nextCmd = seq[Math.min(flat.length, seq.length - 1)] || 'MOVE';
    return {
      stepNum: 4,
      totalSteps,
      message: `${flat.length} / ${seq.length}`,
      targetType: 'cmd',
      targetKey: nextCmd,
      circuitTarget: null
    };
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    return {
      stepNum: 6,
      totalSteps,
      message: 'circuit',
      targetType: fix ? 'circuit' : null,
      targetKey: null,
      circuitTarget: fix ? { r: fix.r, c: fix.c } : null
    };
  }

  return {
    stepNum: 1,
    totalSteps,
    message: '',
    targetType: null,
    targetKey: null,
    circuitTarget: null
  };
}

export function validateBonusStarConditions(
  level: LevelDef,
  energyCost: number,
  blockCount: number,
  collectedCrystals: number,
  totalCrystals: number
) {
  if (!level || typeof level !== 'object') {
    return {
      earned: false,
      fullCrystals: false,
      withinBlockPar: false,
      withinBudgetPar: false,
      withinPar: false,
      collectedCrystals: 0,
      totalCrystals: 0,
      blockCount: 0,
      parBlocks: 0,
      energyCost: 0,
      parBudget: 0
    };
  }
  const safeTotalCrystals = parseNonNegInt(totalCrystals);
  const safeCollected = parseNonNegInt(collectedCrystals);
  const safeBlocks = parseNonNegInt(blockCount);
  const safeCost = parseNonNegInt(energyCost);
  const parBlocks = parseNonNegInt(level.parBlocks);
  const parBudget = parseNonNegInt(level.parBudget);

  const fullCrystals = safeTotalCrystals === 0 || safeCollected >= safeTotalCrystals;
  const withinBlockPar = parBlocks > 0 ? safeBlocks <= parBlocks : true;
  const withinBudgetPar = parBudget > 0 ? safeCost <= parBudget : true;
  const withinPar = withinBlockPar && withinBudgetPar;

  return {
    earned: Boolean(fullCrystals && withinPar),
    fullCrystals,
    withinBlockPar,
    withinBudgetPar,
    withinPar,
    collectedCrystals: safeCollected,
    totalCrystals: safeTotalCrystals,
    blockCount: safeBlocks,
    parBlocks,
    energyCost: safeCost,
    parBudget
  };
}

export function evaluateBonusStar(
  level: LevelDef,
  starInfo: { stars: number; allCrystals: boolean | number; withinPar: boolean }
): boolean {
  if (!level || !level.isBonus || !starInfo) return false;
  return Boolean(starInfo.stars >= 3 && starInfo.allCrystals && starInfo.withinPar);
}

export type GhostPreviewPlan =
  | { kind: 'build'; partId: PartId; targetSlot: [number, number] }
  | {
      kind: 'code';
      actionSequence: Array<'MOVE' | 'JUMP' | 'BOOST' | 'WAIT'>;
      simResult: SimResult;
      missingBlockType: BlockType;
      highlightCondition?: SensorCondition;
    }
  | { kind: 'circuit'; cell: { r: number; c: number }; targetFlips: number };

export function computeGhostPreviewPlan(
  level: LevelDef,
  phase: 'build' | 'code' | 'circuit',
  chassis: ChassisGrid,
  program: CodeBlock[],
  circuitGrid: CircuitGrid,
  functionBody: CodeBlock[] = []
): GhostPreviewPlan | null {
  const plan = findShortestTrackPlan(level);
  const info = computeChassisInfo(chassis || createEmptyChassis());

  if (phase === 'build') {
    const needsTreads = plan ? plan.profile.treads : false;
    const needsThrusters = plan ? plan.profile.thrusters : false;
    const needsBooster = plan ? plan.profile.booster : false;

    if (needsTreads && !info.hasTreads) {
      return { kind: 'build', partId: 'treads', targetSlot: PARTS.treads.preferredSlot };
    }
    if (!info.hasDrive) {
      return { kind: 'build', partId: 'wheels', targetSlot: PARTS.wheels.preferredSlot };
    }
    if (needsThrusters && !info.hasThrusters) {
      return { kind: 'build', partId: 'thrusters', targetSlot: PARTS.thrusters.preferredSlot };
    }
    if (needsBooster && !info.hasBooster) {
      return { kind: 'build', partId: 'booster', targetSlot: PARTS.booster.preferredSlot };
    }
    if (!info.hasFrontLaser) {
      return { kind: 'build', partId: 'laser', targetSlot: PARTS.laser.preferredSlot };
    }
    return null;
  }

  if (phase === 'code') {
    const seq = (plan?.sequence || ['MOVE']).filter(
      (s): s is 'MOVE' | 'JUMP' | 'BOOST' | 'WAIT' =>
        s === 'MOVE' || s === 'JUMP' || s === 'BOOST' || s === 'WAIT'
    );
    const ghostChassis = cloneChassis(chassis);
    if (plan?.profile.treads) ghostChassis[2][0] = 'treads';
    else if (!info.hasDrive) ghostChassis[2][0] = 'wheels';
    if (plan?.profile.thrusters) ghostChassis[1][0] = 'thrusters';
    if (plan?.profile.booster) ghostChassis[0][0] = 'booster';
    ghostChassis[1][2] = 'laser';

    const ghostBlocks: CodeBlock[] = seq.map((act, idx) => ({
      id: `ghost_${idx}`,
      type: act
    }));
    const simResult = simulateProgram(level, ghostChassis, ghostBlocks);
    const flat = flattenBlocks(program || [], 64, functionBody);
    const nextAction = (seq[Math.min(flat.length, seq.length - 1)] || 'MOVE') as BlockType;

    let highlightCondition: SensorCondition | undefined;
    if (level.ifUnlocked) {
      if (levelHasDynamicHazards(level)) highlightCondition = 'HAZARD';
      else if (level.track.some((t) => t.type === 'gap')) highlightCondition = 'GAP';
      else if (level.track.some((t) => t.type === 'mud')) highlightCondition = 'MUD';
      else if (level.track.some((t) => t.type === 'ramp')) highlightCondition = 'RAMP';
    }

    return {
      kind: 'code',
      actionSequence: seq,
      simResult,
      missingBlockType: level.loopUnlocked && seq.length >= 4 && flat.length === 0 ? 'LOOP' : nextAction,
      highlightCondition
    };
  }

  if (phase === 'circuit') {
    const fix = findCircuitFixCell(circuitGrid);
    if (!fix) return null;
    return {
      kind: 'circuit',
      cell: { r: fix.r, c: fix.c },
      targetFlips: fix.flips
    };
  }

  return null;
}
