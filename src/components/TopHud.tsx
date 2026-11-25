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
    <div className="pointer-events-none safe-top fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-1 px-2 pb-1 sm:gap-1.5 sm:px-3.5">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-1 gap-y-1 sm:gap-2">
        {/* Top-Left: Home, Map, Level Number, Profile */}
        <div className="pointer-events-auto order-1 flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onGoHome}
            aria-label="Home Title Screen"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
          >
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            aria-label="Level Map"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-sky-300 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
          >
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Compact Numeric Level & Star Chip */}
          <div
            aria-label={isDaily ? 'Daily Challenge' : `Level ${levelId}`}
            className={`flex h-8 items-center gap-1 rounded-xl border px-2 shadow-md backdrop-blur-sm sm:h-9 sm:gap-1.5 sm:px-2.5 ${
              isDaily
                ? 'border-orange-400/85 bg-slate-900/90 text-orange-300'
                : isBonus
                  ? 'border-violet-400/85 bg-slate-900/90 text-violet-300'
                  : 'border-slate-600/80 bg-slate-900/90 text-amber-300'
            }`}
          >
            {isDaily ? (
              <Flame className="anim-flame-flicker h-3.5 w-3.5 fill-orange-400 text-orange-400 sm:h-4 sm:w-4" />
            ) : (
              <span className="tabular text-xs font-black sm:text-sm">{levelId}</span>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                    s <= starsEarned ? 'anim-reward-hop fill-amber-400 text-amber-400' : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Compact Profile Avatar Button */}
          <button
            id="hudProfileBtn"
            type="button"
            onClick={onOpenProfile}
            aria-label={`Open Save Profile (${profileName} — ${charDef.name})`}
            className="flex h-8 items-center gap-1.5 rounded-xl border bg-slate-900/90 px-1 shadow-md backdrop-blur-sm transition-transform hover:brightness-110 active:scale-95 sm:h-9 sm:px-1.5"
            style={{ borderColor: charDef.accentCss }}
          >
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-slate-800 sm:h-6.5 sm:w-6.5">
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
                <SparkBotEmblem className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </span>
            <span
              data-testid="hud-profile-name"
              className="hidden max-w-[100px] truncate text-[11px] font-black text-white lg:inline"
            >
              {profileName}
            </span>
          </button>
        </div>

        {/* Center: 4-Stage Dots + Challenge Timer (wraps as slim micro-row on < md, inline on md+) */}
        <div className="pointer-events-auto order-3 flex w-full items-center justify-center gap-1.5 md:order-2 md:w-auto">
          <div className="flex h-7 items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-900/85 px-1.5 shadow backdrop-blur-sm md:h-9 md:border-slate-600/80 md:bg-slate-900/90">
            <button
              id="toBuildBtn"
              type="button"
              onClick={() => onSwitchPhase('BUILD_3D')}
              disabled={mode === 'SIMULATING' || mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D'}
              aria-label="3D Build Workshop"
              className={`flex h-5.5 w-5.5 items-center justify-center rounded-md transition-transform md:h-7 md:w-7 md:rounded-lg ${
                activeStage === 0
                  ? 'bg-amber-400 text-slate-950 md:scale-105'
                  : 'text-slate-400 hover:bg-slate-700 md:bg-slate-800 md:text-slate-300'
              }`}
            >
              <Wrench className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => canCode && onSwitchPhase('CODE_3D')}
              disabled={!canCode || mode === 'SIMULATING' || mode === 'ACTION_RUN_3D' || mode === 'PLANET_ADVENTURE_3D'}
              aria-label="3D Code Track"
              className={`flex h-5.5 w-5.5 items-center justify-center rounded-md transition-transform md:h-7 md:w-7 md:rounded-lg ${
                activeStage === 1
                  ? 'bg-sky-400 text-slate-950 md:scale-105'
                  : 'text-slate-400 hover:bg-slate-700 disabled:opacity-35 md:bg-slate-800 md:text-slate-300 md:disabled:opacity-40'
              }`}
            >
              <Puzzle className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
            <div
              aria-label="3D Laser Circuit"
              className={`flex h-5.5 w-5.5 items-center justify-center rounded-md md:h-7 md:w-7 md:rounded-lg ${
                activeStage === 2 ? 'bg-cyan-400 text-slate-950 md:scale-105' : 'text-slate-500 md:bg-slate-800 md:text-slate-400'
              }`}
            >
              <Star className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </div>
            <div
              aria-label="3D Action Dash"
              className={`flex h-5.5 w-5.5 items-center justify-center rounded-md md:h-7 md:w-7 md:rounded-lg ${
                activeStage === 3 ? 'bg-fuchsia-400 text-slate-950 md:scale-105' : 'text-slate-500 md:bg-slate-800 md:text-slate-400'
              }`}
            >
              <Zap className="h-3 w-3 md:h-3.5 md:w-3.5" />
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
              className={`flex h-7 items-center gap-1 rounded-xl border px-2 shadow backdrop-blur-sm transition-transform hover:brightness-110 active:scale-95 md:h-9 md:gap-1.5 md:px-2.5 md:shadow-md ${
                challengeTimerEnabled
                  ? timerTierClass
                  : 'border-slate-700/80 bg-slate-900/85 text-slate-300 hover:border-amber-300/80 hover:text-amber-200 md:border-slate-600/80 md:bg-slate-900/90'
              }`}
            >
              <Timer
                className={`h-3 w-3 shrink-0 md:h-3.5 md:w-3.5 ${
                  challengeTimerEnabled ? (timerPaused ? 'opacity-60' : '') : 'text-amber-300'
                }`}
                aria-hidden="true"
              />
              {challengeTimerEnabled ? (
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="hud-challenge-timer-value"
                    className="tabular text-[11px] font-black tracking-tight md:text-xs"
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
                <span className="text-[11px] font-extrabold tracking-wide">Timer</span>
              )}
            </button>
          )}
        </div>

        {/* Top-Right: 3D Ghost Preview (when applicable), Reset (sm+), Sound, Settings (sm+), Pause */}
        <div className="pointer-events-auto order-2 flex shrink-0 items-center gap-1 sm:gap-1.5 md:order-3">
          {(mode === 'BUILD_3D' || mode === 'CODE_3D' || mode === 'CIRCUIT_3D') && (
            <button
              type="button"
              onClick={onToggleGhost}
              aria-label={ghostHelp ? 'Hide 3D Ghost Preview' : 'Show 3D Ghost Preview'}
              title="3D Ghost Preview"
              className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-md backdrop-blur-sm transition-transform active:scale-95 sm:h-9 sm:w-9 ${
                ghostHelp
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                  : 'border-slate-600/80 bg-slate-900/90 text-cyan-300 hover:border-cyan-300'
              }`}
            >
              <Ghost className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset Stage"
            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:flex sm:h-9 sm:w-9"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400 sm:h-4 sm:w-4" /> : <Volume2 className="h-3.5 w-3.5 text-sky-300 sm:h-4 sm:w-4" />}
            </button>
            <MuteIndicator muted={muted} visible={muteFlashVisible} flashKey={muteFlashKey} />
          </div>
          <button
            id="hudSettingsBtn"
            type="button"
            onClick={onOpenSettings}
            aria-label="Audio and Settings"
            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-sky-300 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:flex sm:h-9 sm:w-9"
          >
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
          >
            <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Compact Visual Mood & Solution Feedback Bubble */}
      {moodCue && (
        <div
          role="status"
          aria-label={`Robot mood ${moodCue.mood}`}
          className={`pointer-events-auto anim-pop flex max-w-[92vw] items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 shadow-xl sm:px-3 ${
            moodCue.mood === 'happy'
              ? 'border-emerald-400 bg-slate-900/95'
              : moodCue.mood === 'sad'
                ? 'border-rose-400 bg-slate-900/95'
                : 'border-violet-400 bg-slate-900/95'
          }`}
        >
          {moodCue.mood === 'happy' && (
            <svg viewBox="0 0 36 36" className="anim-happy h-7 w-7" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#10b981" />
              <path d="M9 16c2-3 4-3 6 0M21 16c2-3 4-3 6 0" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              <path d="M11 22c3 4 11 4 14 0" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            </svg>
          )}
          {moodCue.mood === 'sad' && (
            <svg viewBox="0 0 36 36" className="anim-stage-nudge h-7 w-7" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#fb7185" />
              <circle cx="12" cy="15" r="2.2" fill="#0f172a" />
              <circle cx="24" cy="15" r="2.2" fill="#0f172a" />
              <circle cx="12" cy="21" r="2.2" fill="#67e8f9" />
              <path d="M12 25c3-3 9-3 12 0" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
          )}
          {moodCue.mood === 'confused' && (
            <svg viewBox="0 0 36 36" className="anim-stage-nudge h-7 w-7" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#a78bfa" />
              <circle cx="12" cy="15" r="2.5" fill="#0f172a" />
              <rect x="21" y="14" width="6" height="2.6" rx="1.3" fill="#0f172a" />
              <path d="M12 24h12" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          )}

          {moodCue.hazard && <HazardIcon cond={moodCue.hazard} className="h-6 w-6" />}
          {moodCue.part && (
            <>
              <ArrowRight className="h-4 w-4 stroke-[3] text-amber-300" />
              <div className="rounded-lg border border-amber-400/60 bg-slate-800 p-1">
                <PartIcon id={moodCue.part} className="h-6 w-6" />
              </div>
            </>
          )}
          {moodCue.mood === 'confused' && !moodCue.part && (
            <div className="flex items-center gap-1 text-violet-300">
              <HelpCircle className="h-5 w-5 stroke-[2.8]" />
              <ArrowRight className="h-4 w-4 stroke-[2.8]" />
              <Puzzle className="h-5 w-5 text-emerald-300" />
            </div>
          )}

          {onPlayGhostFix && (moodCue.mood === 'sad' || moodCue.mood === 'confused') && (
            <button
              id="playGhostFixBtn"
              type="button"
              onClick={onPlayGhostFix}
              aria-label="Play Ghost Fix Preview"
              className="flex h-8 items-center gap-1 rounded-xl border border-cyan-300 bg-cyan-500/20 px-2 text-cyan-200 transition-transform hover:bg-cyan-500/30 active:scale-95"
            >
              <Ghost className="h-4 w-4 text-cyan-300" />
              <Play className="h-3.5 w-3.5 fill-cyan-300 text-cyan-300" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
