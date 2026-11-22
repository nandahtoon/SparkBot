import type { PartId } from './engine';

export type PartSoundFamily =
  | 'mechanical_actuator'
  | 'propulsion_actuator'
  | 'electronic_logic';

export type PartPlacementSoundId =
  | 'axle_clank_spin'
  | 'heavy_iron_clank'
  | 'pneumatic_jet_lock'
  | 'turbine_spool_ignite'
  | 'optical_capacitor_hum'
  | 'electromagnetic_coil_hum';

export interface PartPlacementSoundProfile {
  part: PartId;
  soundId: PartPlacementSoundId;
  family: PartSoundFamily;
  label: string;
  /** Primary oscillator base frequency (Hz) for distinctive tonal identity */
  baseFreqHz: number;
  /** Secondary harmonic/sweep target frequency (Hz) */
  accentFreqHz: number;
  /** Delay (ms) before playing the part-specific installation follow-up foley */
  followUpDelayMs: number;
  /** Acoustic descriptor tags for testability & UI/telemetry consistency */
  characteristics: readonly string[];
}

export const PART_PLACEMENT_SOUND_PROFILES: Record<PartId, PartPlacementSoundProfile> = {
  wheels: {
    part: 'wheels',
    soundId: 'axle_clank_spin',
    family: 'mechanical_actuator',
    label: 'Axle Clank & Bearing Spin',
    baseFreqHz: 215,
    accentFreqHz: 540,
    followUpDelayMs: 90,
    characteristics: ['mechanical_clank', 'bearing_whirr', 'rubber_thump']
  },
  treads: {
    part: 'treads',
    soundId: 'heavy_iron_clank',
    family: 'mechanical_actuator',
    label: 'Heavy Track Iron Clank',
    baseFreqHz: 118,
    accentFreqHz: 265,
    followUpDelayMs: 105,
    characteristics: ['heavy_iron_clank', 'hydraulic_ratchet', 'weighted_thud']
  },
  thrusters: {
    part: 'thrusters',
    soundId: 'pneumatic_jet_lock',
    family: 'propulsion_actuator',
    label: 'Pneumatic Valve & Nozzle Latch',
    baseFreqHz: 310,
    accentFreqHz: 680,
    followUpDelayMs: 115,
    characteristics: ['pneumatic_hiss', 'metallic_latch', 'propellant_prime']
  },
  booster: {
    part: 'booster',
    soundId: 'turbine_spool_ignite',
    family: 'propulsion_actuator',
    label: 'Turbo Spool & Afterburner Lock',
    baseFreqHz: 420,
    accentFreqHz: 1140,
    followUpDelayMs: 120,
    characteristics: ['turbine_spool', 'wing_latch', 'plasma_whoosh']
  },
  laser: {
    part: 'laser',
    soundId: 'optical_capacitor_hum',
    family: 'electronic_logic',
    label: 'Optical Capacitor Hum & Focus Chime',
    baseFreqHz: 528,
    accentFreqHz: 1056,
    followUpDelayMs: 110,
    characteristics: ['electronic_hum', 'optical_chime', 'logic_lock']
  },
  magnet: {
    part: 'magnet',
    soundId: 'electromagnetic_coil_hum',
    family: 'electronic_logic',
    label: 'Electromagnetic Coil Resonance',
    baseFreqHz: 164,
    accentFreqHz: 492,
    followUpDelayMs: 115,
    characteristics: ['electronic_hum', 'inductive_shimmer', 'magnetic_thump']
  }
};

export function getPartPlacementSoundProfile(part: PartId): PartPlacementSoundProfile {
  return PART_PLACEMENT_SOUND_PROFILES[part];
}
