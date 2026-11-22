export interface GraphicsQualityBudget {
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
}

export const STANDARD_GRAPHICS_BUDGET: GraphicsQualityBudget = {
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
  shadowsEnabled: true
};

export const LOW_GRAPHICS_BUDGET: GraphicsQualityBudget = {
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
  shadowsEnabled: false
};

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
