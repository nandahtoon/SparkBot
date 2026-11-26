import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Bug,
  CheckCircle2,
  Cpu,
  Download,
  Flame,
  Lightbulb,
  Lock,
  Shield,
  Sparkles,
  Star,
  Timer,
  Unlock,
  X
} from 'lucide-react';
import type { SaveProfile } from '../game/engine';
import {
  buildParentProgressReport,
  serializeParentProgressJson,
  STREAK_SHIELD_MAX
} from '../game/educationStrategy';

interface ParentDashboardModalProps {
  visible: boolean;
  save: SaveProfile;
  adaptiveHintsEnabled: boolean;
  challengeTimerEnabled: boolean;
  predictQuizEnabled?: boolean;
  onToggleAdaptiveHints: () => void;
  onToggleChallengeTimer: () => void;
  onTogglePredictQuiz?: () => void;
  onClose: () => void;
}

const HOLD_TARGET_MS = 2000;

export const ParentDashboardModal: React.FC<ParentDashboardModalProps> = ({
  visible,
  save,
  adaptiveHintsEnabled,
  challengeTimerEnabled,
  predictQuizEnabled = true,
  onToggleAdaptiveHints,
  onToggleChallengeTimer,
  onTogglePredictQuiz,
  onClose
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const [holding, setHolding] = useState(false);
  const [mathSeed, setMathSeed] = useState(0);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathError, setMathError] = useState<string | null>(null);
  const [exportedNotice, setExportedNotice] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  const mathPrompt = useMemo(() => {
    const pairs: Array<[number, number]> = [
      [8, 7],
      [9, 6],
      [7, 5],
      [9, 8]
    ];
    const [a, b] = pairs[mathSeed % pairs.length];
    return { a, b, answer: a + b };
  }, [mathSeed]);

  useEffect(() => {
    if (!visible) {
      setUnlocked(false);
      setHoldPct(0);
      setHolding(false);
      setMathAnswer('');
      setMathError(null);
      setExportedNotice(false);
      if (holdTimerRef.current !== null) {
        window.clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const report = useMemo(() => buildParentProgressReport(save), [save]);

  if (!visible) return null;

  function startHold() {
    if (unlocked) return;
    setHolding(true);
    const start = performance.now();
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
    }
    holdTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / HOLD_TARGET_MS) * 100));
      setHoldPct(pct);
      if (elapsed >= HOLD_TARGET_MS) {
        if (holdTimerRef.current !== null) {
          window.clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setHolding(false);
        setUnlocked(true);
      }
    }, 45);
  }

  function cancelHold() {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHolding(false);
    setHoldPct(0);
  }

  function handleMathUnlock(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(mathAnswer.trim());
    if (Number.isFinite(parsed) && parsed === mathPrompt.answer) {
      setMathError(null);
      setUnlocked(true);
    } else {
      setMathError(`Not quite — try adding ${mathPrompt.a} + ${mathPrompt.b}.`);
      setMathSeed((s) => s + 1);
      setMathAnswer('');
    }
  }

  function handleDownloadReport() {
    const json = serializeParentProgressJson(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sparkbot-learning-report-${report.generatedDateKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedNotice(true);
    window.setTimeout(() => setExportedNotice(false), 2600);
  }

  return (
    <div
      id="parentDashboardModal"
      role="dialog"
      aria-modal="true"
      aria-label="Grown-Ups Learning Progress View"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/75 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/70 bg-sky-500/15 text-sky-300">
              {unlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-white sm:text-lg">
                Grown-Ups · Learning Progress
              </h2>
              <p className="truncate text-xs font-medium text-slate-400">
                {report.profileName} · Local device summary (Ages 6–12 STEM Academy)
              </p>
            </div>
          </div>

          <button
            id="closeParentDashboardBtn"
            type="button"
            onClick={onClose}
            aria-label="Close Grown-Ups Progress View"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="touch-pan-y flex-1 overflow-y-auto p-4 sm:p-6">
          {!unlocked ? (
            <div
              data-testid="parent-gate-screen"
              className="mx-auto flex max-w-md flex-col gap-5 py-4 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/70 bg-amber-500/15 text-amber-300">
                <Shield className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Adult Verification</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                  Press and hold the button for 2 seconds, or solve the quick sum below to view STEM mastery and controls.
                </p>
              </div>

              {/* Method 1: 2-second press & hold */}
              <button
                id="parentHoldUnlockBtn"
                type="button"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-sky-400/80 bg-slate-800 text-sm font-black text-white transition-transform active:scale-[0.99]"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-sky-500/40 transition-all duration-75"
                  style={{ width: `${holdPct}%` }}
                  aria-hidden="true"
                />
                <span className="relative z-10">
                  {holding ? `Holding… ${holdPct}%` : 'Press & Hold 2 Seconds to Unlock'}
                </span>
              </button>

              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="h-px flex-1 bg-slate-800" />
                <span>OR</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Method 2: Arithmetic check */}
              <form onSubmit={handleMathUnlock} className="flex flex-col gap-2">
                <label
                  htmlFor="parentMathInput"
                  className="text-sm font-black text-slate-200 tabular-nums"
                >
                  What is {mathPrompt.a} + {mathPrompt.b}?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="parentMathInput"
                    type="number"
                    inputMode="numeric"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    placeholder="Answer"
                    className="h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-700 bg-slate-950 px-3 text-center text-base font-black text-white focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    id="parentMathUnlockBtn"
                    type="submit"
                    className="flex h-12 shrink-0 items-center whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-500 px-5 text-sm font-black text-slate-950 hover:bg-emerald-400 active:scale-95"
                  >
                    Unlock
                  </button>
                </div>
                {mathError && (
                  <p role="alert" className="text-xs font-bold text-rose-300">
                    {mathError}
                  </p>
                )}
              </form>
            </div>
          ) : (
            <div data-testid="parent-dashboard-content" className="flex flex-col gap-5">
              {/* Panel 1: Learning Snapshot */}
              <section aria-label="Learning Snapshot">
                <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
                  Learning Snapshot
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                    <div className="text-[11px] font-bold text-slate-400">Missions Cleared</div>
                    <div className="mt-1 text-xl font-black text-white tabular-nums">
                      {report.missionsCleared}/{report.totalMissions}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                    <div className="text-[11px] font-bold text-slate-400">Total Stars</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xl font-black text-amber-300 tabular-nums">
                      <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      <span>{report.totalStars}/{report.maxStars}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                    <div className="text-[11px] font-bold text-slate-400">Streak & Shields</div>
                    <div className="mt-1 flex items-center gap-2 text-xl font-black text-orange-300 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-4.5 w-4.5 fill-orange-400 text-orange-400" aria-hidden="true" />
                        {report.activeStreak}d
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1 text-sm text-cyan-300">
                        <Shield className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                        {report.streakShields}/{STREAK_SHIELD_MAX}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
                    <div className="text-[11px] font-bold text-slate-400">STEM Fact Cards</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xl font-black text-emerald-300 tabular-nums">
                      <BookOpen className="h-4.5 w-4.5 text-emerald-300" aria-hidden="true" />
                      <span>{report.factsUnlocked}/{report.totalFacts}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Panel 2: 8-Pillar STEM Mastery Matrix */}
              <section aria-label="8-Pillar STEM Mastery">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    8-Pillar STEM Mastery Matrix
                  </h3>
                  <span className="text-xs font-bold text-sky-300">
                    Strongest: {report.resilience.strongestPillarLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {report.pillars.map((pillar) => (
                    <div
                      key={pillar.id}
                      className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/75 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-white">
                            {pillar.label}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400">
                            {pillar.category} · {pillar.stageLabel}
                          </div>
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <div className="text-xs font-black text-amber-300">Tier {pillar.tier}/3</div>
                          <div className="text-[11px] font-bold text-slate-400">
                            {pillar.count}/{pillar.nextTarget}
                          </div>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pillar.tier === 3
                              ? 'bg-amber-400'
                              : pillar.tier === 2
                                ? 'bg-sky-400'
                                : pillar.tier === 1
                                  ? 'bg-emerald-400'
                                  : 'bg-slate-600'
                          }`}
                          style={{ width: `${pillar.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Panel 3: Resilience & Hint Insights */}
              <section aria-label="Resilience and Hint Insights">
                <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
                  Resilience & Debugging Insights
                </h3>
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3.5">
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <div className="font-semibold text-slate-400">Independent Solve</div>
                      <div className="mt-0.5 text-base font-black text-emerald-300 tabular-nums">
                        {report.resilience.independencePct}%
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {report.resilience.independentWins} solo · {report.resilience.assistedWins} guided
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400">Bug Fixes Earned</div>
                      <div className="mt-0.5 flex items-center gap-1 text-base font-black text-sky-300 tabular-nums">
                        <Bug className="h-4 w-4 text-sky-300" aria-hidden="true" />
                        <span>{report.resilience.bugFixes}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {report.resilience.stepDebugRuns} step-debug runs
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400">Bug Detective</div>
                      <div className="mt-0.5 flex items-center gap-1 text-base font-black text-amber-300 tabular-nums">
                        <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
                        <span>{report.resilience.bugDetectiveWon} rounds</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Code troubleshooting</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-400">Logic Gates Solved</div>
                      <div className="mt-0.5 flex items-center gap-1 text-base font-black text-violet-300 tabular-nums">
                        <Cpu className="h-4 w-4 text-violet-300" aria-hidden="true" />
                        <span>{report.resilience.logicGatesSolved}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">AND · OR · NOT</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-sky-400/35 bg-sky-500/10 px-3 py-2.5 text-xs">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                    <div>
                      <span className="font-black text-sky-200">Next Suggested Practice: </span>
                      <span className="font-medium text-slate-200">
                        {report.resilience.recommendedPractice}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Panel 4: Parent Controls & Export */}
              <section aria-label="Controls and Report Export" className="flex flex-col gap-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Learning Controls & Report Export
                </h3>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white">Adaptive Hints</div>
                        <div className="truncate text-[11px] text-slate-400">
                          Auto-suggest clues after retries
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={adaptiveHintsEnabled}
                      aria-label="Toggle Adaptive Hints"
                      onClick={onToggleAdaptiveHints}
                      className={`h-9 shrink-0 rounded-xl border px-3 text-xs font-black uppercase transition-transform active:scale-95 ${
                        adaptiveHintsEnabled
                          ? 'border-emerald-300 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {adaptiveHintsEnabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Timer className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white">Challenge Timer</div>
                        <div className="truncate text-[11px] text-slate-400">
                          Optional speed-run bolt targets
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={challengeTimerEnabled}
                      aria-label="Toggle Challenge Timer"
                      onClick={onToggleChallengeTimer}
                      className={`h-9 shrink-0 rounded-xl border px-3 text-xs font-black uppercase transition-transform active:scale-95 ${
                        challengeTimerEnabled
                          ? 'border-amber-300 bg-amber-500/20 text-amber-200'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {challengeTimerEnabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  {onTogglePredictQuiz && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-3.5 py-2.5 sm:col-span-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white">Predict-Before-Run Quiz</div>
                          <div className="truncate text-[11px] text-slate-400">
                            Quick visual prediction check before running new missions
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={predictQuizEnabled}
                        aria-label="Toggle Predict-Before-Run Quiz"
                        onClick={onTogglePredictQuiz}
                        className={`h-9 shrink-0 rounded-xl border px-3 text-xs font-black uppercase transition-transform active:scale-95 ${
                          predictQuizEnabled
                            ? 'border-violet-300 bg-violet-500/20 text-violet-200'
                            : 'border-slate-700 bg-slate-800 text-slate-400'
                        }`}
                      >
                        {predictQuizEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-4 py-3">
                  <div className="text-xs font-medium text-slate-300">
                    Export an offline JSON snapshot of {report.profileName}&apos;s STEM progress.
                  </div>
                  <button
                    id="downloadLearningReportBtn"
                    type="button"
                    onClick={handleDownloadReport}
                    className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-sky-300 bg-sky-500 px-4 text-xs font-black text-slate-950 transition-transform hover:bg-sky-400 active:scale-95"
                  >
                    {exportedNotice ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Report Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span>Download Learning Report (JSON)</span>
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
