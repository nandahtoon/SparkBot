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
  computeStemSkillBadges,
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
  recordDailyCompletion,
  recordDailyLogin,
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
  type SimResult,
  type StemPillarId
} from './game/engine';
import {
  computeTotalStarsEarned,
  ensureActionDashChassis,
  getLevelSavedStars,
  loadSaveProfile,
  normalizeProfileName,
  persistSaveProfile,
  renameSaveProfile,
  validateProfileName
} from './game/profileStorage';
import { SFX } from './game/audio';
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
import { UnifiedWorldController, type WorldMode } from './three/worldScene';
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
import { TrophyShelfModal } from './components/TrophyShelfModal';
import { SettingsModal } from './components/SettingsModal';
import { RobotSpeechBubble } from './components/RobotSpeechBubble';
import { GameRoomModal, type GameRoomRoundSummary } from './components/GameRoomModal';
import { PlanetAdventureHud } from './components/PlanetAdventureHud';
import {
  computePlanetAdventureReward,
  type PlanetAdventureMetrics
} from './game/planetAdventure';
import type { WorkshopCameraControls } from './components/WorkshopOrbitStrip';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<UnifiedWorldController | null>(null);

  const [save, setSave] = useState<SaveProfile>(() => {
    const loaded = loadSaveProfile();
    const today = getDailyDateKey();
    const loginRes = recordDailyLogin(loaded.daily, today);
    const updated: SaveProfile = { ...loaded, daily: loginRes.daily };
    persistSaveProfile(updated);
    return updated;
  });

  const [mode, setMode] = useState<WorldMode>('TITLE');
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGameRoom, setShowGameRoom] = useState(false);
  const [selectedPaintPart, setSelectedPaintPart] = useState<PaintPartKey>('chassis');
  const [activeDemo, setActiveDemo] = useState<DemoRequest | null>(null);
  const [upgradedPillars, setUpgradedPillars] = useState<StemPillarId[]>([]);
  const [webglLost, setWebglLost] = useState(false);
  const [workshopAutoSpin, setWorkshopAutoSpin] = useState(false);
  const [inspect3D, setInspect3D] = useState(false);
  const [installPhase, setInstallPhase] = useState<'idle' | 'working' | 'celebrating'>('idle');
  const [robotSpeech, setRobotSpeech] = useState<(RobotSpeechEvent & { id: number }) | null>(null);
  const [headPoint, setHeadPoint] = useState<HeadScreenPoint | null>(null);

  const speechTimerRef = useRef<number | null>(null);
  const speechIdRef = useRef(0);
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
  const [levelElapsedMs, setLevelElapsedMs] = useState(0);
  const levelElapsedRef = useRef(0);
  const [circuitSolvedFreeze, setCircuitSolvedFreeze] = useState(false);
  const [lastVictorySpeedRun, setLastVictorySpeedRun] =
    useState<VictorySpeedRunSummary | null>(null);

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
    (mode === 'BUILD_3D' ||
      mode === 'CODE_3D' ||
      mode === 'SIMULATING' ||
      mode === 'CIRCUIT_3D');

  // Tick optional challenge timer during active mission gameplay only
  useEffect(() => {
    if (!isChallengeTimerRunning) return;
    let lastTick = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.max(0, Math.min(500, now - lastTick));
      lastTick = now;
      levelElapsedRef.current += delta;
      setLevelElapsedMs(levelElapsedRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [isChallengeTimerRunning]);

  // Sync master mute + granular channel volume sliders
  useEffect(() => {
    SFX.applySettings(save.muted, normalizedAudio);
  }, [save.muted, normalizedAudio]);

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
      SFX.cancelSpeech();
    };
  }, []);

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
      setWorkshopAutoSpin(false);
      setInspect3D(false);
      setInstallPhase('idle');
      levelElapsedRef.current = 0;
      setLevelElapsedMs(0);
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
    [chassis, save.tutorialDone]
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
      const mastery = recordSkillMastery(
        cur.save.skillStats,
        cur.currentLevel,
        cur.chassis,
        cur.program,
        sim
      );
      setUpgradedPillars(mastery.upgradedPillars);
      setSave((prev) => {
        const next: SaveProfile = {
          ...prev,
          stars: { ...prev.stars },
          bonusStars: { ...prev.bonusStars },
          tutorialDone: true,
          totalBolts: prev.totalBolts + 50 + speedRunEval.bonusBolts,
          passes: prev.passes + 1,
          skillStats: mastery.next,
          bestTimes: speedRunEval.enabled
            ? updateBestCompletionTime(prev.bestTimes, levelTimerKey, speedRunEval.elapsedMs).next
            : prev.bestTimes
        };
        if (cur.currentLevel.isDaily) {
          next.daily = recordDailyCompletion(
            prev.daily,
            cur.currentLevel.dailyDateKey || getDailyDateKey(),
            starRes.stars
          );
        } else if (cur.currentLevel.isBonus) {
          const oldRec = prev.bonusStars[cur.currentLevel.id];
          const oldStars = typeof oldRec === 'object' ? oldRec.stars : typeof oldRec === 'number' ? oldRec : 0;
          const oldBonus = typeof oldRec === 'object' ? oldRec.bonusStar : false;
          next.bonusStars[cur.currentLevel.id] = {
            stars: Math.max(oldStars, starRes.stars),
            bonusStar: oldBonus || isBonusStar
          };
        } else {
          next.stars[cur.currentLevel.id] = Math.max(
            prev.stars[cur.currentLevel.id] || 0,
            starRes.stars
          );
          if (cur.currentLevel.id >= prev.unlockedLevel && cur.currentLevel.id < LEVELS.length) {
            next.unlockedLevel = cur.currentLevel.id + 1;
          }
        }
        persistSaveProfile(next);
        return next;
      });

      window.setTimeout(() => {
        setMode('VICTORY');
        worldRef.current?.setMode('VICTORY');
      }, 650);
    }
  }, []);

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
      setMoodCue({ mood: 'happy' });
      window.setTimeout(() => {
        setMoodCue(null);
        setMode('CIRCUIT_3D');
        worldRef.current?.setMode('CIRCUIT_3D');
      }, 850);
    } else if (res.failCode === 'empty' || res.failCode === 'empty_container' || res.failCode === 'short') {
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
      persistSaveProfile(next);
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
        persistSaveProfile(next);
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

  // Mount Three.js World ONCE
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = new UnifiedWorldController(el, {
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

    const initialLvl = getLevelById(Math.min(LEVELS.length, Math.max(1, save.unlockedLevel || 1))) || LEVELS[0];
    const initTheme = normalizeBotTheme(save.botTheme);
    const initChar = normalizeBotCharacter(save.botCharacter);
    const initPaint = normalizePaintConfig(save.paintBooth, initTheme, initChar);
    ctrl.setLevel(initialLvl);
    ctrl.setGentleSpeed(save.gentleSpeed);
    ctrl.setLowGraphics(Boolean(save.lowGraphics));
    ctrl.setBotTheme(initTheme);
    ctrl.setBotCharacter(initChar, false);
    ctrl.setPaintConfig(initPaint, null);

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setMode('BUILD_3D');
      setGhostHelp(initialLvl.id === 1 && !save.tutorialDone);
      ctrl.updateChassis(chassis, null);
      ctrl.setMode('BUILD_3D');
    } else {
      ctrl.setMode('TITLE');
    }

    return () => {
      ctrl.dispose();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Keyboard Shortcuts (Enter/Space on Title, Esc/P Pause, WASD/Arrows/Space in Action Dash)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (showGameRoom) {
        if (e.key === 'Escape') setShowGameRoom(false);
        return;
      }

      if (showProfile) {
        if (e.key === 'Escape') setShowProfile(false);
        return;
      }

      if (showSettings) {
        if (e.key === 'Escape') setShowSettings(false);
        return;
      }

      if (mode === 'TITLE' && !showMap) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          SFX.click();
          beginLevel(currentLevel);
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (showMap) {
          setShowMap(false);
        } else if (mode === 'PAINT_BOOTH' && e.key === 'Escape') {
          setWorkshopAutoSpin(false);
          worldRef.current?.setWorkshopAutoSpin(false);
          setMode('BUILD_3D');
          worldRef.current?.setMode('BUILD_3D');
        } else if (mode !== 'TITLE' && mode !== 'VICTORY') {
          setPaused((p) => !p);
        }
        return;
      }

      if (mode === 'ACTION_RUN_3D' && !paused) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          worldRef.current?.steerActionDash(-1);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          worldRef.current?.steerActionDash(1);
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
          e.preventDefault();
          worldRef.current?.jumpActionDash();
        }
      }

      if (mode === 'PLANET_ADVENTURE_3D' && !paused) {
        const k = e.key.toLowerCase();
        if (
          k === 'w' ||
          k === 's' ||
          k === 'a' ||
          k === 'd' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          e.preventDefault();
          planetKeysRef.current.add(k === e.key.toLowerCase() ? k : e.key);
          const keys = planetKeysRef.current;
          const forward =
            (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) -
            (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
          const strafe =
            (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) -
            (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
          worldRef.current?.setPlanetMoveInput(forward, strafe);
        } else if (e.key === ' ') {
          e.preventDefault();
          worldRef.current?.jumpPlanetAdventure();
        } else if (e.key === 'Shift') {
          e.preventDefault();
          worldRef.current?.triggerPlanetBoost();
        } else if (k === 'e' || k === 'f') {
          e.preventDefault();
          worldRef.current?.firePlanetLaser();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (mode !== 'PLANET_ADVENTURE_3D') return;
      const k = e.key.toLowerCase();
      planetKeysRef.current.delete(k === e.key.toLowerCase() ? k : e.key);
      const keys = planetKeysRef.current;
      const forward =
        (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
      const strafe =
        (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      worldRef.current?.setPlanetMoveInput(forward, strafe);
    };

    const onBlur = () => {
      planetKeysRef.current.clear();
      worldRef.current?.setPlanetMoveInput(0, 0);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [beginLevel, currentLevel, mode, paused, showGameRoom, showMap, showProfile, showSettings]);

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
      persistSaveProfile(next);
      return next;
    });
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !save.muted;
    SFX.applySettings(nextMuted, normalizedAudio);
    if (!nextMuted) SFX.click();
    setSave((prev) => {
      const next = { ...prev, muted: nextMuted };
      persistSaveProfile(next);
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
      const next: SaveProfile = { ...prev, audio: merged };
      persistSaveProfile(next);
      return next;
    });
  };

  const handleToggleSpeed = () => {
    setSave((prev) => {
      const next = { ...prev, gentleSpeed: !prev.gentleSpeed };
      worldRef.current?.setGentleSpeed(next.gentleSpeed);
      persistSaveProfile(next);
      return next;
    });
  };

  const handleToggleLowGraphics = () => {
    SFX.uiTick();
    setSave((prev) => {
      const nextLow = !Boolean(prev.lowGraphics);
      const next: SaveProfile = { ...prev, lowGraphics: nextLow };
      worldRef.current?.setLowGraphics(nextLow);
      persistSaveProfile(next);
      return next;
    });
  };

  const handleToggleChallengeTimer = () => {
    SFX.uiTick();
    const nextEnabled = !challengeTimerEnabled;
    if (nextEnabled && mode !== 'VICTORY') {
      levelElapsedRef.current = 0;
      setLevelElapsedMs(0);
    }
    if (!nextEnabled) {
      setLastVictorySpeedRun(null);
    }
    setSave((prev) => {
      const next: SaveProfile = { ...prev, challengeTimerEnabled: nextEnabled };
      persistSaveProfile(next);
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
      persistSaveProfile(next);
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
      persistSaveProfile(next);
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
        persistSaveProfile(res.save);
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
      persistSaveProfile(next);
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
      persistSaveProfile(next);
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
      persistSaveProfile(next);
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
      persistSaveProfile(next);
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
      persistSaveProfile(next);
      return next;
    });
  };

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
    () => computeStemSkillBadges(save.skillStats).reduce((s, b) => s + b.tier, 0),
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
          onBlockPlaced={handleCodeBlockPlaced}
          onChangeProgram={(next) => {
            SFX.click();
            setMoodCue(null);
            setProgram(next);
          }}
          onRunProgram={handleRunProgram}
          onStepProgram={handleStepProgram}
          onToggleSimPause={handleToggleSimPause}
          onNextSimStep={handleNextSimStep}
          onStopSim={handleStopSim}
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
          onTapCell={handleCircuitCellTap}
          onOpenDemo={(topic) => {
            SFX.click();
            setActiveDemo({ topic });
          }}
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
      {!showSettings && !showProfile && !showMap && !showTrophies && !showGameRoom && !paused && (
        <RobotSpeechBubble speech={robotSpeech} headPoint={headPoint} />
      )}

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
          !activeDemo &&
          !inspect3D &&
          (mode === 'BUILD_3D' || mode === 'CODE_3D' || mode === 'CIRCUIT_3D')
        }
        step={tutorialStep}
      />

      {/* Interactive Visual Learning Demo Popover */}
      <ConceptDemoPopover demo={activeDemo} onClose={() => setActiveDemo(null)} />

      {/* Bot Character Profile Selector Modal */}
      <BotProfileModal
        visible={showProfile}
        profileName={activeProfileName}
        activeCharacter={activeCharacter}
        totalStars={totalStarsEarned}
        totalBolts={save.totalBolts}
        savedThemes={savedPaintThemes}
        canOpenPaintBooth={mode === 'BUILD_3D' || mode === 'TITLE'}
        onRenameProfile={handleRenameProfile}
        onSelectCharacter={handleSelectCharacter}
        onOpenPaintBooth={() => {
          if (mode === 'TITLE') {
            beginLevel(currentLevel);
            window.setTimeout(() => handleEnterPaintBooth(), 30);
          } else {
            handleEnterPaintBooth();
          }
        }}
        onClose={() => {
          SFX.click();
          setShowProfile(false);
        }}
      />

      {/* STEM Skill Trophy Shelf */}
      <TrophyShelfModal
        visible={showTrophies}
        profileName={activeProfileName}
        skillStats={save.skillStats}
        upgradedPillars={upgradedPillars}
        onClose={() => setShowTrophies(false)}
      />

      {/* Audio & Workshop Settings Modal */}
      <SettingsModal
        visible={showSettings}
        muted={save.muted}
        audio={normalizedAudio}
        gentleSpeed={save.gentleSpeed}
        lowGraphics={lowGraphics}
        challengeTimerEnabled={challengeTimerEnabled}
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
        onClose={() => {
          SFX.click();
          setShowSettings(false);
        }}
      />

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
        upgradedPillars={upgradedPillars}
        speedRun={lastVictorySpeedRun}
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
          setShowTrophies(true);
        }}
        onNextLevel={() => {
          SFX.click();
          if (nextLevelDef) beginLevel(nextLevelDef);
        }}
      />

      {/* Post-Mission Arcade Game Room */}
      <GameRoomModal
        visible={showGameRoom}
        activeCharacter={activeCharacter}
        totalBolts={save.totalBolts}
        hasNextLevel={Boolean(nextLevelDef)}
        chassisInfo={chassisInfo}
        externalSummary={planetSummary}
        onClearExternalSummary={() => setPlanetSummary(null)}
        onAwardBolts={(bolts) => handleAwardArcadeBolts(bolts)}
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
