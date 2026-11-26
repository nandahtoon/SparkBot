import { getTrackTileCenterZ, TRACK_START_Z, TRACK_TILE_SPACING } from '../game/trackSurface';

export type CodeCameraPreset = 'follow' | 'overview' | 'top';

export interface CodeCameraState {
  /** Orbit yaw around focused track Z (0 = directly behind Start looking down track, + = right-side 3/4) */
  yaw: number;
  /** Elevation angle in radians above horizon (0.24 = low hero angle, 1.35 = steep top-down map) */
  pitch: number;
  /** Radial distance from the focused point on the track */
  distance: number;
  /** World Z along the track that the camera centers on */
  focusZ: number;
  /** Vertical look-at offset (negative values push the track upward above bottom docks on portrait screens) */
  lookYBias: number;
}

export const CODE_CAMERA_PRESET_ORDER: readonly CodeCameraPreset[] = ['overview', 'top', 'follow'];

export function getNextCodeCameraPreset(current: CodeCameraPreset): CodeCameraPreset {
  const idx = CODE_CAMERA_PRESET_ORDER.indexOf(current);
  return CODE_CAMERA_PRESET_ORDER[(idx + 1) % CODE_CAMERA_PRESET_ORDER.length];
}

export function getTrackZBounds(trackLength: number): {
  startZ: number;
  endZ: number;
  midZ: number;
  spanZ: number;
} {
  const safeLen = Math.max(2, trackLength);
  const startZ = TRACK_START_Z;
  const endZ = getTrackTileCenterZ(safeLen - 1);
  const midZ = (startZ + endZ) * 0.5;
  const spanZ = Math.abs(endZ - startZ) + TRACK_TILE_SPACING * 1.35;
  return { startZ, endZ, midZ, spanZ };
}

export function clampCodeCameraState(
  state: CodeCameraState,
  trackLength: number
): CodeCameraState {
  const { startZ, endZ } = getTrackZBounds(trackLength);
  return {
    yaw: Math.max(-1.48, Math.min(1.48, state.yaw)),
    pitch: Math.max(0.24, Math.min(1.36, state.pitch)),
    distance: Math.max(7.2, Math.min(48, state.distance)),
    focusZ: Math.max(endZ - 1.5, Math.min(startZ + 1.2, state.focusZ)),
    lookYBias: Math.max(-3.6, Math.min(0.6, state.lookYBias))
  };
}

/**
 * Computes responsive camera framing for CODE_3D presets across phone portrait,
 * tablet portrait, phone/tablet landscape, and desktop viewports.
 *
 * On portrait phones, the track is oriented vertically up the tall viewport (low yaw)
 * with a negative lookYBias so Start sits cleanly above CodeDock and the Gate sits
 * cleanly below TopHud — making the entire course readable at a glance.
 */
export function computeCodeCameraPreset(
  preset: CodeCameraPreset,
  trackLength: number,
  width: number,
  height: number,
  baseFovDeg: number
): CodeCameraState {
  const safeW = Math.max(240, width);
  const safeH = Math.max(240, height);
  const aspect = Math.max(0.42, Math.min(2.6, safeW / safeH));
  const isPortrait = aspect < 0.92;
  const { startZ, endZ, midZ, spanZ } = getTrackZBounds(trackLength);

  const vFovRad = (baseFovDeg * Math.PI) / 180;
  const halfTanV = Math.tan(vFovRad * 0.5);
  const halfTanH = halfTanV * aspect;

  if (preset === 'top') {
    if (isPortrait) {
      // Straight bird's-eye running bottom (Start) -> top (Gate) up the tall portrait screen
      const neededDist = (spanZ * 0.92) / (2 * halfTanV * 0.54);
      return clampCodeCameraState(
        {
          yaw: 0.0,
          pitch: 1.26,
          distance: Math.max(15, neededDist),
          focusZ: midZ + Math.min(3.8, spanZ * 0.14),
          lookYBias: -1.4
        },
        trackLength
      );
    }
    const neededDist = (spanZ * 0.96) / (2 * halfTanH * 0.86);
    return clampCodeCameraState(
      {
        yaw: 1.48,
        pitch: 1.24,
        distance: Math.max(14, neededDist),
        focusZ: midZ,
        lookYBias: -0.6
      },
      trackLength
    );
  }

  if (preset === 'overview') {
    if (isPortrait) {
      // Elevated behind-diagonal view: full track runs cleanly upward from Start to Gate above CodeDock
      const pitch = 0.62;
      const verticalProjection = spanZ * Math.sin(pitch) * 1.06;
      const neededDist = verticalProjection / (2 * halfTanV * 0.52);
      return clampCodeCameraState(
        {
          yaw: 0.22,
          pitch,
          distance: Math.max(15.5, neededDist),
          focusZ: midZ + Math.min(3.4, spanZ * 0.11),
          lookYBias: -2.35
        },
        trackLength
      );
    }

    // Wide elevated 3/4 side overview for landscape / desktop
    const yaw = 0.78;
    const pitch = 0.5;
    const horizProjection = spanZ * Math.sin(yaw) * 1.08;
    const neededDist = horizProjection / (2 * halfTanH * 0.84);
    return clampCodeCameraState(
      {
        yaw,
        pitch,
        distance: Math.max(14.5, neededDist),
        focusZ: midZ,
        lookYBias: -0.55
      },
      trackLength
    );
  }

  // 'follow' — cozy close-up hero angle focused near SparkBot & upcoming obstacles
  if (isPortrait) {
    // Slightly angled behind-side view so the first 5-6 tiles read cleanly without immediate edge clipping
    const focusNearStart = Math.max(endZ, startZ - Math.min(8.2, spanZ * 0.42));
    return clampCodeCameraState(
      {
        yaw: 0.32,
        pitch: 0.48,
        distance: 15.2,
        focusZ: focusNearStart,
        lookYBias: -1.65
      },
      trackLength
    );
  }

  // Classic crisp hero 3/4 view on desktop & landscape tablets
  const focusNearStart = Math.max(endZ, startZ - Math.min(5.6, spanZ * 0.36));
  return clampCodeCameraState(
    {
      yaw: 0.52,
      pitch: 0.37,
      distance: 14.6,
      focusZ: focusNearStart,
      lookYBias: -0.15
    },
    trackLength
  );
}

/**
 * Computes a camera state focused directly on a specific track tile (e.g., when a child
 * taps Tile 5 or the Gate on the interactive mini-map strip).
 */
export function computeTileFocusCameraState(
  current: CodeCameraState,
  tileIndex: number,
  trackLength: number,
  width: number,
  height: number
): CodeCameraState {
  const safeIdx = Math.max(0, Math.min(Math.max(0, trackLength - 1), tileIndex));
  const tileZ = getTrackTileCenterZ(safeIdx);
  const isPortrait = width / Math.max(1, height) < 0.92;
  return clampCodeCameraState(
    {
      yaw: isPortrait ? Math.max(-0.5, Math.min(0.5, current.yaw)) : current.yaw,
      pitch: Math.max(0.42, Math.min(0.95, current.pitch)),
      distance: Math.min(current.distance, isPortrait ? 15.5 : 14.5),
      focusZ: tileZ,
      lookYBias: isPortrait ? -1.45 : -0.3
    },
    trackLength
  );
}

/**
 * Converts a CodeCameraState into 3D world camera position and look-at target coordinates.
 */
export function evaluateCodeCameraVectors(
  state: CodeCameraState,
  framingLookYOffset: number
): {
  camX: number;
  camY: number;
  camZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
} {
  const cosP = Math.cos(state.pitch);
  const sinP = Math.sin(state.pitch);
  const baseY = 0.78;
  return {
    camX: Math.sin(state.yaw) * cosP * state.distance,
    camY: baseY + sinP * state.distance,
    camZ: state.focusZ + Math.cos(state.yaw) * cosP * state.distance,
    lookX: 0,
    lookY: baseY + state.lookYBias + framingLookYOffset * 0.45,
    lookZ: state.focusZ
  };
}
