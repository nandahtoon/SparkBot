import {
  computeChassisInfo,
  PARTS,
  type ChassisGrid,
  type LevelDef,
  type PartDef,
  type PartId
} from './engine';

export type PartMissionRelevance = 'required' | 'recommended' | 'optional';

export interface PartBuildPlan {
  part: PartDef;
  installedCount: number;
  currentUsedEnergy: number;
  netEnergyDelta: number;
  projectedEnergy: number;
  budget: number;
  parBudget: number;
  remainingBefore: number;
  remainingAfter: number;
  canAfford: boolean;
  budgetShortfall: number;
  withinParBudget: boolean;
  requiresFrontColumn: boolean;
  replacesDrivePart: 'wheels' | 'treads' | null;
  missionRelevance: PartMissionRelevance;
  missionReason: string;
}

/**
 * Computes live energy-budget impact and mission-specific planning guidance
 * for hovering/inspecting a part in the BuildDock.
 */
export function computePartBuildPlan(
  partId: PartId,
  chassis: ChassisGrid,
  level: Pick<LevelDef, 'budget' | 'parBudget' | 'track'>
): PartBuildPlan {
  const part = PARTS[partId];
  const info = computeChassisInfo(chassis);

  let installedCount = 0;
  for (let r = 0; r < chassis.length; r++) {
    for (let c = 0; c < chassis[r].length; c++) {
      if (chassis[r][c] === partId) installedCount++;
    }
  }

  // Placing wheels or treads replaces any active drive base (matching App.handlePlacePart)
  let replacesDrivePart: 'wheels' | 'treads' | null = null;
  let replacedEnergy = 0;
  if (partId === 'wheels' || partId === 'treads') {
    for (let r = 0; r < chassis.length; r++) {
      for (let c = 0; c < chassis[r].length; c++) {
        const existing = chassis[r][c];
        if (existing === 'wheels' || existing === 'treads') {
          replacedEnergy += PARTS[existing].cost;
          if (existing !== partId) {
            replacesDrivePart = existing;
          }
        }
      }
    }
  }

  const currentUsedEnergy = info.cost;
  const netEnergyDelta = part.cost - replacedEnergy;
  const projectedEnergy = Math.max(0, currentUsedEnergy + netEnergyDelta);
  const budget = Math.max(0, level.budget);
  const parBudget = Math.max(0, level.parBudget);
  const remainingBefore = Math.max(0, budget - currentUsedEnergy);
  const canAfford = projectedEnergy <= budget;
  const remainingAfter = Math.max(0, budget - projectedEnergy);
  const budgetShortfall = canAfford ? 0 : projectedEnergy - budget;
  const withinParBudget = projectedEnergy <= parBudget;

  let gapCount = 0;
  let mudCount = 0;
  let rampCount = 0;
  for (const tile of level.track) {
    if (tile.type === 'gap') gapCount++;
    else if (tile.type === 'mud') mudCount++;
    else if (tile.type === 'ramp') rampCount++;
  }

  let missionRelevance: PartMissionRelevance = 'optional';
  let missionReason = 'Optional upgrade for extra versatility.';

  switch (partId) {
    case 'laser':
      missionRelevance = 'required';
      missionReason = 'Required on the front column to unlock the finish laser gate.';
      break;
    case 'wheels':
      if (mudCount > 0) {
        missionRelevance = 'optional';
        missionReason = `Low-cost drive base; needs Jump Thrusters to clear ${mudCount} mud ${mudCount === 1 ? 'tile' : 'tiles'}.`;
      } else {
        missionRelevance = 'required';
        missionReason = 'Lowest-cost drive base for flat tiles — leaves more energy for upgrades.';
      }
      break;
    case 'treads':
      if (mudCount > 0) {
        missionRelevance = 'recommended';
        missionReason = `Recommended: drives straight through ${mudCount} mud ${mudCount === 1 ? 'tile' : 'tiles'} on this track.`;
      } else {
        missionRelevance = 'optional';
        missionReason = 'Heavy all-terrain drive base (swaps out Standard Wheels).';
      }
      break;
    case 'thrusters':
      if (gapCount > 0) {
        missionRelevance = 'recommended';
        missionReason = `Recommended: jumps cleanly across ${gapCount} open ${gapCount === 1 ? 'gap' : 'gaps'} on this track.`;
      } else if (mudCount > 0) {
        missionRelevance = 'optional';
        missionReason = `Alternative: lets you jump over ${mudCount} mud ${mudCount === 1 ? 'tile' : 'tiles'} while keeping Wheels.`;
      } else {
        missionRelevance = 'optional';
        missionReason = 'Optional lift jets for 2-tile jumps over hazards.';
      }
      break;
    case 'booster':
      if (rampCount > 0) {
        missionRelevance = 'recommended';
        missionReason = `Recommended: powers up ${rampCount} steep ${rampCount === 1 ? 'ramp' : 'ramps'} on this track.`;
      } else if (gapCount > 0) {
        missionRelevance = 'optional';
        missionReason = `Alternative: blasts across ${gapCount} ${gapCount === 1 ? 'gap' : 'gaps'} at lower cost than Thrusters.`;
      } else {
        missionRelevance = 'optional';
        missionReason = 'Optional rocket pack for ramps and fast 2-tile boosts.';
      }
      break;
    case 'magnet':
      missionRelevance = 'optional';
      missionReason = 'Bonus upgrade: pulls bolts and builds faster shields in Action Dash.';
      break;
  }

  return {
    part,
    installedCount,
    currentUsedEnergy,
    netEnergyDelta,
    projectedEnergy,
    budget,
    parBudget,
    remainingBefore,
    remainingAfter,
    canAfford,
    budgetShortfall,
    withinParBudget,
    requiresFrontColumn: partId === 'laser',
    replacesDrivePart,
    missionRelevance,
    missionReason
  };
}
