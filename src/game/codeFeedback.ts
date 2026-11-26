import type { CodeBlock, SensorCondition } from './engine';
import { collectAncestorBlockIds, countBlocks } from './engine';
import type { BotMood } from '../three/robotRig';
import type { RobotEmoteKind, RobotVoiceMood, WallEPhraseId } from './robotVoice';

export type CodeComplexityTier = 'simple' | 'dynamic' | 'loop' | 'conditional' | 'nested';

/**
 * Tiered complexity scale used by CodeDock to evaluate logic architecture
 * and drive subtle drop-zone color-shifting visual feedback.
 */
export type LogicComplexityTier = 'tier1_linear' | 'tier2_structured' | 'tier3_nested';

export type LogicPathOptimality = 'idle' | 'optimal' | 'balanced' | 'suboptimal';

export type LogicPathReason =
  | 'empty'
  | 'within_par_structured'
  | 'within_par_clean'
  | 'near_par'
  | 'over_par'
  | 'redundant_sequence'
  | 'empty_container'
  | 'redundant_nesting'
  | 'deep_nesting';

export interface BlockTierClassification {
  tierRank: 1 | 2 | 3;
  complexityTier: LogicComplexityTier;
  weight: number;
}

export interface DropZoneFeedbackState {
  zoneId: string;
  tierRank: 1 | 2 | 3;
  complexityTier: LogicComplexityTier;
  optimality: LogicPathOptimality;
  reason: LogicPathReason;
  hint: string;
  isPreview?: boolean;
}

export interface ProgramTierOptions {
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked: boolean;
}

export interface ProgramTierEvaluation {
  tierRank: 1 | 2 | 3;
  complexityTier: LogicComplexityTier;
  tierLabel: string;
  complexityScore: number;
  maxNestingDepth: number;
  totalBlocks: number;
  optimality: LogicPathOptimality;
  reason: LogicPathReason;
  hint: string;
  zoneStates: Record<string, DropZoneFeedbackState>;
}

export interface DropPreviewCandidate {
  kind: 'new' | 'existing';
  type: CodeBlock['type'];
  condition?: SensorCondition;
  blockId?: string;
  targetZoneId: string;
}

export interface CodeBlockFeedback {
  tier: CodeComplexityTier;
  /** Tiered complexity rank (1 = Linear, 2 = Structured, 3 = Nested) */
  tierRank: 1 | 2 | 3;
  complexityTier: LogicComplexityTier;
  /** Uses the robot's existing BotMood state machine */
  mood: BotMood;
  /** Animation duration in seconds */
  duration: number;
  /** Primary 3D sparkle hex color */
  sparkColorHex: number;
  /** Secondary pastel 3D puff hex color */
  puffColorHex: number;
  /** Number of 3D sparkles spawned */
  sparkCount: number;
  /** Number of soft 3D puffs spawned */
  puffCount: number;
  /** Optional WALL-E vocal reaction for higher-complexity blocks */
  voicePhrase: WallEPhraseId | null;
  voiceMood: RobotVoiceMood;
  voiceEmote: RobotEmoteKind;
  voiceSyllables: number;
  voiceAriaLabel: string;
  accentCss: string;
}

export interface MagneticRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface MagneticSnapResult {
  engaged: boolean;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  pullFactor: number;
  scale: number;
}

/**
 * Returns true if `candidateId` is `ancestorId` itself or nested anywhere inside it.
 */
export function isDescendantBlockId(
  program: CodeBlock[],
  ancestorId: string | undefined,
  candidateId: string | null | undefined
): boolean {
  if (!ancestorId || !candidateId) return false;
  const baseCandidate = candidateId.endsWith(':else')
    ? candidateId.slice(0, -5)
    : candidateId;
  if (ancestorId === baseCandidate) return true;
  const ancestors = collectAncestorBlockIds(program, baseCandidate);
  return ancestors.includes(ancestorId);
}

/**
 * Computes the ideal snap anchor point inside a drop-zone slot (center when empty,
 * or immediately trailing the last placed block when populated).
 */
export function computeSlotAnchorPoint(
  slotRect: MagneticRect,
  lastChildRect: MagneticRect | null = null,
  blockSize = 44
): { x: number; y: number } {
  const centerY = slotRect.top + slotRect.height / 2;
  if (!lastChildRect) {
    return {
      x: slotRect.left + slotRect.width / 2,
      y: centerY
    };
  }
  const half = blockSize / 2;
  const minX = slotRect.left + half + 4;
  const maxX = Math.max(minX, slotRect.right - half - 4);
  const trailingX = lastChildRect.right + half + 6;
  return {
    x: Math.max(minX, Math.min(maxX, trailingX)),
    y: centerY
  };
}

/**
 * Applies a subtle elastic magnetic pull toward a valid CodeDock drop slot and
 * returns a gentle scale-up factor when magnetically engaged over a valid target.
 */
export function computeMagneticDragPosition(
  pointerX: number,
  pointerY: number,
  slotRect: MagneticRect | null,
  lastChildRect: MagneticRect | null = null,
  options?: {
    proximityMargin?: number;
    maxPull?: number;
    maxOffsetPx?: number;
    engagedScale?: number;
  }
): MagneticSnapResult {
  if (!slotRect || slotRect.width <= 0 || slotRect.height <= 0) {
    return {
      engaged: false,
      x: pointerX,
      y: pointerY,
      anchorX: pointerX,
      anchorY: pointerY,
      pullFactor: 0,
      scale: 1
    };
  }

  const proximityMargin = options?.proximityMargin ?? 22;
  const maxPull = options?.maxPull ?? 0.38;
  const maxOffsetPx = options?.maxOffsetPx ?? 24;
  const engagedScale = options?.engagedScale ?? 1.07;

  const dxEdge = Math.max(slotRect.left - pointerX, 0, pointerX - slotRect.right);
  const dyEdge = Math.max(slotRect.top - pointerY, 0, pointerY - slotRect.bottom);
  const edgeDist = Math.hypot(dxEdge, dyEdge);

  if (edgeDist > proximityMargin) {
    return {
      engaged: false,
      x: pointerX,
      y: pointerY,
      anchorX: pointerX,
      anchorY: pointerY,
      pullFactor: 0,
      scale: 1
    };
  }

  const anchor = computeSlotAnchorPoint(slotRect, lastChildRect);
  const edgeT = proximityMargin > 0 ? Math.max(0, 1 - edgeDist / proximityMargin) : 1;
  const ease = edgeT * edgeT;
  const pullFactor = Number((maxPull * ease).toFixed(4));

  const rawDx = (anchor.x - pointerX) * pullFactor;
  const rawDy = (anchor.y - pointerY) * pullFactor;
  const offsetDist = Math.hypot(rawDx, rawDy);
  const clampRatio = offsetDist > maxOffsetPx && offsetDist > 0 ? maxOffsetPx / offsetDist : 1;

  const x = pointerX + rawDx * clampRatio;
  const y = pointerY + rawDy * clampRatio;
  const scale = Number((1 + (engagedScale - 1) * (0.45 + 0.55 * ease)).toFixed(4));

  return {
    engaged: true,
    x,
    y,
    anchorX: anchor.x,
    anchorY: anchor.y,
    pullFactor,
    scale
  };
}

/**
 * Computes how deeply nested a block is inside LOOP / IF containers (0 = root level).
 */
export function computeBlockNestingDepth(program: CodeBlock[], blockId: string | null): number {
  if (!blockId || !Array.isArray(program)) return 0;
  return collectAncestorBlockIds(program, blockId).length;
}

/**
 * Classifies an individual block and its nesting depth into the 3-tier complexity scale:
 * - Tier 1 (Linear): root-level MOVE / JUMP / BOOST
 * - Tier 2 (Structured): root-level LOOP / IF or simple action inside a single container
 * - Tier 3 (Nested): compound control nesting (LOOP/IF inside LOOP/IF or depth >= 2)
 */
export function classifyBlockComplexityTier(
  blockType: CodeBlock['type'],
  nestingDepth: number
): BlockTierClassification {
  const depth = Math.max(0, Math.floor(nestingDepth));
  const isControl = blockType === 'LOOP' || blockType === 'IF' || blockType === 'CALL_FUNC';

  if (depth >= 2 || (depth >= 1 && isControl)) {
    return {
      tierRank: 3,
      complexityTier: 'tier3_nested',
      weight: isControl ? 5 : 4
    };
  }
  if (isControl || depth >= 1) {
    return {
      tierRank: 2,
      complexityTier: 'tier2_structured',
      weight: isControl ? 3 : 2
    };
  }
  return {
    tierRank: 1,
    complexityTier: 'tier1_linear',
    weight: blockType === 'MOVE' || blockType === 'WAIT' ? 1 : 2
  };
}

/**
 * Detects runs of 3+ identical consecutive non-container blocks (e.g. MOVE, MOVE, MOVE)
 * when LOOP is unlocked, signaling a sub-optimal unrolled linear sequence.
 */
function hasRedundantLinearRun(list: CodeBlock[], loopUnlocked: boolean): boolean {
  if (!loopUnlocked || list.length < 3) return false;
  let runType: CodeBlock['type'] | null = null;
  let runCount = 0;
  for (const blk of list) {
    if (blk.type === 'MOVE' || blk.type === 'JUMP' || blk.type === 'BOOST') {
      if (blk.type === runType) {
        runCount++;
        if (runCount >= 3) return true;
      } else {
        runType = blk.type;
        runCount = 1;
      }
    } else {
      runType = null;
      runCount = 0;
    }
  }
  return false;
}

function hasIdenticalNestedCondition(parent: CodeBlock): boolean {
  if (parent.type !== 'IF' || !parent.condition || !parent.children) return false;
  return parent.children.some((ch) => ch.type === 'IF' && ch.condition === parent.condition);
}

function tierRankToMeta(rank: 1 | 2 | 3): { complexityTier: LogicComplexityTier; tierLabel: string } {
  if (rank === 3) return { complexityTier: 'tier3_nested', tierLabel: 'T3 · Nested' };
  if (rank === 2) return { complexityTier: 'tier2_structured', tierLabel: 'T2 · Structured' };
  return { complexityTier: 'tier1_linear', tierLabel: 'T1 · Linear' };
}

/**
 * Evaluates a CodeDock program into the Tiered complexity model and computes
 * optimal vs. sub-optimal logic path status for both ROOT and every container drop zone.
 */
export function evaluateProgramLogicTiers(
  program: CodeBlock[],
  options: ProgramTierOptions
): ProgramTierEvaluation {
  const safePar = Math.max(1, options.parBlocks);
  const totalBlocks = countBlocks(program);
  const zoneStates: Record<string, DropZoneFeedbackState> = {};

  if (totalBlocks === 0) {
    zoneStates.ROOT = {
      zoneId: 'ROOT',
      tierRank: 1,
      complexityTier: 'tier1_linear',
      optimality: 'idle',
      reason: 'empty',
      hint: 'Drop blocks'
    };
    return {
      tierRank: 1,
      complexityTier: 'tier1_linear',
      tierLabel: 'T1 · Linear',
      complexityScore: 0,
      maxNestingDepth: 0,
      totalBlocks: 0,
      optimality: 'idle',
      reason: 'empty',
      hint: 'Drop blocks',
      zoneStates
    };
  }

  const stats: {
    complexityScore: number;
    maxRank: 1 | 2 | 3;
    maxNestingDepth: number;
    hasEmptyContainer: boolean;
    hasRedundantNesting: boolean;
    hasDeepNesting: boolean;
    hasStructuredControl: boolean;
  } = {
    complexityScore: 0,
    maxRank: 1,
    maxNestingDepth: 0,
    hasEmptyContainer: false,
    hasRedundantNesting: false,
    hasDeepNesting: false,
    hasStructuredControl: false
  };

  const walk = (list: CodeBlock[], depth: number) => {
    for (const blk of list) {
      if (depth > stats.maxNestingDepth) stats.maxNestingDepth = depth;
      const cls = classifyBlockComplexityTier(blk.type, depth);
      stats.complexityScore += cls.weight;
      if (cls.tierRank > stats.maxRank) stats.maxRank = cls.tierRank;

      if (blk.type === 'LOOP' || blk.type === 'IF') {
        stats.hasStructuredControl = true;
        const children = blk.children || [];
        const childDepth = depth + 1;
        const containerEmpty = children.length === 0;
        const redundantIf = hasIdenticalNestedCondition(blk);
        const tooDeep = childDepth >= 3;
        const redundantInnerRun = hasRedundantLinearRun(children, options.loopUnlocked);

        if (containerEmpty) stats.hasEmptyContainer = true;
        if (redundantIf) stats.hasRedundantNesting = true;
        if (tooDeep) stats.hasDeepNesting = true;

        let zoneOptimality: LogicPathOptimality;
        let zoneReason: LogicPathReason;
        let zoneHint: string;

        if (containerEmpty) {
          zoneOptimality = 'suboptimal';
          zoneReason = 'empty_container';
          zoneHint = 'Add block inside';
        } else if (redundantIf) {
          zoneOptimality = 'suboptimal';
          zoneReason = 'redundant_nesting';
          zoneHint = 'Duplicate check';
        } else if (tooDeep) {
          zoneOptimality = 'suboptimal';
          zoneReason = 'deep_nesting';
          zoneHint = 'Too deeply nested';
        } else if (redundantInnerRun) {
          zoneOptimality = 'suboptimal';
          zoneReason = 'redundant_sequence';
          zoneHint = 'Compress repeat';
        } else if (totalBlocks > safePar + 1) {
          zoneOptimality = 'suboptimal';
          zoneReason = 'over_par';
          zoneHint = 'Over par';
        } else if (totalBlocks <= safePar) {
          zoneOptimality = 'optimal';
          zoneReason = 'within_par_structured';
          zoneHint = childDepth >= 2 ? 'Compound optimal' : 'Optimal structure';
        } else {
          zoneOptimality = 'balanced';
          zoneReason = 'near_par';
          zoneHint = 'Trim 1 block';
        }

        const zoneTierRank: 1 | 2 | 3 =
          childDepth >= 2 || children.some((c) => c.type === 'LOOP' || c.type === 'IF') ? 3 : 2;
        const zoneMeta = tierRankToMeta(zoneTierRank);

        zoneStates[blk.id] = {
          zoneId: blk.id,
          tierRank: zoneTierRank,
          complexityTier: zoneMeta.complexityTier,
          optimality: zoneOptimality,
          reason: zoneReason,
          hint: zoneHint
        };

        if (children.length > 0) {
          walk(children, childDepth);
        }
        if (blk.type === 'IF' && blk.elseChildren && blk.elseChildren.length > 0) {
          zoneStates[`${blk.id}:else`] = {
            zoneId: `${blk.id}:else`,
            tierRank: Math.min(3, Math.max(2, childDepth + 1)) as 1 | 2 | 3,
            complexityTier: childDepth >= 2 ? 'tier3_nested' : 'tier2_structured',
            optimality: totalBlocks <= safePar ? 'optimal' : 'balanced',
            reason: totalBlocks <= safePar ? 'within_par_structured' : 'near_par',
            hint: 'ELSE branch'
          };
          walk(blk.elseChildren, childDepth);
        }
      }
    }
  };

  walk(program, 0);

  const rootRedundantRun = hasRedundantLinearRun(program, options.loopUnlocked);
  const overParHard =
    totalBlocks > safePar + 1 || (totalBlocks > safePar && options.loopUnlocked && !stats.hasStructuredControl);
  const nearPar = totalBlocks === safePar + 1;

  let optimality: LogicPathOptimality;
  let reason: LogicPathReason;
  let hint: string;

  if (stats.hasEmptyContainer) {
    optimality = 'suboptimal';
    reason = 'empty_container';
    hint = 'Fill container';
  } else if (stats.hasRedundantNesting) {
    optimality = 'suboptimal';
    reason = 'redundant_nesting';
    hint = 'Duplicate IF';
  } else if (stats.hasDeepNesting) {
    optimality = 'suboptimal';
    reason = 'deep_nesting';
    hint = 'Simplify nesting';
  } else if (rootRedundantRun) {
    optimality = 'suboptimal';
    reason = 'redundant_sequence';
    hint = 'Use LOOP';
  } else if (overParHard) {
    optimality = 'suboptimal';
    reason = 'over_par';
    hint = 'Over par';
  } else if (nearPar) {
    optimality = 'balanced';
    reason = 'near_par';
    hint = 'Near par';
  } else if (stats.hasStructuredControl || stats.maxRank >= 2) {
    optimality = 'optimal';
    reason = 'within_par_structured';
    hint = stats.maxRank === 3 ? 'Optimal nested' : 'Optimal path';
  } else {
    // Clean linear sequence within par (optimal if loop not needed, balanced if close to unrolled)
    optimality = totalBlocks <= safePar ? 'optimal' : 'balanced';
    reason = 'within_par_clean';
    hint = 'Clean path';
  }

  const rootMeta = tierRankToMeta(stats.maxRank);
  zoneStates.ROOT = {
    zoneId: 'ROOT',
    tierRank: stats.maxRank,
    complexityTier: rootMeta.complexityTier,
    optimality,
    reason,
    hint
  };

  return {
    tierRank: stats.maxRank,
    complexityTier: rootMeta.complexityTier,
    tierLabel: rootMeta.tierLabel,
    complexityScore: stats.complexityScore,
    maxNestingDepth: stats.maxNestingDepth,
    totalBlocks,
    optimality,
    reason,
    hint,
    zoneStates
  };
}

function removeBlockForPreview(list: CodeBlock[], targetId: string): { next: CodeBlock[]; removed: CodeBlock | null } {
  let removed: CodeBlock | null = null;
  const next: CodeBlock[] = [];
  for (const item of list) {
    if (item.id === targetId) {
      removed = item;
      continue;
    }
    let nextItem = item;
    if (item.children) {
      const sub = removeBlockForPreview(item.children, targetId);
      if (sub.removed) removed = sub.removed;
      nextItem = { ...nextItem, children: sub.next };
    }
    if (item.elseChildren) {
      const subElse = removeBlockForPreview(item.elseChildren, targetId);
      if (subElse.removed) removed = subElse.removed;
      nextItem = { ...nextItem, elseChildren: subElse.next };
    }
    next.push(nextItem);
  }
  return { next, removed };
}

function insertBlockForPreview(list: CodeBlock[], containerId: string | null, blk: CodeBlock): CodeBlock[] {
  if (!containerId) return [...list, blk];
  const isElseZone = containerId.endsWith(':else');
  const baseId = isElseZone ? containerId.slice(0, -5) : containerId;
  return list.map((item) => {
    if (item.id === baseId) {
      if (isElseZone && item.type === 'IF') {
        return { ...item, elseChildren: [...(item.elseChildren || []), blk] };
      }
      return { ...item, children: [...(item.children || []), blk] };
    }
    let nextItem = item;
    if (item.children) {
      nextItem = { ...nextItem, children: insertBlockForPreview(item.children, containerId, blk) };
    }
    if (item.elseChildren) {
      nextItem = { ...nextItem, elseChildren: insertBlockForPreview(item.elseChildren, containerId, blk) };
    }
    return nextItem;
  });
}

/**
 * Predicts the resulting DropZoneFeedbackState if a dragged block is dropped into `targetZoneId`,
 * enabling live optimal vs. sub-optimal color-shifting previews before release.
 */
export function previewDropTargetOptimality(
  program: CodeBlock[],
  options: ProgramTierOptions,
  candidate: DropPreviewCandidate
): DropZoneFeedbackState | null {
  if (!candidate.targetZoneId || candidate.targetZoneId === 'TRASH') return null;
  if (candidate.kind === 'existing' && candidate.blockId === candidate.targetZoneId) return null;

  let baseProgram = program;
  let blockToInsert: CodeBlock;

  if (candidate.kind === 'existing' && candidate.blockId) {
    const { next, removed } = removeBlockForPreview(program, candidate.blockId);
    if (!removed) return null;
    baseProgram = next;
    blockToInsert = removed;
  } else {
    const previewId = '__drop_preview__';
    if (candidate.type === 'LOOP') {
      blockToInsert = { id: previewId, type: 'LOOP', count: 2, children: [] };
    } else if (candidate.type === 'IF') {
      blockToInsert = { id: previewId, type: 'IF', condition: candidate.condition || 'GAP', children: [] };
    } else {
      blockToInsert = { id: previewId, type: candidate.type };
    }
  }

  const targetContainer = candidate.targetZoneId === 'ROOT' ? null : candidate.targetZoneId;
  const projectedProgram = insertBlockForPreview(baseProgram, targetContainer, blockToInsert);
  const projectedEval = evaluateProgramLogicTiers(projectedProgram, options);
  const zoneState = projectedEval.zoneStates[candidate.targetZoneId] || projectedEval.zoneStates.ROOT;
  if (!zoneState) return null;

  return {
    ...zoneState,
    isPreview: true
  };
}

/**
 * Maps a placed code block and its nesting depth to a context-specific 3D animation
 * profile backed by the robot's existing BotMood state logic.
 */
export function classifyCodeBlockFeedback(
  blockType: CodeBlock['type'],
  nestingDepth: number,
  condition?: SensorCondition
): CodeBlockFeedback {
  const depth = Math.max(0, Math.floor(nestingDepth));
  const tierInfo = classifyBlockComplexityTier(blockType, depth);

  // Nested logic (placing any instruction or nested control block inside LOOP / IF)
  if (depth >= 1) {
    const isDeepCompound = depth >= 2 || blockType === 'IF' || blockType === 'LOOP';
    return {
      tier: 'nested',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: 'happy',
      duration: isDeepCompound ? 1.65 : 1.35,
      sparkColorHex: isDeepCompound ? 0x34d399 : 0xfde047,
      puffColorHex: isDeepCompound ? 0xa7f3d0 : 0xfef08a,
      sparkCount: isDeepCompound ? 18 : 12,
      puffCount: isDeepCompound ? 6 : 4,
      voicePhrase: isDeepCompound ? 'celebrate' : 'proud',
      voiceMood: isDeepCompound ? 'excited' : 'proud',
      voiceEmote: isDeepCompound ? 'celebrate' : 'stars',
      voiceSyllables: isDeepCompound ? 3 : 2,
      voiceAriaLabel: 'Robot celebrates nested code logic',
      accentCss: isDeepCompound ? '#34d399' : '#fbbf24'
    };
  }

  // Conditional sensor logic: IF [GAP / MUD / RAMP / HAZARD]
  if (blockType === 'IF') {
    const condColor =
      condition === 'MUD'
        ? 0xf59e0b
        : condition === 'RAMP'
          ? 0xf472b6
          : condition === 'HAZARD'
            ? 0xfb7185
            : 0x22d3ee;
    const condCss =
      condition === 'MUD'
        ? '#f59e0b'
        : condition === 'RAMP'
          ? '#f472b6'
          : condition === 'HAZARD'
            ? '#fb7185'
            : '#22d3ee';
    return {
      tier: 'conditional',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: 'scan',
      duration: 1.25,
      sparkColorHex: condColor,
      puffColorHex: 0xddd6fe,
      sparkCount: 10,
      puffCount: 4,
      voicePhrase: 'curious',
      voiceMood: 'playful',
      voiceEmote: 'curious',
      voiceSyllables: 2,
      voiceAriaLabel: 'Robot scans sensor condition',
      accentCss: condCss
    };
  }

  // Reusable subroutine call: MY BLOCK
  if (blockType === 'CALL_FUNC') {
    return {
      tier: 'loop',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: 'happy',
      duration: 1.2,
      sparkColorHex: 0xe879f9,
      puffColorHex: 0xf5d0fe,
      sparkCount: 12,
      puffCount: 4,
      voicePhrase: 'proud',
      voiceMood: 'proud',
      voiceEmote: 'stars',
      voiceSyllables: 2,
      voiceAriaLabel: 'Robot triggers reusable subroutine block',
      accentCss: '#e879f9'
    };
  }

  // Timed pause block: WAIT
  if (blockType === 'WAIT') {
    return {
      tier: 'simple',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: 'scan',
      duration: 0.82,
      sparkColorHex: 0x22d3ee,
      puffColorHex: 0xcffafe,
      sparkCount: 8,
      puffCount: 2,
      voicePhrase: null,
      voiceMood: 'playful',
      voiceEmote: 'curious',
      voiceSyllables: 1,
      voiceAriaLabel: 'Robot waits one timing beat',
      accentCss: '#22d3ee'
    };
  }

  // Iterative loop container: LOOP 2x/3x/4x/5x
  if (blockType === 'LOOP') {
    return {
      tier: 'loop',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: 'happy',
      duration: 1.2,
      sparkColorHex: 0xfbbf24,
      puffColorHex: 0xfef08a,
      sparkCount: 12,
      puffCount: 4,
      voicePhrase: 'giggle',
      voiceMood: 'playful',
      voiceEmote: 'stars',
      voiceSyllables: 3,
      voiceAriaLabel: 'Robot twirls for loop block',
      accentCss: '#fbbf24'
    };
  }

  // Dynamic motion blocks: JUMP or BOOST
  if (blockType === 'JUMP' || blockType === 'BOOST') {
    const isBoost = blockType === 'BOOST';
    return {
      tier: 'dynamic',
      tierRank: tierInfo.tierRank,
      complexityTier: tierInfo.complexityTier,
      mood: isBoost ? 'boost' : 'happy',
      duration: 0.92,
      sparkColorHex: isBoost ? 0xf472b6 : 0xfb923c,
      puffColorHex: isBoost ? 0xfbcfe8 : 0xfed7aa,
      sparkCount: 10,
      puffCount: 3,
      voicePhrase: null,
      voiceMood: 'excited',
      voiceEmote: 'notes',
      voiceSyllables: 2,
      voiceAriaLabel: 'Robot revs dynamic action block',
      accentCss: isBoost ? '#f472b6' : '#fb923c'
    };
  }

  // Simple sequential motion: MOVE
  return {
    tier: 'simple',
    tierRank: tierInfo.tierRank,
    complexityTier: tierInfo.complexityTier,
    mood: 'happy',
    duration: 0.72,
    sparkColorHex: 0x38bdf8,
    puffColorHex: 0xbae6fd,
    sparkCount: 6,
    puffCount: 0,
    voicePhrase: null,
    voiceMood: 'happy',
    voiceEmote: 'notes',
    voiceSyllables: 1,
    voiceAriaLabel: 'Robot nods for move block',
    accentCss: '#38bdf8'
  };
}
