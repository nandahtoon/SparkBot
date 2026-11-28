import React, { useMemo, useState } from 'react';
import {
  Wand2,
  Calendar,
  Check,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  LayoutGrid,
  Play,
  Rocket,
  Settings,
  ShoppingBag,
  Star,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTERS,
  generateDailyChallenge,
  getDailyDateKey,
  getLevelById,
  LEVELS,
  type BotCharacterId,
  type SensorCondition,
  type TrackTile
} from '../game/engine';
import { SFX } from '../game/audio';
import { HazardIcon, SparkBotEmblem } from './Icons';
import { MuteIndicator, useMuteFlash } from './MuteIndicator';
import { FullscreenToggleButton } from './FullscreenToggleButton';

import { getMissionLearningGoal } from '../game/missionCurriculum';

type LaunchMode = 'story' | 'daily';

function extractTrackHazards(track: TrackTile[], hasDynamicHazards = false): SensorCondition[] {
  const seen: SensorCondition[] = [];
  for (const tile of track) {
    const cond: SensorCondition | null =
      tile.type === 'gap' ? 'GAP' : tile.type === 'mud' ? 'MUD' : tile.type === 'ramp' ? 'RAMP' : null;
    if (cond && !seen.includes(cond)) seen.push(cond);
  }
  if (hasDynamicHazards && !seen.includes('HAZARD')) {
    seen.push('HAZARD');
  }
  return seen.slice(0, 3);
}

interface TitleOverlayProps {
  nextLevelId: number;
  profileName: string;
  activeCharacter: BotCharacterId;
  totalStars: number;
  totalBolts: number;
  streak: number;
  dailyStars: number;
  trophyTiers: number;
  claimableQuestsCount?: number;
  muted: boolean;
  onStartJunior?: () => void;
  onStartMission: () => void;
  onStartDaily: () => void;
  onOpenGameRoom?: () => void;
  onOpenShop?: () => void;
  onOpenQuests?: () => void;
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
  claimableQuestsCount = 0,
  muted,
  onStartJunior,
  onStartMission,
  onStartDaily,
  onOpenGameRoom,
  onOpenShop,
  onOpenQuests,
  onOpenLevelMap,
  onOpenTrophies,
  onOpenSettings,
  onOpenProfile,
  onToggleMute
}) => {
  const [launchMode, setLaunchMode] = useState<LaunchMode>('story');
  const charDef = BOT_CHARACTERS[activeCharacter];
  const { visible: muteFlashVisible, flashKey: muteFlashKey } = useMuteFlash(muted);

  const todayKey = getDailyDateKey();
  const [, rawMonth = '01', rawDay = '01'] = todayKey.split('-');
  const monthNum = Number(rawMonth) || 1;
  const dayNum = Number(rawDay) || 1;

  const nextLevel = useMemo(() => getLevelById(nextLevelId) || LEVELS[0], [nextLevelId]);
  const storyLearningGoal = getMissionLearningGoal(nextLevel);
  const storyHazards = useMemo(
    () => extractTrackHazards(nextLevel.track, Boolean(nextLevel.hazards?.length)),
    [nextLevel]
  );
  const storyCrystals = useMemo(
    () => nextLevel.track.filter((t) => t.crystal).length,
    [nextLevel]
  );

  const dailyChallenge = useMemo(() => generateDailyChallenge(todayKey), [todayKey]);

  const dailyHazards = useMemo(
    () => extractTrackHazards(dailyChallenge.track, Boolean(dailyChallenge.hazards?.length)),
    [dailyChallenge]
  );

  const dailyCrystals = useMemo(
    () => dailyChallenge.track.filter((t) => t.crystal).length,
    [dailyChallenge]
  );

  const clampedStreak = Math.min(7, Math.max(0, streak));
  const beaconDay =
    dailyStars > 0
      ? Math.min(7, clampedStreak + 1)
      : Math.max(1, Math.min(7, clampedStreak || 1));

  const isDailyMode = launchMode === 'daily';

  const handleSelectMode = (mode: LaunchMode) => {
    if (mode !== launchMode) {
      SFX.uiTick();
      setLaunchMode(mode);
    }
  };

  const handlePrimaryPlay = () => {
    if (isDailyMode) {
      onStartDaily();
    } else {
      onStartMission();
    }
  };

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
            className="flex h-11 min-w-0 items-center gap-2 rounded-2xl border-2 border-slate-600/80 bg-slate-900/95 px-2 text-left shadow-md transition-transform hover:border-sky-400 active:scale-95 sm:h-11 sm:px-2.5"
          >
            <div
              className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-800 sm:h-8 sm:w-8"
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
                className="max-w-[100px] truncate text-xs font-black leading-none text-white sm:max-w-[156px]"
              >
                {profileName}
              </span>
              <span className="hidden items-center gap-0.5 text-xs font-extrabold text-amber-300 tabular sm:inline-flex">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {totalStars}
              </span>
            </div>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-600/80 bg-slate-900/95 text-slate-100 shadow-md transition-transform active:scale-95 hover:border-sky-400 sm:h-11 sm:w-11"
            >
              {muted ? (
                <VolumeX className="h-4.5 w-4.5 text-rose-400" />
              ) : (
                <Volume2 className="h-4.5 w-4.5 text-sky-300" />
              )}
            </button>
            <MuteIndicator muted={muted} visible={muteFlashVisible} flashKey={muteFlashKey} />
          </div>

          <button
            id="titleSettingsBtn"
            type="button"
            onClick={onOpenSettings}
            aria-label="Audio, Speed, and App Settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-600/80 bg-slate-900/95 text-slate-100 shadow-md transition-transform active:scale-95 hover:border-sky-400 sm:h-11 sm:w-11"
          >
            <Settings className="h-4.5 w-4.5 text-sky-300" />
          </button>

          <FullscreenToggleButton />
        </div>

        {/* Right Controls: Bolt Shop, Skill Quests, Trophies & Level Map */}
        <details className="pointer-events-auto relative shrink-0">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-900/95 px-3 text-sm font-bold text-sky-100 shadow-md focus-visible:outline-2 focus-visible:outline-sky-300" aria-label="More activities">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" /> More
          </summary>
          <div className="absolute right-0 top-full z-30 mt-2 grid w-48 grid-cols-2 gap-2 rounded-2xl border border-slate-600 bg-slate-950/95 p-3 shadow-2xl" onClick={e => { if ((e.target as HTMLElement).closest('button')) e.currentTarget.parentElement?.removeAttribute('open'); }}>
          {onOpenShop && (
            <button
              id="titleBoltShopBtn"
              type="button"
              onClick={onOpenShop}
              aria-label={`Bolt Upgrade Shop (${totalBolts} Bolts)`}
              className="flex h-10 items-center gap-1 rounded-xl border border-amber-400/75 bg-slate-900/95 px-2.5 text-amber-200 shadow-md transition-transform active:scale-95 hover:border-amber-300 sm:px-3"
            >
              <ShoppingBag className="h-4 w-4 text-amber-300 sm:h-4.5 sm:w-4.5" />
              <span className="tabular text-xs font-black sm:text-sm">{totalBolts}</span>
            </button>
          )}

          {onOpenQuests && (
            <button
              id="titleQuestsBtn"
              type="button"
              onClick={onOpenQuests}
              aria-label={
                claimableQuestsCount > 0
                  ? `Mastery Skill Quests (${claimableQuestsCount} ready to claim)`
                  : 'Mastery Skill Quests'
              }
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/70 bg-slate-900/95 text-emerald-300 shadow-md transition-transform active:scale-95 hover:border-emerald-300 sm:w-auto sm:gap-1 sm:px-3"
            >
              <Target className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              <span className="hidden text-xs font-black text-emerald-200 sm:inline">Quests</span>
              {claimableQuestsCount > 0 && (
                <span
                  data-testid="title-quests-badge"
                  className="tabular absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-amber-200 bg-amber-400 px-1 text-[10px] font-black text-slate-950 shadow"
                >
                  {claimableQuestsCount}
                </span>
              )}
            </button>
          )}

          <button
            id="trophyShelfBtn"
            type="button"
            onClick={onOpenTrophies}
            aria-label="STEM Trophy Shelf"
            className="flex h-10 items-center gap-1 rounded-xl border border-amber-400/70 bg-slate-900/95 px-2.5 text-amber-300 shadow-md transition-transform active:scale-95 hover:border-amber-300 sm:px-3"
          >
            <Trophy className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            <span className="tabular text-xs font-black text-amber-200 sm:text-sm">{trophyTiers}</span>
          </button>

          <button
            type="button"
            onClick={onOpenLevelMap}
            aria-label="Level Map, Bug Buster, Sandbox, and Class Code"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/95 text-sky-300 shadow-md transition-transform active:scale-95 hover:border-sky-400"
          >
            <LayoutGrid className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
          </div>
        </details>
      </div>

      {/* Subtle Brand Wordmark Lockup (flows cleanly from Splash into 3D Hero Workshop) */}
      <div
        data-testid="title-brand-lockup"
        className="pointer-events-none mb-auto mt-2 flex flex-col items-center text-center sm:mt-3"
      >
        <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_4px_18px_rgba(2,6,23,0.85)] sm:text-4xl">
          <span className="text-amber-300">Spark</span>Bot
        </h1>
        <p className="mt-0.5 text-[11px] font-semibold tracking-[0.14em] text-sky-200/90 drop-shadow-[0_2px_10px_rgba(2,6,23,0.9)] sm:text-xs">
          Play &amp; Learn
        </p>
        <span className="mt-1 text-[10px] text-slate-300" data-testid="release-version">V0.3 · Family Edition</span>
      </div>

      {/* Compact Unified Bottom Launch Console: One Mode Switcher + One Unmistakable Play CTA */}
      <div className="flex justify-center pb-0.5 sm:pb-1">
        <section
          id="dailyMissionSection"
          aria-label="Mission Launch Console"
          data-daily-date={todayKey}
          data-streak={streak}
          className={`pointer-events-auto flex w-full max-w-[480px] flex-col gap-2 rounded-2xl border bg-slate-950/90 p-3 shadow-[0_14px_32px_rgba(2,6,23,0.55)] backdrop-blur-md transition-colors sm:gap-2.5 sm:p-2.5 ${
            isDailyMode ? 'border-amber-400/55' : 'border-emerald-400/40'
          }`}
        >
          {/* Mode Switcher: Mission vs Daily (Clear Segmented Choice, Zero Duplicate Play Buttons) */}
          <div
            role="tablist"
            aria-label="Choose Play Mode"
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-900/95 p-1"
          >
            <button
              id="modeStoryTab"
              aria-label="Story Missions"
              type="button"
              role="tab"
              aria-selected={!isDailyMode}
              onClick={() => handleSelectMode('story')}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-black transition-all active:scale-[0.98] sm:text-sm ${
                !isDailyMode
                  ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <Rocket className={`h-4 w-4 ${!isDailyMode ? 'text-emerald-300' : 'text-slate-400'}`} />
              <span>Story · {nextLevelId}</span>
            </button>

            <button
              id="modeDailyTab"
              aria-label="Daily Challenge"
              type="button"
              role="tab"
              aria-selected={isDailyMode}
              onClick={() => handleSelectMode('daily')}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-black transition-all active:scale-[0.98] sm:text-sm ${
                isDailyMode
                  ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/60 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <Calendar className={`h-4 w-4 ${isDailyMode ? 'text-amber-300' : 'text-amber-400/80'}`} />
              <span
                aria-label={`Streak ${streak}`}
                className="inline-flex items-center gap-0.5 text-xs font-black text-orange-300 tabular"
              >
                <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                {streak}
              </span>
              <span>Daily</span>
              {dailyStars > 0 ? (
                <Check className="h-4 w-4 stroke-[3] text-emerald-300" aria-label="Daily Complete" />
              ) : (
                <Gift className="h-3.5 w-3.5 text-amber-300" aria-label="Daily Reward Ready" />
              )}
            </button>
          </div>

          {/* Flat Contextual Mission Info Strip (Zero Card-Inside-Card Nesting) */}
          {!isDailyMode ? (
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <div className="flex min-w-0 items-center gap-1.5">
                {nextLevel.isBoss && (
                  <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-label="Boss Mission" />
                )}
                <span className="truncate font-extrabold text-slate-100">
                  {nextLevel.name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5" aria-label="Mission Preview">
                {storyHazards.map((cond) => (
                  <HazardIcon key={cond} cond={cond} className="h-4 w-4 shrink-0" />
                ))}
                {storyCrystals > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-cyan-200 tabular">
                    <Gem className="h-3 w-3 fill-cyan-300 text-cyan-200" />
                    {storyCrystals}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 px-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span aria-label={`Today ${todayKey}`} className="font-extrabold text-amber-200 tabular">
                    {monthNum}·{dayNum}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <div className="flex items-center gap-1.5" aria-label="Today Track Preview">
                    {dailyHazards.map((cond) => (
                      <HazardIcon key={cond} cond={cond} className="h-4 w-4 shrink-0" />
                    ))}
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-cyan-200 tabular">
                      <Gem className="h-3 w-3 fill-cyan-300 text-cyan-200" />
                      {dailyCrystals}
                    </span>
                  </div>
                </div>

                {dailyStars > 0 ? (
                  <div
                    aria-label={`Daily Mission Complete ${dailyStars} Stars`}
                    className="flex items-center gap-0.5 text-emerald-300"
                  >
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= dailyStars ? 'fill-amber-300 text-amber-300' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <span
                    aria-label="Daily Reward 50 Bolts"
                    className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-300 tabular"
                  >
                    <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
                    +50
                  </span>
                )}
              </div>

              {/* Compact 7-Day Reward Trail */}
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
                      className={`relative flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-black tabular sm:h-5.5 sm:w-5.5 sm:text-[10px] ${
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
            </div>
          )}

          {/* Junior guided entry: reuses the existing Level 1 tutorial without resetting saves. */}
          {onStartJunior && !isDailyMode && (
            <button
              id="juniorGuidedStartBtn"
              type="button"
              onClick={onStartJunior}
              aria-label="Learn to Play: guided first mission"
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/70 bg-cyan-950/80 px-3 py-2 text-sm font-extrabold text-cyan-100 transition-colors hover:bg-cyan-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              <Wand2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Learn to Play</span>
              <span className="text-xs font-semibold text-cyan-200">Guided adventure</span>
            </button>
          )}

          {!isDailyMode && storyLearningGoal && (
            <p data-testid="mission-learning-goal" className="px-1 text-center text-xs font-semibold leading-tight text-sky-200">{storyLearningGoal.goal}</p>
          )}

          {/* Primary Action Row: Chunky 3D Play CTA + Distinct Mini-Games Button */}
          <div className="flex items-center gap-2">
            <button
              id={isDailyMode ? 'dailyMissionPlayBtn' : 'storyMissionPlayBtn'}
              type="button"
              data-start="true"
              onClick={handlePrimaryPlay}
              aria-label={isDailyMode ? 'Play Daily Mission' : `Play Mission ${nextLevelId}`}
              className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-base font-black text-slate-950 transition-all active:translate-y-0.5 sm:text-lg ${
                isDailyMode
                  ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_5px_0_#b45309,0_10px_22px_rgba(245,158,11,0.32)] active:shadow-[0_1px_0_#b45309]'
                  : 'border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_5px_0_#047857,0_10px_22px_rgba(16,185,129,0.36)] active:shadow-[0_1px_0_#047857]'
              }`}
            >
              <Play className="h-6 w-6 fill-slate-950 text-slate-950" />
              <span className="tabular">
                {isDailyMode ? (dailyStars > 0 ? 'DAILY' : 'PLAY') : `Play Mission ${nextLevelId}`}
              </span>
            </button>

            {onOpenGameRoom && (
              <button
                id="titleGameRoomBtn"
                type="button"
                onClick={onOpenGameRoom}
                aria-label="Open Mini-Games Arcade"
                className="flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-300/75 bg-gradient-to-b from-indigo-500 to-indigo-700 px-4 text-sm font-black text-white shadow-[0_5px_0_#312e81] transition-all active:translate-y-0.5 active:shadow-[0_1px_0_#312e81]"
              >
                <Gamepad2 className="h-5 w-5 text-amber-300" />
                <span>Games</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
