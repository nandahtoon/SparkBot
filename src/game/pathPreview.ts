import { collectAncestorBlockIds, simulateProgram } from './simulator';
import {
  clampTrackBotZBeforeClosedGate,
  getTrackBotStopZ,
  sampleTrackSurfaceAtZ
} from './trackSurface';
import type {
  ChassisGrid,
  CodeBlock,
  LevelDef,
  PartId,
  SensorCondition,
  SimResult,
  TrackTile
} from './types';

export interface PathPreviewSegment {
  index: number;
  blockId: string;
  ancestorBlockIds: string[];
  action: 'MOVE' | 'JUMP' | 'BOOST';
  fromPos: number;
  toPos: number;
  fromZ: number;
  toZ: number;
  arcHeight: number;
  status: 'ok' | 'fail' | 'fall' | 'stuck';
  newCrystals: number[];
}

export interface PathPreviewScan {
  index: number;
  blockId: string;
  ancestorBlockIds: string[];
  atPos: number;
  scanTile: number;
  atZ: number;
  scanZ: number;
  condition: SensorCondition;
  matched: boolean;
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
  program: CodeBlock[]
): LivePathPreview {
  const track = level.track;
  const gateIndex = Math.max(0, track.length - 1);
  const simResult = simulateProgram(level, chassis, program);
  const ancestorCache = new Map<string, string[]>();

  const getAncestors = (blockId: string): string[] => {
    const cached = ancestorCache.get(blockId);
    if (cached) return cached;
    const found = collectAncestorBlockIds(program, blockId);
    ancestorCache.set(blockId, found);
    return found;
  };

  const segments: PathPreviewSegment[] = [];
  const scans: PathPreviewScan[] = [];
  let lastActionSegment: PathPreviewSegment | null = null;

  for (const ev of simResult.events) {
    const ancestorBlockIds = getAncestors(ev.blockId);
    if (ev.action === 'SCAN') {
      const scanTile = ev.scanTile ?? Math.min(ev.fromPos + 1, gateIndex);
      scans.push({
        index: scans.length,
        blockId: ev.blockId,
        ancestorBlockIds,
        atPos: ev.fromPos,
        scanTile,
        atZ: getTrackBotStopZ(track, ev.fromPos),
        scanZ: getTrackBotStopZ(track, scanTile),
        condition: ev.condition || 'GAP',
        matched: Boolean(ev.scanMatch)
      });
      continue;
    }

    const fromZ = getTrackBotStopZ(track, ev.fromPos);
    let toZ = getTrackBotStopZ(track, ev.toPos);
    if (ev.fromPos === ev.toPos && ev.status === 'fail' && ev.fromPos < gateIndex) {
      // Blocked before moving (e.g. missing part on start/tile): project short directional stub
      toZ = clampTrackBotZBeforeClosedGate(track, fromZ - 0.95, false);
    }

    const arcHeight = ev.action === 'JUMP' ? 1.85 : ev.action === 'BOOST' ? 0.95 : 0;
    const seg: PathPreviewSegment = {
      index: segments.length,
      blockId: ev.blockId,
      ancestorBlockIds,
      action: ev.action,
      fromPos: ev.fromPos,
      toPos: ev.toPos,
      fromZ,
      toZ,
      arcHeight,
      status: ev.status,
      newCrystals: Array.isArray(ev.newCrystals) ? [...ev.newCrystals] : []
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
    simResult.failCode === 'empty_container'
  ) {
    endpointStatus = 'empty';
    endpointTile = 0;
    endpointZ = getTrackBotStopZ(track, 0);
    summaryLabel =
      simResult.failCode === 'empty_container'
        ? 'Empty Loop or IF block'
        : 'Add blocks to preview route';
  } else if (simResult.status === 'win') {
    endpointStatus = 'win';
    endpointTile = gateIndex;
    endpointZ = getTrackBotStopZ(track, gateIndex);
    summaryLabel = 'Reaches Gate';
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

    if (simResult.failCode === 'gap') {
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
  item: { blockId: string; ancestorBlockIds: ReadonlyArray<string> },
  hoveredBlockId: string | null
): boolean {
  if (!hoveredBlockId) return false;
  return item.blockId === hoveredBlockId || item.ancestorBlockIds.includes(hoveredBlockId);
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
