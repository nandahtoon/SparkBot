import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  Diamond,
  Eye,
  Lightbulb,
  MapPin,
  Pause,
  Play,
  Puzzle,
  Redo2,
  Route,
  Square,
  StepForward,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import {
  collectAncestorBlockIds,
  countBlocks,
  type CodeBlock,
  type SensorCondition,
  type SimStepInspection,
  type TileType,
  type TutorialStep
} from '../game/engine';
import type { LivePathPreview } from '../game/pathPreview';
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
import { BlockIcon } from './Icons';

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
  program: CodeBlock[];
  parBlocks: number;
  loopUnlocked: boolean;
  ifUnlocked: boolean;
  activeBlockId: string | null;
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
  onChangeProgram: (next: CodeBlock[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onTogglePathPreview?: () => void;
  onHoverBlock?: (blockId: string | null) => void;
  onBlockPlaced?: (info: { block: CodeBlock; nestingDepth: number }) => void;
  onRunProgram: () => void;
  onStepProgram?: () => void;
  onToggleSimPause?: () => void;
  onNextSimStep?: () => void;
  onStopSim?: () => void;
  onRequestHint?: () => void;
  onOpenDemo?: (topic: DemoTopic, condition?: SensorCondition) => void;
}

interface DragCmdPayload {
  kind: 'new' | 'existing';
  type: CodeBlock['type'];
  condition?: SensorCondition;
  blockId?: string;
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
  if (type === 'IF') return { id, type: 'IF', condition: condition || 'GAP', children: [] };
  return { id, type };
}

function removeBlockById(list: CodeBlock[], targetId: string): { next: CodeBlock[]; removed: CodeBlock | null } {
  let removed: CodeBlock | null = null;
  const next: CodeBlock[] = [];
  for (const item of list) {
    if (item.id === targetId) {
      removed = item;
      continue;
    }
    if (item.children) {
      const sub = removeBlockById(item.children, targetId);
      if (sub.removed) removed = sub.removed;
      next.push({ ...item, children: sub.next });
    } else {
      next.push(item);
    }
  }
  return { next, removed };
}

function insertIntoContainer(list: CodeBlock[], containerId: string | null, blk: CodeBlock): CodeBlock[] {
  if (!containerId) return [...list, blk];
  return list.map((item) => {
    if (item.id === containerId) {
      return { ...item, children: [...(item.children || []), blk] };
    }
    if (item.children) {
      return { ...item, children: insertIntoContainer(item.children, containerId, blk) };
    }
    return item;
  });
}

function cycleLoopCount(list: CodeBlock[], targetId: string): CodeBlock[] {
  return list.map((item) => {
    if (item.id === targetId && item.type === 'LOOP') {
      const nextCount = (item.count || 2) >= 4 ? 2 : (item.count || 2) + 1;
      return { ...item, count: nextCount };
    }
    if (item.children) {
      return { ...item, children: cycleLoopCount(item.children, targetId) };
    }
    return item;
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
  program,
  parBlocks,
  loopUnlocked,
  ifUnlocked,
  activeBlockId,
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
  onChangeProgram,
  onUndo,
  onRedo,
  onTogglePathPreview,
  onHoverBlock,
  onBlockPlaced,
  onRunProgram,
  onStepProgram,
  onToggleSimPause,
  onNextSimStep,
  onStopSim,
  onRequestHint,
  onOpenDemo
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragCmdPayload | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null);
  const [snappedState, setSnappedState] = useState<{ blockId: string; zoneId: string } | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dockRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

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

  const totalBlocks = countBlocks(program);
  const ancestorIdSet = useMemo(
    () => new Set(collectAncestorBlockIds(program, activeBlockId)),
    [program, activeBlockId]
  );

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
    if (!drag || !drag.moved || !hoveredDropZone || hoveredDropZone === 'TRASH') return null;
    return previewDropTargetOptimality(program, tierOptions, {
      kind: drag.kind,
      type: drag.type,
      condition: drag.condition,
      blockId: drag.blockId,
      targetZoneId: hoveredDropZone
    });
  }, [drag, hoveredDropZone, program, tierOptions]);

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

    if (directZone && !isDescendantBlockId(program, excludeBlockId, directZone)) {
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
      // Prefer inner container slots over ROOT when equidistant
      slots.sort((a, b) => (a.dataset.dropSlot === 'ROOT' ? 1 : b.dataset.dropSlot === 'ROOT' ? -1 : 0));
      let best: { zoneId: string; pullFactor: number; x: number; y: number; scale: number } | null = null;
      for (const slot of slots) {
        const zId = slot.dataset.dropSlot;
        if (!zId || isDescendantBlockId(program, excludeBlockId, zId)) continue;
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

  function handleExistingDown(e: React.PointerEvent, blk: CodeBlock) {
    if (simulating) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: 'existing',
      type: blk.type,
      condition: blk.condition,
      blockId: blk.id,
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

    if (cur.kind === 'new') {
      if (cur.moved) {
        const rawDz = findDropZoneAt(e.clientX, e.clientY);
        if (rawDz === 'TRASH') return;
        const dz = rawDz ?? cur.magneticZoneId;
        const targetContainer = dz && dz !== 'ROOT' ? dz : null;
        const created = makeBlock(cur.type, cur.condition);
        const nextProgram = insertIntoContainer(program, targetContainer, created);
        onChangeProgram(nextProgram);
        triggerMagneticSnap(created.id, targetContainer ?? 'ROOT');
        onBlockPlaced?.({
          block: created,
          nestingDepth: computeBlockNestingDepth(nextProgram, created.id)
        });
        if (created.type === 'LOOP' || created.type === 'IF') {
          setActiveContainerId(created.id);
        }
      } else {
        // Tap fallback: append into active container or root
        const created = makeBlock(cur.type, cur.condition);
        const canNest = activeContainerId && created.id !== activeContainerId;
        const targetContainer = canNest ? activeContainerId : null;
        const nextProgram = insertIntoContainer(program, targetContainer, created);
        onChangeProgram(nextProgram);
        triggerMagneticSnap(created.id, targetContainer ?? 'ROOT');
        onBlockPlaced?.({
          block: created,
          nestingDepth: computeBlockNestingDepth(nextProgram, created.id)
        });
        if (created.type === 'LOOP' || created.type === 'IF') {
          setActiveContainerId(created.id);
        }
      }
      return;
    }

    if (cur.kind === 'existing' && cur.blockId) {
      if (cur.moved) {
        const rawDz = findDropZoneAt(e.clientX, e.clientY);
        if (rawDz === 'TRASH') {
          const { next } = removeBlockById(program, cur.blockId);
          if (activeContainerId === cur.blockId) setActiveContainerId(null);
          onChangeProgram(next);
          return;
        }
        const dz = rawDz ?? cur.magneticZoneId;
        if (dz && !isDescendantBlockId(program, cur.blockId, dz)) {
          const { next, removed } = removeBlockById(program, cur.blockId);
          if (removed) {
            const target = dz === 'ROOT' ? null : dz;
            const nextProgram = insertIntoContainer(next, target, removed);
            onChangeProgram(nextProgram);
            triggerMagneticSnap(removed.id, target ?? 'ROOT');
            onBlockPlaced?.({
              block: removed,
              nestingDepth: computeBlockNestingDepth(nextProgram, removed.id)
            });
          }
        }
      } else {
        // Tap existing block
        if (cur.type === 'LOOP' || cur.type === 'IF') {
          if (cur.type === 'LOOP' && activeContainerId === cur.blockId) {
            const nextProgram = cycleLoopCount(program, cur.blockId);
            onChangeProgram(nextProgram);
            onBlockPlaced?.({
              block: { id: cur.blockId, type: 'LOOP' },
              nestingDepth: computeBlockNestingDepth(nextProgram, cur.blockId)
            });
          } else {
            setActiveContainerId(activeContainerId === cur.blockId ? null : cur.blockId);
          }
        }
      }
    }
  }

  function renderBlock(blk: CodeBlock) {
    const isActive = activeBlockId === blk.id;
    const isFailing = !simulating && !isActive && failingBlockId === blk.id;
    const isAncestor = !isActive && ancestorIdSet.has(blk.id);
    const isContainerFocused = activeContainerId === blk.id;
    const isJustSnapped = snappedState?.blockId === blk.id;

    if (blk.type === 'LOOP' || blk.type === 'IF') {
      const isLoop = blk.type === 'LOOP';
      return (
        <div
          key={blk.id}
          data-block-id={blk.id}
          data-block-active={isActive ? 'true' : 'false'}
          data-block-failing={isFailing ? 'true' : 'false'}
          data-block-ancestor={isAncestor ? 'true' : 'false'}
          data-just-snapped={isJustSnapped ? 'true' : 'false'}
          data-drop-zone={blk.id}
          onPointerDown={(e) => handleExistingDown(e, blk)}
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
                  : isContainerFocused
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
                  const nextProgram = cycleLoopCount(program, blk.id);
                  onChangeProgram(nextProgram);
                  onBlockPlaced?.({
                    block: blk,
                    nestingDepth: computeBlockNestingDepth(nextProgram, blk.id)
                  });
                }}
                aria-label={`Loop count ${blk.count || 2}`}
                className="tabular rounded bg-emerald-400 px-1 py-0.2 text-[10px] font-black text-slate-950"
              >
                ×{blk.count || 2}
              </button>
            )}
          </div>

          {(() => {
            const innerZone = resolveZoneFeedback(blk.id);
            const isSlotMagneticTarget =
              Boolean(drag?.moved && drag.magneticEngaged && hoveredDropZone === blk.id);
            const isSlotCaught = snappedState?.zoneId === blk.id;
            const innerShiftClass = simulating
              ? 'border-slate-500/70 bg-slate-950/60'
              : getDropZoneShiftClass(innerZone.state, innerZone.isPreview);
            return (
              <div
                data-drop-zone={blk.id}
                data-drop-slot={blk.id}
                data-zone-tier={innerZone.state?.complexityTier || 'tier2_structured'}
                data-zone-optimality={innerZone.state?.optimality || 'idle'}
                data-zone-reason={innerZone.state?.reason || 'empty'}
                data-drop-preview={innerZone.isPreview ? 'true' : 'false'}
                data-magnetic-target={isSlotMagneticTarget ? 'true' : 'false'}
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
                    {(blk.children || []).map((child) => renderBlock(child))}
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
            );
          })()}

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onHoverBlock?.(null);
              const { next } = removeBlockById(program, blk.id);
              if (activeContainerId === blk.id) setActiveContainerId(null);
              onChangeProgram(next);
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
          : 'border-pink-400/80';

    return (
      <div
        key={blk.id}
        data-block-id={blk.id}
        data-block-active={isActive ? 'true' : 'false'}
        data-block-failing={isFailing ? 'true' : 'false'}
        data-just-snapped={isJustSnapped ? 'true' : 'false'}
        onPointerDown={(e) => handleExistingDown(e, blk)}
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
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 bg-slate-800 transition-all sm:h-11 sm:w-11 ${
          isJustSnapped ? 'anim-block-magnetic-snap' : ''
        } ${
          isActive
            ? 'scale-105 border-amber-300 bg-amber-400/30 ring-2 ring-amber-300/80 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
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
        <BlockIcon type={blk.type} className="h-6 w-6 sm:h-6.5 sm:w-6.5" />
        {!simulating && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onHoverBlock?.(null);
              const { next } = removeBlockById(program, blk.id);
              onChangeProgram(next);
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
          className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-slate-600/80 bg-slate-900/94 px-2 py-1.5 shadow-2xl backdrop-blur-md sm:px-3 sm:py-2"
        >
          {/* Top Row: Compact Command Palette + Action Controls */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="no-scrollbar touch-pan-x flex items-center gap-1.5 overflow-x-auto py-0.5 pr-1">
              {(['MOVE', 'JUMP', 'BOOST'] as const).map((cmd) => {
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
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-800 transition-transform active:scale-95 sm:h-11 sm:w-11 ${
                      isHint
                        ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                        : 'border-slate-600 hover:border-sky-400'
                    }`}
                  >
                    <BlockIcon type={cmd} className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" />
                  </button>
                );
              })}

              {loopUnlocked && (
                <button
                  type="button"
                  data-add-cmd="LOOP"
                  aria-label="LOOP"
                  onPointerDown={(e) => handlePaletteDown(e, 'LOOP')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/75 bg-slate-800 transition-transform active:scale-95 hover:border-emerald-300 sm:h-11 sm:w-11"
                >
                  <BlockIcon type="LOOP" className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" />
                </button>
              )}

              {/* Sensor Conditional Blocks: IF [GAP], IF [MUD], IF [RAMP] */}
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
                    className="flex h-10 min-w-[50px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-11 sm:min-w-[58px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="GAP" className="scale-90" />
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
                    className="flex h-10 min-w-[50px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-11 sm:min-w-[58px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="MUD" className="scale-90" />
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
                    className="flex h-10 min-w-[50px] shrink-0 items-center justify-center rounded-xl border border-violet-500/80 bg-slate-800 px-1 transition-transform active:scale-95 hover:border-violet-300 sm:h-11 sm:min-w-[58px] sm:px-1.5"
                  >
                    <BlockIcon type="IF" condition="RAMP" className="scale-90" />
                  </button>
                </>
              )}
            </div>

            {/* Right Controls: Block Par Counter, Trash, Guide, Hint, Collapse, Step & Run Buttons */}
            <div className="flex shrink-0 items-center justify-between gap-1.5 sm:justify-end">
              <div className="flex flex-wrap items-center gap-1">
                <div
                  aria-label={`Blocks ${totalBlocks} of ${parBlocks}`}
                  className={`flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 tabular-nums text-[11px] font-black sm:h-9 sm:text-xs ${
                    totalBlocks <= parBlocks
                      ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : 'border border-amber-500/50 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  <Puzzle className="h-3.5 w-3.5" />
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
                    className={`hidden h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-extrabold tracking-wide transition-colors md:flex sm:h-9 ${getTierBadgeStyle(
                      programTiers.optimality
                    )}`}
                  >
                    <span className="tabular font-black">T{programTiers.tierRank}</span>
                    <span className="opacity-85">· {programTiers.hint}</span>
                  </div>
                )}

                {onUndo && (
                  <button
                    id="undoCodeBtn"
                    type="button"
                    disabled={simulating || !canUndo}
                    onClick={onUndo}
                    aria-label="Undo Block Edit"
                    title="Undo (Ctrl+Z)"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:border-sky-400 disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:w-9"
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
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:border-sky-400 disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:w-9"
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:w-9 ${
                      showPathPreview
                        ? 'border-cyan-400/75 bg-cyan-500/20 text-cyan-200 hover:border-cyan-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Route className="h-3.5 w-3.5" aria-hidden="true" />
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
                  }}
                  aria-label="Clear All Blocks"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 sm:h-9 sm:w-9 ${
                    drag?.kind === 'existing' && drag.moved
                      ? 'border-rose-400 bg-rose-500/30 text-rose-200'
                      : 'border-slate-700 bg-slate-800 text-rose-300 hover:border-rose-400'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {onOpenDemo && !simulating && (
                  <button
                    type="button"
                    data-demo-cmd="GUIDE"
                    onClick={() =>
                      onOpenDemo(ifUnlocked ? 'IF' : loopUnlocked ? 'LOOP' : 'MOVE', ifUnlocked ? 'GAP' : undefined)
                    }
                    aria-label="Code Blocks Visual Guide"
                    title="Blocks Visual Guide"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/15 text-sky-200 transition-colors hover:border-sky-300 hover:bg-sky-500/25 active:scale-95 sm:h-9 sm:w-9"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                {onRequestHint && !simulating && (
                  <button
                    id="codeNeedHintBtn"
                    type="button"
                    onClick={onRequestHint}
                    aria-label="Need a Hint"
                    className="flex h-8 items-center gap-1 rounded-lg border border-amber-400/70 bg-amber-500/15 px-2 text-[11px] font-black text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-500/25 active:scale-95 sm:h-9"
                  >
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">Hint</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label={collapsed ? 'Expand Code Dock' : 'Collapse Code Dock'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 sm:h-9 sm:w-9"
                >
                  {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {!simulating ? (
                <div className="flex items-center gap-1.5">
                  {onStepProgram && (
                    <button
                      id="stepCodeBtn"
                      type="button"
                      onClick={onStepProgram}
                      aria-label="Step-Through Program"
                      className="flex h-8.5 items-center justify-center gap-1 rounded-xl border border-sky-300/90 bg-gradient-to-b from-sky-400 to-sky-600 px-2.5 text-[11px] font-black text-slate-950 shadow-[0_2px_0_#0369a1] transition-transform active:translate-y-0.5 sm:h-9.5 sm:px-3 sm:text-xs"
                    >
                      <StepForward className="h-3.5 w-3.5 stroke-[2.75] sm:h-4 sm:w-4" />
                      <span>Step</span>
                    </button>
                  )}

                  <button
                    id="runCodeBtn"
                    type="button"
                    onClick={onRunProgram}
                    aria-label="Run Robot Program"
                    className="flex h-8.5 min-w-[48px] items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 text-slate-950 shadow-[0_2px_0_#047857] transition-transform active:translate-y-0.5 sm:h-9.5 sm:min-w-[56px] sm:px-4"
                  >
                    <Play className="h-4.5 w-4.5 fill-slate-950 sm:h-5 sm:w-5" />
                  </button>
                </div>
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

          {/* Unboxed Inline Live Path Outcome Strip (visible while editing non-empty program) */}
          {!simulating && !collapsed && pathPreview && pathPreview.endpoint.status !== 'empty' && (
            <div
              data-testid="live-path-summary"
              data-path-status={pathPreview.endpoint.status}
              className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px] font-bold tracking-tight"
            >
              {pathPreview.endpoint.status === 'win' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : pathPreview.endpoint.status === 'hazard' ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
              ) : (
                <Compass className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
              )}
              <span
                className={
                  pathPreview.endpoint.status === 'win'
                    ? 'text-emerald-300'
                    : pathPreview.endpoint.status === 'hazard'
                      ? 'text-rose-300'
                      : 'text-sky-200'
                }
              >
                {pathPreview.endpoint.summaryLabel}
              </span>
              <span className="tabular-nums text-slate-400">
                · {pathPreview.segments.length} {pathPreview.segments.length === 1 ? 'step' : 'steps'}
              </span>
              {pathPreview.endpoint.totalCrystals > 0 && (
                <span className="inline-flex items-center gap-1 tabular-nums text-cyan-300">
                  <span className="text-slate-500">·</span>
                  <Diamond className="h-3 w-3 fill-cyan-300/75 text-cyan-300" aria-hidden="true" />
                  <span>
                    {pathPreview.endpoint.collectedCrystals}/{pathPreview.endpoint.totalCrystals}
                  </span>
                </span>
              )}
              {!showPathPreview && (
                <span className="text-slate-500">· 3D route hidden</span>
              )}
            </div>
          )}

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
                className={`no-scrollbar touch-pan-x mt-1.5 flex min-h-[50px] items-center gap-1.5 overflow-x-auto rounded-xl border border-dashed px-2 py-1 transition-transform duration-150 sm:min-h-[56px] sm:px-2.5 sm:py-1.5 ${
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
                    {program.map((blk) => renderBlock(blk))}
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
