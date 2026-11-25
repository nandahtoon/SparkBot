import type { WorldMode } from './worldScene';

export type ViewportFormFactor = 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop';
export type TabletOrientation = 'portrait' | 'landscape';

export interface ResponsiveCameraFraming {
  formFactor: ViewportFormFactor;
  orientation: TabletOrientation;
  /** Multiplier applied to horizontal/radial camera distance so subjects never clip on portrait/tablet screens */
  distanceScale: number;
  /** Vertical offset applied to camera look-at target (shifts 3D subject cleanly above bottom docks) */
  lookYOffset: number;
  /** Horizontal offset applied to Title/Code framing */
  lookXOffset: number;
  /** Base perspective FOV in degrees (widens slightly on narrow portrait screens for comfortable framing) */
  baseFov: number;
}

export function detectCoarseTouchPointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    );
  } catch {
    return false;
  }
}

export function classifyViewport(
  width: number,
  height: number,
  isTouchDevice?: boolean
): ViewportFormFactor {
  const safeW = Math.max(240, width);
  const safeH = Math.max(240, height);
  if (safeW < 640 && safeH >= safeW) return 'phone-portrait';
  if (safeH < 500 && safeW > safeH) return 'phone-landscape';
  // Recognize 7"–12.9" Android tablets in both portrait (768–1024) and landscape (1024–1366)
  if (safeW < 1024) return 'tablet';
  if (isTouchDevice && safeW <= 1366 && safeH <= 1024) return 'tablet';
  return 'desktop';
}

/**
 * Computes responsive 3D camera adjustments per viewport form factor, orientation, and game mode.
 * Ensures the 3D robot, 5x5 laser circuit board, track, and Action Dash tunnel
 * sit cleanly in the unobstructed center band between TopHud and bottom docks
 * across phones, adaptive Android tablets (portrait & landscape), and desktop monitors.
 */
export function computeResponsiveCameraFraming(
  mode: WorldMode,
  width: number,
  height: number,
  isTouchDevice?: boolean
): ResponsiveCameraFraming {
  const touchHint = isTouchDevice !== undefined ? isTouchDevice : detectCoarseTouchPointer();
  const formFactor = classifyViewport(width, height, touchHint);
  const aspect = Math.max(0.42, Math.min(2.6, width / Math.max(1, height)));
  const orientation: TabletOrientation = aspect < 1.0 ? 'portrait' : 'landscape';
  const narrowBoost = aspect < 0.85 ? (0.85 - aspect) * 0.72 : 0;

  if (formFactor === 'phone-portrait') {
    switch (mode) {
      case 'TITLE':
        return {
          formFactor,
          orientation,
          distanceScale: 1.24 + narrowBoost * 0.45,
          lookYOffset: -0.26,
          lookXOffset: 0.55,
          baseFov: 56
        };
      case 'BUILD_3D':
        return {
          formFactor,
          orientation,
          distanceScale: 1.28 + narrowBoost * 0.48,
          lookYOffset: -0.16,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'PAINT_BOOTH':
        return {
          formFactor,
          orientation,
          distanceScale: 1.26 + narrowBoost * 0.45,
          lookYOffset: -0.16,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'CIRCUIT_3D':
        return {
          formFactor,
          orientation,
          distanceScale: 1.48 + narrowBoost * 0.55,
          lookYOffset: -0.25,
          lookXOffset: 0,
          baseFov: 58
        };
      case 'CODE_3D':
      case 'SIMULATING':
        return {
          formFactor,
          orientation,
          distanceScale: 1.28 + narrowBoost * 0.4,
          lookYOffset: -0.32,
          lookXOffset: 0,
          baseFov: 56
        };
      case 'ACTION_RUN_3D':
      case 'PLANET_ADVENTURE_3D':
        return {
          formFactor,
          orientation,
          distanceScale: 1.18 + narrowBoost * 0.28,
          lookYOffset: -0.18,
          lookXOffset: 0,
          baseFov: 60
        };
      case 'VICTORY':
      default:
        return {
          formFactor,
          orientation,
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
      orientation,
      distanceScale: mode === 'CIRCUIT_3D' ? 1.16 : 1.12,
      lookYOffset: mode === 'BUILD_3D' || mode === 'PAINT_BOOTH' ? -0.24 : -0.15,
      lookXOffset: 0,
      baseFov: mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D' ? 56 : 54
    };
  }

  if (formFactor === 'tablet') {
    const isPortraitTablet = orientation === 'portrait';
    if (isPortraitTablet) {
      return {
        formFactor,
        orientation,
        distanceScale:
          mode === 'CIRCUIT_3D'
            ? 1.24
            : mode === 'CODE_3D' || mode === 'SIMULATING'
              ? 1.18
              : 1.14,
        lookYOffset:
          mode === 'BUILD_3D' || mode === 'PAINT_BOOTH'
            ? -0.22
            : mode === 'CODE_3D' || mode === 'SIMULATING'
              ? -0.18
              : mode === 'CIRCUIT_3D'
                ? -0.14
                : -0.08,
        lookXOffset: mode === 'TITLE' ? 0.34 : 0,
        baseFov: mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D' ? 57 : 54
      };
    }

    // Adaptive Tablet Landscape (e.g., 1024x768, 1138x712, 1280x800 Galaxy Tab / Pixel Tablet)
    return {
      formFactor,
      orientation,
      distanceScale: mode === 'CIRCUIT_3D' ? 1.08 : mode === 'CODE_3D' ? 1.05 : 1.03,
      lookYOffset:
        mode === 'BUILD_3D' || mode === 'PAINT_BOOTH'
          ? -0.14
          : mode === 'CODE_3D' || mode === 'SIMULATING'
            ? -0.1
            : 0,
      lookXOffset: 0,
      baseFov: mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D' ? 56 : 52.5
    };
  }

  return {
    formFactor: 'desktop',
    orientation,
    distanceScale: 1,
    lookYOffset: 0,
    lookXOffset: 0,
    baseFov: mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D' ? 55.5 : 52
  };
}
