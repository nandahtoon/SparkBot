import type { ChassisInfo, PartId } from './engine';

export interface PlanetCapabilities {
  hasWheels: boolean;
  hasTreads: boolean;
  hasThrusters: boolean;
  hasBooster: boolean;
  hasLaser: boolean;
  hasMagnet: boolean;
}

export interface PlanetEquipmentMeta {
  part: PartId;
  label: string;
  powerName: string;
  keyHint: string;
}

export const PLANET_EQUIPMENT_META: PlanetEquipmentMeta[] = [
  {
    part: 'treads',
    label: 'Treads',
    powerName: 'Spore Bog Traction',
    keyHint: 'Passive'
  },
  {
    part: 'thrusters',
    label: 'Thrusters',
    powerName: 'High & Double Jump',
    keyHint: 'Space x2'
  },
  {
    part: 'booster',
    label: 'Booster',
    powerName: 'Turbo Rocket Dash',
    keyHint: 'Shift'
  },
  {
    part: 'laser',
    label: 'Laser',
    powerName: 'Crystal Shatter',
    keyHint: 'E / F'
  },
  {
    part: 'magnet',
    label: 'Magnet',
    powerName: 'Core & Bolt Pull',
    keyHint: 'Passive'
  }
];

export function derivePlanetCapabilities(info: ChassisInfo): PlanetCapabilities {
  return {
    hasWheels: info.hasWheels,
    hasTreads: info.hasTreads,
    hasThrusters: info.hasThrusters,
    hasBooster: info.hasBooster,
    hasLaser: info.hasLaserAny,
    hasMagnet: info.hasMagnet
  };
}

export interface PlanetPlateau {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  label: string;
}

export interface PlanetRamp {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Direction along which elevation rises from 0 to height */
  axis: 'z' | 'x';
  /** Coordinate at y = 0 */
  lowCoord: number;
  /** Coordinate at y = height */
  highCoord: number;
  height: number;
}

export interface PlanetBog {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface PlanetCrystalBarrier {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface PlanetCoreDef {
  id: string;
  name: string;
  x: number;
  z: number;
  hoverOffset: number;
}

export interface PlanetBoltDef {
  id: string;
  x: number;
  z: number;
  hoverOffset: number;
}

export const PLANET_BOUNDS = {
  minX: -19,
  maxX: 19,
  minZ: -34,
  maxZ: 7
} as const;

export const PLANET_SPAWN = {
  x: 0,
  z: 3.5,
  yaw: 0
} as const;

export const PLANET_EXIT_GATE = {
  x: 0,
  z: -30.2,
  radius: 2.35
} as const;

/**
 * Multi-elevation Alien Planet Crater Sector.
 * Every plateau has a smooth walk-up ramp so any mission chassis can finish,
 * while Thrusters allow direct cliff double-jumps and Laser clears crystal shortcuts.
 */
export const PLANET_PLATEAUS: PlanetPlateau[] = [
  {
    id: 'nw_ridge',
    minX: -15.5,
    maxX: -6.5,
    minZ: -17.5,
    maxZ: -8.5,
    height: 1.5,
    label: 'West Crystal Ridge'
  },
  {
    id: 'ne_mesa',
    minX: 6.5,
    maxX: 16,
    minZ: -21.5,
    maxZ: -10.5,
    height: 1.7,
    label: 'Crater Mesa'
  },
  {
    id: 'east_spire',
    minX: 10,
    maxX: 16.5,
    minZ: -4.5,
    maxZ: 2.5,
    height: 1.35,
    label: 'East Oasis Shelf'
  },
  {
    id: 'north_sanctum',
    minX: -7.5,
    maxX: 7.5,
    minZ: -33.2,
    maxZ: -24.2,
    height: 1.4,
    label: 'Sanctum Promontory'
  }
];

export const PLANET_RAMPS: PlanetRamp[] = [
  {
    id: 'nw_ridge_ramp',
    minX: -12.6,
    maxX: -8.8,
    minZ: -8.5,
    maxZ: -3.5,
    axis: 'z',
    lowCoord: -3.5,
    highCoord: -8.5,
    height: 1.5
  },
  {
    id: 'ne_mesa_ramp',
    minX: 2.2,
    maxX: 6.5,
    minZ: -17.5,
    maxZ: -13.2,
    axis: 'x',
    lowCoord: 2.2,
    highCoord: 6.5,
    height: 1.7
  },
  {
    id: 'east_spire_ramp',
    minX: 11.2,
    maxX: 15.2,
    minZ: 2.5,
    maxZ: 6.2,
    axis: 'z',
    lowCoord: 6.2,
    highCoord: 2.5,
    height: 1.35
  },
  {
    id: 'sanctum_ramp',
    minX: -2.4,
    maxX: 2.4,
    minZ: -24.2,
    maxZ: -19.2,
    axis: 'z',
    lowCoord: -19.2,
    highCoord: -24.2,
    height: 1.4
  }
];

export const PLANET_BOGS: PlanetBog[] = [
  { id: 'central_bog', x: 0, z: -11.5, radius: 3.3 },
  { id: 'west_bog', x: -10.5, z: -1.8, radius: 2.7 },
  { id: 'north_bog', x: 4.2, z: -20.8, radius: 2.6 }
];

export const PLANET_CRYSTAL_BARRIERS: PlanetCrystalBarrier[] = [
  { id: 'crystal_west', x: -10.8, y: 1.5, z: -11.2, radius: 1.35 },
  { id: 'crystal_east', x: 10.6, y: 1.7, z: -15.4, radius: 1.35 },
  { id: 'crystal_center', x: 0, y: 0, z: -17.4, radius: 1.45 }
];

export const PLANET_CORES: PlanetCoreDef[] = [
  { id: 'core_plaza', name: 'Basin Core', x: 0, z: -5.8, hoverOffset: 0.9 },
  { id: 'core_west', name: 'Ridge Core', x: -11.2, z: -14.8, hoverOffset: 0.9 },
  { id: 'core_east', name: 'Oasis Core', x: 13.2, z: -1.0, hoverOffset: 0.9 },
  { id: 'core_mesa', name: 'Mesa Core', x: 12.2, z: -18.2, hoverOffset: 0.9 },
  { id: 'core_sanctum', name: 'Sanctum Core', x: -4.6, z: -27.2, hoverOffset: 0.9 }
];

export const PLANET_BOLTS: PlanetBoltDef[] = [
  { id: 'b1', x: -3.8, z: -1.5, hoverOffset: 0.65 },
  { id: 'b2', x: 4.0, z: -2.2, hoverOffset: 0.65 },
  { id: 'b3', x: -10.8, z: -6.2, hoverOffset: 0.7 },
  { id: 'b4', x: -11.5, z: -12.6, hoverOffset: 0.7 },
  { id: 'b5', x: -8.6, z: -15.5, hoverOffset: 0.7 },
  { id: 'b6', x: 13.2, z: 4.2, hoverOffset: 0.7 },
  { id: 'b7', x: 11.4, z: -3.0, hoverOffset: 0.7 },
  { id: 'b8', x: 0.0, z: -11.5, hoverOffset: 0.7 },
  { id: 'b9', x: 4.2, z: -15.4, hoverOffset: 0.7 },
  { id: 'b10', x: 12.2, z: -13.0, hoverOffset: 0.7 },
  { id: 'b11', x: 13.8, z: -19.4, hoverOffset: 0.7 },
  { id: 'b12', x: 0.0, z: -21.8, hoverOffset: 0.7 },
  { id: 'b13', x: 4.8, z: -27.4, hoverOffset: 0.7 },
  { id: 'b14', x: -4.2, z: -30.5, hoverOffset: 0.7 }
];

/**
 * Computes exact ground height at (x, z) across alien crater floor, ramps, and rocky plateaus.
 */
export function getPlanetGroundY(x: number, z: number): number {
  let maxY = 0;

  for (const p of PLANET_PLATEAUS) {
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      if (p.height > maxY) maxY = p.height;
    }
  }

  for (const r of PLANET_RAMPS) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
      const coord = r.axis === 'z' ? z : x;
      const span = r.highCoord - r.lowCoord;
      const t = span !== 0 ? Math.max(0, Math.min(1, (coord - r.lowCoord) / span)) : 0;
      const y = t * r.height;
      if (y > maxY) maxY = y;
    }
  }

  return maxY;
}

export function clampPlanetPosition(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(PLANET_BOUNDS.minX, Math.min(PLANET_BOUNDS.maxX, x)),
    z: Math.max(PLANET_BOUNDS.minZ, Math.min(PLANET_BOUNDS.maxZ, z))
  };
}

export function isPointInPlanetBog(x: number, z: number): { inBog: boolean; bogId: string | null } {
  for (const bog of PLANET_BOGS) {
    const dx = x - bog.x;
    const dz = z - bog.z;
    if (dx * dx + dz * dz <= bog.radius * bog.radius) {
      return { inBog: true, bogId: bog.id };
    }
  }
  return { inBog: false, bogId: null };
}

export function getPlanetBogSpeedMultiplier(
  capabilities: PlanetCapabilities,
  inBog: boolean,
  isAirborne: boolean
): number {
  if (!inBog || isAirborne || capabilities.hasTreads) return 1;
  return 0.48;
}

export function getPlanetPullRadius(capabilities: PlanetCapabilities): number {
  return capabilities.hasMagnet ? 5.2 : 1.55;
}

/**
 * Forward vector in XZ plane for Three.js `rotation.y = yaw` (robot front faces -Z at yaw = 0).
 */
export function getBotForwardXZ(yaw: number): { fx: number; fz: number } {
  return {
    fx: -Math.sin(yaw),
    fz: -Math.cos(yaw)
  };
}

/**
 * Checks which intact crystal barrier falls inside the robot's forward laser beam cone.
 */
export function findLaserTargetBarrier(
  botX: number,
  botZ: number,
  botYaw: number,
  barriers: ReadonlyArray<PlanetCrystalBarrier & { active: boolean }>,
  maxRange = 9.5
): PlanetCrystalBarrier | null {
  const { fx, fz } = getBotForwardXZ(botYaw);
  let best: PlanetCrystalBarrier | null = null;
  let bestDist = maxRange + 1;

  for (const b of barriers) {
    if (!b.active) continue;
    const dx = b.x - botX;
    const dz = b.z - botZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.2 || dist > maxRange + b.radius) continue;
    const dot = (dx / dist) * fx + (dz / dist) * fz;
    // Allow generous ~32 deg half-angle cone so kids hit crystals reliably
    if (dot >= 0.84 && dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }
  return best;
}

export interface PlanetObjectiveGuide {
  targetLabel: string;
  isGate: boolean;
  distanceMeters: number;
  /** World angle in radians relative to North (-Z), clockwise positive for HUD arrow rotation */
  compassAngleRad: number;
}

export function computePlanetObjectiveGuide(
  botX: number,
  botZ: number,
  remainingCores: ReadonlyArray<{ x: number; z: number; name: string }>,
  gateUnlocked: boolean
): PlanetObjectiveGuide {
  if (gateUnlocked || remainingCores.length === 0) {
    const dx = PLANET_EXIT_GATE.x - botX;
    const dz = PLANET_EXIT_GATE.z - botZ;
    return {
      targetLabel: 'Exit Gate',
      isGate: true,
      distanceMeters: Math.round(Math.hypot(dx, dz)),
      compassAngleRad: Math.atan2(dx, -dz)
    };
  }

  let nearest = remainingCores[0];
  let bestDist = Math.hypot(nearest.x - botX, nearest.z - botZ);
  for (let i = 1; i < remainingCores.length; i++) {
    const c = remainingCores[i];
    const d = Math.hypot(c.x - botX, c.z - botZ);
    if (d < bestDist) {
      bestDist = d;
      nearest = c;
    }
  }

  return {
    targetLabel: nearest.name,
    isGate: false,
    distanceMeters: Math.round(bestDist),
    compassAngleRad: Math.atan2(nearest.x - botX, -(nearest.z - botZ))
  };
}

export interface PlanetAdventureMetrics {
  coresCollected: number;
  totalCores: number;
  boltsCollected: number;
  totalBolts: number;
  crystalsShattered: number;
  elapsedSeconds: number;
  gateUnlocked: boolean;
  inBog: boolean;
  boostCooldown: number;
  boostActiveTimer: number;
  laserCooldown: number;
  doubleJumpReady: boolean;
  capabilities: PlanetCapabilities;
  objectiveLabel: string;
  objectiveDistance: number;
  objectiveAngleRad: number;
  status: 'playing' | 'won' | 'exited';
}

export function createInitialPlanetMetrics(capabilities: PlanetCapabilities): PlanetAdventureMetrics {
  const guide = computePlanetObjectiveGuide(
    PLANET_SPAWN.x,
    PLANET_SPAWN.z,
    PLANET_CORES,
    false
  );
  return {
    coresCollected: 0,
    totalCores: PLANET_CORES.length,
    boltsCollected: 0,
    totalBolts: PLANET_BOLTS.length,
    crystalsShattered: 0,
    elapsedSeconds: 0,
    gateUnlocked: false,
    inBog: false,
    boostCooldown: 0,
    boostActiveTimer: 0,
    laserCooldown: 0,
    doubleJumpReady: capabilities.hasThrusters,
    capabilities: { ...capabilities },
    objectiveLabel: guide.targetLabel,
    objectiveDistance: guide.distanceMeters,
    objectiveAngleRad: guide.compassAngleRad,
    status: 'playing'
  };
}

export function computePlanetAdventureReward(metrics: Pick<
  PlanetAdventureMetrics,
  'coresCollected' | 'boltsCollected' | 'crystalsShattered' | 'elapsedSeconds' | 'status'
>): { score: number; boltsEarned: number } {
  const won = metrics.status === 'won';
  const speedBonus = won ? Math.max(0, Math.round((90 - Math.min(90, metrics.elapsedSeconds)) * 0.4)) : 0;
  const score =
    metrics.coresCollected * 120 +
    metrics.boltsCollected * 25 +
    metrics.crystalsShattered * 60 +
    (won ? 250 + speedBonus * 5 : 0);
  const rawBolts =
    metrics.coresCollected * 10 +
    metrics.boltsCollected * 2 +
    metrics.crystalsShattered * 4 +
    (won ? 35 + Math.round(speedBonus * 0.35) : 0);

  return {
    score,
    boltsEarned: Math.max(metrics.coresCollected > 0 || metrics.boltsCollected > 0 ? 8 : 0, Math.min(180, rawBolts))
  };
}
