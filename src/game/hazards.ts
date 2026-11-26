import type { DynamicHazardDef, HazardTickSnapshot, LevelDef } from './types';

function computePatrolStateAtTick(
  minTile: number,
  maxTile: number,
  startTile: number,
  startDir: 1 | -1,
  tick: number
): { tile: number; dir: 1 | -1 } {
  const lo = Math.min(minTile, maxTile);
  const hi = Math.max(minTile, maxTile);
  const clampedStart = Math.max(lo, Math.min(hi, Math.round(startTile)));
  if (hi <= lo) {
    return { tile: lo, dir: 1 };
  }

  let tile = clampedStart;
  let dir: 1 | -1 = startDir >= 0 ? 1 : -1;
  if (tile === hi && dir === 1) dir = -1;
  if (tile === lo && dir === -1) dir = 1;

  const steps = Math.max(0, Math.floor(tick));
  const span = hi - lo;
  const cycle = span * 2;
  const rem = cycle > 0 ? steps % cycle : 0;

  for (let i = 0; i < rem; i++) {
    tile += dir;
    if (tile >= hi) {
      tile = hi;
      dir = -1;
    } else if (tile <= lo) {
      tile = lo;
      dir = 1;
    }
  }

  return { tile, dir };
}

/**
 * Deterministically evaluates a dynamic hazard (Timed Laser Barrier or Patrol Drone)
 * at any discrete simulation tick t >= 0.
 */
export function evaluateHazardAtTick(
  hazard: DynamicHazardDef,
  tick: number
): HazardTickSnapshot {
  const safeTick = Math.max(0, Math.floor(tick));
  if (hazard.kind === 'laser_gate') {
    const period = Math.max(2, Math.floor(hazard.period || 2));
    const offset = Math.floor(hazard.activeOffset || 0);
    const active = (((safeTick + offset) % period) + period) % period === 0;
    const nextActive = (((safeTick + 1 + offset) % period) + period) % period === 0;
    return {
      id: hazard.id,
      kind: 'laser_gate',
      tileIndex: hazard.tileIndex,
      active,
      nextActive,
      period
    };
  }

  const cur = computePatrolStateAtTick(
    hazard.minTile,
    hazard.maxTile,
    hazard.startTile,
    hazard.startDir,
    safeTick
  );
  const nxt = computePatrolStateAtTick(
    hazard.minTile,
    hazard.maxTile,
    hazard.startTile,
    hazard.startDir,
    safeTick + 1
  );

  return {
    id: hazard.id,
    kind: 'patrol_drone',
    tileIndex: cur.tile,
    active: true,
    nextActive: true,
    dir: cur.dir,
    nextTileIndex: nxt.tile,
    minTile: Math.min(hazard.minTile, hazard.maxTile),
    maxTile: Math.max(hazard.minTile, hazard.maxTile)
  };
}

export function evaluateAllHazardsAtTick(
  level: Pick<LevelDef, 'hazards'> | null | undefined,
  tick: number
): HazardTickSnapshot[] {
  const list = level?.hazards;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((h) => evaluateHazardAtTick(h, tick));
}

export function getBlockingHazardAtTile(
  level: Pick<LevelDef, 'hazards'> | null | undefined,
  tileIndex: number,
  tick: number
): HazardTickSnapshot | null {
  const snapshots = evaluateAllHazardsAtTick(level, tick);
  for (const snap of snapshots) {
    if (snap.tileIndex === tileIndex && snap.active) {
      return snap;
    }
  }
  return null;
}

/**
 * Checks whether stepping forward from `currentPos` to `currentPos + 1` on the
 * upcoming action tick (`currentTick + 1`) would collide with an active Laser Barrier
 * or Patrol Drone. Used by the `IF [HAZARD]` sensor block so kids can reliably write:
 * `IF [HAZARD] -> WAIT ELSE -> MOVE`.
 */
export function detectHazardAheadForNextTick(
  level: Pick<LevelDef, 'hazards' | 'track'> | null | undefined,
  currentPos: number,
  currentTick: number
): HazardTickSnapshot | null {
  if (!level || !Array.isArray(level.hazards) || level.hazards.length === 0) {
    return null;
  }
  const gateIndex = Math.max(0, (level.track?.length || 1) - 1);
  const aheadTile = Math.min(currentPos + 1, gateIndex);
  return getBlockingHazardAtTile(level, aheadTile, currentTick + 1);
}

export function levelHasDynamicHazards(
  level: Pick<LevelDef, 'hazards'> | null | undefined
): boolean {
  return Boolean(level && Array.isArray(level.hazards) && level.hazards.length > 0);
}
