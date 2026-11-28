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
  levelHasDynamicHazards,
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
import { dismissSplashScreen, updateSplashProgress } from './game/splashScreen';
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
import { missionVoice } from './game/characterGuidance';
import { soundscapeFor } from './game/soundscape';
import { getJourneyPreview } from './game/journey';
import { canEnterCampaign,createMissionTravel,type MissionTravel } from './game/adventureMap';
import { MissionTravelOverlay } from './components/MissionTravelOverlay';
import { getBiomeForLevel } from './game/biomes';
import { getPartPlacementSoundProfile } from './game/partAudio';
import {
  normalizeGraphicsQualityMode,
  type GraphicsQualityMode
} from './game/graphicsConfig';
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
import { buildLivePathPreview } from './game/pathPreview';
import {
  buildPredictBeforeRunQuestion,
  shouldPromptPredictQuiz,
  type PredictQuizQuestion
} from './game/predictQuiz';
import {
  createEmptyProgramHistory,
  pushProgramHistory,
  redoProgramHistory,
  undoProgramHistory,
  type ProgramHistoryState
} from './game/programHistory';
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
import { getNextCodeCameraPreset, type CodeCameraPreset } from './three/codeCamera';
import type { HeadScreenPoint, SlotScreenPoint } from './three/robotRig';
import { TitleOverlay } from './components/TitleOverlay';
import { getMissionLearningGoal, getRecommendedCampaignLevel } from './game/missionCurriculum';
import { getCollectionRequirement, getMissionObjectiveLabel, getSurveyStations, isMissionComplete, requiresMissionCircuit } from './game/missionObjectives';
import { getMissionPrototype } from './game/missionPrototypes';
import { getOceanPresentation } from './game/oceanPresentation';
import { TopHud, type MoodCue } from './components/TopHud';
import { BuildDock } from './components/BuildDock';
import { PaintBoothDock } from './components/PaintBoothDock';
import { BotProfileModal } from './components/BotProfileModal';
import { CodeDock } from './components/CodeDock';
import { PredictBeforeRunCard } from './components/PredictBeforeRunCard';
import { ActionRunHud, CircuitOverlay } from './components/CircuitAndActionHud';
import {
  LevelMapModal,
  PauseModal,
  VictoryModal,
  type VictorySpeedRunSummary
} from './components/Modals';
import { GhostHand } from './components/GhostHand';
import { GuidedTutorialOverlay } from './components/GuidedTutorialOverlay';
import { ConceptDemoPopover, type DemoRequest } from './components/ConceptDemoPopover';
import { SettingsModal } from './components/SettingsModal';
import { RobotSpeechBubble } from './components/RobotSpeechBubble';
import {
  resolveMissionTutorialStep,
  shouldShowMissionTutorial,
  type MissionTutorialStepId
} from './game/missionTutorial';
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
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { HAPTICS, type AndroidBackAction } from './game/androidApp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BoltShopModal, QuestBoardModal } from './components/ShopAndQuestsModal';
import {
  claimMasteryQuest,
  countClaimableQuests,
  incrementQuestCounters,
  normalizePlayerLoadout,
  normalizeQuestCounters,
  purchaseShopItem,
  toggleEquipShopItem,
  type PlayerLoadout
} from './game/shopAndQuests';
import {
  DEBUG_MISSIONS,
  debugMissionToLevelDef,
  getDebugMissionById
} from './game/debugMissions';

function programHasBlockType(blocks: CodeBlock[], targetType: CodeBlock['type']): boolean {
  for (const blk of blocks) {
    if (blk.type === targetType) return true;
    if (blk.children && programHasBlockType(blk.children, targetType)) return true;
    if (blk.elseChildren && programHasBlockType(blk.elseChildren, targetType)) return true;
  }
  return false;
}

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
  const [juniorSession, setJuniorSession] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [missionTravel,setMissionTravel]=useState<MissionTravel|null>(null);
  const finishMissionTravel=useCallback(()=>setMissionTravel(null),[]);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGameRoom, setShowGameRoom] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showClassCode, setShowClassCode] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [mapInitialTab, setMapInitialTab] = useState<'story' | 'debug'>('story');
  const [shopPreviewLoadout, setShopPreviewLoadout] = useState<PlayerLoadout | null>(null);
  const [lastDebugBoltReward, setLastDebugBoltReward] = useState(0);
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
  const [codeCameraPreset, setCodeCameraPreset] = useState<CodeCameraPreset>('overview');
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
  const [functionBody, setFunctionBody] = useState<CodeBlock[]>([]);
  const [programHistory, setProgramHistory] = useState<ProgramHistoryState>(() =>
    createEmptyProgramHistory()
  );
  const [showPathPreview, setShowPathPreview] = useState<boolean>(true);
  const [hoveredCodeBlockId, setHoveredCodeBlockId] = useState<string | null>(null);
  const [circuitGrid, setCircuitGrid] = useState<CircuitGrid>(() => cloneCircuitGrid(LEVELS[0].circuit));
  const [slotPoints, setSlotPoints] = useState<SlotScreenPoint[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartId | null>(null);
  const [ghostHelp, setGhostHelp] = useState<boolean>(false);
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(false);
  const [tutorialForceActive, setTutorialForceActive] = useState<boolean>(false);
  const [tutorialAckSteps, setTutorialAckSteps] = useState<Set<MissionTutorialStepId>>(
    () => new Set()
  );
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeCallerBlockId, setActiveCallerBlockId] = useState<string | null>(null);
  const [activeSimResult, setActiveSimResult] = useState<SimResult | null>(null);
  const [activeSimStepIdx, setActiveSimStepIdx] = useState<number>(-1);
  const [simPaused, setSimPaused] = useState(false);
  const [simAwaitingStep, setSimAwaitingStep] = useState(false);
  const [pendingPredictQuiz, setPendingPredictQuiz] = useState<{
    question: PredictQuizQuestion;
    sim: SimResult;
    levelKey: string;
  } | null>(null);
  const [predictPromptedLevelKey, setPredictPromptedLevelKey] = useState<string | null>(null);
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
  const graphicsQuality = useMemo(
    () => normalizeGraphicsQualityMode(save.graphicsQuality, save.lowGraphics),
    [save.graphicsQuality, save.lowGraphics]
  );
  const lowGraphics = graphicsQuality === 'eco';
  const challengeTimerEnabled = !juniorSession && !currentLevel.isPrototype && Boolean(save.challengeTimerEnabled);
  useEffect(() => { if (mode === 'TITLE') setJuniorSession(false); }, [mode]);
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

  const activeLoadout = useMemo(() => normalizePlayerLoadout(save.loadout), [save.loadout]);
  const activeQuestCounters = useMemo(
    () => normalizeQuestCounters(save.questCounters),
    [save.questCounters]
  );
  const claimableQuestsCount = useMemo(
    () => countClaimableQuests(activeQuestCounters, save.claimedQuestIds || []),
    [activeQuestCounters, save.claimedQuestIds]
  );

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
    !showShop &&
    !showQuests &&
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

  useEffect(()=>{
    const sync=()=>SFX.setSoundscape(document.hidden||paused?null:soundscapeFor(getBiomeForLevel(currentLevel).id,mode,showGameRoom));
    sync();document.addEventListener('visibilitychange',sync);
    return ()=>document.removeEventListener('visibilitychange',sync);
  },[currentLevel,mode,showGameRoom,paused]);
  useEffect(()=>()=>SFX.setSoundscape(null),[]);
  useEffect(()=>{
    const sync=()=>SFX.setNarrationActive(SPEECH.getSnapshot().speaking);
    sync();return SPEECH.subscribe(sync);
  },[]);

  useEffect(() => {
    SPEECH.setEnabled(Boolean(save.readAloudEnabled));
  }, [save.readAloudEnabled]);

  useEffect(() => {
    HAPTICS.setEnabled(save.hapticsEnabled !== false);
  }, [save.hapticsEnabled]);

  // Sync adaptive graphics quality mode with 3D world & document attribute
  useEffect(() => {
    worldRef.current?.setGraphicsQualityMode(graphicsQuality);
    document.body.dataset.lowGraphics = lowGraphics ? 'true' : 'false';
    document.body.dataset.graphicsQuality = graphicsQuality;
  }, [graphicsQuality, lowGraphics]);

  // Keep 3D bot character & Paint Booth materials declaratively synced with React state
  useEffect(() => {
    worldRef.current?.setBotCharacter(activeCharacter, false);
  }, [activeCharacter]);

  useEffect(() => {
    worldRef.current?.setPaintConfig(activePaintConfig, null);
  }, [activePaintConfig]);

  useEffect(() => {
    worldRef.current?.setPlayerLoadout(shopPreviewLoadout || activeLoadout, false);
  }, [activeLoadout, shopPreviewLoadout]);

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
    (lvl: LevelDef, preserveChassis = false, junior = false) => {
      SPEECH.stop();
      setMissionTravel(null);
      setJuniorSession(junior);
      const hasStarterChassis = Boolean(lvl.starterChassis);
      const startInCode = Boolean((lvl.isDebug || lvl.isPrototype || lvl.objective) && hasStarterChassis);
      const nextChassis = hasStarterChassis
        ? lvl.starterChassis!.map((row) => [...row])
        : preserveChassis
          ? chassis
          : createEmptyChassis();
      const nextProgram = lvl.starterProgram ? lvl.starterProgram.map((b) => ({ ...b })) : [];
      const nextFunctionBody = lvl.starterFunctionBody
        ? lvl.starterFunctionBody.map((b) => ({ ...b }))
        : [];
      const nextCircuit = cloneCircuitGrid(lvl.circuit);

      setCurrentLevel(lvl);
      setChassis(nextChassis);
      setProgram(nextProgram);
      setFunctionBody(nextFunctionBody);
      setProgramHistory(createEmptyProgramHistory());
      setHoveredCodeBlockId(null);
      setCircuitGrid(nextCircuit);
      setSelectedPart(null);
      setLastPlacement(null);
      setLastCodeFeedbackTier(null);
      setActiveBlockId(null);
      setActiveCallerBlockId(null);
      setActiveSimResult(null);
      setActiveSimStepIdx(-1);
      setSimPaused(false);
      setSimAwaitingStep(false);
      setPendingPredictQuiz(null);
      setPredictPromptedLevelKey(null);
      setMoodCue(null);
      setActiveDemo(null);
      setUpgradedPillars([]);
      setLastDebugBoltReward(0);
      setPaused(false);
      setShowMap(false);
      setShowTrophies(false);
      setShowSettings(false);
      setShowProfile(false);
      setShowGameRoom(false);
      setShowParentDashboard(false);
      setShowSandbox(false);
      setShowClassCode(false);
      setShowShop(false);
      setShowQuests(false);
      setShopPreviewLoadout(null);
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
      const initialMode: WorldMode = startInCode ? 'CODE_3D' : 'BUILD_3D';
      setMode(initialMode);
      setTutorialDismissed(false);
      setTutorialAckSteps(new Set());
      if (
        lvl.id !== 1 ||
        lvl.isDaily ||
        lvl.isBonus ||
        lvl.isSandbox ||
        lvl.isClassCode ||
        lvl.isDebug
      ) {
        setTutorialForceActive(false);
      }
      setGhostHelp(false);
      worldRef.current?.setLevel(lvl);
      worldRef.current?.setWorkshopAutoSpin(false);
      worldRef.current?.resetWorkshopView();
      worldRef.current?.updateChassis(nextChassis, null);
      worldRef.current?.setMode(initialMode);
      SFX.unlock();
      SFX.speakWallE('greeting', BOT_CHARACTERS[activeCharacter].voicePitch, touchCounterRef.current++);
    },
    [activeCharacter, chassis, resetTimer]
  );

  const livePathPreview = useMemo(
    () => buildLivePathPreview(currentLevel, chassis, program, functionBody),
    [chassis, currentLevel, functionBody, program]
  );

  // Refs for WebGL callbacks so canvas never unmounts
  const stateRef = useRef({
    mode,
    circuitGrid,
    currentLevel,
    chassis,
    program,
    functionBody,
    save,
    juniorSession,
    livePathPreview,
    showPathPreview
  });
  stateRef.current = {
    mode,
    circuitGrid,
    currentLevel,
    chassis,
    program,
    functionBody,
    save,
    juniorSession,
    livePathPreview,
    showPathPreview
  };

  const applyProgramChange = useCallback(
    (nextProgram: CodeBlock[]) => {
      setProgramHistory((prevHist) => pushProgramHistory(prevHist, program, nextProgram));
      setProgram(nextProgram);
      setMoodCue(null);
      setFailingBlockId(null);
    },
    [program]
  );

  const handleUndoProgram = useCallback(() => {
    const res = undoProgramHistory(programHistory, program);
    if (!res.changed) return;
    SFX.uiTick();
    HAPTICS.trigger('tap');
    setProgramHistory(res.history);
    setProgram(res.program);
    setHoveredCodeBlockId(null);
    setMoodCue(null);
    setFailingBlockId(null);
  }, [program, programHistory]);

  const handleRedoProgram = useCallback(() => {
    const res = redoProgramHistory(programHistory, program);
    if (!res.changed) return;
    SFX.uiTick();
    HAPTICS.trigger('tap');
    setProgramHistory(res.history);
    setProgram(res.program);
    setHoveredCodeBlockId(null);
    setMoodCue(null);
    setFailingBlockId(null);
  }, [program, programHistory]);

  useEffect(() => {
    worldRef.current?.setLivePathPreview(livePathPreview, showPathPreview && !pendingPredictQuiz);
  }, [livePathPreview, showPathPreview, pendingPredictQuiz]);

  useEffect(() => {
    worldRef.current?.setHoveredCodeBlock(mode === 'CODE_3D' ? hoveredCodeBlockId : null);
  }, [hoveredCodeBlockId, mode]);

  const finalizeMissionVictory = useCallback(
    (sim: SimResult, completedCircuit?: ReturnType<typeof traceCircuit>) => {
      const cur = stateRef.current;
      const isDebug = Boolean(cur.currentLevel.isDebug);
      if (cur.currentLevel.objective && !isMissionComplete(cur.currentLevel, sim, completedCircuit)) return;
      if (isDebug || cur.currentLevel.objective?.kind === 'repair') {
        SFX.bugSquashed();
      } else {
        SFX.laserSolved();
      }
      HAPTICS.trigger('victory');
      worldRef.current?.triggerCompanionCelebrate();
      setCircuitSolvedFreeze(true);
      if (cur.currentLevel.isPrototype) {
        setLastSimCrystals({collected:sim.collectedCrystals,total:sim.totalCrystals});
        setMode('VICTORY');
        worldRef.current?.setMode('VICTORY');
        return; // Practice only: no campaign stars, currency, telemetry or mastery writes.
      }

      const info = computeChassisInfo(cur.chassis);
      const blkCount = countBlocks(
        cur.program,
        cur.currentLevel.functionUnlocked ? cur.functionBody : undefined
      );
      const starRes = calculateStars(
        cur.currentLevel,
        info.cost,
        blkCount,
        sim.collectedCrystals,
        sim.totalCrystals
      );
      const isBonusStar = evaluateBonusStar(cur.currentLevel, starRes);

      const timerEnabled = !cur.juniorSession && Boolean(cur.save.challengeTimerEnabled);
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
      const fixedBug = hadPriorFailRef.current || isDebug;
      setBugFixerEarned(!isDebug && hadPriorFailRef.current);

      const debugId = cur.currentLevel.debugMissionId;
      const alreadySolvedDebug = Boolean(debugId && cur.save.debugCompleted?.[debugId]);
      const debugBolts = isDebug
        ? alreadySolvedDebug
          ? 20
          : cur.currentLevel.debugBoltReward || 45
        : 0;
      setLastDebugBoltReward(debugBolts);

      const levelFacts = getUnlockedFactCardsForLevel(cur.currentLevel.id);
      const debugFact = fixedBug ? getFactCardById('debugging_mindset') : null;
      const candidateFacts = debugFact ? [...levelFacts, debugFact] : levelFacts;

      const mastery = recordSkillMastery(
        cur.save.skillStats,
        cur.currentLevel,
        cur.chassis,
        cur.program,
        sim,
        cur.functionBody
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

      const usedLoop =
        programHasBlockType(cur.program, 'LOOP') || programHasBlockType(cur.functionBody, 'LOOP');
      const usedIf =
        programHasBlockType(cur.program, 'IF') || programHasBlockType(cur.functionBody, 'IF');
      const usedFunc = programHasBlockType(cur.program, 'CALL_FUNC');

      setSave((prev) => {
        const mergedFacts = Array.from(
          new Set([...(prev.unlockedFactIds || []), ...newFactIds])
        );
        const baseBolts = isDebug ? debugBolts : 50 + (hadPriorFailRef.current ? 15 : 0);
        const nextDebugCompleted = { ...(prev.debugCompleted || {}) };
        if (debugId) {
          nextDebugCompleted[debugId] = true;
        }
        const nextQuestCounters = incrementQuestCounters(
          normalizeQuestCounters(prev.questCounters),
          {
            missionsCleared: 1,
            bugsSquashed: isDebug ? 1 : 0,
            loopsUsed: usedLoop ? 1 : 0,
            conditionalsUsed: usedIf ? 1 : 0,
            functionsUsed: usedFunc ? 1 : 0,
            crystalsCollected: sim.collectedCrystals,
            dailyCleared: cur.currentLevel.isDaily ? 1 : 0
          }
        );

        const next: SaveProfile = {
          ...prev,
          stars: { ...prev.stars },
          bonusStars: { ...prev.bonusStars },
          debugCompleted: nextDebugCompleted,
          questCounters: nextQuestCounters,
          tutorialDone: true,
          totalBolts: prev.totalBolts + baseBolts + speedRunEval.bonusBolts,
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
        } else if (
          cur.currentLevel.isSandbox ||
          cur.currentLevel.isClassCode ||
          cur.currentLevel.isDebug
        ) {
          // Debug, Sandbox & Classroom Code runs award bolts/quests/telemetry without altering story stars
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
    },
    [levelElapsedRef, setLevelElapsedMs, triggerMilestoneCelebration]
  );

  const handleCircuitCellTap = useCallback(
    (r: number, c: number) => {
      const cur = stateRef.current;
      if (cur.mode !== 'CIRCUIT_3D') return;
      const cell = cur.circuitGrid[r]?.[c];
      if (!cell || (cell.type !== 'mirror' && cell.type !== 'splitter')) return;

      const nextGrid = cloneCircuitGrid(cur.circuitGrid);
      nextGrid[r][c].rot = nextGrid[r][c].rot === 0 ? 1 : 0;
      setCircuitGrid(nextGrid);
      worldRef.current?.setCircuitGrid(nextGrid);
      SFX.mirror();
      HAPTICS.trigger('tap');

      const trace = traceCircuit(nextGrid);
      if (trace.solved) {
        const sim = simulateProgram(cur.currentLevel, cur.chassis, cur.program, cur.functionBody);
        finalizeMissionVictory(sim, trace);
      }
    },
    [finalizeMissionVictory]
  );

  const handleSimProgress = useCallback((idx: number, ev: SimEvent) => {
    setActiveBlockId(ev.blockId);
    setActiveCallerBlockId(ev.callerBlockId || null);
    setActiveSimStepIdx(idx);
  }, []);

  const handleSimPauseChange = useCallback((isPaused: boolean, awaitingStep: boolean) => {
    setSimPaused(isPaused);
    setSimAwaitingStep(awaitingStep);
  }, []);

  const handleSimComplete = useCallback(
    (res: SimResult) => {
      setActiveBlockId(null);
      setActiveCallerBlockId(null);
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
        if (!requiresMissionCircuit(stateRef.current.currentLevel)) {
          finalizeMissionVictory(res);
          return;
        }
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

    if (!cur.currentLevel.isPrototype) setSave((prev) => {
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

    if (
      res.failCode === 'empty' ||
      res.failCode === 'empty_container' ||
      res.failCode === 'empty_function' ||
      res.failCode === 'objective_unmet' ||
      res.failCode === 'short'
    ) {
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
              : res.failCode === 'laser_gate' || res.failCode === 'patrol_drone'
                ? 'HAZARD'
                : undefined;
      setMoodCue({
        mood: 'sad',
        hazard: haz,
        part: res.missingPart || undefined
      });
      setMode('CODE_3D');
    }
  }, [finalizeMissionVictory]);

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
    updateSplashProgress(68);

    import('./three/worldScene')
      .then(({ UnifiedWorldController }) => {
        if (disposed || !mountRef.current) return;
        updateSplashProgress(88);
        const ctrl = new UnifiedWorldController(mountRef.current, {
          onBotTap: (zone: RobotTouchZone) => {
            triggerRobotSpeech(pickTouchResponse(zone, touchCounterRef.current++));
          },
          onDroneTap: () => {
            const v = touchCounterRef.current++;
            SFX.droneChirp(v);
            HAPTICS.trigger('tap');
            const id = ++speechIdRef.current;
            setRobotSpeech({
              id,
              phrase: 'excited',
              variant: v,
              emote: 'stars',
              mood: 'happy',
              accentColor: '#38bdf8',
              pitchScale: 1.25,
              syllables: 2,
              ariaLabel: 'Helper Drone chirps happily'
            });
            if (speechTimerRef.current !== null) {
              window.clearTimeout(speechTimerRef.current);
            }
            speechTimerRef.current = window.setTimeout(() => {
              setRobotSpeech((cur) => (cur && cur.id === id ? null : cur));
            }, 2200);
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
          onCodeCameraPresetChange: (preset) => setCodeCameraPreset(preset),
          onWebglLost: (lost) => setWebglLost(lost)
        });
        worldRef.current = ctrl;

        const latest = stateRef.current;
        const initTheme = normalizeBotTheme(latest.save.botTheme);
        const initChar = normalizeBotCharacter(latest.save.botCharacter);
        const initPaint = normalizePaintConfig(latest.save.paintBooth, initTheme, initChar);
        ctrl.setLevel(latest.currentLevel);
        ctrl.setGentleSpeed(latest.save.gentleSpeed);
        ctrl.setGraphicsQualityMode(
          normalizeGraphicsQualityMode(latest.save.graphicsQuality, latest.save.lowGraphics)
        );
        ctrl.setBotTheme(initTheme);
        ctrl.setBotCharacter(initChar, false);
        ctrl.setPaintConfig(initPaint, null);
        ctrl.setPlayerLoadout(normalizePlayerLoadout(latest.save.loadout), false);
        ctrl.updateChassis(latest.chassis, null);
        ctrl.setLivePathPreview(latest.livePathPreview, latest.showPathPreview);

        const params = new URLSearchParams(window.location.search);
        if (latest.mode === 'TITLE' && params.get('launch') === 'planet') {
          ctrl.updateChassis(latest.chassis, null);
          ctrl.startPlanetAdventure(latest.save.gentleSpeed);
          setMode('PLANET_ADVENTURE_3D');
        } else if (latest.mode === 'TITLE' && params.get('autostart') === '1') {
          setMode('BUILD_3D');
          setGhostHelp(latest.currentLevel.id === 1 && !latest.save.tutorialDone);
          ctrl.setMode('BUILD_3D');
        } else {
          ctrl.setMode(latest.mode);
          if (latest.mode === 'CIRCUIT_3D') {
            ctrl.setCircuitGrid(latest.circuitGrid);
          }
        }

        // Wait two animation frames so the 3D scene has painted before revealing
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (!disposed) dismissSplashScreen();
          });
        });
      })
      .catch(() => {
        if (!disposed) {
          setWebglLost(true);
          dismissSplashScreen({ minVisibleMs: 0 });
        }
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
    setPaused,
    onUndoCode: handleUndoProgram,
    onRedoCode: handleRedoProgram
  });

  const handleAndroidBackAction = useCallback(
    (action: AndroidBackAction) => {
      HAPTICS.trigger('tap');
      SFX.click();
      switch (action) {
        case 'close_class_code':
          setShowClassCode(false);
          break;
        case 'close_sandbox':
          setShowSandbox(false);
          break;
        case 'close_parent_dashboard':
          setShowParentDashboard(false);
          break;
        case 'close_game_room':
          setPlanetSummary(null);
          setShowGameRoom(false);
          break;
        case 'close_trophies':
          setShowTrophies(false);
          break;
        case 'close_profile':
          setShowProfile(false);
          break;
        case 'close_settings':
          setShowSettings(false);
          break;
        case 'close_map':
          setShowMap(false);
          break;
        case 'close_demo':
          setActiveDemo(null);
          break;
        case 'resume_pause':
          setPaused(false);
          break;
        case 'exit_paint_booth':
          setWorkshopAutoSpin(false);
          worldRef.current?.setWorkshopAutoSpin(false);
          setMode('BUILD_3D');
          worldRef.current?.setMode('BUILD_3D');
          break;
        case 'exit_planet_adventure':
          planetKeysRef.current.clear();
          setMode('TITLE');
          worldRef.current?.setMode('TITLE');
          break;
        case 'return_title_from_victory':
          setMode('TITLE');
          worldRef.current?.setMode('TITLE');
          break;
        case 'open_pause':
          setPaused(true);
          break;
        default:
          break;
      }
    },
    []
  );

  useAndroidBackButton(
    {
      mode,
      paused,
      hasActiveDemo: Boolean(activeDemo),
      showClassCode,
      showSandbox,
      showParentDashboard,
      showGameRoom,
      showTrophies,
      showProfile,
      showSettings,
      showMap
    },
    handleAndroidBackAction
  );

  const handlePlacePart = (part: PartId, r: number, c: number) => {
    const check = canPlacePartInSlot(chassis, currentLevel.budget, part, r, c);
    if (!check.ok) {
      SFX.chirpConfused();
      HAPTICS.trigger('error');
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
    SFX.unlock();
    SFX.placePart(part);
    HAPTICS.trigger('snapPart');
    window.setTimeout(() => SFX.placePartFollowUp(part), soundProfile.followUpDelayMs);
    worldRef.current?.updateChassis(next, null, [r, c], part);
  };

  const handleRemoveSlot = (r: number, c: number) => {
    if (!chassis[r][c]) return;
    const next = cloneChassis(chassis);
    next[r][c] = null;
    setChassis(next);
    SFX.unlock();
    SFX.click();
    SFX.chirpConfused();
    worldRef.current?.updateChassis(next, null);
  };

  const completeMissionTutorial = useCallback(() => {
    setTutorialForceActive(false);
    setTutorialDismissed(true);
    setSave((prev) => {
      if (prev.tutorialDone) return prev;
      const next: SaveProfile = { ...prev, tutorialDone: true };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleAcknowledgeTutorialStep = useCallback((stepId: MissionTutorialStepId) => {
    SFX.uiTick();
    setTutorialAckSteps((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }, []);

  const handleSkipTutorial = useCallback(() => {
    SFX.click();
    setGhostHelp(false);
    completeMissionTutorial();
  }, [completeMissionTutorial]);

  const handleReplayTutorial = useCallback(() => {
    SFX.click();
    beginLevel(LEVELS[0], false);
    setTutorialDismissed(false);
    setTutorialAckSteps(new Set());
    setTutorialForceActive(true);
  }, [beginLevel]);

  const handleStartJunior = useCallback(() => {
    SFX.click();
    beginLevel(LEVELS[0], false, true);
    setTutorialDismissed(false);
    setTutorialAckSteps(new Set());
    setTutorialForceActive(true);
  }, [beginLevel]);

  const launchSimulation = useCallback(
    (sim: SimResult, stepMode: boolean) => {
      SPEECH.stop();
      SFX.unlock();
      if (!stepMode) {
        SFX.speakWallE('excited', BOT_CHARACTERS[activeCharacter].voicePitch, touchCounterRef.current++);
      }
      setActiveSimResult(sim);
      setActiveSimStepIdx(sim.events.length > 0 ? 0 : -1);
      setSimPaused(false);
      setSimAwaitingStep(false);
      setMode('SIMULATING');
      worldRef.current?.playSimulation(sim, { stepMode });
    },
    [activeCharacter]
  );

  const handleRunProgram = () => {
    setMoodCue(null);
    setLastCodeFeedbackTier(null);
    setHoveredCodeBlockId(null);
    if (
      currentLevel.id === 1 &&
      !currentLevel.isDaily &&
      !currentLevel.isBonus &&
      !currentLevel.isSandbox &&
      !currentLevel.isClassCode &&
      (!save.tutorialDone || tutorialForceActive)
    ) {
      completeMissionTutorial();
    }
    const sim = simulateProgram(currentLevel, chassis, program, functionBody);
    const levelKey = currentLevel.isDaily
      ? `daily_${currentLevel.dailyDateKey || getDailyDateKey()}`
      : `lvl_${currentLevel.id}`;
    const shouldAsk = shouldPromptPredictQuiz({
      enabled: !currentLevel.isPrototype && save.predictQuizEnabled !== false,
      level: currentLevel,
      alreadyPromptedLevelKey: predictPromptedLevelKey,
      levelKey
    });

    if (shouldAsk) {
      const question = buildPredictBeforeRunQuestion({
        level: currentLevel,
        chassis,
        program,
        functionBody,
        simResult: sim
      });
      if (question) {
        SFX.uiTick();
        setPendingPredictQuiz({ question, sim, levelKey });
        return;
      }
    }

    launchSimulation(sim, false);
  };

  const handlePredictQuizComplete = useCallback(
    ({ correct, skipped }: { correct: boolean; skipped: boolean }) => {
      const curQuiz = pendingPredictQuiz;
      setPendingPredictQuiz(null);
      if (!curQuiz) return;
      setPredictPromptedLevelKey(curQuiz.levelKey);

      if (!skipped && correct) {
        // The quiz already supplies spoken and musical feedback; do not replay it over the run.
        setSave((prev) => {
          const nextSkills = {
            chassisBuilds: 0,
            jumpsCleared: 0,
            mudCleared: 0,
            loopsCompressed: 0,
            sensorsUsed: 0,
            circuitsSolved: 0,
            ...(prev.skillStats || {}),
            predictionsCorrect: (prev.skillStats?.predictionsCorrect || 0) + 1
          };
          const next: SaveProfile = {
            ...prev,
            totalBolts: prev.totalBolts + 20,
            skillStats: nextSkills,
            questCounters: incrementQuestCounters(normalizeQuestCounters(prev.questCounters), {
              predictionsCorrect: 1
            })
          };
          saveActiveRosterProfile(next);
          return next;
        });
      }

      launchSimulation(curQuiz.sim, false);
    },
    [launchSimulation, pendingPredictQuiz]
  );

  const handleStepProgram = () => {
    SFX.uiTick();
    setMoodCue(null);
    setLastCodeFeedbackTier(null);
    setHoveredCodeBlockId(null);
    setPendingPredictQuiz(null);
    if (
      currentLevel.id === 1 &&
      !currentLevel.isDaily &&
      !currentLevel.isBonus &&
      !currentLevel.isSandbox &&
      !currentLevel.isClassCode &&
      (!save.tutorialDone || tutorialForceActive)
    ) {
      completeMissionTutorial();
    }
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
    const sim = simulateProgram(currentLevel, chassis, program, functionBody);
    launchSimulation(sim, true);
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
    setActiveCallerBlockId(null);
    setActiveSimResult(null);
    setActiveSimStepIdx(-1);
    setSimPaused(false);
    setSimAwaitingStep(false);
    setMode('CODE_3D');
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

  const handleChangeGraphicsQuality = (mode: GraphicsQualityMode) => {
    SFX.uiTick();
    setSave((prev) => {
      const normalized = normalizeGraphicsQualityMode(mode);
      const nextLow = normalized === 'eco';
      const next: SaveProfile = {
        ...prev,
        graphicsQuality: normalized,
        lowGraphics: nextLow
      };
      worldRef.current?.setGraphicsQualityMode(normalized);
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleLowGraphics = () => {
    handleChangeGraphicsQuality(lowGraphics ? 'auto' : 'eco');
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

  const handleTogglePredictQuiz = () => {
    SFX.uiTick();
    setPendingPredictQuiz(null);
    setSave((prev) => {
      const nextEnabled = prev.predictQuizEnabled === false;
      const next: SaveProfile = { ...prev, predictQuizEnabled: nextEnabled };
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

  const handleToggleHaptics = () => {
    SFX.uiTick();
    setSave((prev) => {
      const nextEnabled = prev.hapticsEnabled === false;
      HAPTICS.setEnabled(nextEnabled);
      if (nextEnabled) HAPTICS.trigger('tap');
      const next: SaveProfile = { ...prev, hapticsEnabled: nextEnabled };
      saveActiveRosterProfile(next);
      return next;
    });
  };

  const handleToggleChallengeTimer = () => {
    SFX.uiTick();
    const nextEnabled = !Boolean(save.challengeTimerEnabled);
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
            isDebugPuzzle: Boolean(normDraft.isDebugPuzzle),
            bugClue: normDraft.bugClue,
            starterProgram: normDraft.starterProgram,
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
          isDebugPuzzle: Boolean(curSandbox.isDebugPuzzle),
          bugClue: curSandbox.bugClue,
          starterProgram: curSandbox.starterProgram,
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

  const handleBuyShopItem = useCallback((itemId: string) => {
    setSave((prev) => {
      const curLoadout = normalizePlayerLoadout(prev.loadout);
      const res = purchaseShopItem(curLoadout, prev.totalBolts, itemId);
      if (!res.ok) {
        SFX.chirpConfused();
        return prev;
      }
      SFX.shopBuy();
      HAPTICS.trigger('victory');
      worldRef.current?.setPlayerLoadout(res.loadout, true);
      const next: SaveProfile = {
        ...prev,
        totalBolts: res.totalBolts,
        loadout: res.loadout,
        questCounters: incrementQuestCounters(normalizeQuestCounters(prev.questCounters), {
          shopBought: 1
        })
      };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleToggleEquipShopItem = useCallback((itemId: string) => {
    setSave((prev) => {
      const curLoadout = normalizePlayerLoadout(prev.loadout);
      const nextLoadout = toggleEquipShopItem(curLoadout, itemId);
      SFX.uiTick();
      HAPTICS.trigger('tap');
      worldRef.current?.setPlayerLoadout(nextLoadout, true);
      const next: SaveProfile = {
        ...prev,
        loadout: nextLoadout
      };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleClaimQuest = useCallback((questId: string) => {
    setSave((prev) => {
      const counters = normalizeQuestCounters(prev.questCounters);
      const res = claimMasteryQuest(counters, prev.claimedQuestIds || [], prev.totalBolts, questId);
      if (!res.ok) return prev;
      SFX.questClaim();
      HAPTICS.trigger('victory');
      worldRef.current?.triggerCompanionCelebrate();
      const next: SaveProfile = {
        ...prev,
        totalBolts: res.totalBolts,
        claimedQuestIds: res.claimedQuestIds
      };
      saveActiveRosterProfile(next);
      return next;
    });
  }, []);

  const handleSelectDebugMission = useCallback(
    (missionId: string) => {
      const mission = getDebugMissionById(missionId);
      if (!mission) return;
      SFX.click();
      beginLevel(debugMissionToLevelDef(mission));
    },
    [beginLevel]
  );

  const handleResetDebugStarterCode = useCallback(() => {
    if (!currentLevel.starterProgram) return;
    SFX.click();
    applyProgramChange(currentLevel.starterProgram.map((b) => ({ ...b })));
    if (currentLevel.starterFunctionBody) {
      setFunctionBody(currentLevel.starterFunctionBody.map((b) => ({ ...b })));
    }
  }, [applyProgramChange, currentLevel.starterFunctionBody, currentLevel.starterProgram]);

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
    const plan = computeGhostPreviewPlan(currentLevel, phase, chassis, program, circuitGrid, functionBody);
    if (plan) {
      setGhostHelp(true);
      worldRef.current?.playGhostPreview(plan);
    }
  }, [chassis, circuitGrid, currentLevel, functionBody, mode, program]);

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

  const handleApplyParsons = useCallback(
    (template: ParsonsStarterTemplate) => {
      SFX.installComplete();
      applyProgramChange(template.blocks);
    },
    [applyProgramChange]
  );

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
    return getTutorialStep(currentLevel, phase, chassis, program, circuitGrid, selectedPart, functionBody);
  }, [chassis, circuitGrid, currentLevel, functionBody, mode, program, selectedPart]);

  const hasBlockingTutorialOverlay =
    paused ||
    showMap ||
    showTrophies ||
    showSettings ||
    showProfile ||
    showGameRoom ||
    showParentDashboard ||
    showSandbox ||
    showClassCode ||
    showShop ||
    showQuests ||
    Boolean(activeDemo) ||
    inspect3D;

  const missionTutorialVisible = shouldShowMissionTutorial({
    level: currentLevel,
    mode,
    tutorialDone: Boolean(save.tutorialDone),
    tutorialForceActive,
    tutorialDismissed,
    hasBlockingOverlay: hasBlockingTutorialOverlay
  });

  const activeMissionTutorialStep = useMemo(() => {
    if (!missionTutorialVisible) return null;
    return resolveMissionTutorialStep({
      level: currentLevel,
      mode,
      chassis,
      program,
      selectedPart,
      acknowledgedSteps: tutorialAckSteps
    });
  }, [chassis, currentLevel, missionTutorialVisible, mode, program, selectedPart, tutorialAckSteps]);

  const blockCount = useMemo(
    () => countBlocks(program, currentLevel.functionUnlocked ? functionBody : undefined),
    [currentLevel.functionUnlocked, functionBody, program]
  );
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
    if (currentLevel.isPrototype || currentLevel.isDaily || currentLevel.isSandbox || currentLevel.isClassCode) return null;
    if (currentLevel.isDebug && currentLevel.debugMissionId) {
      const curIdx = DEBUG_MISSIONS.findIndex((m) => m.id === currentLevel.debugMissionId);
      if (curIdx >= 0 && curIdx < DEBUG_MISSIONS.length - 1) {
        return debugMissionToLevelDef(DEBUG_MISSIONS[curIdx + 1]);
      }
      return null;
    }
    const target=getLevelById(currentLevel.id + 1);
    return target&&canEnterCampaign(target,save)?target:null;
  }, [currentLevel,save.unlockedLevel]);
  const travelToMission=(target:LevelDef)=>{
    if(!target.isDebug&&!canEnterCampaign(target,save))return;
    const travel=createMissionTravel(currentLevel,target);
    beginLevel(target);
    if(travel){setMissionTravel(travel);SFX.uiTick();}
  };

  const currentLevelSavedStars = getLevelSavedStars(save, currentLevel);
  const currentAdaptiveHint = useMemo(() => {
    if (currentLevel.isPrototype || adaptiveHintTier === 0) return null;
    if (mode !== 'BUILD_3D' && mode !== 'CODE_3D' && mode !== 'CIRCUIT_3D') return null;
    const phase = mode === 'BUILD_3D' ? 'build' : mode === 'CIRCUIT_3D' ? 'circuit' : 'code';
    return computeAdaptiveHint({
      level: currentLevel,
      phase,
      chassis,
      program,
      functionBody,
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
    functionBody,
    lastFailedSim,
    mode,
    program
  ]);

  const adaptiveHintElement = currentAdaptiveHint ? (
    <AdaptiveHintBanner
      hint={currentAdaptiveHint}
      isGentleRetry={consecutiveFails > 0}
      muted={save.muted}
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
          nextLevelId={getRecommendedCampaignLevel(save).id}
          activeCharacter={activeCharacter}
          profileName={activeProfileName}
          totalStars={totalStarsEarned}
          totalBolts={save.totalBolts}
          streak={activeStreak}
          dailyStars={save.daily.dateKey === getDailyDateKey() ? save.daily.stars : 0}
          trophyTiers={trophyTiers}
          claimableQuestsCount={claimableQuestsCount}
          muted={save.muted}
          onStartJunior={handleStartJunior}
          onStartMission={() => {
            SFX.click();
            beginLevel(getRecommendedCampaignLevel(save));
          }}
          onStartDaily={() => {
            SFX.click();
            beginLevel(generateDailyChallenge(getDailyDateKey()));
          }}
          onOpenGameRoom={() => {
            SFX.click();
            setShowGameRoom(true);
          }}
          onOpenShop={() => {
            SFX.click();
            setShowShop(true);
          }}
          onOpenQuests={() => {
            SFX.click();
            setShowQuests(true);
          }}
          onOpenLevelMap={() => {
            SFX.click();
            setMapInitialTab('story');
            setShowMap(true);
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
          missionVoiceText={(mode==='BUILD_3D'||mode==='CODE_3D'||mode==='CIRCUIT_3D') && !activeMissionTutorialStep && !currentAdaptiveHint && !pendingPredictQuiz && !showMap && !showProfile && !paused ? missionVoice(currentLevel) : ''}
          ghostHelp={ghostHelp}
          moodCue={currentAdaptiveHint || activeMissionTutorialStep ? null : moodCue}
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
              beginLevel(currentLevel, false, juniorSession);
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
          tutorialStep={tutorialStep}
          ghostHelp={ghostHelp}
          camera={workshopCameraControls}
          inspectMode={inspect3D}
          lowGraphics={lowGraphics}
          installPhase={installPhase}
          lastPlacement={lastPlacement}
          hintBanner={mode === 'BUILD_3D' ? adaptiveHintElement : null}
          suppressInlineGuide={Boolean(activeMissionTutorialStep)}
          muted={save.muted}
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
          onExit={handleExitPaintBooth}
        />
      )}

      {/* Stage 2: 3D Track Visual Coding */}
      {(mode === 'CODE_3D' || mode === 'SIMULATING') && !pendingPredictQuiz && (
        <CodeDock
          objectiveLabel={getMissionObjectiveLabel(currentLevel)}
          objectiveTarget={currentLevel.objective ? getCollectionRequirement(currentLevel) : null}
          surveyTarget={getSurveyStations(currentLevel)?.length ?? null}
          surveyStations={getSurveyStations(currentLevel)??[]}
          showSignalPatterns={currentLevel.id===23&&Boolean(currentLevel.isBonus)&&!currentLevel.isDaily&&!currentLevel.isSandbox&&!currentLevel.isClassCode&&!currentLevel.isDebug}
          objectiveFeedback={currentLevel.isPrototype || lastFailedSim?.failCode === 'objective_unmet' ? lastFailedSim?.failReason : null}
          junior={juniorSession}
          program={program}
          functionBody={functionBody}
          parBlocks={currentLevel.parBlocks}
          loopUnlocked={currentLevel.loopUnlocked}
          ifUnlocked={Boolean(currentLevel.ifUnlocked || currentLevel.loopUnlocked)}
          elseUnlocked={Boolean(currentLevel.elseUnlocked)}
          functionUnlocked={Boolean(currentLevel.functionUnlocked)}
          waitUnlocked={Boolean(currentLevel.waitUnlocked)}
          hasDynamicHazards={levelHasDynamicHazards(currentLevel)}
          bossMeta={currentLevel.bossMeta || null}
          activeBlockId={activeBlockId}
          activeCallerBlockId={activeCallerBlockId}
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
          canUndo={programHistory.past.length > 0}
          canRedo={programHistory.future.length > 0}
          showPathPreview={showPathPreview}
          pathPreview={livePathPreview}
          predictQuizEnabled={save.predictQuizEnabled !== false}
          onUndo={handleUndoProgram}
          onRedo={handleRedoProgram}
          onTogglePathPreview={() => {
            SFX.uiTick();
            HAPTICS.trigger('tap');
            setShowPathPreview((prev) => !prev);
          }}
          onTogglePredictQuiz={handleTogglePredictQuiz}
          onHoverBlock={setHoveredCodeBlockId}
          onBlockPlaced={handleCodeBlockPlaced}
          onChangeProgram={(next) => {
            SFX.click();
            applyProgramChange(next);
          }}
          onChangeFunctionBody={(next) => {
            SFX.click();
            setFunctionBody(next);
            setMoodCue(null);
            setFailingBlockId(null);
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
          track={currentLevel.track}
          hazards={currentLevel.hazards}
          codeCameraPreset={codeCameraPreset}
          onCycleCameraPreset={() => {
            SFX.uiTick();
            HAPTICS.trigger('tap');
            const nextPreset = getNextCodeCameraPreset(codeCameraPreset);
            setCodeCameraPreset(nextPreset);
            worldRef.current?.setCodeCameraPreset(nextPreset);
          }}
          onFocusTrackTile={(tileIndex) => {
            SFX.uiTick();
            HAPTICS.trigger('tap');
            worldRef.current?.focusCodeTrackTile(tileIndex);
          }}
          debugClue={currentLevel.debugClue || null}
          onResetDebugCode={currentLevel.starterProgram ? handleResetDebugStarterCode : undefined}
        />
      )}

      {/* Predict-Before-Run ("Brain Spark") Interactive Pre-Run Check */}
      {mode === 'CODE_3D' && pendingPredictQuiz && (
        <PredictBeforeRunCard
          question={pendingPredictQuiz.question}
          track={currentLevel.track}
          program={program}
          muted={save.muted}
          autoReadAloud={Boolean(save.readAloudEnabled)}
          onComplete={handlePredictQuizComplete}
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
          onJump={() => {
            HAPTICS.trigger('jump');
            worldRef.current?.jumpActionDash();
          }}
        />
      )}

      {/* Stage 5: Playable 3D Alien Planet Equipment Adventure */}
      {mode === 'PLANET_ADVENTURE_3D' && planetMetrics && (
        <PlanetAdventureHud
          metrics={planetMetrics}
          onMoveInput={(forward, strafe) => worldRef.current?.setPlanetMoveInput(forward, strafe)}
          onJump={() => {
            HAPTICS.trigger('jump');
            worldRef.current?.jumpPlanetAdventure();
          }}
          onBoost={() => {
            HAPTICS.trigger('boost');
            worldRef.current?.triggerPlanetBoost();
          }}
          onLaser={() => {
            HAPTICS.trigger('laser');
            worldRef.current?.firePlanetLaser();
          }}
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
        !showQuests &&
        !currentAdaptiveHint &&
        !activeMissionTutorialStep &&
        !paused && <RobotSpeechBubble speech={robotSpeech} moodCue={moodCue} headPoint={headPoint} />}

      {/* Ghost Hand Visual Demo (hidden while Mission 1 Guided Tutorial spotlight is active) */}
      <GhostHand
        visible={
          ghostHelp &&
          !activeMissionTutorialStep &&
          !paused &&
          !showMap &&
          !showTrophies &&
          !showSettings &&
          !showProfile &&
          !showGameRoom &&
          !showParentDashboard &&
          !showSandbox &&
          !showClassCode &&
          !showShop &&
          !showQuests &&
          !activeDemo &&
          !inspect3D &&
          (mode === 'BUILD_3D' || mode === 'CODE_3D' || mode === 'CIRCUIT_3D')
        }
        step={tutorialStep}
      />

      {/* First Mission Interactive Guided Spotlight Tutorial (Build & Code Phases) */}
      <GuidedTutorialOverlay
        junior={juniorSession}
        muted={save.muted}
        autoReadAloud={Boolean(save.readAloudEnabled)}
        step={activeMissionTutorialStep}
        onAcknowledgeStep={handleAcknowledgeTutorialStep}
        onSkip={handleSkipTutorial}
      />

      {/* Interactive Visual Learning Demo Popover */}
      <ConceptDemoPopover
        demo={activeDemo}
        onSelectDemo={(next) => {
          SFX.uiTick();
          setActiveDemo(next);
        }}
        onClose={() => setActiveDemo(null)}
      />

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
            beginLevel(currentLevel, false, juniorSession);
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
        graphicsQuality={graphicsQuality}
        challengeTimerEnabled={challengeTimerEnabled}
        adaptiveHintsEnabled={save.adaptiveHintsEnabled !== false}
        readAloudEnabled={Boolean(save.readAloudEnabled)}
        hapticsEnabled={save.hapticsEnabled !== false}
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
        onChangeGraphicsQuality={handleChangeGraphicsQuality}
        onToggleChallengeTimer={handleToggleChallengeTimer}
        onToggleAdaptiveHints={handleToggleAdaptiveHints}
        onToggleReadAloud={handleToggleReadAloud}
        onToggleHaptics={handleToggleHaptics}
        onReplayTutorial={handleReplayTutorial}
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
            predictQuizEnabled={save.predictQuizEnabled !== false}
            onToggleAdaptiveHints={handleToggleAdaptiveHints}
            onToggleChallengeTimer={handleToggleChallengeTimer}
            onTogglePredictQuiz={handleTogglePredictQuiz}
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
            equippedDroneId={activeLoadout.equippedDroneId}
            totalBolts={save.totalBolts}
            hasNextLevel={Boolean(nextLevelDef)}
            nextJourney={getJourneyPreview(currentLevel)}
            voiceMuted={save.muted}
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
              if (nextLevelDef) travelToMission(nextLevelDef);
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
      <BoltShopModal
        visible={showShop}
        totalBolts={save.totalBolts}
        loadout={activeLoadout}
        onBuyItem={handleBuyShopItem}
        onToggleEquip={handleToggleEquipShopItem}
        onPreviewLoadout={setShopPreviewLoadout}
        onOpenQuests={() => {
          SFX.click();
          setShowQuests(true);
        }}
        onClose={() => {
          SFX.click();
          setShowShop(false);
        }}
      />

      <QuestBoardModal
        visible={showQuests}
        totalBolts={save.totalBolts}
        counters={activeQuestCounters}
        claimedQuestIds={save.claimedQuestIds || []}
        onClaimQuest={handleClaimQuest}
        onOpenShop={() => {
          SFX.click();
          setShowShop(true);
        }}
        onOpenDebugMissions={() => {
          SFX.click();
          setMapInitialTab('debug');
          setShowMap(true);
        }}
        onClose={() => {
          SFX.click();
          setShowQuests(false);
        }}
      />

      {mode === 'VICTORY' && currentLevel.isPrototype && (
        <div role="dialog" aria-modal="true" aria-label="Practice complete" className="fixed inset-0 z-40 grid place-items-center bg-slate-950/85 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-emerald-400/60 bg-slate-900 p-5 text-center text-white shadow-xl">
            <h2 className="text-2xl font-black">{currentLevel.objective?.kind === 'survey' ? 'Survey complete!' : currentLevel.objective?.kind === 'repair' ? 'Robot repaired!' : 'Collection complete!'}</h2>
            <p className="text-sm text-emerald-200">{currentLevel.objective?.kind === 'survey' ? 'Both research stations observed. Great exploring!' : currentLevel.objective?.kind === 'collect' ? `${lastSimCrystals.collected} crystals delivered. Great planning!` : 'Your repaired program reached the station.'}</p>
            <p className="text-xs text-slate-300">Practice challenge — your story progress stays unchanged.</p>
            <button type="button" className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-slate-950" onClick={()=>beginLevel(currentLevel)}>Play again</button>
            <button type="button" className="min-h-12 w-full rounded-xl border border-sky-400 font-bold" onClick={()=>{setMode('TITLE');worldRef.current?.setMode('TITLE');setMapInitialTab('story');setShowMap(true);}}>Choose mission</button>
          </div>
        </div>
      )}
      <VictoryModal
        nextJourney={getJourneyPreview(currentLevel)}
        missionMessage={getOceanPresentation(currentLevel)?.victory ?? (currentLevel.objective?.kind === 'delivery' ? 'Supplies delivered safely!' : currentLevel.objective?.kind === 'collect' ? 'All required supplies collected and delivered!' : undefined)}
        voiceMuted={save.muted}
        autoVoice={Boolean(save.readAloudEnabled)}
        learningGoal={getMissionLearningGoal(currentLevel)}
        visible={mode === 'VICTORY' && !currentLevel.isPrototype && !showGameRoom && !showShop && !showQuests}
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
        isDebugMission={Boolean(currentLevel.isDebug)}
        debugBoltReward={lastDebugBoltReward}
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
          beginLevel(currentLevel, true, juniorSession);
        }}
        onOpenMap={() => {
          SFX.click();
          setMapInitialTab(currentLevel.isDebug ? 'debug' : 'story');
          setShowMap(true);
        }}
        onOpenTrophies={() => {
          SFX.click();
          setTrophyInitialTab(newlyUnlockedFacts.length > 0 ? 'facts' : 'badges');
          setShowTrophies(true);
        }}
        onOpenShop={() => {
          SFX.click();
          setShowShop(true);
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
          if (nextLevelDef) travelToMission(nextLevelDef);
        }}
      />

      <LevelMapModal
        visible={showMap}
        save={save}
        currentLevelId={currentLevel.id}
        initialTab={mapInitialTab}
        onSelectLevel={(id) => {
          SFX.click();
          const target = getLevelById(id);
          if(target&&canEnterCampaign(target,save))travelToMission(target);
        }}
        onSelectPrototype={(id)=>{const level=getMissionPrototype(id);if(level){SFX.click();beginLevel(level);}}}
        onSelectDebugMission={handleSelectDebugMission}
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
          beginLevel(currentLevel, false, juniorSession);
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

      {missionTravel&&!webglLost&&<MissionTravelOverlay travel={missionTravel} onFinish={finishMissionTravel}/>}
      {/* WebGL Context Lost Recovery */}
      {webglLost && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="3D graphics recovery"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-6 backdrop-blur-md"
        >
          <div className="w-full max-w-sm rounded-3xl border border-sky-400/45 bg-slate-900/95 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-black text-white">Let's get back to playing</h2>
            <p className="mt-1.5 text-xs text-slate-300">
              SparkBot needs a quick restart. Tap below to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Reload 3D Scene"
              className="mx-auto mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-400 px-6 text-sm font-black text-slate-950 shadow-lg transition-transform hover:bg-sky-300 active:scale-95"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      )}
      {/* Offline PWA Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
