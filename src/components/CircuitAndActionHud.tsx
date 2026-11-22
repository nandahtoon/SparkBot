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
  Magnet,
  RotateCw,
  Zap
} from 'lucide-react';
import { traceCircuit, type ActionDashMetrics, type CircuitGrid, type TutorialStep } from '../game/engine';

interface CircuitOverlayProps {
  circuitGrid: CircuitGrid;
  tutorialStep: TutorialStep | null;
  ghostHelp: boolean;
  onTapCell: (r: number, c: number) => void;
  onOpenDemo?: (topic: 'CIRCUIT_MIRROR' | 'CIRCUIT_SPLITTER') => void;
}

export const CircuitOverlay: React.FC<CircuitOverlayProps> = ({
  circuitGrid,
  tutorialStep,
  ghostHelp,
  onTapCell,
  onOpenDemo
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
    <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-2.5 sm:gap-3 sm:px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-3xl border-2 border-cyan-400/70 bg-slate-900/95 px-3 py-2.5 shadow-2xl sm:gap-3 sm:px-4 sm:py-3">
        {/* Core Power Tally */}
        <div
          aria-label={`Cores ${trace.litCount} of ${trace.totalCores}`}
          className={`flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border-2 px-3 tabular text-base font-black sm:h-14 sm:gap-2 sm:px-3.5 sm:text-lg ${
            trace.solved
              ? 'border-emerald-300 bg-emerald-500/25 text-emerald-200'
              : 'border-cyan-400/60 bg-slate-800 text-cyan-300'
          }`}
        >
          <Cpu className="h-5 w-5 sm:h-6 sm:w-6" />
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-cyan-400/70 bg-slate-800 text-cyan-300 shadow hover:border-cyan-200 active:scale-95 sm:h-12 sm:w-12"
          >
            <BookOpen className="h-5 w-5" />
          </button>
        )}

        {/* Accessible Mirror / Splitter Quick-Rotate Tactile Chips */}
        <div className="no-scrollbar touch-pan-x flex items-center gap-2 overflow-x-auto py-0.5">
          {mirrors.map((m) => {
            const isHint =
              ghostHelp &&
              tutorialStep?.targetType === 'circuit' &&
              tutorialStep.circuitTarget?.r === m.r &&
              tutorialStep.circuitTarget?.c === m.c;
            return (
              <button
                key={`${m.r},${m.c}`}
                type="button"
                data-circuit-cell={`${m.r},${m.c}`}
                onClick={() => onTapCell(m.r, m.c)}
                aria-label={`Rotate ${m.type} ${m.r + 1},${m.c + 1}`}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-transform active:scale-90 sm:h-14 sm:w-14 ${
                  isHint
                    ? 'border-amber-300 bg-amber-400/25 shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                    : m.type === 'splitter'
                      ? 'border-violet-400 bg-slate-800 hover:border-violet-200'
                      : 'border-cyan-400/80 bg-slate-800 hover:border-cyan-200'
                }`}
              >
                <div
                  className={`h-1.5 w-7 rounded-full transition-transform duration-150 sm:w-8 ${
                    m.type === 'splitter' ? 'bg-violet-300' : 'bg-cyan-300'
                  }`}
                  style={{ transform: `rotate(${m.rot === 0 ? -45 : 45}deg)` }}
                />
                <RotateCw className="absolute right-1 bottom-1 h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5" />
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
    <div className="pointer-events-none safe-bottom fixed inset-0 z-20 flex flex-col justify-between px-3 pt-[max(6.25rem,calc(env(safe-area-inset-top)+5.5rem))] sm:px-5 sm:pt-20">
      {/* Top Runner Numeric Counters */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
        <div
          aria-label={`Scrap Bolts ${metrics.bolts}`}
          className="flex h-10 items-center gap-1.5 rounded-2xl border-2 border-amber-400/80 bg-slate-900/94 px-2.5 tabular text-sm font-black text-amber-300 shadow-lg sm:h-12 sm:px-3.5 sm:text-base"
        >
          <Zap className="h-4 w-4 fill-amber-400 text-amber-400 sm:h-5 sm:w-5" />
          <span>{metrics.bolts}</span>
        </div>

        <div
          aria-label={`Trash Cubes ${metrics.cubes}`}
          className="flex h-10 items-center gap-1.5 rounded-2xl border-2 border-sky-400/80 bg-slate-900/94 px-2.5 tabular text-sm font-black text-sky-300 shadow-lg sm:h-12 sm:px-3.5 sm:text-base"
        >
          <Box className="h-4 w-4 text-sky-300 sm:h-5 sm:w-5" />
          <span>{metrics.cubes}</span>
          <span className="ml-0.5 h-2 w-10 overflow-hidden rounded-full bg-slate-800 sm:ml-1 sm:h-2.5 sm:w-12">
            <span
              className="block h-full bg-sky-400 transition-all"
              style={{ width: `${Math.round((metrics.boltMeter / Math.max(1, metrics.boltPerCube)) * 100)}%` }}
            />
          </span>
        </div>

        <div
          aria-label={`Distance ${Math.floor(metrics.distance)} meters`}
          className="flex h-10 items-center gap-1.5 rounded-2xl border-2 border-emerald-400/80 bg-slate-900/94 px-2.5 tabular text-sm font-black text-emerald-300 shadow-lg sm:h-12 sm:gap-2 sm:px-3.5 sm:text-base"
        >
          <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>{Math.floor(metrics.distance)}</span>
          {metrics.targetDistance > 0 && (
            <span className="h-2 w-12 overflow-hidden rounded-full bg-slate-800 sm:h-2.5 sm:w-16">
              <span className="block h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </span>
          )}
        </div>

        {metrics.magnetTimer > 0 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-indigo-400 bg-slate-900/94 text-indigo-300 sm:h-12 sm:w-12">
            <Magnet className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        {metrics.turboTimer > 0 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-pink-400 bg-slate-900/94 text-pink-300 sm:h-12 sm:w-12">
            <Flame className="h-4 w-4 fill-pink-400 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>

      {/* Bottom Oversized Touch/Click Controls (>= 64px on phone, 80px on tablet/desktop) */}
      <div className="flex items-end justify-between gap-4 pb-1 sm:pb-2">
        <div className="pointer-events-auto flex gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSteer(-1)}
            aria-label="Move Left or Left Wall"
            className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-sky-300 bg-slate-900/94 text-sky-300 shadow-xl active:scale-90 sm:h-20 sm:w-20"
          >
            <ArrowLeft className="h-8 w-8 stroke-[3] sm:h-10 sm:w-10" />
          </button>
          <button
            type="button"
            onClick={() => onSteer(1)}
            aria-label="Move Right or Right Wall"
            className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-sky-300 bg-slate-900/94 text-sky-300 shadow-xl active:scale-90 sm:h-20 sm:w-20"
          >
            <ArrowRight className="h-8 w-8 stroke-[3] sm:h-10 sm:w-10" />
          </button>
        </div>

        <button
          type="button"
          onClick={onJump}
          aria-label="Jump"
          className="pointer-events-auto flex h-16 w-20 items-center justify-center rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-[0_6px_0_#b45309] active:translate-y-1 sm:h-20 sm:w-24"
        >
          <ArrowUp className="h-8 w-8 stroke-[3.5] sm:h-10 sm:w-10" />
        </button>
      </div>
    </div>
  );
};
