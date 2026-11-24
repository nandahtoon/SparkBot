import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Crosshair,
  DoorOpen,
  Flame,
  Gem,
  Lock,
  LogOut,
  Zap
} from 'lucide-react';
import { PLANET_EQUIPMENT_META, type PlanetAdventureMetrics } from '../game/planetAdventure';
import { PartIcon } from './Icons';

interface PlanetAdventureHudProps {
  metrics: PlanetAdventureMetrics;
  onMoveInput: (forward: number, strafe: number) => void;
  onJump: () => void;
  onBoost: () => void;
  onLaser: () => void;
  onExit: () => void;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export const PlanetAdventureHud: React.FC<PlanetAdventureHudProps> = ({
  metrics,
  onMoveInput,
  onJump,
  onBoost,
  onLaser,
  onExit
}) => {
  const heldDirsRef = useRef({ up: false, down: false, left: false, right: false });

  const syncDpad = () => {
    const d = heldDirsRef.current;
    const forward = (d.up ? 1 : 0) - (d.down ? 1 : 0);
    const strafe = (d.right ? 1 : 0) - (d.left ? 1 : 0);
    onMoveInput(forward, strafe);
  };

  const bindDir = (dir: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      heldDirsRef.current[dir] = true;
      syncDpad();
    },
    onPointerUp: () => {
      heldDirsRef.current[dir] = false;
      syncDpad();
    },
    onPointerLeave: () => {
      if (heldDirsRef.current[dir]) {
        heldDirsRef.current[dir] = false;
        syncDpad();
      }
    },
    onPointerCancel: () => {
      heldDirsRef.current[dir] = false;
      syncDpad();
    }
  });

  const caps = metrics.capabilities;
  const compassDeg = Math.round((metrics.objectiveAngleRad * 180) / Math.PI);
  const boostReady = caps.hasBooster && metrics.boostCooldown <= 0.05;
  const laserReady = caps.hasLaser && metrics.laserCooldown <= 0.05;

  const isPartActive = (part: string): boolean => {
    switch (part) {
      case 'treads':
        return caps.hasTreads;
      case 'thrusters':
        return caps.hasThrusters;
      case 'booster':
        return caps.hasBooster;
      case 'laser':
        return caps.hasLaser;
      case 'magnet':
        return caps.hasMagnet;
      default:
        return caps.hasWheels;
    }
  };

  return (
    <div
      data-testid="planet-adventure-hud"
      className="pointer-events-none safe-bottom fixed inset-0 z-20 flex flex-col justify-between px-2 pt-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] sm:px-4 sm:pt-14"
    >
      {/* Top Expedition Stats & Waypoint Compass */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        <div
          data-testid="planet-cores-counter"
          aria-label={`Energy Cores ${metrics.coresCollected} of ${metrics.totalCores}`}
          className={`flex h-8 items-center gap-1 rounded-xl border px-2 tabular-nums text-xs font-black shadow-lg backdrop-blur-sm sm:h-9 sm:px-2.5 sm:text-sm ${
            metrics.gateUnlocked
              ? 'border-emerald-300 bg-emerald-950/90 text-emerald-200'
              : 'border-cyan-400/80 bg-slate-900/90 text-cyan-200'
          }`}
        >
          <Gem className="h-3.5 w-3.5 text-cyan-300 sm:h-4 sm:w-4" />
          <span>
            {metrics.coresCollected}/{metrics.totalCores}
          </span>
        </div>

        <div
          data-testid="planet-gate-status"
          className={`flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-black tracking-wide shadow-lg backdrop-blur-sm sm:h-9 sm:px-2.5 sm:text-xs ${
            metrics.gateUnlocked
              ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
              : 'border-slate-600/90 bg-slate-900/90 text-slate-300'
          }`}
        >
          {metrics.gateUnlocked ? (
            <DoorOpen className="h-3.5 w-3.5 text-emerald-300 sm:h-4 sm:w-4" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-amber-300 sm:h-4 sm:w-4" />
          )}
          <span>{metrics.gateUnlocked ? 'Gate Open' : 'Locked'}</span>
        </div>

        <div
          data-testid="planet-waypoint-compass"
          className="flex h-8 items-center gap-1 rounded-xl border border-teal-400/75 bg-slate-900/90 px-2 text-[11px] font-bold text-teal-200 shadow-lg backdrop-blur-sm tabular-nums sm:h-9 sm:px-2.5 sm:text-xs"
        >
          <Compass className="h-3.5 w-3.5 text-teal-300" />
          <span className="max-w-[78px] truncate sm:max-w-none">{metrics.objectiveLabel}</span>
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-500/25 text-teal-200"
            style={{ transform: `rotate(${compassDeg}deg)` }}
            aria-hidden="true"
          >
            <ArrowUp className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-teal-300">{metrics.objectiveDistance}m</span>
        </div>

        <div
          aria-label={`Scrap Bolts ${metrics.boltsCollected}`}
          className="flex h-8 items-center gap-1 rounded-xl border border-amber-400/80 bg-slate-900/90 px-2 tabular-nums text-xs font-black text-amber-300 shadow-lg backdrop-blur-sm sm:h-9"
        >
          <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{metrics.boltsCollected}</span>
        </div>

        <div
          aria-label={`Time ${formatSec(metrics.elapsedSeconds)}`}
          className="hidden h-8 items-center rounded-xl border border-slate-600 bg-slate-900/90 px-2 tabular-nums text-[11px] font-bold text-slate-300 shadow-lg backdrop-blur-sm sm:flex sm:h-9"
        >
          {formatSec(metrics.elapsedSeconds)}
        </div>

        <button
          type="button"
          data-testid="planet-exit-btn"
          onClick={onExit}
          aria-label="Exit to Game Room"
          className="pointer-events-auto flex h-8 items-center gap-1 rounded-xl border border-slate-600 bg-slate-900/90 px-2 text-[11px] font-bold text-slate-200 shadow-lg backdrop-blur-sm hover:border-rose-400 hover:text-white active:scale-95 sm:h-9 sm:px-2.5 sm:text-xs"
        >
          <LogOut className="h-3.5 w-3.5 text-rose-300" />
          <span>Exit</span>
        </button>
      </div>

      {/* Bottom Controls + Active Mission Equipment Strip */}
      <div className="flex flex-col gap-1.5 pb-1 sm:gap-2 sm:pb-1.5">
        {/* Equipped Bot Gear Status Row */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {PLANET_EQUIPMENT_META.map((item) => {
            const active = isPartActive(item.part);
            const inUseBog = item.part === 'treads' && active && metrics.inBog;
            return (
              <div
                key={item.part}
                data-planet-gear={item.part}
                data-gear-active={active ? 'true' : 'false'}
                title={active ? `${item.label}: ${item.powerName} (${item.keyHint})` : `${item.label} not equipped in level`}
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold shadow transition-all ${
                  active
                    ? inUseBog
                      ? 'border-emerald-300 bg-emerald-950/90 text-emerald-200'
                      : 'border-sky-400/80 bg-slate-900/90 text-slate-100'
                    : 'border-slate-700/70 bg-slate-950/75 text-slate-500 opacity-70'
                }`}
              >
                <PartIcon id={item.part} className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
                {active && (
                  <span className="text-[9px] font-black text-emerald-300">
                    {item.keyHint}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Touch & Action Controls */}
        <div className="flex items-end justify-between gap-2">
          {/* Directional Pad (3D Planet Ground Steering) */}
          <div className="pointer-events-auto grid shrink-0 grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              {...bindDir('up')}
              aria-label="Move Forward"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/80 bg-slate-900/90 text-teal-200 shadow-lg backdrop-blur-sm active:scale-90 sm:h-11 sm:w-11"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.75] sm:h-5 sm:w-5" />
            </button>
            <div />
            <button
              type="button"
              {...bindDir('left')}
              aria-label="Move Left"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/80 bg-slate-900/90 text-teal-200 shadow-lg backdrop-blur-sm active:scale-90 sm:h-11 sm:w-11"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.75] sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              {...bindDir('down')}
              aria-label="Move Backward"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/80 bg-slate-900/90 text-teal-200 shadow-lg backdrop-blur-sm active:scale-90 sm:h-11 sm:w-11"
            >
              <ArrowDown className="h-4 w-4 stroke-[2.75] sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              {...bindDir('right')}
              aria-label="Move Right"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/80 bg-slate-900/90 text-teal-200 shadow-lg backdrop-blur-sm active:scale-90 sm:h-11 sm:w-11"
            >
              <ArrowRight className="h-4 w-4 stroke-[2.75] sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Right-Side Equipment Ability & Jump Buttons */}
          <div className="pointer-events-auto flex shrink-0 items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              data-testid="planet-laser-btn"
              onClick={onLaser}
              disabled={!caps.hasLaser}
              aria-label={caps.hasLaser ? 'Fire Plasma Laser' : 'Laser Locked (Not Equipped)'}
              className={`flex h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-black shadow-xl backdrop-blur-sm transition-transform active:scale-90 sm:h-11 sm:px-3 sm:text-xs ${
                laserReady
                  ? 'border-cyan-300 bg-cyan-500/90 text-slate-950'
                  : caps.hasLaser
                    ? 'border-cyan-500/60 bg-slate-900/90 text-cyan-300 opacity-85'
                    : 'cursor-not-allowed border-slate-700 bg-slate-900/75 text-slate-500'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Laser</span>
            </button>

            <button
              type="button"
              data-testid="planet-boost-btn"
              onClick={onBoost}
              disabled={!caps.hasBooster}
              aria-label={caps.hasBooster ? 'Activate Turbo Booster' : 'Booster Locked (Not Equipped)'}
              className={`flex h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-black shadow-xl backdrop-blur-sm transition-transform active:scale-90 sm:h-11 sm:px-3 sm:text-xs ${
                boostReady
                  ? 'border-pink-300 bg-pink-500/90 text-slate-950'
                  : caps.hasBooster
                    ? 'border-pink-500/60 bg-slate-900/90 text-pink-300 opacity-85'
                    : 'cursor-not-allowed border-slate-700 bg-slate-900/75 text-slate-500'
              }`}
            >
              <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Boost</span>
            </button>

            <button
              type="button"
              data-testid="planet-jump-btn"
              onClick={onJump}
              aria-label={caps.hasThrusters ? 'Thruster Jump or Double Jump' : 'Jump'}
              className="flex h-10 w-12 flex-col items-center justify-center rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 sm:h-12 sm:w-16 sm:rounded-2xl"
            >
              <ArrowUp className="h-4 w-4 stroke-[3] sm:h-5 sm:w-5" />
              <span className="text-[9px] font-black uppercase tracking-tight">
                {caps.hasThrusters ? 'Jet x2' : 'Hop'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
