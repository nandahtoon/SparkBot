import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  BONUS_LEVELS,
  BOT_CHARACTERS,
  BOT_THEMES,
  calculateStars,
  canPlacePartInSlot,
  cloneChassis,
  cloneCircuitGrid,
  computeChassisInfo,
  computeGhostPreviewPlan,
  countBlocks,
  createDefaultPaintConfig,
  createEmptyChassis,
  DECAL_LABELS,
  deleteSavedPaintTheme,
  evaluateBonusStar,
  generateDailyChallenge,
  getActiveDailyStreak,
  getDailyDateKey,
  getLevelById,
  getTutorialStep,
  LEVELS,
  normalizeAudioSettings,
  normalizeBotCharacter,
  normalizeBotTheme,
  normalizePaintConfig,
  normalizeSavedPaintThemes,
  PAINT_PART_LABELS,
  recordSkillMastery,
  setPartPaint,
  buildStepInspection,
  simulateProgram,
  traceCircuit,
  upsertSavedPaintTheme,
  validateBonusStarConditions,
  type ActionDashMetrics,
  type AudioSettings,
  type BotCharacterId,
  type BotThemeId,
  type ChassisGrid,
  type CircuitGrid,
  type CodeBlock,
  type LevelDef,
  type PaintBoothConfig,
  type PaintPartKey,
  type PartId,
  type PartPaintSpec,
  type SaveProfile,
  type SavedPaintTheme,
  type SimEvent,
  type SimResult
} from './game/engine';
import {
  computeTotalStarsEarned,
  ensureActionDashChassis,
  getLevelSavedStars,
  normalizeProfileName,
  renameSaveProfile,
  validateProfileName
} from './game/profileStorage';
import {
  createRosterSlot,
  deleteRosterSlot,
  loadProfileRoster,
  saveActiveRosterProfile,
  switchRosterSlot,
  type ProfileRosterState
} from './game/profileRoster';
import { SFX } from './game/audio';
import { SPEECH } from './game/readAloud';
import { getPartPlacementSoundProfile } from './game/partAudio';
import {
  pickCharacterSwitchResponse,
  pickCustomPaintResponse,
  pickInstallResponse,
  pickPaintResponse,
  pickThemeEquipResponse,
  pickThemeSaveResponse,
  pickTouchResponse,
  type RobotSpeechEvent,
  type RobotTouchZone
} from './game/robotVoice';
import {
  classifyCodeBlockFeedback,
  type CodeComplexityTier
} from './game/codeFeedback';
import {
  evaluateSpeedRunBonus,
  getLevelTimeTargets,
  getTimerKeyForLevel,
  updateBestCompletionTime
} from './game/challengeTimer';
import {
  createDefaultSandboxDraft,
  normalizeSandboxDraft,
  SANDBOX_MAX_SAVED,
  sandboxDraftToLevelDef
} from './game/sandboxCodec';
import type { SandboxMissionDraft } from './game/engine';
import type { UnifiedWorldController, WorldMode } from './three/worldScene';
import type { HeadScreenPoint, SlotScreenPoint } from './three/robotRig';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHud, type MoodCue } from './components/TopHud';
import { BuildDock } from './components/BuildDock';
import { PaintBoothDock } from './components/PaintBoothDock';
import { BotProfileModal } from './components/BotProfileModal';
import { CodeDock } from './components/CodeDock';
import { ActionRunHud, CircuitOverlay } from './components/CircuitAndActionHud';
import {
  LevelMapModal,
  PauseModal,
  VictoryModal,
  type VictorySpeedRunSummary
} from './components/Modals';
import { GhostHand } from './components/GhostHand';
import { ConceptDemoPopover, type DemoRequest } from './components/ConceptDemoPopover';
import { SettingsModal } from './components/SettingsModal';
import { RobotSpeechBubble } from './components/RobotSpeechBubble';
import type { GameRoomRoundSummary } from './components/GameRoomModal';
import { PlanetAdventureHud } from './components/PlanetAdventureHud';
import { AdaptiveHintBanner } from './components/AdaptiveHintBanner';
import type { ArcadeGameId } from './game/arcadeGames';
import {
  computeAcademySkillBadges,
  computeAdaptiveHint,
  detectLearningMilestoneUnlocks,
  getFactCardById,
  getUnlockedFactCardsForLevel,
  normalizeLearningTelemetry,
  recordLevelAttemptResult,
  syncStreakWithShieldsOnCompletion,
  syncStreakWithShieldsOnLogin,
  type AcademyBadgeProgress,
  type AcademyPillarId,
  type AdaptiveHintTier,
  type ParsonsStarterTemplate,
  type StemFactCardDef
} from './game/educationStrategy';
import {
  MilestoneCelebrationOverlay,
  type MilestoneCelebrationEvent
} from './components/MilestoneCelebrationOverlay';
import type { MilestoneUnlockKind } from './game/milestoneParticles';
import {
  computePlanetAdventureReward,
  type PlanetAdventureMetrics
} from './game/planetAdventure';
import type { WorkshopCameraControls } from './components/WorkshopOrbitStrip';
import { useChallengeTimer } from './hooks/useChallengeTimer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const TrophyShelfModal = React.lazy(() =>
  import('./components/TrophyShelfModal').then((m) => ({ default: m.TrophyShelfModal }))
);
const GameRoomModal = React.lazy(() =>
  import('./components/GameRoomModal').then((m) => ({ default: m.GameRoomModal }))
);
const ParentDashboardModal = React.lazy(() =>
  import('./components/ParentDashboardModal').then((m) => ({ default: m.ParentDashboardModal }))
);
const SandboxCreatorModal = React.lazy(() =>
  import('./components/SandboxCreatorModal').then((m) => ({ default: m.SandboxCreatorModal }))
);
const ClassroomCodeModal = React.lazy(() =>
  import('./components/ClassroomCodeModal').then((m) => ({ default: m.ClassroomCodeModal }))
);

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<UnifiedWorldController | null>(null);

  const initialSessionRef = useRef<{ save: SaveProfile; roster: ProfileRosterState } | null>(null);
  if (!initialSessionRef.current) {
    const { roster: initRoster, activeSave } = loadProfileRoster();
    const today = getDailyDateKey();
    const loginRes = syncStreakWithShieldsOnLogin(activeSave.daily, activeSave.streakShields, today);
    const updated: SaveProfile = {
      ...activeSave,
      daily: loginRes.daily,
      streakShields: loginRes.streakShields
    };
    const syncedRoster = saveActiveRosterProfile(updated);
    initialSessionRef.current = {
      save: updated,
      roster: syncedRoster || initRoster
    };
  }

  const [save, setSave] = useState<SaveProfile>(() => initialSessionRef.current!.save);
  const [roster, setRoster] = useState<ProfileRosterState>(() => initialSessionRef.current!.roster);

  const [mode, setMode] = useState<WorldMode>('TITLE');
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGameRoom, setShowGameRoom] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showClassCode, setShowClassCode] = useState(false);
  const [trophyInitialTab, setTrophyInitialTab] = useState<'badges' | 'facts'>('badges');
  const [adaptiveHintTier, setAdaptiveHintTier] = useState<0 | AdaptiveHintTier>(0);
  const [, setMaxHintTierUsed] = useState<0 | AdaptiveHintTier>(0);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [, setHadPriorFail] = useState(false);
  const [failingBlockId, setFailingBlockId] = useState<string | null>(null);
  const [lastFailedSim, setLastFailedSim] = useState<SimResult | null>(null);
  const [bugFixerEarned, setBugFixerEarned] = useState(false);
  const [newlyUnlockedFacts, setNewlyUnlockedFacts] = useState<StemFactCardDef[]>([]);
  const maxHintTierRef = useRef<0 | AdaptiveHintTier>(0);
  const consecutiveFailsRef = useRef(0);
  const hadPriorFailRef = useRef(false);
  const [selectedPaintPart, setSelectedPaintPart] = useState<PaintPartKey>('chassis');
  const [activeDemo, setActiveDemo] = useState<DemoRequest | null>(null);
  const [upgradedPillars, setUpgradedPillars] = useState<AcademyPillarId[]>([]);
  const [milestoneCelebration, setMilestoneCelebration] =
    useState<MilestoneCelebrationEvent | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [workshopAutoSpin, setWorkshopAutoSpin] = useState(false);
  const [inspect3D, setInspect3D] = useState(false);
  const [installPhase, setInstallPhase] = useState<'idle' | 'working' | 'celebrating'>('idle');
  const [robotSpeech, setRobotSpeech] = useState<(RobotSpeechEvent & { id: number }) | null>(null);
  const [headPoint, setHeadPoint] = useState<HeadScreenPoint | null>(null);

  const speechTimerRef = useRef<number | null>(null);
  const speechIdRef = useRef(0);
  const milestoneTimerRef = useRef<number | null>(null);
  const milestoneIdRef = useRef(0);
  const touchCounterRef = useRef(0);
  const installCounterRef = useRef(0);
  const paintCounterRef = useRef(0);
  const placementIdRef = useRef(0);
  const codeFeedbackTimerRef = useRef<number | null>(null);
  const codeFeedbackCountRef = useRef(0);
  const lastHeadRef = useRef<HeadScreenPoint | null>(null);
  const [lastCodeFeedbackTier, setLastCodeFeedbackTier] = useState<CodeComplexityTier | null>(null);
  const [lastPlacement, setLastPlacement] = useState<{
    id: number;
    part: PartId;
    r: number;
    c: number;
  } | null>(null);

  const [currentLevel, setCurrentLevel] = useState<LevelDef>(() => {
    const nextLvl = Math.min(LEVELS.length, Math.max(1, save.unlockedLevel || 1));
    return getLevelById(nextLvl) || LEVELS[0];
  });

  const [chassis, setChassis] = useState<ChassisGrid>(() => createEmptyChassis());
  const [program, setProgram] = useState<CodeBlock[]>([]);
  const [circuitGrid, setCircuitGrid] = useState<CircuitGrid>(() => cloneCircuitGrid(LEVELS[0].circuit));
  const [slotPoints, setSlotPoints] = useState<SlotScreenPoint[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartId | null>(null);
  const [ghostHelp, setGhostHelp] = useState<boolean>(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeSimResult, setActiveSimResult] = useState<SimResult | null>(null);
  const [activeSimStepIdx, setActiveSimStepIdx] = useState<number>(-1);
  const [simPaused, setSimPaused] = useState(false);
  const [simAwaitingStep, setSimAwaitingStep] = useState(false);
  const [moodCue, setMoodCue] = useState<MoodCue | null>(null);
  const [lastSimCrystals, setLastSimCrystals] = useState<{ collected: number; total: number }>({
    collected: 0,
    total: 0
  });
  const [actionMetrics, setActionMetrics] = useState<ActionDashMetrics | null>(null);
  const [planetMetrics, setPlanetMetrics] = useState<PlanetAdventureMetrics | null>(null);
  const [planetSummary, setPlanetSummary] = useState<GameRoomRoundSummary | null>(null);
  const planetKeysRef = useRef<Set<string>>(new Set());

  const normalizedAudio = useMemo(() => normalizeAudioSettings(save.audio), [save.audio]);
  const activeCharacter = useMemo(
    () => normalizeBotCharacter(save.botCharacter),
    [save.botCharacter]
  );
  const activePaintConfig = useMemo(
    () => normalizePaintConfig(save.paintBooth, normalizeBotTheme(save.botTheme), activeCharacter),
    [activeCharacter, save.botTheme, save.paintBooth]
  );
  const savedPaintThemes = useMemo(
    () => normalizeSavedPaintThemes(save.savedPaintThemes),
    [save.savedPaintThemes]
  );
  const activeProfileName = useMemo(
    () => normalizeProfileName(save.profileName),
    [save.profileName]
  );
  const lowGraphics = Boolean(save.lowGraphics);
  const challengeTimerEnabled = Boolean(save.challengeTimerEnabled);
  const [circuitSolvedFreeze, setCircuitSolvedFreeze] = useState(false);
  const [lastVictorySpeedRun, setLastVictorySpeedRun] =
    useState<VictorySpeedRunSummary | null>(null);

  const currentSandboxDraft = useMemo(
    () => normalizeSandboxDraft(save.sandbox || createDefaultSandboxDraft()),
    [save.sandbox]
  );
  const savedSandboxLevels = useMemo(
    () =>
      Array.isArray(save.sandbox?.savedLevels)
        ? save.sandbox.savedLevels.map((d) => normalizeSandboxDraft(d))
        : [],
    [save.sandbox?.savedLevels]
  );

  const currentTimeTargets = useMemo(
    () => getLevelTimeTargets(currentLevel),
    [currentLevel]
  );
  const currentLevelBestMs = useMemo(() => {
    const key = getTimerKeyForLevel(currentLevel);
    return save.bestTimes?.[key] ?? null;
  }, [currentLevel, save.bestTimes]);

  const isChallengeTimerRunning =
    challengeTimerEnabled &&
    !circuitSolvedFreeze &&
    !paused &&
    !showMap &&
    !showTrophies &&
    !showSettings &&
    !showProfile &&
    !showGameRoom &&
    !showParentDashboard &&
    !showSandbox &&
    !showClassCode &&
    (mode === 'BUILD_3D' ||
      mode === 'CODE_3D' ||
      mode === 'SIMULATING' ||
      mode === 'CIRCUIT_3D');

  const {
    elapsedMs: levelElapsedMs,
    elapsedRef: levelElapsedRef,
    setElapsedMs: setLevelElapsedMs,
    resetTimer
  } = useChallengeTimer(isChallengeTimerRunning);

  // Keep cadet roster state & active localStorage slot synced whenever active save changes
  useEffect(() => {
    setRoster(saveActiveRosterProfile(save));
  }, [save]);

  // Sync master mute + granular channel volume sliders (+ Web Speech Read-Aloud)
  useEffect(() => {
    SFX.applySettings(save.muted, normalizedAudio);
    SPEECH.applySettings(save.muted, normalizedAudio.voiceVolume);
  }, [save.muted, normalizedAudio]);

  useEffect(() => {
    SPEECH.setEnabled(Boolean(save.readAloudEnabled));
  }, [save.readAloudEnabled]);

  // Sync low-graphics mode with 3D world & document attribute
  useEffect(() => {
    worldRef.current?.setLowGraphics(lowGraphics);
    document.body.dataset.lowGraphics = lowGraphics ? 'true' : 'false';
  }, [lowGraphics]);

  // Keep 3D bot character & Paint Booth materials declaratively synced with React state
  useEffect(() => {
    worldRef.current?.setBotCharacter(activeCharacter, false);
  }, [activeCharacter]);

  useEffect(() => {
    worldRef.current?.setPaintConfig(activePaintConfig, null);
  }, [activePaintConfig]);

  useEffect(() => {
    return () => {
      if (speechTimerRef.current !== null) {
        window.clearTimeout(speechTimerRef.current);
      }
      if (codeFeedbackTimerRef.current !== null) {
        window.clearTimeout(codeFeedbackTimerRef.current);
      }
      if (milestoneTimerRef.current !== null) {
        window.clearTimeout(milestoneTimerRef.current);
      }
      SFX.cancelSpeech();
      SPEECH.stop();
    };
  }, []);

  const triggerMilestoneCelebration = useCallback(
    (facts: StemFactCardDef[], badges: AcademyBadgeProgress[]) => {
      if (facts.length === 0 && badges.length === 0) return;
      const kind: MilestoneUnlockKind =
        facts.length > 0 && badges.length > 0
          ? 'both'
          : facts.length > 0
            ? 'fact'
            : 'badge';

      SFX.milestoneUnlock(kind);
      const id = ++milestoneIdRef.current;
      setMilestoneCelebration({ id, kind, facts, badges });

      if (milestoneTimerRef.current !== null) {
        window.clearTimeout(milestoneTimerRef.current);
      }
      milestoneTimerRef.current = window.setTimeout(() => {
        setMilestoneCelebration((cur) => (cur && cur.id === id ? null : cur));
      }, 4000);
    },
    []
  );

  const triggerRobotSpeech = useCallback((ev: RobotSpeechEvent) => {
    SFX.speakWallE(ev.phrase, ev.pitchScale, ev.variant);
    const id = ++speechIdRef.current;
    setRobotSpeech({ ...ev, id });
    if (speechTimerRef.current !== null) {
      window.clearTimeout(speechTimerRef.current);
    }
    speechTimerRef.current = window.setTimeout(() => {
      setRobotSpeech((cur) => (cur && cur.id === id ? null : cur));
    }, 2600);
  }, []);

  const handleCodeBlockPlaced = useCallback(
    ({ block, nestingDepth }: { block: CodeBlock; nestingDepth: number }) => {
      const fb = classifyCodeBlockFeedback(block.type, nestingDepth, block.condition);
      worldRef.current?.triggerCodeBlockFeedback(fb);
      setLastCodeFeedbackTier(fb.tier);
      if (codeFeedbackTimerRef.current !== null) {
        window.clearTimeout(codeFeedbackTimerRef.current);
      }
      codeFeedbackTimerRef.current = window.setTimeout(() => {
        setLastCodeFeedbackTier(null);
      }, Math.round(fb.duration * 1000) + 120);

      if (fb.voicePhrase) {
        const pitchScale = BOT_CHARACTERS[activeCharacter].voicePitch;
        triggerRobotSpeech({
          phrase: fb.voicePhrase,
          variant: codeFeedbackCountRef.current++,
          emote: fb.voiceEmote,
          mood: fb.voiceMood,
          accentColor: fb.accentCss,
          pitchScale,
          syllables: fb.voiceSyllables,
          ariaLabel: fb.voiceAriaLabel
        });
      }
    },
    [activeCharacter, triggerRobotSpeech]
  );

  // Sync body[data-state] for shell parity
  useEffect(() => {
    if (paused) {
      document.body.dataset.state = 'paused';
    } else if (mode === 'TITLE') {
      document.body.dataset.state = 'title';
    } else if (mode === 'VICTORY') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [mode, paused]);

  const beginLevel = useCallback(
    (lvl: LevelDef, preserveChassis = false) => {
      setCurrentLevel(lvl);
      const nextChassis = preserveChassis ? chassis : createEmptyChassis();
      const nextCircuit = cloneCircuitGrid(lvl.circuit);
      setChassis(nextChassis);
      setProgram([]);
      setCircuitGrid(nextCircuit);
      setSelectedPart(null);
      setLastPlacement(null);
      setLastCodeFeedbackTier(null);
      setActiveBlockId(null);
      setActiveSimResult(null);
      setActiveSimStepIdx(-1);
      setSimPaused(false);
      setSimAwaitingStep(false);
      setMoodCue(null);
      setActiveDemo(null);
      setUpgradedPillars([]);
      setPaused(false);
      setShowMap(false);
      setShowTrophies(false);
      setShowSettings(false);
      setShowProfile(false);
      setShowGameRoom(false);
      setShowParentDashboard(false);
      setShowSandbox(false);
      setShowClassCode(false);
      setTrophyInitialTab('badges');
      setAdaptiveHintTier(0);
      setMaxHintTierUsed(0);
      maxHintTierRef.current = 0;
      setConsecutiveFails(0);
      consecutiveFailsRef.current = 0;
      setHadPriorFail(false);
      hadPriorFailRef.current = false;
      setFailingBlockId(null);
      setLastFailedSim(null);
      setBugFixerEarned(false);
      setNewlyUnlockedFacts([]);
      setMilestoneCelebration(null);
      if (milestoneTimerRef.current !== null) {
        window.clearTimeout(milestoneTimerRef.current);
        milestoneTimerRef.current = null;
      }
      setWorkshopAutoSpin(false);
      setInspect3D(false);
      setInstallPhase('idle');
      resetTimer();
      setCircuitSolvedFreeze(false);
      setLastVictorySpeedRun(null);
      setPlanetMetrics(null);
      setPlanetSummary(null);
      setMode('BUILD_3D');
      setGhostHelp(lvl.id === 1 && !save.tutorialDone);
      worldRef.current?.setLevel(lvl);
      worldRef.current?.setWorkshopAutoSpin(false);
      worldRef.current?.resetWorkshopView();
      worldRef.current?.updateChassis(nextChassis, null);
      worldRef.current?.setMode('BUILD_3D');
    },
    [chassis, resetTimer, save.tutorialDone]
  );

  // Refs for WebGL callbacks so canvas never unmounts
  const stateRef = useRef({ mode, circuitGrid, currentLevel, chassis, program, save });
  stateRef.current = { mode, circuitGrid, currentLevel, chassis, program, save };

  const handleCircuitCellTap = useCallback((r: number, c: number) => {
    const cur = stateRef.current;
    if (cur.mode !== 'CIRCUIT_3D') return;
    const cell = cur.circuitGrid[r]?.[c];
    if (!cell || (cell.type !== 'mirror' && cell.type !== 'splitter')) return;

    const nextGrid = cloneCircuitGrid(cur.circuitGrid);
    nextGrid[r][c].rot = nextGrid[r][c].rot === 0 ? 1 : 0;
    setCircuitGrid(nextGrid);
    worldRef.current?.setCircuitGrid(nextGrid);
    SFX.mirror();

    const trace = traceCircuit(nextGrid);
    if (trace.solved) {
      SFX.laserSolved();
      worldRef.current?.setMood('happy', 2.4);
      setCircuitSolvedFreeze(true);

      const info = computeChassisInfo(cur.chassis);
      const blkCount = countBlocks(cur.program);
      const sim = simulateProgram(cur.currentLevel, cur.chassis, cur.program);
      const starRes = calculateStars(
        cur.currentLevel,
        info.cost,
        blkCount,
        sim.collectedCrystals,
        sim.totalCrystals
      );
      const isBonusStar = evaluateBonusStar(cur.currentLevel, starRes);

      const timerEnabled = Boolean(cur.save.challengeTimerEnabled);
      const speedRunEval = evaluateSpeedRunBonus(
        levelElapsedRef.current,
        cur.currentLevel,
        timerEnabled
      );
      const levelTimerKey = getTimerKeyForLevel(cur.currentLevel);
      if (speedRunEval.enabled) {
        setLevelElapsedMs(speedRunEval.elapsedMs);
        const bestRes = updateBestCompletionTime(
          cur.save.bestTimes,
          levelTimerKey,
          speedRunEval.elapsedMs
        );
        setLastVictorySpeedRun({
          evaluation: speedRunEval,
          isNewRecord: bestRes.isNewRecord,
          bestMs: bestRes.bestMs
        });
      } else {
        setLastVictorySpeedRun(null);
      }

      setLastSimCrystals({ collected: sim.collectedCrystals, total: sim.totalCrystals });
      const fixedBug = hadPriorFailRef.current;
      setBugFixerEarned(fixedBug);
      const levelFacts = getUnlockedFactCardsForLevel(cur.currentLevel.id);
      const debugFact = fixedBug ? getFactCardById('debugging_mindset') : null;
      const candidateFacts = debugFact ? [...levelFacts, debugFact] : levelFacts;

      const mastery = recordSkillMastery(
        cur.save.skillStats,
        cur.currentLevel,
        cur.chassis,
        cur.program,
        sim
      );
      if (fixedBug) {
        mastery.next.bugsDebugged = (mastery.next.bugsDebugged || 0) + 1;
      }

      const unlocks = detectLearningMilestoneUnlocks({
        prevSkillStats: cur.save.skillStats,
        nextSkillStats: mastery.next,
        prevUnlockedFactIds: cur.save.unlockedFactIds,
        candidateFacts
      });
      const newFactIds = unlocks.newlyUnlockedFacts.map((f) => f.id);
      setNewlyUnlockedFacts(unlocks.newlyUnlockedFacts);
      setUpgradedPillars(unlocks.newlyUpgradedBadges.map((b) => b.id));

      setSave((prev) => {
        const mergedFacts = Array.from(
          new Set([...(prev.unlockedFactIds || []), ...newFactIds])
        );
        const next: SaveProfile = {
          ...prev,
          stars: { ...prev.stars },
          bonusStars: { ...prev.bonusStars },
          tutorialDone: true,
          totalBolts: prev.totalBolts + 50 + speedRunEval.bonusBolts + (fixedBug ? 15 : 0),
          passes: prev.passes + 1,
          skillStats: mastery.next,
          unlockedFactIds: mergedFacts,
          learningTelemetry: recordLevelAttemptResult(prev.learningTelemetry, {
            levelId: cur.currentLevel.id,
            won: true,
            hintTierUsed: maxHintTierRef.current,
            fixedPriorFail: fixedBug
          }),
          bestTimes: speedRunEval.enabled
            ? updateBestCompletionTime(prev.bestTimes, levelTimerKey, speedRunEval.elapsedMs).next
            : prev.bestTimes
        };
        if (cur.currentLevel.isDaily) {
          const streakSync = syncStreakWithShieldsOnCompletion(
            prev.daily,
            prev.streakShields,
            cur.currentLevel.dailyDateKey || getDailyDateKey(),
            starRes.stars
          );
          next.daily = streakSync.daily;
          next.streakShields = streakSync.streakShields;
        } else if (cur.currentLevel.isBonus) {
          const oldRec = prev.bonusStars[cur.currentLevel.id];
          const oldStars = typeof oldRec === 'object' ? oldRec.stars : typeof oldRec === 'number' ? oldRec : 0;
          const oldBonus = typeof oldRec === 'object' ? oldRec.bonusStar : false;
          next.bonusStars[cur.currentLevel.id] = {
            stars: Math.max(oldStars, starRes.stars),
            bonusStar: oldBonus || isBonusStar
          };
        } else if (cur.currentLevel.isSandbox || cur.currentLevel.isClassCode) {
          // Custom Sandbox & Classroom Code runs award bolts/telemetry without altering campaign stars
        } else {
          next.stars[cur.currentLevel.id] = Math.max(
            prev.stars[cur.currentLevel.id] || 0,
            starRes.stars
          );
          if (cur.currentLevel.id >= prev.unlockedLevel && cur.currentLevel.id < LEVELS.length) {
            next.unlockedLevel = cur.currentLevel.id + 1;
          }
        }
        saveActiveRosterProfile(next);
        return next;
      });

      window.setTimeout(() => {
        setMode('VICTORY');
        worldRef.current?.setMode('VICTORY');
        if (unlocks.shouldCelebrate) {
          triggerMilestoneCelebration(unlocks.newlyUnlockedFacts, unlocks.newlyUpgradedBadges);
        }
      }, 650);
    }
  }, [triggerMilestoneCelebration]);

  const handleSimProgress = useCallback((idx: number, ev: SimEvent) => {
    setActiveBlockId(ev.blockId);
    setActiveSimStepIdx(idx);
  }, []);

  const handleSimPauseChange = useCallback((isPaused: boolean, awaitingStep: boolean) => {
    setSimPaused(isPaused);
    setSimAwaitingStep(awaitingStep);
  }, []);

  const handleSimComplete = useCallback((res: SimResult) => {
    setActiveBlockId(null);
    setActiveSimResult(null);
    setActiveSimStepIdx(-1);
    setSimPaused(false);
    setSimAwaitingStep(false);
    setLastSimCrystals({ collected: res.collectedCrystals, total: res.totalCrystals });
    if (res.status === 'win') {
      setFailingBlockId(null);
      setLastFailedSim(null);
      setAdaptiveHintTier(0);
      setMoodCue({ mood: 'happy' });
      window.setTimeout(() => {
        setMoodCue(null);
        setMode('CIRCUIT_3D');
        worldRef.current?.setMode('CIRCUIT_3D');
      }, 850);
      return;
    }

    const lastEv = res.events[res.events.length - 1];
    setFailingBlockId(lastEv?.blockId || null);
    setLastFailedSim(res);
    hadPriorFailRef.current = true;
    setHadPriorFail(true);
    const nextFails = consecutiveFailsRef.current + 1;
    consecutiveFailsRef.current = nextFails;
    setConsecutiveFails(nextFails);

    const cur = stateRef.current;
    if (cur.save.adaptiveHintsEnabled !== false && nextFails >= 1) {
      const targetTier: AdaptiveHintTier = nextFails >= 3 ? 2 : 1;
      setAdaptiveHintTier((t) => (t < targetTier ? targetTier : t));
      setMaxHintTierUsed((m) => {
        const nextMax = Math.max(m, targetTier) as 0 | AdaptiveHintTier;
        maxHintTierRef.current = nextMax;
        return nextMax;
      });
    }

    setSave((prev) => {
      const next: SaveProfile = {
        ...prev,
        learningTelemetry: recordLevelAttemptResult(prev.learningTelemetry, {
          levelId: cur.currentLevel.id,
          won: false,
          hintTierUsed: maxHintTierRef.current,
          fixedPriorFail: false,
          failureKind: res.failCode
        })
      };
      saveActiveRosterProfile(next);
      return next;
    });

    if (res.failCode === 'empty' || res.failCode === 'empty_container' || res.failCode === 'short') {
      setMoodCue({ mood: 'confused' });
      setMode('CODE_3D');
    } else {
      const haz =
        res.failCode === 'gap'
          ? 'GAP'
          : res.failCode === 'mud'
            ? 'MUD'
            : res.failCode === 'ramp'
              ? 'RAMP'
              : undefined;
      setMoodCue({
        mood: 'sad',
        hazard: haz,
        part: res.missingPart || undefined
      });
      setMode('CODE_3D');
    }
  }, []);

  const handleActionFinish = useCallback((metrics: ActionDashMetrics) => {
    setActionMetrics(metrics);
    setSave((prev) => {
      const next: SaveProfile = {
        ...prev,
        totalBolts: prev.totalBolts + metrics.bolts,
        bestDashDistance: Math.max(prev.bestDashDistance || 0, Math.floor(metrics.distance))
      };
      saveActiveRosterProfile(next);
      return next;
    });
    setMode('VICTORY');
    worldRef.current?.setMode('VICTORY');
  }, []);

  const handlePlanetFinish = useCallback((metrics: PlanetAdventureMetrics) => {
    setPlanetMetrics(metrics);
    planetKeysRef.current.clear();
    const reward = computePlanetAdventureReward(metrics);
    if (reward.boltsEarned > 0) {
      setSave((prev) => {
        const next: SaveProfile = {
          ...prev,
          totalBolts: prev.totalBolts + reward.boltsEarned
        };
        saveActiveRosterProfile(next);
        return next;
      });
    }
    const won = metrics.status === 'won';
    setPlanetSummary({
      gameId: 'planet_adventure',
      title: 'Planet Expedition',
      score: reward.score,
      boltsEarned: reward.boltsEarned,
      won,
      detail: won
        ? `Collected ${metrics.coresCollected}/${metrics.totalCores} Energy Cores and escaped through the Exit Gate!`
        : `Collected ${metrics.coresCollected}/${metrics.totalCores} Energy Cores · ${metrics.boltsCollected} Bolts scavenged.`
    });
    setMode('VICTORY');
    worldRef.current?.setMode('VICTORY');
    setShowGameRoom(true);
  }, []);

  // Lazy-load and mount Three.js World ONCE so Title 2D overlay renders immediately
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let disposed = false;

    import('./three/worldScene')
      .then(({ UnifiedWorldController }) => {
        if (disposed || !mountRef.current) return;
        const ctrl = new UnifiedWorldController(mountRef.current, {
          onBotTap: (zone: RobotTouchZone) => {
            triggerRobotSpeech(pickTouchResponse(zone, touchCounterRef.current++));
          },
          onPaintPartPick: (part: PaintPartKey) => {
            SFX.uiTick();
            setSelectedPaintPart(part);
          },
          onInstallCelebrate: (part: PartId) => {
            triggerRobotSpeech(pickInstallResponse(part, installCounterRef.current++));
          },
          onInstallPhaseChange: (phase) => {
            setInstallPhase(phase);
          },
          onCircuitCellTap: (r, c) => handleCircuitCellTap(r, c),
          onSimProgress: (idx, ev) => handleSimProgress(idx, ev),
          onSimPauseChange: (isPaused, awaitingStep) => handleSimPauseChange(isPaused, awaitingStep),
          onSimComplete: (res) => handleSimComplete(res),
          onActionMetrics: (m) => setActionMetrics(m),
          onActionFinish: (m) => handleActionFinish(m),
          onPlanetMetrics: (m) => setPlanetMetrics(m),
          onPlanetFinish: (m) => handlePlanetFinish(m),
          onSlotScreenUpdate: (pts) => setSlotPoints(pts),
          onHeadScreenUpdate: (pt) => {
            const prev = lastHeadRef.current;
            if (
              !prev ||
              prev.visible !== pt.visible ||
              Math.abs(prev.x - pt.x) > 3 ||
              Math.abs(prev.y - pt.y) > 3
            ) {
              lastHeadRef.current = pt;
              setHeadPoint(pt);
            }
          },
          onWebglLost: (lost) => setWebglLost(lost)
        });
        worldRef.current = ctrl;

        const latest = stateRef.current;
        const initTheme = normalizeBotTheme(latest.save.botTheme);
        const initChar = normalizeBotCharacter(latest.save.botCharacter);
        const initPaint = normalizePaintConfig(latest.save.paintBooth, initTheme, initChar);
        ctrl.setLevel(latest.currentLevel);
        ctrl.setGentleSpeed(latest.save.gentleSpeed);
        ctrl.setLowGraphics(Boolean(latest.save.lowGraphics));
        ctrl.setBotTheme(initTheme);
        ctrl.setBotCharacter(initChar, false);
        ctrl.setPaintConfig(initPaint, null);
        ctrl.updateChassis(latest.chassis, null);

        const params = new URLSearchParams(window.location.search);
        if (latest.mode === 'TITLE' && params.get('autostart') === '1') {
          setMode('BUILD_3D');
          setGhostHelp(latest.currentLevel.id === 1 && !latest.save.tutorialDone);
          ctrl.setMode('BUILD_3D');
        } else {
          ctrl.setMode(latest.mode);
          if (latest.mode === 'CIRCUIT_3D') {
            ctrl.setCircuitGrid(latest.circuitGrid);
          }
        }
      })
      .catch(() => {
        if (!disposed) setWebglLost(true);
      });

    return () => {
      disposed = true;
      worldRef.current?.dispose();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts({
    mode,
    paused,
    showMap,
    showProfile,
    showSettings,
    showGameRoom,
    showParentDashboard,
    showSandbox,
    showClassCode,
    currentLevel,
    worldRef,
    planetKeysRef,
    beginLevel,
    setShowParentDashboard,
    setShowSandbox,
    setShowClassCode,
    setShowGameRoom,
    setShowProfile,
    setShowSettings,
    setShowMap,
    setWorkshopAutoSpin,
    setMode,
    setPaused
  });

  const handlePlacePart = (part: PartId, r: number, c: number) => {
    const check = canPlacePartInSlot(chassis, currentLevel.budget, part, r, c);
    if (!check.ok) {
      SFX.chirpConfused();
      worldRef.current?.setMood('confused', 1.4);
      setMoodCue({ mood: 'confused', part });
      return;
    }
    const next = cloneChassis(chassis);
    // Keep one drive base active cleanly if placing wheels or treads
    if (part === 'wheels' || part === 'treads') {
      for (let rr = 0; rr < 3; rr++) {
        for (let cc = 0; cc < 3; cc++) {
          if (next[rr][cc] === 'wheels' || next[rr][cc] === 'treads') {
            next[rr][cc] = null;
          }
        }
      }
    }
    next[r][c] = part;
    setChassis(next);
    setLastPlacement({ id: ++placementIdRef.current, part, r, c });
    setMoodCue(null);
    const soundProfile = getPartPlacementSoundProfile(part);
    SFX.placePart(part);
    window.setTimeout(() => SFX.placePartFollowUp(part), soundProfile.followUpDelayMs);
    worldRef.current?.updateChassis(next, null, [r, c], part);
  };

  const handleRemoveSlot = (r: number, c: number) => {
    if (!chassis[r][c]) return;
    const next = cloneChassis(chassis);
    next[r][c] = null;
    setChassis(next);
    SFX.click();
    worldRef.current?.updateChassis(next, null);
  };

  const handleRunProgram = () => {
    setMoodCue(null);
    setLastCodeFeedbackTier(null);
    const sim = simulateProgram(currentLevel, chassis, program);
    setActiveSimResult(sim);
    setActiveSimStepIdx(sim.events.length > 0 ? 0 : -1);
    setSimPaused(false);
    setSimAwaitingStep(false);
    setMode('SIMULATING');
    worldRef.current?.playSimulation(sim, { stepMode: false });
  };

  const handleStepProgram = () => {
    SFX.uiTick();
    setMoodCue(null);
    setLastCodeFeedbackTier(null);
    setSave((prev) => {
      const tel = normalizeLearningTelemetry(prev.learningTelemetry);
      const next: SaveProfile = {
        ...prev,
        learningTelemetry: {
          ...tel,
          stepDebugRuns: tel.stepDebugRuns + 1
        }
      };
      saveActiveRosterProfile(next);
      return next;
    });
    const sim = simulateProgram(currentLevel, chassis, program);
    setActiveSimResult(sim);
    setActiveSimStepIdx(sim.events.length > 0 ? 0 : -1);
    setSimPaused(false);
    setSimAwaitingStep(false);
    setMode('SIMULATING');
    worldRef.current?.playSimulation(sim, { stepMode: true });
  };

  const handleToggleSimPause = () => {
    SFX.uiTick();
    if (simPaused) {
      worldRef.current?.resumeSimulation();
    } else {
      worldRef.current?.pauseSimulation();
    }
  };

  const handleNextSimStep = () => {
    SFX.uiTick();
    worldRef.current?.advanceSimulationStep();
  };

  const handleStopSim = () => {
    SFX.click();
    worldRef.current?.stopSimulation();
    setActiveBlockId(null);
    setActiveSimResult(null);
    setActiveSimStepIdx(-1);
    setSimPaused(false);
    setSimAwaitingStep(false);
    setMode('CODE_3D');
  };

  const handleStartEndlessDash = () => {
    SFX.boost();
    const dashChassis = ensureActionDashChassis(chassis);
    setChassis(dashChassis);
    worldRef.current?.updateChassis(dashChassis, null);
    worldRef.current?.startActionDash(true, save.gentleSpeed);
    setMode('ACTION_RUN_3D');
  };

  const handlePlayGateDash = () => {
    SFX.boost();
    setShowGameRoom(false);
    const dashChassis = ensureActionDashChassis(chassis);
    setChassis(dashChassis);
    worldRef.current?.updateChassis(dashChassis, null);
    worldRef.current?.startActionDash(false, save.gentleSpeed);
    setMode('ACTION_RUN_3D');
  };

  const handlePlayPlanetAdventure = () => {
    SFX.boost();
    setPlanetSummary(null);
    setShowGameRoom(false);
    planetKeysRef.current.clear();
    worldRef.current?.updateChassis(chassis, null);
    worldRef.current?.startPlanetAdventure(save.gentleSpeed);
    setMode('PLANET_ADVENTURE_3D');
  };

  const handleAwardArcadeBolts = useCallback((bolts: number) => {
    const safeBolts = Math.max(0, Math.floor(bolts));
    if (safeBolts <= 0) return;
    setSave((prev) => {
      const next: SaveProfile = {
        ...prev,
        totalBolts: prev.totalBolts + safeBolts
      };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !save.muted;
    SFX.applySettings(nextMuted, normalizedAudio);
    SPEECH.applySettings(nextMuted, normalizedAudio.voiceVolume);
    if (!nextMuted) SFX.click();
    setSave((prev) => {
      const next = { ...prev, muted: nextMuted };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleChangeAudio = (partial: Partial<AudioSettings>) => {
    setSave((prev) => {
      const merged = normalizeAudioSettings({
        ...normalizeAudioSettings(prev.audio),
        ...partial
      });
      SFX.applySettings(prev.muted, merged);
      SPEECH.applySettings(prev.muted, merged.voiceVolume);
      const next: SaveProfile = { ...prev, audio: merged };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleSpeed = () => {
    setSave((prev) => {
      const next = { ...prev, gentleSpeed: !prev.gentleSpeed };
      worldRef.current?.setGentleSpeed(next.gentleSpeed);
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleLowGraphics = () => {
    SFX.uiTick();
    setSave((prev) => {
      const nextLow = !Boolean(prev.lowGraphics);
      const next: SaveProfile = { ...prev, lowGraphics: nextLow };
      worldRef.current?.setLowGraphics(nextLow);
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleAdaptiveHints = () => {
    SFX.uiTick();
    setSave((prev) => {
      const nextEnabled = prev.adaptiveHintsEnabled === false;
      const next: SaveProfile = { ...prev, adaptiveHintsEnabled: nextEnabled };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleReadAloud = () => {
    SFX.uiTick();
    setSave((prev) => {
      const nextEnabled = !Boolean(prev.readAloudEnabled);
      SPEECH.setEnabled(nextEnabled);
      const next: SaveProfile = { ...prev, readAloudEnabled: nextEnabled };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleChallengeTimer = () => {
    SFX.uiTick();
    const nextEnabled = !challengeTimerEnabled;
    if (nextEnabled && mode !== 'VICTORY') {
      resetTimer();
    }
    if (!nextEnabled) {
      setLastVictorySpeedRun(null);
    }
    setSave((prev) => {
      const next: SaveProfile = { ...prev, challengeTimerEnabled: nextEnabled };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleChangeBotTheme = (theme: BotThemeId) => {
    const nextTheme = normalizeBotTheme(theme);
    const themeDef = BOT_THEMES[nextTheme];
    const bodyHex = `#${themeDef.bodyHex.toString(16).padStart(6, '0')}`;
    SFX.paintSpray();
    worldRef.current?.setBotTheme(nextTheme, true);
    triggerRobotSpeech(pickPaintResponse(nextTheme, paintCounterRef.current++));
    setSave((prev) => {
      const charId = normalizeBotCharacter(prev.botCharacter);
      const curPaint = normalizePaintConfig(prev.paintBooth, nextTheme, charId);
      const syncedPaint = setPartPaint(curPaint, 'chassis', { color: bodyHex });
      const next: SaveProfile = { ...prev, botTheme: nextTheme, paintBooth: syncedPaint };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleSelectCharacter = (charId: BotCharacterId) => {
    const normChar = normalizeBotCharacter(charId);
    const def = BOT_CHARACTERS[normChar];
    SFX.installComplete();
    worldRef.current?.setBotCharacter(normChar, true);
    setSave((prev) => {
      const nextTheme = normalizeBotTheme(prev.botTheme);
      const curPaint = normalizePaintConfig(prev.paintBooth, nextTheme, normChar);
      const nextPaint = setPartPaint(
        setPartPaint(
          setPartPaint(curPaint, 'chassis', { color: def.defaultBodyHex }),
          'head',
          { color: def.defaultHeadHex }
        ),
        'arms',
        { color: def.defaultAccentHex }
      );
      const next: SaveProfile = { ...prev, botCharacter: normChar, paintBooth: nextPaint };
      saveActiveRosterProfile(next);
      return next;
    });
    triggerRobotSpeech(
      pickCharacterSwitchResponse(def.greeting, def.voicePitch, def.accentCss)
    );
  };

  const handleRenameProfile = useCallback(
    (nextName: string): { ok: boolean; error: string | null } => {
      const check = validateProfileName(nextName);
      if (!check.valid) {
        SFX.chirpConfused();
        return { ok: false, error: check.error };
      }
      SFX.installComplete();
      setSave((prev) => {
        const res = renameSaveProfile(prev, nextName);
        if (!res.ok) return prev;
        saveActiveRosterProfile(res.save);
        return res.save;
      });
      return { ok: true, error: null };
    },
    []
  );

  const handleUpdatePartPaint = (
    part: PaintPartKey,
    patch: Partial<PartPaintSpec>,
    announce = true
  ) => {
    if (announce) SFX.paintSpray();
    const appliedDecalLabel =
      patch.decal !== undefined && patch.decal !== 'none' ? DECAL_LABELS[patch.decal] : undefined;
    const optimisticPaint = setPartPaint(activePaintConfig, part, patch);
    worldRef.current?.setPaintConfig(optimisticPaint, announce ? part : null);
    setSave((prev) => {
      const theme = normalizeBotTheme(prev.botTheme);
      const charId = normalizeBotCharacter(prev.botCharacter);
      const curPaint = normalizePaintConfig(prev.paintBooth, theme, charId);
      const nextPaint = setPartPaint(curPaint, part, patch);
      const next: SaveProfile = { ...prev, paintBooth: nextPaint };
      saveActiveRosterProfile(next);
      return next;
    });
    if (announce) {
      triggerRobotSpeech(
        pickCustomPaintResponse(
          PAINT_PART_LABELS[part],
          appliedDecalLabel ?? '',
          paintCounterRef.current++,
          optimisticPaint.parts[part]?.color
        )
      );
    }
  };

  const handleSavePaintTheme = (name: string) => {
    SFX.installComplete();
    setSave((prev) => {
      const theme = normalizeBotTheme(prev.botTheme);
      const charId = normalizeBotCharacter(prev.botCharacter);
      const curPaint = normalizePaintConfig(prev.paintBooth, theme, charId);
      const nextThemes = upsertSavedPaintTheme(
        normalizeSavedPaintThemes(prev.savedPaintThemes),
        name,
        curPaint,
        charId
      );
      const next: SaveProfile = { ...prev, savedPaintThemes: nextThemes };
      saveActiveRosterProfile(next);
      return next;
    });
    const def = BOT_CHARACTERS[activeCharacter];
    triggerRobotSpeech(pickThemeSaveResponse(def.voicePitch, def.accentCss));
  };

  const handleApplySavedTheme = (savedTheme: SavedPaintTheme) => {
    SFX.paintSpray();
    const nextPaint: PaintBoothConfig = normalizePaintConfig(savedTheme.config);
    worldRef.current?.setPaintConfig(nextPaint, 'chassis');
    setSave((prev) => {
      const next: SaveProfile = { ...prev, paintBooth: nextPaint };
      saveActiveRosterProfile(next);
      return next;
    });
    const def = BOT_CHARACTERS[activeCharacter];
    triggerRobotSpeech(
      pickThemeEquipResponse(def.voicePitch, nextPaint.parts.chassis?.color || def.accentCss)
    );
  };

  const handleDeleteSavedTheme = (id: string) => {
    SFX.click();
    setSave((prev) => {
      const nextThemes = deleteSavedPaintTheme(normalizeSavedPaintThemes(prev.savedPaintThemes), id);
      const next: SaveProfile = { ...prev, savedPaintThemes: nextThemes };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleResetPaintConfig = () => {
    SFX.paintSpray();
    const fresh = createDefaultPaintConfig(normalizeBotTheme(save.botTheme), activeCharacter);
    worldRef.current?.setPaintConfig(fresh, 'chassis');
    setSave((prev) => {
      const theme = normalizeBotTheme(prev.botTheme);
      const charId = normalizeBotCharacter(prev.botCharacter);
      const nextFresh = createDefaultPaintConfig(theme, charId);
      const next: SaveProfile = { ...prev, paintBooth: nextFresh };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const applyLoadedSlotSave = useCallback(
    (nextSave: SaveProfile, nextRoster: ProfileRosterState) => {
      SPEECH.stop();
      setRoster(nextRoster);
      setSave(nextSave);
      const targetLvl =
        getLevelById(Math.min(LEVELS.length, Math.max(1, nextSave.unlockedLevel || 1))) ||
        LEVELS[0];
      const nextTheme = normalizeBotTheme(nextSave.botTheme);
      const nextChar = normalizeBotCharacter(nextSave.botCharacter);
      const nextPaint = normalizePaintConfig(nextSave.paintBooth, nextTheme, nextChar);
      worldRef.current?.setBotTheme(nextTheme, false);
      worldRef.current?.setBotCharacter(nextChar, false);
      worldRef.current?.setPaintConfig(nextPaint, null);
      worldRef.current?.setGentleSpeed(nextSave.gentleSpeed);
      worldRef.current?.setLowGraphics(Boolean(nextSave.lowGraphics));
      beginLevel(targetLvl);
      setMode('TITLE');
      worldRef.current?.setMode('TITLE');
    },
    [beginLevel]
  );

  const handleSwitchRosterSlot = useCallback(
    (slotId: string) => {
      const res = switchRosterSlot(slotId);
      if (!res.ok) {
        SFX.chirpConfused();
        return;
      }
      SFX.installComplete();
      applyLoadedSlotSave(res.save, res.roster);
    },
    [applyLoadedSlotSave]
  );

  const handleCreateRosterSlot = useCallback(
    (name: string, botCharacter: BotCharacterId): { ok: boolean; error: string | null } => {
      const res = createRosterSlot(name, botCharacter);
      if (!res.ok) {
        SFX.chirpConfused();
        return { ok: false, error: res.error };
      }
      SFX.installComplete();
      applyLoadedSlotSave(res.save, res.roster);
      return { ok: true, error: null };
    },
    [applyLoadedSlotSave]
  );

  const handleDeleteRosterSlot = useCallback(
    (slotId: string): { ok: boolean; error: string | null } => {
      const res = deleteRosterSlot(slotId);
      if (!res.ok) {
        SFX.chirpConfused();
        return { ok: false, error: res.error };
      }
      SFX.click();
      applyLoadedSlotSave(res.save, res.roster);
      return { ok: true, error: null };
    },
    [applyLoadedSlotSave]
  );

  const handleSaveSandboxDraft = useCallback(
    (draft: SandboxMissionDraft, addToSavedSlot = false) => {
      const normDraft = normalizeSandboxDraft(draft);
      setSave((prev) => {
        const prevSaved = Array.isArray(prev.sandbox?.savedLevels)
          ? prev.sandbox.savedLevels.map((d) => normalizeSandboxDraft(d))
          : [];
        let nextSaved = prevSaved;
        if (addToSavedSlot) {
          const idx = prevSaved.findIndex((item) => item.id === normDraft.id);
          if (idx >= 0) {
            nextSaved = prevSaved.map((item, i) => (i === idx ? normDraft : item));
          } else {
            nextSaved = [normDraft, ...prevSaved].slice(0, SANDBOX_MAX_SAVED);
          }
        }
        const next: SaveProfile = {
          ...prev,
          sandbox: {
            name: normDraft.name,
            budget: normDraft.budget,
            parBudget: normDraft.parBudget,
            parBlocks: normDraft.parBlocks,
            loopUnlocked: normDraft.loopUnlocked,
            ifUnlocked: normDraft.ifUnlocked,
            track: normDraft.track,
            circuit: normDraft.circuit,
            savedLevels: nextSaved
          }
        };
        saveActiveRosterProfile(next);
        return next;
      });
    },
    []
  );

  const handleDeleteSavedSandbox = useCallback((id: string) => {
    SFX.click();
    setSave((prev) => {
      const prevSaved = Array.isArray(prev.sandbox?.savedLevels)
        ? prev.sandbox.savedLevels
        : [];
      const curSandbox = normalizeSandboxDraft(prev.sandbox || createDefaultSandboxDraft());
      const next: SaveProfile = {
        ...prev,
        sandbox: {
          name: curSandbox.name,
          budget: curSandbox.budget,
          parBudget: curSandbox.parBudget,
          parBlocks: curSandbox.parBlocks,
          loopUnlocked: curSandbox.loopUnlocked,
          ifUnlocked: curSandbox.ifUnlocked,
          track: curSandbox.track,
          circuit: curSandbox.circuit,
          savedLevels: prevSaved.filter((item) => item.id !== id)
        }
      };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleTestSandboxDraft = useCallback(
    (draft: SandboxMissionDraft) => {
      SFX.boost();
      handleSaveSandboxDraft(draft, false);
      setShowSandbox(false);
      beginLevel(sandboxDraftToLevelDef(draft));
    },
    [beginLevel, handleSaveSandboxDraft]
  );

  const handlePlayClassCode = useCallback(
    (draft: SandboxMissionDraft) => {
      SFX.boost();
      setShowClassCode(false);
      beginLevel(sandboxDraftToLevelDef(draft, { isClassCode: true }));
    },
    [beginLevel]
  );

  const handleSaveClassCodeToSandbox = useCallback(
    (draft: SandboxMissionDraft) => {
      SFX.installComplete();
      handleSaveSandboxDraft(draft, true);
    },
    [handleSaveSandboxDraft]
  );

  const handleEnterPaintBooth = () => {
    SFX.click();
    setShowProfile(false);
    setSelectedPart(null);
    setMoodCue(null);
    setInspect3D(false);
    setWorkshopAutoSpin(false);
    worldRef.current?.setWorkshopAutoSpin(false);
    setMode('PAINT_BOOTH');
    worldRef.current?.setMode('PAINT_BOOTH');
  };

  const handleExitPaintBooth = () => {
    SFX.click();
    setWorkshopAutoSpin(false);
    worldRef.current?.setWorkshopAutoSpin(false);
    setMode('BUILD_3D');
    worldRef.current?.setMode('BUILD_3D');
  };

  const handleTalkToBot = () => {
    const zones: RobotTouchZone[] = ['head', 'body'];
    const zone = zones[touchCounterRef.current % zones.length];
    worldRef.current?.triggerTouchReaction(zone);
    triggerRobotSpeech(pickTouchResponse(zone, touchCounterRef.current++));
  };

  const activeStreak = getActiveDailyStreak(save.daily, getDailyDateKey());
  const trophyTiers = useMemo(
    () => computeAcademySkillBadges(save.skillStats).reduce((s, b) => s + b.tier, 0),
    [save.skillStats]
  );

  const triggerGhostPreview = useCallback(() => {
    const phase =
      mode === 'BUILD_3D'
        ? 'build'
        : mode === 'CODE_3D'
          ? 'code'
          : mode === 'CIRCUIT_3D'
            ? 'circuit'
            : null;
    if (!phase) return;
    const plan = computeGhostPreviewPlan(currentLevel, phase, chassis, program, circuitGrid);
    if (plan) {
      setGhostHelp(true);
      worldRef.current?.playGhostPreview(plan);
    }
  }, [chassis, circuitGrid, currentLevel, mode, program]);

  const handleRequestHint = useCallback(() => {
    SFX.uiTick();
    const nextTier = (
      adaptiveHintTier === 0 ? 1 : Math.min(3, adaptiveHintTier + 1)
    ) as AdaptiveHintTier;
    setAdaptiveHintTier(nextTier);
    setMaxHintTierUsed((prev) => {
      const maxT = Math.max(prev, nextTier) as 0 | AdaptiveHintTier;
      maxHintTierRef.current = maxT;
      return maxT;
    });
    if (nextTier === 3 && (mode === 'BUILD_3D' || mode === 'CIRCUIT_3D')) {
      triggerGhostPreview();
    }
  }, [adaptiveHintTier, mode, triggerGhostPreview]);

  const handleApplyParsons = useCallback((template: ParsonsStarterTemplate) => {
    SFX.installComplete();
    setProgram(template.blocks);
    setFailingBlockId(null);
    setMoodCue(null);
  }, []);

  const handleEducationalMiniGameProgress = useCallback(
    (info: {
      gameId: ArcadeGameId;
      won: boolean;
      perfectFixes?: number;
      gatesSolved?: number;
    }) => {
      const prev = stateRef.current.save;
      const tel = normalizeLearningTelemetry(prev.learningTelemetry);
      const nextSkills = {
        chassisBuilds: 0,
        jumpsCleared: 0,
        mudCleared: 0,
        loopsCompressed: 0,
        sensorsUsed: 0,
        circuitsSolved: 0,
        ...(prev.skillStats || {})
      };
      const candidateFacts: StemFactCardDef[] = [];

      if (info.gameId === 'bug_detective') {
        tel.miniGames.bugDetectivePlayed += 1;
        if (info.won) {
          tel.miniGames.bugDetectiveWon += 1;
          nextSkills.bugsDebugged = (nextSkills.bugsDebugged || 0) + 1;
          const fact = getFactCardById('debugging_mindset');
          if (fact) candidateFacts.push(fact);
        }
        if (info.perfectFixes) {
          tel.miniGames.bugDetectivePerfect += info.perfectFixes;
        }
      } else if (info.gameId === 'logic_gate_lab') {
        tel.miniGames.logicLabPlayed += 1;
        if (info.won) {
          tel.miniGames.logicLabWon += 1;
          const fact = getFactCardById('digital_logic_gates');
          if (fact) candidateFacts.push(fact);
        }
        const solvedCount = info.gatesSolved ?? (info.won ? 1 : 0);
        tel.miniGames.logicGatesSolved += solvedCount;
        nextSkills.logicGatesSolved = (nextSkills.logicGatesSolved || 0) + solvedCount;
      }

      const unlocks = detectLearningMilestoneUnlocks({
        prevSkillStats: prev.skillStats,
        nextSkillStats: nextSkills,
        prevUnlockedFactIds: prev.unlockedFactIds,
        candidateFacts
      });

      const mergedFacts = Array.from(
        new Set([
          ...(prev.unlockedFactIds || []),
          ...unlocks.newlyUnlockedFacts.map((f) => f.id)
        ])
      );
      const next: SaveProfile = {
        ...prev,
        skillStats: nextSkills,
        unlockedFactIds: mergedFacts,
        learningTelemetry: tel
      };
      stateRef.current = { ...stateRef.current, save: next };
      saveActiveRosterProfile(next);
      setSave(next);

      if (unlocks.shouldCelebrate) {
        if (unlocks.newlyUpgradedBadges.length > 0) {
          setUpgradedPillars(unlocks.newlyUpgradedBadges.map((b) => b.id));
        }
        if (unlocks.newlyUnlockedFacts.length > 0) {
          setNewlyUnlockedFacts(unlocks.newlyUnlockedFacts);
        }
        triggerMilestoneCelebration(unlocks.newlyUnlockedFacts, unlocks.newlyUpgradedBadges);
      }
    },
    [triggerMilestoneCelebration]
  );

  const totalStarsEarned = useMemo(() => computeTotalStarsEarned(save), [save]);

  const workshopCameraControls = useMemo<WorkshopCameraControls>(
    () => ({
      autoSpin: workshopAutoSpin,
      onRotateLeft: () => {
        SFX.orbitNudge();
        setWorkshopAutoSpin(false);
        worldRef.current?.setWorkshopAutoSpin(false);
        worldRef.current?.rotateWorkshopBy(-Math.PI / 4);
      },
      onRotateRight: () => {
        SFX.orbitNudge();
        setWorkshopAutoSpin(false);
        worldRef.current?.setWorkshopAutoSpin(false);
        worldRef.current?.rotateWorkshopBy(Math.PI / 4);
      },
      onToggleAutoSpin: () => {
        SFX.uiTick();
        setWorkshopAutoSpin((prev) => {
          const next = !prev;
          worldRef.current?.setWorkshopAutoSpin(next);
          return next;
        });
      },
      onZoomIn: () => {
        SFX.orbitNudge();
        worldRef.current?.zoomWorkshopBy(-0.9);
      },
      onZoomOut: () => {
        SFX.orbitNudge();
        worldRef.current?.zoomWorkshopBy(0.9);
      },
      onResetView: () => {
        SFX.uiTick();
        setWorkshopAutoSpin(false);
        worldRef.current?.setWorkshopAutoSpin(false);
        worldRef.current?.resetWorkshopView();
      }
    }),
    [workshopAutoSpin]
  );

  const chassisInfo = useMemo(() => computeChassisInfo(chassis), [chassis]);
  const tutorialStep = useMemo(() => {
    const phase =
      mode === 'BUILD_3D'
        ? 'build'
        : mode === 'CODE_3D'
          ? 'code'
          : mode === 'CIRCUIT_3D'
            ? 'circuit'
            : 'build';
    return getTutorialStep(currentLevel, phase, chassis, program, circuitGrid, selectedPart);
  }, [chassis, circuitGrid, currentLevel, mode, program, selectedPart]);

  const blockCount = useMemo(() => countBlocks(program), [program]);
  const victoryBonusInfo = useMemo(
    () =>
      validateBonusStarConditions(
        currentLevel,
        chassisInfo.cost,
        blockCount,
        lastSimCrystals.collected,
        lastSimCrystals.total
      ),
    [blockCount, chassisInfo.cost, currentLevel, lastSimCrystals.collected, lastSimCrystals.total]
  );
  const victoryStars = useMemo(
    () =>
      calculateStars(
        currentLevel,
        chassisInfo.cost,
        blockCount,
        lastSimCrystals.collected,
        lastSimCrystals.total
      ).stars,
    [blockCount, chassisInfo.cost, currentLevel, lastSimCrystals.collected, lastSimCrystals.total]
  );

  const nextLevelDef = useMemo(() => {
    if (currentLevel.isDaily) return null;
    return getLevelById(currentLevel.id + 1);
  }, [currentLevel]);

  const currentLevelSavedStars = getLevelSavedStars(save, currentLevel);
  const currentAdaptiveHint = useMemo(() => {
    if (adaptiveHintTier === 0) return null;
    if (mode !== 'BUILD_3D' && mode !== 'CODE_3D' && mode !== 'CIRCUIT_3D') return null;
    const phase = mode === 'BUILD_3D' ? 'build' : mode === 'CIRCUIT_3D' ? 'circuit' : 'code';
    return computeAdaptiveHint({
      level: currentLevel,
      phase,
      chassis,
      program,
      circuitGrid,
      tier: adaptiveHintTier,
      lastSimResult: lastFailedSim,
      failingBlockId
    });
  }, [
    adaptiveHintTier,
    chassis,
    circuitGrid,
    currentLevel,
    failingBlockId,
    lastFailedSim,
    mode,
    program
  ]);

  const adaptiveHintElement = currentAdaptiveHint ? (
    <AdaptiveHintBanner
      hint={currentAdaptiveHint}
      isGentleRetry={consecutiveFails > 0}
      autoReadAloud={Boolean(save.readAloudEnabled)}
      onEscalateTier={handleRequestHint}
      onOpenDemo={(topic, condition) => {
        SFX.click();
        setActiveDemo({ topic, condition });
      }}
      onStepByStep={() => handleStepProgram()}
      onApplyParsons={handleApplyParsons}
      onPlayGhostPreview={() => {
        SFX.click();
        triggerGhostPreview();
      }}
      onDismiss={() => {
        SFX.uiTick();
        setAdaptiveHintTier(0);
      }}
    />
  ) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1222]">
      {/* Dedicated Isolated WebGL Canvas Mount */}
      <div ref={mountRef} className="webgl-canvas-mount fixed inset-0 z-0" aria-hidden="true" />

      {/* Title Screen Overlay */}
      {mode === 'TITLE' && (
        <TitleOverlay
          nextLevelId={Math.min(LEVELS.length, Math.max(1, save.unlockedLevel || 1))}
          activeCharacter={activeCharacter}
          profileName={activeProfileName}
          totalStars={totalStarsEarned}
          totalBolts={save.totalBolts}
          streak={activeStreak}
          dailyStars={save.daily.dateKey === getDailyDateKey() ? save.daily.stars : 0}
          trophyTiers={trophyTiers}
          muted={save.muted}
          gentleSpeed={save.gentleSpeed}
          onStartMission={() => {
            SFX.click();
            beginLevel(currentLevel);
          }}
          onStartDaily={() => {
            SFX.click();
            beginLevel(generateDailyChallenge(getDailyDateKey()));
          }}
          onStartActionDash={handleStartEndlessDash}
          onOpenLevelMap={() => {
            SFX.click();
            setShowMap(true);
          }}
          onOpenSandbox={() => {
            SFX.click();
            setShowSandbox(true);
          }}
          onOpenClassCode={() => {
            SFX.click();
            setShowClassCode(true);
          }}
          onOpenTrophies={() => {
            SFX.click();
            setShowTrophies(true);
          }}
          onOpenSettings={() => {
            SFX.click();
            setShowSettings(true);
          }}
          onOpenProfile={() => {
            SFX.click();
            setShowProfile(true);
          }}
          onToggleMute={handleToggleMute}
          onToggleSpeed={handleToggleSpeed}
        />
      )}

      {/* Top Gameplay Icon HUD */}
      {mode !== 'TITLE' && (
        <TopHud
          levelId={currentLevel.id}
          activeCharacter={activeCharacter}
          profileName={activeProfileName}
          isDaily={currentLevel.isDaily}
          isBonus={currentLevel.isBonus}
          starsEarned={currentLevelSavedStars}
          mode={mode}
          canCode={chassisInfo.hasDrive && chassisInfo.hasFrontLaser}
          muted={save.muted}
          ghostHelp={ghostHelp}
          moodCue={moodCue}
          challengeTimerEnabled={challengeTimerEnabled}
          elapsedMs={levelElapsedMs}
          timeTargets={currentTimeTargets}
          timerPaused={challengeTimerEnabled && !isChallengeTimerRunning && mode !== 'VICTORY'}
          bestTimeMs={currentLevelBestMs}
          onToggleChallengeTimer={handleToggleChallengeTimer}
          onGoHome={() => {
            SFX.click();
            setPaused(false);
            setWorkshopAutoSpin(false);
            setInspect3D(false);
            worldRef.current?.setWorkshopAutoSpin(false);
            setMode('TITLE');
            worldRef.current?.setMode('TITLE');
          }}
          onOpenMap={() => {
            SFX.click();
            setShowMap(true);
          }}
          onOpenProfile={() => {
            SFX.click();
            setShowProfile(true);
          }}
          onSwitchPhase={(target) => {
            SFX.click();
            setMoodCue(null);
            setAdaptiveHintTier(0);
            if (target !== 'BUILD_3D') {
              setWorkshopAutoSpin(false);
              setInspect3D(false);
              worldRef.current?.setWorkshopAutoSpin(false);
            }
            setMode(target);
            worldRef.current?.setMode(target);
          }}
          onToggleGhost={() => {
            SFX.click();
            const nextGhost = !ghostHelp;
            setGhostHelp(nextGhost);
            if (nextGhost) {
              triggerGhostPreview();
            } else {
              worldRef.current?.clearGhostPreview();
            }
          }}
          onReset={() => {
            SFX.click();
            if (mode === 'ACTION_RUN_3D') {
              handlePlayGateDash();
            } else if (mode === 'PLANET_ADVENTURE_3D') {
              handlePlayPlanetAdventure();
            } else {
              beginLevel(currentLevel);
            }
          }}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => {
            SFX.click();
            setShowSettings(true);
          }}
          onPause={() => {
            SFX.click();
            setPaused(true);
          }}
          onPlayGhostFix={triggerGhostPreview}
        />
      )}

      {/* Stage 1: 3D Workshop Drag & Drop */}
      {mode === 'BUILD_3D' && (
        <BuildDock
          level={currentLevel}
          chassis={chassis}
          budget={currentLevel.budget}
          slotPoints={slotPoints}
          selectedPart={selectedPart}
          botTheme={normalizeBotTheme(save.botTheme)}
          activeCharacter={activeCharacter}
          tutorialStep={tutorialStep}
          ghostHelp={ghostHelp}
          camera={workshopCameraControls}
          inspectMode={inspect3D}
          lowGraphics={lowGraphics}
          installPhase={installPhase}
          lastPlacement={lastPlacement}
          hintBanner={mode === 'BUILD_3D' ? adaptiveHintElement : null}
          onSelectPart={(p) => {
            SFX.click();
            setSelectedPart(p);
          }}
          onChangeBotTheme={handleChangeBotTheme}
          onHoverSlot={(hover) => worldRef.current?.updateChassis(chassis, hover)}
          onPlacePart={handlePlacePart}
          onRemoveSlot={handleRemoveSlot}
          onProceedToCode={() => {
            SFX.click();
            setSelectedPart(null);
            setMoodCue(null);
            setAdaptiveHintTier(0);
            setWorkshopAutoSpin(false);
            setInspect3D(false);
            worldRef.current?.setWorkshopAutoSpin(false);
            setMode('CODE_3D');
            worldRef.current?.setMode('CODE_3D');
          }}
          onOpenPaintBooth={handleEnterPaintBooth}
          onOpenProfile={() => {
            SFX.click();
            setShowProfile(true);
          }}
          onToggleInspect={() => {
            SFX.uiTick();
            setInspect3D((v) => !v);
          }}
          onTalkToBot={handleTalkToBot}
          onOpenDemo={(topic) => {
            SFX.click();
            setActiveDemo({ topic });
          }}
          onRequestHint={handleRequestHint}
        />
      )}

      {/* Dedicated Workshop Paint Booth Mode */}
      {mode === 'PAINT_BOOTH' && (
        <PaintBoothDock
          chassis={chassis}
          activeCharacter={activeCharacter}
          paintConfig={activePaintConfig}
          selectedPart={selectedPaintPart}
          savedThemes={savedPaintThemes}
          camera={workshopCameraControls}
          onSelectPart={(part) => {
            SFX.uiTick();
            setSelectedPaintPart(part);
          }}
          onUpdatePartPaint={handleUpdatePartPaint}
          onSaveTheme={handleSavePaintTheme}
          onApplySavedTheme={handleApplySavedTheme}
          onDeleteSavedTheme={handleDeleteSavedTheme}
          onResetPaint={handleResetPaintConfig}
          onOpenProfile={() => {
            SFX.click();
            setShowProfile(true);
          }}
          onExit={handleExitPaintBooth}
        />
      )}

      {/* Stage 2: 3D Track Visual Coding */}
      {(mode === 'CODE_3D' || mode === 'SIMULATING') && (
        <CodeDock
          program={program}
          parBlocks={currentLevel.parBlocks}
          loopUnlocked={currentLevel.loopUnlocked}
          ifUnlocked={Boolean(currentLevel.ifUnlocked || currentLevel.loopUnlocked)}
          activeBlockId={activeBlockId}
          simulating={mode === 'SIMULATING'}
          simPaused={simPaused}
          simAwaitingStep={simAwaitingStep}
          stepInspection={
            mode === 'SIMULATING' && activeSimResult && activeSimStepIdx >= 0
              ? buildStepInspection(currentLevel, chassis, activeSimResult, activeSimStepIdx)
              : null
          }
          tutorialStep={tutorialStep}
          ghostHelp={ghostHelp}
          lastFeedbackTier={lastCodeFeedbackTier}
          failingBlockId={failingBlockId}
          hintBanner={mode === 'CODE_3D' ? adaptiveHintElement : null}
          onBlockPlaced={handleCodeBlockPlaced}
          onChangeProgram={(next) => {
            SFX.click();
            setMoodCue(null);
            setFailingBlockId(null);
            setProgram(next);
          }}
          onRunProgram={handleRunProgram}
          onStepProgram={handleStepProgram}
          onToggleSimPause={handleToggleSimPause}
          onNextSimStep={handleNextSimStep}
          onStopSim={handleStopSim}
          onRequestHint={handleRequestHint}
          onOpenDemo={(topic, condition) => {
            SFX.click();
            setActiveDemo({ topic, condition });
          }}
        />
      )}

      {/* Stage 3: 3D Laser Gate Circuit */}
      {mode === 'CIRCUIT_3D' && (
        <CircuitOverlay
          circuitGrid={circuitGrid}
          tutorialStep={tutorialStep}
          ghostHelp={ghostHelp}
          highlightCell={currentAdaptiveHint?.circuitTarget || null}
          hintBanner={adaptiveHintElement}
          onTapCell={handleCircuitCellTap}
          onOpenDemo={(topic) => {
            SFX.click();
            setActiveDemo({ topic });
          }}
          onRequestHint={handleRequestHint}
        />
      )}

      {/* Stage 4: Playable 3D Action Wall-Run */}
      {mode === 'ACTION_RUN_3D' && actionMetrics && (
        <ActionRunHud
          metrics={actionMetrics}
          onSteer={(dir) => worldRef.current?.steerActionDash(dir)}
          onJump={() => worldRef.current?.jumpActionDash()}
        />
      )}

      {/* Stage 5: Playable 3D Alien Planet Equipment Adventure */}
      {mode === 'PLANET_ADVENTURE_3D' && planetMetrics && (
        <PlanetAdventureHud
          metrics={planetMetrics}
          onMoveInput={(forward, strafe) => worldRef.current?.setPlanetMoveInput(forward, strafe)}
          onJump={() => worldRef.current?.jumpPlanetAdventure()}
          onBoost={() => worldRef.current?.triggerPlanetBoost()}
          onLaser={() => worldRef.current?.firePlanetLaser()}
          onExit={() => {
            SFX.click();
            handlePlanetFinish({ ...planetMetrics, status: 'exited' });
          }}
        />
      )}

      {/* Expressive Robot Voice Speech Bubble */}
      {!showSettings &&
        !showProfile &&
        !showMap &&
        !showTrophies &&
        !showGameRoom &&
        !showParentDashboard &&
        !showSandbox &&
        !showClassCode &&
        !paused && <RobotSpeechBubble speech={robotSpeech} moodCue={moodCue} headPoint={headPoint} />}

      {/* Ghost Hand Visual Demo */}
      <GhostHand
        visible={
          ghostHelp &&
          !paused &&
          !showMap &&
          !showTrophies &&
          !showSettings &&
          !showProfile &&
          !showGameRoom &&
          !showParentDashboard &&
          !showSandbox &&
          !showClassCode &&
          !activeDemo &&
          !inspect3D &&
          (mode === 'BUILD_3D' || mode === 'CODE_3D' || mode === 'CIRCUIT_3D')
        }
        step={tutorialStep}
      />

      {/* Interactive Visual Learning Demo Popover */}
      <ConceptDemoPopover demo={activeDemo} onClose={() => setActiveDemo(null)} />

      {/* Bot Character Profile & Cadet Roster Selector Modal */}
      <BotProfileModal
        visible={showProfile}
        profileName={activeProfileName}
        activeCharacter={activeCharacter}
        totalStars={totalStarsEarned}
        totalBolts={save.totalBolts}
        savedThemes={savedPaintThemes}
        canOpenPaintBooth={mode === 'BUILD_3D' || mode === 'TITLE'}
        rosterSlots={roster.slots}
        activeSlotId={roster.activeSlotId}
        onRenameProfile={handleRenameProfile}
        onSelectCharacter={handleSelectCharacter}
        onSwitchSlot={handleSwitchRosterSlot}
        onCreateSlot={handleCreateRosterSlot}
        onDeleteSlot={handleDeleteRosterSlot}
        onOpenPaintBooth={() => {
          if (mode === 'TITLE') {
            beginLevel(currentLevel);
            window.setTimeout(() => handleEnterPaintBooth(), 30);
          } else {
            handleEnterPaintBooth();
          }
        }}
        onOpenParentView={() => {
          SFX.click();
          setShowProfile(false);
          setShowParentDashboard(true);
        }}
        onClose={() => {
          SFX.click();
          setShowProfile(false);
        }}
      />

      {/* Audio & Workshop Settings Modal */}
      <SettingsModal
        visible={showSettings}
        muted={save.muted}
        audio={normalizedAudio}
        gentleSpeed={save.gentleSpeed}
        lowGraphics={lowGraphics}
        challengeTimerEnabled={challengeTimerEnabled}
        adaptiveHintsEnabled={save.adaptiveHintsEnabled !== false}
        readAloudEnabled={Boolean(save.readAloudEnabled)}
        onToggleMute={handleToggleMute}
        onChangeAudio={handleChangeAudio}
        onTestSfx={() => SFX.weldSparks()}
        onTestUi={() => SFX.click()}
        onTestVoice={() =>
          SFX.speakWallE(
            'greeting',
            BOT_CHARACTERS[activeCharacter].voicePitch,
            touchCounterRef.current++
          )
        }
        onToggleSpeed={handleToggleSpeed}
        onToggleLowGraphics={handleToggleLowGraphics}
        onToggleChallengeTimer={handleToggleChallengeTimer}
        onToggleAdaptiveHints={handleToggleAdaptiveHints}
        onToggleReadAloud={handleToggleReadAloud}
        onOpenParentView={() => {
          SFX.click();
          setShowSettings(false);
          setShowParentDashboard(true);
        }}
        onClose={() => {
          SFX.click();
          setShowSettings(false);
        }}
      />

      {/* Lazy-Loaded Feature Modals */}
      <React.Suspense fallback={null}>
        {showTrophies && (
          <TrophyShelfModal
            visible={showTrophies}
            profileName={activeProfileName}
            skillStats={save.skillStats}
            upgradedPillars={upgradedPillars}
            unlockedFactIds={save.unlockedFactIds || []}
            initialTab={trophyInitialTab}
            onClose={() => setShowTrophies(false)}
          />
        )}

        {showParentDashboard && (
          <ParentDashboardModal
            visible={showParentDashboard}
            save={save}
            adaptiveHintsEnabled={save.adaptiveHintsEnabled !== false}
            challengeTimerEnabled={challengeTimerEnabled}
            onToggleAdaptiveHints={handleToggleAdaptiveHints}
            onToggleChallengeTimer={handleToggleChallengeTimer}
            onClose={() => {
              SFX.click();
              setShowParentDashboard(false);
            }}
          />
        )}

        {showGameRoom && (
          <GameRoomModal
            visible={showGameRoom}
            activeCharacter={activeCharacter}
            totalBolts={save.totalBolts}
            hasNextLevel={Boolean(nextLevelDef)}
            chassisInfo={chassisInfo}
            externalSummary={planetSummary}
            onClearExternalSummary={() => setPlanetSummary(null)}
            onAwardBolts={(bolts) => handleAwardArcadeBolts(bolts)}
            onEducationalProgress={handleEducationalMiniGameProgress}
            onLaunchRobotRun={handlePlayGateDash}
            onLaunchPlanetAdventure={handlePlayPlanetAdventure}
            onNextLevel={() => {
              setPlanetSummary(null);
              setShowGameRoom(false);
              if (nextLevelDef) beginLevel(nextLevelDef);
            }}
            onClose={() => {
              setPlanetSummary(null);
              setShowGameRoom(false);
            }}
          />
        )}

        {showSandbox && (
          <SandboxCreatorModal
            visible={showSandbox}
            initialDraft={currentSandboxDraft}
            savedLevels={savedSandboxLevels}
            onSaveDraft={handleSaveSandboxDraft}
            onDeleteSavedLevel={handleDeleteSavedSandbox}
            onTestMission={handleTestSandboxDraft}
            onClose={() => setShowSandbox(false)}
          />
        )}

        {showClassCode && (
          <ClassroomCodeModal
            visible={showClassCode}
            onPlayDraft={handlePlayClassCode}
            onSaveToSandbox={handleSaveClassCodeToSandbox}
            onClose={() => setShowClassCode(false)}
          />
        )}
      </React.Suspense>

      {/* Modals */}
      <VictoryModal
        visible={mode === 'VICTORY' && !showGameRoom}
        stars={victoryStars}
        bonusEarned={victoryBonusInfo.earned}
        fullCrystals={victoryBonusInfo.fullCrystals}
        withinBlockPar={victoryBonusInfo.withinBlockPar}
        withinBudgetPar={victoryBonusInfo.withinBudgetPar}
        collectedCrystals={victoryBonusInfo.collectedCrystals}
        totalCrystals={victoryBonusInfo.totalCrystals}
        blockCount={victoryBonusInfo.blockCount}
        parBlocks={victoryBonusInfo.parBlocks}
        energyCost={victoryBonusInfo.energyCost}
        parBudget={victoryBonusInfo.parBudget}
        hasNextLevel={Boolean(nextLevelDef)}
        isSandbox={Boolean(currentLevel.isSandbox && !currentLevel.isClassCode)}
        upgradedPillars={upgradedPillars}
        speedRun={lastVictorySpeedRun}
        bugFixerBonus={bugFixerEarned}
        unlockedFacts={newlyUnlockedFacts}
        onPlayDash={() => {
          SFX.click();
          setShowGameRoom(true);
        }}
        onReplay={() => {
          SFX.click();
          beginLevel(currentLevel, true);
        }}
        onOpenMap={() => {
          SFX.click();
          setShowMap(true);
        }}
        onOpenTrophies={() => {
          SFX.click();
          setTrophyInitialTab(newlyUnlockedFacts.length > 0 ? 'facts' : 'badges');
          setShowTrophies(true);
        }}
        onOpenSandbox={
          currentLevel.isSandbox && !currentLevel.isClassCode
            ? () => {
                SFX.click();
                setShowSandbox(true);
              }
            : undefined
        }
        onNextLevel={() => {
          SFX.click();
          if (nextLevelDef) beginLevel(nextLevelDef);
        }}
      />

      <LevelMapModal
        visible={showMap}
        save={save}
        currentLevelId={currentLevel.id}
        onSelectLevel={(id) => {
          SFX.click();
          const target = getLevelById(id) || BONUS_LEVELS[0];
          beginLevel(target);
        }}
        onStartDaily={() => {
          SFX.click();
          beginLevel(generateDailyChallenge(getDailyDateKey()));
        }}
        onOpenSandbox={() => {
          SFX.click();
          setShowMap(false);
          setShowSandbox(true);
        }}
        onOpenClassCode={() => {
          SFX.click();
          setShowMap(false);
          setShowClassCode(true);
        }}
        onClose={() => setShowMap(false)}
      />

      <PauseModal
        visible={paused}
        onResume={() => {
          SFX.click();
          setPaused(false);
        }}
        onRestart={() => {
          SFX.click();
          beginLevel(currentLevel);
        }}
        onOpenSettings={() => {
          SFX.click();
          setShowSettings(true);
        }}
        onHome={() => {
          SFX.click();
          setPaused(false);
          setWorkshopAutoSpin(false);
          setInspect3D(false);
          worldRef.current?.setWorkshopAutoSpin(false);
          setMode('TITLE');
          worldRef.current?.setMode('TITLE');
        }}
      />

      {/* Milestone Unlock Particle Burst & Sound Celebration Overlay */}
      <MilestoneCelebrationOverlay
        event={milestoneCelebration}
        lowGraphics={lowGraphics}
        onOpenTrophies={() => {
          SFX.click();
          setTrophyInitialTab(milestoneCelebration?.facts.length ? 'facts' : 'badges');
          setMilestoneCelebration(null);
          setShowGameRoom(false);
          setShowTrophies(true);
        }}
        onDismiss={() => setMilestoneCelebration(null)}
      />

      {/* WebGL Context Lost Recovery */}
      {webglLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6">
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Reload 3D Scene"
            className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-sky-400 bg-slate-900 text-sky-300 shadow-2xl"
          >
            <RotateCcw className="h-10 w-10" />
          </button>
        </div>
      )}
    </div>
  );
}
