import { TileType, TrackTile } from './types';

export const TRACK_TILE_SPACING = 3.5;
export const TRACK_START_Z = -4.2;

export const RAMP_WEDGE_CENTER_Y = 0.22;
export const RAMP_WEDGE_THICKNESS = 0.24;
export const RAMP_WEDGE_LENGTH = TRACK_TILE_SPACING - 0.32;
export const RAMP_WEDGE_ROT_X = 0.24;

export const MUD_TOP_SURFACE_Y = 0.04;
export const MUD_SURFACE_HALF_LEN = (TRACK_TILE_SPACING - 0.42) * 0.5;

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
