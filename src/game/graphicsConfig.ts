export type GraphicsQualityMode = 'auto' | 'ultra' | 'balanced' | 'eco';
export type GraphicsQualityTier = 'ultra' | 'balanced' | 'eco';

export interface GraphicsQualityBudget {
  tier: GraphicsQualityTier;
  lowGraphics: boolean;
  /** Multiplier for 3D spark bursts (weld sparks, touch sparks, impact sparks) */
  sparkScale: number;
  /** Multiplier for 3D pastel puff bursts (part placement, code feedback) */
  puffScale: number;
  /** Multiplier for 3D confetti bursts (celebrations, theme swaps) */
  confettiScale: number;
  /** Multiplier for 2D UI placement overlay particles */
  uiBurstScale: number;
  /** Multiplier for Action Dash continuous trailing particle emission rate */
  trailRateScale: number;
  /** Multiplier for Action Dash jump/wall-run burst particles */
  trailBurstScale: number;
  /** Maximum active slipstream ribbons during Action Dash */
  maxRibbonCount: number;
  /** Whether ambient floating dust motes in the 3D workshop are rendered */
  ambientMotesVisible: boolean;
  /** Maximum WebGL canvas devicePixelRatio */
  maxPixelRatio: number;
  /** Whether dynamic 3D shadow maps are enabled (when hardware WebGL is available) */
  shadowsEnabled: boolean;
  /** Directional key light shadow map resolution (0 when shadows disabled) */
  shadowMapSize: 0 | 1024 | 2048;
  /** Whether selective HDR bloom post-processing is active (never active on software WebGL) */
  bloomEnabled: boolean;
  /** Bloom render target resolution scale relative to viewport (0.5 half-res, 0.25 quarter-res) */
  bloomResolutionScale: number;
  /** Selective bloom strength */
  bloomStrength: number;
  /** Selective bloom spread radius */
  bloomRadius: number;
  /** Selective bloom luminance threshold (> 1.0 preserves pastel ceramic shells) */
  bloomThreshold: number;
  /** Whether studio RectAreaLight softbox is enabled */
  softboxEnabled: boolean;
  /** Whether dynamic robot underglow PointLight is enabled */
  dynamicBotLightEnabled: boolean;
}

export const ULTRA_GRAPHICS_BUDGET: GraphicsQualityBudget = {
  tier: 'ultra',
  lowGraphics: false,
  sparkScale: 1,
  puffScale: 1,
  confettiScale: 1,
  uiBurstScale: 1,
  trailRateScale: 1,
  trailBurstScale: 1,
  maxRibbonCount: 3,
  ambientMotesVisible: true,
  maxPixelRatio: 2,
  shadowsEnabled: true,
  shadowMapSize: 2048,
  bloomEnabled: true,
  bloomResolutionScale: 0.5,
  bloomStrength: 0.14,
  bloomRadius: 0.18,
  bloomThreshold: 1.8,
  softboxEnabled: true,
  dynamicBotLightEnabled: true
};

export const BALANCED_GRAPHICS_BUDGET: GraphicsQualityBudget = {
  tier: 'balanced',
  lowGraphics: false,
  sparkScale: 0.72,
  puffScale: 0.75,
  confettiScale: 0.7,
  uiBurstScale: 0.75,
  trailRateScale: 0.72,
  trailBurstScale: 0.72,
  maxRibbonCount: 2,
  ambientMotesVisible: true,
  maxPixelRatio: 1.5,
  shadowsEnabled: true,
  shadowMapSize: 1024,
  bloomEnabled: true,
  bloomResolutionScale: 0.25,
  bloomStrength: 0.1,
  bloomRadius: 0.15,
  bloomThreshold: 1.9,
  softboxEnabled: true,
  dynamicBotLightEnabled: true
};

export const ECO_GRAPHICS_BUDGET: GraphicsQualityBudget = {
  tier: 'eco',
  lowGraphics: true,
  sparkScale: 0.3,
  puffScale: 0.35,
  confettiScale: 0.25,
  uiBurstScale: 0.3,
  trailRateScale: 0.35,
  trailBurstScale: 0.35,
  maxRibbonCount: 1,
  ambientMotesVisible: false,
  maxPixelRatio: 1,
  shadowsEnabled: false,
  shadowMapSize: 0,
  bloomEnabled: false,
  bloomResolutionScale: 0.25,
  bloomStrength: 0,
  bloomRadius: 0,
  bloomThreshold: 1.2,
  softboxEnabled: false,
  dynamicBotLightEnabled: false
};

/** Backward-compatible aliases */
export const STANDARD_GRAPHICS_BUDGET: GraphicsQualityBudget = ULTRA_GRAPHICS_BUDGET;
export const LOW_GRAPHICS_BUDGET: GraphicsQualityBudget = ECO_GRAPHICS_BUDGET;

export function normalizeGraphicsQualityMode(
  mode?: string | null,
  legacyLowGraphics?: boolean
): GraphicsQualityMode {
  if (mode === 'auto' || mode === 'ultra' || mode === 'balanced' || mode === 'eco') {
    return mode;
  }
  return legacyLowGraphics ? 'eco' : 'auto';
}

export function getQualityBudgetForTier(
  tier: GraphicsQualityTier,
  isSoftwareGl = false
): GraphicsQualityBudget {
  const base =
    tier === 'eco'
      ? ECO_GRAPHICS_BUDGET
      : tier === 'balanced'
        ? BALANCED_GRAPHICS_BUDGET
        : ULTRA_GRAPHICS_BUDGET;

  if (!isSoftwareGl) return base;

  // Software WebGL keeps identical scene content & particle semantics while disabling
  // multi-pass GPU bottlenecks (bloom, shadow maps, softboxes, high DPR).
  return {
    ...base,
    maxPixelRatio: 1,
    shadowsEnabled: false,
    shadowMapSize: 0,
    bloomEnabled: false,
    bloomStrength: 0,
    softboxEnabled: false
  };
}

export function getGraphicsQualityBudget(lowGraphics: boolean): GraphicsQualityBudget {
  return lowGraphics ? LOW_GRAPHICS_BUDGET : STANDARD_GRAPHICS_BUDGET;
}

/**
 * Scales a particle count by a graphics multiplier while preserving at least
 * `minWhenPositive` particles when `baseCount > 0` so gameplay feedback stays legible.
 */
export function scaleParticleCount(
  baseCount: number,
  scale: number,
  minWhenPositive = 1
): number {
  if (baseCount <= 0 || scale <= 0) return 0;
  const scaled = Math.round(baseCount * scale);
  return Math.max(Math.min(baseCount, minWhenPositive), scaled);
}

export interface AdaptiveQualityOptions {
  isSoftwareGl?: boolean;
  initialMode?: GraphicsQualityMode;
  preferBalancedStart?: boolean;
}

/**
 * Rolling frame-time monitor with hysteresis that smoothly adapts rendering quality
 * between Ultra, Balanced, and Eco in `auto` mode without rapid oscillation.
 */
export class AdaptiveQualityMonitor {
  private mode: GraphicsQualityMode;
  private tier: GraphicsQualityTier;
  private readonly isSoftwareGl: boolean;
  private emaFrameMs = 16.67;
  private slowAccumSec = 0;
  private fastAccumSec = 0;
  private cooldownSec = 0;

  constructor(options: AdaptiveQualityOptions = {}) {
    this.isSoftwareGl = Boolean(options.isSoftwareGl);
    this.mode = options.initialMode ?? 'auto';
    if (this.mode !== 'auto') {
      this.tier = this.mode;
    } else if (this.isSoftwareGl) {
      this.tier = 'eco';
    } else {
      this.tier = options.preferBalancedStart ? 'balanced' : 'ultra';
    }
  }

  public getMode(): GraphicsQualityMode {
    return this.mode;
  }

  public getTier(): GraphicsQualityTier {
    return this.tier;
  }

  public getBudget(): GraphicsQualityBudget {
    return getQualityBudgetForTier(this.tier, this.isSoftwareGl);
  }

  public setMode(mode: GraphicsQualityMode): { changed: boolean; budget: GraphicsQualityBudget } {
    const prevTier = this.tier;
    this.mode = mode;
    this.slowAccumSec = 0;
    this.fastAccumSec = 0;
    this.cooldownSec = 1.0;

    if (mode !== 'auto') {
      this.tier = mode;
    } else if (this.isSoftwareGl) {
      this.tier = 'eco';
    } else {
      this.tier = 'ultra';
    }
    return { changed: this.tier !== prevTier, budget: this.getBudget() };
  }

  /**
   * Feed elapsed frame duration in seconds. Returns a new budget only when the
   * resolved tier actually transitions.
   */
  public recordFrame(dtSec: number): GraphicsQualityBudget | null {
    if (this.mode !== 'auto' || this.isSoftwareGl) return null;
    if (!Number.isFinite(dtSec) || dtSec <= 0) return null;

    // Ignore tab-switch spikes (> 250ms) so backgrounding never downgrades quality
    if (dtSec > 0.25) return null;

    const frameMs = dtSec * 1000;
    this.emaFrameMs = this.emaFrameMs * 0.88 + frameMs * 0.12;

    if (this.cooldownSec > 0) {
      this.cooldownSec = Math.max(0, this.cooldownSec - dtSec);
      return null;
    }

    const downThresholdMs = this.tier === 'ultra' ? 25.5 : 34.0;
    const upThresholdMs = this.tier === 'eco' ? 18.5 : 17.5;

    if (this.emaFrameMs > downThresholdMs) {
      this.slowAccumSec += dtSec;
      this.fastAccumSec = 0;
      if (this.slowAccumSec >= 1.6) {
        this.slowAccumSec = 0;
        if (this.tier === 'ultra') {
          this.tier = 'balanced';
          this.cooldownSec = 2.5;
          return this.getBudget();
        }
        if (this.tier === 'balanced') {
          this.tier = 'eco';
          this.cooldownSec = 3.0;
          return this.getBudget();
        }
      }
    } else if (this.emaFrameMs < upThresholdMs) {
      this.fastAccumSec += dtSec;
      this.slowAccumSec = 0;
      if (this.fastAccumSec >= 4.0) {
        this.fastAccumSec = 0;
        if (this.tier === 'eco') {
          this.tier = 'balanced';
          this.cooldownSec = 3.0;
          return this.getBudget();
        }
        if (this.tier === 'balanced') {
          this.tier = 'ultra';
          this.cooldownSec = 3.5;
          return this.getBudget();
        }
      }
    } else {
      this.slowAccumSec = Math.max(0, this.slowAccumSec - dtSec * 0.5);
      this.fastAccumSec = Math.max(0, this.fastAccumSec - dtSec * 0.5);
    }

    return null;
  }
}
