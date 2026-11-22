import type { WorldMode } from './worldScene';

export type ViewportFormFactor = 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop';

export interface ResponsiveCameraFraming {
  formFactor: ViewportFormFactor;
  /** Multiplier applied to horizontal/radial camera distance so subjects never clip on portrait screens */
  distanceScale: number;
  /** Vertical offset applied to camera look-at target (shifts 3D subject cleanly above bottom docks) */
  lookYOffset: number;
  /** Horizontal offset applied to Title/Code framing */
  lookXOffset: number;
  /** Base perspective FOV in degrees (widens slightly on narrow portrait screens for comfortable framing) */
  baseFov: number;
}

export function classifyViewport(width: number, height: number): ViewportFormFactor {
  const safeW = Math.max(240, width);
  const safeH = Math.max(240, height);
  if (safeW < 640 && safeH >= safeW) return 'phone-portrait';
  if (safeH < 500 && safeW > safeH) return 'phone-landscape';
  if (safeW < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Computes responsive 3D camera adjustments per viewport form factor and game mode.
 * Ensures the 3D robot, 5x5 laser circuit board, track, and Action Dash tunnel
 * sit cleanly in the unobstructed center band between TopHud and bottom docks
 * across phones (portrait & landscape), tablets, and desktop monitors.
 */
export function computeResponsiveCameraFraming(
  mode: WorldMode,
  width: number,
  height: number
): ResponsiveCameraFraming {
  const formFactor = classifyViewport(width, height);
  const aspect = Math.max(0.42, Math.min(2.6, width / Math.max(1, height)));
  const narrowBoost = aspect < 0.85 ? (0.85 - aspect) * 0.72 : 0;

  if (formFactor === 'phone-portrait') {
    switch (mode) {
      case 'TITLE':
        return {
          formFactor,
          distanceScale: 1.24 + narrowBoost * 0.45,
          lookYOffset: -0.26,
          lookXOffset: 0.55,
          baseFov: 56
        };
      case 'BUILD_3D':
        return {
          formFactor,
          distanceScale: 1.28 + narrowBoost * 0.48,
          lookYOffset: -0.16,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'PAINT_BOOTH':
        return {
          formFactor,
          distanceScale: 1.26 + narrowBoost * 0.45,
          lookYOffset: -0.16,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'CIRCUIT_3D':
        return {
          formFactor,
          distanceScale: 1.48 + narrowBoost * 0.55,
          lookYOffset: -0.25,
          lookXOffset: 0,
          baseFov: 58
        };
      case 'CODE_3D':
      case 'SIMULATING':
        return {
          formFactor,
          distanceScale: 1.28 + narrowBoost * 0.4,
          lookYOffset: -0.32,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'ACTION_RUN_3D':
        return {
          formFactor,
          distanceScale: 1.18 + narrowBoost * 0.28,
          lookYOffset: -0.18,
          lookXOffset: 0,
          baseFov: 60
        };
      case 'VICTORY':
      default:
        return {
          formFactor,
          distanceScale: 1.25 + narrowBoost * 0.3,
          lookYOffset: -0.2,
          lookXOffset: 0,
          baseFov: 55
        };
    }
  }

  if (formFactor === 'phone-landscape') {
    return {
      formFactor,
      distanceScale: mode === 'CIRCUIT_3D' ? 1.16 : 1.12,
      lookYOffset: mode === 'BUILD_3D' || mode === 'PAINT_BOOTH' ? -0.24 : -0.15,
      lookXOffset: 0,
      baseFov: mode === 'ACTION_RUN_3D' ? 56 : 54
    };
  }

  if (formFactor === 'tablet') {
    const isPortraitTablet = aspect < 1.0;
    return {
      formFactor,
      distanceScale:
        mode === 'CIRCUIT_3D'
          ? isPortraitTablet
            ? 1.22
            : 1.06
          : isPortraitTablet
            ? 1.16
            : 1.04,
      lookYOffset:
        mode === 'BUILD_3D' || mode === 'PAINT_BOOTH'
          ? isPortraitTablet
            ? -0.2
            : -0.1
          : 0,
      lookXOffset: mode === 'TITLE' && isPortraitTablet ? 0.35 : 0,
      baseFov: mode === 'ACTION_RUN_3D' ? 57 : isPortraitTablet ? 54 : 52
    };
  }

  return {
    formFactor: 'desktop',
    distanceScale: 1,
    lookYOffset: 0,
    lookXOffset: 0,
    baseFov: mode === 'ACTION_RUN_3D' ? 55.5 : 52
  };
}
