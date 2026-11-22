import React, { useMemo } from 'react';
import { BookOpen, Sparkles, Trophy, X } from 'lucide-react';
import type { AcademyBadgeProgress, StemFactCardDef } from '../game/educationStrategy';
import {
  createMilestoneParticleBurst,
  type MilestoneParticleSpec,
  type MilestoneUnlockKind
} from '../game/milestoneParticles';

export interface MilestoneCelebrationEvent {
  id: number;
  kind: MilestoneUnlockKind;
  facts: StemFactCardDef[];
  badges: AcademyBadgeProgress[];
}

interface MilestoneCelebrationOverlayProps {
  event: MilestoneCelebrationEvent | null;
  lowGraphics?: boolean;
  onOpenTrophies: () => void;
  onDismiss: () => void;
}

function renderParticleGlyph(p: MilestoneParticleSpec) {
  if (p.shape === 'sparkle') {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <path
          d="M12 1.5L14.7 9.3L22.5 12L14.7 14.7L12 22.5L9.3 14.7L1.5 12L9.3 9.3Z"
          fill={p.color}
        />
      </svg>
    );
  }
  if (p.shape === 'diamond') {
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <polygon points="10,1 19,10 10,19 1,10" fill={p.color} />
      </svg>
    );
  }
  if (p.shape === 'ribbon') {
    return (
      <span
        className="block h-1.5 w-full rounded-full"
        style={{ backgroundColor: p.color }}
      />
    );
  }
  return (
    <span
      className="block h-full w-full rounded-full"
      style={{ backgroundColor: p.color }}
    />
  );
}

export const MilestoneCelebrationOverlay: React.FC<MilestoneCelebrationOverlayProps> = ({
  event,
  lowGraphics = false,
  onOpenTrophies,
  onDismiss
}) => {
  const burst = useMemo(() => {
    if (!event) return null;
    return createMilestoneParticleBurst(event.kind, event.id, lowGraphics);
  }, [event, lowGraphics]);

  if (!event || !burst) return null;

  const headline =
    event.kind === 'both'
      ? 'New STEM Fact & Mastery Badge!'
      : event.kind === 'fact'
        ? event.facts.length > 1
          ? `${event.facts.length} New STEM Facts Unlocked!`
          : 'New STEM Fact Unlocked!'
        : event.badges.length > 1
          ? `${event.badges.length} Mastery Badges Upgraded!`
          : 'New Mastery Badge Unlocked!';

  const factSummary = event.facts.map((f) => f.title).join(' · ');
  const badgeSummary = event.badges.map((b) => `${b.shortLabel} Tier ${b.tier}/3`).join(' · ');
  const detailLine = [factSummary, badgeSummary].filter(Boolean).join(' · ');

  const accentBorder =
    event.kind === 'fact'
      ? 'border-sky-300/85 shadow-[0_12px_40px_rgba(56,189,248,0.35)]'
      : 'border-amber-300/85 shadow-[0_12px_40px_rgba(251,191,36,0.35)]';

  const iconWrap =
    event.kind === 'fact'
      ? 'border-sky-300/75 bg-sky-500/20 text-sky-200'
      : 'border-amber-300/75 bg-amber-500/20 text-amber-200';

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center px-3 pt-4 sm:pt-6">
      {/* Radial Non-Blocking Particle Burst */}
      <div
        key={`burst-${event.id}`}
        data-testid="milestone-particle-burst"
        data-milestone-kind={event.kind}
        className="pointer-events-none fixed left-1/2 top-24 h-0 w-0 overflow-visible"
        aria-hidden="true"
      >
        {burst.halos.map((halo) => (
          <span
            key={halo.id}
            className="anim-milestone-halo absolute left-0 top-0 h-20 w-20 rounded-full border-2"
            style={
              {
                borderColor: halo.color,
                animationDelay: `${halo.delayMs}ms`,
                animationDuration: `${halo.durationMs}ms`,
                '--ms-scale': String(halo.maxScale)
              } as React.CSSProperties
            }
          />
        ))}
        {burst.particles.map((p) => (
          <span
            key={p.id}
            className="anim-milestone-particle absolute left-0 top-0 block"
            style={
              {
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delayMs}ms`,
                animationDuration: `${p.durationMs}ms`,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--ms-rot0': `${p.rotationDeg}deg`,
                '--ms-spin': `${p.spinDeg}deg`
              } as React.CSSProperties
            }
          >
            {renderParticleGlyph(p)}
          </span>
        ))}
      </div>

      {/* Compact Non-Blocking Celebration Banner */}
      <div
        role="status"
        aria-live="polite"
        data-testid="milestone-celebration-banner"
        data-milestone-kind={event.kind}
        className={`anim-milestone-banner pointer-events-auto relative flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl border-2 bg-slate-900/95 px-3.5 py-2.5 backdrop-blur-md ${accentBorder}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${iconWrap}`}
          >
            {event.kind === 'fact' ? (
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Trophy className="h-5 w-5" aria-hidden="true" />
            )}
            <Sparkles
              className="absolute -right-1.5 -top-1.5 h-4 w-4 text-amber-300"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-xs font-black uppercase tracking-wide text-white sm:text-sm">
              {headline}
            </div>
            {detailLine && (
              <div className="truncate text-[11px] font-semibold text-slate-200 sm:text-xs">
                {detailLine}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTrophies}
            className="min-h-[40px] whitespace-nowrap rounded-xl border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-transform hover:brightness-105 active:scale-95"
          >
            Open Shelf
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss milestone celebration"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 active:scale-95"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
