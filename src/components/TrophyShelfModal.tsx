import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  Bug,
  Cpu,
  Crown,
  Eye,
  Flame,
  GitBranch,
  Layers,
  Lock,
  Mountain,
  Repeat,
  Square,
  Star,
  ToggleRight,
  Trophy,
  Volume2,
  Wrench,
  X
} from 'lucide-react';
import type { SkillStats } from '../game/engine';
import {
  computeAcademySkillBadges,
  STEM_FACT_CARDS,
  type AcademyPillarId
} from '../game/educationStrategy';
import { SPEECH, useReadAloud } from '../game/readAloud';

interface TrophyShelfModalProps {
  visible: boolean;
  profileName?: string;
  skillStats?: Partial<SkillStats>;
  upgradedPillars?: AcademyPillarId[];
  unlockedFactIds?: string[];
  initialTab?: 'badges' | 'facts';
  onClose: () => void;
}

const PILLAR_META: Record<
  AcademyPillarId,
  {
    label: string;
    Icon: React.FC<{ className?: string }>;
    accent: string;
  }
> = {
  chassis: { label: 'Chassis Engineering', Icon: Wrench, accent: 'text-sky-300' },
  physics: { label: 'Jump & Boost Physics', Icon: Flame, accent: 'text-amber-300' },
  mud: { label: 'Terrain Traction', Icon: Mountain, accent: 'text-emerald-300' },
  loops: { label: 'Loop Compression', Icon: Repeat, accent: 'text-teal-300' },
  sensors: { label: 'Smart Sensors', Icon: Eye, accent: 'text-violet-300' },
  optics: { label: 'Laser Optics', Icon: Cpu, accent: 'text-cyan-300' },
  debugging: { label: 'Bug Detective', Icon: Bug, accent: 'text-rose-300' },
  logic: { label: 'Digital Logic', Icon: ToggleRight, accent: 'text-fuchsia-300' },
  branching: { label: 'IF / ELSE Branching', Icon: GitBranch, accent: 'text-amber-300' },
  functions: { label: 'Functions & Reuse', Icon: Layers, accent: 'text-indigo-300' },
  prediction: { label: 'Predict & Timing', Icon: Brain, accent: 'text-sky-300' }
};

export const TrophyShelfModal: React.FC<TrophyShelfModalProps> = ({
  visible,
  profileName,
  skillStats,
  upgradedPillars = [],
  unlockedFactIds = [],
  initialTab = 'badges',
  onClose
}) => {
  const [tab, setTab] = useState<'badges' | 'facts'>(initialTab);
  const speech = useReadAloud();

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
    } else {
      SPEECH.stop();
    }
  }, [visible, initialTab]);

  useEffect(() => {
    return () => {
      SPEECH.stop();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        SPEECH.stop();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const badges = computeAcademySkillBadges(skillStats);
  const totalTiers = badges.reduce((sum, b) => sum + b.tier, 0);
  const maxTiers = badges.length * 3;
  const unlockedSet = new Set(unlockedFactIds);

  return (
    <div
      id="trophyShelfModal"
      role="dialog"
      aria-modal="true"
      aria-label="STEM Trophy Shelf"
      onClick={() => {
        SPEECH.stop();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-2xl flex-col gap-3.5 overflow-y-auto rounded-3xl border-2 border-amber-400/75 bg-slate-900 p-4 shadow-2xl sm:gap-4 sm:p-5"
      >
        {/* Top Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300 bg-amber-400/20 text-amber-300">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              {profileName && (
                <div className="truncate text-sm font-black text-white">
                  {profileName}
                </div>
              )}
              <div
                aria-label={`Earned ${totalTiers} of ${maxTiers} trophy tiers`}
                className="inline-flex items-center gap-1.5 text-amber-300 tabular text-base font-black"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{totalTiers}/{maxTiers}</span>
              </div>
            </div>
          </div>

          <button
            id="closeTrophyBtn"
            type="button"
            onClick={() => {
              SPEECH.stop();
              onClose();
            }}
            aria-label="Close Trophy Shelf"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-300 active:scale-95"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Segmented Tab Switch: Badges vs Field Cards */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5">
          <button
            id="trophyTabBadgesBtn"
            type="button"
            onClick={() => setTab('badges')}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-colors ${
              tab === 'badges'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span>Badges</span>
          </button>
          <button
            id="trophyTabFactsBtn"
            type="button"
            onClick={() => setTab('facts')}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-colors tabular-nums ${
              tab === 'facts'
                ? 'bg-sky-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Cards {unlockedSet.size}/{STEM_FACT_CARDS.length}</span>
          </button>
        </div>

        {tab === 'badges' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((badge) => {
              const meta = PILLAR_META[badge.id];
              const IconComp = meta.Icon;
              const isUpgraded = upgradedPillars.includes(badge.id);
              const pct = badge.pct;

              const cardBorder =
                badge.tier === 3
                  ? 'border-amber-300 bg-gradient-to-b from-amber-500/25 to-slate-800/95 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                  : badge.tier === 2
                    ? 'border-sky-300/80 bg-gradient-to-b from-sky-500/20 to-slate-800/95'
                    : badge.tier === 1
                      ? 'border-orange-400/75 bg-gradient-to-b from-orange-500/20 to-slate-800/95'
                      : 'border-slate-700 bg-slate-800/70';

              const medalBg =
                badge.tier === 3
                  ? 'border-amber-300 bg-amber-400/25'
                  : badge.tier === 2
                    ? 'border-slate-200 bg-slate-300/20'
                    : badge.tier === 1
                      ? 'border-orange-400 bg-orange-500/20'
                      : 'border-slate-600 bg-slate-900';

              return (
                <div
                  key={badge.id}
                  data-pillar={badge.id}
                  data-tier={badge.tier}
                  aria-label={`${meta.label} tier ${badge.tier} count ${badge.count} of ${badge.nextTarget}`}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-transform ${cardBorder} ${
                    isUpgraded ? 'ring-2 ring-emerald-300' : ''
                  }`}
                >
                  {badge.tier === 3 && (
                    <Crown className="absolute right-2 top-2 h-4 w-4 fill-amber-300 text-amber-300" />
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${medalBg}`}
                  >
                    <span className={isUpgraded ? 'anim-reward-hop inline-flex' : 'inline-flex'}>
                      <IconComp
                        className={`h-7 w-7 ${badge.tier === 0 ? 'text-slate-500' : meta.accent}`}
                      />
                    </span>
                  </div>

                  <div className="text-center text-xs font-black text-white leading-tight">
                    {badge.shortLabel}
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((t) => (
                      <Star
                        key={t}
                        className={`h-3.5 w-3.5 ${
                          t <= badge.tier
                            ? badge.tier === 3
                              ? 'fill-amber-300 text-amber-300'
                              : badge.tier === 2
                                ? 'fill-sky-300 text-sky-300'
                                : 'fill-orange-400 text-orange-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex w-full items-center gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950/80">
                      <div
                        className={`h-full rounded-full transition-all ${
                          badge.tier === 3
                            ? 'bg-amber-400'
                            : badge.tier === 2
                              ? 'bg-sky-400'
                              : badge.tier === 1
                                ? 'bg-orange-400'
                                : 'bg-slate-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="tabular text-[11px] font-black text-slate-200">
                      {badge.count}/{badge.nextTarget}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div data-testid="stem-fact-cards-deck" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STEM_FACT_CARDS.map((card) => {
              const isUnlocked = unlockedSet.has(card.id);
              const meta = PILLAR_META[card.pillar];
              const IconComp = meta.Icon;
              const speechId = `fact_${card.id}`;
              const isSpeakingCard = speech.speaking && speech.activeId === speechId;

              return (
                <article
                  key={card.id}
                  data-fact-card={card.id}
                  data-unlocked={isUnlocked ? 'true' : 'false'}
                  className={`flex flex-col gap-2 rounded-2xl border-2 p-3.5 transition-colors ${
                    isUnlocked
                      ? 'border-sky-400/70 bg-slate-800/85'
                      : 'border-slate-800 bg-slate-950/75 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isUnlocked
                            ? 'border-sky-400/60 bg-slate-900'
                            : 'border-slate-700 bg-slate-900 text-slate-500'
                        }`}
                      >
                        {isUnlocked ? (
                          <IconComp className={`h-5 w-5 ${meta.accent}`} />
                        ) : (
                          <Lock className="h-4.5 w-4.5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-white">
                          {isUnlocked ? card.title : 'Locked Field Card'}
                        </h3>
                        <div className="text-[11px] font-bold text-slate-400">
                          {meta.label} · {card.unlockedByLabel}
                        </div>
                      </div>
                    </div>

                    {isUnlocked && speech.supported && (
                      <button
                        type="button"
                        data-listen-fact={card.id}
                        onClick={() =>
                          SPEECH.toggleSpeak(
                            `${card.title}. ${card.summary} Real world example: ${card.realWorldExample}`,
                            speechId
                          )
                        }
                        aria-label={
                          isSpeakingCard
                            ? `Stop reading ${card.title}`
                            : `Listen to ${card.title}`
                        }
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-transform active:scale-95 ${
                          isSpeakingCard
                            ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                            : 'border-sky-400/70 bg-sky-500/15 text-sky-200 hover:border-sky-300'
                        }`}
                      >
                        {isSpeakingCard ? (
                          <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                        ) : (
                          <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>

                  {isUnlocked ? (
                    <div className="rounded-xl border border-emerald-400/35 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200">
                      {card.realWorldExample}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>{card.unlockedByLabel}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
