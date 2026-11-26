import type {
  ChassisGrid,
  CodeBlock,
  LevelDef,
  SimResult
} from './types';
import { levelHasDynamicHazards } from './hazards';
import { simulateProgram } from './simulator';

export type PredictQuestionKind = 'landing_tile' | 'branch_trace' | 'hazard_timing' | 'function_reuse';

export interface PredictQuizOption {
  id: string;
  label: string;
  detail?: string;
}

export interface PredictQuizQuestion {
  id: string;
  levelId: number;
  kind: PredictQuestionKind;
  badgeLabel: string;
  prompt: string;
  helperText: string;
  options: PredictQuizOption[];
  correctOptionId: string;
  explanation: string;
}

function uniqueSortedNumbers(nums: number[], minVal: number, maxVal: number): number[] {
  const set = new Set<number>();
  for (const n of nums) {
    const clamped = Math.max(minVal, Math.min(maxVal, Math.round(n)));
    set.add(clamped);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function findBlockByIdInTrees(
  targetId: string,
  program: CodeBlock[],
  functionBody: CodeBlock[]
): CodeBlock | null {
  const walk = (list: CodeBlock[]): CodeBlock | null => {
    for (const blk of list) {
      if (blk.id === targetId) return blk;
      if (blk.children?.length) {
        const hit = walk(blk.children);
        if (hit) return hit;
      }
      if (blk.elseChildren?.length) {
        const hitElse = walk(blk.elseChildren);
        if (hitElse) return hitElse;
      }
    }
    return null;
  };
  return walk(program) || walk(functionBody);
}

/**
 * Deterministically builds an age-appropriate Predict-Before-Run ("Brain Spark")
 * multiple-choice question derived directly from the player's current program & simulation,
 * guaranteeing that the verified answer always matches the real 3D execution.
 */
export function buildPredictBeforeRunQuestion(params: {
  level: LevelDef;
  chassis: ChassisGrid;
  program: CodeBlock[];
  functionBody?: CodeBlock[];
  simResult?: SimResult;
}): PredictQuizQuestion | null {
  const { level, chassis, program, functionBody = [] } = params;
  const sim = params.simResult ?? simulateProgram(level, chassis, program, functionBody);

  if (
    !sim ||
    sim.events.length === 0 ||
    sim.failCode === 'empty' ||
    sim.failCode === 'empty_container' ||
    sim.failCode === 'empty_function' ||
    (sim.failCode === 'missing_part' && sim.finalPos === 0)
  ) {
    return null;
  }

  const gateIndex = Math.max(1, level.track.length - 1);
  const hasHazards = levelHasDynamicHazards(level);

  // Priority 1 (Chapter 4 · Ages 9-12): Moving Hazard Timing Prediction
  if (hasHazards) {
    const hazardFailEv = sim.events.find((ev) => ev.hazardId);
    const waitEv = sim.events.find((ev) => ev.action === 'WAIT');
    const firstScanHazard = sim.events.find(
      (ev) => ev.action === 'SCAN' && ev.condition === 'HAZARD'
    );

    if (firstScanHazard && firstScanHazard.scanTile !== undefined) {
      const scanTile = firstScanHazard.scanTile;
      const stepNum = Math.max(1, (firstScanHazard.tick ?? 0) + 1);
      const matched = Boolean(firstScanHazard.scanMatch);
      const scannedBlock = findBlockByIdInTrees(firstScanHazard.blockId, program, functionBody);
      const hasElse =
        firstScanHazard.branchTaken === 'else' ||
        Boolean(scannedBlock?.elseChildren && scannedBlock.elseChildren.length > 0);
      const correctId = matched ? 'blocked' : 'clear';
      return {
        id: `pred_haz_${level.id}_${scanTile}_${stepNum}`,
        levelId: level.id,
        kind: 'hazard_timing',
        badgeLabel: 'Timing Check',
        prompt: `On Step ${stepNum} ahead at Tile ${scanTile}, will the moving hazard block SparkBot?`,
        helperText: 'Check the sensor scan and hazard beat before pressing Run.',
        options: [
          {
            id: 'blocked',
            label: 'BLOCKED (Run THEN)',
            detail: 'Hazard is active on Tile ' + scanTile
          },
          {
            id: 'clear',
            label: hasElse ? 'CLEAR (Run ELSE)' : 'CLEAR (Skip IF)',
            detail: 'Path is open on Tile ' + scanTile
          }
        ],
        correctOptionId: correctId,
        explanation: matched
          ? `Spot on! At Step ${stepNum}, the hazard blocks Tile ${scanTile}, so SparkBot enters the IF [HAZARD] branch.`
          : `Nice trace! At Step ${stepNum}, Tile ${scanTile} is clear, so SparkBot takes the ${hasElse ? 'ELSE branch' : 'open path'}.`
      };
    }

    if (hazardFailEv || waitEv) {
      const targetEv = hazardFailEv || waitEv!;
      const reachedGate = sim.status === 'win';
      const correctId = reachedGate ? 'win' : sim.failCode === 'laser_gate' || sim.failCode === 'patrol_drone' ? 'hazard' : 'short';
      return {
        id: `pred_run_haz_${level.id}_${sim.finalPos}_${sim.events.length}`,
        levelId: level.id,
        kind: 'hazard_timing',
        badgeLabel: 'Hazard Forecast',
        prompt: 'How will SparkBot handle the moving hazards on this run?',
        helperText: `Program runs ${sim.events.filter((e) => e.action !== 'SCAN').length} timed steps.`,
        options: [
          { id: 'win', label: 'Clears all hazards to the Gate', detail: `Reaches Tile ${gateIndex}` },
          { id: 'hazard', label: 'Blocked by a Laser or Drone', detail: `Hits hazard near Tile ${targetEv.toPos}` },
          { id: 'short', label: 'Stays safe, stops before Gate', detail: 'Needs more steps or parts' }
        ],
        correctOptionId: correctId,
        explanation:
          correctId === 'win'
            ? 'Great timing! Every laser beat and patrol drone lines up cleanly to the gate.'
            : correctId === 'hazard'
              ? `Watch Step ${targetEv.tick ?? 1}! A moving hazard occupies Tile ${targetEv.toPos} right as SparkBot arrives.`
              : `SparkBot dodges safely and stops at Tile ${sim.finalPos}.`
      };
    }
  }

  // Priority 2 (Chapters 3-4 · Ages 8-12): IF / ELSE Branch Trace
  const firstScan = sim.events.find((ev) => ev.action === 'SCAN');
  if (firstScan && firstScan.condition) {
    const atTile = firstScan.fromPos;
    const scanTile = firstScan.scanTile ?? Math.min(atTile + 1, gateIndex);
    const tileTypeAhead = level.track[scanTile]?.type?.toUpperCase() || 'NORMAL';
    const branch = firstScan.branchTaken || (firstScan.scanMatch ? 'then' : 'skip');
    const correctId = branch === 'then' ? 'then' : branch === 'else' ? 'else' : 'skip';
    const hasElseOption = branch === 'else' || Boolean(level.elseUnlocked);

    const options: PredictQuizOption[] = [
      { id: 'then', label: 'THEN branch runs', detail: `Sensor sees ${firstScan.condition}` },
      hasElseOption
        ? { id: 'else', label: 'ELSE branch runs', detail: `Sensor does not see ${firstScan.condition}` }
        : { id: 'skip', label: 'Skips IF block', detail: `Sensor sees ${tileTypeAhead}, not ${firstScan.condition}` }
    ];
    if (hasElseOption && correctId === 'skip') {
      options.push({ id: 'skip', label: 'Skips (no ELSE blocks)', detail: 'Condition is false' });
    }

    return {
      id: `pred_branch_${level.id}_${atTile}_${firstScan.condition}`,
      levelId: level.id,
      kind: 'branch_trace',
      badgeLabel: 'Branch Trace',
      prompt: `At Tile ${atTile}, SparkBot checks IF [${firstScan.condition}] on Tile ${scanTile}. What happens?`,
      helperText: 'Peek at Tile ' + scanTile + ' on the 3D track to trace the sensor!',
      options,
      correctOptionId: correctId,
      explanation:
        correctId === 'then'
          ? `Correct! Tile ${scanTile} matches ${firstScan.condition}, so the THEN lane runs.`
          : correctId === 'else'
            ? `Correct! Tile ${scanTile} is not ${firstScan.condition}, so SparkBot switches to the ELSE lane.`
            : `Correct! Tile ${scanTile} is ${tileTypeAhead}, so SparkBot safely skips the IF block.`
    };
  }

  // Priority 3 (Chapter 4): MY BLOCK Function Reuse Trace
  if (sim.usedFunctionCall && functionBody.length > 0) {
    const actionCount = sim.events.filter((e) => e.action !== 'SCAN').length;
    const reachedGate = sim.status === 'win';
    const correctTile = sim.finalPos;
    const distractors = uniqueSortedNumbers(
      [correctTile, Math.max(1, correctTile - 2), Math.min(gateIndex, correctTile + 2), Math.max(1, Math.floor(gateIndex / 2))],
      1,
      gateIndex
    );
    const picks = [correctTile];
    for (const d of distractors) {
      if (picks.length >= 3) break;
      if (!picks.includes(d)) picks.push(d);
    }
    picks.sort((a, b) => a - b);

    return {
      id: `pred_fn_${level.id}_${correctTile}_${actionCount}`,
      levelId: level.id,
      kind: 'function_reuse',
      badgeLabel: 'MY BLOCK Trace',
      prompt: 'After running MY BLOCK, which tile will SparkBot reach?',
      helperText: `MY BLOCK executes ${functionBody.length} reusable step${functionBody.length === 1 ? '' : 's'} each time it is called.`,
      options: picks.map((tile) => ({
        id: `tile_${tile}`,
        label: tile === gateIndex ? `Tile ${tile} (Gate!)` : `Tile ${tile}`,
        detail: tile === gateIndex ? 'Finish gate' : level.track[tile]?.type || 'track'
      })),
      correctOptionId: `tile_${correctTile}`,
      explanation: reachedGate
        ? `Awesome! Your MY BLOCK routine carries SparkBot cleanly to the Gate at Tile ${gateIndex}!`
        : `Good check! Your MY BLOCK program brings SparkBot to Tile ${correctTile}.`
    };
  }

  // Priority 4 (Chapters 1-2 · Ages 6-9): Visual Landing Tile Check
  const correctTile = sim.finalPos;
  const candidateTiles = uniqueSortedNumbers(
    [
      correctTile,
      correctTile === gateIndex ? Math.max(1, gateIndex - 2) : gateIndex,
      Math.max(1, correctTile - 1),
      Math.min(gateIndex, correctTile + 1),
      Math.max(1, correctTile - 2)
    ],
    1,
    gateIndex
  );
  const picks = [correctTile];
  for (const t of candidateTiles) {
    if (picks.length >= 3) break;
    if (!picks.includes(t)) picks.push(t);
  }
  picks.sort((a, b) => a - b);

  return {
    id: `pred_land_${level.id}_${correctTile}_${sim.events.length}`,
    levelId: level.id,
    kind: 'landing_tile',
    badgeLabel: 'Predict-Before-Run',
    prompt: 'Before SparkBot rolls — which tile will your code reach?',
    helperText: 'Count MOVE (+1), JUMP (+2), and BOOST (+3) along the 3D runway.',
    options: picks.map((tile) => ({
      id: `tile_${tile}`,
      label: tile === gateIndex ? `Tile ${tile} · Gate!` : `Tile ${tile}`,
      detail:
        tile === gateIndex
          ? 'Laser Gate'
          : level.track[tile]?.type === 'gap'
            ? 'Gap'
            : level.track[tile]?.type === 'mud'
              ? 'Mud'
              : level.track[tile]?.type === 'ramp'
                ? 'Ramp'
                : 'Track tile'
    })),
    correctOptionId: `tile_${correctTile}`,
    explanation:
      sim.status === 'win'
        ? `Bingo! Your code lands right at the Gate (Tile ${gateIndex})!`
        : `SparkBot reaches Tile ${correctTile}${sim.failReason ? ` — ${sim.failReason}` : '.'}`
  };
}

export function shouldPromptPredictQuiz(params: {
  enabled: boolean;
  level: LevelDef;
  alreadyPromptedLevelKey: string | null;
  levelKey: string;
}): boolean {
  if (!params.enabled) return false;
  // Keep Level 1 frictionless for 6-year-old first-time tutorial; engage from Level 2+
  if (params.level.id === 1 && !params.level.isDaily && !params.level.isSandbox) {
    return false;
  }
  return params.alreadyPromptedLevelKey !== params.levelKey;
}
