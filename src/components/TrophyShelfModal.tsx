import React, { useEffect } from 'react';
import {
  Cpu,
  Crown,
  Eye,
  Flame,
  Mountain,
  Repeat,
  Star,
  Trophy,
  Wrench,
  X
} from 'lucide-react';
import {
  computeStemSkillBadges,
  type SkillStats,
  type StemPillarId
} from '../game/engine';

interface TrophyShelfModalProps {
  visible: boolean;
  profileName?: string;
  skillStats?: Partial<SkillStats>;
  upgradedPillars?: StemPillarId[];
  onClose: () => void;
}

const PILLAR_META: Record<
  StemPillarId,
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
  optics: { label: 'Laser Optics', Icon: Cpu, accent: 'text-cyan-300' }
};

export const TrophyShelfModal: React.FC<TrophyShelfModalProps> = ({
  visible,
  profileName,
  skillStats,
  upgradedPillars = [],
  onClose
}) => {
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const badges = computeStemSkillBadges(skillStats);
  const totalTiers = badges.reduce((sum, b) => sum + b.tier, 0);

  return (
    <div
      id="trophyShelfModal"
      role="dialog"
      aria-modal="true"
      aria-label="STEM Trophy Shelf"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-lg flex-col gap-3.5 overflow-y-auto rounded-3xl border-2 border-amber-400/75 bg-slate-900 p-4 shadow-2xl sm:gap-4 sm:p-5"
      >
        {/* Top Row: Trophy Medallion + Personalized Profile Title + Tier Counter + Close Button */}
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
                aria-label={`Earned ${totalTiers} of 18 trophy tiers`}
                className="inline-flex items-center gap-1.5 text-amber-300 tabular text-base font-black"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{totalTiers}/18 STEM Tiers</span>
              </div>
            </div>
          </div>

          <button
            id="closeTrophyBtn"
            type="button"
            onClick={onClose}
            aria-label="Close Trophy Shelf"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-300 active:scale-95"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 6 STEM Skill Mastery Cards (Pure Icons, Stars/Crowns, Progress Bars, Numbers) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((badge) => {
            const meta = PILLAR_META[badge.id];
            const IconComp = meta.Icon;
            const isUpgraded = upgradedPillars.includes(badge.id);
            const pct = Math.min(100, Math.round((badge.count / Math.max(1, badge.nextTarget)) * 100));

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
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 ${medalBg}`}
                >
                  <span className={isUpgraded ? 'anim-reward-hop inline-flex' : 'inline-flex'}>
                    <IconComp
                      className={`h-8 w-8 ${badge.tier === 0 ? 'text-slate-500' : meta.accent}`}
                    />
                  </span>
                </div>

                {/* 3-Tier Bronze / Silver / Gold Stars */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((t) => (
                    <Star
                      key={t}
                      className={`h-4 w-4 ${
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

                {/* Progress Bar + Numeric Ratio */}
                <div className="flex w-full items-center gap-1.5">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-950/80">
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
                  <span className="tabular text-xs font-black text-slate-200">
                    {badge.count}/{badge.nextTarget}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
