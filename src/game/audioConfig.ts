export type AudioChannel = 'sfx' | 'ui' | 'voice';

export interface AudioSettings {
  sfxVolume: number; // 0..1
  uiVolume: number; // 0..1
  voiceVolume: number; // 0..1
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  sfxVolume: 0.92,
  uiVolume: 0.88,
  voiceVolume: 1.0
};

/** Studio master makeup gain applied after the soft DynamicsCompressor limiter */
export const MASTER_OUTPUT_BOOST = 1.35;

/** Per-channel output gain multipliers to ensure crisp, audible playback on laptop & mobile speakers */
export const CHANNEL_OUTPUT_BOOST: Record<AudioChannel, number> = {
  sfx: 2.85,
  ui: 2.95,
  voice: 2.25
};

export function clampUnitVolume(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

export function normalizeAudioSettings(input?: Partial<AudioSettings> | null): AudioSettings {
  return {
    sfxVolume: clampUnitVolume(input?.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    uiVolume: clampUnitVolume(input?.uiVolume, DEFAULT_AUDIO_SETTINGS.uiVolume),
    voiceVolume: clampUnitVolume(input?.voiceVolume, DEFAULT_AUDIO_SETTINGS.voiceVolume)
  };
}

export function computeEffectiveChannelGain(muted: boolean, channelVolume: number): number {
  if (muted) return 0;
  return clampUnitVolume(channelVolume, 0);
}

export function computeAudioOutputGain(
  muted: boolean,
  channel: AudioChannel,
  channelVolume: number
): number {
  const base = computeEffectiveChannelGain(muted, channelVolume);
  if (base <= 0) return 0;
  return base * (CHANNEL_OUTPUT_BOOST[channel] ?? 1);
}

export interface WorkshopOrbitState {
  azimuth: number; // radians around Y
  polar: number; // elevation radians (0.28..1.38)
  distance: number; // camera distance from pedestal center (2.9..6.2)
}

export const DEFAULT_WORKSHOP_ORBIT: WorkshopOrbitState = {
  azimuth: 0.54,
  polar: 1.12,
  distance: 5.35
};

export const ORBIT_POLAR_MIN = 0.32;
export const ORBIT_POLAR_MAX = 1.38;
export const ORBIT_DIST_MIN = 2.95;
export const ORBIT_DIST_MAX = 6.2;

export function clampWorkshopOrbit(state: WorkshopOrbitState): WorkshopOrbitState {
  const twoPi = Math.PI * 2;
  let az = Number.isFinite(state.azimuth) ? state.azimuth : DEFAULT_WORKSHOP_ORBIT.azimuth;
  az = ((az % twoPi) + twoPi) % twoPi;
  if (az > Math.PI) az -= twoPi;

  const pol = Number.isFinite(state.polar)
    ? Math.max(ORBIT_POLAR_MIN, Math.min(ORBIT_POLAR_MAX, state.polar))
    : DEFAULT_WORKSHOP_ORBIT.polar;

  const dist = Number.isFinite(state.distance)
    ? Math.max(ORBIT_DIST_MIN, Math.min(ORBIT_DIST_MAX, state.distance))
    : DEFAULT_WORKSHOP_ORBIT.distance;

  return { azimuth: az, polar: pol, distance: dist };
}
