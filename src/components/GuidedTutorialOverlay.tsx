import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Puzzle, Wrench, X } from 'lucide-react';
import {
  computeSpotlightCardPosition,
  type MissionTutorialStepDef,
  type RectBox
} from '../game/missionTutorial';

interface GuidedTutorialOverlayProps {
  step: MissionTutorialStepDef | null;
  onAcknowledgeStep: (stepId: MissionTutorialStepDef['id']) => void;
  onSkip: () => void;
}

interface MeasuredTargets {
  primary: RectBox | null;
  secondary: RectBox | null;
  viewportW: number;
  viewportH: number;
}

const CUTOUT_PAD = 8;

function queryElementRect(selector: string | undefined): RectBox | null {
  if (!selector || typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height
  };
}

function expandRect(rect: RectBox, pad: number): RectBox {
  return {
    left: Math.max(0, rect.left - pad),
    top: Math.max(0, rect.top - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  };
}

export const GuidedTutorialOverlay: React.FC<GuidedTutorialOverlayProps> = ({
  step,
  onAcknowledgeStep,
  onSkip
}) => {
  const maskId = useId();
  const arrowId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = useState(172);
  const [measured, setMeasured] = useState<MeasuredTargets>(() => ({
    primary: null,
    secondary: null,
    viewportW: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportH: typeof window !== 'undefined' ? window.innerHeight : 768
  }));

  const measure = useCallback(() => {
    if (!step) return;
    const nextPrimary = queryElementRect(step.primarySelector);
    const nextSecondary = queryElementRect(step.secondarySelector);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setMeasured((prev) => {
      const sameRect = (a: RectBox | null, b: RectBox | null) => {
        if (a === b) return true;
        if (!a || !b) return false;
        return (
          Math.abs(a.left - b.left) < 1 &&
          Math.abs(a.top - b.top) < 1 &&
          Math.abs(a.width - b.width) < 1 &&
          Math.abs(a.height - b.height) < 1
        );
      };
      if (
        prev.viewportW === vw &&
        prev.viewportH === vh &&
        sameRect(prev.primary, nextPrimary) &&
        sameRect(prev.secondary, nextSecondary)
      ) {
        return prev;
      }
      return {
        primary: nextPrimary,
        secondary: nextSecondary,
        viewportW: vw,
        viewportH: vh
      };
    });
  }, [step]);

  useEffect(() => {
    if (!step) return;
    measure();
    const rafId = window.requestAnimationFrame(measure);
    const intervalId = window.setInterval(measure, 180);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure]);

  useLayoutEffect(() => {
    if (!step || !cardRef.current) return;
    const h = Math.ceil(cardRef.current.getBoundingClientRect().height);
    if (h > 40 && Math.abs(h - cardHeight) > 4) {
      setCardHeight(h);
    }
  }, [step, measured.viewportW, cardHeight]);

  useEffect(() => {
    if (!step) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, onSkip]);

  if (!step) return null;

  const primaryCut = measured.primary ? expandRect(measured.primary, CUTOUT_PAD) : null;
  const secondaryCut = measured.secondary ? expandRect(measured.secondary, CUTOUT_PAD) : null;

  const cardPos = computeSpotlightCardPosition({
    viewportWidth: measured.viewportW,
    viewportHeight: measured.viewportH,
    primaryRect: primaryCut,
    secondaryRect: secondaryCut,
    cardHeight
  });

  // Curved trajectory connector from primary drag source to secondary drop destination
  let arrowPath: string | null = null;
  if (primaryCut && secondaryCut) {
    const sx = primaryCut.left + primaryCut.width / 2;
    const sy = primaryCut.top + primaryCut.height / 2;
    const tx = secondaryCut.left + secondaryCut.width / 2;
    const ty = secondaryCut.top + secondaryCut.height / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    if (dist > 44) {
      const startOffset = Math.min(28, primaryCut.height / 2 + 6);
      const endOffset = Math.min(30, secondaryCut.height / 2 + 8);
      const ux = dx / dist;
      const uy = dy / dist;
      const x1 = sx + ux * startOffset;
      const y1 = sy + uy * startOffset;
      const x2 = tx - ux * endOffset;
      const y2 = ty - uy * endOffset;
      // Gentle outward arc
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const bend = Math.min(48, dist * 0.22);
      const cx = mx - uy * bend * 0.5;
      const cy = my - Math.abs(ux) * bend * 0.35 - (dy < 0 ? 12 : -12);
      arrowPath = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
  }

  const isBuild = step.phase === 'build';
  const accentBorder = isBuild ? 'border-amber-300/75' : 'border-sky-300/75';
  const accentRingStroke = isBuild ? '#fbbf24' : '#38bdf8';
  const accentText = isBuild ? 'text-amber-300' : 'text-sky-300';

  return (
    <div
      id="guidedTutorialOverlay"
      data-testid="guided-tutorial-overlay"
      data-tutorial-step={step.id}
      data-tutorial-phase={step.phase}
      role="region"
      aria-label={`Mission 1 Guided Tutorial: ${step.title}`}
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {/* Interactive-Through SVG Spotlight Mask (pointer-events-none so taps & drags pass straight through) */}
      <svg
        width={measured.viewportW}
        height={measured.viewportH}
        viewBox={`0 0 ${measured.viewportW} ${measured.viewportH}`}
        className="pointer-events-none fixed inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={measured.viewportW} height={measured.viewportH} fill="white" />
            {primaryCut && (
              <rect
                x={primaryCut.left}
                y={primaryCut.top}
                width={primaryCut.width}
                height={primaryCut.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
            {secondaryCut && (
              <rect
                x={secondaryCut.left}
                y={secondaryCut.top}
                width={secondaryCut.width}
                height={secondaryCut.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
          <marker
            id={arrowId}
            markerWidth="10"
            markerHeight="10"
            refX="7"
            refY="5"
            orient="auto"
          >
            <path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill={accentRingStroke} />
          </marker>
        </defs>

        {/* Soft Dimmed Backdrop with Spotlight Cutouts */}
        <rect
          x="0"
          y="0"
          width={measured.viewportW}
          height={measured.viewportH}
          fill="rgba(2, 6, 23, 0.58)"
          mask={`url(#${maskId})`}
        />

        {/* Subtle Secondary Target Guide Ring (e.g., drop slot or rail) */}
        {secondaryCut && (
          <rect
            x={secondaryCut.left}
            y={secondaryCut.top}
            width={secondaryCut.width}
            height={secondaryCut.height}
            rx="16"
            ry="16"
            fill="none"
            stroke="rgba(148, 163, 184, 0.85)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
        )}

        {/* Animated Drag / Action Connector Arrow */}
        {arrowPath && (
          <path
            d={arrowPath}
            fill="none"
            stroke={accentRingStroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="7 6"
            markerEnd={`url(#${arrowId})`}
            className="anim-tutorial-dash"
            opacity="0.92"
          />
        )}
      </svg>

      {/* Primary Spotlight Halo Ring */}
      {primaryCut && (
        <div
          aria-hidden="true"
          data-testid="tutorial-spotlight-ring"
          style={{
            left: `${primaryCut.left}px`,
            top: `${primaryCut.top}px`,
            width: `${primaryCut.width}px`,
            height: `${primaryCut.height}px`
          }}
          className={`anim-tutorial-spotlight pointer-events-none fixed rounded-2xl border-2 ${
            isBuild
              ? 'border-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.22),0_0_24px_rgba(251,191,36,0.52)]'
              : 'border-sky-300 shadow-[0_0_0_3px_rgba(56,189,248,0.22),0_0_24px_rgba(56,189,248,0.52)]'
          }`}
        />
      )}

      {/* Compact, High-Contrast Floating Instruction Callout Card */}
      <div
        ref={cardRef}
        key={step.id}
        data-testid="tutorial-callout-card"
        style={{
          left: `${cardPos.left}px`,
          top: `${cardPos.top}px`,
          width: `${cardPos.width}px`
        }}
        className={`anim-tutorial-card pointer-events-auto fixed flex flex-col gap-2.5 rounded-2xl border bg-slate-900/96 p-3.5 text-left text-slate-100 shadow-[0_18px_42px_rgba(2,6,23,0.72)] backdrop-blur-md sm:p-4 ${accentBorder}`}
      >
        {/* Top Segmented 7-Step Progress Strip */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: step.totalSteps }, (_, idx) => {
            const num = idx + 1;
            const done = num < step.stepNumber;
            const current = num === step.stepNumber;
            return (
              <span
                key={num}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  done
                    ? 'bg-emerald-400'
                    : current
                      ? isBuild
                        ? 'bg-amber-300'
                        : 'bg-sky-300'
                      : 'bg-slate-700/90'
                }`}
              />
            );
          })}
        </div>

        {/* Clean Unboxed Metadata Header + Skip Control */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-300">
            {isBuild ? (
              <Wrench className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            ) : (
              <Puzzle className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            )}
            <span className={accentText}>{isBuild ? 'Build Phase' : 'Code Phase'}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular text-slate-400">
              Step {step.stepNumber} of {step.totalSteps}
            </span>
          </div>

          <button
            id="skipTutorialBtn"
            type="button"
            onClick={onSkip}
            aria-label="Skip Guided Tutorial"
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <span>Skip</span>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Title & Concise Guidance Copy */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black leading-snug text-white sm:text-[15px]">
            {step.title}
          </h3>
          <p className="text-xs font-medium leading-relaxed text-slate-200 sm:text-[13px]">
            {step.body}
          </p>
        </div>

        {/* Optional Live Progress Counter (e.g., Move blocks added on Step 5) */}
        {step.progress && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-400 transition-all duration-200"
                style={{
                  width: `${Math.min(100, Math.round((step.progress.current / Math.max(1, step.progress.target)) * 100))}%`
                }}
              />
            </div>
            <span
              data-testid="tutorial-step-progress"
              className="tabular text-[11px] font-black text-sky-200"
            >
              {step.progress.current}/{step.progress.target} {step.progress.unit}
            </span>
          </div>
        )}

        {/* Action Prompt & Optional Manual Advance Button */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
          <span className="min-w-0 truncate text-[11px] font-bold text-slate-300">
            {step.actionHint}
          </span>

          {step.allowManualNext && (
            <button
              id="tutorialNextBtn"
              type="button"
              onClick={() => onAcknowledgeStep(step.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-xs font-black text-slate-950 shadow-sm transition-transform active:scale-95 ${
                isBuild
                  ? 'border-amber-200 bg-amber-400 hover:bg-amber-300'
                  : 'border-sky-200 bg-sky-400 hover:bg-sky-300'
              }`}
            >
              <span>{step.manualNextLabel || 'Next'}</span>
              {step.manualNextLabel === 'Got it' ? (
                <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
