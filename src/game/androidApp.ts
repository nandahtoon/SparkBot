import type { WorldMode } from '../three/worldScene';

export type MobilePlatform = 'android' | 'ios' | 'desktop';

export type HapticPatternId =
  | 'tap'
  | 'snapPart'
  | 'laser'
  | 'victory'
  | 'error'
  | 'jump'
  | 'boost';

export const HAPTIC_PATTERNS: Record<HapticPatternId, number | number[]> = {
  tap: 12,
  snapPart: [18, 24, 28],
  laser: [15, 20, 35],
  victory: [30, 45, 30, 45, 70],
  error: [40, 35, 40],
  jump: 16,
  boost: [22, 18, 36]
};

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  const ua = (userAgent || '').toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

export function isStandaloneDisplayMode(win?: Pick<Window, 'matchMedia' | 'navigator'> | null): boolean {
  if (!win) return false;
  try {
    const mediaStandalone =
      typeof win.matchMedia === 'function' &&
      (win.matchMedia('(display-mode: standalone)').matches ||
        win.matchMedia('(display-mode: fullscreen)').matches);
    const iosStandalone = (win.navigator as unknown as { standalone?: boolean })?.standalone === true;
    const isCapacitorNative =
      typeof (win as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
        ?.isNativePlatform === 'function' &&
      Boolean(
        (win as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
      );
    return Boolean(mediaStandalone || iosStandalone || isCapacitorNative);
  } catch {
    return false;
  }
}

export interface AndroidBackState {
  mode: WorldMode;
  paused: boolean;
  hasActiveDemo: boolean;
  showClassCode: boolean;
  showSandbox: boolean;
  showParentDashboard: boolean;
  showGameRoom: boolean;
  showTrophies: boolean;
  showProfile: boolean;
  showSettings: boolean;
  showMap: boolean;
}

export type AndroidBackAction =
  | 'close_class_code'
  | 'close_sandbox'
  | 'close_parent_dashboard'
  | 'close_game_room'
  | 'close_trophies'
  | 'close_profile'
  | 'close_settings'
  | 'close_map'
  | 'close_demo'
  | 'resume_pause'
  | 'exit_paint_booth'
  | 'exit_planet_adventure'
  | 'return_title_from_victory'
  | 'open_pause'
  | 'none';

/**
 * Pure priority resolver for Android hardware/gesture Back navigation.
 * Closes topmost overlays first, exits paint/planet modes cleanly, or pauses active missions
 * instead of abruptly exiting the app mid-level.
 */
export function resolveAndroidBackAction(state: AndroidBackState): AndroidBackAction {
  if (state.showClassCode) return 'close_class_code';
  if (state.showSandbox) return 'close_sandbox';
  if (state.showParentDashboard) return 'close_parent_dashboard';
  if (state.showGameRoom) return 'close_game_room';
  if (state.showTrophies) return 'close_trophies';
  if (state.showProfile) return 'close_profile';
  if (state.showSettings) return 'close_settings';
  if (state.showMap) return 'close_map';
  if (state.hasActiveDemo) return 'close_demo';
  if (state.paused) return 'resume_pause';

  if (state.mode === 'PAINT_BOOTH') return 'exit_paint_booth';
  if (state.mode === 'PLANET_ADVENTURE_3D') return 'exit_planet_adventure';
  if (state.mode === 'VICTORY') return 'return_title_from_victory';
  if (
    state.mode === 'BUILD_3D' ||
    state.mode === 'CODE_3D' ||
    state.mode === 'SIMULATING' ||
    state.mode === 'CIRCUIT_3D' ||
    state.mode === 'ACTION_RUN_3D'
  ) {
    return 'open_pause';
  }
  return 'none';
}

class AndroidHapticsController {
  private enabled = true;

  public setEnabled(next: boolean): void {
    this.enabled = Boolean(next);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  public trigger(
    pattern: HapticPatternId,
    vibrateFn?: ((p: number | number[]) => boolean) | null
  ): boolean {
    if (!this.enabled) return false;
    const seq = HAPTIC_PATTERNS[pattern];
    const fn =
      vibrateFn !== undefined
        ? vibrateFn
        : typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
          ? navigator.vibrate.bind(navigator)
          : null;
    if (!fn) return false;
    try {
      return Boolean(fn(seq));
    } catch {
      return false;
    }
  }
}

export const HAPTICS = new AndroidHapticsController();
