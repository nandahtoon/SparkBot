import React from 'react';
import {
  Bot,
  Compass,
  Gauge,
  Lightbulb,
  Lock,
  MousePointerClick,
  Play,
  Rabbit,
  SlidersHorizontal,
  Timer,
  Turtle,
  Vibrate,
  Volume2,
  VolumeX,
  Wrench,
  X
} from 'lucide-react';
import type { AudioSettings } from '../game/audioConfig';
import type { GraphicsQualityMode } from '../game/graphicsConfig';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  visible: boolean;
  muted: boolean;
  audio: AudioSettings;
  gentleSpeed: boolean;
  lowGraphics: boolean;
  graphicsQuality?: GraphicsQualityMode;
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
  onChangeGraphicsQuality?: (mode: GraphicsQualityMode) => void;
  onToggleChallengeTimer: () => void;
  onToggleAdaptiveHints?: () => void;
  onToggleReadAloud?: () => void;
  onToggleHaptics?: () => void;
  onReplayTutorial?: () => void;
  onOpenParentView?: () => void;
  onClose: () => void;
}

const QUALITY_OPTIONS: ReadonlyArray<{
  mode: GraphicsQualityMode;
  label: string;
}> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'ultra', label: 'Ultra' },
  { mode: 'balanced', label: 'Mid' },
  { mode: 'eco', label: 'Eco' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  muted,
  audio,
  gentleSpeed,
  lowGraphics,
  graphicsQuality,
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
  onChangeGraphicsQuality,
  onToggleChallengeTimer,
  onToggleAdaptiveHints,
  onToggleReadAloud,
  onToggleHaptics,
  onReplayTutorial,
  onOpenParentView,
  onClose
}) => {
  if (!visible) return null;

  const sfxPct = Math.round(audio.sfxVolume * 100);
  const uiPct = Math.round(audio.uiVolume * 100);
  const voicePct = Math.round(audio.voiceVolume * 100);
  const activeMode: GraphicsQualityMode = graphicsQuality ?? (lowGraphics ? 'eco' : 'auto');
  const selectMode = (mode: GraphicsQualityMode) => {
    if (onChangeGraphicsQuality) {
      onChangeGraphicsQuality(mode);
    } else if ((mode === 'eco') !== lowGraphics) {
      onToggleLowGraphics();
    }
  };

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
        className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-sky-400/70 bg-slate-900 p-4 text-slate-100 shadow-2xl sm:p-5"
      >
        {/* Clean Commercial Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/60 bg-sky-500/20 text-sky-300">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">Settings</h2>
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

        {/* Master Audio Switch + Icon-First Sliders */}
        <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-slate-800 bg-slate-950/75 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                  muted
                    ? 'border-rose-400/70 bg-rose-500/20 text-rose-300'
                    : 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </div>
              <span className="text-sm font-black text-white">Sound</span>
            </div>

            <button
              id="masterMuteToggle"
              type="button"
              role="switch"
              aria-checked={!muted}
              aria-label="Master Mute Toggle"
              onClick={onToggleMute}
              className={`flex h-10 min-w-[78px] items-center justify-center rounded-xl border-2 px-3 text-xs font-black uppercase transition-transform active:scale-95 ${
                muted
                  ? 'border-rose-400 bg-rose-500/25 text-rose-200'
                  : 'border-emerald-300 bg-emerald-500/25 text-emerald-200'
              }`}
            >
              {muted ? 'OFF' : 'ON'}
            </button>
          </div>

          {/* 3 Compact Visual Channel Sliders */}
          <div className={`flex flex-col gap-2 pt-1 transition-opacity ${muted ? 'opacity-55' : 'opacity-100'}`}>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <input
                id="sfxVolumeSlider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={sfxPct}
                aria-label="SFX Volume"
                onChange={(e) => onChangeAudio({ sfxVolume: Number(e.target.value) / 100 })}
                className="h-2.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400"
              />
              <span className="tabular w-9 text-right text-xs font-black text-slate-300">{sfxPct}%</span>
              <button
                type="button"
                onClick={onTestSfx}
                aria-label="Test SFX Volume"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-amber-300" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <input
                id="uiVolumeSlider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={uiPct}
                aria-label="UI Volume"
                onChange={(e) => onChangeAudio({ uiVolume: Number(e.target.value) / 100 })}
                className="h-2.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
              />
              <span className="tabular w-9 text-right text-xs font-black text-slate-300">{uiPct}%</span>
              <button
                type="button"
                onClick={onTestUi}
                aria-label="Test UI Volume"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/15 text-sky-300 hover:bg-sky-500/30 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-sky-300" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <input
                id="voiceVolumeSlider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={voicePct}
                aria-label="Robot Voice Volume"
                onChange={(e) => onChangeAudio({ voiceVolume: Number(e.target.value) / 100 })}
                className="h-2.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-400"
              />
              <span className="tabular w-9 text-right text-xs font-black text-slate-300">{voicePct}%</span>
              <button
                type="button"
                onClick={onTestVoice}
                aria-label="Test Robot Voice"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-emerald-300" />
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Tactile Icon Toggle Grid (Zero Reading Needed) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleSpeed}
            aria-label="Simulation Speed"
            className={`flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-3 transition-transform active:scale-95 ${
              gentleSpeed
                ? 'border-emerald-400/75 bg-emerald-500/15 text-emerald-200'
                : 'border-amber-400/75 bg-amber-500/15 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {gentleSpeed ? <Turtle className="h-5 w-5" /> : <Rabbit className="h-5 w-5" />}
              <span className="text-xs font-black text-white">{gentleSpeed ? 'Slow' : 'Fast'}</span>
            </div>
          </button>

          <button
            id="challengeTimerSettingsToggle"
            type="button"
            role="switch"
            aria-checked={challengeTimerEnabled}
            aria-label="Challenge Timer"
            onClick={onToggleChallengeTimer}
            className={`flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-3 transition-transform active:scale-95 ${
              challengeTimerEnabled
                ? 'border-amber-300 bg-amber-500/20 text-amber-200'
                : 'border-slate-700 bg-slate-950/70 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-black text-white">Timer</span>
            </div>
            <span className="text-[11px] font-black">{challengeTimerEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {onToggleAdaptiveHints && (
            <button
              id="adaptiveHintsToggle"
              type="button"
              role="switch"
              aria-checked={adaptiveHintsEnabled}
              aria-label="Adaptive Hints"
              onClick={onToggleAdaptiveHints}
              className={`flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-3 transition-transform active:scale-95 ${
                adaptiveHintsEnabled
                  ? 'border-emerald-300 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700 bg-slate-950/70 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-black text-white">Hints</span>
              </div>
              <span className="text-[11px] font-black">{adaptiveHintsEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onToggleReadAloud && (
            <button
              id="readAloudToggle"
              type="button"
              role="switch"
              aria-checked={readAloudEnabled}
              aria-label="Auto Read-Aloud"
              onClick={onToggleReadAloud}
              className={`flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-3 transition-transform active:scale-95 ${
                readAloudEnabled
                  ? 'border-sky-300 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700 bg-slate-950/70 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-black text-white">Voice</span>
              </div>
              <span className="text-[11px] font-black">{readAloudEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onToggleHaptics && (
            <button
              id="hapticsToggle"
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              aria-label="Haptic Vibration"
              onClick={onToggleHaptics}
              className={`flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-3 transition-transform active:scale-95 ${
                hapticsEnabled
                  ? 'border-fuchsia-300 bg-fuchsia-500/20 text-fuchsia-200'
                  : 'border-slate-700 bg-slate-950/70 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Vibrate className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-black text-white">Vibe</span>
              </div>
              <span className="text-[11px] font-black">{hapticsEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        {/* Graphics Quality Segmented Bar */}
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/65 p-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-200">
            <Gauge className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <span>Graphics</span>
          </div>
          <div
            id="graphicsQualityGroup"
            role="radiogroup"
            aria-label="Graphics Quality"
            className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-900 p-1"
          >
            {QUALITY_OPTIONS.map((opt) => {
              const selected = activeMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  id={opt.mode === 'eco' ? 'lowGraphicsToggle' : `graphicsQuality-${opt.mode}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectMode(opt.mode)}
                  className={`h-10 whitespace-nowrap rounded-lg px-2 text-xs font-black transition-all active:scale-95 ${
                    selected
                      ? opt.mode === 'eco'
                        ? 'border border-cyan-300/80 bg-cyan-500/25 text-cyan-100'
                        : opt.mode === 'ultra'
                          ? 'border border-amber-300/80 bg-amber-500/25 text-amber-100'
                          : 'border border-sky-300/80 bg-sky-500/25 text-sky-100'
                      : 'border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Install Android / Mobile App Row */}
        <PWAInstallButton variant="settings" />

        {/* Compact Footer Action Pair: Tutorial & Grown-Ups */}
        <div className="grid grid-cols-2 gap-2">
          {onReplayTutorial && (
            <button
              id="settingsReplayTutorialBtn"
              type="button"
              onClick={() => {
                onClose();
                onReplayTutorial();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-amber-400/55 bg-amber-500/15 px-3 text-xs font-black text-amber-200 transition-colors hover:border-amber-300 active:scale-95"
            >
              <Compass className="h-4.5 w-4.5 shrink-0 text-amber-300" aria-hidden="true" />
              <span>Tutorial</span>
            </button>
          )}

          {onOpenParentView && (
            <button
              id="settingsOpenParentBtn"
              type="button"
              onClick={() => {
                onClose();
                onOpenParentView();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-700 bg-slate-800 px-3 text-xs font-black text-sky-200 transition-colors hover:border-sky-400 active:scale-95"
            >
              <Lock className="h-4.5 w-4.5 shrink-0 text-sky-300" aria-hidden="true" />
              <span>Grown-Ups</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
