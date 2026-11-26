import React, { useEffect } from 'react';
import {
  BookOpen,
  Ghost,
  Lightbulb,
  Puzzle,
  Sparkles,
  Square,
  StepForward,
  Volume2,
  X
} from 'lucide-react';
import type { SensorCondition } from '../game/engine';
import type { AdaptiveHint, ParsonsStarterTemplate } from '../game/educationStrategy';
import { SPEECH, useReadAloud } from '../game/readAloud';
import type { DemoTopic } from './ConceptDemoPopover';

interface AdaptiveHintBannerProps {
  hint: AdaptiveHint | null;
  isGentleRetry?: boolean;
  autoReadAloud?: boolean;
  onEscalateTier: () => void;
  onOpenDemo?: (topic: DemoTopic, condition?: SensorCondition) => void;
  onStepByStep?: () => void;
  onApplyParsons?: (template: ParsonsStarterTemplate) => void;
  onPlayGhostPreview?: () => void;
  onDismiss: () => void;
}

export const AdaptiveHintBanner: React.FC<AdaptiveHintBannerProps> = ({
  hint,
  isGentleRetry = false,
  autoReadAloud = false,
  onEscalateTier,
  onOpenDemo,
  onStepByStep,
  onApplyParsons,
  onPlayGhostPreview,
  onDismiss
}) => {
  const speech = useReadAloud();
  const hintSpeechId = hint ? `hint_${hint.phase}_${hint.tier}` : '';
  const isSpeakingThisHint = Boolean(
    hint && speech.speaking && speech.activeId === hintSpeechId
  );

  useEffect(() => {
    if (!hint || !autoReadAloud || !SPEECH.isSupported()) return;
    SPEECH.speak(`${hint.headline}. ${hint.clue}`, `hint_${hint.phase}_${hint.tier}`);
  }, [autoReadAloud, hint]);

  useEffect(() => {
    return () => {
      SPEECH.stop();
    };
  }, []);

  if (!hint) return null;

  const tierTone =
    hint.tier === 3
      ? 'border-emerald-400/75 bg-slate-900/95'
      : hint.tier === 2
        ? 'border-sky-400/75 bg-slate-900/95'
        : isGentleRetry
          ? 'border-amber-400/80 bg-slate-900/95'
          : 'border-sky-400/60 bg-slate-900/95';

  const iconTone =
    hint.tier === 3
      ? 'text-emerald-300'
      : hint.tier === 2
        ? 'text-sky-300'
        : 'text-amber-300';

  const shortHeadline = hint.headline.replace(/^Gentle Retry\s*·\s*/i, '');

  return (
    <div
      role="region"
      aria-label="Adaptive Learning Hint"
      data-testid="adaptive-hint-banner"
      data-hint-tier={hint.tier}
      data-hint-phase={hint.phase}
      className={`pointer-events-auto anim-pop flex w-full max-w-4xl flex-row items-center justify-between gap-1.5 rounded-xl border px-2 py-1 shadow-lg backdrop-blur-md sm:gap-2 sm:px-2.5 sm:py-1.5 ${tierTone}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/90">
          {hint.tier === 3 ? (
            <Sparkles className={`h-3.5 w-3.5 ${iconTone}`} aria-hidden="true" />
          ) : (
            <Lightbulb className={`h-3.5 w-3.5 ${iconTone}`} aria-hidden="true" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 text-left">
          <span className={`shrink-0 tabular text-[10px] font-black ${iconTone}`}>
            {hint.tier}/3
          </span>
          <span className="truncate text-[11px] font-black text-white sm:text-xs">
            {shortHeadline}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {speech.supported && (
          <button
            id="hintReadAloudBtn"
            type="button"
            onClick={() => SPEECH.toggleSpeak(`${hint.headline}. ${hint.clue}`, hintSpeechId)}
            aria-label={isSpeakingThisHint ? 'Stop reading hint aloud' : 'Read hint aloud'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform active:scale-95 ${
              isSpeakingThisHint
                ? 'border-rose-400/80 bg-rose-500/20 text-rose-100'
                : 'border-slate-600 bg-slate-800 text-sky-200 hover:border-sky-400'
            }`}
          >
            {isSpeakingThisHint ? (
              <Square className="h-3 w-3 fill-current" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}

        {isGentleRetry && onStepByStep && hint.phase === 'code' && (
          <button
            id="hintStepDebugBtn"
            type="button"
            onClick={onStepByStep}
            aria-label="Step By Step"
            className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-sky-300/80 bg-sky-500/20 px-2 text-[11px] font-black text-sky-100 transition-transform hover:bg-sky-500/30 active:scale-95"
          >
            <StepForward className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Step</span>
          </button>
        )}

        {hint.tier >= 2 && hint.demoTopic && onOpenDemo && (
          <button
            id="hintShowWhyBtn"
            type="button"
            onClick={() => onOpenDemo(hint.demoTopic!, hint.demoCondition)}
            aria-label="Visual Demo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/80 bg-cyan-500/20 text-cyan-100 transition-transform hover:bg-cyan-500/30 active:scale-95"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {hint.tier === 3 && hint.parsonsTemplate && onApplyParsons && (
          <button
            id="hintApplyParsonsBtn"
            type="button"
            onClick={() => onApplyParsons(hint.parsonsTemplate!)}
            aria-label="Try Starter Blocks"
            className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-500 px-2 text-[11px] font-black text-slate-950 transition-transform hover:bg-emerald-400 active:scale-95"
          >
            <Puzzle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fix</span>
          </button>
        )}

        {hint.tier === 3 && hint.phase !== 'code' && onPlayGhostPreview && (
          <button
            id="hintGhostPreviewBtn"
            type="button"
            onClick={onPlayGhostPreview}
            aria-label="Watch Ghost"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-500 text-slate-950 transition-transform hover:bg-emerald-400 active:scale-95"
          >
            <Ghost className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {hint.tier < 3 && (
          <button
            id="hintNextTierBtn"
            type="button"
            onClick={onEscalateTier}
            aria-label="Next Hint"
            className="flex h-8 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg border border-amber-300/80 bg-amber-400 px-2 text-[11px] font-black text-slate-950 transition-transform hover:bg-amber-300 active:scale-95"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            <span>+1</span>
          </button>
        )}

        <button
          id="dismissAdaptiveHintBtn"
          type="button"
          onClick={() => {
            SPEECH.stop();
            onDismiss();
          }}
          aria-label="Dismiss Hint"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
