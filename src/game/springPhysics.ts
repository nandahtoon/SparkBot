/**
 * Pure, zero-allocation second-order damped harmonic spring physics for SparkBot
 * kinematics (squash-and-stretch, articulated wheel suspension, inertial lean,
 * antenna whip) and camera recoil/FOV juice.
 */

export interface SpringScalarState {
  value: number;
  velocity: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  min?: number;
  max?: number;
}

const MAX_SPRING_SUBSTEP = 1 / 60;

/**
 * Advances a 1D second-order damped spring in-place using semi-implicit Euler
 * sub-stepping so large frame deltas never destabilize or explode.
 */
export function stepSpringScalar(
  state: SpringScalarState,
  target: number,
  config: SpringConfig,
  dt: number
): number {
  const clampedDt = Math.min(Math.max(dt, 0), 0.1);
  if (clampedDt <= 0) return state.value;

  const steps = Math.max(1, Math.ceil(clampedDt / MAX_SPRING_SUBSTEP));
  const h = clampedDt / steps;
  const k = config.stiffness;
  const c = config.damping;

  for (let i = 0; i < steps; i++) {
    const force = (target - state.value) * k - state.velocity * c;
    state.velocity += force * h;
    state.value += state.velocity * h;
  }

  if (config.min !== undefined && state.value < config.min) {
    state.value = config.min;
    if (state.velocity < 0) state.velocity = 0;
  }
  if (config.max !== undefined && state.value > config.max) {
    state.value = config.max;
    if (state.velocity > 0) state.velocity = 0;
  }

  return state.value;
}

export interface RobotKinematicsSample {
  /** Volume-preserving vertical scale (1.0 neutral, <1 compressed, >1 stretched) */
  squashY: number;
  /** Matching horizontal scale (1 / sqrt(squashY)) */
  squashXZ: number;
  /** Vertical suspension compression offset applied to chassis/wheel struts */
  suspensionOffset: number;
  /** Front-vs-rear wheel compression difference for braking/acceleration squat */
  suspensionPitchBias: number;
  /** Additional inertial chassis pitch from acceleration/deceleration */
  inertialPitch: number;
  /** Additional inertial chassis roll from turning/banking */
  inertialRoll: number;
  /** Secondary antenna/accessory spring whip X (pitch) */
  antennaWhipX: number;
  /** Secondary antenna/accessory spring whip Z (roll) */
  antennaWhipZ: number;
}

const SQUASH_SPRING: SpringConfig = { stiffness: 240, damping: 16.5, min: 0.74, max: 1.28 };
const SUSPENSION_SPRING: SpringConfig = { stiffness: 210, damping: 15.0, min: -0.14, max: 0.14 };
const LEAN_SPRING: SpringConfig = { stiffness: 150, damping: 14.5, min: -0.32, max: 0.32 };
const ANTENNA_SPRING: SpringConfig = { stiffness: 125, damping: 8.5, min: -0.55, max: 0.55 };

export class RobotKinematicsController {
  private readonly squash: SpringScalarState = { value: 1, velocity: 0 };
  private readonly suspension: SpringScalarState = { value: 0, velocity: 0 };
  private readonly pitchLean: SpringScalarState = { value: 0, velocity: 0 };
  private readonly rollLean: SpringScalarState = { value: 0, velocity: 0 };
  private readonly antennaX: SpringScalarState = { value: 0, velocity: 0 };
  private readonly antennaZ: SpringScalarState = { value: 0, velocity: 0 };

  private prevSpeed = 0;
  private prevAirborne = false;

  /** Pre-allocated output struct reused every frame (zero GC) */
  public readonly sample: RobotKinematicsSample = {
    squashY: 1,
    squashXZ: 1,
    suspensionOffset: 0,
    suspensionPitchBias: 0,
    inertialPitch: 0,
    inertialRoll: 0,
    antennaWhipX: 0,
    antennaWhipZ: 0
  };

  /**
   * Injects a physical impact impulse (e.g., landing, part snap, wall bump, boost launch).
   * Positive `strength` compresses downward (squash < 1); negative stretches upward (launch).
   */
  public injectImpact(strength: number, pitchKick = 0, rollKick = 0): void {
    const s = Math.max(-2.0, Math.min(2.0, strength));
    this.squash.velocity -= s * 1.95;
    this.suspension.velocity -= s * 0.95;
    this.pitchLean.velocity += pitchKick;
    this.rollLean.velocity += rollKick;
    this.antennaX.velocity += pitchKick * 1.6 - s * 1.2;
    this.antennaZ.velocity += rollKick * 1.6;
  }

  public reset(): void {
    this.squash.value = 1;
    this.squash.velocity = 0;
    this.suspension.value = 0;
    this.suspension.velocity = 0;
    this.pitchLean.value = 0;
    this.pitchLean.velocity = 0;
    this.rollLean.value = 0;
    this.rollLean.velocity = 0;
    this.antennaX.value = 0;
    this.antennaX.velocity = 0;
    this.antennaZ.value = 0;
    this.antennaZ.velocity = 0;
    this.prevSpeed = 0;
    this.prevAirborne = false;
  }

  public step(params: {
    dt: number;
    targetSquash: number;
    speed: number;
    isAirborne: boolean;
    targetPitch: number;
    targetRoll: number;
    turbulence?: number;
  }): RobotKinematicsSample {
    const dt = Math.min(Math.max(params.dt, 0), 0.05);

    // Detect airborne <-> grounded transitions automatically for crisp takeoff stretch & landing thump
    if (this.prevAirborne && !params.isAirborne) {
      this.injectImpact(0.88, 0.45, 0);
    } else if (!this.prevAirborne && params.isAirborne) {
      this.injectImpact(-0.52, -0.35, 0);
    }
    this.prevAirborne = params.isAirborne;

    // Acceleration delta drives forward/back squat & antenna inertia
    const accel = dt > 0.0005 ? (params.speed - this.prevSpeed) / dt : 0;
    this.prevSpeed = params.speed;
    const clampedAccel = Math.max(-18, Math.min(18, accel));

    const targetSusp = params.isAirborne ? 0.065 : 0;
    const targetPitchLean = Math.max(-0.22, Math.min(0.22, -clampedAccel * 0.011 + params.targetPitch * 0.35));
    const targetRollLean = Math.max(-0.24, Math.min(0.24, params.targetRoll * 0.45));
    const turb = params.turbulence ?? 0;

    const sq = stepSpringScalar(this.squash, params.targetSquash, SQUASH_SPRING, dt);
    const susp = stepSpringScalar(this.suspension, targetSusp, SUSPENSION_SPRING, dt);
    const pLean = stepSpringScalar(this.pitchLean, targetPitchLean, LEAN_SPRING, dt);
    const rLean = stepSpringScalar(this.rollLean, targetRollLean, LEAN_SPRING, dt);
    const antX = stepSpringScalar(
      this.antennaX,
      -pLean * 1.45 - clampedAccel * 0.018 + turb,
      ANTENNA_SPRING,
      dt
    );
    const antZ = stepSpringScalar(this.antennaZ, -rLean * 1.55, ANTENNA_SPRING, dt);

    this.sample.squashY = sq;
    this.sample.squashXZ = 1 / Math.sqrt(Math.max(0.75, sq));
    this.sample.suspensionOffset = susp;
    this.sample.suspensionPitchBias = pLean * 0.25;
    this.sample.inertialPitch = pLean;
    this.sample.inertialRoll = rLean;
    this.sample.antennaWhipX = antX;
    this.sample.antennaWhipZ = antZ;

    return this.sample;
  }
}

export interface CameraJuiceSample {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  fovBoost: number;
}

const CAM_RECOIL_SPRING: SpringConfig = { stiffness: 320, damping: 20, min: -0.45, max: 0.45 };
const CAM_FOV_SPRING: SpringConfig = { stiffness: 140, damping: 16, min: -2, max: 8 };

export class CameraJuiceController {
  private readonly shakeX: SpringScalarState = { value: 0, velocity: 0 };
  private readonly shakeY: SpringScalarState = { value: 0, velocity: 0 };
  private readonly shakeZ: SpringScalarState = { value: 0, velocity: 0 };
  private readonly fovSpring: SpringScalarState = { value: 0, velocity: 0 };
  private reducedMotion = false;

  public readonly sample: CameraJuiceSample = {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    fovBoost: 0
  };

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = Boolean(enabled);
  }

  public addImpulse(ix: number, iy: number, iz: number, fovKick = 0): void {
    const scale = this.reducedMotion ? 0.2 : 1.0;
    this.shakeX.velocity += ix * scale;
    this.shakeY.velocity += iy * scale;
    this.shakeZ.velocity += iz * scale;
    this.fovSpring.velocity += fovKick * (this.reducedMotion ? 0.25 : 1.0);
  }

  public reset(): void {
    this.shakeX.value = 0;
    this.shakeX.velocity = 0;
    this.shakeY.value = 0;
    this.shakeY.velocity = 0;
    this.shakeZ.value = 0;
    this.shakeZ.velocity = 0;
    this.fovSpring.value = 0;
    this.fovSpring.velocity = 0;
  }

  public step(dt: number, targetFovBoost = 0): CameraJuiceSample {
    const safeDt = Math.min(Math.max(dt, 0), 0.05);
    this.sample.offsetX = stepSpringScalar(this.shakeX, 0, CAM_RECOIL_SPRING, safeDt);
    this.sample.offsetY = stepSpringScalar(this.shakeY, 0, CAM_RECOIL_SPRING, safeDt);
    this.sample.offsetZ = stepSpringScalar(this.shakeZ, 0, CAM_RECOIL_SPRING, safeDt);
    const effectiveFovTarget = this.reducedMotion ? targetFovBoost * 0.35 : targetFovBoost;
    this.sample.fovBoost = stepSpringScalar(this.fovSpring, effectiveFovTarget, CAM_FOV_SPRING, safeDt);
    return this.sample;
  }
}
