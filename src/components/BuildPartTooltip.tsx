import React from 'react';
import { Compass, Cpu, Star, Wrench, Zap } from 'lucide-react';
import { PARTS } from '../game/engine';
import type { PartBuildPlan } from '../game/partTooltips';
import { PartIcon } from './Icons';

interface BuildPartTooltipProps {
  plan: PartBuildPlan;
  anchorX: number;
  anchorTop: number;
}

export const BuildPartTooltip: React.FC<BuildPartTooltipProps> = ({
  plan,
  anchorX,
  anchorTop
}) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const tooltipWidth = Math.min(340, vw - 24);
  const halfW = tooltipWidth / 2;
  const clampedCenterX = Math.max(halfW + 12, Math.min(vw - halfW - 12, anchorX));
  const arrowOffsetX = Math.max(
    -halfW + 22,
    Math.min(halfW - 22, anchorX - clampedCenterX)
  );
  // Keep tooltip positioned cleanly above the hovered part card without clipping off top of viewport
  const desiredBottom = vh - anchorTop + 14;
  const maxSafeBottom = Math.max(108, vh - 330);
  const bottomOffset = Math.max(108, Math.min(desiredBottom, maxSafeBottom));

  const {
    part,
    installedCount,
    currentUsedEnergy,
    netEnergyDelta,
    projectedEnergy,
    budget,
    parBudget,
    remainingAfter,
    canAfford,
    budgetShortfall,
    withinParBudget,
    requiresFrontColumn,
    replacesDrivePart,
    missionRelevance,
    missionReason
  } = plan;

  const safeBudget = Math.max(1, budget);
  const currentPct = Math.min(100, Math.round((currentUsedEnergy / safeBudget) * 100));
  const projectedPct = Math.min(100, Math.round((projectedEnergy / safeBudget) * 100));
  const parPct = Math.min(100, Math.round((parBudget / safeBudget) * 100));

  const deltaLabel =
    replacesDrivePart !== null
      ? netEnergyDelta > 0
        ? `Swap +${netEnergyDelta}`
        : netEnergyDelta < 0
          ? `Swap ${netEnergyDelta}`
          : 'Swap 0'
      : `${part.cost}`;

  const relevanceBadge =
    missionRelevance === 'required'
      ? {
          label: 'Required',
          cls: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
        }
      : missionRelevance === 'recommended'
        ? {
            label: 'Track Fit',
            cls: 'border-amber-400/50 bg-amber-500/15 text-amber-200'
          }
        : {
            label: 'Optional',
            cls: 'border-slate-600/80 bg-slate-800/80 text-slate-300'
          };

  return (
    <div
      id={`part-tooltip-${part.id}`}
      role="tooltip"
      data-testid="build-part-tooltip"
      data-tooltip-part={part.id}
      style={{
        left: `${clampedCenterX}px`,
        bottom: `${bottomOffset}px`,
        width: `${tooltipWidth}px`,
        transform: 'translateX(-50%)'
      }}
      className="anim-tooltip-pop pointer-events-none fixed z-40 rounded-2xl border-2 border-slate-700/95 bg-slate-950/98 p-3.5 text-left shadow-[0_18px_46px_rgba(2,6,23,0.9)]"
    >
      {/* Top Color Accent Bar */}
      <div
        className="absolute inset-x-4 top-0 h-0.5 rounded-full"
        style={{ backgroundColor: part.color }}
        aria-hidden="true"
      />

      {/* Header: Icon + Name + Capability Tag + Energy Cost */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <PartIcon id={part.id} className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{part.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span
                className="inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-black tracking-wide"
                style={{
                  borderColor: `${part.color}66`,
                  backgroundColor: `${part.color}1a`,
                  color: part.color
                }}
              >
                {part.unlocksLabel}
              </span>
              <span
                className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${relevanceBadge.cls}`}
              >
                {relevanceBadge.label}
              </span>
              {installedCount > 0 && (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                  Equipped ×{installedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          data-testid="tooltip-energy-cost"
          className={`flex shrink-0 flex-col items-end rounded-xl border px-2 py-1 ${
            canAfford
              ? 'border-amber-400/45 bg-amber-500/15 text-amber-200'
              : 'border-rose-400/55 bg-rose-500/20 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-0.5 text-xs font-black tabular">
            <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>{part.cost}</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-85">
            Energy
          </span>
        </div>
      </div>

      {/* Live Energy Budget Planner */}
      <div
        data-testid="tooltip-budget-plan"
        className="mt-2.5 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-2"
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
          <span className="text-slate-300">
            {replacesDrivePart
              ? `Replaces ${PARTS[replacesDrivePart].short} (${deltaLabel}⚡)`
              : 'After Attach'}
          </span>
          <span
            className={`tabular font-black ${
              !canAfford
                ? 'text-rose-300'
                : withinParBudget
                  ? 'text-emerald-300'
                  : 'text-amber-300'
            }`}
          >
            {projectedEnergy}/{budget}⚡
          </span>
        </div>

        {/* Mini Projected Energy Bar with 3-Star Par Marker */}
        <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          {/* Projected total */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
              !canAfford
                ? 'bg-rose-500/80'
                : withinParBudget
                  ? 'bg-emerald-400/65'
                  : 'bg-amber-400/70'
            }`}
            style={{ width: `${projectedPct}%` }}
          />
          {/* Currently used base */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sky-400"
            style={{ width: `${Math.min(currentPct, projectedPct)}%` }}
          />
          {/* 3-Star Par Budget Notch */}
          {parBudget > 0 && parBudget < budget && (
            <div
              className="absolute inset-y-0 w-0.5 bg-amber-200/90"
              style={{ left: `${parPct}%` }}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-bold">
          {!canAfford ? (
            <span className="tabular text-rose-300">
              Over budget — Need +{budgetShortfall}⚡
            </span>
          ) : (
            <span className="tabular text-slate-300">
              {remainingAfter}⚡ remaining
            </span>
          )}
          <span
            className={`inline-flex items-center gap-0.5 tabular ${
              withinParBudget ? 'text-amber-300' : 'text-slate-400'
            }`}
          >
            <Star
              className={`h-2.5 w-2.5 ${withinParBudget ? 'fill-amber-300' : ''}`}
              aria-hidden="true"
            />
            <span>Par ≤{parBudget}⚡</span>
          </span>
        </div>
      </div>

      {/* Specific Function */}
      <div className="mt-2.5">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-300">
          <Wrench className="h-3 w-3" aria-hidden="true" />
          <span>Function</span>
        </div>
        <p
          data-testid="tooltip-part-function"
          className="mt-0.5 text-xs font-medium leading-snug text-slate-100"
        >
          {part.functionSummary}
        </p>
      </div>

      {/* Mission Planning Insight */}
      <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-slate-800 bg-slate-900/75 px-2.5 py-1.5">
        <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="text-[11px] font-semibold leading-snug text-slate-200">
          {missionReason}
        </p>
      </div>

      {/* Logic & Programming Use Case */}
      <div className="mt-1.5 rounded-xl border border-indigo-400/25 bg-indigo-950/45 px-2.5 py-1.5">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
          <Cpu className="h-3 w-3" aria-hidden="true" />
          <span>Logic Use Case</span>
        </div>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-100">
          {part.logicUseCase}
        </p>
      </div>

      {/* Placement Rule Footer */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-800 pt-1.5 text-[11px] font-bold">
        <span className={requiresFrontColumn ? 'text-cyan-300' : 'text-slate-400'}>
          {part.placementHint}
        </span>
        <span className="text-slate-400">Drag or tap ×2</span>
      </div>

      {/* Downward Pointer Caret */}
      <div
        style={{ left: `calc(50% + ${arrowOffsetX}px)` }}
        className="absolute -bottom-2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-700/95 bg-slate-950"
        aria-hidden="true"
      />
    </div>
  );
};
