import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Box,
  Cpu,
  Flame,
  Gauge,
  Lightbulb,
  Magnet,
  RotateCw,
  Zap
} from 'lucide-react';
import { traceCircuit, type ActionDashMetrics, type CircuitGrid, type TutorialStep } from '../game/engine';

interface CircuitOverlayProps {
  circuitGrid: CircuitGrid;
  tutorialStep: TutorialStep | null;
  ghostHelp: boolean;
  highlightCell?: { r: number; c: number } | null;
  hintBanner?: React.ReactNode;
  onTapCell: (r: number, c: number) => void;
  onOpenDemo?: (topic: 'CIRCUIT_MIRROR' | 'CIRCUIT_SPLITTER') => void;
  onRequestHint?: () => void;
}

export const CircuitOverlay: React.FC<CircuitOverlayProps> = ({
  circuitGrid,
  tutorialStep,
  ghostHelp,
  highlightCell = null,
  hintBanner = null,
  onTapCell,
  onOpenDemo,
  onRequestHint
}) => {
  const trace = traceCircuit(circuitGrid);

  // Collect toggleable mirrors & splitters for accessible 1-tap chips below the 3D gate
  const mirrors: Array<{ r: number; c: number; type: string; rot: number }> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = circuitGrid[r]?.[c];
      if (cell && (cell.type === 'mirror' || cell.type === 'splitter')) {
        mirrors.push({ r, c, type: cell.type, rot: cell.rot });
      }
    }
  }

  return (
    <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 px-2 pb-1 sm:gap-2 sm:px-3 sm:pb-1.5">
      {hintBanner}
      <div className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-3xl border border-cyan-400/55 bg-slate-900/95 px-2.5 py-2 shadow-2xl backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2">
        {/* Core Power Tally */}
        <div
          aria-label={`Cores ${trace.litCount} of ${trace.totalCores}`}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 tabular text-sm font-black sm:h-10 sm:px-3 sm:text-base ${
            trace.solved
              ? 'border-emerald-300 bg-emerald-500/25 text-emerald-200'
              : 'border-cyan-400/60 bg-slate-800 text-cyan-300'
          }`}
        >
          <Cpu className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          <span>
            {trace.litCount}/{trace.totalCores}
          </span>
        </div>

        {onOpenDemo && (
          <button
            type="button"
            data-demo-circuit="true"
            onClick={() =>
              onOpenDemo(mirrors.some((m) => m.type === 'splitter') ? 'CIRCUIT_SPLITTER' : 'CIRCUIT_MIRROR')
            }
            aria-label="Laser Optics Visual Demo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/70 bg-slate-800 text-cyan-300 shadow hover:border-cyan-200 active:scale-95 sm:h-11 sm:w-11"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        )}

        {onRequestHint && (
          <button
            id="circuitNeedHintBtn"
            type="button"
            onClick={onRequestHint}
            aria-label="Circuit Hint"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/70 bg-amber-500/15 text-amber-300 shadow hover:border-amber-200 active:scale-95 sm:h-11 sm:w-11"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
        )}

        {/* Accessible Mirror / Splitter Quick-Rotate Tactile Chips */}
        <div className="no-scrollbar touch-pan-x flex items-center gap-1.5 overflow-x-auto py-0.5">
          {mirrors.map((m) => {
            const isHint =
              (ghostHelp &&
                tutorialStep?.targetType === 'circuit' &&
                tutorialStep.circuitTarget?.r === m.r &&
                tutorialStep.circuitTarget?.c === m.c) ||
              (highlightCell?.r === m.r && highlightCell?.c === m.c);
            return (
              <button
                key={`${m.r},${m.c}`}
                type="button"
                data-circuit-cell={`${m.r},${m.c}`}
                onClick={() => onTapCell(m.r, m.c)}
                aria-label={`Rotate ${m.type} ${m.r + 1},${m.c + 1}`}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform active:scale-90 sm:h-11 sm:w-11 ${
                  isHint
                    ? 'border-amber-300 bg-amber-400/25 shadow-[0_0_14px_rgba(251,191,36,0.65)]'
                    : m.type === 'splitter'
                      ? 'border-violet-400 bg-slate-800 hover:border-violet-200'
                      : 'border-cyan-400/80 bg-slate-800 hover:border-cyan-200'
                }`}
              >
                <div
                  className={`h-1 w-5 rounded-full transition-transform duration-150 sm:w-6 ${
                    m.type === 'splitter' ? 'bg-violet-300' : 'bg-cyan-300'
                  }`}
                  style={{ transform: `rotate(${m.rot === 0 ? -45 : 45}deg)` }}
                />
                <RotateCw className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 text-slate-400 sm:h-3 sm:w-3" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ActionRunHudProps {
  metrics: ActionDashMetrics;
  onSteer: (dir: -1 | 1) => void;
  onJump: () => void;
}

export const ActionRunHud: React.FC<ActionRunHudProps> = ({ metrics, onSteer, onJump }) => {
  const pct =
    metrics.targetDistance > 0
      ? Math.min(100, Math.round((metrics.distance / metrics.targetDistance) * 100))
      : 0;

  return (
    <div className="pointer-events-none safe-bottom fixed inset-0 z-20 flex flex-col justify-between px-2.5 pt-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] sm:px-4 sm:pt-14">
      {/* Top Runner Numeric Counters */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <div
          aria-label={`Scrap Bolts ${metrics.bolts}`}
          className="flex h-8 items-center gap-1 rounded-xl border border-amber-400/80 bg-slate-900/90 px-2 tabular text-xs font-black text-amber-300 shadow-lg backdrop-blur-sm sm:h-9 sm:px-2.5 sm:text-sm"
        >
          <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" />
          <span>{metrics.bolts}</span>
        </div>

        <div
          aria-label={`Trash Cubes ${metrics.cubes}`}
          className="flex h-8 items-center gap-1 rounded-xl border border-sky-400/80 bg-slate-900/90 px-2 tabular text-xs font-black text-sky-300 shadow-lg backdrop-blur-sm sm:h-9 sm:px-2.5 sm:text-sm"
        >
          <Box className="h-3.5 w-3.5 text-sky-300 sm:h-4 sm:w-4" />
          <span>{metrics.cubes}</span>
          <span className="ml-0.5 h-1.5 w-8 overflow-hidden rounded-full bg-slate-800 sm:w-10">
            <span
              className="block h-full bg-sky-400 transition-all"
              style={{ width: `${Math.round((metrics.boltMeter / Math.max(1, metrics.boltPerCube)) * 100)}%` }}
            />
          </span>
        </div>

        <div
          aria-label={`Distance ${Math.floor(metrics.distance)} meters`}
          className="flex h-8 items-center gap-1 rounded-xl border border-emerald-400/80 bg-slate-900/90 px-2 tabular text-xs font-black text-emerald-300 shadow-lg backdrop-blur-sm sm:h-9 sm:gap-1.5 sm:px-2.5 sm:text-sm"
        >
          <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{Math.floor(metrics.distance)}</span>
          {metrics.targetDistance > 0 && (
            <span className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-800 sm:w-12">
              <span className="block h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </span>
          )}
        </div>

        {metrics.magnetTimer > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-400 bg-slate-900/90 text-indigo-300 sm:h-9 sm:w-9">
            <Magnet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        )}
        {metrics.turboTimer > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-pink-400 bg-slate-900/90 text-pink-300 sm:h-9 sm:w-9">
            <Flame className="h-3.5 w-3.5 fill-pink-400 sm:h-4 sm:w-4" />
          </div>
        )}
      </div>

      {/* Bottom Compact Touch Controls */}
      <div className="flex items-end justify-between gap-3 pb-1 sm:pb-2">
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => onSteer(-1)}
            aria-label="Move Left or Left Wall"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/90 bg-slate-900/90 text-sky-300 shadow-xl backdrop-blur-sm active:scale-90 sm:h-14 sm:w-14"
          >
            <ArrowLeft className="h-6 w-6 stroke-[2.75] sm:h-7 sm:w-7" />
          </button>
          <button
            type="button"
            onClick={() => onSteer(1)}
            aria-label="Move Right or Right Wall"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/90 bg-slate-900/90 text-sky-300 shadow-xl backdrop-blur-sm active:scale-90 sm:h-14 sm:w-14"
          >
            <ArrowRight className="h-6 w-6 stroke-[2.75] sm:h-7 sm:w-7" />
          </button>
        </div>

        <button
          type="button"
          onClick={onJump}
          aria-label="Jump"
          className="pointer-events-auto flex h-12 w-16 items-center justify-center rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-[0_4px_0_#b45309] active:translate-y-0.5 sm:h-14 sm:w-20"
        >
          <ArrowUp className="h-6 w-6 stroke-[3] sm:h-7 sm:w-7" />
        </button>
      </div>
    </div>
  );
};
