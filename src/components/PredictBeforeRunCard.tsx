import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle2, Play, SkipForward, Zap } from 'lucide-react';
import type { PredictQuizQuestion } from '../game/predictQuiz';

interface PredictBeforeRunCardProps {
  question: PredictQuizQuestion | null;
  onComplete: (result: { correct: boolean; skipped: boolean }) => void;
}

export const PredictBeforeRunCard: React.FC<PredictBeforeRunCardProps> = ({
  question,
  onComplete
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [question?.id]);

  if (!question) return null;

  const answered = selectedId !== null;
  const isCorrect = answered && selectedId === question.correctOptionId;

  return (
    <div
      id="predictBeforeRunCard"
      role="dialog"
      aria-modal="false"
      aria-label="Predict Before Run Check"
      className="pointer-events-auto fixed inset-x-3 bottom-3 z-30 mx-auto max-w-2xl sm:inset-x-4 sm:bottom-4"
    >
      <div className="anim-pop flex flex-col gap-3 rounded-3xl border-2 border-sky-400/80 bg-slate-900/95 p-4 text-slate-100 shadow-2xl sm:p-5">
        {/* Clean Header without pill clutter */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/60 bg-sky-500/15 text-sky-300">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-sky-300">
                Brain Spark · {question.badgeLabel} · +20 Bolts
              </div>
              <h3 className="text-sm font-black leading-snug text-white sm:text-base">
                {question.prompt}
              </h3>
            </div>
          </div>

          {!answered && (
            <button
              id="skipPredictBtn"
              type="button"
              onClick={() => onComplete({ correct: false, skipped: true })}
              className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white active:scale-95"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Skip &amp; Run</span>
            </button>
          )}
        </div>

        <p className="text-xs font-medium text-slate-300">
          {answered ? question.explanation : question.helperText}
        </p>

        {/* Option Buttons */}
        <div
          className={`grid gap-2 ${
            question.options.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
          }`}
        >
          {question.options.map((opt) => {
            const isPicked = selectedId === opt.id;
            const isRightOpt = opt.id === question.correctOptionId;

            let tone =
              'border-slate-700 bg-slate-800/90 text-slate-100 hover:border-sky-400 hover:bg-slate-800';
            if (answered) {
              if (isRightOpt) {
                tone = 'border-emerald-400 bg-emerald-500/20 text-emerald-100';
              } else if (isPicked && !isRightOpt) {
                tone = 'border-amber-400 bg-amber-500/20 text-amber-100';
              } else {
                tone = 'border-slate-800 bg-slate-950/60 text-slate-500';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={answered}
                data-predict-option={opt.id}
                onClick={() => setSelectedId(opt.id)}
                className={`flex min-h-[52px] flex-col items-start justify-center rounded-2xl border-2 px-3.5 py-2 text-left transition-colors active:scale-[0.99] ${tone}`}
              >
                <span className="text-xs font-black leading-tight sm:text-sm">
                  {opt.label}
                </span>
                {opt.detail && (
                  <span className="mt-0.5 text-[11px] font-medium opacity-80">
                    {opt.detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Result & Launch Row */}
        {answered && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
            <div className="flex items-center gap-2 text-xs font-black">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Great Prediction!</span>
                  <span className="tabular inline-flex items-center gap-0.5 text-amber-300">
                    <Zap className="h-3.5 w-3.5 fill-amber-300" aria-hidden="true" />
                    +20
                  </span>
                </>
              ) : (
                <span className="text-amber-300">
                  Good try — watch SparkBot test it live!
                </span>
              )}
            </div>

            <button
              id="launchAfterPredictBtn"
              type="button"
              onClick={() => onComplete({ correct: isCorrect, skipped: false })}
              className="flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 text-xs font-black text-slate-950 shadow-[0_4px_0_#047857] active:translate-y-0.5"
            >
              <Play className="h-4 w-4 fill-slate-950" aria-hidden="true" />
              <span>Run SparkBot!</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
