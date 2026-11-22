import React from 'react';
import {
  ArrowRight,
  Flame,
  Ghost,
  HelpCircle,
  Home,
  LayoutGrid,
  Pause,
  Play,
  Puzzle,
  RotateCcw,
  Settings,
  Star,
  Timer,
  Volume2,
  VolumeX,
  Wrench,
  Zap
} from 'lucide-react';
import { BOT_CHARACTERS, type BotCharacterId, type PartId } from '../game/engine';
import {
  computeLiveTimerTier,
  formatChallengeTime,
  type LevelTimeTargets
} from '../game/challengeTimer';
import type { WorldMode } from '../three/worldScene';
import { HazardIcon, PartIcon, SparkBotEmblem } from './Icons';
import { MuteIndicator, useMuteFlash } from './MuteIndicator';

export interface MoodCue {
  mood: 'happy' | 'sad' | 'confused';
  hazard?: 'GAP' | 'MUD' | 'RAMP';
  part?: PartId;
}

interface TopHudProps {
  levelId: number;
  profileName: string;
  activeCharacter: BotCharacterId;
  isDaily?: boolean;
  isBonus?: boolean;
  starsEarned: number;
  mode: WorldMode;
  canCode: boolean;
  muted: boolean;
  ghostHelp: boolean;
  moodCue: MoodCue | null;
  challengeTimerEnabled: boolean;
  elapsedMs: number;
  timeTargets: LevelTimeTargets;
  timerPaused?: boolean;
  bestTimeMs?: number | null;
  onToggleChallengeTimer: () => void;
  onGoHome: () => void;
  onOpenMap: () => void;
  onOpenProfile: () => void;
  onSwitchPhase: (target: 'BUILD_3D' | 'CODE_3D') => void;
  onToggleGhost: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onPlayGhostFix?: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  levelId,
  profileName,
  activeCharacter,
  isDaily,
  isBonus,
  starsEarned,
  mode,
  canCode,
  muted,
  ghostHelp,
  moodCue,
  challengeTimerEnabled,
  elapsedMs,
  timeTargets,
  timerPaused = false,
  bestTimeMs = null,
  onToggleChallengeTimer,
  onGoHome,
  onOpenMap,
  onOpenProfile,
  onSwitchPhase,
  onToggleGhost,
  onReset,
  onToggleMute,
  onOpenSettings,
  onPause,
  onPlayGhostFix
}) => {
  const charDef = BOT_CHARACTERS[activeCharacter];
  const { visible: muteFlashVisible, flashKey: muteFlashKey } = useMuteFlash(muted);
  const activeStage =
    mode === 'BUILD_3D' || mode === 'PAINT_BOOTH'
      ? 0
      : mode === 'CODE_3D' || mode === 'SIMULATING'
        ? 1
        : mode === 'CIRCUIT_3D'
          ? 2
          : 3;

  const showTimerControl = mode !== 'ACTION_RUN_3D' && mode !== 'PLANET_ADVENTURE_3D';
  const liveTier = computeLiveTimerTier(elapsedMs, timeTargets);
  const timerTierClass =
    liveTier === 'gold'
      ? 'border-amber-300/95 bg-slate-900/94 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
      : liveTier === 'silver'
        ? 'border-sky-300/95 bg-slate-900/94 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.24)]'
        : liveTier === 'bronze'
          ? 'border-orange-300/95 bg-slate-900/94 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.24)]'
          : 'border-slate-500/90 bg-slate-900/94 text-slate-200';
  const tierHintLabel =
    liveTier === 'gold'
      ? `Gold ≤${formatChallengeTime(timeTargets.goldMs).slice(0, -2)}`
      : liveTier === 'silver'
        ? `Silver ≤${formatChallengeTime(timeTargets.silverMs).slice(0, -2)}`
        : liveTier === 'bronze'
          ? `Bronze ≤${formatChallengeTime(timeTargets.bronzeMs).slice(0, -2)}`
          : bestTimeMs
            ? `Best ${formatChallengeTime(bestTimeMs)}`
            : 'Timed';

  return (
    <div className="pointer-events-none safe-top fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-1.5 px-2 pb-1.5 sm:gap-2 sm:px-4 sm:pb-3">
      <div className="flex w-full flex-wrap items-center justify-between gap-1.5 sm:flex-nowrap sm:gap-2">
        {/* Top-Left: Home, Map, Level Number, Profile */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onGoHome}
            aria-label="Home Title Screen"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-slate-100 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            aria-label="Level Map"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-sky-300 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
          >
            <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Numeric Level Chip */}
          <div
            aria-label={isDaily ? 'Daily Challenge' : `Level ${levelId}`}
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-2.5 shadow-lg sm:h-11 sm:gap-2 sm:rounded-2xl sm:px-3 lg:h-12 ${
              isDaily
                ? 'border-orange-400/90 bg-slate-900/94 text-orange-300'
                : isBonus
                  ? 'border-violet-400/90 bg-slate-900/94 text-violet-300'
                  : 'border-slate-600/80 bg-slate-900/94 text-amber-300'
            }`}
          >
            {isDaily ? (
              <span className="anim-flame-flicker inline-flex">
                <Flame className="h-4 w-4 fill-orange-400 text-orange-400 sm:h-5 sm:w-5" />
              </span>
            ) : (
              <span className="tabular text-base font-black sm:text-lg">{levelId}</span>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    s <= starsEarned ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Active Save Profile & Bot Character Avatar Button */}
          <button
            id="hudProfileBtn"
            type="button"
            onClick={onOpenProfile}
            aria-label={`Open Save Profile (${profileName} — ${charDef.name})`}
            className="flex h-10 items-center gap-1.5 rounded-xl border-2 bg-slate-900/94 px-1.5 shadow-lg transition-transform hover:brightness-110 active:scale-95 sm:h-11 sm:rounded-2xl sm:px-2 lg:h-12"
            style={{ borderColor: charDef.accentCss }}
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-slate-800 sm:h-8 sm:w-8">
              {charDef.portraitUrl ? (
                <img
                  src={charDef.portraitUrl}
                  alt={charDef.name}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: charDef.portraitPosition,
                    transform: `scale(${charDef.portraitScale})`,
                    transformOrigin: charDef.portraitOrigin
                  }}
                />
              ) : (
                <SparkBotEmblem className="h-6 w-6 sm:h-7 sm:w-7" />
              )}
            </span>
            <span
              data-testid="hud-profile-name"
              className="hidden max-w-[116px] truncate text-xs font-black text-white lg:inline"
            >
              {profileName}
            </span>
          </button>
        </div>

        {/* 4-Stage Visual Progression Dots + Optional Challenge Timer */}
        <div className="pointer-events-auto order-3 mx-auto flex items-center gap-1.5 sm:order-none sm:mx-0 sm:gap-2">
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-900/94 px-2 shadow-lg sm:h-11 sm:rounded-2xl sm:px-2.5 lg:h-12">
            <button
              id="toBuildBtn"
              type="button"
              onClick={() => onSwitchPhase('BUILD_3D')}
              disabled={mode === 'SIMULATING' || mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D'}
              aria-label="3D Build Workshop"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform sm:h-8 sm:w-8 sm:rounded-xl lg:h-9 lg:w-9 ${
                activeStage === 0
                  ? 'bg-amber-400 text-slate-950 scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className={`inline-flex ${activeStage === 0 ? 'anim-stage-nudge' : ''}`}>
                <Wrench className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => canCode && onSwitchPhase('CODE_3D')}
              disabled={!canCode || mode === 'SIMULATING' || mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D'}
              aria-label="3D Code Track"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform sm:h-8 sm:w-8 sm:rounded-xl lg:h-9 lg:w-9 ${
                activeStage === 1
                  ? 'bg-sky-400 text-slate-950 scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
              }`}
            >
              <span className={`inline-flex ${activeStage === 1 ? 'anim-stage-nudge' : ''}`}>
                <Puzzle className="h-4 w-4" />
              </span>
            </button>
            <div
              aria-label="3D Laser Circuit"
              className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl lg:h-9 lg:w-9 ${
                activeStage === 2 ? 'bg-cyan-400 text-slate-950 scale-105' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`inline-flex ${activeStage === 2 ? 'anim-stage-nudge' : ''}`}>
                <Star className="h-4 w-4" />
              </span>
            </div>
            <div
              aria-label="3D Action Dash"
              className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl lg:h-9 lg:w-9 ${
                activeStage === 3 ? 'bg-fuchsia-400 text-slate-950 scale-105' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`inline-flex ${activeStage === 3 ? 'anim-stage-nudge' : ''}`}>
                <Zap className="h-4 w-4" />
              </span>
            </div>
          </div>

          {showTimerControl && (
            <button
              id="challengeTimerBtn"
              type="button"
              role="switch"
              aria-checked={challengeTimerEnabled}
              aria-label={
                challengeTimerEnabled
                  ? `Challenge Timer ${formatChallengeTime(elapsedMs)} — tap to disable`
                  : 'Enable Challenge Timer for Speed-Run Bonuses'
              }
              title={
                challengeTimerEnabled
                  ? `Gold ≤ ${formatChallengeTime(timeTargets.goldMs)} · Silver ≤ ${formatChallengeTime(timeTargets.silverMs)} · Bronze ≤ ${formatChallengeTime(timeTargets.bronzeMs)}${bestTimeMs ? ` · Best ${formatChallengeTime(bestTimeMs)}` : ''}`
                  : 'Enable optional Challenge Timer for speed-run bonus bolts'
              }
              onClick={onToggleChallengeTimer}
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 shadow-lg transition-transform hover:brightness-110 active:scale-95 sm:h-11 sm:rounded-2xl sm:px-3 lg:h-12 ${
                challengeTimerEnabled
                  ? timerTierClass
                  : 'border-slate-600/80 bg-slate-900/94 text-slate-300 hover:border-amber-300/80 hover:text-amber-200'
              }`}
            >
              <Timer
                className={`h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5 ${
                  challengeTimerEnabled ? (timerPaused ? 'opacity-60' : '') : 'text-amber-300'
                }`}
                aria-hidden="true"
              />
              {challengeTimerEnabled ? (
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="hud-challenge-timer-value"
                    className="tabular text-xs font-black tracking-tight sm:text-sm"
                  >
                    {formatChallengeTime(elapsedMs)}
                  </span>
                  <span
                    data-testid="hud-challenge-timer-tier"
                    className="hidden rounded-md bg-slate-950/65 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide xl:inline"
                  >
                    {timerPaused ? 'Paused' : tierHintLabel}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] font-extrabold uppercase tracking-wide sm:text-xs">
                  Timer
                </span>
              )}
            </button>
          )}
        </div>

        {/* Top-Right: Ghost Help, Reset (sm+), Sound, Settings (sm+), Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleGhost}
            aria-label="Visual Ghost Help"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg transition-transform active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12 ${
              ghostHelp
                ? 'border-amber-300 bg-amber-400 text-slate-950'
                : 'border-slate-600/80 bg-slate-900/94 text-amber-300 hover:border-amber-300'
            }`}
          >
            <span className={`inline-flex ${ghostHelp ? 'anim-stage-nudge' : ''}`}>
              <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </button>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset Stage"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-slate-100 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:flex sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
          >
            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-slate-100 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-400 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 text-sky-300 sm:h-5 sm:w-5" />}
            </button>
            <MuteIndicator muted={muted} visible={muteFlashVisible} flashKey={muteFlashKey} />
          </div>
          <button
            id="hudSettingsBtn"
            type="button"
            onClick={onOpenSettings}
            aria-label="Audio and Settings"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-sky-300 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:flex sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/94 text-slate-100 shadow-lg transition-transform hover:border-sky-400 active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl lg:h-12 lg:w-12"
          >
            <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Icon-Only Visual Mood & Solution Feedback Bubble (Zero Text) */}
      {moodCue && (
        <div
          role="status"
          aria-label={`Robot mood ${moodCue.mood}`}
          className={`pointer-events-auto anim-pop flex max-w-[92vw] items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2 shadow-xl sm:gap-3 sm:px-4 ${
            moodCue.mood === 'happy'
              ? 'border-emerald-400 bg-slate-900/95'
              : moodCue.mood === 'sad'
                ? 'border-rose-400 bg-slate-900/95'
                : 'border-violet-400 bg-slate-900/95'
          }`}
        >
          {/* Face Icon */}
          {moodCue.mood === 'happy' && (
            <svg viewBox="0 0 36 36" className="anim-happy h-9 w-9" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#10b981" />
              <path d="M9 16c2-3 4-3 6 0M21 16c2-3 4-3 6 0" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              <path d="M11 22c3 4 11 4 14 0" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            </svg>
          )}
          {moodCue.mood === 'sad' && (
            <svg viewBox="0 0 36 36" className="anim-stage-nudge h-9 w-9" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#fb7185" />
              <circle cx="12" cy="15" r="2.2" fill="#0f172a" />
              <circle cx="24" cy="15" r="2.2" fill="#0f172a" />
              <circle cx="12" cy="21" r="2.2" fill="#67e8f9" />
              <path d="M12 25c3-3 9-3 12 0" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
          )}
          {moodCue.mood === 'confused' && (
            <svg viewBox="0 0 36 36" className="anim-stage-nudge h-9 w-9" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#a78bfa" />
              <circle cx="12" cy="15" r="2.5" fill="#0f172a" />
              <rect x="21" y="14" width="6" height="2.6" rx="1.3" fill="#0f172a" />
              <path d="M12 24h12" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          )}

          {moodCue.hazard && <HazardIcon cond={moodCue.hazard} className="h-8 w-8" />}
          {moodCue.part && (
            <>
              <span className="anim-stage-nudge inline-flex">
                <ArrowRight className="h-6 w-6 stroke-[3] text-amber-300" />
              </span>
              <div className="anim-reward-hop rounded-xl border border-amber-400/60 bg-slate-800 p-1">
                <PartIcon id={moodCue.part} className="h-8 w-8" />
              </div>
            </>
          )}
          {moodCue.mood === 'confused' && !moodCue.part && (
            <div className="flex items-center gap-1.5 text-violet-300">
              <HelpCircle className="h-6 w-6 stroke-[2.8]" />
              <span className="anim-stage-nudge inline-flex">
                <ArrowRight className="h-5 w-5 stroke-[2.8]" />
              </span>
              <span className="anim-reward-hop inline-flex">
                <Puzzle className="h-6 w-6 text-emerald-300" />
              </span>
            </div>
          )}

          {onPlayGhostFix && (moodCue.mood === 'sad' || moodCue.mood === 'confused') && (
            <button
              id="playGhostFixBtn"
              type="button"
              onClick={onPlayGhostFix}
              aria-label="Play Ghost Fix Preview"
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-cyan-300 bg-cyan-500/20 px-2.5 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.45)] transition-transform hover:bg-cyan-500/30 active:scale-95"
            >
              <span className="anim-stage-nudge inline-flex items-center gap-1">
                <Ghost className="h-5 w-5 text-cyan-300" />
                <Play className="h-4 w-4 fill-cyan-300 text-cyan-300" />
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
