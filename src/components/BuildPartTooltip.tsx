import React from 'react';
import { ArrowRight, Check, Gem, Sparkles, Star, Zap } from 'lucide-react';
import type { PartId } from '../game/engine';
import type { PartBuildPlan } from '../game/partTooltips';
import { BlockIcon, HazardIcon, PartIcon } from './Icons';

interface BuildPartTooltipProps {
  plan: PartBuildPlan;
  anchorX: number;
  anchorTop: number;
}

const PartActionCue: React.FC<{ partId: PartId }> = ({ partId }) => {
  switch (partId) {
    case 'wheels':
      return (
        <div className="flex items-center gap-1.5 text-sky-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-sky-400/50 bg-sky-500/15">
            <BlockIcon type="MOVE" className="h-4 w-4" />
          </span>
          <span className="tabular text-xs font-black">+1</span>
        </div>
      );
    case 'treads':
      return (
        <div className="flex items-center gap-1.5 text-emerald-300">
          <HazardIcon cond="MUD" className="h-5 w-5" />
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-400/50 bg-emerald-500/15">
            <Check className="h-4 w-4 stroke-[3]" />
          </span>
        </div>
      );
    case 'thrusters':
      return (
        <div className="flex items-center gap-1.5 text-amber-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/50 bg-amber-500/15">
            <BlockIcon type="JUMP" className="h-4 w-4" />
          </span>
          <span className="tabular text-xs font-black">+2</span>
          <HazardIcon cond="GAP" className="h-5 w-5" />
        </div>
      );
    case 'booster':
      return (
        <div className="flex items-center gap-1.5 text-pink-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-pink-400/50 bg-pink-500/15">
            <BlockIcon type="BOOST" className="h-4 w-4" />
          </span>
          <span className="tabular text-xs font-black">+3</span>
          <HazardIcon cond="RAMP" className="h-5 w-5" />
        </div>
      );
    case 'laser':
      return (
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Zap className="h-4 w-4 fill-cyan-300" />
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-500/15">
            <Star className="h-3.5 w-3.5 fill-cyan-300 text-cyan-300" />
          </span>
        </div>
      );
    case 'magnet':
      return (
        <div className="flex items-center gap-1.5 text-violet-300">
          <Gem className="h-4 w-4 fill-cyan-300 text-cyan-200" />
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
        </div>
      );
  }
};

export const BuildPartTooltip: React.FC<BuildPartTooltipProps> = ({
  plan,
  anchorX,
  anchorTop
}) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const tooltipWidth = Math.min(224, vw - 24);
  const halfW = tooltipWidth / 2;
  const clampedCenterX = Math.max(halfW + 12, Math.min(vw - halfW - 12, anchorX));
  const arrowOffsetX = Math.max(
    -halfW + 18,
    Math.min(halfW - 18, anchorX - clampedCenterX)
  );
  const desiredBottom = vh - anchorTop + 12;
  const maxSafeBottom = Math.max(96, vh - 180);
  const bottomOffset = Math.max(96, Math.min(desiredBottom, maxSafeBottom));

  const {
    part,
    installedCount,
    currentUsedEnergy,
    projectedEnergy,
    budget,
    parBudget,
    canAfford,
    withinParBudget,
    missionRelevance
  } = plan;

  const safeBudget = Math.max(1, budget);
  const currentPct = Math.min(100, Math.round((currentUsedEnergy / safeBudget) * 100));
  const projectedPct = Math.min(100, Math.round((projectedEnergy / safeBudget) * 100));
  const parPct = Math.min(100, Math.round((parBudget / safeBudget) * 100));

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
      className="anim-tooltip-pop pointer-events-none fixed z-30 rounded-2xl border-2 border-slate-700/95 bg-slate-950/96 p-2.5 text-left shadow-[0_14px_34px_rgba(2,6,23,0.88)]"
    >
      {/* Top Color Accent Bar */}
      <div
        className="absolute inset-x-3 top-0 h-0.5 rounded-full"
        style={{ backgroundColor: part.color }}
        aria-hidden="true"
      />

      {/* Row 1: Icon + Short Name + Cost Chip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <PartIcon id={part.id} className="h-5.5 w-5.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-white">{part.name}</div>
            <div className="mt-0.5 flex items-center gap-1">
              {missionRelevance !== 'optional' && (
                <Star
                  className={`h-3 w-3 ${
                    missionRelevance === 'required'
                      ? 'fill-cyan-300 text-cyan-300'
                      : 'fill-amber-300 text-amber-300'
                  }`}
                  aria-hidden="true"
                />
              )}
              {installedCount > 0 && (
                <span className="tabular text-[10px] font-black text-emerald-300">
                  ×{installedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          data-testid="tooltip-energy-cost"
          className={`flex shrink-0 items-center gap-0.5 rounded-xl border px-2 py-1 text-xs font-black tabular ${
            canAfford
              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
              : 'border-rose-400/60 bg-rose-500/20 text-rose-200'
          }`}
        >
          <Zap className="h-3 w-3 fill-current" aria-hidden="true" />
          <span>{part.cost}</span>
        </div>
      </div>

      {/* Row 2: Visual Action Pictogram + Projected Energy Fraction */}
      <div
        data-testid="tooltip-budget-plan"
        className="mt-2 flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/85 px-2 py-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <PartActionCue partId={part.id} />
          <span
            className={`tabular text-[11px] font-black ${
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

        {/* Slim Visual Energy Bar with Par Notch */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
              !canAfford
                ? 'bg-rose-500/85'
                : withinParBudget
                  ? 'bg-emerald-400/75'
                  : 'bg-amber-400/80'
            }`}
            style={{ width: `${projectedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sky-400"
            style={{ width: `${Math.min(currentPct, projectedPct)}%` }}
          />
          {parBudget > 0 && parBudget < budget && (
            <div
              className="absolute inset-y-0 w-0.5 bg-amber-200/95"
              style={{ left: `${parPct}%` }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Downward Pointer Caret */}
      <div
        style={{ left: `calc(50% + ${arrowOffsetX}px)` }}
        className="absolute -bottom-2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-700/95 bg-slate-950"
        aria-hidden="true"
      />
    </div>
  );
};
