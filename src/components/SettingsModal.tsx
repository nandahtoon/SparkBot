import React from 'react';
import {
  Bot,
  Gauge,
  Lightbulb,
  Lock,
  MousePointerClick,
  Rabbit,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Turtle,
  Vibrate,
  Volume2,
  VolumeX,
  Wrench,
  X
} from 'lucide-react';
import type { AudioSettings } from '../game/audioConfig';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  visible: boolean;
  muted: boolean;
  audio: AudioSettings;
  gentleSpeed: boolean;
  lowGraphics: boolean;
  challengeTimerEnabled: boolean;
  adaptiveHintsEnabled?: boolean;
  readAloudEnabled?: boolean;
  hapticsEnabled?: boolean;
  onToggleMute: () => void;
  onChangeAudio: (next: Partial<AudioSettings>) => void;
  onTestSfx: () => void;
  onTestUi: () => void;
  onTestVoice: () => void;
  onToggleSpeed: () => void;
  onToggleLowGraphics: () => void;
  onToggleChallengeTimer: () => void;
  onToggleAdaptiveHints?: () => void;
  onToggleReadAloud?: () => void;
  onToggleHaptics?: () => void;
  onOpenParentView?: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  muted,
  audio,
  gentleSpeed,
  lowGraphics,
  challengeTimerEnabled,
  adaptiveHintsEnabled = true,
  readAloudEnabled = false,
  hapticsEnabled = true,
  onToggleMute,
  onChangeAudio,
  onTestSfx,
  onTestUi,
  onTestVoice,
  onToggleSpeed,
  onToggleLowGraphics,
  onToggleChallengeTimer,
  onToggleAdaptiveHints,
  onToggleReadAloud,
  onToggleHaptics,
  onOpenParentView,
  onClose
}) => {
  if (!visible) return null;

  const sfxPct = Math.round(audio.sfxVolume * 100);
  const uiPct = Math.round(audio.uiVolume * 100);
  const voicePct = Math.round(audio.voiceVolume * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio and Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settingsModalCard"
        className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-3xl border-2 border-sky-400/70 bg-slate-900 p-4 text-slate-100 shadow-2xl sm:gap-4 sm:p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/60 bg-sky-500/20 text-sky-300">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Audio & Workshop</h2>
              <p className="text-xs font-medium text-slate-400">Mixer & learning controls</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 transition-transform hover:border-sky-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Master Mute Toggle — Clearly Separate from Granular Sliders */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-700 bg-slate-950/85 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                muted
                  ? 'border-rose-400/70 bg-rose-500/20 text-rose-300'
                  : 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">Master Audio</div>
              <div className="text-xs font-medium text-slate-400">
                {muted ? 'Muted (slider levels saved)' : 'All audio channels active'}
              </div>
            </div>
          </div>

          <button
            id="masterMuteToggle"
            type="button"
            role="switch"
            aria-checked={!muted}
            aria-label="Master Mute Toggle"
            onClick={onToggleMute}
            className={`relative flex h-10 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
              muted
                ? 'border-rose-400 bg-rose-500/25 text-rose-200'
                : 'border-emerald-300 bg-emerald-500/25 text-emerald-200'
            }`}
          >
            {muted ? 'Muted' : 'On'}
          </button>
        </div>

        {/* Granular Channel Volume Sliders */}
        <div
          className={`flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 p-3.5 transition-opacity ${
            muted ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {/* SFX Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="sfxVolumeSlider"
                className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300"
              >
                <Wrench className="h-4 w-4" />
                <span>SFX Volume</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="tabular min-w-[40px] text-right text-xs font-black text-slate-200">
                  {sfxPct}%
                </span>
                <button
                  type="button"
                  onClick={onTestSfx}
                  aria-label="Test SFX Volume"
                  className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 active:scale-95"
                >
                  Test
                </button>
              </div>
            </div>
            <input
              id="sfxVolumeSlider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={sfxPct}
              aria-label="SFX Volume"
              onChange={(e) => onChangeAudio({ sfxVolume: Number(e.target.value) / 100 })}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400"
            />
          </div>

          {/* UI Interactions Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="uiVolumeSlider"
                className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-300"
              >
                <MousePointerClick className="h-4 w-4" />
                <span>UI Volume</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="tabular min-w-[40px] text-right text-xs font-black text-slate-200">
                  {uiPct}%
                </span>
                <button
                  type="button"
                  onClick={onTestUi}
                  aria-label="Test UI Volume"
                  className="rounded-lg border border-sky-400/50 bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-200 hover:bg-sky-500/30 active:scale-95"
                >
                  Test
                </button>
              </div>
            </div>
            <input
              id="uiVolumeSlider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={uiPct}
              aria-label="UI Volume"
              onChange={(e) => onChangeAudio({ uiVolume: Number(e.target.value) / 100 })}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
            />
          </div>

          {/* Robot Voice Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="voiceVolumeSlider"
                className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300"
              >
                <Bot className="h-4 w-4" />
                <span>Robot Voice</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="tabular min-w-[40px] text-right text-xs font-black text-slate-200">
                  {voicePct}%
                </span>
                <button
                  type="button"
                  onClick={onTestVoice}
                  aria-label="Test Robot Voice"
                  className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30 active:scale-95"
                >
                  Chirp
                </button>
              </div>
            </div>
            <input
              id="voiceVolumeSlider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={voicePct}
              aria-label="Robot Voice Volume"
              onChange={(e) => onChangeAudio({ voiceVolume: Number(e.target.value) / 100 })}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-400"
            />
          </div>
        </div>

        {/* Simulation Pace Row */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Robot Pace
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleSpeed}
            aria-label="Simulation Speed"
            className={`flex h-9 items-center gap-2 rounded-xl border-2 px-3 text-xs font-black transition-transform active:scale-95 ${
              gentleSpeed
                ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                : 'border-amber-400/80 bg-amber-500/20 text-amber-200'
            }`}
          >
            {gentleSpeed ? (
              <>
                <Turtle className="h-4 w-4" />
                <span>Gentle</span>
              </>
            ) : (
              <>
                <Rabbit className="h-4 w-4" />
                <span>Fast</span>
              </>
            )}
          </button>
        </div>

        {/* Low-Graphics Performance Mode Row */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                lowGraphics
                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <Gauge className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                Low-Graphics Mode
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-400">
                {lowGraphics
                  ? 'Reduced sparks, puffs & 3D effects'
                  : 'Full sparks, puffs & 3D effects'}
              </div>
            </div>
          </div>

          <button
            id="lowGraphicsToggle"
            type="button"
            role="switch"
            aria-checked={lowGraphics}
            aria-label="Low-Graphics Mode"
            onClick={onToggleLowGraphics}
            className={`flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
              lowGraphics
                ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-400'
            }`}
          >
            {lowGraphics ? 'On' : 'Off'}
          </button>
        </div>

        {/* Optional Speed-Run Challenge Timer Row */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                challengeTimerEnabled
                  ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <Timer className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                Challenge Timer
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-400">
                {challengeTimerEnabled
                  ? 'Tracking level time for speed-run bonus bolts'
                  : 'Optional HUD timer & speed-run bolt bonuses'}
              </div>
            </div>
          </div>

          <button
            id="challengeTimerSettingsToggle"
            type="button"
            role="switch"
            aria-checked={challengeTimerEnabled}
            aria-label="Challenge Timer"
            onClick={onToggleChallengeTimer}
            className={`flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
              challengeTimerEnabled
                ? 'border-amber-300 bg-amber-500/25 text-amber-100'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-300'
            }`}
          >
            {challengeTimerEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Adaptive Hints Row */}
        {onToggleAdaptiveHints && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  adaptiveHintsEnabled
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                  Adaptive Hints
                </div>
                <div className="text-[11px] font-medium leading-tight text-slate-400">
                  {adaptiveHintsEnabled
                    ? '3-tier learning clues activate on retries'
                    : 'Manual hints only'}
                </div>
              </div>
            </div>

            <button
              id="adaptiveHintsToggle"
              type="button"
              role="switch"
              aria-checked={adaptiveHintsEnabled}
              aria-label="Adaptive Hints"
              onClick={onToggleAdaptiveHints}
              className={`flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
                adaptiveHintsEnabled
                  ? 'border-emerald-300 bg-emerald-500/25 text-emerald-100'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-300'
              }`}
            >
              {adaptiveHintsEnabled ? 'On' : 'Off'}
            </button>
          </div>
        )}

        {/* Voice Read-Aloud Row */}
        {onToggleReadAloud && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  readAloudEnabled
                    ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                  Auto Read-Aloud
                </div>
                <div className="text-[11px] font-medium leading-tight text-slate-400">
                  {readAloudEnabled
                    ? 'Automatically speaks new hints aloud'
                    : 'Tap Listen anytime on hints & STEM cards'}
                </div>
              </div>
            </div>

            <button
              id="readAloudToggle"
              type="button"
              role="switch"
              aria-checked={readAloudEnabled}
              aria-label="Auto Read-Aloud"
              onClick={onToggleReadAloud}
              className={`flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
                readAloudEnabled
                  ? 'border-sky-300 bg-sky-500/25 text-sky-100'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-300'
              }`}
            >
              {readAloudEnabled ? 'On' : 'Off'}
            </button>
          </div>
        )}

        {/* Android Tactile Haptic Vibration Row */}
        {onToggleHaptics && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  hapticsEnabled
                    ? 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                <Vibrate className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                  Haptic Vibration
                </div>
                <div className="text-[11px] font-medium leading-tight text-slate-400">
                  {hapticsEnabled
                    ? 'Tactile buzz on snaps, lasers & victories'
                    : 'Touch vibration feedback off'}
                </div>
              </div>
            </div>

            <button
              id="hapticsToggle"
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              aria-label="Haptic Vibration"
              onClick={onToggleHaptics}
              className={`flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
                hapticsEnabled
                  ? 'border-fuchsia-300 bg-fuchsia-500/25 text-fuchsia-100'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-fuchsia-300'
              }`}
            >
              {hapticsEnabled ? 'On' : 'Off'}
            </button>
          </div>
        )}

        {/* Install Android / Mobile App Row */}
        <PWAInstallButton variant="settings" />

        {/* Grown-Ups Progress View Entry */}
        {onOpenParentView && (
          <button
            id="settingsOpenParentBtn"
            type="button"
            onClick={() => {
              onClose();
              onOpenParentView();
            }}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/85 px-4 text-left transition-colors hover:border-sky-400 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <div>
                <div className="text-xs font-black text-white">Grown-Ups · Progress View</div>
                <div className="text-[11px] text-slate-400">
                  8-pillar STEM mastery, resilience & JSON report
                </div>
              </div>
            </div>
            <span className="shrink-0 text-xs font-black text-sky-300">Open</span>
          </button>
        )}
      </div>
    </div>
  );
};
