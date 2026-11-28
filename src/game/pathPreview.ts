import { collectAncestorBlockIds, simulateProgram } from './simulator';
import {
  clampTrackBotZBeforeClosedGate,
  getTrackBotStopZ,
  sampleTrackSurfaceAtZ
} from './trackSurface';
import type {
  ChassisGrid,
  CodeBlock,
  HazardTickSnapshot,
  LevelDef,
  PartId,
  SensorCondition,
  SimResult,
  TrackTile
} from './types';

export interface PathPreviewSegment {
  index: number;
  blockId: string;
  callerBlockId?: string | null;
  ancestorBlockIds: string[];
  action: 'MOVE' | 'JUMP' | 'BOOST' | 'WAIT';
  tick: number;
  fromPos: number;
  toPos: number;
  fromZ: number;
  toZ: number;
  arcHeight: number;
  status: 'ok' | 'fail' | 'fall' | 'stuck';
  newCrystals: number[];
  hazardSnapshots?: HazardTickSnapshot[];
}

export interface PathPreviewScan {
  index: number;
  blockId: string;
  callerBlockId?: string | null;
  ancestorBlockIds: string[];
  tick: number;
  atPos: number;
  scanTile: number;
  atZ: number;
  scanZ: number;
  condition: SensorCondition;
  matched: boolean;
  branchTaken?: 'then' | 'else' | 'skip';
}

export type PathPreviewOutcomeStatus = 'empty' | 'win' | 'short' | 'hazard';

export interface PathPreviewEndpoint {
  status: PathPreviewOutcomeStatus;
  tileIndex: number;
  gateIndex: number;
  z: number;
  failCode: SimResult['failCode'];
  missingPart: PartId | null;
  summaryLabel: string;
  collectedCrystals: number;
  totalCrystals: number;
}

export interface LivePathPreview {
  segments: PathPreviewSegment[];
  scans: PathPreviewScan[];
  endpoint: PathPreviewEndpoint;
  simResult: SimResult;
}

function formatMissingPartSummary(
  missingPart: PartId | null,
  hazardTile: number
): string {
  if (missingPart === 'laser') return 'Need Front Laser';
  if (missingPart === 'treads') return `Mud at Tile ${hazardTile} · Need Treads`;
  if (missingPart === 'thrusters') return 'Need Thrusters';
  if (missingPart === 'booster') return 'Need Booster';
  if (missingPart === 'wheels') return 'Need Wheels or Treads';
  return 'Missing Part';
}

export function buildLivePathPreview(
  level: LevelDef,
  chassis: ChassisGrid,
  program: CodeBlock[],
  functionBody: CodeBlock[] = []
): LivePathPreview {
  const track = level.track;
  const gateIndex = Math.max(0, track.length - 1);
  const simResult = simulateProgram(level, chassis, program, functionBody);
  const ancestorCache = new Map<string, string[]>();

  const getAncestors = (blockId: string, callerBlockId?: string | null): string[] => {
    const cacheKey = `${blockId}|${callerBlockId || ''}`;
    const cached = ancestorCache.get(cacheKey);
    if (cached) return cached;
    const found = collectAncestorBlockIds(program, blockId, functionBody);
    if (callerBlockId) {
      const callerAnc = collectAncestorBlockIds(program, callerBlockId);
      const merged = Array.from(new Set([...found, callerBlockId, ...callerAnc]));
      ancestorCache.set(cacheKey, merged);
      return merged;
    }
    ancestorCache.set(cacheKey, found);
    return found;
  };

  const segments: PathPreviewSegment[] = [];
  const scans: PathPreviewScan[] = [];
  let lastActionSegment: PathPreviewSegment | null = null;

  for (const ev of simResult.events) {
    const ancestorBlockIds = getAncestors(ev.blockId, ev.callerBlockId);
    if (ev.action === 'SCAN') {
      const scanTile = ev.scanTile ?? Math.min(ev.fromPos + 1, gateIndex);
      scans.push({
        index: scans.length,
        blockId: ev.blockId,
        callerBlockId: ev.callerBlockId,
        ancestorBlockIds,
        tick: ev.tick ?? 0,
        atPos: ev.fromPos,
        scanTile,
        atZ: getTrackBotStopZ(track, ev.fromPos),
        scanZ: getTrackBotStopZ(track, scanTile),
        condition: ev.condition || 'GAP',
        matched: Boolean(ev.scanMatch),
        branchTaken: ev.branchTaken
      });
      continue;
    }

    const fromZ = getTrackBotStopZ(track, ev.fromPos);
    let toZ = getTrackBotStopZ(track, ev.toPos);
    if (
      ev.action !== 'WAIT' &&
      ev.fromPos === ev.toPos &&
      ev.status === 'fail' &&
      ev.fromPos < gateIndex
    ) {
      // Blocked before moving (e.g. missing part on start/tile): project short directional stub
      toZ = clampTrackBotZBeforeClosedGate(track, fromZ - 0.95, false);
    }

    const arcHeight = ev.action === 'JUMP' ? 1.85 : ev.action === 'BOOST' ? 0.95 : 0;
    const seg: PathPreviewSegment = {
      index: segments.length,
      blockId: ev.blockId,
      callerBlockId: ev.callerBlockId,
      ancestorBlockIds,
      action: ev.action,
      tick: ev.tick ?? segments.length + 1,
      fromPos: ev.fromPos,
      toPos: ev.toPos,
      fromZ,
      toZ,
      arcHeight,
      status: ev.status,
      newCrystals: Array.isArray(ev.newCrystals) ? [...ev.newCrystals] : [],
      hazardSnapshots: ev.hazardSnapshots
    };
    segments.push(seg);
    lastActionSegment = seg;
  }

  let endpointStatus: PathPreviewOutcomeStatus = 'short';
  let endpointTile = simResult.finalPos;
  let endpointZ = getTrackBotStopZ(track, endpointTile);
  let summaryLabel = `Stops at Tile ${endpointTile}/${gateIndex}`;

  if (
    simResult.events.length === 0 ||
    simResult.failCode === 'empty' ||
    simResult.failCode === 'empty_container' ||
    simResult.failCode === 'empty_function'
  ) {
    endpointStatus = 'empty';
    endpointTile = 0;
    endpointZ = getTrackBotStopZ(track, 0);
    summaryLabel =
      simResult.failCode === 'empty_function'
        ? 'Add blocks to MY BLOCK tray'
        : simResult.failCode === 'empty_container'
          ? 'Empty Loop or IF block'
          : 'Add blocks to preview route';
  } else if (simResult.status === 'win') {
    endpointStatus = 'win';
    endpointTile = gateIndex;
    endpointZ = getTrackBotStopZ(track, gateIndex);
    summaryLabel = level.isBoss ? 'Reaches Boss Sentinel!' : 'Reaches Gate';
  } else if (simResult.failCode === 'objective_unmet') {
    endpointStatus = 'short';
    summaryLabel = simResult.failReason || 'Collection goal not reached';
  } else if (simResult.failCode === 'short') {
    endpointStatus = 'short';
    endpointTile = simResult.finalPos;
    endpointZ = getTrackBotStopZ(track, endpointTile);
    summaryLabel = `Stops at Tile ${endpointTile}/${gateIndex}`;
  } else {
    endpointStatus = 'hazard';
    if (
      lastActionSegment &&
      lastActionSegment.status !== 'ok' &&
      lastActionSegment.toPos > lastActionSegment.fromPos
    ) {
      endpointTile = lastActionSegment.toPos;
    } else {
      endpointTile = simResult.finalPos;
    }
    endpointZ = getTrackBotStopZ(track, endpointTile);

    if (simResult.failCode === 'laser_gate') {
      summaryLabel = `Laser Barrier at Tile ${endpointTile}`;
    } else if (simResult.failCode === 'patrol_drone') {
      summaryLabel = `Patrol Drone at Tile ${endpointTile}`;
    } else if (simResult.failCode === 'gap') {
      summaryLabel = `Gap at Tile ${endpointTile}`;
    } else if (simResult.failCode === 'mud') {
      summaryLabel = `Mud at Tile ${endpointTile}`;
    } else if (simResult.failCode === 'ramp') {
      summaryLabel = `Ramp at Tile ${endpointTile}`;
    } else if (simResult.failCode === 'missing_part') {
      summaryLabel = formatMissingPartSummary(simResult.missingPart, endpointTile);
    } else {
      summaryLabel = `Hazard at Tile ${endpointTile}`;
    }
  }

  return {
    segments,
    scans,
    endpoint: {
      status: endpointStatus,
      tileIndex: endpointTile,
      gateIndex,
      z: endpointZ,
      failCode: simResult.failCode,
      missingPart: simResult.missingPart,
      summaryLabel,
      collectedCrystals: simResult.collectedCrystals,
      totalCrystals: simResult.totalCrystals
    },
    simResult
  };
}

export function isPreviewItemHighlighted(
  item: { blockId: string; callerBlockId?: string | null; ancestorBlockIds: ReadonlyArray<string> },
  hoveredBlockId: string | null
): boolean {
  if (!hoveredBlockId) return false;
  return (
    item.blockId === hoveredBlockId ||
    item.callerBlockId === hoveredBlockId ||
    item.ancestorBlockIds.includes(hoveredBlockId)
  );
}

export function samplePathSegmentPointInto(
  track: ReadonlyArray<TrackTile> | null | undefined,
  seg: PathPreviewSegment,
  rawT: number,
  out: { x: number; y: number; z: number }
): void {
  const t = Math.max(0, Math.min(1, rawT));
  const z = clampTrackBotZBeforeClosedGate(
    track,
    seg.fromZ + (seg.toZ - seg.fromZ) * t,
    false
  );
  const fromSurf = sampleTrackSurfaceAtZ(track, seg.fromZ);
  const toSurf = sampleTrackSurfaceAtZ(track, seg.toZ);
  const curSurf = sampleTrackSurfaceAtZ(track, z);
  const baseY = fromSurf.y + (toSurf.y - fromSurf.y) * t;

  out.x = 0;
  out.z = z;
  if (seg.action === 'JUMP') {
    out.y = Math.max(curSurf.y + 0.08, baseY + Math.sin(t * Math.PI) * seg.arcHeight + 0.08);
    return;
  }
  if (seg.action === 'BOOST') {
    out.y = Math.max(curSurf.y + 0.08, baseY + Math.sin(t * Math.PI) * seg.arcHeight + 0.12);
    return;
  }
  if (seg.status === 'fall') {
    out.y = curSurf.y + 0.14 - t * t * 0.65;
    return;
  }
  out.y = curSurf.y + 0.14;
}

export function samplePathSegmentPoint(
  track: ReadonlyArray<TrackTile> | null | undefined,
  seg: PathPreviewSegment,
  rawT: number
): { x: number; y: number; z: number } {
  const out = { x: 0, y: 0, z: 0 };
  samplePathSegmentPointInto(track, seg, rawT, out);
  return out;
}
