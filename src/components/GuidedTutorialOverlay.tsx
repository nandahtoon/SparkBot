import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Play, Puzzle, Square, Volume2, Wrench, X, Zap } from 'lucide-react';
import {
  computeSpotlightCardPosition,
  type MissionTutorialStepDef,
  type RectBox
} from '../game/missionTutorial';
import { SPEECH, useReadAloud } from '../game/readAloud';
import { SFX } from '../game/audio';
import { tutorialVoice } from '../game/characterGuidance';
import { BlockIcon, PartIcon } from './Icons';

interface GuidedTutorialOverlayProps {
  junior?: boolean;
  muted?: boolean;
  autoReadAloud?: boolean;
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
  junior = false,
  muted = false,
  autoReadAloud = false,
  step,
  onAcknowledgeStep,
  onSkip
}) => {
  const maskId = useId();
  const arrowId = useId();
  const speech = useReadAloud();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = useState(72);
  const [measured, setMeasured] = useState<MeasuredTargets>(() => ({
    primary: null,
    secondary: null,
    viewportW: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportH: typeof window !== 'undefined' ? window.innerHeight : 768
  }));

  useEffect(() => {
    return () => {
      SPEECH.stop();
    };
  }, []);

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

  const spokenHint = step ? tutorialVoice(step) : '';
  const spokenStepId = step?.id;
  useEffect(() => {
    if ((!junior && !autoReadAloud) || muted || !spokenHint || !spokenStepId) return;
    SFX.cancelSpeech();
    SPEECH.speak(spokenHint, `tut_${spokenStepId}`, {playful:true});
    return () => SPEECH.stopOwned(`tut_${spokenStepId}`);
  }, [junior, autoReadAloud, muted, spokenHint, spokenStepId]);

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

  return (
    <div
      id="guidedTutorialOverlay"
      data-testid="guided-tutorial-overlay"
      data-tutorial-step={step.id}
      data-tutorial-phase={step.phase}
      role="region"
      aria-label={`Mission 1 Guided Tutorial: ${step.title}`}
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
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

      {/* Slim Single-Row Floating Instruction Banner */}
      <div
        ref={cardRef}
        key={step.id}
        data-testid="tutorial-callout-card"
        style={{
          left: `${cardPos.left}px`,
          top: `${cardPos.top}px`,
          width: `${cardPos.width}px`
        }}
        className={`anim-tutorial-card pointer-events-auto fixed flex flex-col gap-1.5 rounded-2xl border bg-slate-900/95 px-2.5 py-2 text-left text-slate-100 shadow-[0_12px_28px_rgba(2,6,23,0.68)] backdrop-blur-md ${accentBorder}`}
      >
        {/* Ultra-Thin 7-Step Progress Strip */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: step.totalSteps }, (_, idx) => {
            const num = idx + 1;
            const done = num < step.stepNumber;
            const current = num === step.stepNumber;
            return (
              <span
                key={num}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
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

        {/* Single Compact Visual Row: Cue Icon + Step/Title + Compact Controls */}
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/85 px-2"
          >
            {step.id === 'build_budget' && (
              <Zap className="h-5 w-5 fill-amber-400 text-amber-300" />
            )}
            {step.id === 'build_wheels' && (
              <>
                <PartIcon id="wheels" className="h-5.5 w-5.5" />
                <ArrowRight className="h-3 w-3 text-amber-300" />
                <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-amber-400/25" />
              </>
            )}
            {step.id === 'build_laser' && (
              <>
                <PartIcon id="laser" className="h-5.5 w-5.5" />
                <ArrowRight className="h-3 w-3 text-amber-300" />
                <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-amber-400/25" />
              </>
            )}
            {step.id === 'build_next_phase' && (
              <span className="flex h-6.5 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </span>
            )}
            {step.id === 'code_add_move' && (
              <>
                <span className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-sky-400/80 bg-sky-500/20">
                  <BlockIcon type="MOVE" className="h-4 w-4" />
                </span>
                <span className="tabular text-[11px] font-black text-sky-200">×5</span>
              </>
            )}
            {step.id === 'code_rail_review' && (
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-sky-400/60 bg-sky-500/15"
                  >
                    <BlockIcon type="MOVE" className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}
            {step.id === 'code_run' && (
              <span className="flex h-6.5 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                <Play className="h-4 w-4 fill-slate-950" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-black text-slate-400 tabular">
                {isBuild ? (
                  <Wrench className="h-3 w-3 text-amber-300" aria-hidden="true" />
                ) : (
                  <Puzzle className="h-3 w-3 text-sky-300" aria-hidden="true" />
                )}
                {step.stepNumber}/{step.totalSteps}
              </span>
              <h3 className="truncate text-xs font-black leading-tight text-white sm:text-[13px]">
                {step.title}
              </h3>
            </div>
            {step.progress && (
              <div className="mt-1 flex items-center gap-1.5">
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
                  className="tabular text-[10px] font-black text-sky-200"
                >
                  {step.progress.current}/{step.progress.target}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {speech.supported && !muted && (
              <button
                type="button"
                onClick={() => {
                  SFX.cancelSpeech();
                  SPEECH.toggleSpeak(tutorialVoice(step), `tut_${step.id}`, {playful:true});
                }}
                aria-label="Listen to Step"
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-transform active:scale-95 ${
                  speech.speaking && speech.activeId === `tut_${step.id}`
                    ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                    : 'border-slate-700 bg-slate-800 text-sky-300 hover:border-sky-400'
                }`}
              >
                {speech.speaking && speech.activeId === `tut_${step.id}` ? (
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            )}

            {step.allowManualNext && (
              <button
                id="tutorialNextBtn"
                type="button"
                onClick={() => {
                  SPEECH.stop();
                  onAcknowledgeStep(step.id);
                }}
                aria-label={step.manualNextLabel || 'Next'}
                className={`flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-2.5 text-xs font-black text-slate-950 shadow-sm transition-all active:translate-y-0.5 ${
                  isBuild
                    ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_2px_0_#b45309]'
                    : 'border-sky-200 bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_2px_0_#0369a1]'
                }`}
              >
                {step.manualNextLabel === 'Got it' ? (
                  <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                )}
              </button>
            )}

            <button
              id="skipTutorialBtn"
              type="button"
              onClick={() => {
                SPEECH.stop();
                onSkip();
              }}
              aria-label="Skip Guided Tutorial"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:border-slate-500 hover:text-white active:scale-95"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
