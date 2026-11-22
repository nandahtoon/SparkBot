import { getGraphicsQualityBudget, scaleParticleCount } from './graphicsConfig';

export type ActionSurface = 'floor' | 'leftWall' | 'rightWall';

export type ActionTrailState = 'cruise' | 'wallrun' | 'airborne' | 'turbo';

export interface ActionTrailEmitParams {
  speed: number;
  surface: ActionSurface;
  isAirborne: boolean;
  turboActive: boolean;
  hasBooster: boolean;
  hasMagnet: boolean;
  lowGraphics?: boolean;
}

export interface ActionTrailEmitConfig {
  state: ActionTrailState;
  spawnRatePerSec: number;
  streakLength: number;
  baseWidth: number;
  particleLife: number;
  palette: readonly number[];
  burstCount: number;
}

export interface TrailEmitterAnchor {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  weight: number;
}

export interface ActionTrailParticleInit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  maxLife: number;
  baseWidth: number;
  streakLength: number;
  color: number;
  spin: number;
}

export interface TrailTransformSample {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  brightness: number;
}

const TRAIL_PALETTES: Record<ActionTrailState, readonly number[]> = {
  cruise: [0x38bdf8, 0x7dd3fc, 0x22d3ee, 0xe0f2fe],
  wallrun: [0x818cf8, 0xc084fc, 0x22d3ee, 0xe0e7ff],
  airborne: [0xfbbf24, 0x38bdf8, 0xfef08a, 0xe0f2fe],
  turbo: [0xfde047, 0xf472b6, 0x22d3ee, 0xffffff]
};

export function classifyActionTrailState(params: {
  surface: ActionSurface;
  isAirborne: boolean;
  turboActive: boolean;
}): ActionTrailState {
  if (params.turboActive) return 'turbo';
  if (params.surface !== 'floor') return 'wallrun';
  if (params.isAirborne) return 'airborne';
  return 'cruise';
}

export function computeActionTrailEmitConfig(params: ActionTrailEmitParams): ActionTrailEmitConfig {
  const state = classifyActionTrailState(params);
  const clampedSpeed = Math.max(6, Math.min(36, params.speed));
  const speedNorm = Math.max(0, Math.min(1.6, (clampedSpeed - 10) / 14));

  const basePalette = TRAIL_PALETTES[state];
  const palette =
    state === 'cruise' && params.hasBooster
      ? [0x38bdf8, 0xf472b6, 0x7dd3fc, 0xfbcfe8]
      : state === 'cruise' && params.hasMagnet
        ? [0x38bdf8, 0x818cf8, 0x22d3ee, 0xe0f2fe]
        : basePalette;

  const budget = getGraphicsQualityBudget(Boolean(params.lowGraphics));
  const stateRateBoost =
    state === 'turbo' ? 42 : state === 'wallrun' ? 20 : state === 'airborne' ? 14 : 0;
  const rawSpawnRate = Math.round(38 + speedNorm * 34 + stateRateBoost);
  const spawnRatePerSec = scaleParticleCount(rawSpawnRate, budget.trailRateScale, 8);

  const stateStreakBoost =
    state === 'turbo' ? 0.55 : state === 'wallrun' ? 0.22 : state === 'airborne' ? 0.14 : 0;
  const streakLength = Number((0.62 + speedNorm * 0.58 + stateStreakBoost).toFixed(3));

  const baseWidth =
    state === 'turbo' ? 1.28 : state === 'wallrun' ? 1.12 : state === 'airborne' ? 1.06 : 0.94;
  const particleLife =
    state === 'turbo' ? 0.42 : state === 'wallrun' ? 0.38 : state === 'airborne' ? 0.34 : 0.33;
  const rawBurstCount = state === 'turbo' ? 14 : state === 'wallrun' ? 10 : 8;
  const burstCount = scaleParticleCount(rawBurstCount, budget.trailBurstScale, 2);

  return {
    state,
    spawnRatePerSec,
    streakLength,
    baseWidth,
    particleLife,
    palette,
    burstCount
  };
}

/**
 * Computes world-space emitter offsets behind the robot's left/right wheels and
 * rear thrusters/booster, rotated by the robot's Z-roll so wall-running trails
 * hug the wall surface cleanly.
 */
export function computeTrailEmitterOffsets(
  rollRad: number,
  hasThrusters: boolean,
  hasBooster: boolean
): TrailEmitterAnchor[] {
  const localAnchors: TrailEmitterAnchor[] = [
    // Left & right rear wheel/tread contact wake emitters
    { offsetX: -0.56, offsetY: 0.22, offsetZ: 0.56, weight: 1 },
    { offsetX: 0.56, offsetY: 0.22, offsetZ: 0.56, weight: 1 }
  ];

  if (hasThrusters) {
    localAnchors.push(
      { offsetX: -0.23, offsetY: 0.56, offsetZ: 0.72, weight: 1.15 },
      { offsetX: 0.23, offsetY: 0.56, offsetZ: 0.72, weight: 1.15 }
    );
  }
  if (hasBooster) {
    localAnchors.push({ offsetX: 0, offsetY: 1.12, offsetZ: 0.78, weight: 1.3 });
  } else if (!hasThrusters) {
    // Center chassis slipstream emitter when no rear jet packs are equipped
    localAnchors.push({ offsetX: 0, offsetY: 0.55, offsetZ: 0.62, weight: 0.9 });
  }

  const cosR = Math.cos(rollRad);
  const sinR = Math.sin(rollRad);

  return localAnchors.map((a) => ({
    offsetX: a.offsetX * cosR - a.offsetY * sinR,
    offsetY: a.offsetX * sinR + a.offsetY * cosR,
    offsetZ: a.offsetZ,
    weight: a.weight
  }));
}

export function createActionTrailSpawnSample(params: {
  botX: number;
  botY: number;
  botZ: number;
  botVx: number;
  botVy: number;
  speed: number;
  anchor: TrailEmitterAnchor;
  config: ActionTrailEmitConfig;
  jitterX: number; // [-1, 1]
  jitterY: number; // [-1, 1]
  colorIdx: number;
  lifeJitter: number; // [0, 1]
}): ActionTrailParticleInit {
  const { botX, botY, botZ, botVx, botVy, speed, anchor, config } = params;
  const palette = config.palette;
  const color = palette[((params.colorIdx % palette.length) + palette.length) % palette.length];
  const spread = config.state === 'turbo' ? 0.16 : 0.1;

  return {
    x: botX + anchor.offsetX + params.jitterX * spread,
    y: botY + anchor.offsetY + params.jitterY * spread * 0.85,
    z: botZ + anchor.offsetZ,
    // Gentle lateral/vertical wake drift + subtle rearward slipstream velocity (+Z)
    vx: botVx * 0.12 + params.jitterX * (config.state === 'turbo' ? 1.1 : 0.55),
    vy: botVy * 0.08 + 0.22 + params.jitterY * 0.35,
    vz: Math.max(0.9, speed * 0.1),
    maxLife: config.particleLife * (0.78 + params.lifeJitter * 0.4),
    baseWidth: config.baseWidth * (0.76 + params.lifeJitter * 0.34) * Math.min(1.2, anchor.weight),
    streakLength: config.streakLength * (0.9 + params.lifeJitter * 0.4),
    color,
    spin: (params.jitterX >= 0 ? 1 : -1) * (4.5 + params.lifeJitter * 5.0)
  };
}

/**
 * Evaluates smooth aerodynamic streak scale & additive glow brightness over
 * normalized lifetime progress in [0, 1].
 */
export function evaluateTrailParticleTransform(
  progress: number,
  baseWidth: number,
  streakLength: number
): TrailTransformSample {
  const t = Math.max(0, Math.min(1, progress));
  // Rapid pop-in during first 12% of life, then sleek aerodynamic taper to 0
  const envelope = t < 0.12 ? t / 0.12 : Math.pow(1 - (t - 0.12) / 0.88, 1.35);
  const widthScale = Math.max(0.01, baseWidth * (0.24 + envelope * 0.88));
  const lengthScale = Math.max(0.08, streakLength * (0.55 + envelope * 1.25) * (1 + t * 0.4));
  const brightness = Math.max(0, Math.min(1, envelope * 1.05));

  return {
    scaleX: widthScale,
    scaleY: widthScale,
    scaleZ: lengthScale,
    brightness
  };
}

export interface RibbonSegmentSample {
  halfWidth: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Computes tapered half-width and additive RGB intensity along a continuous
 * slipstream ribbon where t = 0 is attached at the robot and t = 1 is the tail tip.
 */
export function computeRibbonSegmentSample(
  t: number,
  baseHalfWidth: number,
  colorHex: number
): RibbonSegmentSample {
  const clamped = Math.max(0, Math.min(1, t));
  const taper = Math.pow(1 - clamped, 1.55);
  const fade = Math.pow(1 - clamped, 1.75);
  const r = (((colorHex >> 16) & 0xff) / 255) * fade;
  const g = (((colorHex >> 8) & 0xff) / 255) * fade;
  const b = ((colorHex & 0xff) / 255) * fade;
  return {
    halfWidth: baseHalfWidth * (0.1 + taper * 0.9),
    r,
    g,
    b
  };
}

