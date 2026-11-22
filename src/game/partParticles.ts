import type { PartId } from './engine';
import { getGraphicsQualityBudget, scaleParticleCount } from './graphicsConfig';

export interface PartParticlePalette {
  /** Human-friendly palette label for tests/accessibility */
  label: string;
  /** Primary accent color (CSS hex) */
  primaryCss: string;
  /** Soft pastel puff tint (CSS hex) */
  puffCss: string;
  /** Crisp sparkle highlight (CSS hex) */
  sparkleCss: string;
  /** Soft ring glow tint (CSS rgba) */
  ringGlow: string;
  /** Three.js primary hex */
  primaryHex: number;
  /** Three.js pastel puff hex */
  puffHex: number;
  /** Three.js bright sparkle hex */
  sparkleHex: number;
}

export const PART_PARTICLE_PALETTES: Record<PartId, PartParticlePalette> = {
  wheels: {
    label: 'Sky Breeze',
    primaryCss: '#38bdf8',
    puffCss: '#bae6fd',
    sparkleCss: '#fef08a',
    ringGlow: 'rgba(56, 189, 248, 0.55)',
    primaryHex: 0x38bdf8,
    puffHex: 0xbae6fd,
    sparkleHex: 0xfef08a
  },
  treads: {
    label: 'Mint Moss',
    primaryCss: '#34d399',
    puffCss: '#a7f3d0',
    sparkleCss: '#fde047',
    ringGlow: 'rgba(52, 211, 153, 0.55)',
    primaryHex: 0x34d399,
    puffHex: 0xa7f3d0,
    sparkleHex: 0xfde047
  },
  thrusters: {
    label: 'Solar Peach',
    primaryCss: '#fb923c',
    puffCss: '#fed7aa',
    sparkleCss: '#fef08a',
    ringGlow: 'rgba(251, 146, 60, 0.58)',
    primaryHex: 0xfb923c,
    puffHex: 0xfed7aa,
    sparkleHex: 0xfef08a
  },
  booster: {
    label: 'Berry Spark',
    primaryCss: '#f472b6',
    puffCss: '#fbcfe8',
    sparkleCss: '#fde68a',
    ringGlow: 'rgba(244, 114, 182, 0.58)',
    primaryHex: 0xf472b6,
    puffHex: 0xfbcfe8,
    sparkleHex: 0xfde68a
  },
  laser: {
    label: 'Prism Aqua',
    primaryCss: '#22d3ee',
    puffCss: '#cffafe',
    sparkleCss: '#ffffff',
    ringGlow: 'rgba(34, 211, 238, 0.6)',
    primaryHex: 0x22d3ee,
    puffHex: 0xcffafe,
    sparkleHex: 0xffffff
  },
  magnet: {
    label: 'Lavender Pop',
    primaryCss: '#a78bfa',
    puffCss: '#ddd6fe',
    sparkleCss: '#f9a8d4',
    ringGlow: 'rgba(167, 139, 250, 0.58)',
    primaryHex: 0xa78bfa,
    puffHex: 0xddd6fe,
    sparkleHex: 0xf9a8d4
  }
};

export type UiParticleKind = 'puff' | 'sparkle' | 'dot';

export interface PlacementUiParticle {
  id: string;
  kind: UiParticleKind;
  dx: number;
  dy: number;
  size: number;
  rotationDeg: number;
  delayMs: number;
  durationMs: number;
  color: string;
}

export interface PlacementUiBurst {
  id: number;
  part: PartId;
  x: number;
  y: number;
  palette: PartParticlePalette;
  particles: PlacementUiParticle[];
}

export interface Placement3DParticleSpec {
  kind: 'puff' | 'sparkle';
  ox: number;
  oy: number;
  oz: number;
  vx: number;
  vy: number;
  vz: number;
  maxLife: number;
  baseScale: number;
  colorHex: number;
}

function seededFraction(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function getPartParticlePalette(part: PartId): PartParticlePalette {
  return PART_PARTICLE_PALETTES[part] ?? PART_PARTICLE_PALETTES.wheels;
}

/**
 * Generates a subtle, playful 2D slot-overlay burst (4 soft color-coded puffs,
 * 4 crisp four-point sparkles, and 2 tiny pastel dots in standard mode;
 * reduced to 1 puff and 2 sparkles in low-graphics mode) anchored at (originX, originY).
 */
export function createPartPlacementBurst(
  part: PartId,
  originX: number,
  originY: number,
  id: number,
  lowGraphics = false
): PlacementUiBurst {
  const palette = getPartParticlePalette(part);
  const particles: PlacementUiParticle[] = [];
  const baseAngleOffset = seededFraction(id, 1) * Math.PI * 0.5;
  const puffCount = lowGraphics ? 1 : 4;
  const sparkleCount = lowGraphics ? 2 : 4;
  const dotCount = lowGraphics ? 0 : 2;

  // Soft pillowy pastel puffs drifting slightly upward and outward
  for (let i = 0; i < puffCount; i++) {
    const jitter = (seededFraction(id, 10 + i) - 0.5) * 0.42;
    const angle = baseAngleOffset + (i * Math.PI * 2) / Math.max(1, puffCount) + Math.PI / 4 + jitter;
    const dist = 26 + seededFraction(id, 20 + i) * 20;
    const dx = Math.round(Math.cos(angle) * dist);
    const dy = Math.round(Math.sin(angle) * dist - 10);
    const size = Math.round(11 + seededFraction(id, 30 + i) * 6);
    particles.push({
      id: `${id}-puff-${i}`,
      kind: 'puff',
      dx,
      dy,
      size,
      rotationDeg: 0,
      delayMs: Math.round(i * 18),
      durationMs: Math.round(620 + seededFraction(id, 40 + i) * 140),
      color: i % 2 === 0 ? palette.puffCss : palette.primaryCss
    });
  }

  // Cute 4-point star sparkles twinkling outward slightly farther than puffs
  for (let i = 0; i < sparkleCount; i++) {
    const jitter = (seededFraction(id, 50 + i) - 0.5) * 0.36;
    const angle = baseAngleOffset + (i * Math.PI * 2) / Math.max(1, sparkleCount) + jitter;
    const dist = 38 + seededFraction(id, 60 + i) * 26;
    const dx = Math.round(Math.cos(angle) * dist);
    const dy = Math.round(Math.sin(angle) * dist - 14);
    const size = Math.round(11 + seededFraction(id, 70 + i) * 5);
    particles.push({
      id: `${id}-sparkle-${i}`,
      kind: 'sparkle',
      dx,
      dy,
      size,
      rotationDeg: Math.round((seededFraction(id, 80 + i) - 0.5) * 70),
      delayMs: Math.round(20 + i * 22),
      durationMs: Math.round(580 + seededFraction(id, 90 + i) * 170),
      color: i % 2 === 0 ? palette.sparkleCss : palette.primaryCss
    });
  }

  // Tiny pastel dots for airy polish (omitted in low-graphics mode)
  for (let i = 0; i < dotCount; i++) {
    const angle = -Math.PI * 0.72 + i * Math.PI * 0.44 + (seededFraction(id, 100 + i) - 0.5) * 0.3;
    const dist = 30 + seededFraction(id, 110 + i) * 22;
    particles.push({
      id: `${id}-dot-${i}`,
      kind: 'dot',
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist - 12),
      size: Math.round(5 + seededFraction(id, 120 + i) * 3),
      rotationDeg: 0,
      delayMs: Math.round(35 + i * 30),
      durationMs: Math.round(540 + seededFraction(id, 130 + i) * 120),
      color: i === 0 ? palette.sparkleCss : palette.puffCss
    });
  }

  return {
    id,
    part,
    x: originX,
    y: originY,
    palette,
    particles
  };
}

/**
 * Generates deterministic 3D puff & color-coded sparkle specs spawned around the
 * newly installed part slot on the 3D robot.
 */
export function createPartPlacement3DBurst(
  part: PartId,
  seed = 1,
  lowGraphics = false
): Placement3DParticleSpec[] {
  const palette = getPartParticlePalette(part);
  const budget = getGraphicsQualityBudget(lowGraphics);
  const puffCount = scaleParticleCount(6, budget.puffScale, 2);
  const sparkleCount = scaleParticleCount(8, budget.sparkScale, 2);
  const specs: Placement3DParticleSpec[] = [];

  // Soft buoyant pastel puffs
  for (let i = 0; i < puffCount; i++) {
    const angle = (i / Math.max(1, puffCount)) * Math.PI * 2 + seededFraction(seed, 200 + i) * 0.5;
    const radius = 0.08 + seededFraction(seed, 210 + i) * 0.1;
    const horizSpd = 0.55 + seededFraction(seed, 220 + i) * 0.55;
    specs.push({
      kind: 'puff',
      ox: Math.cos(angle) * radius,
      oy: (seededFraction(seed, 230 + i) - 0.3) * 0.12,
      oz: Math.sin(angle) * radius,
      vx: Math.cos(angle) * horizSpd,
      vy: 0.75 + seededFraction(seed, 240 + i) * 0.65,
      vz: Math.sin(angle) * horizSpd,
      maxLife: 0.62 + seededFraction(seed, 250 + i) * 0.28,
      baseScale: 0.72 + seededFraction(seed, 260 + i) * 0.45,
      colorHex: i % 3 === 0 ? palette.primaryHex : palette.puffHex
    });
  }

  // Subtle twinkling color-coded star sparkles
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / Math.max(1, sparkleCount)) * Math.PI * 2 + 0.25 + seededFraction(seed, 300 + i) * 0.35;
    const spd = 1.15 + seededFraction(seed, 310 + i) * 1.15;
    specs.push({
      kind: 'sparkle',
      ox: Math.cos(angle) * 0.06,
      oy: 0.04,
      oz: Math.sin(angle) * 0.06,
      vx: Math.cos(angle) * spd,
      vy: 1.1 + seededFraction(seed, 320 + i) * 1.35,
      vz: Math.sin(angle) * spd,
      maxLife: 0.48 + seededFraction(seed, 330 + i) * 0.26,
      baseScale: 0.65 + seededFraction(seed, 340 + i) * 0.35,
      colorHex: i % 2 === 0 ? palette.sparkleHex : palette.primaryHex
    });
  }

  return specs;
}

/**
 * Pillowy ease curve for 3D pastel puffs: pops quickly up to peak volume around
 * t=0.25, then gently shrinks away to 0 by t=1.
 */
export function evaluatePuffScale(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  if (t < 0.25) {
    const u = t / 0.25;
    return 0.25 + 0.75 * (1 - Math.pow(1 - u, 3));
  }
  const v = (t - 0.25) / 0.75;
  return Math.max(0, Math.pow(1 - v, 1.65));
}
