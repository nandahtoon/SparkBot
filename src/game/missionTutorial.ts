import { computeChassisInfo, countBlocks } from './simulator';
import type { ChassisGrid, CodeBlock, LevelDef, PartId } from './types';

export type MissionTutorialPhase = 'build' | 'code';

export type MissionTutorialStepId =
  | 'build_budget'
  | 'build_wheels'
  | 'build_laser'
  | 'build_next_phase'
  | 'code_add_move'
  | 'code_rail_review'
  | 'code_run';

export interface MissionTutorialStepDef {
  id: MissionTutorialStepId;
  phase: MissionTutorialPhase;
  stepNumber: number;
  totalSteps: number;
  title: string;
  body: string;
  actionHint: string;
  primarySelector: string;
  secondarySelector?: string;
  allowManualNext: boolean;
  manualNextLabel?: string;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}

export interface MissionTutorialContext {
  level: LevelDef;
  mode: string;
  chassis: ChassisGrid;
  program: CodeBlock[];
  selectedPart: PartId | null;
  acknowledgedSteps: ReadonlySet<MissionTutorialStepId>;
}

export const TOTAL_MISSION_TUTORIAL_STEPS = 7;
export const MISSION_1_REQUIRED_MOVES = 5;

export const MISSION_TUTORIAL_ORDER: readonly MissionTutorialStepId[] = [
  'build_budget',
  'build_wheels',
  'build_laser',
  'build_next_phase',
  'code_add_move',
  'code_rail_review',
  'code_run'
] as const;

export function isFirstStoryMission(level: LevelDef): boolean {
  return (
    level.id === 1 &&
    !level.isDaily &&
    !level.isBonus &&
    !level.isSandbox &&
    !level.isClassCode
  );
}

export function shouldShowMissionTutorial(params: {
  level: LevelDef;
  mode: string;
  tutorialDone: boolean;
  tutorialForceActive: boolean;
  tutorialDismissed: boolean;
  hasBlockingOverlay: boolean;
}): boolean {
  const {
    level,
    mode,
    tutorialDone,
    tutorialForceActive,
    tutorialDismissed,
    hasBlockingOverlay
  } = params;
  if (hasBlockingOverlay || tutorialDismissed) return false;
  if (!isFirstStoryMission(level)) return false;
  if (mode !== 'BUILD_3D' && mode !== 'CODE_3D') return false;
  return !tutorialDone || tutorialForceActive;
}

export function countForwardMoveBlocks(program: CodeBlock[]): number {
  let count = 0;
  for (const blk of program) {
    if (blk.type === 'MOVE') {
      count += 1;
    } else if (blk.type === 'LOOP' && blk.children) {
      count += countForwardMoveBlocks(blk.children) * (blk.count || 2);
    } else if (blk.children) {
      count += countForwardMoveBlocks(blk.children);
    }
  }
  return count;
}

export function resolveMissionTutorialStep(
  ctx: MissionTutorialContext
): MissionTutorialStepDef | null {
  if (!isFirstStoryMission(ctx.level)) return null;

  const info = computeChassisInfo(ctx.chassis);

  if (ctx.mode === 'BUILD_3D') {
    if (!ctx.acknowledgedSteps.has('build_budget') && !info.hasDrive && !info.hasFrontLaser) {
      return {
        id: 'build_budget',
        phase: 'build',
        stepNumber: 1,
        totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
        title: 'Watch Your Energy Budget',
        body: 'Each robot part uses energy. Keep your total inside the budget bar as you assemble your bot.',
        actionHint: 'Tap Got it to pick your first part, or grab Wheels right away.',
        primarySelector: '[data-testid="dock-energy-meter"]',
        allowManualNext: true,
        manualNextLabel: 'Got it'
      };
    }

    if (!info.hasDrive) {
      const wheelsSelected = ctx.selectedPart === 'wheels';
      return {
        id: 'build_wheels',
        phase: 'build',
        stepNumber: 2,
        totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
        title: wheelsSelected ? 'Drop Wheels on a Bottom Pad' : 'Attach Standard Wheels',
        body: wheelsSelected
          ? 'Tap the highlighted bottom chassis pad on the robot to snap your Wheels into place.'
          : 'Drag Wheels onto a bottom chassis pad—or tap Wheels first, then tap the glowing pad.',
        actionHint: wheelsSelected ? 'Tap the highlighted robot pad' : 'Drag or tap Wheels',
        primarySelector: wheelsSelected ? '[data-slot="2,0"]' : '[data-part="wheels"]',
        secondarySelector: wheelsSelected ? undefined : '[data-slot="2,0"]',
        allowManualNext: false
      };
    }

    if (!info.hasFrontLaser) {
      const laserSelected = ctx.selectedPart === 'laser';
      return {
        id: 'build_laser',
        phase: 'build',
        stepNumber: 3,
        totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
        title: laserSelected ? 'Mount Laser on the Front Column' : 'Add the Front Laser',
        body: laserSelected
          ? 'Tap the highlighted front slot so your robot can fire its laser at the exit gate.'
          : 'Select the Laser Emitter and place it on the front-right slot to unlock the exit gate.',
        actionHint: laserSelected ? 'Tap the front-right pad' : 'Drag or tap Laser Emitter',
        primarySelector: laserSelected ? '[data-slot="1,2"]' : '[data-part="laser"]',
        secondarySelector: laserSelected ? undefined : '[data-slot="1,2"]',
        allowManualNext: false
      };
    }

    return {
      id: 'build_next_phase',
      phase: 'build',
      stepNumber: 4,
      totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
      title: 'Switch to the Code Phase',
      body: 'Your robot has wheels and a front laser! Tap the green arrow to move to the 3D track and program its route.',
      actionHint: 'Tap the green arrow button',
      primarySelector: '#toCodeBtn',
      allowManualNext: false
    };
  }

  if (ctx.mode === 'CODE_3D') {
    const moveUnits = countForwardMoveBlocks(ctx.program);
    const totalBlocks = countBlocks(ctx.program);
    const enoughMoves = moveUnits >= MISSION_1_REQUIRED_MOVES;

    if (!enoughMoves && !ctx.acknowledgedSteps.has('code_add_move')) {
      return {
        id: 'code_add_move',
        phase: 'code',
        stepNumber: 5,
        totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
        title: 'Add Move Blocks',
        body: 'Tap or drag the blue Move block into your program rail. Add 5 Move blocks to reach the exit gate and collect both crystals.',
        actionHint:
          moveUnits === 0
            ? 'Tap or drag Move into the rail'
            : `${MISSION_1_REQUIRED_MOVES - moveUnits} more Move block${MISSION_1_REQUIRED_MOVES - moveUnits === 1 ? '' : 's'} to reach the gate`,
        primarySelector: '[data-add-cmd="MOVE"]',
        secondarySelector: '[data-drop-zone="ROOT"]',
        allowManualNext: totalBlocks > 0,
        manualNextLabel: 'Next',
        progress: {
          current: Math.min(MISSION_1_REQUIRED_MOVES, moveUnits),
          target: MISSION_1_REQUIRED_MOVES,
          unit: 'Moves'
        }
      };
    }

    if (!ctx.acknowledgedSteps.has('code_rail_review')) {
      return {
        id: 'code_rail_review',
        phase: 'code',
        stepNumber: 6,
        totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
        title: 'Inspect Your Program Rail',
        body: 'Commands execute from left to right. You can drag blocks to reorder them or remove any block with its × button.',
        actionHint: 'Tap Next when ready to run',
        primarySelector: '[data-drop-zone="ROOT"]',
        allowManualNext: true,
        manualNextLabel: 'Next'
      };
    }

    return {
      id: 'code_run',
      phase: 'code',
      stepNumber: 7,
      totalSteps: TOTAL_MISSION_TUTORIAL_STEPS,
      title: 'Run Your Robot!',
      body: 'Tap the green Play button to watch your robot drive down the track—or use Step to trace one command at a time.',
      actionHint: 'Tap Play to launch Mission 1',
      primarySelector: '#runCodeBtn',
      secondarySelector: '#stepCodeBtn',
      allowManualNext: false
    };
  }

  return null;
}

export interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TutorialCardPlacement {
  left: number;
  top: number;
  width: number;
  placement: 'above' | 'below' | 'center';
}

export function computeSpotlightCardPosition(params: {
  viewportWidth: number;
  viewportHeight: number;
  primaryRect: RectBox | null;
  secondaryRect?: RectBox | null;
  cardHeight?: number;
}): TutorialCardPlacement {
  const {
    viewportWidth,
    viewportHeight,
    primaryRect,
    secondaryRect = null,
    cardHeight = 168
  } = params;

  const margin = viewportWidth < 480 ? 12 : 16;
  const topSafe = viewportWidth < 768 ? 96 : 68;
  const bottomSafe = 16;
  const cardWidth = Math.min(352, Math.max(248, viewportWidth - margin * 2));

  if (!primaryRect) {
    return {
      left: Math.round((viewportWidth - cardWidth) / 2),
      top: Math.max(topSafe, Math.round(viewportHeight * 0.2)),
      width: cardWidth,
      placement: 'center'
    };
  }

  // Merge union bounds vertically when both targets are in the same dock region
  const targetTop = primaryRect.top;
  const targetBottom = primaryRect.top + primaryRect.height;
  const targetCenterX = primaryRect.left + primaryRect.width / 2;

  const gap = 16;
  const idealAboveTop = targetTop - cardHeight - gap;
  const idealBelowTop = targetBottom + gap;

  // Avoid colliding with secondaryRect (e.g., 3D chassis slot near middle of screen)
  const overlapsSecondary = (candidateTop: number): boolean => {
    if (!secondaryRect) return false;
    const cBottom = candidateTop + cardHeight;
    const sTop = secondaryRect.top - 12;
    const sBottom = secondaryRect.top + secondaryRect.height + 12;
    return candidateTop < sBottom && cBottom > sTop;
  };

  let top: number;
  let placement: 'above' | 'below' | 'center';

  const canPlaceBelow = idealBelowTop + cardHeight <= viewportHeight - bottomSafe;
  const canPlaceAbove = idealAboveTop >= topSafe;

  // If the primary target is in the lower half (dock buttons/parts/blocks), prefer placing above—
  // unless secondary target sits directly above (like 3D chassis slot), in which case tuck cleanly near topSafe!
  if (targetTop > viewportHeight * 0.48) {
    if (canPlaceAbove && !overlapsSecondary(idealAboveTop)) {
      top = idealAboveTop;
      placement = 'above';
    } else if (!overlapsSecondary(topSafe)) {
      top = topSafe;
      placement = 'above';
    } else if (canPlaceAbove) {
      top = topSafe;
      placement = 'above';
    } else {
      top = Math.max(topSafe, Math.min(viewportHeight - cardHeight - bottomSafe, idealAboveTop));
      placement = 'above';
    }
  } else {
    // Primary target is upper/middle screen (e.g., 3D chassis slot) -> prefer topSafe or below without colliding with bottom dock
    if (!overlapsSecondary(topSafe) && topSafe + cardHeight + 12 <= targetTop) {
      top = topSafe;
      placement = 'above';
    } else if (canPlaceBelow && !overlapsSecondary(idealBelowTop)) {
      top = idealBelowTop;
      placement = 'below';
    } else {
      top = topSafe;
      placement = 'above';
    }
  }

  const clampedTop = Math.max(
    topSafe,
    Math.min(viewportHeight - cardHeight - bottomSafe, Math.round(top))
  );
  const rawLeft = targetCenterX - cardWidth / 2;
  const clampedLeft = Math.max(
    margin,
    Math.min(viewportWidth - cardWidth - margin, Math.round(rawLeft))
  );

  return {
    left: clampedLeft,
    top: clampedTop,
    width: cardWidth,
    placement
  };
}
