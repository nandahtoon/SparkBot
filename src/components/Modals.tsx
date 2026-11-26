import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Bug,
  Check,
  Flame,
  Gamepad2,
  Gem,
  Hammer,
  History,
  Home,
  KeyRound,
  LayoutGrid,
  Lock,
  Play,
  Puzzle,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  Square,
  Star,
  Timer,
  Trophy,
  Volume2,
  X,
  Zap
} from 'lucide-react';
import { BONUS_LEVELS, LEVELS, type SaveProfile } from '../game/engine';
import { DEBUG_MISSIONS } from '../game/debugMissions';
import { formatChallengeTime, type SpeedRunEvaluation } from '../game/challengeTimer';
import { buildBeatenLevelHistory } from '../game/levelHistory';
import {
  normalizeStreakShields,
  STORY_CHAPTERS,
  STREAK_SHIELD_MAX,
  type AcademyPillarId,
  type StemFactCardDef
} from '../game/educationStrategy';
import { SPEECH, useReadAloud } from '../game/readAloud';

export interface VictorySpeedRunSummary {
  evaluation: SpeedRunEvaluation;
  isNewRecord: boolean;
  bestMs: number;
}

interface VictoryModalProps {
  visible: boolean;
  stars: number;
  bonusEarned: boolean;
  fullCrystals: boolean;
  withinBlockPar: boolean;
  withinBudgetPar: boolean;
  collectedCrystals: number;
  totalCrystals: number;
  blockCount: number;
  parBlocks: number;
  energyCost: number;
  parBudget: number;
  hasNextLevel: boolean;
  isSandbox?: boolean;
  isDebugMission?: boolean;
  debugBoltReward?: number;
  upgradedPillars?: AcademyPillarId[];
  speedRun?: VictorySpeedRunSummary | null;
  bugFixerBonus?: boolean;
  unlockedFacts?: StemFactCardDef[];
  onPlayDash: () => void;
  onReplay: () => void;
  onOpenMap: () => void;
  onOpenTrophies?: () => void;
  onOpenShop?: () => void;
  onOpenSandbox?: () => void;
  onNextLevel: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  stars,
  bonusEarned,
  fullCrystals,
  withinBlockPar,
  withinBudgetPar,
  collectedCrystals,
  totalCrystals,
  blockCount,
  parBlocks,
  energyCost,
  parBudget,
  hasNextLevel,
  isSandbox = false,
  isDebugMission = false,
  debugBoltReward = 0,
  upgradedPillars = [],
  speedRun = null,
  bugFixerBonus = false,
  unlockedFacts = [],
  onPlayDash,
  onReplay,
  onOpenMap,
  onOpenTrophies,
  onOpenShop,
  onOpenSandbox,
  onNextLevel
}) => {
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level Victory"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-3 sm:p-4"
    >
      <div className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-md flex-col items-center gap-3.5 overflow-y-auto rounded-3xl border-2 border-emerald-400/80 bg-slate-900 p-4 shadow-2xl sm:gap-4 sm:p-6">
        {/* Bug Buster Mission Solved Banner */}
        {isDebugMission && (
          <div
            data-testid="victory-debug-squashed-banner"
            className="flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-violet-400/80 bg-violet-500/20 px-4 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/25 text-violet-200">
                <Bug className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="text-sm font-black text-white">Bug Fixed!</div>
            </div>
            {debugBoltReward > 0 && (
              <span className="tabular inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-950/80 px-2.5 py-1 text-xs font-black text-amber-300">
                <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                +{debugBoltReward}
              </span>
            )}
          </div>
        )}

        {/* 3 Big Stars */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`h-14 w-14 transition-transform ${
                s === 2 ? '-translate-y-2 h-16 w-16' : ''
              } ${
                s <= stars
                  ? 'fill-amber-400 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                  : 'fill-slate-800 text-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Bonus Star Badge & Visual Criteria (IDs kept clean for test parity) */}
        <div
          id="victoryBonusRow"
          className={`flex w-full items-center justify-between gap-2 rounded-2xl border-2 px-4 py-2.5 ${
            bonusEarned
              ? 'border-amber-300 bg-amber-400/20 text-amber-200'
              : 'border-slate-700 bg-slate-800/80 text-slate-300'
          }`}
        >
          <div id="victoryBonusBadge" className="flex items-center gap-2">
            <Award className={`h-7 w-7 ${bonusEarned ? 'text-amber-300' : 'text-slate-500'}`} />
            <Star className={`h-6 w-6 ${bonusEarned ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`} />
          </div>

          <div id="victoryBonusCriteria" className="flex items-center gap-2.5 tabular text-sm font-black">
            <span className={`flex items-center gap-1 rounded-xl px-2 py-1 ${fullCrystals ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
              <Gem className="h-4 w-4 text-cyan-300" />
              <span>{collectedCrystals}/{totalCrystals}</span>
              {fullCrystals ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-rose-400" />}
            </span>
            <span className={`flex items-center gap-1 rounded-xl px-2 py-1 ${withinBlockPar ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
              <Puzzle className="h-4 w-4 text-sky-300" />
              <span>{blockCount}/{parBlocks}</span>
            </span>
            <span className={`flex items-center gap-1 rounded-xl px-2 py-1 ${withinBudgetPar ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
              <Zap className="h-4 w-4 text-amber-300" />
              <span>{energyCost}/{parBudget}</span>
            </span>
          </div>
        </div>

        {/* Speed-Run Challenge Summary (shown only when Challenge Timer was enabled) */}
        {speedRun && speedRun.evaluation.enabled && (
          <div
            data-testid="victory-speedrun-card"
            className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 ${
              speedRun.evaluation.tier === 'gold'
                ? 'border-amber-300 bg-amber-400/18 text-amber-100'
                : speedRun.evaluation.tier === 'silver'
                  ? 'border-sky-300 bg-sky-400/18 text-sky-100'
                  : speedRun.evaluation.tier === 'bronze'
                    ? 'border-orange-300 bg-orange-400/18 text-orange-100'
                    : 'border-slate-600 bg-slate-800/85 text-slate-200'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950/60">
                <Timer className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    data-testid="victory-speedrun-tier"
                    className="text-xs font-black uppercase tracking-wide"
                  >
                    {speedRun.evaluation.label}
                  </span>
                  {speedRun.isNewRecord && (
                    <span
                      data-testid="victory-speedrun-record"
                      className="rounded-md bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-950"
                    >
                      New Best!
                    </span>
                  )}
                </div>
                <div className="tabular text-[11px] font-semibold opacity-85">
                  Best {formatChallengeTime(speedRun.bestMs)}
                  {speedRun.evaluation.nextTargetMs
                    ? ` · Next ≤${formatChallengeTime(speedRun.evaluation.nextTargetMs)}`
                    : ' · Top Tier!'}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span
                data-testid="victory-speedrun-time"
                className="tabular text-base font-black leading-tight"
              >
                {formatChallengeTime(speedRun.evaluation.elapsedMs)}
              </span>
              {speedRun.evaluation.bonusBolts > 0 ? (
                <span
                  data-testid="victory-speedrun-bolts"
                  className="tabular inline-flex items-center gap-0.5 rounded-lg bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-black text-amber-300"
                >
                  <Zap className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                  +{speedRun.evaluation.bonusBolts}
                </span>
              ) : (
                <span
                  data-testid="victory-speedrun-bolts"
                  className="tabular text-[10px] font-bold opacity-75"
                >
                  ≤{formatChallengeTime(speedRun.evaluation.targets.bronzeMs)} for bonus
                </span>
              )}
            </div>
          </div>
        )}

        {/* Growth-Mindset Bug Fixer Reward */}
        {bugFixerBonus && (
          <div
            data-testid="victory-bug-fixer-card"
            className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-sky-400/75 bg-sky-500/15 px-3.5 py-2 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
                <Bug className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="text-xs font-black text-white">Bug Fixer Bonus</div>
            </div>
            <span className="tabular inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950/75 px-2 py-0.5 text-xs font-black text-amber-300">
              <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
              +15
            </span>
          </div>
        )}

        {/* Newly Collected Real-World STEM Fact Card Preview */}
        {unlockedFacts.length > 0 && (
          <button
            type="button"
            onClick={onOpenTrophies}
            data-testid="victory-fact-card-preview"
            className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-emerald-400/60 bg-emerald-500/12 px-3.5 py-2 text-left transition-colors hover:bg-emerald-500/20 active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">
                  New STEM Card Unlocked · {unlockedFacts[0].title}
                </div>
                <div className="truncate text-[11px] font-medium text-emerald-200">
                  {unlockedFacts[0].realWorldExample}
                </div>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-black text-emerald-300">View</span>
          </button>
        )}

        {/* Enter Mission Game Room CTA */}
        <button
          id="victoryWallRunBtn"
          type="button"
          onClick={onPlayDash}
          aria-label="Enter Game Room"
          className="flex h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 border-fuchsia-300 bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 text-white shadow-[0_4px_0_#6b21a8] transition-transform hover:brightness-105 active:translate-y-0.5"
        >
          <div className="flex items-center gap-3 text-left">
            <Gamepad2 className="h-8 w-8 shrink-0 text-amber-300" />
            <div className="text-base font-black leading-tight text-white">Arcade Games</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Zap className="h-5 w-5 fill-amber-300 text-amber-300" />
            <span className="tabular text-base font-black">+50</span>
            <Play className="h-5 w-5 fill-white" />
          </div>
        </button>

        {/* Bottom Action Row */}
        <div className="flex w-full items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onReplay}
            aria-label="Replay Level"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-600 bg-slate-800 text-slate-100 hover:border-sky-400 active:scale-95"
          >
            <RotateCcw className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            aria-label="Level Map"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-600 bg-slate-800 text-sky-300 hover:border-sky-400 active:scale-95"
          >
            <LayoutGrid className="h-7 w-7" />
          </button>
          {onOpenTrophies && (
            <button
              id="victoryTrophyBtn"
              type="button"
              onClick={onOpenTrophies}
              aria-label="Open STEM Trophy Shelf"
              className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-transform active:scale-95 ${
                upgradedPillars.length > 0
                  ? 'border-amber-300 bg-amber-500/25 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                  : 'border-slate-600 bg-slate-800 text-amber-300 hover:border-amber-300'
              }`}
            >
              <span className={upgradedPillars.length > 0 ? 'anim-reward-hop inline-flex' : 'inline-flex'}>
                <Trophy className="h-7 w-7" />
              </span>
              {upgradedPillars.length > 0 && (
                <span className="tabular absolute -right-1.5 -top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-400 px-1 text-xs font-black text-slate-950 shadow">
                  +{upgradedPillars.length}
                </span>
              )}
            </button>
          )}
          {onOpenShop && (
            <button
              id="victoryShopBtn"
              type="button"
              onClick={onOpenShop}
              aria-label="Open Bolt Upgrade Shop"
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-amber-500/15 text-amber-300 hover:border-amber-300 active:scale-95"
            >
              <ShoppingBag className="h-7 w-7" />
            </button>
          )}
          {isSandbox && onOpenSandbox && (
            <button
              id="victoryEditSandboxBtn"
              type="button"
              onClick={onOpenSandbox}
              aria-label="Edit Sandbox Mission"
              className="flex h-16 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-amber-300 bg-amber-400 px-4 text-sm font-black text-slate-950 shadow-[0_5px_0_#b45309] active:translate-y-0.5"
            >
              <Hammer className="h-5 w-5" aria-hidden="true" />
              <span>Edit Lab</span>
            </button>
          )}
          {hasNextLevel && (
            <button
              type="button"
              data-start="true"
              onClick={onNextLevel}
              aria-label="Next Level"
              className="flex h-16 flex-1 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_5px_0_#047857] active:translate-y-0.5"
            >
              <Play className="h-8 w-8 fill-slate-950" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface LevelMapModalProps {
  visible: boolean;
  save: SaveProfile;
  currentLevelId: number;
  initialTab?: 'story' | 'debug';
  onSelectLevel: (id: number) => void;
  onSelectDebugMission?: (missionId: string) => void;
  onStartDaily: () => void;
  onOpenSandbox?: () => void;
  onOpenClassCode?: () => void;
  onClose: () => void;
}

export const LevelMapModal: React.FC<LevelMapModalProps> = ({
  visible,
  save,
  currentLevelId,
  initialTab = 'story',
  onSelectLevel,
  onSelectDebugMission,
  onStartDaily,
  onOpenSandbox,
  onOpenClassCode,
  onClose
}) => {
  const speech = useReadAloud();
  const [mapTab, setMapTab] = useState<'story' | 'debug'>(initialTab);

  useEffect(() => {
    if (visible) {
      setMapTab(initialTab);
    } else {
      SPEECH.stop();
    }
  }, [visible, initialTab]);

  if (!visible) return null;

  const history = buildBeatenLevelHistory(save);
  const shields = normalizeStreakShields(save.streakShields);
  const allLevelsById = new Map([...LEVELS, ...BONUS_LEVELS].map((l) => [l.id, l]));
  const debugSolvedCount = DEBUG_MISSIONS.filter((m) => Boolean(save.debugCompleted?.[m.id])).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level Map"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-3 sm:p-4"
    >
      <div className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-2xl flex-col gap-3.5 overflow-y-auto rounded-3xl border-2 border-slate-600 bg-slate-900 p-4 shadow-2xl sm:gap-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sky-300">
            <LayoutGrid className="h-7 w-7 shrink-0" />
            <button
              type="button"
              onClick={onStartDaily}
              aria-label="Daily Challenge"
              className="flex h-11 items-center gap-1.5 rounded-2xl border-2 border-orange-400 bg-orange-500/20 px-3 text-orange-300"
            >
              <Flame className="h-5 w-5 fill-orange-400" />
              <span className="tabular font-black">{save.daily.streak || 0}</span>
            </button>
            <div
              data-testid="map-streak-shields"
              aria-label={`Streak Shields ${shields} of ${STREAK_SHIELD_MAX}`}
              className="flex h-11 items-center gap-1.5 rounded-2xl border border-cyan-400/50 bg-cyan-500/15 px-3 text-xs font-black text-cyan-200 tabular-nums"
            >
              <Shield className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <span>{shields}/{STREAK_SHIELD_MAX}</span>
            </div>
            {onOpenSandbox && (
              <button
                id="mapOpenSandboxBtn"
                type="button"
                onClick={() => {
                  SPEECH.stop();
                  onClose();
                  onOpenSandbox();
                }}
                className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-amber-400/75 bg-amber-500/20 px-3 text-xs font-black text-amber-200 hover:bg-amber-500/30 active:scale-95"
              >
                <Hammer className="h-4 w-4" aria-hidden="true" />
                <span>Sandbox</span>
              </button>
            )}
            {onOpenClassCode && (
              <button
                id="mapOpenClassCodeBtn"
                type="button"
                onClick={() => {
                  SPEECH.stop();
                  onClose();
                  onOpenClassCode();
                }}
                className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-cyan-400/75 bg-cyan-500/20 px-3 text-xs font-black text-cyan-200 hover:bg-cyan-500/30 active:scale-95"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>Class Code</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              SPEECH.stop();
              onClose();
            }}
            aria-label="Close Map"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Story Campaign vs Bug Buster Debug Challenges Switcher */}
        {onSelectDebugMission && (
          <div
            role="tablist"
            aria-label="Mission Modes"
            className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-1"
          >
            <button
              id="mapStoryTabBtn"
              type="button"
              role="tab"
              aria-selected={mapTab === 'story'}
              onClick={() => setMapTab('story')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-colors sm:text-sm ${
                mapTab === 'story'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span>Story Campaign</span>
            </button>
            <button
              id="mapDebugTabBtn"
              type="button"
              role="tab"
              aria-selected={mapTab === 'debug'}
              onClick={() => setMapTab('debug')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-colors sm:text-sm ${
                mapTab === 'debug'
                  ? 'bg-violet-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bug className="h-4 w-4" aria-hidden="true" />
              <span>Bug Buster ({debugSolvedCount}/{DEBUG_MISSIONS.length})</span>
            </button>
          </div>
        )}

        {/* Bug Buster Debug Missions Grid (Zero-Reading Visual Cards) */}
        {mapTab === 'debug' && onSelectDebugMission && (
          <section
            aria-label="Bug Buster Debug Missions"
            data-testid="bug-buster-section"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
          >
            {DEBUG_MISSIONS.map((mission) => {
              const solved = Boolean(save.debugCompleted?.[mission.id]);
              return (
                <button
                  key={mission.id}
                  type="button"
                  data-debug-mission={mission.id}
                  onClick={() => {
                    SPEECH.stop();
                    onSelectDebugMission(mission.id);
                  }}
                  aria-label={`Bug ${mission.order} ${mission.name}`}
                  className={`flex flex-col items-center justify-between gap-2 rounded-2xl border-2 p-3 text-center transition-transform active:scale-95 ${
                    solved
                      ? 'border-emerald-400/80 bg-emerald-950/35 hover:border-emerald-300'
                      : 'border-violet-500/75 bg-slate-950/90 hover:border-violet-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="tabular text-xs font-black text-violet-300">#{mission.order}</span>
                    {solved ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="tabular inline-flex items-center gap-0.5 text-xs font-black text-amber-300">
                        <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                        +{mission.boltReward}
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${
                      solved
                        ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                        : 'border-violet-400/70 bg-violet-500/20 text-violet-200'
                    }`}
                  >
                    <Bug className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div className="max-w-full truncate text-xs font-black text-white">
                    {mission.skillTag}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Story Campaign (Ages 6–12) */}
        {mapTab === 'story' && (
        <div className="flex flex-col gap-3">
          {STORY_CHAPTERS.map((chapter) => {
            const chapterSpeechId = `chapter_${chapter.id}`;
            const isSpeakingChapter = speech.speaking && speech.activeId === chapterSpeechId;
            return (
              <section
                key={chapter.id}
                data-story-chapter={chapter.id}
                aria-label={chapter.title}
                className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/75 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-white">{chapter.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-sky-300">{chapter.ageBand}</span>
                    {speech.supported && (
                      <button
                        type="button"
                        data-listen-chapter={chapter.id}
                        onClick={() =>
                          SPEECH.toggleSpeak(
                            `${chapter.title}. ${chapter.briefingLines.join(' ')}`,
                            chapterSpeechId
                          )
                        }
                        aria-label={
                          isSpeakingChapter
                            ? `Stop reading ${chapter.title}`
                            : `Listen to ${chapter.title}`
                        }
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-transform active:scale-95 ${
                          isSpeakingChapter
                            ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                            : 'border-slate-700 bg-slate-900 text-sky-200 hover:border-sky-400'
                        }`}
                      >
                        {isSpeakingChapter ? (
                          <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        ) : (
                          <Volume2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {chapter.levelIds.map((lvlId) => {
                    const lvl = allLevelsById.get(lvlId);
                    if (!lvl) return null;
                    const isBonus = Boolean(lvl.isBonus);
                    const unlocked = isBonus ? true : lvl.id <= save.unlockedLevel;
                    const rec = isBonus ? save.bonusStars[lvl.id] : undefined;
                    const st = isBonus
                      ? typeof rec === 'object'
                        ? rec.stars
                        : typeof rec === 'number'
                          ? rec
                          : 0
                      : save.stars[lvl.id] || 0;
                    const bStar = isBonus && typeof rec === 'object' ? rec.bonusStar : false;
                    const active = currentLevelId === lvl.id;
                    const isBoss = Boolean(lvl.isBoss);

                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => onSelectLevel(lvl.id)}
                        aria-label={
                          isBoss
                            ? `Boss Level ${lvl.id} ${lvl.name}`
                            : isBonus
                              ? `Bonus Level ${lvl.id}`
                              : `Level ${lvl.id}`
                        }
                        className={`relative flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 transition-transform active:scale-95 ${
                          active
                            ? 'border-amber-300 bg-amber-400/20'
                            : isBoss
                              ? 'border-amber-400/85 bg-gradient-to-b from-amber-950/75 to-slate-900 hover:border-amber-300'
                              : isBonus
                                ? 'border-violet-500/70 bg-slate-800 hover:border-violet-300'
                                : unlocked
                                  ? 'border-sky-400/70 bg-slate-800 hover:border-sky-300'
                                  : 'border-slate-800 bg-slate-950 opacity-50'
                        }`}
                      >
                        {bStar && <Award className="absolute right-1.5 top-1.5 h-4 w-4 text-amber-300" />}
                        {isBoss && !bStar && (
                          <Shield className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        )}
                        {unlocked ? (
                          <span
                            className={`tabular text-xl font-black leading-none ${
                              isBoss
                                ? 'text-amber-300'
                                : isBonus
                                  ? 'text-violet-200'
                                  : 'text-white'
                            }`}
                          >
                            {isBoss ? `BOSS` : lvl.id}
                          </span>
                        ) : (
                          <Lock className="h-5 w-5 text-slate-500" />
                        )}
                        <span className="max-w-full truncate text-[10px] font-bold text-slate-300">
                          {lvl.name}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= st ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        )}

        {/* Beaten Levels History */}
        <section
          aria-label="Mission History"
          data-testid="level-map-history"
          className="flex flex-col gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/75 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <History className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Mission History
              </h3>
            </div>
            <span
              data-testid="level-map-history-count"
              className="tabular rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-black text-sky-300"
            >
              {history.length} Cleared
            </span>
          </div>

          {history.length === 0 ? (
            <p
              data-testid="level-map-history-empty"
              className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 px-3 py-2.5 text-center text-xs font-medium text-slate-400"
            >
              Beat any mission to record your star ratings and best completion times.
            </p>
          ) : (
            <div
              data-testid="level-map-history-list"
              className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5"
            >
              {history.map((entry) => {
                const timeBadgeTone =
                  entry.speedTier === 'gold'
                    ? 'border-amber-300/65 bg-amber-400/15 text-amber-200'
                    : entry.speedTier === 'silver'
                      ? 'border-sky-300/65 bg-sky-400/15 text-sky-200'
                      : entry.speedTier === 'bronze'
                        ? 'border-orange-300/65 bg-orange-400/15 text-orange-200'
                        : 'border-slate-700 bg-slate-900 text-slate-200';

                const tagTone =
                  entry.kind === 'bonus'
                    ? 'border-violet-400/60 bg-violet-500/20 text-violet-200'
                    : entry.kind === 'daily'
                      ? 'border-orange-400/60 bg-orange-500/20 text-orange-200'
                      : 'border-sky-400/60 bg-sky-500/20 text-sky-200';

                const timeText =
                  entry.bestMs !== null ? formatChallengeTime(entry.bestMs) : 'Untimed';
                const rowAria = `${entry.label} ${entry.name}, ${entry.stars} of 3 stars${
                  entry.bonusStar ? ', bonus star earned' : ''
                }, ${entry.bestMs !== null ? `best time ${timeText}` : 'untimed'}`;

                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-label={rowAria}
                    onClick={() =>
                      entry.kind === 'daily' ? onStartDaily() : onSelectLevel(entry.levelId)
                    }
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-left transition-colors hover:border-sky-400/60 hover:bg-slate-800/90 active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`tabular inline-flex h-6 min-w-[2.1rem] shrink-0 items-center justify-center rounded-lg border px-1.5 text-[11px] font-black ${tagTone}`}
                      >
                        {entry.kind === 'daily' ? (
                          <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-300" aria-hidden="true" />
                        ) : (
                          entry.shortTag
                        )}
                      </span>
                      <span className="truncate text-xs font-bold text-slate-100">
                        {entry.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= entry.stars
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                        {entry.bonusStar && (
                          <Award className="ml-0.5 h-3.5 w-3.5 text-amber-300" />
                        )}
                      </div>

                      {entry.bestMs !== null ? (
                        <span
                          className={`tabular inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-black ${timeBadgeTone}`}
                        >
                          <Timer className="h-3 w-3" aria-hidden="true" />
                          <span>{timeText}</span>
                        </span>
                      ) : (
                        <span className="rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                          Untimed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenSettings?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  visible,
  onResume,
  onRestart,
  onHome,
  onOpenSettings
}) => {
  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="anim-pop flex items-center gap-3 rounded-3xl border-2 border-slate-600 bg-slate-900 p-5 shadow-2xl sm:gap-4 sm:p-6">
        <button
          type="button"
          onClick={onHome}
          aria-label="Home"
          className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-slate-600 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95 sm:h-20 sm:w-20"
        >
          <Home className="h-8 w-8 sm:h-9 sm:w-9" />
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart"
          className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-slate-600 bg-slate-800 text-amber-300 hover:border-amber-300 active:scale-95 sm:h-20 sm:w-20"
        >
          <RotateCcw className="h-8 w-8 sm:h-9 sm:w-9" />
        </button>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Audio and Settings"
            className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-slate-600 bg-slate-800 text-sky-300 hover:border-sky-400 active:scale-95 sm:h-20 sm:w-20"
          >
            <Settings className="h-8 w-8 sm:h-9 sm:w-9" />
          </button>
        )}
        <button
          type="button"
          onClick={onResume}
          aria-label="Resume"
          className="flex h-16 w-20 items-center justify-center rounded-3xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_5px_0_#047857] active:translate-y-0.5 sm:h-20 sm:w-24"
        >
          <Play className="h-9 w-9 fill-slate-950 sm:h-10 sm:w-10" />
        </button>
      </div>
    </div>
  );
};
