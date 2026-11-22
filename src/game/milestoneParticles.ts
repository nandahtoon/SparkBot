/**
 * Deterministic particle burst & harmonic audio profiles for newly unlocked
 * STEM Fact Cards and Mastery Badges.
 */

export type MilestoneUnlockKind = 'fact' | 'badge' | 'both';

export type MilestoneParticleShape = 'sparkle' | 'diamond' | 'ribbon' | 'orb';

export interface MilestoneParticleSpec {
  id: string;
  shape: MilestoneParticleShape;
  dx: number;
  dy: number;
  size: number;
  rotationDeg: number;
  spinDeg: number;
  delayMs: number;
  durationMs: number;
  color: string;
}

export interface MilestoneHaloSpec {
  id: string;
  color: string;
  delayMs: number;
  durationMs: number;
  maxScale: number;
}

export interface MilestoneParticleBurst {
  id: number;
  kind: MilestoneUnlockKind;
  particles: MilestoneParticleSpec[];
  halos: MilestoneHaloSpec[];
}

export interface MilestoneSoundProfile {
  kind: MilestoneUnlockKind;
  /** Distinct celesta/bell arpeggio note frequencies in Hz */
  notesHz: number[];
  /** Warm lower resonance chord root in Hz */
  chordRootHz: number;
  /** Note spacing in seconds */
  stepDelaySec: number;
  /** Shimmer bandpass frequency in Hz */
  shimmerHz: number;
}

export const MILESTONE_SOUND_PROFILES: Record<MilestoneUnlockKind, MilestoneSoundProfile> = {
  // Bright Lydian discovery sparkle for newly collected STEM Fact Cards
  fact: {
    kind: 'fact',
    notesHz: [659.25, 830.61, 987.77, 1479.98, 1975.53],
    chordRootHz: 329.63,
    stepDelaySec: 0.058,
    shimmerHz: 3800
  },
  // Triumphant ascending brass-chime fanfare for Mastery Badge tier upgrades
  badge: {
    kind: 'badge',
    notesHz: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98],
    chordRootHz: 261.63,
    stepDelaySec: 0.064,
    shimmerHz: 3200
  },
  // Grand dual-harmonic celebration when both a new Fact Card and Badge unlock together
  both: {
    kind: 'both',
    notesHz: [523.25, 659.25, 783.99, 1174.66, 1479.98, 1975.53],
    chordRootHz: 261.63,
    stepDelaySec: 0.055,
    shimmerHz: 4100
  }
};

const PALETTES: Record<MilestoneUnlockKind, { colors: string[]; halos: string[] }> = {
  fact: {
    colors: ['#38bdf8', '#34d399', '#a5f3fc', '#f8fafc'],
    halos: ['rgba(56, 189, 248, 0.72)', 'rgba(52, 211, 153, 0.52)']
  },
  badge: {
    colors: ['#fbbf24', '#fde047', '#fb923c', '#38bdf8'],
    halos: ['rgba(251, 191, 36, 0.78)', 'rgba(253, 224, 71, 0.54)']
  },
  both: {
    colors: ['#fbbf24', '#34d399', '#38bdf8', '#fde047', '#f8fafc'],
    halos: ['rgba(251, 191, 36, 0.78)', 'rgba(52, 211, 153, 0.58)']
  }
};

function seededFraction(seed: number, salt: number): number {
  const x = Math.sin(seed * 137.3 + salt * 293.9) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Generates deterministic compositor-only radial burst specs for celebrating a newly
 * unlocked STEM Fact Card or Mastery Badge without blocking UI interaction.
 */
export function createMilestoneParticleBurst(
  kind: MilestoneUnlockKind,
  id: number,
  lowGraphics = false
): MilestoneParticleBurst {
  const palette = PALETTES[kind] || PALETTES.both;
  const totalParticles = lowGraphics ? 10 : 26;
  const shapes: MilestoneParticleShape[] = ['sparkle', 'diamond', 'ribbon', 'orb'];
  const particles: MilestoneParticleSpec[] = [];

  for (let i = 0; i < totalParticles; i++) {
    const angle =
      (i / totalParticles) * Math.PI * 2 + (seededFraction(id, 10 + i) - 0.5) * 0.28;
    const ringBand = i % 2 === 0 ? 1 : 0.65;
    const dist = (110 + seededFraction(id, 40 + i) * 145) * ringBand;
    const shape = shapes[i % shapes.length];
    const size =
      shape === 'ribbon'
        ? Math.round(12 + seededFraction(id, 70 + i) * 8)
        : shape === 'orb'
          ? Math.round(8 + seededFraction(id, 70 + i) * 6)
          : Math.round(14 + seededFraction(id, 70 + i) * 9);

    particles.push({
      id: `ms-${id}-${i}`,
      shape,
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist - 18),
      size,
      rotationDeg: Math.round((seededFraction(id, 100 + i) - 0.5) * 90),
      spinDeg: Math.round((seededFraction(id, 130 + i) - 0.5) * 260),
      delayMs: Math.round((i % 5) * 32),
      durationMs: Math.round(880 + seededFraction(id, 160 + i) * 360),
      color: palette.colors[i % palette.colors.length]
    });
  }

  const halos: MilestoneHaloSpec[] = lowGraphics
    ? [
        {
          id: `ms-halo-${id}-0`,
          color: palette.halos[0],
          delayMs: 0,
          durationMs: 820,
          maxScale: 2.3
        }
      ]
    : [
        {
          id: `ms-halo-${id}-0`,
          color: palette.halos[0],
          delayMs: 0,
          durationMs: 860,
          maxScale: 2.6
        },
        {
          id: `ms-halo-${id}-1`,
          color: palette.halos[1],
          delayMs: 110,
          durationMs: 960,
          maxScale: 3.1
        }
      ];

  return {
    id,
    kind,
    particles,
    halos
  };
}
