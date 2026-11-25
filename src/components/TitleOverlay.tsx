import React, { useMemo } from 'react';
import {
  Calendar,
  Check,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  LayoutGrid,
  Play,
  Settings,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTERS,
  generateDailyChallenge,
  getDailyDateKey,
  type BotCharacterId,
  type SensorCondition
} from '../game/engine';
import { HazardIcon, SparkBotEmblem } from './Icons';
import { MuteIndicator, useMuteFlash } from './MuteIndicator';
import { FullscreenToggleButton } from './FullscreenToggleButton';

interface TitleOverlayProps {
  nextLevelId: number;
  profileName: string;
  activeCharacter: BotCharacterId;
  totalStars: number;
  totalBolts: number;
  streak: number;
  dailyStars: number;
  trophyTiers: number;
  muted: boolean;
  onStartMission: () => void;
  onStartDaily: () => void;
  onOpenGameRoom?: () => void;
  onOpenLevelMap: () => void;
  onOpenTrophies: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  nextLevelId,
  profileName,
  activeCharacter,
  totalStars,
  totalBolts,
  streak,
  dailyStars,
  trophyTiers,
  muted,
  onStartMission,
  onStartDaily,
  onOpenGameRoom,
  onOpenLevelMap,
  onOpenTrophies,
  onOpenSettings,
  onOpenProfile,
  onToggleMute
}) => {
  const charDef = BOT_CHARACTERS[activeCharacter];
  const { visible: muteFlashVisible, flashKey: muteFlashKey } = useMuteFlash(muted);

  const todayKey = getDailyDateKey();
  const [, rawMonth = '01', rawDay = '01'] = todayKey.split('-');
  const monthNum = Number(rawMonth) || 1;
  const dayNum = Number(rawDay) || 1;

  const dailyChallenge = useMemo(() => generateDailyChallenge(todayKey), [todayKey]);

  const dailyHazards = useMemo(() => {
    const seen: SensorCondition[] = [];
    for (const tile of dailyChallenge.track) {
      const cond: SensorCondition | null =
        tile.type === 'gap' ? 'GAP' : tile.type === 'mud' ? 'MUD' : tile.type === 'ramp' ? 'RAMP' : null;
      if (cond && !seen.includes(cond)) seen.push(cond);
    }
    return seen.slice(0, 3);
  }, [dailyChallenge]);

  const dailyCrystals = useMemo(
    () => dailyChallenge.track.filter((t) => t.crystal).length,
    [dailyChallenge]
  );

  const clampedStreak = Math.min(7, Math.max(0, streak));
  const beaconDay =
    dailyStars > 0
      ? Math.min(7, clampedStreak + 1)
      : Math.max(1, Math.min(7, clampedStreak || 1));

  return (
    <div className="pointer-events-none safe-top safe-bottom fixed inset-0 z-20 flex flex-col justify-between px-2.5 py-1.5 sm:px-5 sm:py-4">
      {/* Clean Single-Row Top Bar: Identity & System (Left) · Trophies & Level Map (Right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            id="titleProfileBtn"
            type="button"
            onClick={onOpenProfile}
            aria-label={`Open Save Profile (${profileName} — ${charDef.name})`}
            className="flex h-9 min-w-0 items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/90 px-2 text-left shadow-md backdrop-blur-sm transition-transform hover:border-sky-400 active:scale-95 sm:h-10 sm:px-2.5"
          >
            <div
              className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-800 sm:h-7 sm:w-7 sm:rounded-lg"
              style={{ borderColor: charDef.accentCss }}
            >
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
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                data-testid="title-profile-name"
                className="max-w-[112px] truncate text-xs font-black leading-none text-white sm:max-w-[156px]"
              >
                {profileName}
              </span>
              <span className="hidden items-center gap-0.5 text-[11px] font-extrabold text-amber-300 tabular sm:inline-flex sm:text-xs">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {totalStars}
              </span>
              <span className="hidden items-center gap-0.5 text-[11px] font-bold text-sky-300 tabular md:inline-flex">
                <Zap className="h-3 w-3 fill-sky-400 text-sky-400" />
                {totalBolts}
              </span>
            </div>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform active:scale-95 hover:border-sky-400 sm:h-10 sm:w-10"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-rose-400 sm:h-4.5 sm:w-4.5" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-300 sm:h-4.5 sm:w-4.5" />
              )}
            </button>
            <MuteIndicator muted={muted} visible={muteFlashVisible} flashKey={muteFlashKey} />
          </div>

          <button
            id="titleSettingsBtn"
            type="button"
            onClick={onOpenSettings}
            aria-label="Audio, Speed, and App Settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm transition-transform active:scale-95 hover:border-sky-400 sm:h-10 sm:w-10"
          >
            <Settings className="h-4 w-4 text-sky-300 sm:h-4.5 sm:w-4.5" />
          </button>

          <FullscreenToggleButton />
        </div>

        {/* Right Controls: Trophies & Level Map (Sandbox & Class Code live inside Level Map) */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            id="trophyShelfBtn"
            type="button"
            onClick={onOpenTrophies}
            aria-label="STEM Trophy Shelf"
            className="flex h-9 items-center gap-1 rounded-xl border border-amber-400/70 bg-slate-900/90 px-2.5 text-amber-300 shadow-md backdrop-blur-sm transition-transform active:scale-95 hover:border-amber-300 sm:h-10 sm:px-3"
          >
            <Trophy className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            <span className="tabular text-xs font-black text-amber-200 sm:text-sm">{trophyTiers}</span>
          </button>

          <button
            type="button"
            onClick={onOpenLevelMap}
            aria-label="Level Map, Sandbox, and Class Code"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/90 text-sky-300 shadow-md backdrop-blur-sm transition-transform active:scale-95 hover:border-sky-400 sm:h-10 sm:w-10"
          >
            <LayoutGrid className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
        </div>
      </div>

      {/* Reorganized Bottom Dock: Primary Play + Games (Left) & Unified Daily Mission Card (Right) */}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-start="true"
            onClick={onStartMission}
            aria-label={`Start Level ${nextLevelId}`}
            className="pointer-events-auto flex h-11 flex-1 items-center justify-center gap-2.5 rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 text-slate-950 shadow-[0_5px_0_#047857,0_12px_24px_rgba(16,185,129,0.38)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_#047857] sm:h-14 sm:w-auto sm:flex-none sm:min-w-[144px] sm:gap-3 sm:px-6"
          >
            <span className="anim-bob inline-flex items-center gap-2 sm:gap-3">
              <Play className="h-5 w-5 fill-slate-950 text-slate-950 sm:h-6 sm:w-6" />
              <span className="tabular rounded-xl bg-slate-950/20 px-2 py-0.5 text-base font-black text-slate-950 sm:px-2.5 sm:text-xl">
                {nextLevelId}
              </span>
            </span>
          </button>
          {onOpenGameRoom && (
            <button
              id="titleGameRoomBtn"
              type="button"
              onClick={onOpenGameRoom}
              aria-label="Open Mini-Games Arcade"
              className="pointer-events-auto flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-amber-400/80 bg-slate-900/92 px-3.5 text-xs font-black text-amber-200 shadow-lg backdrop-blur-md transition-transform hover:border-amber-300 hover:bg-slate-800 active:scale-95 sm:h-14 sm:px-4 sm:text-sm"
            >
              <Gamepad2 className="h-4.5 w-4.5 text-amber-300 sm:h-5 sm:w-5" />
              <span>Games</span>
            </button>
          )}
        </div>

        {/* Unified Daily Mission Card (Single Home for Daily Challenge & Streak) */}
        <section
          id="dailyMissionSection"
          aria-label="Daily Mission"
          data-daily-date={todayKey}
          data-streak={streak}
          className="pointer-events-auto flex w-full flex-col gap-1.5 rounded-2xl border border-amber-400/75 bg-slate-900/92 p-2 shadow-[0_10px_24px_rgba(245,158,11,0.18)] backdrop-blur-md sm:w-[272px] sm:gap-2 sm:p-2.5"
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 text-[11px] font-black sm:text-xs">
              <span aria-label={`Today ${todayKey}`} className="inline-flex items-center gap-1 text-amber-200 tabular">
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                {monthNum}·{dayNum}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span aria-label={`Streak ${streak}`} className="inline-flex items-center gap-0.5 text-orange-300 tabular">
                <Flame className="anim-flame-flicker h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                {streak}
              </span>
            </div>

            {dailyStars > 0 ? (
              <div
                aria-label={`Daily Mission Complete ${dailyStars} Stars`}
                className="flex items-center gap-1 text-emerald-300"
              >
                <Check className="h-3 w-3 stroke-[3] text-emerald-300" />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`h-2.5 w-2.5 ${
                        s <= dailyStars ? 'fill-amber-300 text-amber-300' : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span
                aria-label="Daily Reward 50 Bolts"
                className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-200 tabular"
              >
                <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
                +50
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700/85 bg-slate-950/70 px-2 py-1">
            <div className="flex items-center gap-1" aria-label="Today Track Preview">
              {dailyHazards.map((cond) => (
                <div
                  key={cond}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800/90"
                >
                  <HazardIcon cond={cond} className="h-4 w-4" />
                </div>
              ))}
              <div className="flex h-6 items-center gap-1 px-1.5 text-cyan-200">
                <Gem className="h-3 w-3 fill-cyan-300 text-cyan-200" />
                <span className="tabular text-[11px] font-black">{dailyCrystals}</span>
              </div>
            </div>

            <button
              id="dailyMissionPlayBtn"
              type="button"
              onClick={onStartDaily}
              aria-label="Play Daily Mission"
              className="flex h-8 min-w-[38px] items-center justify-center rounded-lg border border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 px-2.5 text-slate-950 shadow-[0_3px_0_#b45309] transition-transform active:translate-y-0.5 hover:brightness-105"
            >
              <Play className="h-4 w-4 fill-slate-950 text-slate-950" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-1" aria-label="Daily Return Reward Ladder">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const completed =
                day < clampedStreak || (day === clampedStreak && dailyStars > 0);
              const isBeacon = day === beaconDay && !completed;
              const isGiftMilestone = day === 3;
              const isCrownMilestone = day === 7;

              return (
                <div
                  key={day}
                  aria-label={`Day ${day}${isGiftMilestone ? ' Gift Reward' : isCrownMilestone ? ' Crown Reward' : ''}`}
                  className={`relative flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-black tabular sm:h-6 sm:w-6 sm:text-[10px] ${
                    completed
                      ? 'border-emerald-300 bg-emerald-500/30 text-emerald-200'
                      : isBeacon
                        ? 'border-amber-300 bg-amber-400/25 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                        : isCrownMilestone
                          ? 'border-amber-400/60 bg-amber-500/10 text-amber-300'
                          : isGiftMilestone
                            ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center ${
                      isBeacon
                        ? 'anim-dot-pulse'
                        : (isGiftMilestone || isCrownMilestone) && (completed || isBeacon)
                          ? 'anim-reward-hop'
                          : ''
                    }`}
                  >
                    {completed ? (
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    ) : isCrownMilestone ? (
                      <Crown className="h-3 w-3 text-amber-300" />
                    ) : isGiftMilestone ? (
                      <Gift className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <span>{day}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
