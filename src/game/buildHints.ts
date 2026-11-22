import {
  computeChassisInfo,
  createEmptyChassis,
  findShortestTrackPlan,
  PARTS,
  type ChassisGrid,
  type LevelDef,
  type PartId
} from './engine';

export interface BuildEquipmentStep {
  part: PartId;
  name: string;
  cost: number;
  targetSlot: [number, number];
  slotKey: string;
  slotLabel: string;
  reason: string;
  hazardTag: 'drive' | 'gap' | 'mud' | 'ramp' | 'gate';
  installed: boolean;
  isNext: boolean;
}

export interface BuildEquipmentGuide {
  levelId: number;
  levelName: string;
  /** True on early campaign levels (Levels 1–5) so kids get automatic smooth guidance */
  autoShow: boolean;
  steps: BuildEquipmentStep[];
  nextStep: BuildEquipmentStep | null;
  completedCount: number;
  totalCount: number;
  allRecommendedEquipped: boolean;
  readyForCode: boolean;
  headline: string;
  actionHint: string;
}

function formatSlotLabel(slot: [number, number], part: PartId): string {
  const [r, c] = slot;
  if (part === 'laser' || c === 2) return 'Front right slot';
  if (r === 2) return 'Bottom drive slot';
  if (r === 0) return 'Top power slot';
  return 'Middle side slot';
}

function describePartReason(
  part: PartId,
  hasGaps: boolean,
  hasMud: boolean,
  hasRamps: boolean
): { reason: string; hazardTag: BuildEquipmentStep['hazardTag'] } {
  switch (part) {
    case 'wheels':
      return {
        reason: 'Rolls smoothly across solid track tiles',
        hazardTag: 'drive'
      };
    case 'treads':
      return {
        reason: hasMud
          ? 'Grips through sticky mud pits without getting stuck'
          : 'All-terrain drive grip for rough tiles',
        hazardTag: 'mud'
      };
    case 'thrusters':
      return {
        reason: hasGaps
          ? 'Lets JUMP leap cleanly across canyon gaps'
          : 'Enables JUMP over obstacles ahead',
        hazardTag: 'gap'
      };
    case 'booster':
      return {
        reason: hasRamps
          ? 'Rockets up steep sky ramps with BOOST'
          : 'Surges 3 tiles ahead with BOOST',
        hazardTag: 'ramp'
      };
    case 'laser':
      return {
        reason: 'Required on the front to unlock the laser gate',
        hazardTag: 'gate'
      };
    case 'magnet':
      return {
        reason: 'Pulls nearby bolts during bonus runs',
        hazardTag: 'drive'
      };
  }
}

/**
 * Computes a deterministic, kid-friendly step-by-step equipment attachment guide
 * tailored to the current level's track hazards and energy budget.
 */
export function computeBuildEquipmentGuide(
  level: LevelDef,
  chassis: ChassisGrid,
  selectedPart: PartId | null
): BuildEquipmentGuide {
  const safeChassis = chassis || createEmptyChassis();
  const info = computeChassisInfo(safeChassis);
  const plan = findShortestTrackPlan(level);

  const hasGaps = level.track.some((t) => t.type === 'gap');
  const hasMud = level.track.some((t) => t.type === 'mud');
  const hasRamps = level.track.some((t) => t.type === 'ramp');

  const recommendedParts: PartId[] = [];
  const isEarlyGapLesson = !level.isBonus && !level.isDaily && level.id <= 3 && hasGaps && !hasRamps;
  const needsTreads = plan ? plan.profile.treads : hasMud;
  const needsThrusters = isEarlyGapLesson ? true : plan ? plan.profile.thrusters : hasGaps;
  const needsBooster = isEarlyGapLesson ? false : plan ? plan.profile.booster : hasRamps;

  // Step 1: Drive base (Treads if mud requires it, otherwise Wheels)
  recommendedParts.push(needsTreads ? 'treads' : 'wheels');

  // Step 2: Hazard traversal gear
  if (needsThrusters) recommendedParts.push('thrusters');
  if (needsBooster) recommendedParts.push('booster');

  // Final required step: Front Laser Emitter for the gate circuit
  recommendedParts.push('laser');

  const isPartInstalled = (part: PartId): boolean => {
    switch (part) {
      case 'wheels':
        return info.hasWheels || (!needsTreads && info.hasTreads);
      case 'treads':
        return info.hasTreads;
      case 'thrusters':
        return info.hasThrusters;
      case 'booster':
        return info.hasBooster;
      case 'laser':
        return info.hasFrontLaser;
      case 'magnet':
        return info.hasMagnet;
    }
  };

  let foundNext = false;
  const steps: BuildEquipmentStep[] = recommendedParts.map((part) => {
    const def = PARTS[part];
    const installed = isPartInstalled(part);
    const isNext = !installed && !foundNext;
    if (isNext) foundNext = true;
    const { reason, hazardTag } = describePartReason(part, hasGaps, hasMud, hasRamps);
    const targetSlot: [number, number] = [def.preferredSlot[0], def.preferredSlot[1]];
    return {
      part,
      name: def.name,
      cost: def.cost,
      targetSlot,
      slotKey: `${targetSlot[0]},${targetSlot[1]}`,
      slotLabel: formatSlotLabel(targetSlot, part),
      reason,
      hazardTag,
      installed,
      isNext
    };
  });

  const nextStep = steps.find((s) => s.isNext) || null;
  const completedCount = steps.filter((s) => s.installed).length;
  const totalCount = steps.length;
  const allRecommendedEquipped = nextStep === null;
  const readyForCode = info.hasDrive && info.hasFrontLaser;
  const autoShow = !level.isBonus && !level.isDaily && level.id <= 5;

  let headline = 'Bot Ready for Coding!';
  let actionHint = 'Tap the green arrow to program your bot.';

  if (nextStep) {
    headline = `Step ${completedCount + 1} of ${totalCount}: Attach ${nextStep.name}`;
    if (selectedPart === nextStep.part) {
      actionHint = `Tap the glowing ${nextStep.slotLabel.toLowerCase()} on the robot!`;
    } else {
      actionHint = `${nextStep.reason} — drag to ${nextStep.slotLabel.toLowerCase()} or tap Attach.`;
    }
  }

  return {
    levelId: level.id,
    levelName: level.name,
    autoShow,
    steps,
    nextStep,
    completedCount,
    totalCount,
    allRecommendedEquipped,
    readyForCode,
    headline,
    actionHint
  };
}
