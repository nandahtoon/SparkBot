import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  Diamond,
  Eye,
  Flag,
  Focus,
  Layers,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Pause,
  Play,
  Puzzle,
  Redo2,
  RotateCcw,
  Route,
  Shield,
  SlidersHorizontal,
  Square,
  StepForward,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import {
  collectAncestorBlockIds,
  countBlocks,
  type BossMeta,
  type CodeBlock,
  type DynamicHazardDef,
  type SensorCondition,
  type SimStepInspection,
  type TileType,
  type TrackTile,
  type TutorialStep
} from '../game/engine';
import type { LivePathPreview } from '../game/pathPreview';
import type { CodeCameraPreset } from '../three/codeCamera';
import {
  computeBlockNestingDepth,
  computeMagneticDragPosition,
  evaluateProgramLogicTiers,
  isDescendantBlockId,
  previewDropTargetOptimality,
  type CodeComplexityTier,
  type DropZoneFeedbackState,
  type LogicPathOptimality
} from '../game/codeFeedback';
import type { DemoTopic } from './ConceptDemoPopover';
import { BlockIcon, HazardIcon } from './Icons';

function getDropZoneShiftClass(
  state: DropZoneFeedbackState | undefined,
  isHoveredPreview: boolean
): string {
  if (!state || state.optimality === 'idle') {
    return 'border-slate-700 bg-slate-950/75';
  }
  if (state.optimality === 'optimal') {
    return isHoveredPreview
      ? 'anim-dropzone-preview-optimal border-emerald-300/90 bg-emerald-950/35'
      : 'anim-dropzone-optimal border-emerald-400/65 bg-emerald-950/20';
  }
  if (state.optimality === 'balanced') {
    return isHoveredPreview
      ? 'anim-dropzone-preview-balanced border-sky-300/85 bg-sky-950/30'
      : 'anim-dropzone-balanced border-sky-400/55 bg-slate-950/70';
  }
  return isHoveredPreview
    ? 'anim-dropzone-preview-suboptimal border-amber-300/90 bg-amber-950/35'
    : 'anim-dropzone-suboptimal border-amber-400/70 bg-amber-950/20';
}

function getTierBadgeStyle(optimality: LogicPathOptimality): string {
  if (optimality === 'optimal') {
    return 'border-emerald-400/65 bg-emerald-500/18 text-emerald-200';
  }
  if (optimality === 'suboptimal') {
    return 'border-amber-400/70 bg-amber-500/18 text-amber-200';
  }
  if (optimality === 'balanced') {
    return 'border-sky-400/60 bg-sky-500/18 text-sky-200';
  }
  return 'border-slate-700 bg-slate-800/90 text-slate-300';
}

interface CodeDockProps {
  junior?: boolean;
  program: CodeBlock[];
  functionBody?: CodeBlock[];
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked: boolean;
  elseUnlocked?: boolean;
  functionUnlocked?: boolean;
  waitUnlocked?: boolean;
  hasDynamicHazards?: boolean;
  bossMeta?: BossMeta | null;
  activeBlockId: string | null;
  activeCallerBlockId?: string | null;
  simulating: boolean;
  simPaused?: boolean;
  simAwaitingStep?: boolean;
  stepInspection?: SimStepInspection | null;
  tutorialStep: TutorialStep | null;
  ghostHelp: boolean;
  lastFeedbackTier?: CodeComplexityTier | null;
  failingBlockId?: string | null;
  hintBanner?: React.ReactNode;
  canUndo?: boolean;
  canRedo?: boolean;
  showPathPreview?: boolean;
  pathPreview?: LivePathPreview | null;
  predictQuizEnabled?: boolean;
  onChangeProgram: (next: CodeBlock[]) => void;
  onChangeFunctionBody?: (next: CodeBlock[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onTogglePathPreview?: () => void;
  onTogglePredictQuiz?: () => void;
  onHoverBlock?: (blockId: string | null) => void;
  onBlockPlaced?: (info: { block: CodeBlock; nestingDepth: number }) => void;
  onRunProgram: () => void;
  onStepProgram?: () => void;
  onToggleSimPause?: () => void;
  onNextSimStep?: () => void;
  onStopSim?: () => void;
  onRequestHint?: () => void;
  onOpenDemo?: (topic: DemoTopic, condition?: SensorCondition) => void;
  track?: TrackTile[];
  hazards?: DynamicHazardDef[];
  codeCameraPreset?: CodeCameraPreset;
  onCycleCameraPreset?: () => void;
  onFocusTrackTile?: (tileIndex: number) => void;
  debugClue?: string | null;
  onResetDebugCode?: () => void;
}

interface DragCmdPayload {
  kind: 'new' | 'existing';
  type: CodeBlock['type'];
  condition?: SensorCondition;
  blockId?: string;
  sourceTray?: 'main' | 'func';
  x: number;
  y: number;
  displayX: number;
  displayY: number;
  magneticEngaged: boolean;
  magneticScale: number;
  magneticZoneId: string | null;
  startX: number;
  startY: number;
  moved: boolean;
}

let uidSeq = 1;
function makeBlock(type: CodeBlock['type'], condition?: SensorCondition): CodeBlock {
  uidSeq++;
  const id = `${type.toLowerCase()}_${Date.now()}_${uidSeq}`;
  if (type === 'LOOP') return { id, type: 'LOOP', count: 2, children: [] };
  if (type === 'IF') return { id, type: 'IF', condition: condition || 'GAP', children: [], elseChildren: [] };
  return { id, type };
}

function containsBlockId(list: CodeBlock[], targetId: string): boolean {
  const baseId = targetId.endsWith(':else') ? targetId.slice(0, -5) : targetId;
  for (const item of list) {
    if (item.id === baseId) return true;
    if (item.children && containsBlockId(item.children, baseId)) return true;
    if (item.elseChildren && containsBlockId(item.elseChildren, baseId)) return true;
  }
  return false;
}

function removeBlockById(list: CodeBlock[], targetId: string): { next: CodeBlock[]; removed: CodeBlock | null } {
  let removed: CodeBlock | null = null;
  const next: CodeBlock[] = [];
  for (const item of list) {
    if (item.id === targetId) {
      removed = item;
      continue;
    }
    let nextItem = item;
    if (item.children) {
      const sub = removeBlockById(item.children, targetId);
      if (sub.removed) removed = sub.removed;
      nextItem = { ...nextItem, children: sub.next };
    }
    if (item.elseChildren) {
      const subElse = removeBlockById(item.elseChildren, targetId);
      if (subElse.removed) removed = subElse.removed;
      nextItem = { ...nextItem, elseChildren: subElse.next };
    }
    next.push(nextItem);
  }
  return { next, removed };
}

function insertIntoContainer(list: CodeBlock[], containerId: string | null, blk: CodeBlock): CodeBlock[] {
  if (!containerId || !containsBlockId(list, containerId)) return [...list, blk];
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
      nextItem = { ...nextItem, children: insertIntoContainer(item.children, containerId, blk) };
    }
    if (item.elseChildren) {
      nextItem = { ...nextItem, elseChildren: insertIntoContainer(item.elseChildren, containerId, blk) };
    }
    return nextItem;
  });
}

function cycleLoopCount(list: CodeBlock[], targetId: string): CodeBlock[] {
  return list.map((item) => {
    if (item.id === targetId && item.type === 'LOOP') {
      const nextCount = (item.count || 2) >= 5 ? 2 : (item.count || 2) + 1;
      return { ...item, count: nextCount };
    }
    let nextItem = item;
    if (item.children) {
      nextItem = { ...nextItem, children: cycleLoopCount(item.children, targetId) };
    }
    if (item.elseChildren) {
      nextItem = { ...nextItem, elseChildren: cycleLoopCount(item.elseChildren, targetId) };
    }
    return nextItem;
  });
}

const TILE_BADGE_STYLE: Record<TileType, string> = {
  start: 'border-sky-400/50 bg-sky-500/15 text-sky-200',
  normal: 'border-slate-600 bg-slate-800 text-slate-200',
  gap: 'border-rose-400/60 bg-rose-500/20 text-rose-200',
  mud: 'border-amber-500/60 bg-amber-600/20 text-amber-200',
  ramp: 'border-pink-400/60 bg-pink-500/20 text-pink-200',
  gate: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
};

export const CodeDock: React.FC<CodeDockProps> = ({
  junior = false,
  program,
  functionBody = [],
  parBlocks,
  loopUnlocked,
  ifUnlocked,
  elseUnlocked = false,
  functionUnlocked = false,
  waitUnlocked = false,
  hasDynamicHazards = false,
  bossMeta = null,
  activeBlockId,
  activeCallerBlockId = null,
  simulating,
  simPaused = false,
  simAwaitingStep = false,
  stepInspection = null,
  tutorialStep,
  ghostHelp,
  lastFeedbackTier = null,
  failingBlockId = null,
  hintBanner = null,
  canUndo = false,
  canRedo = false,
  showPathPreview = true,
  pathPreview = null,
  predictQuizEnabled = true,
  onChangeProgram,
  onChangeFunctionBody,
  onUndo,
  onRedo,
  onTogglePathPreview,
  onTogglePredictQuiz,
  onHoverBlock,
  onBlockPlaced,
  onRunProgram,
  onStepProgram,
  onToggleSimPause,
  onNextSimStep,
  onStopSim,
  onRequestHint,
  onOpenDemo,
  track = [],
  hazards = [],
  codeCameraPreset = 'overview',
  onCycleCameraPreset,
  onFocusTrackTile,
  debugClue = null,
  onResetDebugCode
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [focusedTileIdx, setFocusedTileIdx] = useState<number | null>(null);
  const [funcTrayOpen, setFuncTrayOpen] = useState(true);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragCmdPayload | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null);
  const [snappedState, setSnappedState] = useState<{ blockId: string; zoneId: string } | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dockRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const dynamicHazardTiles = useMemo(() => {
    const set = new Set<number>();
    for (const h of hazards) {
      if (h.kind === 'laser_gate') {
        set.add(h.tileIndex);
      } else if (h.kind === 'patrol_drone') {
        for (let t = h.minTile; t <= h.maxTile; t++) set.add(t);
      }
    }
    return set;
  }, [hazards]);

  const reachedTiles = useMemo(() => {
    const set = new Set<number>();
    if (!pathPreview || pathPreview.segments.length === 0) return set;
    set.add(0);
    for (const seg of pathPreview.segments) {
      set.add(seg.toPos);
    }
    return set;
  }, [pathPreview]);

  useEffect(() => {
    setFocusedTileIdx(null);
  }, [track, codeCameraPreset]);

  function triggerMagneticSnap(blockId: string, zoneId: string) {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
    }
    setSnappedState({ blockId, zoneId });
    snapTimerRef.current = window.setTimeout(() => {
      setSnappedState((prev) => (prev?.blockId === blockId ? null : prev));
      snapTimerRef.current = null;
    }, 360);
  }

  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  // Automatically clear stale activeContainerId after Undo/Redo, level switch, or parent deletion
  useEffect(() => {
    if (!activeContainerId) return;
    if (activeContainerId === 'FUNC') {
      if (!functionUnlocked) setActiveContainerId(null);
      return;
    }
    const stillExists =
      containsBlockId(program, activeContainerId) ||
      (functionUnlocked && containsBlockId(functionBody, activeContainerId));
    if (!stillExists) {
      setActiveContainerId(null);
    }
  }, [activeContainerId, functionBody, functionUnlocked, program]);

  const totalBlocks = countBlocks(program, functionUnlocked ? functionBody : undefined);
  const ancestorIdSet = useMemo(() => {
    const mainAnc = collectAncestorBlockIds(program, activeBlockId);
    const funcAnc = functionBody.length > 0 ? collectAncestorBlockIds(functionBody, activeBlockId) : [];
    return new Set([...mainAnc, ...funcAnc]);
  }, [program, functionBody, activeBlockId]);

  const isZoneInFunc = (zoneId: string | null): boolean => {
    if (!zoneId) return false;
    if (zoneId === 'FUNC') return true;
    return containsBlockId(functionBody, zoneId);
  };

  const blockContainsCallFunc = (blk: CodeBlock): boolean => {
    if (blk.type === 'CALL_FUNC') return true;
    if (blk.children?.some(blockContainsCallFunc)) return true;
    if (blk.elseChildren?.some(blockContainsCallFunc)) return true;
    return false;
  };

  const tierOptions = useMemo(
    () => ({
      parBlocks,
      loopUnlocked,
      ifUnlocked
    }),
    [parBlocks, loopUnlocked, ifUnlocked]
  );

  const programTiers = useMemo(
    () => evaluateProgramLogicTiers(program, tierOptions),
    [program, tierOptions]
  );

  const hoveredPreview = useMemo(() => {
    if (!drag || !drag.moved || !hoveredDropZone || hoveredDropZone === 'TRASH' || hoveredDropZone === 'FUNC') return null;
    if (isZoneInFunc(hoveredDropZone)) return null;
    return previewDropTargetOptimality(program, tierOptions, {
      kind: drag.kind,
      type: drag.type,
      condition: drag.condition,
      blockId: drag.blockId,
      targetZoneId: hoveredDropZone
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, hoveredDropZone, program, functionBody, tierOptions]);

  function resolveZoneFeedback(zoneId: string): {
    state: DropZoneFeedbackState | undefined;
    isPreview: boolean;
  } {
    if (hoveredPreview && hoveredDropZone === zoneId) {
      return { state: hoveredPreview, isPreview: true };
    }
    return { state: programTiers.zoneStates[zoneId], isPreview: false };
  }

  // Clear drag state if touch/pointer is cancelled mid-drag (e.g. tablet palm rejection)
  useEffect(() => {
    if (!drag) return;
    const onCancel = () => {
      setDrag(null);
      setHoveredDropZone(null);
    };
    window.addEventListener('pointercancel', onCancel);
    return () => window.removeEventListener('pointercancel', onCancel);
  }, [drag]);

  // Keep the actively highlighted instruction centered in the horizontal sequence rail
  useEffect(() => {
    if (!activeBlockId || !railRef.current) return;
    const activeEl = railRef.current.querySelector<HTMLElement>('[data-block-active="true"]');
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeBlockId, stepInspection?.stepNumber]);

  function findDropZoneAt(px: number, py: number): string | 'TRASH' | null {
    const els = document.elementsFromPoint(px, py);
    for (const el of els) {
      const dz = (el as HTMLElement).dataset?.dropZone;
      if (dz) return dz;
    }
    return null;
  }

  function findSlotElement(zoneId: string): HTMLElement | null {
    if (zoneId === 'ROOT') return railRef.current;
    const container = dockRef.current;
    if (!container) return null;
    const slots = container.querySelectorAll<HTMLElement>('[data-drop-slot]');
    for (const slot of slots) {
      if (slot.dataset.dropSlot === zoneId) return slot;
    }
    return null;
  }

  function getLastBlockRectInSlot(slotEl: HTMLElement): DOMRect | null {
    const directBlocks: HTMLElement[] = [];
    for (const child of Array.from(slotEl.children)) {
      const el = child as HTMLElement;
      if (el.dataset?.blockId) {
        directBlocks.push(el);
      }
    }
    if (directBlocks.length === 0) return null;
    return directBlocks[directBlocks.length - 1].getBoundingClientRect();
  }

  function resolveMagneticDropTarget(px: number, py: number, excludeBlockId?: string) {
    const directZone = findDropZoneAt(px, py);
    if (directZone === 'TRASH') {
      return {
        zoneId: 'TRASH' as string | 'TRASH' | null,
        magneticZoneId: null as string | null,
        engaged: false,
        x: px,
        y: py,
        scale: 1
      };
    }

    const isSelfDescendant = (zId: string) =>
      isDescendantBlockId(program, excludeBlockId, zId) ||
      isDescendantBlockId(functionBody, excludeBlockId, zId);

    if (directZone && !isSelfDescendant(directZone)) {
      const slotEl = findSlotElement(directZone);
      if (slotEl) {
        const snap = computeMagneticDragPosition(
          px,
          py,
          slotEl.getBoundingClientRect(),
          getLastBlockRectInSlot(slotEl)
        );
        return {
          zoneId: directZone,
          magneticZoneId: snap.engaged ? directZone : null,
          engaged: snap.engaged,
          x: snap.x,
          y: snap.y,
          scale: snap.scale
        };
      }
      return {
        zoneId: directZone,
        magneticZoneId: directZone,
        engaged: true,
        x: px,
        y: py,
        scale: 1.06
      };
    }

    // Proximity magnetic catch when approaching a valid drop slot edge
    const container = dockRef.current;
    if (container) {
      const slots = Array.from(container.querySelectorAll<HTMLElement>('[data-drop-slot]'));
      // Prefer inner container slots over ROOT/FUNC when equidistant
      slots.sort((a, b) => {
        const aTop = a.dataset.dropSlot === 'ROOT' || a.dataset.dropSlot === 'FUNC';
        const bTop = b.dataset.dropSlot === 'ROOT' || b.dataset.dropSlot === 'FUNC';
        return aTop && !bTop ? 1 : !aTop && bTop ? -1 : 0;
      });
      let best: { zoneId: string; pullFactor: number; x: number; y: number; scale: number } | null = null;
      for (const slot of slots) {
        const zId = slot.dataset.dropSlot;
        if (!zId || isSelfDescendant(zId)) continue;
        const snap = computeMagneticDragPosition(
          px,
          py,
          slot.getBoundingClientRect(),
          getLastBlockRectInSlot(slot)
        );
        if (snap.engaged && (!best || snap.pullFactor > best.pullFactor)) {
          best = { zoneId: zId, pullFactor: snap.pullFactor, x: snap.x, y: snap.y, scale: snap.scale };
        }
      }
      if (best) {
        return {
          zoneId: best.zoneId,
          magneticZoneId: best.zoneId,
          engaged: true,
          x: best.x,
          y: best.y,
          scale: best.scale
        };
      }
    }

    return {
      zoneId: null as string | 'TRASH' | null,
      magneticZoneId: null as string | null,
      engaged: false,
      x: px,
      y: py,
      scale: 1
    };
  }

  function handlePaletteDown(e: React.PointerEvent, type: CodeBlock['type'], condition?: SensorCondition) {
    if (simulating) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: 'new',
      type,
      condition,
      x: e.clientX,
      y: e.clientY,
      displayX: e.clientX,
      displayY: e.clientY,
      magneticEngaged: false,
      magneticScale: 1,
      magneticZoneId: null,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    });
  }

  function handleExistingDown(e: React.PointerEvent, blk: CodeBlock, sourceTray: 'main' | 'func') {
    if (simulating) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: 'existing',
      type: blk.type,
      condition: blk.condition,
      blockId: blk.id,
      sourceTray,
      x: e.clientX,
      y: e.clientY,
      displayX: e.clientX,
      displayY: e.clientY,
      magneticEngaged: false,
      magneticScale: 1,
      magneticZoneId: null,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
    const moved = cur.moved || dist > 10;
    if (moved) {
      const mag = resolveMagneticDropTarget(
        e.clientX,
        e.clientY,
        cur.kind === 'existing' ? cur.blockId : undefined
      );
      setDrag({
        ...cur,
        x: e.clientX,
        y: e.clientY,
        displayX: mag.x,
        displayY: mag.y,
        magneticEngaged: mag.engaged,
        magneticScale: mag.scale,
        magneticZoneId: mag.magneticZoneId,
        moved: true
      });
      setHoveredDropZone((prev) => (prev === mag.zoneId ? prev : mag.zoneId));
    } else {
      setDrag({
        ...cur,
        x: e.clientX,
        y: e.clientY,
        displayX: e.clientX,
        displayY: e.clientY,
        moved: false
      });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    setDrag(null);
    setHoveredDropZone(null);

    const placeIntoZone = (created: CodeBlock, targetZone: string | null) => {
      const destIsFunc = Boolean(functionUnlocked && onChangeFunctionBody && isZoneInFunc(targetZone));
      // Prevent placing MY BLOCK (CALL_FUNC) inside MY BLOCK subroutine (no recursion)
      if (destIsFunc && blockContainsCallFunc(created)) {
        const nextProgram = insertIntoContainer(program, null, created);
        onChangeProgram(nextProgram);
        triggerMagneticSnap(created.id, 'ROOT');
        onBlockPlaced?.({
          block: created,
          nestingDepth: computeBlockNestingDepth(nextProgram, created.id)
        });
        return;
      }

      if (destIsFunc && onChangeFunctionBody) {
        const funcContainer = targetZone === 'FUNC' ? null : targetZone;
        const nextFunc = insertIntoContainer(functionBody, funcContainer, created);
        onChangeFunctionBody(nextFunc);
        triggerMagneticSnap(created.id, targetZone ?? 'FUNC');
        onBlockPlaced?.({
          block: created,
          nestingDepth: computeBlockNestingDepth(nextFunc, created.id) + 1
        });
        if (created.type === 'LOOP' || created.type === 'IF') {
          setActiveContainerId(created.id);
        }
      } else {
        const mainContainer = targetZone && targetZone !== 'ROOT' ? targetZone : null;
        const nextProgram = insertIntoContainer(program, mainContainer, created);
        onChangeProgram(nextProgram);
        triggerMagneticSnap(created.id, mainContainer ?? 'ROOT');
        onBlockPlaced?.({
          block: created,
          nestingDepth: computeBlockNestingDepth(nextProgram, created.id)
        });
        if (created.type === 'LOOP' || created.type === 'IF') {
          setActiveContainerId(created.id);
        }
      }
    };

    if (cur.kind === 'new') {
      if (cur.moved) {
        const rawDz = findDropZoneAt(e.clientX, e.clientY);
        if (rawDz === 'TRASH') return;
        const dz = rawDz ?? cur.magneticZoneId;
        const created = makeBlock(cur.type, cur.condition);
        placeIntoZone(created, dz);
      } else {
        // Tap fallback: append into active container/FUNC or ROOT
        const created = makeBlock(cur.type, cur.condition);
        const canNest = activeContainerId && created.id !== activeContainerId;
        placeIntoZone(created, canNest ? activeContainerId : null);
      }
      return;
    }

    if (cur.kind === 'existing' && cur.blockId) {
      const fromFunc = cur.sourceTray === 'func';
      if (cur.moved) {
        const rawDz = findDropZoneAt(e.clientX, e.clientY);
        if (rawDz === 'TRASH') {
          if (fromFunc && onChangeFunctionBody) {
            const { next } = removeBlockById(functionBody, cur.blockId);
            if (activeContainerId === cur.blockId || activeContainerId === `${cur.blockId}:else`) {
              setActiveContainerId(null);
            }
            onChangeFunctionBody(next);
          } else {
            const { next } = removeBlockById(program, cur.blockId);
            if (activeContainerId === cur.blockId || activeContainerId === `${cur.blockId}:else`) {
              setActiveContainerId(null);
            }
            onChangeProgram(next);
          }
          return;
        }
        const dz = rawDz ?? cur.magneticZoneId;
        const isSelfDesc =
          isDescendantBlockId(program, cur.blockId, dz) ||
          isDescendantBlockId(functionBody, cur.blockId, dz);
        if (dz && !isSelfDesc) {
          const destIsFunc = Boolean(functionUnlocked && onChangeFunctionBody && isZoneInFunc(dz));
          const removedRes = fromFunc
            ? removeBlockById(functionBody, cur.blockId)
            : removeBlockById(program, cur.blockId);
          if (removedRes.removed) {
            if (destIsFunc && blockContainsCallFunc(removedRes.removed)) {
              return;
            }
            if (fromFunc && destIsFunc && onChangeFunctionBody) {
              const funcTarget = dz === 'FUNC' ? null : dz;
              const nextFunc = insertIntoContainer(removedRes.next, funcTarget, removedRes.removed);
              onChangeFunctionBody(nextFunc);
              triggerMagneticSnap(removedRes.removed.id, dz);
              onBlockPlaced?.({
                block: removedRes.removed,
                nestingDepth: computeBlockNestingDepth(nextFunc, removedRes.removed.id) + 1
              });
            } else if (!fromFunc && !destIsFunc) {
              const target = dz === 'ROOT' ? null : dz;
              const nextProgram = insertIntoContainer(removedRes.next, target, removedRes.removed);
              onChangeProgram(nextProgram);
              triggerMagneticSnap(removedRes.removed.id, target ?? 'ROOT');
              onBlockPlaced?.({
                block: removedRes.removed,
                nestingDepth: computeBlockNestingDepth(nextProgram, removedRes.removed.id)
              });
            } else if (fromFunc && !destIsFunc && onChangeFunctionBody) {
              onChangeFunctionBody(removedRes.next);
              const target = dz === 'ROOT' ? null : dz;
              const nextProgram = insertIntoContainer(program, target, removedRes.removed);
              onChangeProgram(nextProgram);
              triggerMagneticSnap(removedRes.removed.id, target ?? 'ROOT');
            } else if (!fromFunc && destIsFunc && onChangeFunctionBody) {
              onChangeProgram(removedRes.next);
              const funcTarget = dz === 'FUNC' ? null : dz;
              const nextFunc = insertIntoContainer(functionBody, funcTarget, removedRes.removed);
              onChangeFunctionBody(nextFunc);
              triggerMagneticSnap(removedRes.removed.id, dz);
            }
          }
        }
      } else {
        // Tap existing block
        if (cur.type === 'LOOP' || cur.type === 'IF') {
          if (cur.type === 'LOOP' && activeContainerId === cur.blockId) {
            if (fromFunc && onChangeFunctionBody) {
              const nextFunc = cycleLoopCount(functionBody, cur.blockId);
              onChangeFunctionBody(nextFunc);
            } else {
              const nextProgram = cycleLoopCount(program, cur.blockId);
              onChangeProgram(nextProgram);
              onBlockPlaced?.({
                block: { id: cur.blockId, type: 'LOOP' },
                nestingDepth: computeBlockNestingDepth(nextProgram, cur.blockId)
              });
            }
          } else {
            setActiveContainerId(activeContainerId === cur.blockId ? null : cur.blockId);
          }
        }
      }
    }
  }

  function renderBlock(blk: CodeBlock, tray: 'main' | 'func' = 'main') {
    const isActive = activeBlockId === blk.id;
    const isActiveCaller = Boolean(
      !isActive && blk.type === 'CALL_FUNC' && activeCallerBlockId === blk.id
    );
    const isFailing = !simulating && !isActive && failingBlockId === blk.id;
    const isAncestor = !isActive && ancestorIdSet.has(blk.id);
    const isContainerFocused = activeContainerId === blk.id;
    const isElseFocused = activeContainerId === `${blk.id}:else`;
    const isJustSnapped = snappedState?.blockId === blk.id;

    const removeThisBlock = () => {
      onHoverBlock?.(null);
      if (tray === 'func' && onChangeFunctionBody) {
        const { next } = removeBlockById(functionBody, blk.id);
        if (activeContainerId === blk.id || activeContainerId === `${blk.id}:else`) {
          setActiveContainerId(null);
        }
        onChangeFunctionBody(next);
      } else {
        const { next } = removeBlockById(program, blk.id);
        if (activeContainerId === blk.id || activeContainerId === `${blk.id}:else`) {
          setActiveContainerId(null);
        }
        onChangeProgram(next);
      }
    };

    if (blk.type === 'LOOP' || blk.type === 'IF') {
      const isLoop = blk.type === 'LOOP';
      const showElseLane =
        !isLoop && (elseUnlocked || Boolean(blk.elseChildren && blk.elseChildren.length > 0));
      const elseZoneId = `${blk.id}:else`;
      const isElseMagneticTarget =
        Boolean(drag?.moved && drag.magneticEngaged && hoveredDropZone === elseZoneId);
      const isElseCaught = snappedState?.zoneId === elseZoneId;

      return (
        <div
          key={blk.id}
          data-block-id={blk.id}
          data-block-active={isActive ? 'true' : 'false'}
          data-block-failing={isFailing ? 'true' : 'false'}
          data-block-ancestor={isAncestor ? 'true' : 'false'}
          data-just-snapped={isJustSnapped ? 'true' : 'false'}
          data-drop-zone={blk.id}
          onPointerDown={(e) => handleExistingDown(e, blk, tray)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!simulating) onHoverBlock?.(blk.id);
          }}
          onFocus={(e) => {
            e.stopPropagation();
            if (!simulating) onHoverBlock?.(blk.id);
          }}
          onBlur={() => onHoverBlock?.(null)}
          className={`relative flex shrink-0 items-center gap-1 rounded-xl border-2 px-1.5 py-1 transition-all ${
            isJustSnapped ? 'anim-block-magnetic-snap' : ''
          } ${
            isActive
              ? 'border-amber-300 bg-amber-400/25 ring-2 ring-amber-300/80 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
              : isFailing
                ? 'border-rose-400 bg-rose-500/20 ring-2 ring-rose-400/75 shadow-[0_0_14px_rgba(251,113,133,0.45)]'
                : isAncestor
                  ? 'border-cyan-300 bg-cyan-500/15 shadow-[0_0_14px_rgba(34,211,238,0.45)]'
                  : isContainerFocused || isElseFocused
                    ? isLoop
                      ? 'border-emerald-300 bg-emerald-500/20'
                      : 'border-violet-300 bg-violet-500/20'
                    : isLoop
                      ? 'border-emerald-500/70 bg-slate-800/95'
                      : 'border-violet-500/70 bg-slate-800/95'
          }`}
        >
          {isFailing && (
            <span className="absolute -left-1.5 -top-2 z-10 rounded bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow">
              Check
            </span>
          )}
          {isActive && stepInspection && (
            <span className="tabular absolute -left-1.5 -top-2 z-10 rounded bg-amber-400 px-1 py-0.5 text-[9px] font-black leading-none text-slate-950 shadow">
              #{stepInspection.stepNumber}
            </span>
          )}
          <div className="flex flex-col items-center gap-0.5 pr-0.5">
            <BlockIcon type={blk.type} condition={blk.condition} className="h-5.5 w-5.5" />
            {isLoop && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tray === 'func' && onChangeFunctionBody) {
                    onChangeFunctionBody(cycleLoopCount(functionBody, blk.id));
                  } else {
                    const nextProgram = cycleLoopCount(program, blk.id);
                    onChangeProgram(nextProgram);
                    onBlockPlaced?.({
                      block: blk,
                      nestingDepth: computeBlockNestingDepth(nextProgram, blk.id)
                    });
                  }
                }}
                aria-label={`Loop count ${blk.count || 2}`}
                className="tabular rounded bg-emerald-400 px-1 py-0.2 text-[10px] font-black text-slate-950"
              >
                ×{blk.count || 2}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {/* Primary / THEN lane */}
            {(() => {
              const innerZone = resolveZoneFeedback(blk.id);
              const isSlotMagneticTarget =
                Boolean(drag?.moved && drag.magneticEngaged && hoveredDropZone === blk.id);
              const isSlotCaught = snappedState?.zoneId === blk.id;
              const innerShiftClass = simulating
                ? 'border-slate-500/70 bg-slate-950/60'
                : getDropZoneShiftClass(innerZone.state, innerZone.isPreview);
              return (
                <div className="flex items-center gap-1">
                  {showElseLane && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContainerId(blk.id);
                      }}
                      className={`rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        isContainerFocused
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      DO
                    </button>
                  )}
                  <div
                    data-drop-zone={blk.id}
                    data-drop-slot={blk.id}
                    data-zone-tier={innerZone.state?.complexityTier || 'tier2_structured'}
                    data-zone-optimality={innerZone.state?.optimality || 'idle'}
                    data-zone-reason={innerZone.state?.reason || 'empty'}
                    data-drop-preview={innerZone.isPreview ? 'true' : 'false'}
                    data-magnetic-target={isSlotMagneticTarget ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveContainerId(blk.id);
                    }}
                    className={`flex min-h-[40px] min-w-[44px] items-center gap-1 rounded-lg border border-dashed px-1.5 py-0.5 transition-transform duration-150 ${
                      isSlotCaught ? 'scale-[1.02] brightness-110' : ''
                    } ${innerShiftClass}`}
                  >
                    {(blk.children || []).length === 0 ? (
                      isSlotMagneticTarget ? (
                        <span
                          aria-hidden="true"
                          className="anim-magnetic-ghost-slot mx-auto flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-sky-300/85 bg-sky-400/20 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                        >
                          <span className="h-2 w-2 rounded-full bg-sky-200" />
                        </span>
                      ) : (
                        <span
                          className={`mx-auto h-2.5 w-2.5 rounded-full transition-colors ${
                            innerZone.isPreview && innerZone.state?.optimality === 'optimal'
                              ? 'bg-emerald-300/90'
                              : innerZone.state?.optimality === 'suboptimal'
                                ? 'bg-amber-300/80'
                                : 'bg-slate-600/80'
                          }`}
                        />
                      )
                    ) : (
                      <>
                        {(blk.children || []).map((child) => renderBlock(child, tray))}
                        {isSlotMagneticTarget && (
                          <span
                            aria-hidden="true"
                            className="anim-magnetic-ghost-slot flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-sky-300/80 bg-sky-400/18 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                          >
                            <span className="h-2 w-2 rounded-full bg-sky-200" />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Optional ELSE lane (Chapter 3 Finale & Chapter 4) */}
            {showElseLane && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveContainerId(isElseFocused ? null : elseZoneId);
                  }}
                  aria-label="Focus ELSE branch"
                  className={`rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    isElseFocused
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  ELSE
                </button>
                <div
                  data-drop-zone={elseZoneId}
                  data-drop-slot={elseZoneId}
                  data-magnetic-target={isElseMagneticTarget ? 'true' : 'false'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveContainerId(elseZoneId);
                  }}
                  className={`flex min-h-[36px] min-w-[44px] items-center gap-1 rounded-lg border border-dashed px-1.5 py-0.5 transition-all duration-150 ${
                    isElseCaught ? 'scale-[1.02] brightness-110' : ''
                  } ${
                    isElseMagneticTarget || isElseFocused
                      ? 'border-amber-300 bg-amber-500/20'
                      : 'border-amber-500/45 bg-slate-950/75'
                  }`}
                >
                  {(blk.elseChildren || []).length === 0 ? (
                    <span className="mx-auto text-[9px] font-bold text-slate-500">+</span>
                  ) : (
                    <>
                      {(blk.elseChildren || []).map((child) => renderBlock(child, tray))}
                      {isElseMagneticTarget && (
                        <span
                          aria-hidden="true"
                          className="anim-magnetic-ghost-slot flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-amber-300/80 bg-amber-400/20"
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-200" />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              removeThisBlock();
            }}
            aria-label="Remove Block"
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-200 hover:bg-rose-500"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }

    const border =
      blk.type === 'MOVE'
        ? 'border-sky-400/80'
        : blk.type === 'JUMP'
          ? 'border-amber-400/80'
          : blk.type === 'WAIT'
            ? 'border-cyan-400/80'
            : blk.type === 'CALL_FUNC'
              ? 'border-fuchsia-400/85 bg-fuchsia-950/50'
              : 'border-pink-400/80';

    return (
      <div
        key={blk.id}
        data-block-id={blk.id}
        data-block-active={isActive || isActiveCaller ? 'true' : 'false'}
        data-block-failing={isFailing ? 'true' : 'false'}
        data-just-snapped={isJustSnapped ? 'true' : 'false'}
        onPointerDown={(e) => handleExistingDown(e, blk, tray)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!simulating) onHoverBlock?.(blk.id);
        }}
        onFocus={(e) => {
          e.stopPropagation();
          if (!simulating) onHoverBlock?.(blk.id);
        }}
        onBlur={() => onHoverBlock?.(null)}
        className={`relative flex h-10 shrink-0 items-center justify-center rounded-xl border-2 bg-slate-800 transition-all sm:h-11 ${
          blk.type === 'CALL_FUNC' ? 'min-w-[54px] px-1.5 gap-1' : 'w-10 sm:w-11'
        } ${
          isJustSnapped ? 'anim-block-magnetic-snap' : ''
        } ${
          isActive
            ? 'scale-105 border-amber-300 bg-amber-400/30 ring-2 ring-amber-300/80 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
            : isActiveCaller
              ? 'scale-105 border-cyan-300 bg-cyan-500/25 ring-2 ring-cyan-300/80 shadow-[0_0_14px_rgba(34,211,238,0.6)]'
              : isFailing
                ? 'border-rose-400 bg-rose-500/25 ring-2 ring-rose-400/80 shadow-[0_0_14px_rgba(251,113,133,0.5)]'
                : border
        }`}
      >
        {isFailing && (
          <span className="absolute -left-1.5 -top-2 z-10 rounded bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow">
            Check
          </span>
        )}
        {isActive && stepInspection && (
          <span className="tabular absolute -left-1.5 -top-2 z-10 rounded bg-amber-400 px-1 py-0.5 text-[9px] font-black leading-none text-slate-950 shadow">
            #{stepInspection.stepNumber}
          </span>
        )}
        <BlockIcon type={blk.type} className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
        {blk.type === 'CALL_FUNC' && (
          <span className="text-[9px] font-black uppercase tracking-tight text-fuchsia-200">MY</span>
        )}
        {!simulating && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              removeThisBlock();
            }}
            aria-label="Remove Block"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-slate-200 hover:bg-rose-500"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {drag && drag.moved && (
        <div
          data-testid="drag-code-ghost"
          data-magnetic-engaged={drag.magneticEngaged ? 'true' : 'false'}
          style={{
            left: `${drag.displayX}px`,
            top: `${drag.displayY}px`,
            transform: `translate(-50%, -50%) scale(${drag.magneticScale})`
          }}
          className={`pointer-events-none fixed z-50 flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-slate-900/95 transition-[transform,border-color,box-shadow] duration-100 ease-out ${
            drag.magneticEngaged
              ? hoveredPreview?.optimality === 'suboptimal'
                ? 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.55)] ring-2 ring-amber-300/50'
                : 'border-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.55)] ring-2 ring-sky-300/55'
              : 'border-sky-300 shadow-2xl'
          }`}
        >
          <BlockIcon type={drag.type} condition={drag.condition} className="h-7 w-7" />
        </div>
      )}

      <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 px-2 pb-1 sm:px-3 sm:pb-1.5">
        {hintBanner}
        <div
          ref={dockRef}
          data-code-feedback-tier={lastFeedbackTier || ''}
          data-logic-tier={programTiers.complexityTier}
          data-logic-optimality={programTiers.optimality}
          className="pointer-events-auto w-full max-w-4xl rounded-3xl border border-slate-600/70 bg-slate-900/95 px-2.5 py-2 shadow-2xl backdrop-blur-md sm:px-3 sm:py-2"
        >
          {/* Boss Mission Header Banner (Chapter 4 Finale) */}
          {bossMeta && (
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl border border-rose-400/45 bg-rose-950/55 px-2.5 py-1 text-[11px]">
              <div className="flex min-w-0 items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden="true" />
                <span className="font-black uppercase tracking-wider text-rose-200">
                  BOSS · {bossMeta.name}
                </span>
                <span className="hidden truncate text-slate-300 sm:inline">
                  — {bossMeta.title}
                </span>
              </div>
              <span className="shrink-0 font-bold text-amber-300">
                {bossMeta.coreCount} Shield Cores
              </span>
            </div>
          )}

          {/* Bug Buster Debug Clue Banner */}
          {debugClue && (
            <div
              data-testid="debug-clue-banner"
              className="mb-1.5 flex items-center justify-between gap-2 rounded-xl border border-violet-400/60 bg-violet-950/60 px-2.5 py-1.5 text-[11px]"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Bug className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
                <span className="truncate font-bold text-violet-100">{debugClue}</span>
              </div>
              {onResetDebugCode && !simulating && (
                <button
                  id="resetDebugCodeBtn"
                  type="button"
                  onClick={onResetDebugCode}
                  aria-label="Reset Starter Buggy Code"
                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-violet-400/60 bg-violet-500/20 px-2 text-[10px] font-black text-violet-100 hover:bg-violet-500/35 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          )}

          {/* Compact Track Mini-Map & 3D View Switcher (See Every Tile & Tap to Inspect in 3D) */}
          {track.length > 0 && (
            <div
              data-testid="track-minimap-strip"
              className="mb-1 flex items-center gap-1 border-b border-slate-700/60 pb-1"
            >
              {onCycleCameraPreset && !simulating && (
                <button
                  id="codeCameraViewBtn"
                  type="button"
                  onClick={() => {
                    setFocusedTileIdx(null);
                    onCycleCameraPreset();
                  }}
                  aria-label={`Switch 3D Camera View (Current: ${
                    codeCameraPreset === 'overview'
                      ? 'Full Track'
                      : codeCameraPreset === 'top'
                        ? 'Top-Down'
                        : 'Close Bot'
                  })`}
                  title="Tap to switch 3D camera (Full / Top / Close) · Drag 3D scene to rotate & pan"
                  className={`flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-black tracking-wide transition-colors active:scale-95 ${
                    codeCameraPreset === 'overview'
                      ? 'border-sky-400/70 bg-sky-500/20 text-sky-200 hover:border-sky-300'
                      : codeCameraPreset === 'top'
                        ? 'border-violet-400/70 bg-violet-500/20 text-violet-200 hover:border-violet-300'
                        : 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  {codeCameraPreset === 'overview' ? (
                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : codeCameraPreset === 'top' ? (
                    <MapIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <Focus className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {codeCameraPreset === 'overview'
                      ? 'Full'
                      : codeCameraPreset === 'top'
                        ? 'Top'
                        : 'Close'}
                  </span>
                </button>
              )}

              <div
                className="no-scrollbar touch-pan-x flex flex-1 items-center gap-1 overflow-x-auto py-0.5"
                role="list"
                aria-label="Course Tile Map"
              >
                {track.map((tile, idx) => {
                  const isStart = idx === 0;
                  const isGate = idx === track.length - 1 || tile.type === 'gate';
                  const hasDynHazard = dynamicHazardTiles.has(idx);
                  const hazardCond: SensorCondition | null =
                    tile.type === 'gap'
                      ? 'GAP'
                      : tile.type === 'mud'
                        ? 'MUD'
                        : tile.type === 'ramp'
                          ? 'RAMP'
                          : hasDynHazard
                            ? 'HAZARD'
                            : null;
                  const activeTileIdx =
                    simulating && stepInspection
                      ? stepInspection.tilePosition
                      : pathPreview && pathPreview.segments.length > 0
                        ? pathPreview.endpoint.tileIndex
                        : 0;
                  const isEndTarget = idx === activeTileIdx;
                  const isFailTarget =
                    !simulating &&
                    isEndTarget &&
                    pathPreview?.endpoint.status === 'hazard';
                  const isReached = !simulating && reachedTiles.has(idx);
                  const isFocused = focusedTileIdx === idx;

                  const chipTone = isStart
                    ? 'border-sky-400/65 bg-sky-500/20 text-sky-200'
                    : isGate
                      ? 'border-emerald-400/75 bg-emerald-500/20 text-emerald-200'
                      : tile.type === 'gap'
                        ? 'border-rose-400/70 bg-rose-500/20 text-rose-200'
                        : tile.type === 'mud'
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                          : tile.type === 'ramp'
                            ? 'border-pink-400/70 bg-pink-500/20 text-pink-200'
                            : hasDynHazard
                              ? 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200'
                              : 'border-slate-700 bg-slate-800/90 text-slate-300';

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="listitem"
                      disabled={simulating}
                      onClick={() => {
                        setFocusedTileIdx(idx);
                        onFocusTrackTile?.(idx);
                      }}
                      aria-label={`Tile ${idx}: ${
                        isStart
                          ? 'Start'
                          : isGate
                            ? 'Gate'
                            : hazardCond || tile.type
                      }${tile.crystal ? ' with Crystal' : ''}`}
                      title={`Tile ${idx}${isGate ? ' (Gate)' : hazardCond ? ` (${hazardCond})` : ''}${tile.crystal ? ' · Crystal' : ''} — Tap to look`}
                      className={`relative flex h-7 min-w-[28px] shrink-0 items-center justify-center gap-0.5 rounded-lg border px-1.5 text-[10px] font-black tabular transition-transform active:scale-95 disabled:pointer-events-none ${chipTone} ${
                        isFailTarget
                          ? 'ring-2 ring-rose-400'
                          : isEndTarget
                            ? 'ring-2 ring-sky-300'
                            : isFocused
                              ? 'ring-2 ring-amber-300'
                              : ''
                      }`}
                    >
                      {isGate ? (
                        <Flag className="h-3 w-3 shrink-0 text-emerald-300" aria-hidden="true" />
                      ) : hazardCond ? (
                        <HazardIcon cond={hazardCond} className="h-3.5 w-3.5 shrink-0" />
                      ) : null}
                      <span>{isStart ? 'S' : idx}</span>
                      {tile.crystal && (
                        <Diamond
                          className="h-2.5 w-2.5 shrink-0 fill-cyan-300 text-cyan-200"
                          aria-hidden="true"
                        />
                      )}
                      {isReached && !isStart && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-x-1 bottom-0.5 h-[2px] rounded-full ${
                            isFailTarget ? 'bg-rose-400' : 'bg-emerald-300/90'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 2: Command Palette (left) + Primary Step/Run Controls (right) — zero dead space on mobile */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="no-scrollbar touch-pan-x flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 pr-1 sm:gap-1.5">
              {(junior ? (['MOVE'] as const) : (['MOVE', 'JUMP', 'BOOST'] as const)).map((cmd) => {
                const isHint =
                  ghostHelp &&
                  tutorialStep?.targetType === 'cmd' &&
                  tutorialStep.targetKey === cmd;
                return (
                  <button
                    key={cmd}
                    type="button"
                    data-add-cmd={cmd}
                    aria-label={cmd}
                    onPointerDown={(e) => handlePaletteDown(e, cmd)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className={`flex shrink-0 items-center justify-center rounded-xl border bg-slate-800 transition-transform active:scale-95 ${junior ? 'min-h-12 min-w-16 gap-1 px-2' : 'h-9.5 w-9.5 sm:h-10.5 sm:w-10.5'} ${
                      isHint
                        ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                        : 'border-slate-600 hover:border-sky-400'
                    }`}
                  >
                    <BlockIcon type={cmd} className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                    {junior && <span className="text-xs font-bold text-sky-100">Move</span>}
                  </button>
                );
              })}

              {waitUnlocked && (
                <button
                  id="addWaitBtn"
                  type="button"
                  data-add-cmd="WAIT"
                  aria-label="WAIT 1 Beat"
                  title="WAIT 1 Beat"
                  onPointerDown={(e) => handlePaletteDown(e, 'WAIT')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-cyan-400/75 bg-slate-800 transition-transform active:scale-95 hover:border-cyan-300 sm:h-10.5 sm:w-10.5"
                >
                  <BlockIcon type="WAIT" className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                </button>
              )}

              {loopUnlocked && (
                <button
                  type="button"
                  data-add-cmd="LOOP"
                  aria-label="LOOP"
                  onPointerDown={(e) => handlePaletteDown(e, 'LOOP')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-emerald-500/75 bg-slate-800 transition-transform active:scale-95 hover:border-emerald-300 sm:h-10.5 sm:w-10.5"
                >
                  <BlockIcon type="LOOP" className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                </button>
              )}

              {functionUnlocked && (
                <button
                  id="addCallFuncBtn"
                  type="button"
                  data-add-cmd="CALL_FUNC"
                  aria-label="MY BLOCK Subroutine"
                  title="Call MY BLOCK Subroutine"
                  onPointerDown={(e) => handlePaletteDown(e, 'CALL_FUNC')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="flex h-9.5 min-w-[50px] shrink-0 items-center justify-center gap-1 rounded-xl border border-fuchsia-400/80 bg-fuchsia-950/45 px-1.5 transition-transform active:scale-95 hover:border-fuchsia-300 sm:h-10.5 sm:min-w-[58px]"
                >
                  <BlockIcon type="CALL_FUNC" className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  <span className="text-[10px] font-black uppercase text-fuchsia-200">MY</span>
                </button>
              )}

              {/* Sensor Conditional Blocks: IF [GAP], IF [MUD], IF [RAMP], + IF [HAZARD] */}
              {(ifUnlocked || loopUnlocked) && (
                <>
                  <button
                    id="addIfGapBtn"
                    type="button"
                    data-add-cmd="IF"
                    data-if-cond="GAP"
                    aria-label="IF GAP"
                    onPointerDown={(e) => handlePaletteDown(e, 'IF', 'GAP')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex h-9.5 min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-10.5 sm:min-w-[56px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="GAP" className="scale-85 sm:scale-90" />
                  </button>

                  <button
                    id="addIfMudBtn"
                    type="button"
                    data-add-cmd="IF"
                    data-if-cond="MUD"
                    aria-label="IF MUD"
                    onPointerDown={(e) => handlePaletteDown(e, 'IF', 'MUD')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex h-9.5 min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-10.5 sm:min-w-[56px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="MUD" className="scale-85 sm:scale-90" />
                  </button>

                  <button
                    id="addIfRampBtn"
                    type="button"
                    data-add-cmd="IF"
                    data-if-cond="RAMP"
                    aria-label="IF RAMP"
                    onPointerDown={(e) => handlePaletteDown(e, 'IF', 'RAMP')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex h-9.5 min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-10.5 sm:min-w-[56px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="RAMP" className="scale-85 sm:scale-90" />
                  </button>

                  {(hasDynamicHazards || waitUnlocked) && (
                    <button
                      id="addIfHazardBtn"
                      type="button"
                      data-add-cmd="IF"
                      data-if-cond="HAZARD"
                      aria-label="IF HAZARD"
                      title="IF Moving Hazard Ahead"
                      onPointerDown={(e) => handlePaletteDown(e, 'IF', 'HAZARD')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="flex h-9.5 min-w-[48px] shrink-0 items-center justify-center rounded-xl border border-rose-400/80 bg-rose-950/40 px-1 transition-transform active:scale-95 hover:border-rose-300 sm:h-10.5 sm:min-w-[56px] sm:px-1.5"
                    >
                      <BlockIcon type="IF" condition="HAZARD" className="scale-85 sm:scale-90" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Primary Step & Run Controls (always right beside palette!) */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {!simulating ? (
                <>
                  {onStepProgram && !junior && (
                    <button
                      id="stepCodeBtn"
                      type="button"
                      onClick={onStepProgram}
                      aria-label="Step-Through Program"
                      className="flex h-9.5 items-center justify-center gap-1 rounded-xl border border-sky-300/90 bg-gradient-to-b from-sky-400 to-sky-600 px-2.5 text-xs font-black text-slate-950 shadow-[0_2px_0_#0369a1] transition-transform active:translate-y-0.5 sm:h-10 sm:px-3"
                    >
                      <StepForward className="h-4 w-4 stroke-[2.75]" />
                      <span className="hidden sm:inline">Step</span>
                    </button>
                  )}

                  <button
                    id="runCodeBtn"
                    type="button"
                    onClick={onRunProgram}
                    aria-label="Run Robot Program"
                    className={`flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 text-slate-950 shadow-[0_2px_0_#047857] transition-transform active:translate-y-0.5 ${junior ? "min-h-12 min-w-20" : "h-9.5 min-w-[48px] sm:h-10 sm:min-w-[56px] sm:px-4"}`}
                  >
                    <Play className="h-4.5 w-4.5 fill-slate-950 sm:h-5 sm:w-5" />
                    {junior && <span className="font-black">Run</span>}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1" role="group" aria-label="Simulation Step Controls">
                  {onToggleSimPause && (
                    <button
                      id="simPauseResumeBtn"
                      type="button"
                      onClick={onToggleSimPause}
                      aria-label={simPaused ? 'Resume Simulation' : 'Pause Simulation'}
                      className={`flex h-8.5 items-center gap-1 rounded-xl border px-2 text-[11px] font-black transition-transform active:translate-y-0.5 sm:h-9.5 sm:px-2.5 sm:text-xs ${
                        simPaused
                          ? 'border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_2px_0_#047857]'
                          : 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_2px_0_#b45309]'
                      }`}
                    >
                      {simPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5 fill-slate-950" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-slate-950" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                  )}

                  {onNextSimStep && (
                    <button
                      id="simNextStepBtn"
                      type="button"
                      onClick={onNextSimStep}
                      aria-label={
                        stepInspection?.isLastStep && simAwaitingStep
                          ? 'Finish Simulation'
                          : 'Next Instruction Step'
                      }
                      className="flex h-8.5 items-center gap-1 rounded-xl border border-sky-200 bg-gradient-to-b from-sky-400 to-sky-600 px-2 text-[11px] font-black text-slate-950 shadow-[0_2px_0_#0369a1] transition-transform active:translate-y-0.5 sm:h-9.5 sm:px-2.5 sm:text-xs"
                    >
                      <StepForward className="h-3.5 w-3.5 stroke-[2.75]" />
                      <span>{stepInspection?.isLastStep && simAwaitingStep ? 'Finish' : 'Next'}</span>
                    </button>
                  )}

                  {onStopSim && (
                    <button
                      id="simStopBtn"
                      type="button"
                      onClick={onStopSim}
                      aria-label="Stop and Reset Simulation"
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-rose-400/80 bg-rose-500/20 text-rose-200 transition-transform hover:bg-rose-500/35 active:scale-95 sm:h-9.5 sm:w-9.5"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Compact Status + Utility Strip (Block Counter + Live Path Summary + Tools) */}
          <div className="mt-1 flex items-center justify-between gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div
                aria-label={`Blocks ${totalBlocks} of ${parBlocks}`}
                className={`flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 tabular-nums text-[11px] font-black sm:h-8 ${
                  totalBlocks <= parBlocks
                    ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                    : 'border border-amber-500/50 bg-amber-500/20 text-amber-300'
                }`}
              >
                <Puzzle className="h-3 w-3" />
                <span>
                  {totalBlocks}/{parBlocks}
                </span>
              </div>

              {totalBlocks > 0 && (
                <div
                  data-testid="logic-tier-badge"
                  data-tier-rank={programTiers.tierRank}
                  data-optimality={programTiers.optimality}
                  title={`${programTiers.tierLabel} · ${programTiers.hint}`}
                  aria-label={`${programTiers.tierLabel}, ${programTiers.hint}`}
                  className={`hidden h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-extrabold tracking-wide transition-colors md:flex ${getTierBadgeStyle(
                    programTiers.optimality
                  )}`}
                >
                  <span className="tabular font-black">T{programTiers.tierRank}</span>
                  <span className="opacity-85">· {programTiers.hint}</span>
                </div>
              )}

              {/* Inline Live Path Outcome Status (replaces separate 5th row!) */}
              {!simulating && !collapsed && pathPreview && pathPreview.endpoint.status !== 'empty' && (
                <div
                  data-testid="live-path-summary"
                  data-path-status={pathPreview.endpoint.status}
                  className="flex min-w-0 items-center gap-1 truncate text-[11px] font-bold tracking-tight"
                >
                  {pathPreview.endpoint.status === 'win' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : pathPreview.endpoint.status === 'hazard' ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
                  ) : (
                    <Compass className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
                  )}
                  <span
                    className={`truncate ${
                      pathPreview.endpoint.status === 'win'
                        ? 'text-emerald-300'
                        : pathPreview.endpoint.status === 'hazard'
                          ? 'text-rose-300'
                          : 'text-sky-200'
                    }`}
                  >
                    {pathPreview.endpoint.summaryLabel}
                  </span>
                  {pathPreview.endpoint.totalCrystals > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-cyan-300">
                      <Diamond className="h-2.5 w-2.5 fill-cyan-300/75 text-cyan-300" aria-hidden="true" />
                      <span>
                        {pathPreview.endpoint.collectedCrystals}/{pathPreview.endpoint.totalCrystals}
                      </span>
                    </span>
                  )}
                  <span className="hidden shrink-0 tabular-nums text-slate-400 sm:inline">
                    · {pathPreview.segments.length} {pathPreview.segments.length === 1 ? 'step' : 'steps'}
                  </span>
                  {!showPathPreview && (
                    <span className="hidden shrink-0 text-slate-500 sm:inline">· 3D route hidden</span>
                  )}
                </div>
              )}
            </div>

            {/* Right Utility Controls */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Mobile-only Tools Toggle */}
              <button
                id="mobileCodeToolsBtn"
                type="button"
                aria-expanded={mobileToolsOpen}
                aria-label="Toggle Coding Tools"
                onClick={() => setMobileToolsOpen((v) => !v)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors active:scale-95 sm:hidden ${
                  mobileToolsOpen
                    ? 'border-sky-300 bg-sky-500/25 text-sky-100'
                    : 'border-slate-700 bg-slate-800 text-slate-200'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {/* Desktop/Tablet Inline Secondary Tools */}
              <div className="hidden items-center gap-1 sm:flex">
                {onUndo && (
                  <button
                    id="undoCodeBtn"
                    type="button"
                    disabled={simulating || !canUndo}
                    onClick={onUndo}
                    aria-label="Undo Block Edit"
                    title="Undo (Ctrl+Z)"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:border-sky-400 disabled:pointer-events-none disabled:opacity-35"
                  >
                    <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                {onRedo && (
                  <button
                    id="redoCodeBtn"
                    type="button"
                    disabled={simulating || !canRedo}
                    onClick={onRedo}
                    aria-label="Redo Block Edit"
                    title="Redo (Ctrl+Shift+Z)"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:border-sky-400 disabled:pointer-events-none disabled:opacity-35"
                  >
                    <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                {onTogglePathPreview && (
                  <button
                    id="togglePathPreviewBtn"
                    type="button"
                    disabled={simulating}
                    onClick={onTogglePathPreview}
                    aria-pressed={showPathPreview}
                    aria-label={showPathPreview ? 'Hide 3D Path Preview' : 'Show 3D Path Preview'}
                    title={showPathPreview ? '3D Path Preview: ON' : '3D Path Preview: OFF'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-35 ${
                      showPathPreview
                        ? 'border-cyan-400/75 bg-cyan-500/20 text-cyan-200 hover:border-cyan-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Route className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                {onTogglePredictQuiz && (
                  <button
                    id="togglePredictQuizBtn"
                    type="button"
                    disabled={simulating}
                    onClick={onTogglePredictQuiz}
                    aria-pressed={predictQuizEnabled}
                    aria-label={predictQuizEnabled ? 'Disable Predict-Before-Run Quiz' : 'Enable Predict-Before-Run Quiz'}
                    title={predictQuizEnabled ? 'Brain Spark Predict Quiz: ON' : 'Brain Spark Predict Quiz: OFF'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-35 ${
                      predictQuizEnabled
                        ? 'border-fuchsia-400/75 bg-fuchsia-500/20 text-fuchsia-200 hover:border-fuchsia-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  data-drop-zone="TRASH"
                  disabled={simulating}
                  onClick={() => {
                    onHoverBlock?.(null);
                    setActiveContainerId(null);
                    onChangeProgram([]);
                    onChangeFunctionBody?.([]);
                  }}
                  aria-label="Clear All Blocks"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                    drag?.kind === 'existing' && drag.moved
                      ? 'border-rose-400 bg-rose-500/30 text-rose-200'
                      : 'border-slate-700 bg-slate-800 text-rose-300 hover:border-rose-400'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {onOpenDemo && !simulating && (
                  <button
                    type="button"
                    data-demo-cmd="GUIDE"
                    onClick={() =>
                      onOpenDemo(
                        functionUnlocked
                          ? 'CALL_FUNC'
                          : waitUnlocked
                            ? 'WAIT'
                            : ifUnlocked
                              ? 'IF'
                              : loopUnlocked
                                ? 'LOOP'
                                : 'MOVE',
                        hasDynamicHazards ? 'HAZARD' : ifUnlocked ? 'GAP' : undefined
                      )
                    }
                    aria-label="Code Blocks Visual Guide"
                    title="Blocks Visual Guide"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/15 text-sky-200 transition-colors hover:border-sky-300 hover:bg-sky-500/25 active:scale-95"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {onRequestHint && !simulating && (
                <button
                  id="codeNeedHintBtn"
                  type="button"
                  onClick={onRequestHint}
                  aria-label="Need a Hint"
                  className="flex h-7 w-7 items-center justify-center gap-1 rounded-lg border border-amber-400/70 bg-amber-500/15 text-[11px] font-black text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-500/25 active:scale-95 sm:h-8 sm:w-auto sm:px-2"
                >
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Hint</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? 'Expand Code Dock' : 'Collapse Code Dock'}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 sm:h-8 sm:w-8"
              >
                {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Tools Drawer (< 640px) — keeps phone HUD roomy & finger-friendly */}
          {mobileToolsOpen && !simulating && (
            <div
              data-testid="mobile-code-tools-drawer"
              className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/90 p-1.5 sm:hidden"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {onUndo && (
                  <button
                    type="button"
                    disabled={!canUndo}
                    onClick={onUndo}
                    aria-label="Undo"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-35"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                )}
                {onRedo && (
                  <button
                    type="button"
                    disabled={!canRedo}
                    onClick={onRedo}
                    aria-label="Redo"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-35"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>
                )}
                {onTogglePathPreview && (
                  <button
                    type="button"
                    onClick={onTogglePathPreview}
                    aria-pressed={showPathPreview}
                    aria-label="Toggle 3D Path"
                    className={`flex h-10 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-black ${
                      showPathPreview
                        ? 'border-cyan-400/75 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Route className="h-4 w-4" />
                    <span>Path</span>
                  </button>
                )}
                {onTogglePredictQuiz && (
                  <button
                    type="button"
                    onClick={onTogglePredictQuiz}
                    aria-pressed={predictQuizEnabled}
                    aria-label="Toggle Predict Quiz"
                    className={`flex h-10 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-black ${
                      predictQuizEnabled
                        ? 'border-fuchsia-400/75 bg-fuchsia-500/20 text-fuchsia-200'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    <span>Quiz</span>
                  </button>
                )}
                {onOpenDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileToolsOpen(false);
                      onOpenDemo(
                        functionUnlocked
                          ? 'CALL_FUNC'
                          : waitUnlocked
                            ? 'WAIT'
                            : ifUnlocked
                              ? 'IF'
                              : loopUnlocked
                                ? 'LOOP'
                                : 'MOVE',
                        hasDynamicHazards ? 'HAZARD' : ifUnlocked ? 'GAP' : undefined
                      );
                    }}
                    aria-label="Visual Guide"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/70 bg-sky-500/15 text-sky-200"
                  >
                    <BookOpen className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                data-drop-zone="TRASH"
                onClick={() => {
                  onHoverBlock?.(null);
                  setActiveContainerId(null);
                  onChangeProgram([]);
                  onChangeFunctionBody?.([]);
                  setMobileToolsOpen(false);
                }}
                aria-label="Clear All Blocks"
                className="flex h-10 items-center gap-1 rounded-xl border border-rose-400/60 bg-rose-500/15 px-2.5 text-[11px] font-black text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </div>
          )}

          {/* Live Robot State Inspector Bar (visible during Step-Through & Simulation) */}
          {simulating && stepInspection && (
            <div
              data-testid="step-inspector-bar"
              data-step-number={stepInspection.stepNumber}
              data-sim-paused={simPaused ? 'true' : 'false'}
              className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-sky-400/45 bg-slate-950/90 px-2 py-1 text-[11px] shadow-inner sm:px-2.5"
            >
              {/* Left: Step Counter + State Pill + Instruction Outcome */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="tabular rounded-md border border-amber-300/60 bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                  STEP {stepInspection.stepNumber}/{stepInspection.totalSteps}
                </span>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    stepInspection.isFailure
                      ? 'border-rose-400/70 bg-rose-500/25 text-rose-200'
                      : simPaused
                        ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                        : 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {stepInspection.isFailure ? 'Alert' : simPaused ? 'Paused' : 'Running'}
                </span>
                <span className="text-[11px] font-bold text-slate-100">{stepInspection.statusLabel}</span>
              </div>

              {/* Right: Live Robot Telemetry Readout (Position, Sensor Ahead, Crystals, Hardware) */}
              <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 tabular ${TILE_BADGE_STYLE[stepInspection.currentTileType]}`}
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {stepInspection.tilePosition}/{stepInspection.gateIndex} ·{' '}
                    {stepInspection.currentTileType.toUpperCase()}
                  </span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${TILE_BADGE_STYLE[stepInspection.aheadTileType]}`}
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  <span>Ahead: {stepInspection.aheadTileType.toUpperCase()}</span>
                </span>

                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-1.5 py-0.5 text-cyan-200 tabular">
                  <Diamond className="h-3 w-3 fill-cyan-300 text-cyan-300" aria-hidden="true" />
                  <span>
                    {stepInspection.crystalsCollected}/{stepInspection.totalCrystals}
                  </span>
                </span>

                {stepInspection.activeCapabilities.length > 0 && (
                  <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-1.5 py-0.5 text-slate-300 md:inline-flex">
                    <Cpu className="h-3 w-3 text-sky-300" aria-hidden="true" />
                    <span>{stepInspection.activeCapabilities.join(' · ')}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Live Path Summary moved inline into Row 3 above for a cleaner, shorter mobile dock */}

          {/* Collapsible MY BLOCK Subroutine Tray (Chapter 4 Functions) */}
          {!collapsed && functionUnlocked && onChangeFunctionBody && (() => {
            const isFuncFocused = activeContainerId === 'FUNC';
            const isFuncMagneticTarget = Boolean(
              drag?.moved && drag.magneticEngaged && hoveredDropZone === 'FUNC'
            );
            const isFuncCaught = snappedState?.zoneId === 'FUNC';
            return (
              <div className="mt-1.5 rounded-xl border border-fuchsia-400/45 bg-fuchsia-950/25 px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveContainerId(isFuncFocused ? null : 'FUNC')}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fuchsia-200"
                  >
                    <Layers className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden="true" />
                    <span>MY BLOCK Definition</span>
                    <span className="rounded bg-fuchsia-500/25 px-1.5 py-0.5 text-[9px] text-fuchsia-100">
                      {countBlocks(functionBody)} {countBlocks(functionBody) === 1 ? 'blk' : 'blks'}
                    </span>
                    {isFuncFocused && (
                      <span className="rounded bg-fuchsia-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                        Active Target
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFuncTrayOpen((v) => !v)}
                    aria-label={funcTrayOpen ? 'Collapse MY BLOCK tray' : 'Expand MY BLOCK tray'}
                    className="text-[10px] font-bold text-fuchsia-300 hover:text-white"
                  >
                    {funcTrayOpen ? 'Hide' : 'Edit'}
                  </button>
                </div>

                {funcTrayOpen && (
                  <div
                    data-drop-zone="FUNC"
                    data-drop-slot="FUNC"
                    data-magnetic-target={isFuncMagneticTarget ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveContainerId('FUNC');
                    }}
                    className={`no-scrollbar touch-pan-x mt-1 flex min-h-[46px] items-center gap-1.5 overflow-x-auto rounded-lg border border-dashed px-2 py-1 transition-all duration-150 ${
                      isFuncCaught ? 'scale-[1.008] brightness-110' : ''
                    } ${
                      isFuncMagneticTarget || isFuncFocused
                        ? 'border-fuchsia-300 bg-fuchsia-500/18'
                        : 'border-fuchsia-400/40 bg-slate-950/70'
                    }`}
                  >
                    {functionBody.length === 0 ? (
                      <span className="mx-auto text-[11px] font-bold text-fuchsia-200/70">
                        Tap here or drop blocks to define MY BLOCK
                      </span>
                    ) : (
                      <>
                        {functionBody.map((blk) => renderBlock(blk, 'func'))}
                        {isFuncMagneticTarget && (
                          <div
                            aria-hidden="true"
                            className="anim-magnetic-ghost-slot flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-fuchsia-300/80 bg-fuchsia-400/20"
                          >
                            <span className="h-2 w-2 rounded-full bg-fuchsia-200" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Visual Sequence Rail (Root Drop Zone with Subtle Tiered Color-Shifting & Magnetic Snap Feedback) */}
          {!collapsed && (() => {
            const rootZone = resolveZoneFeedback('ROOT');
            const isRootMagneticTarget =
              Boolean(drag?.moved && drag.magneticEngaged && hoveredDropZone === 'ROOT');
            const isRootCaught = snappedState?.zoneId === 'ROOT';
            const rootShiftClass = simulating
              ? 'border-slate-700 bg-slate-950/75'
              : getDropZoneShiftClass(rootZone.state, rootZone.isPreview);
            return (
              <div
                ref={railRef}
                data-drop-zone="ROOT"
                data-drop-slot="ROOT"
                data-zone-tier={rootZone.state?.complexityTier || 'tier1_linear'}
                data-zone-optimality={rootZone.state?.optimality || 'idle'}
                data-zone-reason={rootZone.state?.reason || 'empty'}
                data-drop-preview={rootZone.isPreview ? 'true' : 'false'}
                data-magnetic-target={isRootMagneticTarget ? 'true' : 'false'}
                onPointerOver={() => {
                  if (!simulating) onHoverBlock?.(null);
                }}
                onPointerLeave={() => onHoverBlock?.(null)}
                onClick={() => setActiveContainerId(null)}
                className={`no-scrollbar touch-pan-x mt-1 flex min-h-[48px] items-center gap-1.5 overflow-x-auto rounded-xl border border-dashed px-2 py-1 transition-transform duration-150 sm:mt-1.5 sm:min-h-[54px] sm:px-2.5 sm:py-1.5 ${
                  isRootCaught ? 'scale-[1.008] brightness-110' : ''
                } ${rootShiftClass}`}
              >
                {program.length === 0 ? (
                  isRootMagneticTarget ? (
                    <div
                      aria-hidden="true"
                      className="anim-magnetic-ghost-slot mx-auto flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-sky-300/85 bg-sky-400/20 shadow-[0_0_14px_rgba(56,189,248,0.35)] sm:h-11 sm:w-11"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-200" />
                    </div>
                  ) : (
                    <div className="mx-auto flex items-center gap-2 text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/50" />
                    </div>
                  )
                ) : (
                  <>
                    {program.map((blk) => renderBlock(blk, 'main'))}
                    {isRootMagneticTarget && (
                      <div
                        aria-hidden="true"
                        className="anim-magnetic-ghost-slot flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-sky-300/80 bg-sky-400/18 shadow-[0_0_12px_rgba(56,189,248,0.3)] sm:h-11 sm:w-11"
                      >
                        <span className="h-2 w-2 rounded-full bg-sky-200" />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
};
