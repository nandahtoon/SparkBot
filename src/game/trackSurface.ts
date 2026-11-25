import { TileType, TrackTile } from './types';

export const TRACK_TILE_SPACING = 3.5;
export const TRACK_START_Z = -4.2;

export const RAMP_WEDGE_CENTER_Y = 0.22;
export const RAMP_WEDGE_THICKNESS = 0.24;
export const RAMP_WEDGE_LENGTH = TRACK_TILE_SPACING - 0.32;
export const RAMP_WEDGE_ROT_X = 0.24;

export const MUD_TOP_SURFACE_Y = 0.04;
export const MUD_SURFACE_HALF_LEN = (TRACK_TILE_SPACING - 0.42) * 0.5;

/**
 * End-of-track Gate & Circuit Board geometry relative to the final gate tile center `tz`.
 * - Gate steel doors sit near the rear edge of the final tile (`tz - 1.15`).
 * - 3D Circuit Board mounts flush on the front face of the closed doors (`gateZ + 0.36 = tz - 0.79`).
 * - Robot stops squarely on the front half of the gate pad (`tz + 1.05`), keeping its
 *   front bumper & laser (~0.88m forward) cleanly clear of both the circuit board and doors.
 */
export const GATE_WALL_Z_OFFSET = -1.15;
export const CIRCUIT_BOARD_Z_OFFSET = 0.36;
export const CIRCUIT_BOARD_Y = 3.0;
export const GATE_BOT_STOP_Z_OFFSET = 1.05;
export const GATE_DECK_WIDTH = 4.8;
export const CIRCUIT_BOT_X = -1.62;
export const BOT_FRONT_EXTENT_Z = 0.88;
export const BOT_HALF_WIDTH_X = 0.62;

export interface TrackSurfaceSample {
  y: number;
  pitchX: number;
  tileIndex: number;
  tileType: TileType | 'workshop';
}

const COS_RAMP = Math.cos(RAMP_WEDGE_ROT_X);
const SIN_RAMP = Math.sin(RAMP_WEDGE_ROT_X);
const TAN_RAMP = Math.tan(RAMP_WEDGE_ROT_X);
const RAMP_HALF_LEN = RAMP_WEDGE_LENGTH * 0.5;
const RAMP_HALF_THICK = RAMP_WEDGE_THICKNESS * 0.5;
const RAMP_DZ_MIN = -RAMP_HALF_LEN * COS_RAMP + RAMP_HALF_THICK * SIN_RAMP - 0.06;
const RAMP_DZ_MAX = RAMP_HALF_LEN * COS_RAMP + RAMP_HALF_THICK * SIN_RAMP + 0.06;
const RAMP_CLEARANCE_Y = 0.015;

export function getTrackTileCenterZ(tileIndex: number): number {
  return tileIndex === 0 ? 0 : TRACK_START_Z - tileIndex * TRACK_TILE_SPACING;
}

export function getGateTileIndex(track: ReadonlyArray<TrackTile> | null | undefined): number {
  if (!track || track.length === 0) return -1;
  for (let i = track.length - 1; i >= 0; i--) {
    if (track[i].type === 'gate') return i;
  }
  return track.length - 1;
}

export function getGateWallZ(track: ReadonlyArray<TrackTile> | null | undefined): number {
  const gateIdx = getGateTileIndex(track);
  if (gateIdx < 0) return TRACK_START_Z;
  return getTrackTileCenterZ(gateIdx) + GATE_WALL_Z_OFFSET;
}

export function getCircuitBoardZ(track: ReadonlyArray<TrackTile> | null | undefined): number {
  return getGateWallZ(track) + CIRCUIT_BOARD_Z_OFFSET;
}

/**
 * Computes the world Z coordinate where the 3D robot should stand for a given track tile.
 * On the final `gate` tile, stops cleanly in front of the closed gate doors & circuit board
 * so the robot never penetrates the end wall.
 */
export function getTrackBotStopZ(
  track: ReadonlyArray<TrackTile> | null | undefined,
  tileIndex: number
): number {
  if (tileIndex <= 0) return 0;
  if (!track || track.length === 0) {
    return getTrackTileCenterZ(tileIndex);
  }
  const gateIdx = getGateTileIndex(track);
  const clampedIdx = Math.min(tileIndex, track.length - 1);
  const tz = getTrackTileCenterZ(clampedIdx);
  if (clampedIdx === gateIdx || track[clampedIdx]?.type === 'gate') {
    return tz + GATE_BOT_STOP_Z_OFFSET;
  }
  return tz;
}

/**
 * Safety barrier clamp along the mission track (-Z is forward).
 * While the gate wall is closed, prevents the robot's Z position from ever crossing
 * past the gate stop line into the circuit board or closed steel doors.
 */
export function clampTrackBotZBeforeClosedGate(
  track: ReadonlyArray<TrackTile> | null | undefined,
  z: number,
  gateOpen: boolean
): number {
  if (gateOpen || !track || track.length === 0) return z;
  const gateIdx = getGateTileIndex(track);
  if (gateIdx < 0) return z;
  const minSafeZ = getTrackTileCenterZ(gateIdx) + GATE_BOT_STOP_Z_OFFSET;
  return Math.max(z, minSafeZ);
}

/**
 * Computes the exact top surface height and slope pitch along the mission track
 * at world coordinate `z` so the 3D robot sits flush on flat decks, mud basins,
 * and inclined pink ramp wedges without sinking or clipping.
 */
export function sampleTrackSurfaceAtZ(
  track: ReadonlyArray<TrackTile> | null | undefined,
  z: number
): TrackSurfaceSample {
  if (!track || track.length === 0 || z > TRACK_START_Z + TRACK_TILE_SPACING * 0.5) {
    return { y: 0, pitchX: 0, tileIndex: -1, tileType: 'workshop' };
  }

  const rawIdx = Math.round((TRACK_START_Z - z) / TRACK_TILE_SPACING);
  if (rawIdx < 0 || rawIdx >= track.length) {
    return { y: 0, pitchX: 0, tileIndex: -1, tileType: 'workshop' };
  }

  const tile = track[rawIdx];
  const tz = TRACK_START_Z - rawIdx * TRACK_TILE_SPACING;
  const dz = z - tz;

  if (tile.type === 'ramp') {
    if (dz >= RAMP_DZ_MIN && dz <= RAMP_DZ_MAX) {
      const rawTopY = RAMP_WEDGE_CENTER_Y + RAMP_HALF_THICK / COS_RAMP - dz * TAN_RAMP;
      if (rawTopY > 0) {
        const edgeDist = Math.min(dz - RAMP_DZ_MIN, RAMP_DZ_MAX - dz);
        const edgeBlend = Math.max(0, Math.min(1, edgeDist / 0.28));
        return {
          y: rawTopY + RAMP_CLEARANCE_Y,
          pitchX: RAMP_WEDGE_ROT_X * edgeBlend,
          tileIndex: rawIdx,
          tileType: 'ramp'
        };
      }
    }
    return { y: 0, pitchX: 0, tileIndex: rawIdx, tileType: 'ramp' };
  }

  if (tile.type === 'mud' && Math.abs(dz) <= MUD_SURFACE_HALF_LEN) {
    return { y: MUD_TOP_SURFACE_Y, pitchX: 0, tileIndex: rawIdx, tileType: 'mud' };
  }

  return { y: 0, pitchX: 0, tileIndex: rawIdx, tileType: tile.type };
}
