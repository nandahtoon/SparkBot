import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Diamond,
  Eye,
  MapPin,
  Pause,
  Play,
  Puzzle,
  Square,
  StepForward,
  Trash2,
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
import {
  computeBlockNestingDepth,
  type CodeComplexityTier
} from '../game/codeFeedback';
import type { DemoTopic } from './ConceptDemoPopover';
import { BlockIcon } from './Icons';

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
  onChangeProgram: (next: CodeBlock[]) => void;
  onBlockPlaced?: (info: { block: CodeBlock; nestingDepth: number }) => void;
  onRunProgram: () => void;
  onStepProgram?: () => void;
  onToggleSimPause?: () => void;
  onNextSimStep?: () => void;
  onStopSim?: () => void;
  onOpenDemo?: (topic: DemoTopic, condition?: SensorCondition) => void;
}

interface DragCmdPayload {
  kind: 'new' | 'existing';
  type: CodeBlock['type'];
  condition?: SensorCondition;
  blockId?: string;
  x: number;
  y: number;
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
  onChangeProgram,
  onBlockPlaced,
  onRunProgram,
  onStepProgram,
  onToggleSimPause,
  onNextSimStep,
  onStopSim,
  onOpenDemo
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragCmdPayload | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const railRef = useRef<HTMLDivElement | null>(null);

  const totalBlocks = countBlocks(program);
  const ancestorIdSet = useMemo(
    () => new Set(collectAncestorBlockIds(program, activeBlockId)),
    [program, activeBlockId]
  );

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
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
    setDrag({ ...cur, x: e.clientX, y: e.clientY, moved: cur.moved || dist > 10 });
  }

  function handlePointerUp(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    setDrag(null);

    if (cur.kind === 'new') {
      if (cur.moved) {
        const dz = findDropZoneAt(e.clientX, e.clientY);
        if (dz === 'TRASH') return;
        const targetContainer = dz && dz !== 'ROOT' ? dz : null;
        const created = makeBlock(cur.type, cur.condition);
        const nextProgram = insertIntoContainer(program, targetContainer, created);
        onChangeProgram(nextProgram);
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
        const nextProgram = insertIntoContainer(program, canNest ? activeContainerId : null, created);
        onChangeProgram(nextProgram);
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
        const dz = findDropZoneAt(e.clientX, e.clientY);
        if (dz === 'TRASH') {
          const { next } = removeBlockById(program, cur.blockId);
          if (activeContainerId === cur.blockId) setActiveContainerId(null);
          onChangeProgram(next);
          return;
        }
        if (dz && dz !== cur.blockId) {
          const { next, removed } = removeBlockById(program, cur.blockId);
          if (removed) {
            const target = dz === 'ROOT' ? null : dz;
            const nextProgram = insertIntoContainer(next, target, removed);
            onChangeProgram(nextProgram);
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
    const isAncestor = !isActive && ancestorIdSet.has(blk.id);
    const isContainerFocused = activeContainerId === blk.id;

    if (blk.type === 'LOOP' || blk.type === 'IF') {
      const isLoop = blk.type === 'LOOP';
      return (
        <div
          key={blk.id}
          data-block-id={blk.id}
          data-block-active={isActive ? 'true' : 'false'}
          data-block-ancestor={isAncestor ? 'true' : 'false'}
          data-drop-zone={blk.id}
          onPointerDown={(e) => handleExistingDown(e, blk)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative flex shrink-0 items-center gap-1.5 rounded-2xl border-2 px-2 py-1.5 transition-all ${
            isActive
              ? 'border-amber-300 bg-amber-400/25 ring-2 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.7)]'
              : isAncestor
                ? 'border-cyan-300 bg-cyan-500/15 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                : isContainerFocused
                  ? isLoop
                    ? 'border-emerald-300 bg-emerald-500/20'
                    : 'border-violet-300 bg-violet-500/20'
                  : isLoop
                    ? 'border-emerald-500/70 bg-slate-800/95'
                    : 'border-violet-500/70 bg-slate-800/95'
          }`}
        >
          {isActive && stepInspection && (
            <span className="tabular absolute -left-1.5 -top-2.5 z-10 rounded-md border border-amber-200 bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950 shadow">
              #{stepInspection.stepNumber}
            </span>
          )}
          <div className="flex flex-col items-center gap-0.5 pr-1">
            <BlockIcon type={blk.type} condition={blk.condition} className="h-7 w-7" />
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
                className="tabular rounded-lg bg-emerald-400 px-1.5 py-0.5 text-xs font-black text-slate-950"
              >
                ×{blk.count || 2}
              </button>
            )}
          </div>

          <div
            data-drop-zone={blk.id}
            className="flex min-h-[54px] min-w-[60px] items-center gap-1.5 rounded-xl border border-dashed border-slate-500/70 bg-slate-950/60 px-2 py-1"
          >
            {(blk.children || []).length === 0 ? (
              <span className="h-3 w-3 rounded-full bg-slate-600/80 mx-auto" />
            ) : (
              (blk.children || []).map((child) => renderBlock(child))
            )}
          </div>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const { next } = removeBlockById(program, blk.id);
              if (activeContainerId === blk.id) setActiveContainerId(null);
              onChangeProgram(next);
            }}
            aria-label="Remove Block"
            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-slate-200 hover:bg-rose-500"
          >
            <X className="h-3.5 w-3.5" />
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
        onPointerDown={(e) => handleExistingDown(e, blk)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 bg-slate-800 transition-all ${
          isActive
            ? 'border-amber-300 bg-amber-400/30 scale-110 ring-2 ring-amber-300/80 shadow-[0_0_22px_rgba(251,191,36,0.78)]'
            : border
        }`}
      >
        {isActive && stepInspection && (
          <span className="tabular absolute -left-2 -top-2.5 z-10 rounded-md border border-amber-200 bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950 shadow">
            #{stepInspection.stepNumber}
          </span>
        )}
        <BlockIcon type={blk.type} className="h-8 w-8" />
        {!simulating && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const { next } = removeBlockById(program, blk.id);
              onChangeProgram(next);
            }}
            aria-label="Remove Block"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-200 hover:bg-rose-500"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {drag && drag.moved && (
        <div
          style={{
            left: `${drag.x}px`,
            top: `${drag.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
          className="pointer-events-none fixed z-50 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-sky-300 bg-slate-900/95 shadow-2xl"
        >
          <BlockIcon type={drag.type} condition={drag.condition} className="h-10 w-10" />
        </div>
      )}

      <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-2 sm:px-3">
        <div
          data-code-feedback-tier={lastFeedbackTier || ''}
          className="pointer-events-auto w-full max-w-5xl rounded-3xl border border-slate-600/80 bg-slate-900/95 px-2.5 py-2 shadow-2xl sm:border-2 sm:border-slate-700 sm:px-3.5 sm:py-2.5"
        >
          {/* Top Row: Command Palette + Right Action Controls (stacked cleanly on phones, side-by-side on sm+) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar touch-pan-x flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5 pr-1 sm:gap-2">
              {(['MOVE', 'JUMP', 'BOOST'] as const).map((cmd) => {
                const isHint =
                  ghostHelp &&
                  tutorialStep?.targetType === 'cmd' &&
                  tutorialStep.targetKey === cmd;
                return (
                  <div key={cmd} className="relative shrink-0">
                    <button
                      type="button"
                      data-add-cmd={cmd}
                      aria-label={cmd}
                      onPointerDown={(e) => handlePaletteDown(e, cmd)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className={`flex h-13 w-13 items-center justify-center rounded-2xl border-2 bg-slate-800 transition-transform active:scale-95 sm:h-16 sm:w-16 ${
                        isHint
                          ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                          : 'border-slate-600 hover:border-sky-400'
                      }`}
                    >
                      <BlockIcon type={cmd} className="h-7 w-7 sm:h-9 sm:w-9" />
                    </button>
                    {onOpenDemo && (
                      <button
                        type="button"
                        data-demo-cmd={cmd}
                        aria-label={`${cmd} Visual Demo`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemo(cmd);
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/80 bg-slate-900 text-sky-300 shadow hover:bg-sky-500 hover:text-slate-950"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {loopUnlocked && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    data-add-cmd="LOOP"
                    aria-label="LOOP"
                    onPointerDown={(e) => handlePaletteDown(e, 'LOOP')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex h-13 w-13 items-center justify-center rounded-2xl border-2 border-emerald-500/75 bg-slate-800 transition-transform active:scale-95 hover:border-emerald-300 sm:h-16 sm:w-16"
                  >
                    <BlockIcon type="LOOP" className="h-7 w-7 sm:h-9 sm:w-9" />
                  </button>
                  {onOpenDemo && (
                    <button
                      type="button"
                      data-demo-cmd="LOOP"
                      aria-label="LOOP Visual Demo"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDemo('LOOP');
                      }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/80 bg-slate-900 text-emerald-300 shadow hover:bg-emerald-500 hover:text-slate-950"
                    >
                      <BookOpen className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Sensor Conditional Blocks: IF [GAP], IF [MUD], IF [RAMP] */}
              {(ifUnlocked || loopUnlocked) && (
                <>
                  <div className="relative shrink-0">
                    <button
                      id="addIfGapBtn"
                      type="button"
                      data-add-cmd="IF"
                      data-if-cond="GAP"
                      aria-label="IF GAP"
                      onPointerDown={(e) => handlePaletteDown(e, 'IF', 'GAP')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="flex h-13 min-w-[64px] items-center justify-center rounded-2xl border-2 border-violet-500/80 bg-slate-800 px-1.5 transition-transform active:scale-95 hover:border-violet-300 sm:h-16 sm:min-w-[74px] sm:px-2"
                    >
                      <BlockIcon type="IF" condition="GAP" />
                    </button>
                    {onOpenDemo && (
                      <button
                        type="button"
                        data-demo-cmd="IF_GAP"
                        aria-label="IF GAP Visual Demo"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemo('IF', 'GAP');
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/80 bg-slate-900 text-violet-300 shadow hover:bg-violet-500 hover:text-slate-950"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <button
                      id="addIfMudBtn"
                      type="button"
                      data-add-cmd="IF"
                      data-if-cond="MUD"
                      aria-label="IF MUD"
                      onPointerDown={(e) => handlePaletteDown(e, 'IF', 'MUD')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="flex h-13 min-w-[64px] items-center justify-center rounded-2xl border-2 border-violet-500/80 bg-slate-800 px-1.5 transition-transform active:scale-95 hover:border-violet-300 sm:h-16 sm:min-w-[74px] sm:px-2"
                    >
                      <BlockIcon type="IF" condition="MUD" />
                    </button>
                    {onOpenDemo && (
                      <button
                        type="button"
                        data-demo-cmd="IF_MUD"
                        aria-label="IF MUD Visual Demo"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemo('IF', 'MUD');
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/80 bg-slate-900 text-violet-300 shadow hover:bg-violet-500 hover:text-slate-950"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <button
                      id="addIfRampBtn"
                      type="button"
                      data-add-cmd="IF"
                      data-if-cond="RAMP"
                      aria-label="IF RAMP"
                      onPointerDown={(e) => handlePaletteDown(e, 'IF', 'RAMP')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="flex h-13 min-w-[64px] items-center justify-center rounded-2xl border-2 border-violet-500/80 bg-slate-800 px-1.5 transition-transform active:scale-95 hover:border-violet-300 sm:h-16 sm:min-w-[74px] sm:px-2"
                    >
                      <BlockIcon type="IF" condition="RAMP" />
                    </button>
                    {onOpenDemo && (
                      <button
                        type="button"
                        data-demo-cmd="IF_RAMP"
                        aria-label="IF RAMP Visual Demo"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemo('IF', 'RAMP');
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/80 bg-slate-900 text-violet-300 shadow hover:bg-violet-500 hover:text-slate-950"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Controls: Block Par Counter, Trash, Collapse, Step & Run Buttons */}
            <div className="flex shrink-0 items-center justify-between gap-1.5 sm:justify-end sm:gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  aria-label={`Blocks ${totalBlocks} of ${parBlocks}`}
                  className={`flex h-10 items-center gap-1.5 rounded-xl px-2.5 tabular text-xs font-black sm:h-12 sm:px-3 sm:text-sm ${
                    totalBlocks <= parBlocks
                      ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : 'border border-amber-500/50 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  <Puzzle className="h-4 w-4" />
                  <span>
                    {totalBlocks}/{parBlocks}
                  </span>
                </div>

                <button
                  type="button"
                  data-drop-zone="TRASH"
                  disabled={simulating}
                  onClick={() => {
                    setActiveContainerId(null);
                    onChangeProgram([]);
                  }}
                  aria-label="Clear All Blocks"
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors disabled:opacity-40 sm:h-12 sm:w-12 ${
                    drag?.kind === 'existing' && drag.moved
                      ? 'border-rose-400 bg-rose-500/30 text-rose-200'
                      : 'border-slate-700 bg-slate-800 text-rose-300 hover:border-rose-400'
                  }`}
                >
                  <Trash2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label={collapsed ? 'Expand Code Dock' : 'Collapse Code Dock'}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 sm:h-12"
                >
                  {collapsed ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>

              {!simulating ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {onStepProgram && (
                    <button
                      id="stepCodeBtn"
                      type="button"
                      onClick={onStepProgram}
                      aria-label="Step-Through Program"
                      className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border-2 border-sky-300/90 bg-gradient-to-b from-sky-400 to-sky-600 px-3 text-xs font-black text-slate-950 shadow-[0_4px_0_#0369a1] transition-transform active:translate-y-0.5 sm:h-14 sm:px-4 sm:text-sm lg:h-16"
                    >
                      <StepForward className="h-4.5 w-4.5 stroke-[2.75] sm:h-5 sm:w-5" />
                      <span>Step</span>
                    </button>
                  )}

                  <button
                    id="runCodeBtn"
                    type="button"
                    onClick={onRunProgram}
                    aria-label="Run Robot Program"
                    className="flex h-12 min-w-[64px] items-center justify-center rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3.5 text-slate-950 shadow-[0_4px_0_#047857] transition-transform active:translate-y-0.5 sm:h-14 sm:min-w-[74px] sm:px-5 lg:h-16"
                  >
                    <Play className="h-7 w-7 fill-slate-950 sm:h-8 sm:w-8" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" role="group" aria-label="Simulation Step Controls">
                  {onToggleSimPause && (
                    <button
                      id="simPauseResumeBtn"
                      type="button"
                      onClick={onToggleSimPause}
                      aria-label={simPaused ? 'Resume Simulation' : 'Pause Simulation'}
                      className={`flex h-11 items-center gap-1.5 rounded-2xl border-2 px-2.5 text-xs font-black transition-transform active:translate-y-0.5 sm:h-14 sm:px-3.5 sm:text-sm ${
                        simPaused
                          ? 'border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_4px_0_#047857]'
                          : 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_4px_0_#b45309]'
                      }`}
                    >
                      {simPaused ? (
                        <>
                          <Play className="h-4 w-4 fill-slate-950" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 fill-slate-950" />
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
                      className="flex h-11 items-center gap-1.5 rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-400 to-sky-600 px-2.5 text-xs font-black text-slate-950 shadow-[0_4px_0_#0369a1] transition-transform active:translate-y-0.5 sm:h-14 sm:px-3.5 sm:text-sm"
                    >
                      <StepForward className="h-4 w-4 stroke-[2.75]" />
                      <span>{stepInspection?.isLastStep && simAwaitingStep ? 'Finish' : 'Next'}</span>
                    </button>
                  )}

                  {onStopSim && (
                    <button
                      id="simStopBtn"
                      type="button"
                      onClick={onStopSim}
                      aria-label="Stop and Reset Simulation"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-rose-400/80 bg-rose-500/20 text-rose-200 transition-transform hover:bg-rose-500/35 active:scale-95 sm:h-14 sm:w-12"
                    >
                      <Square className="h-4 w-4 fill-current" />
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
              className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/45 bg-slate-950/90 px-2.5 py-1.5 text-xs shadow-inner sm:px-3 sm:py-2"
            >
              {/* Left: Step Counter + State Pill + Instruction Outcome */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="tabular rounded-lg border border-amber-300/60 bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200 sm:text-[11px]">
                  STEP {stepInspection.stepNumber}/{stepInspection.totalSteps}
                </span>
                <span
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    stepInspection.isFailure
                      ? 'border-rose-400/70 bg-rose-500/25 text-rose-200'
                      : simPaused
                        ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                        : 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {stepInspection.isFailure ? 'Alert' : simPaused ? 'Paused · Inspect' : 'Running'}
                </span>
                <span className="text-[11px] font-bold text-slate-100 sm:text-xs">{stepInspection.statusLabel}</span>
              </div>

              {/* Right: Live Robot Telemetry Readout (Position, Sensor Ahead, Crystals, Hardware) */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold sm:text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 tabular ${TILE_BADGE_STYLE[stepInspection.currentTileType]}`}
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span>
                    Tile {stepInspection.tilePosition}/{stepInspection.gateIndex} ·{' '}
                    {stepInspection.currentTileType.toUpperCase()}
                  </span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 ${TILE_BADGE_STYLE[stepInspection.aheadTileType]}`}
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  <span>Ahead: {stepInspection.aheadTileType.toUpperCase()}</span>
                </span>

                <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2 py-0.5 text-cyan-200 tabular">
                  <Diamond className="h-3 w-3 fill-cyan-300 text-cyan-300" aria-hidden="true" />
                  <span>
                    {stepInspection.crystalsCollected}/{stepInspection.totalCrystals}
                  </span>
                </span>

                {stepInspection.activeCapabilities.length > 0 && (
                  <span className="hidden items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-slate-300 md:inline-flex">
                    <Cpu className="h-3 w-3 text-sky-300" aria-hidden="true" />
                    <span>{stepInspection.activeCapabilities.join(' · ')}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Visual Sequence Rail */}
          {!collapsed && (
            <div
              ref={railRef}
              data-drop-zone="ROOT"
              onClick={() => setActiveContainerId(null)}
              className="no-scrollbar touch-pan-x mt-2 flex min-h-[64px] items-center gap-2 overflow-x-auto rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/75 px-2.5 py-1.5 sm:mt-2.5 sm:min-h-[72px] sm:px-3 sm:py-2"
            >
              {program.length === 0 ? (
                <div className="mx-auto flex items-center gap-2 text-slate-500">
                  <span className="h-3 w-3 rounded-full bg-sky-400/50" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/50" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/50" />
                </div>
              ) : (
                program.map((blk) => renderBlock(blk))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
