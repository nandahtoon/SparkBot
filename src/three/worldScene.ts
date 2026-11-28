import * as THREE from 'three';
import { getJourneyPreview } from '../game/journey';
import { getWorldArchitecture } from '../game/worldArchitecture';
import { requiresMissionCircuit } from '../game/missionObjectives';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {
  BotCharacterId,
  BotThemeId,
  ChassisGrid,
  CircuitGrid,
  GhostPreviewPlan,
  LevelDef,
  PaintBoothConfig,
  PaintPartKey,
  PartId,
  SimEvent,
  SimResult
} from '../game/engine';
import {
  applyBoltCollection,
  BOT_THEMES,
  computeChassisInfo,
  createActionDashMetrics,
  evaluateAllHazardsAtTick,
  normalizeBotCharacter,
  normalizeBotTheme,
  normalizePaintConfig,
  stepActionSurfaceMove,
  traceCircuit,
  type ActionDashMetrics,
  type DynamicHazardDef
} from '../game/engine';
import { SFX } from '../game/audio';
import {
  createProceduralTextures,
  detectSoftwareGl,
  getSharedTextureSet,
  scheduleAfterDraw
} from './materials';
import { clearAndDisposeGroup, disposeObject3D } from './disposeUtils';
import {
  clampWorkshopOrbit,
  DEFAULT_WORKSHOP_ORBIT,
  type WorkshopOrbitState
} from '../game/audioConfig';
import type { RobotTouchZone } from '../game/robotVoice';
import {
  AdaptiveQualityMonitor,
  getGraphicsQualityBudget,
  type GraphicsQualityBudget,
  type GraphicsQualityMode
} from '../game/graphicsConfig';
import { CameraJuiceController } from '../game/springPhysics';
import { RenderPipeline } from './renderPipeline';
import { VfxManager } from './vfxManager';
import {
  CIRCUIT_BOARD_Y,
  CIRCUIT_BOARD_Z_OFFSET,
  CIRCUIT_BOT_X,
  clampTrackBotZBeforeClosedGate,
  GATE_BOT_STOP_Z_OFFSET,
  GATE_DECK_WIDTH,
  GATE_WALL_Z_OFFSET,
  getTrackBotStopZ,
  RAMP_WEDGE_CENTER_Y,
  RAMP_WEDGE_LENGTH,
  RAMP_WEDGE_ROT_X,
  RAMP_WEDGE_THICKNESS,
  sampleTrackSurfaceAtZ,
  TRACK_START_Z,
  TRACK_TILE_SPACING
} from '../game/trackSurface';
import type { CodeBlockFeedback, CodeComplexityTier } from '../game/codeFeedback';
import {
  isPreviewItemHighlighted,
  samplePathSegmentPoint,
  samplePathSegmentPointInto,
  type LivePathPreview,
  type PathPreviewSegment
} from '../game/pathPreview';
import {
  CHASSIS_SLOT_OFFSETS,
  createRobotRig,
  type BotMood,
  type HeadScreenPoint,
  type SlotScreenPoint
} from './robotRig';
import {
  buildWorkshopEnvironment,
  createGearGeometry as createWorkshopGearGeometry,
  type WorkshopEnvironmentHandles
} from './workshopEnvironment';
import { computeResponsiveCameraFraming } from './responsiveCamera';
import {
  clampCodeCameraState,
  computeCodeCameraPreset,
  computeTileFocusCameraState,
  evaluateCodeCameraVectors,
  type CodeCameraPreset,
  type CodeCameraState
} from './codeCamera';
import {
  clampPlanetPosition,
  computePlanetObjectiveGuide,
  createInitialPlanetMetrics,
  derivePlanetCapabilities,
  findLaserTargetBarrier,
  getBotForwardXZ,
  getPlanetBogSpeedMultiplier,
  getPlanetGroundY,
  getPlanetPullRadius,
  isPointInPlanetBog,
  PLANET_EXIT_GATE,
  PLANET_SPAWN,
  type PlanetAdventureMetrics
} from '../game/planetAdventure';
import { buildAlienPlanetWorld, type AlienPlanetWorldHandles } from './planetWorld';
import { createCompanionDroneRig, type CompanionDroneRig } from './companionDrone';
import {
  createDefaultLoadout,
  getTrailPalette,
  normalizePlayerLoadout,
  type PlayerLoadout
} from '../game/shopAndQuests';
import { BIOME_THEMES, getBiomeForLevel, type BiomeThemeDef } from '../game/biomes';

export type WorldMode =
  | 'TITLE'
  | 'BUILD_3D'
  | 'PAINT_BOOTH'
  | 'CODE_3D'
  | 'SIMULATING'
  | 'CIRCUIT_3D'
  | 'ACTION_RUN_3D'
  | 'PLANET_ADVENTURE_3D'
  | 'VICTORY';

export interface WorldCallbacks {
  onBotTap: (zone: RobotTouchZone) => void;
  onDroneTap?: () => void;
  onPaintPartPick?: (part: PaintPartKey) => void;
  onInstallCelebrate?: (part: PartId) => void;
  onInstallPhaseChange?: (phase: 'idle' | 'working' | 'celebrating') => void;
  onCircuitCellTap: (r: number, c: number) => void;
  onSimProgress: (eventIndex: number, ev: SimEvent) => void;
  onSimPauseChange?: (paused: boolean, awaitingStep: boolean, isLastStep: boolean) => void;
  onSimComplete: (result: SimResult) => void;
  onActionMetrics: (metrics: ActionDashMetrics) => void;
  onActionFinish: (metrics: ActionDashMetrics) => void;
  onPlanetMetrics?: (metrics: PlanetAdventureMetrics) => void;
  onPlanetFinish?: (metrics: PlanetAdventureMetrics) => void;
  onSlotScreenUpdate: (pts: SlotScreenPoint[]) => void;
  onHeadScreenUpdate?: (pt: HeadScreenPoint) => void;
  onCodeCameraPresetChange?: (preset: CodeCameraPreset) => void;
  onWebglLost: (lost: boolean) => void;
}

interface SimStepAnim {
  ev: SimEvent;
  duration: number;
}

interface RunnerEntity {
  group: THREE.Group;
  kind: 'bolt' | 'gear' | 'barrier' | 'oil';
  z: number;
  lane: number;
  surface: 'floor' | 'leftWall' | 'rightWall';
  active: boolean;
}

interface LaserBarrierVisual {
  kind: 'laser_barrier';
  def: DynamicHazardDef;
  group: THREE.Group;
  beamGroup: THREE.Group;
  capMats: THREE.MeshStandardMaterial[];
  targetActive: boolean;
  beamScale: number;
}

interface PatrolDroneVisual {
  kind: 'patrol_drone';
  def: DynamicHazardDef;
  podGroup: THREE.Group;
  rotorGroup: THREE.Group;
  targetZ: number;
  targetYaw: number;
}

type DynamicHazardVisual = LaserBarrierVisual | PatrolDroneVisual;

interface BossSentinelRig {
  group: THREE.Group;
  coreGroup: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  petals: THREE.Group[];
  totalCores: number;
  litCores: number;
}

const TILE_SPACING = TRACK_TILE_SPACING;
const LANE_X = [-2.2, 0, 2.2];
const WALL_X = 3.85;
const WALL_Y = [1.5, 3.2];

// Pre-allocated scratch math objects (zero allocations inside render loop)
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _curLook = new THREE.Vector3(0, 1.0, 0);
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _beamMid = new THREE.Vector3();
const _beamUp = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _ghostPos = new THREE.Vector3();
const _arcPos = new THREE.Vector3();
const _weldStart = new THREE.Vector3();
const _weldEnd = new THREE.Vector3();
const _weldDiff = new THREE.Vector3();
const _droneGoal = new THREE.Vector3();

export function createGearGeometry(radius: number, teeth: number, thickness: number): THREE.ExtrudeGeometry {
  return createWorkshopGearGeometry(radius, teeth, thickness);
}

export class UnifiedWorldController {
  private container: HTMLElement;
  private cb: WorldCallbacks;
  private renderer: THREE.WebGLRenderer | null = null;
  private renderPipeline: RenderPipeline | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private camBasePos = new THREE.Vector3(3.2, 2.5, 5.2);
  private cameraJuice = new CameraJuiceController();
  private isSoftwareGl: boolean;
  private qualityMonitor: AdaptiveQualityMonitor;
  private qualityBudget: GraphicsQualityBudget;
  private vfx: VfxManager;
  private tex;
  private sharedTextures: Set<THREE.Texture>;
  private envMapTexture: THREE.Texture | null = null;
  private contextLost = false;
  private rig;
  private companionDrone: CompanionDroneRig;
  private activeLoadout: PlayerLoadout = createDefaultLoadout();
  private trailPalette: number[] = getTrailPalette('classic_spark');
  private trailColorCursor = 0;
  private activeBiome: BiomeThemeDef = BIOME_THEMES.skyport_canyon;

  private mode: WorldMode = 'TITLE';
  private gentleSpeed = true;
  private lowGraphics = false;
  private level: LevelDef | null = null;
  private chassis: ChassisGrid = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
  private hoverSlot: { r: number; c: number; valid: boolean; part: PartId } | null = null;
  private circuitGrid: CircuitGrid = [];

  private botMood: BotMood = 'neutral';
  private moodTimer = 0;
  private buildTargetSlot: [number, number] | null = null;
  private buildTimer = 0;
  private celebrateTimer = 0;
  private touchTimer = 0;
  private codeFeedbackTier: CodeComplexityTier | null = null;
  private codeFeedbackTimer = 0;
  private codeFeedbackDuration = 0;
  private installSeq: {
    slot: [number, number];
    part: PartId;
    startMs: number;
    elapsed: number;
    sparkStage: number;
    celebrated: boolean;
  } | null = null;
  private lookX = 0;
  private lookY = 0;

  // Interactive 360° Rotatable 3D Model View state in BUILD_3D
  private orbitTarget: WorkshopOrbitState = { ...DEFAULT_WORKSHOP_ORBIT };
  private orbitCurrent: WorkshopOrbitState = { ...DEFAULT_WORKSHOP_ORBIT };
  private workshopAutoSpin = false;
  private pointerDownActive = false;
  private pointerDownId = -1;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerLastX = 0;
  private pointerLastY = 0;
  private pointerDragged = false;
  private activePointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartOrbitDist = DEFAULT_WORKSHOP_ORBIT.distance;
  private codePinchStartDist = 15;
  private swipeConsumed = false;
  private resizeObserver: ResizeObserver | null = null;

  // Interactive 3D Track Inspection Camera state in CODE_3D (orbit, pan, pinch-zoom, presets)
  private codeCamPreset: CodeCameraPreset = 'overview';
  private codeCamUserDragged = false;
  private codeCamTarget: CodeCameraState = {
    yaw: 0.52,
    pitch: 0.37,
    distance: 14.6,
    focusZ: -9.6,
    lookYBias: -0.15
  };
  private codeCamCurrent: CodeCameraState = {
    yaw: 0.52,
    pitch: 0.37,
    distance: 14.6,
    focusZ: -9.6,
    lookYBias: -0.15
  };

  // Extracted Skyport & Workshop Environment Handles
  private env: WorkshopEnvironmentHandles;

  // Groups
  private trackGroup = new THREE.Group();
  private crystalMeshes: Map<number, THREE.Mesh> = new Map();
  private surveyMarkers = new Map<number, THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>>();
  private surveyedStations = new Set<number>();
  private dynamicHazardVisuals: Map<string, DynamicHazardVisual> = new Map();
  private bossRig: BossSentinelRig | null = null;
  private lastHazardTick = 0;
  private gateLeftDoor: THREE.Mesh | null = null;
  private gateRightDoor: THREE.Mesh | null = null;
  private gateOpenAmt = 0;

  // 3D Circuit Board on Gate
  private circuitGroup = new THREE.Group();
  private circuitCellMeshes: THREE.Object3D[][] = [];
  private circuitBeamGroup = new THREE.Group();
  private circuitInteractables: THREE.Object3D[] = [];

  // Runner velocity tracking for slipstream trails
  private prevRunnerBotX = 0;
  private prevRunnerBotY = 0;

  // Track Simulation Playback
  private simQueue: SimStepAnim[] = [];
  private simIndex = -1;
  private simElapsed = 0;
  private simResult: SimResult | null = null;
  private simPaused = false;
  private simStepMode = false;
  private simStepFinished = false;
  private botTrackZ = 0;
  private botTrackY = 0;
  private botTrackPitchX = 0;
  private simFromZ = 0;
  private simToZ = 0;
  private simScanMatch: boolean | null = null;
  private simFailResetTimer = 0;

  // Action Wall-Run State
  private runnerGroup = new THREE.Group();
  private runnerSegments: THREE.Group[] = [];
  private runnerEntities: RunnerEntity[] = [];
  private runnerMetrics: ActionDashMetrics | null = null;
  private runnerBaseZ = -18;
  private runnerBotX = 0;
  private runnerBotY = 0;
  private runnerBotRoll = 0;
  private runnerJumpY = 0;
  private runnerJumpVy = 0;
  private runnerSpeed = 14;
  private runnerEndless = false;
  private runnerMetricTimer = 0;

  // Alien Planet Adventure State
  private planetWorld: AlienPlanetWorldHandles | null = null;
  private planetMetrics: PlanetAdventureMetrics | null = null;
  private planetBotX: number = PLANET_SPAWN.x;
  private planetBotY = 0;
  private planetBotZ: number = PLANET_SPAWN.z;
  private planetBotYaw: number = PLANET_SPAWN.yaw;
  private planetBotVy = 0;
  private planetJumpsUsed = 0;
  private planetMoveForward = 0;
  private planetMoveStrafe = 0;
  private planetLaserFlashTimer = 0;
  private planetMetricTimer = 0;

  // Playable 3D Holographic Ghost Preview
  private ghostGroup = new THREE.Group();
  private ghostBotGroup = new THREE.Group();
  private ghostPartOrb!: THREE.Mesh;
  private ghostArcDots: THREE.Mesh[] = [];
  private ghostCircuitRing!: THREE.Mesh;
  private ghostPlan: GhostPreviewPlan | null = null;
  private ghostElapsed = 0;
  private ghostDuration = 2.8;

  // Live 3D Holographic Trajectory Path Preview (visible in CODE_3D when enabled)
  private pathPreviewGroup = new THREE.Group();
  private pathPreviewModel: LivePathPreview | null = null;
  private pathPreviewEnabled = true;
  private pathPreviewBuiltLowGfx = false;
  private pathHoveredBlockId: string | null = null;
  private pathReducedMotion = false;
  private pathSegmentVisuals: Array<{
    segment: PathPreviewSegment;
    group: THREE.Group;
    materials: THREE.MeshBasicMaterial[];
    baseOpacities: number[];
  }> = [];
  private pathScanVisuals: Array<{
    blockId: string;
    ancestorBlockIds: string[];
    mesh: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
    baseOpacity: number;
    baseY: number;
  }> = [];
  private pathPulseDots: Array<{
    mesh: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
    phaseOffset: number;
  }> = [];
  private pathEndpointBeacon: THREE.Group | null = null;
  private pathEndpointHazardGlyph: THREE.Mesh | null = null;

  // Loop & Input
  private pacer: { cancel: () => void } | null = null;
  private disposed = false;
  private lastTs = 0;
  private totalTime = 0;
  private slotEmitTimer = 0;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private width = 1280;
  private height = 720;

  constructor(container: HTMLElement, callbacks: WorldCallbacks) {
    this.container = container;
    this.cb = callbacks;
    this.isSoftwareGl = detectSoftwareGl();
    this.qualityMonitor = new AdaptiveQualityMonitor({ isSoftwareGl: this.isSoftwareGl });
    this.qualityBudget = this.qualityMonitor.getBudget();
    this.lowGraphics = this.qualityBudget.lowGraphics;

    this.width = Math.max(320, container.clientWidth || window.innerWidth);
    this.height = Math.max(240, container.clientHeight || window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x13203d);
    this.scene.fog = new THREE.FogExp2(0x13203d, 0.0115);

    this.camera = new THREE.PerspectiveCamera(52, this.width / this.height, 0.15, 220);
    this.camera.position.copy(this.camBasePos);
    this.camera.lookAt(0, 1.0, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        alpha: false,
        preserveDrawingBuffer: this.isSoftwareGl,
        powerPreference: 'high-performance'
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.96;
      this.renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, this.qualityBudget.maxPixelRatio)
      );
      this.renderer.setSize(this.width, this.height);
      this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.qualityBudget.shadowsEnabled;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environment = envTex;
      this.scene.environmentIntensity = 0.42;
      this.envMapTexture = envTex;
      pmrem.dispose();

      this.renderPipeline = new RenderPipeline(
        this.renderer,
        this.scene,
        this.camera,
        this.width,
        this.height,
        this.isSoftwareGl,
        this.qualityBudget
      );

      this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
      this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    } catch {
      this.cb.onWebglLost(true);
    }

    const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    this.tex = createProceduralTextures(maxAniso);
    this.sharedTextures = getSharedTextureSet(this.tex);

    this.env = buildWorkshopEnvironment(this.scene, this.tex, this.isSoftwareGl);

    this.rig = createRobotRig(this.tex, this.isSoftwareGl);
    this.scene.add(this.rig.root);

    this.companionDrone = createCompanionDroneRig();
    this.scene.add(this.companionDrone.root);

    this.scene.add(this.trackGroup);
    this.scene.add(this.circuitGroup);
    this.circuitGroup.add(this.circuitBeamGroup);
    this.scene.add(this.runnerGroup);

    this.vfx = new VfxManager(this.scene);

    this.setupGhostPreviewRig();
    this.pathReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cameraJuice.setReducedMotion(this.pathReducedMotion);
    this.pathPreviewGroup.visible = false;
    this.scene.add(this.pathPreviewGroup);
    this.setupActionRunnerPool();
    this.applyQualityBudget(this.qualityBudget);

    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    this.renderer?.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.renderer?.domElement.addEventListener('wheel', this.handleCanvasWheel, { passive: false });

    this.lastTs = performance.now();
    this.tick();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.pacer?.cancel();
    this.pacer = null;
    this.cb.onWebglLost(true);
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    if (this.renderer && !this.disposed) {
      try {
        this.envMapTexture?.dispose();
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = envTex;
        this.scene.environmentIntensity = 0.42;
        this.envMapTexture = envTex;
        pmrem.dispose();
      } catch {
        // Keep rendering cleanly even if PMREM regeneration is skipped
      }
      this.renderPipeline?.rebuildAfterContextRestore(this.qualityBudget);
      this.handleResize();
      this.lastTs = performance.now();
      this.tick();
    }
    this.cb.onWebglLost(false);
  };

  private setupGhostPreviewRig() {
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });

    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.72, 0.64, 2, 0.1), holoMat);
    torso.position.y = 0.76;
    const torsoWire = new THREE.Mesh(new RoundedBoxGeometry(0.79, 0.75, 0.67, 1, 0.1), wireMat);
    torsoWire.position.y = 0.76;

    const head = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.44, 0.52, 2, 0.1), holoMat);
    head.position.y = 1.42;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.14, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    visor.position.set(0, 1.44, -0.27);

    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14);
    [-0.44, 0.44].forEach((wx) => {
      const wheel = new THREE.Mesh(wheelGeo, holoMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.24, 0);
      this.ghostBotGroup.add(wheel);
    });
    this.ghostBotGroup.add(torso, torsoWire, head, visor);
    this.ghostGroup.add(this.ghostBotGroup);

    this.ghostPartOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    );
    this.ghostGroup.add(this.ghostPartOrb);

    const dotGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 8; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.visible = false;
      this.ghostGroup.add(dot);
      this.ghostArcDots.push(dot);
    }

    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    this.ghostCircuitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.05, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 })
    );
    this.ghostCircuitRing.visible = false;
  }

  public playGhostPreview(plan: GhostPreviewPlan) {
    this.ghostPlan = plan;
    this.ghostElapsed = 0;
    this.ghostDuration = plan.kind === 'code' ? Math.max(2.6, plan.simResult.events.length * 0.55) : 2.8;
    SFX.sensorScan(true);
  }

  public clearGhostPreview() {
    this.ghostPlan = null;
    this.ghostGroup.visible = false;
    this.ghostCircuitRing.visible = false;
    this.syncHazardsToTick(0, false);
  }

  public setLivePathPreview(preview: LivePathPreview | null, enabled = true) {
    const modelChanged = this.pathPreviewModel !== preview;
    const gfxChanged = this.pathPreviewBuiltLowGfx !== this.lowGraphics;
    this.pathPreviewEnabled = Boolean(enabled);
    this.pathPreviewModel = preview;
    if (modelChanged || gfxChanged) {
      if (
        modelChanged &&
        this.mode === 'CODE_3D' &&
        (Math.abs(this.botTrackZ - TRACK_START_Z) > 0.05 || this.botTrackY < -0.1)
      ) {
        this.resetBotToTrackStart();
      }
      this.rebuildPathPreview3D();
    }
  }

  public setHoveredCodeBlock(blockId: string | null) {
    this.pathHoveredBlockId = blockId || null;
  }

  private clearPathPreview3D() {
    clearAndDisposeGroup(this.pathPreviewGroup, this.sharedTextures);
    this.pathSegmentVisuals = [];
    this.pathScanVisuals = [];
    this.pathPulseDots = [];
    this.pathEndpointBeacon = null;
    this.pathEndpointHazardGlyph = null;
  }

  private rebuildPathPreview3D() {
    this.clearPathPreview3D();
    this.pathPreviewBuiltLowGfx = this.lowGraphics;

    const model = this.pathPreviewModel;
    const track = this.level?.track;
    if (!model || !track || model.segments.length === 0) {
      return;
    }

    const tubularSegs = this.lowGraphics ? 10 : 18;
    const radialSegs = this.lowGraphics ? 6 : 8;
    const sampleSteps = this.lowGraphics ? 8 : 14;

    for (const seg of model.segments) {
      const segGroup = new THREE.Group();
      const materials: THREE.MeshBasicMaterial[] = [];
      const baseOpacities: number[] = [];

      const hexColor =
        seg.status !== 'ok'
          ? 0xfb7185
          : seg.action === 'WAIT'
            ? 0x22d3ee
            : seg.action === 'JUMP'
              ? 0xa78bfa
              : seg.action === 'BOOST'
                ? 0xfbbf24
                : 0x38bdf8;

      if (seg.action === 'WAIT') {
        const waitSurf = sampleTrackSurfaceAtZ(track, seg.fromZ);
        const waitRingMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const waitRing = new THREE.Mesh(
          new THREE.RingGeometry(0.46, 0.62, this.lowGraphics ? 14 : 24),
          waitRingMat
        );
        waitRing.rotation.x = -Math.PI / 2;
        waitRing.position.set(0, waitSurf.y + 0.075, seg.fromZ);
        const waitGemMat = new THREE.MeshBasicMaterial({
          color: 0xa5f3fc,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        });
        const waitGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), waitGemMat);
        waitGem.position.set(0, waitSurf.y + 0.68, seg.fromZ);
        segGroup.add(waitRing, waitGem);
        materials.push(waitRingMat, waitGemMat);
        baseOpacities.push(0.82, 0.85);
        this.pathPreviewGroup.add(segGroup);
        this.pathSegmentVisuals.push({
          segment: seg,
          group: segGroup,
          materials,
          baseOpacities
        });
        continue;
      }

      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= sampleSteps; i++) {
        const p = samplePathSegmentPoint(track, seg, i / sampleSteps);
        pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      // Guard against identical endpoints (e.g. blocked on gate tile)
      if (pts.length >= 2 && pts[0].distanceToSquared(pts[pts.length - 1]) < 0.002) {
        pts[pts.length - 1].z -= 0.45;
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const radius = seg.action === 'BOOST' ? 0.085 : seg.action === 'MOVE' ? 0.068 : 0.075;

      const coreMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      });
      const coreMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubularSegs, radius, radialSegs, false),
        coreMat
      );
      segGroup.add(coreMesh);
      materials.push(coreMat);
      baseOpacities.push(0.78);

      if (!this.lowGraphics) {
        const auraMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const auraMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, tubularSegs, radius * 1.75, radialSegs, false),
          auraMat
        );
        segGroup.add(auraMesh);
        materials.push(auraMat);
        baseOpacities.push(0.22);
      }

      if (seg.status === 'ok') {
        const endSurf = sampleTrackSurfaceAtZ(track, seg.toZ);
        const ringMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.56,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(0.3, 0.43, this.lowGraphics ? 14 : 24),
          ringMat
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(0, endSurf.y + 0.055, seg.toZ);
        segGroup.add(ringMesh);
        materials.push(ringMat);
        baseOpacities.push(0.56);
      }

      if (seg.action === 'BOOST') {
        const midPt = samplePathSegmentPoint(track, seg, 0.5);
        const chevMat = new THREE.MeshBasicMaterial({
          color: 0xfde68a,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        });
        const chev = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), chevMat);
        chev.rotation.x = -Math.PI / 2;
        chev.position.set(0, midPt.y + 0.02, midPt.z);
        segGroup.add(chev);
        materials.push(chevMat);
        baseOpacities.push(0.85);
      }

      for (const cIdx of seg.newCrystals) {
        const cz = getTrackBotStopZ(track, cIdx);
        const cTile = track[cIdx];
        const cy = cTile?.type === 'ramp' ? 1.34 : 1.0;
        const cHaloMat = new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          transparent: true,
          opacity: 0.82,
          depthWrite: false
        });
        const cHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.56, 0.036, 6, this.lowGraphics ? 14 : 22),
          cHaloMat
        );
        cHalo.rotation.x = Math.PI / 2;
        cHalo.position.set(0, cy, cz);
        segGroup.add(cHalo);
        materials.push(cHaloMat);
        baseOpacities.push(0.82);
      }

      this.pathPreviewGroup.add(segGroup);
      this.pathSegmentVisuals.push({
        segment: seg,
        group: segGroup,
        materials,
        baseOpacities
      });
    }

    for (const scan of model.scans) {
      const scanSurf = sampleTrackSurfaceAtZ(track, scan.scanZ);
      const baseY = scanSurf.y + 1.05;
      const scanColor = scan.matched ? 0x34d399 : 0x94a3b8;
      const baseOpacity = scan.matched ? 0.86 : 0.45;
      const scanMat = new THREE.MeshBasicMaterial({
        color: scanColor,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false
      });
      const scanMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.21, 0), scanMat);
      scanMesh.position.set(0, baseY, scan.scanZ);
      this.pathPreviewGroup.add(scanMesh);
      this.pathScanVisuals.push({
        blockId: scan.blockId,
        ancestorBlockIds: scan.ancestorBlockIds,
        mesh: scanMesh,
        material: scanMat,
        baseOpacity,
        baseY
      });
    }

    if (model.endpoint.status !== 'empty') {
      const epSurf = sampleTrackSurfaceAtZ(track, model.endpoint.z);
      const beacon = new THREE.Group();
      beacon.position.set(0, epSurf.y + 0.06, model.endpoint.z);

      if (model.endpoint.status === 'win') {
        const winMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const outer = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.86, 28), winMat);
        outer.rotation.x = -Math.PI / 2;
        const inner = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 24), winMat.clone());
        inner.rotation.x = -Math.PI / 2;
        beacon.add(outer, inner);
      } else if (model.endpoint.status === 'short') {
        const shortMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.74, 24), shortMat);
        ring.rotation.x = -Math.PI / 2;
        beacon.add(ring);
      } else {
        const hazMat = new THREE.MeshBasicMaterial({
          color: 0xfb7185,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const octRing = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.86, 8), hazMat);
        octRing.rotation.x = -Math.PI / 2;
        const glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), hazMat.clone());
        glyph.position.y = 0.74;
        beacon.add(octRing, glyph);
        this.pathEndpointHazardGlyph = glyph;
      }

      this.pathPreviewGroup.add(beacon);
      this.pathEndpointBeacon = beacon;
    }

    if (!this.lowGraphics && !this.pathReducedMotion) {
      const pulseCount = Math.min(4, Math.max(2, Math.ceil(model.segments.length / 2)));
      for (let i = 0; i < pulseCount; i++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), pMat);
        this.pathPreviewGroup.add(pMesh);
        this.pathPulseDots.push({
          mesh: pMesh,
          material: pMat,
          phaseOffset: i / pulseCount
        });
      }
    }
  }

  public spawnConfetti(x: number, y: number, z: number, count = 32) {
    this.vfx.emitConfetti(x, y, z, this.qualityBudget, count);
  }

  public spawnSparks(x: number, y: number, z: number, colorHex: number, count = 16) {
    this.vfx.emitSparks(x, y, z, colorHex, count, this.qualityBudget);
  }

  public spawnPartPlacementEffects(x: number, y: number, z: number, part: PartId) {
    this.vfx.emitPartPlacementBurst(part, x, y, z, this.qualityBudget);
    this.vfx.emitShockwaveRing(x, y, z, 0x38bdf8, 0.32, 1.5, 0.36);
  }

  public setPlayerLoadout(loadout: PlayerLoadout, celebrate = false) {
    const norm = normalizePlayerLoadout(loadout);
    this.activeLoadout = norm;
    this.trailPalette = getTrailPalette(norm.equippedTrailId);
    this.companionDrone.setDroneStyle(norm.equippedDroneId);
    this.rig.setAccessory(norm.equippedAccessoryId);
    if (celebrate) {
      this.setMood('happy', 1.4);
      this.companionDrone.triggerHappySpin();
      const c = this.nextTrailColor();
      this.spawnSparks(this.rig.root.position.x, this.rig.root.position.y + 1.4, this.rig.root.position.z, c, 18);
    }
  }

  public triggerCompanionCelebrate() {
    this.setMood('happy', 2.4);
    this.companionDrone.triggerCelebrate();
    const pos = this.rig.root.position;
    this.spawnConfetti(pos.x, pos.y + 1.8, pos.z, 34);
    this.spawnSparks(pos.x, pos.y + 1.35, pos.z, this.nextTrailColor(), 20);
  }

  private nextTrailColor(): number {
    const pal = this.trailPalette;
    if (!pal.length) return 0x38bdf8;
    const color = pal[this.trailColorCursor % pal.length];
    this.trailColorCursor = (this.trailColorCursor + 1) % pal.length;
    return color;
  }

  public applyBiomeForLevel(level: LevelDef | null) {
    const biome = getBiomeForLevel(level);
    this.activeBiome = biome;
    if (this.mode !== 'PLANET_ADVENTURE_3D') {
      this.scene.background = new THREE.Color(biome.skyHex);
      this.scene.fog = new THREE.FogExp2(biome.fogHex, biome.fogDensity);
    }
    this.env.applyBiome(biome);
  }

  public setLevel(level: LevelDef) {
    this.level = level;
    this.applyBiomeForLevel(level);
    this.clearGhostPreview();
    this.pathPreviewModel = null;
    this.pathHoveredBlockId = null;
    this.clearPathPreview3D();
    this.rebuildTrack(level);
    this.circuitGrid = level.circuit.map((row) => row.map((c) => ({ ...c })));
    this.rebuildCircuit3D();
    if (this.mode === 'CODE_3D') {
      this.resetBotToTrackStart();
    } else {
      this.resetBotToWorkshop();
    }
  }

  private rebuildTrack(level: LevelDef) {
    clearAndDisposeGroup(this.trackGroup, this.sharedTextures);
    this.crystalMeshes.clear();
    this.surveyMarkers.clear();this.surveyedStations.clear();
    this.dynamicHazardVisuals.clear();
    this.bossRig = null;
    this.lastHazardTick = 0;
    this.gateLeftDoor = null;
    this.gateRightDoor = null;
    this.gateOpenAmt = 0;

    const architecture=getWorldArchitecture(this.activeBiome.id);
    const normalMat = new THREE.MeshStandardMaterial({
      map: this.tex.floorDeck,
      bumpMap: this.tex.floorBump,
      bumpScale: 0.02,
      color: architecture.deck,
      roughness: 0.55,
      metalness: 0.48
    });
    const startMat = new THREE.MeshStandardMaterial({
      map: this.tex.floorDeck,
      color: 0x1d4ed8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.42
    });
    const mudMat = new THREE.MeshStandardMaterial({
      map: this.tex.mudTex,
      roughness: 0.18,
      metalness: 0.12
    });
    const rampMat = new THREE.MeshStandardMaterial({
      map: this.tex.rampTex,
      roughness: 0.38,
      metalness: 0.35,
      emissive: 0x831843,
      emissiveIntensity: 0.35
    });
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.55,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: architecture.rail,
      emissive: architecture.rail,
      emissiveIntensity: 0.42
    });

    const pylonMat = new THREE.MeshStandardMaterial({
      color: architecture.support,
      roughness: 0.45,
      metalness: 0.72
    });
    const pylonGeo = new THREE.CylinderGeometry(0.18, 0.34, 4.2, 8);
    const crystalRingGeo = new THREE.TorusGeometry(0.62, 0.028, 8, 28);
    const crystalRingMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.75
    });

    const track = level.track;
    // A miniature holographic route of the following mission, not traversable geometry.
    const next=getJourneyPreview(level);
    if(next){
      const group=new THREE.Group();group.name='next-mission-hologram';
      group.position.set(3.7,1.4,TRACK_START_Z-(track.length-1)*TILE_SPACING+1.8);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(.78,.95,.16,12),new THREE.MeshStandardMaterial({color:0x164e63,emissive:0x0891b2,emissiveIntensity:.25}));group.add(base);
      const mat=new THREE.MeshBasicMaterial({color:0x67e8f9,transparent:true,opacity:.7});const flagMat=new THREE.MeshBasicMaterial({color:0x34d399});
      const step=new THREE.BoxGeometry(.42,.07,.28);
      const spacing=Math.min(.35,2.5/Math.max(1,next.track.length-1));
      const jewel=new THREE.OctahedronGeometry(.095);
      mat.color.setHex(getWorldArchitecture(next.biome).rail);
      next.track.forEach((tile,i)=>{if(tile.type==='gap')return;const mesh=new THREE.Mesh(step,tile.type==='gate'?flagMat:mat);mesh.position.set(0,.25,.8-i*spacing);group.add(mesh);if(tile.crystal){const crystal=new THREE.Mesh(jewel,mat);crystal.position.set(0,.44,.8-i*spacing);group.add(crystal);}});
      const arch=new THREE.Mesh(new THREE.TorusGeometry(.44,.055,6,16),flagMat);arch.position.set(0,.77,.8-(next.track.length-1)*spacing);group.add(arch);
      this.trackGroup.add(group);
    }
    for (let i = 0; i < track.length; i++) {
      const tile = track[i];
      const tz = TRACK_START_Z - i * TILE_SPACING;

      if (tile.type === 'gap') {
        // Caution edges framing open chasm
        const edgeGeo = new THREE.BoxGeometry(3.2, 0.24, 0.36);
        const edgeMat = new THREE.MeshStandardMaterial({ map: this.tex.hazard, roughness: 0.5 });
        const frontEdge = new THREE.Mesh(edgeGeo, edgeMat);
        frontEdge.position.set(0, -0.14, tz + TILE_SPACING * 0.46);
        const backEdge = new THREE.Mesh(edgeGeo, edgeMat);
        backEdge.position.set(0, -0.14, tz - TILE_SPACING * 0.46);
        this.trackGroup.add(frontEdge, backEdge);
        continue;
      }

      if (tile.type === 'mud') {
        const basin = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.36, TILE_SPACING - 0.18, 2, 0.06), normalMat);
        basin.position.set(0, -0.22, tz);
        const mudTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, TILE_SPACING - 0.42), mudMat);
        mudTop.position.set(0, -0.02, tz);
        this.trackGroup.add(basin, mudTop);
      } else if (tile.type === 'ramp') {
        const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.36, TILE_SPACING - 0.18, 2, 0.06), normalMat);
        base.position.set(0, -0.18, tz);
        const wedge = new THREE.Mesh(
          new THREE.BoxGeometry(2.85, RAMP_WEDGE_THICKNESS, RAMP_WEDGE_LENGTH),
          rampMat
        );
        wedge.position.set(0, RAMP_WEDGE_CENTER_Y, tz);
        wedge.rotation.x = RAMP_WEDGE_ROT_X;
        wedge.receiveShadow = true;
        this.trackGroup.add(base, wedge);
      } else {
        const isGateTile = tile.type === 'gate';
        const deckW = isGateTile ? GATE_DECK_WIDTH : 3.2;
        const deck = new THREE.Mesh(
          new RoundedBoxGeometry(deckW, 0.38, TILE_SPACING - 0.16, 2, 0.06),
          tile.type === 'start' ? startMat : normalMat
        );
        deck.position.set(0, -0.19, tz);
        deck.receiveShadow = true;
        this.trackGroup.add(deck);

        // Glowing side rails framing the runway or wider Gate Landing Bay
        const railOffsetX = deckW * 0.5 - 0.06;
        [-railOffsetX, railOffsetX].forEach((rx) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, TILE_SPACING - 0.3), railMat);
          rail.position.set(rx, 0.04, tz);
          this.trackGroup.add(rail);
        });
      }

      // Sleek under-deck architectural support pylon every 2nd solid tile
      if (i % 2 === 0 || tile.type === 'gate') {
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.set(0, -2.42, tz);
        this.trackGroup.add(pylon);
      }

      if (level.objective?.kind === 'survey' && level.objective.stations.includes(i)) {
        // Survey deck marker: geometry sits flat, outside the robot collision model.
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.73,0.88,24),new THREE.MeshBasicMaterial({color:0x22d3ee,side:THREE.DoubleSide}));
        ring.rotation.x=-Math.PI/2;ring.position.set(0,0.035,tz);this.trackGroup.add(ring);this.surveyMarkers.set(i,ring);
        for(const x of [-1.27,1.27]){
          const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,0.65,8),new THREE.MeshStandardMaterial({color:0x164e63}));
          post.position.set(x,0.32,tz);this.trackGroup.add(post);
          const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),new THREE.MeshBasicMaterial({color:0x67e8f9}));
          lamp.position.set(x,0.74,tz);this.trackGroup.add(lamp);
        }
      }
      if (tile.crystal) {
        const crystalBaseY = tile.type === 'ramp' ? 1.34 : 1.0;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), crystalMat);
        crystal.position.set(0, crystalBaseY, tz);
        crystal.userData.baseY = crystalBaseY;
        const halo = new THREE.Mesh(crystalRingGeo, crystalRingMat);
        halo.rotation.x = Math.PI / 2.6;
        crystal.add(halo);
        this.trackGroup.add(crystal);
        this.crystalMeshes.set(i, crystal);
      }

      if (tile.type === 'gate') {
        const gateZ = tz + GATE_WALL_Z_OFFSET;
        const pillarMat = new THREE.MeshStandardMaterial({ color: architecture.destination, roughness: 0.4, metalness: 0.7 });
        [-2.25, 2.25].forEach((gx) => {
          const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.65, 5.1, 0.85, 2, 0.08), pillarMat);
          pillar.position.set(gx, 2.45, gateZ);
          pillar.castShadow = !this.isSoftwareGl;
          this.trackGroup.add(pillar);
        });
        const lintel = new THREE.Mesh(new RoundedBoxGeometry(5.3, 0.65, 0.9, 2, 0.08), pillarMat);
        lintel.position.set(0, 5.15, gateZ);
        this.trackGroup.add(lintel);

        // Glowing emerald stop-line bar on the Gate Landing Bay in front of the closed doors
        const stopLineMat = new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x10b981,
          emissiveIntensity: 0.95,
          roughness: 0.25,
          metalness: 0.2
        });
        const stopLine = new THREE.Mesh(new THREE.BoxGeometry(GATE_DECK_WIDTH - 0.5, 0.025, 0.16), stopLineMat);
        stopLine.position.set(0, 0.015, tz + GATE_BOT_STOP_Z_OFFSET - 0.78);
        this.trackGroup.add(stopLine);

        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          map: this.tex.hazard,
          roughness: 0.4,
          metalness: 0.65
        });
        this.gateLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.95, 4.6, 0.35), doorMat);
        this.gateLeftDoor.position.set(-0.975, 2.3, gateZ);
        this.gateRightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.95, 4.6, 0.35), doorMat);
        this.gateRightDoor.position.set(0.975, 2.3, gateZ);
        this.trackGroup.add(this.gateLeftDoor, this.gateRightDoor);
        if(!requiresMissionCircuit(level)){
          this.gateLeftDoor.visible=false;this.gateRightDoor.visible=false;
          const sign=new THREE.Mesh(new THREE.BoxGeometry(2.4,.44,.18),new THREE.MeshBasicMaterial({color:0x34d399}));sign.position.set(0,4.65,gateZ+.48);this.trackGroup.add(sign);
        }
        if(architecture.silhouette==='reef'){
          for(const x of [-2.25,2.25]){const buoy=new THREE.Mesh(new THREE.CylinderGeometry(.45,.62,.8,10),new THREE.MeshStandardMaterial({color:0xf6aa53,roughness:.65}));buoy.position.set(x,.45,gateZ+.3);this.trackGroup.add(buoy);}
        }

        // Mount 3D Circuit Board elevated cleanly on the front face of the closed Gate doors
        this.circuitGroup.position.set(0, CIRCUIT_BOARD_Y, gateZ + CIRCUIT_BOARD_Z_OFFSET);
        // Position Action Runner continuation seamlessly beyond the Gate
        this.runnerBaseZ = gateZ - 4.0;

        // Chapter 4 Boss Sentinel Guardian perched atop the finish gate lintel
        if (level.isBoss) {
          const bossGroup = new THREE.Group();
          bossGroup.position.set(0, 6.25, gateZ + 0.15);

          const armorMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.36,
            metalness: 0.68
          });
          const accentMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.48,
            metalness: 0.55
          });
          const visorMat = new THREE.MeshStandardMaterial({
            color: 0xfb7185,
            emissive: 0xe11d48,
            emissiveIntensity: 0.95,
            roughness: 0.18,
            metalness: 0.1
          });
          const petalMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            emissive: 0x1e293b,
            emissiveIntensity: 0.25,
            roughness: 0.34,
            metalness: 0.65
          });
          const trimMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.45,
            roughness: 0.32,
            metalness: 0.5
          });

          const coreGroup = new THREE.Group();
          const bodyMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.76, 0.88, 1.05, 8),
            armorMat
          );
          const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.075, 8, 20), trimMat);
          crownRing.rotation.x = Math.PI / 2;
          crownRing.position.y = 0.54;
          const visorEye = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), visorMat);
          visorEye.position.set(0, 0.04, 0.64);
          const visorBezel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.055, 8, 18), accentMat);
          visorBezel.position.set(0, 0.04, 0.72);
          coreGroup.add(bodyMesh, crownRing, visorEye, visorBezel);

          const totalCores = Math.max(1, level.bossMeta?.coreCount ?? 3);
          const petals: THREE.Group[] = [];
          for (let p = 0; p < totalCores; p++) {
            const angle = (p / totalCores) * Math.PI * 2 + Math.PI / 6;
            const pivot = new THREE.Group();
            pivot.rotation.y = angle;
            const petalArm = new THREE.Group();
            petalArm.position.set(0, 0, 1.08);
            const shieldPlate = new THREE.Mesh(
              new RoundedBoxGeometry(0.95, 0.72, 0.16, 2, 0.04),
              petalMat
            );
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.18), trimMat);
            petalArm.add(shieldPlate, stripe);
            pivot.add(petalArm);
            bossGroup.add(pivot);
            petals.push(petalArm);
          }

          bossGroup.add(coreGroup);
          this.trackGroup.add(bossGroup);
          this.bossRig = {
            group: bossGroup,
            coreGroup,
            visorMat,
            petals,
            totalCores,
            litCores: 0
          };
        }
      }
    }

    // Build Chapter 4 deterministic moving hazards (Timed Laser Barriers & Patrol Drones)
    if (level.hazards && level.hazards.length > 0) {
      const hazPylonMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.42,
        metalness: 0.68
      });
      const hazCollarMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.35,
        metalness: 0.45
      });
      const droneBodyMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.28,
        metalness: 0.24
      });
      const droneWingMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.65
      });
      const droneVisorMat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        emissive: 0xe11d48,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });
      const railStripMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.4
      });

      for (const haz of level.hazards) {
        if (haz.kind === 'laser_gate') {
          const hz = TRACK_START_Z - haz.tileIndex * TILE_SPACING;
          const barrierGroup = new THREE.Group();
          barrierGroup.position.set(0, 0, hz);

          const capMats: THREE.MeshStandardMaterial[] = [];
          [-1.56, 1.56].forEach((px) => {
            const baseCollar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.24, 0.28, 0.18, 12),
              hazCollarMat
            );
            baseCollar.position.set(px, 0.09, 0);
            const post = new THREE.Mesh(
              new RoundedBoxGeometry(0.28, 1.65, 0.3, 2, 0.05),
              hazPylonMat
            );
            post.position.set(px, 0.92, 0);
            const capMat = new THREE.MeshStandardMaterial({
              color: 0xfb7185,
              emissive: 0xe11d48,
              emissiveIntensity: 0.85,
              roughness: 0.25
            });
            capMats.push(capMat);
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), capMat);
            cap.position.set(px, 1.84, 0);
            barrierGroup.add(baseCollar, post, cap);
          });

          const beamGroup = new THREE.Group();
          const beamCoreMat = new THREE.MeshBasicMaterial({
            color: 0xfda4af,
            transparent: true,
            opacity: 0.9
          });
          const beamOuterMat = new THREE.MeshBasicMaterial({
            color: 0xf43f5e,
            transparent: true,
            opacity: 0.34,
            depthWrite: false
          });
          [0.68, 1.24].forEach((by) => {
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 2.94, 8), beamCoreMat);
            core.rotation.z = Math.PI / 2;
            core.position.y = by;
            const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 2.94, 8), beamOuterMat);
            outer.rotation.z = Math.PI / 2;
            outer.position.y = by;
            beamGroup.add(core, outer);
          });
          barrierGroup.add(beamGroup);
          this.trackGroup.add(barrierGroup);

          this.dynamicHazardVisuals.set(haz.id, {
            kind: 'laser_barrier',
            def: haz,
            group: barrierGroup,
            beamGroup,
            capMats,
            targetActive: true,
            beamScale: 1
          });
        } else {
          // Patrol Drone with floor rail corridor spanning minTile..maxTile
          const zStart = TRACK_START_Z - haz.minTile * TILE_SPACING;
          const zEnd = TRACK_START_Z - haz.maxTile * TILE_SPACING;
          const spanLen = Math.abs(zEnd - zStart) + TILE_SPACING * 0.55;
          const midZ = (zStart + zEnd) * 0.5;
          [-1.22, 1.22].forEach((rx) => {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, spanLen), railStripMat);
            strip.position.set(rx, 0.03, midZ);
            this.trackGroup.add(strip);
          });

          const podGroup = new THREE.Group();
          const initZ = TRACK_START_Z - haz.startTile * TILE_SPACING;
          podGroup.position.set(0, 1.18, initZ);

          const chassisPod = new THREE.Mesh(
            new RoundedBoxGeometry(1.12, 0.56, 0.88, 3, 0.14),
            droneBodyMat
          );
          const visorBand = new THREE.Mesh(
            new RoundedBoxGeometry(0.86, 0.18, 0.92, 2, 0.05),
            droneVisorMat
          );
          visorBand.position.y = 0.04;
          [-0.72, 0.72].forEach((wx) => {
            const wing = new THREE.Mesh(
              new RoundedBoxGeometry(0.36, 0.12, 0.62, 2, 0.03),
              droneWingMat
            );
            wing.position.set(wx, -0.02, 0);
            podGroup.add(wing);
          });
          const scanCone = new THREE.Mesh(
            new THREE.ConeGeometry(0.68, 1.05, 14, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0xfb7185,
              transparent: true,
              opacity: 0.18,
              side: THREE.DoubleSide,
              depthWrite: false
            })
          );
          scanCone.position.y = -0.68;

          const rotorGroup = new THREE.Group();
          rotorGroup.position.y = 0.4;
          const rotorRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 18), hazCollarMat);
          rotorRing.rotation.x = Math.PI / 2;
          const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.09), droneWingMat);
          const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.82), droneWingMat);
          rotorGroup.add(rotorRing, bladeA, bladeB);

          podGroup.add(chassisPod, visorBand, scanCone, rotorGroup);
          this.trackGroup.add(podGroup);

          this.dynamicHazardVisuals.set(haz.id, {
            kind: 'patrol_drone',
            def: haz,
            podGroup,
            rotorGroup,
            targetZ: initZ,
            targetYaw: haz.startDir > 0 ? Math.PI : 0
          });
        }
      }

      this.syncHazardsToTick(0, true);
    }
  }

  private syncHazardsToTick(tick: number, instant = false) {
    if (!this.level || this.dynamicHazardVisuals.size === 0) return;
    this.lastHazardTick = tick;
    const snaps = evaluateAllHazardsAtTick(this.level, tick);
    for (const snap of snaps) {
      const vis = this.dynamicHazardVisuals.get(snap.id);
      if (!vis) continue;
      if (vis.kind === 'laser_barrier') {
        vis.targetActive = snap.active;
        if (instant) {
          vis.beamScale = snap.active ? 1 : 0;
          vis.beamGroup.visible = snap.active;
          vis.beamGroup.scale.set(1, snap.active ? 1 : 0.01, snap.active ? 1 : 0.01);
        }
      } else {
        vis.targetZ = TRACK_START_Z - snap.tileIndex * TILE_SPACING;
        vis.targetYaw = (snap.dir ?? 1) > 0 ? Math.PI : 0;
        if (instant) {
          vis.podGroup.position.z = vis.targetZ;
          vis.podGroup.rotation.y = vis.targetYaw;
        }
      }
    }
  }

  public setCircuitGrid(grid: CircuitGrid) {
    this.circuitGrid = grid.map((row) => row.map((c) => ({ ...c })));
    this.rebuildCircuit3D();
  }

  private rebuildCircuit3D() {
    // Preserve reusable circuitBeamGroup and ghostCircuitRing while disposing previous tile meshes/materials
    clearAndDisposeGroup(
      this.circuitGroup,
      this.sharedTextures,
      new Set<THREE.Object3D>([this.circuitBeamGroup, this.ghostCircuitRing])
    );
    if (this.circuitBeamGroup.parent !== this.circuitGroup) {
      this.circuitGroup.add(this.circuitBeamGroup);
    }
    this.circuitCellMeshes = [];
    this.circuitInteractables = [];

    const boardW = 3.6;
    const cellSize = boardW / 5;

    const frame = new THREE.Mesh(
      new RoundedBoxGeometry(boardW + 0.35, boardW + 0.35, 0.16, 2, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.7 })
    );
    frame.position.z = -0.08;
    this.circuitGroup.add(frame);

    // Emitter gun on left row 2
    const emitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.5 })
    );
    emitter.rotation.z = Math.PI / 2;
    emitter.position.set(-boardW / 2 - 0.25, 0, 0.15);
    this.circuitGroup.add(emitter);

    const trace = traceCircuit(this.circuitGrid);

    const cellBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.45 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95, emissive: 0x38bdf8, emissiveIntensity: 0.35 });
    const splitterMat = new THREE.MeshPhysicalMaterial({ color: 0xa78bfa, roughness: 0.1, metalness: 0.3, clearcoat: 1.0, emissive: 0x7c3aed, emissiveIntensity: 0.5 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.5 });

    for (let r = 0; r < 5; r++) {
      const rowArr: THREE.Object3D[] = [];
      for (let c = 0; c < 5; c++) {
        const cell = this.circuitGrid[r]?.[c] || { type: 'empty', rot: 0 };
        const cx = (c - 2) * cellSize;
        const cy = (2 - r) * cellSize;

        const pad = new THREE.Mesh(new RoundedBoxGeometry(cellSize * 0.9, cellSize * 0.9, 0.08, 2, 0.02), cellBaseMat);
        pad.position.set(cx, cy, 0.02);
        pad.userData = { circuitRow: r, circuitCol: c };
        this.circuitGroup.add(pad);

        if (cell.type === 'mirror' || cell.type === 'splitter') {
          const holder = new THREE.Group();
          holder.position.set(cx, cy, 0.18);
          holder.rotation.z = cell.rot === 0 ? Math.PI / 4 : -Math.PI / 4;
          const bar = new THREE.Mesh(
            new RoundedBoxGeometry(cellSize * 0.74, 0.1, 0.24, 2, 0.02),
            cell.type === 'splitter' ? splitterMat : mirrorMat
          );
          bar.userData = { circuitRow: r, circuitCol: c };
          holder.add(bar);
          // Invisible generous click hitbox
          const hit = new THREE.Mesh(
            new THREE.BoxGeometry(cellSize * 0.92, cellSize * 0.92, 0.38),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hit.userData = { circuitRow: r, circuitCol: c };
          holder.add(hit);
          this.circuitGroup.add(holder);
          this.circuitInteractables.push(pad, bar, hit);
          rowArr.push(holder);
        } else if (cell.type === 'core') {
          const lit = Boolean(trace.litCores[`${r},${c}`]);
          const orb = new THREE.Mesh(
            new THREE.SphereGeometry(cellSize * 0.28, 16, 14),
            new THREE.MeshStandardMaterial({
              color: lit ? 0x34d399 : 0x334155,
              emissive: lit ? 0x10b981 : 0x0f172a,
              emissiveIntensity: lit ? 1.8 : 0.2,
              roughness: 0.2
            })
          );
          orb.position.set(cx, cy, 0.2);
          this.circuitGroup.add(orb);
          rowArr.push(orb);
        } else if (cell.type === 'wall') {
          const blk = new THREE.Mesh(new RoundedBoxGeometry(cellSize * 0.74, cellSize * 0.74, 0.26, 2, 0.03), wallMat);
          blk.position.set(cx, cy, 0.16);
          this.circuitGroup.add(blk);
          rowArr.push(blk);
        } else {
          rowArr.push(pad);
        }
      }
      this.circuitCellMeshes.push(rowArr);
    }

    // Build 3D Laser Beam Segments (disposing previous beam cylinders/materials first)
    clearAndDisposeGroup(this.circuitBeamGroup, this.sharedTextures);
    const beamMat = new THREE.MeshBasicMaterial({ color: trace.solved ? 0x34d399 : 0x22d3ee });
    const glowMat = new THREE.MeshBasicMaterial({
      color: trace.solved ? 0x6ee7b7 : 0x67e8f9,
      transparent: true,
      opacity: 0.42
    });
    for (const seg of trace.segments) {
      const p1x = (seg.x1 - 2.5) * cellSize;
      const p1y = (2.5 - seg.y1) * cellSize;
      const p2x = (seg.x2 - 2.5) * cellSize;
      const p2y = (2.5 - seg.y2) * cellSize;
      _rayOrigin.set(p1x, p1y, 0.19);
      _rayDir.set(p2x - p1x, p2y - p1y, 0);
      const len = _rayDir.length();
      if (len < 0.01) continue;
      _beamMid.addVectors(_rayOrigin, _rayDir.clone().multiplyScalar(0.5));
      _rayDir.normalize();
      _quat.setFromUnitVectors(_beamUp, _rayDir);

      const coreCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 8), beamMat);
      coreCyl.position.copy(_beamMid);
      coreCyl.quaternion.copy(_quat);
      const haloCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 8), glowMat);
      haloCyl.position.copy(_beamMid);
      haloCyl.quaternion.copy(_quat);
      this.circuitBeamGroup.add(coreCyl, haloCyl);
    }
    this.circuitGroup.add(this.ghostCircuitRing);

    // Sync Boss Sentinel shield petals to lit optical circuit cores
    if (this.bossRig) {
      const litCount = Object.values(trace.litCores).filter(Boolean).length;
      this.bossRig.litCores = litCount;
    }
  }

  private setupActionRunnerPool() {
    const SEG_LEN = 16;
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.tex.floorDeck,
      bumpMap: this.tex.floorBump,
      bumpScale: 0.025,
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.45
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.tex.magWall,
      bumpMap: this.tex.metalBump,
      bumpScale: 0.02,
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.55
    });

    const archRibMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.36,
      metalness: 0.78
    });
    const speedStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const railGlowMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const archTopGeo = new THREE.BoxGeometry(8.2, 0.22, 0.36);
    const archStripGeo = new THREE.BoxGeometry(6.8, 0.06, 0.12);
    const floorRailGeo = new THREE.BoxGeometry(0.07, 0.05, SEG_LEN);

    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.36, SEG_LEN), floorMat);
      floor.position.y = -0.18;
      floor.receiveShadow = true;
      seg.add(floor);

      // Luminous guide rail strips along left/right lane edges for high-speed depth perception
      [-3.38, -1.1, 1.1, 3.38].forEach((lx) => {
        const strip = new THREE.Mesh(floorRailGeo, railGlowMat);
        strip.position.set(lx, 0.025, 0);
        seg.add(strip);
      });

      [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, SEG_LEN), wallMat);
        wall.position.set(side * (WALL_X + 0.2), 2.1, 0);
        seg.add(wall);
      });

      // Overhead neon speed-gate arch ribs every segment
      [-SEG_LEN * 0.25, SEG_LEN * 0.25].forEach((az) => {
        const topRib = new THREE.Mesh(archTopGeo, archRibMat);
        topRib.position.set(0, 4.48, az);
        const neonStrip = new THREE.Mesh(archStripGeo, speedStripMat);
        neonStrip.position.set(0, 4.35, az);
        seg.add(topRib, neonStrip);
      });

      this.runnerGroup.add(seg);
      this.runnerSegments.push(seg);
    }

    // Pool of Bolts, Gears, Barriers, Oil patches
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      metalness: 0.88,
      roughness: 0.2
    });
    const barrierMat = new THREE.MeshStandardMaterial({ map: this.tex.hazard, roughness: 0.45 });
    const oilMat = new THREE.MeshStandardMaterial({ map: this.tex.mudTex, roughness: 0.14 });

    for (let i = 0; i < 22; i++) {
      const kind: RunnerEntity['kind'] = i < 14 ? 'bolt' : i < 19 ? 'barrier' : 'oil';
      const g = new THREE.Group();
      if (kind === 'bolt') {
        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 6), boltMat);
        nut.rotation.x = Math.PI / 2;
        g.add(nut);
      } else if (kind === 'barrier') {
        const bar = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.85, 0.45, 2, 0.05), barrierMat);
        bar.position.y = 0.42;
        g.add(bar);
      } else {
        const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 12), oilMat);
        patch.position.y = 0.04;
        g.add(patch);
      }
      g.visible = false;
      this.runnerGroup.add(g);
      this.runnerEntities.push({ group: g, kind, z: -999, lane: 1, surface: 'floor', active: false });
    }
    this.runnerGroup.visible = false;
  }

  public startActionDash(endless: boolean, gentle: boolean) {
    this.gentleSpeed = gentle;
    this.runnerEndless = endless;
    this.mode = 'ACTION_RUN_3D';
    this.runnerGroup.visible = true;
    this.trackGroup.visible = false;
    this.circuitGroup.visible = false;
    const info = computeChassisInfo(this.chassis);
    this.runnerMetrics = createActionDashMetrics({ endless, gentleSpeed: gentle, chassisInfo: info });
    this.runnerMetrics.targetDistance = endless ? 0 : 120;
    this.runnerSpeed = gentle ? 11.5 : 15.5;
    if (info.hasBooster) this.runnerSpeed += 2;

    const startZ = endless ? -6 : this.runnerBaseZ;
    this.gateOpenAmt = 1.85;
    this.botTrackZ = startZ;
    this.botTrackY = 0;
    this.botTrackPitchX = 0;
    this.runnerBotX = 0;
    this.runnerBotY = 0;
    this.prevRunnerBotX = 0;
    this.prevRunnerBotY = 0;
    this.runnerBotRoll = 0;
    this.runnerJumpY = 0;
    this.runnerJumpVy = 0;
    this.clearActionTrails();
    this.camBasePos.set(0, 3.6, startZ + 6.8);
    this.camera.position.copy(this.camBasePos);
    _curLook.set(0, 1.2, startZ - 7.5);

    this.runnerGroup.position.set(0, 0, 0);
    for (let i = 0; i < this.runnerSegments.length; i++) {
      this.runnerSegments[i].position.set(0, 0, startZ - i * 16 - 8);
    }
    // Place initial bolts and gentle obstacles ahead
    this.runnerEntities.forEach((ent, idx) => {
      ent.active = true;
      ent.group.visible = true;
      const aheadZ = startZ - 12 - idx * 6.5;
      this.respawnEntity(ent, aheadZ);
    });

    this.setMood('neutral', 0);
    this.cb.onActionMetrics({ ...this.runnerMetrics });
  }

  private clearActionTrails() {
    this.vfx.resetActionTrails();
  }

  private spawnActionTrailBurst(count: number, speedBoost = 1.25) {
    if (!this.runnerMetrics) return;
    const m = this.runnerMetrics;
    const info = computeChassisInfo(this.chassis);
    const boostMult = m.turboTimer > 0 ? 1.45 : 1;
    const effSpeed = this.runnerSpeed * boostMult * speedBoost;
    this.vfx.spawnActionTrailBurst(
      {
        speed: effSpeed,
        surface: m.surface,
        isAirborne: this.runnerJumpY > 0.15,
        turboActive: m.turboTimer > 0,
        hasThrusters: info.hasThrusters,
        hasBooster: info.hasBooster,
        hasMagnet: info.hasMagnet,
        botX: this.runnerBotX,
        botY: this.runnerBotY,
        botZ: this.botTrackZ,
        botVx: (Math.random() - 0.5) * 4.5,
        botVy: (Math.random() - 0.3) * 3.0,
        botRoll: this.runnerBotRoll
      },
      this.qualityBudget,
      undefined,
      count
    );
  }

  private respawnEntity(ent: RunnerEntity, zPos: number) {
    ent.z = zPos;
    if (ent.kind === 'bolt') {
      const onWall = Math.random() < 0.34;
      if (onWall) {
        ent.surface = Math.random() < 0.5 ? 'leftWall' : 'rightWall';
        ent.lane = Math.random() < 0.5 ? 0 : 1;
        const wx = ent.surface === 'leftWall' ? -WALL_X + 0.55 : WALL_X - 0.55;
        ent.group.position.set(wx, WALL_Y[ent.lane], zPos);
      } else {
        ent.surface = 'floor';
        ent.lane = Math.floor(Math.random() * 3);
        ent.group.position.set(LANE_X[ent.lane], 0.65, zPos);
      }
    } else {
      ent.surface = 'floor';
      ent.lane = Math.floor(Math.random() * 3);
      ent.group.position.set(LANE_X[ent.lane], 0, zPos);
    }
  }

  public steerActionDash(dir: -1 | 1) {
    if (this.mode !== 'ACTION_RUN_3D' || !this.runnerMetrics || this.runnerMetrics.finished) return;
    const allowWall = true; // All bots can magnet-ride walls; magnet coils extend bolt pull & speed!
    const next = stepActionSurfaceMove(
      this.runnerMetrics.surface,
      this.runnerMetrics.lane,
      dir,
      allowWall
    );
    if (next.surface !== this.runnerMetrics.surface || next.lane !== this.runnerMetrics.lane) {
      SFX.magAttach();
      const wallSwitch = next.surface !== this.runnerMetrics.surface;
      this.spawnActionTrailBurst(wallSwitch ? 12 : 8, 1.25);
      this.rig.injectImpact(wallSwitch ? 0.35 : 0.18, 0, dir * 0.65);
      this.cameraJuice.addImpulse(dir * (wallSwitch ? 1.1 : 0.45), 0.2, 0, 0);
    }
    this.runnerMetrics.surface = next.surface;
    this.runnerMetrics.lane = next.lane;
  }

  public jumpActionDash() {
    if (this.mode !== 'ACTION_RUN_3D' || !this.runnerMetrics || this.runnerMetrics.finished) return;
    if (this.runnerJumpY <= 0.05) {
      this.runnerJumpVy = 11.2;
      SFX.jump();
      this.spawnActionTrailBurst(12, 1.35);
      this.rig.injectImpact(-0.65, -0.4, 0);
      this.cameraJuice.addImpulse(0, 0.8, 0, 1.5);
      this.vfx.emitShockwaveRing(
        this.runnerBotX,
        this.runnerBotY + 0.04,
        this.botTrackZ,
        0x38bdf8,
        0.38,
        1.85,
        0.34
      );
    }
  }

  public startPlanetAdventure(gentle: boolean) {
    this.gentleSpeed = gentle;
    this.mode = 'PLANET_ADVENTURE_3D';

    if (!this.planetWorld) {
      this.planetWorld = buildAlienPlanetWorld(this.isSoftwareGl);
      this.scene.add(this.planetWorld.planetGroup);
    }
    this.planetWorld.resetCollectibles();
    this.planetWorld.planetGroup.visible = true;

    this.env.workshopGroup.visible = false;
    this.env.skyportGroup.visible = false;
    this.trackGroup.visible = false;
    this.circuitGroup.visible = false;
    this.runnerGroup.visible = false;
    this.clearActionTrails();

    this.scene.background = new THREE.Color(0x0c1b2e);
    this.scene.fog = new THREE.FogExp2(0x0c1b2e, 0.0135);

    const info = computeChassisInfo(this.chassis);
    const caps = derivePlanetCapabilities(info);
    this.planetMetrics = createInitialPlanetMetrics(caps);
    this.planetBotX = PLANET_SPAWN.x;
    this.planetBotZ = PLANET_SPAWN.z;
    this.planetBotY = getPlanetGroundY(PLANET_SPAWN.x, PLANET_SPAWN.z);
    this.planetBotYaw = PLANET_SPAWN.yaw;
    this.planetBotVy = 0;
    this.planetJumpsUsed = 0;
    this.planetMoveForward = 0;
    this.planetMoveStrafe = 0;
    this.planetLaserFlashTimer = 0;
    this.planetMetricTimer = 0;

    this.planetWorld.magnetAuraMesh.visible = caps.hasMagnet;
    this.planetWorld.magnetAuraMesh.position.set(this.planetBotX, this.planetBotY + 0.14, this.planetBotZ);

    this.rig.applyChassis(this.chassis, null);
    this.rig.root.position.set(this.planetBotX, this.planetBotY, this.planetBotZ);
    this.rig.root.rotation.set(0, this.planetBotYaw, 0);

    this.camBasePos.set(this.planetBotX, this.planetBotY + 5.2, this.planetBotZ + 8.6);
    this.camera.position.copy(this.camBasePos);
    _curLook.set(this.planetBotX, this.planetBotY + 1.1, this.planetBotZ - 2.6);

    this.setMood('happy', 1.2);
    this.cb.onPlanetMetrics?.({ ...this.planetMetrics });
  }

  public setPlanetMoveInput(forward: number, strafe: number) {
    this.planetMoveForward = THREE.MathUtils.clamp(forward, -1, 1);
    this.planetMoveStrafe = THREE.MathUtils.clamp(strafe, -1, 1);
  }

  public jumpPlanetAdventure() {
    if (this.mode !== 'PLANET_ADVENTURE_3D' || !this.planetMetrics || this.planetMetrics.status !== 'playing') {
      return;
    }
    const groundY = getPlanetGroundY(this.planetBotX, this.planetBotZ);
    const grounded = this.planetBotY <= groundY + 0.08;
    const caps = this.planetMetrics.capabilities;

    if (grounded) {
      this.planetBotVy = caps.hasThrusters ? 12.2 : 8.6;
      this.planetJumpsUsed = 1;
      SFX.jump();
      this.rig.injectImpact(-0.6, -0.35, 0);
      this.cameraJuice.addImpulse(0, 0.7, 0, 1.2);
      this.vfx.emitShockwaveRing(
        this.planetBotX,
        this.planetBotY + 0.05,
        this.planetBotZ,
        caps.hasThrusters ? 0x38bdf8 : 0xfbbf24,
        0.38,
        1.75,
        0.36
      );
      this.spawnSparks(
        this.planetBotX,
        this.planetBotY + 0.25,
        this.planetBotZ,
        caps.hasThrusters ? 0x38bdf8 : 0xfbbf24,
        12
      );
    } else if (caps.hasThrusters && this.planetJumpsUsed < 2) {
      this.planetBotVy = 11.4;
      this.planetJumpsUsed = 2;
      this.planetMetrics.doubleJumpReady = false;
      SFX.boost();
      this.rig.injectImpact(-0.75, -0.45, 0);
      this.cameraJuice.addImpulse(0, 0.9, 0, 2.0);
      this.vfx.emitShockwaveRing(
        this.planetBotX,
        this.planetBotY + 0.15,
        this.planetBotZ,
        0x22d3ee,
        0.45,
        2.2,
        0.4
      );
      this.spawnSparks(this.planetBotX, this.planetBotY + 0.35, this.planetBotZ, 0x22d3ee, 16);
      this.cb.onPlanetMetrics?.({ ...this.planetMetrics });
    }
  }

  public triggerPlanetBoost() {
    if (this.mode !== 'PLANET_ADVENTURE_3D' || !this.planetMetrics || this.planetMetrics.status !== 'playing') {
      return;
    }
    if (!this.planetMetrics.capabilities.hasBooster || this.planetMetrics.boostCooldown > 0) return;

    this.planetMetrics.boostActiveTimer = 2.0;
    this.planetMetrics.boostCooldown = 4.2;
    this.setMood('boost', 1.6);
    SFX.boost();
    this.rig.injectImpact(-0.55, -0.5, 0);
    this.cameraJuice.addImpulse(0, 0.2, 1.4, 3.2);
    this.vfx.emitShockwaveRing(
      this.planetBotX,
      this.planetBotY + 0.25,
      this.planetBotZ,
      0xf472b6,
      0.5,
      2.4,
      0.42
    );
    this.spawnSparks(this.planetBotX, this.planetBotY + 0.65, this.planetBotZ, 0xf472b6, 18);
    this.cb.onPlanetMetrics?.({ ...this.planetMetrics });
  }

  public firePlanetLaser() {
    if (
      this.mode !== 'PLANET_ADVENTURE_3D' ||
      !this.planetMetrics ||
      !this.planetWorld ||
      this.planetMetrics.status !== 'playing'
    ) {
      return;
    }
    if (!this.planetMetrics.capabilities.hasLaser || this.planetMetrics.laserCooldown > 0) return;

    this.planetMetrics.laserCooldown = 0.65;
    this.planetLaserFlashTimer = 0.22;
    SFX.laserSolved();
    this.rig.injectImpact(0.35, 0.45, 0);
    this.cameraJuice.addImpulse(0, 0.1, 0.9, 0);

    const { fx, fz } = getBotForwardXZ(this.planetBotYaw);
    const beam = this.planetWorld.laserBeamMesh;
    beam.position.set(
      this.planetBotX + fx * 4.5,
      this.planetBotY + 0.85,
      this.planetBotZ + fz * 4.5
    );
    beam.rotation.set(Math.PI / 2, 0, -this.planetBotYaw);
    beam.visible = true;

    const hit = findLaserTargetBarrier(
      this.planetBotX,
      this.planetBotZ,
      this.planetBotYaw,
      this.planetWorld.barriers
    );
    if (hit) {
      const handle = this.planetWorld.barriers.find((b) => b.id === hit.id);
      if (handle && handle.active) {
        handle.active = false;
        handle.group.visible = false;
        this.planetMetrics.crystalsShattered += 1;
        this.planetMetrics.boltsCollected += 2;
        this.cameraJuice.addImpulse(1.2, 0.9, 0.5, 1.8);
        this.vfx.emitShockwaveRing(handle.x, handle.y + 0.5, handle.z, 0xe879f9, 0.55, 2.8, 0.45);
        this.spawnSparks(handle.x, handle.y + 0.85, handle.z, 0xe879f9, 22);
        this.spawnSparks(handle.x, handle.y + 0.85, handle.z, 0x22d3ee, 14);
        SFX.compactCrunch();
        this.setMood('happy', 1.1);
      }
    }
    this.cb.onPlanetMetrics?.({ ...this.planetMetrics });
  }

  public setMode(mode: WorldMode) {
    this.mode = mode;
    this.clearGhostPreview();
    if (mode !== 'CODE_3D') {
      this.codeFeedbackTimer = 0;
      this.codeFeedbackTier = null;
    }
    if (mode !== 'PLANET_ADVENTURE_3D') {
      if (this.planetWorld) {
        this.planetWorld.planetGroup.visible = false;
      }
      this.env.workshopGroup.visible = true;
      this.env.skyportGroup.visible = true;
      this.scene.background = new THREE.Color(this.activeBiome.skyHex);
      this.scene.fog = new THREE.FogExp2(this.activeBiome.fogHex, this.activeBiome.fogDensity);
    }
    if (mode !== 'ACTION_RUN_3D' && mode !== 'PLANET_ADVENTURE_3D') {
      this.runnerGroup.visible = false;
      this.trackGroup.visible = true;
      this.circuitGroup.visible = !this.level || requiresMissionCircuit(this.level);
      this.clearActionTrails();
      SFX.setGlide(false);
    }
    if (mode === 'TITLE') {
      this.resetBotToWorkshop();
      this.rig.root.rotation.y = -2.55;
      this.rig.applyChassis(
        [
          [null, null, null],
          ['thrusters', null, 'laser'],
          ['wheels', null, null]
        ],
        null
      );
    } else if (mode === 'BUILD_3D') {
      this.resetBotToWorkshop();
      this.rig.root.rotation.y = -2.42;
      this.orbitTarget = { ...DEFAULT_WORKSHOP_ORBIT };
      this.rig.applyChassis(this.chassis, this.hoverSlot);
    } else if (mode === 'PAINT_BOOTH') {
      this.resetBotToWorkshop();
      this.rig.root.rotation.y = -2.72;
      this.orbitTarget = clampWorkshopOrbit({
        azimuth: 0.34,
        polar: 1.18,
        distance: 5.45
      });
      this.rig.applyChassis(this.chassis, null);
    } else if (mode === 'CODE_3D') {
      this.resetBotToTrackStart();
      this.applyDefaultCodeCameraPreset();
    } else if (mode === 'CIRCUIT_3D') {
      const gateIdx = Math.max(1, (this.level?.track.length ?? 6) - 1);
      // Keep the bot planted solidly on the Gate Landing Bay stop pad (never floating over a preceding gap!)
      this.botTrackZ = getTrackBotStopZ(this.level?.track, gateIdx);
      this.botTrackY = 0;
    }
  }

  public rotateWorkshopBy(deltaAzimuth: number) {
    this.workshopAutoSpin = false;
    this.orbitTarget = clampWorkshopOrbit({
      ...this.orbitTarget,
      azimuth: this.orbitTarget.azimuth + deltaAzimuth
    });
  }

  public zoomWorkshopBy(deltaDist: number) {
    this.orbitTarget = clampWorkshopOrbit({
      ...this.orbitTarget,
      distance: this.orbitTarget.distance + deltaDist
    });
  }

  public setWorkshopAutoSpin(enabled: boolean) {
    this.workshopAutoSpin = enabled;
  }

  public resetWorkshopView() {
    this.workshopAutoSpin = false;
    this.orbitTarget =
      this.mode === 'PAINT_BOOTH'
        ? clampWorkshopOrbit({ azimuth: 0.34, polar: 1.18, distance: 5.45 })
        : { ...DEFAULT_WORKSHOP_ORBIT };
  }

  private getCurrentTrackLength(): number {
    return Math.max(2, this.level?.track.length ?? 6);
  }

  private applyDefaultCodeCameraPreset() {
    const trackLen = this.getCurrentTrackLength();
    const isPortrait = this.width / Math.max(1, this.height) < 0.92;
    const defaultPreset: CodeCameraPreset = isPortrait || trackLen >= 8 ? 'overview' : 'follow';
    this.setCodeCameraPreset(defaultPreset);
  }

  public setCodeCameraPreset(preset: CodeCameraPreset) {
    this.codeCamPreset = preset;
    this.codeCamUserDragged = false;
    const framing = computeResponsiveCameraFraming('CODE_3D', this.width, this.height);
    this.codeCamTarget = computeCodeCameraPreset(
      preset,
      this.getCurrentTrackLength(),
      this.width,
      this.height,
      framing.baseFov
    );
    this.cb.onCodeCameraPresetChange?.(preset);
  }

  public focusCodeTrackTile(tileIndex: number) {
    this.codeCamUserDragged = true;
    this.codeCamTarget = computeTileFocusCameraState(
      this.codeCamTarget,
      tileIndex,
      this.getCurrentTrackLength(),
      this.width,
      this.height
    );
  }

  public getCodeCameraPreset(): CodeCameraPreset {
    return this.codeCamPreset;
  }

  public triggerTouchReaction(zone: RobotTouchZone = 'head') {
    this.touchTimer = 1.45;
    this.setMood('happy', 1.45);
    const pos = this.rig.root.position;
    this.spawnSparks(pos.x, pos.y + (zone === 'head' ? 1.85 : 1.05), pos.z, 0xf472b6, 14);
    this.spawnSparks(pos.x, pos.y + (zone === 'head' ? 1.85 : 1.05), pos.z, 0xfde047, 10);
  }

  public resetBotToWorkshop() {
    this.simFailResetTimer = 0;
    this.botTrackZ = 0;
    this.botTrackY = 0;
    this.botTrackPitchX = 0;
    this.runnerBotX = 0;
    this.runnerBotY = 0;
    this.runnerBotRoll = 0;
    this.codeFeedbackTimer = 0;
    this.codeFeedbackTier = null;
    this.rig.root.position.set(0, 0, 0);
    this.rig.root.rotation.set(0, 0, 0);
    this.crystalMeshes.forEach((m) => {
      m.visible = true;
    });
    this.surveyedStations.clear();
    this.surveyMarkers.forEach(marker=>{marker.material.color.setHex(0x22d3ee);marker.scale.setScalar(1);});
    this.syncHazardsToTick(0, true);
  }

  public resetBotToTrackStart() {
    this.simFailResetTimer = 0;
    this.botTrackZ = TRACK_START_Z;
    this.botTrackY = 0;
    this.botTrackPitchX = 0;
    this.runnerBotX = 0;
    this.runnerBotY = 0;
    this.runnerBotRoll = 0;
    this.codeFeedbackTimer = 0;
    this.codeFeedbackTier = null;
    this.rig.root.position.set(0, 0, TRACK_START_Z);
    this.rig.root.rotation.set(0, 0, 0);
    this.crystalMeshes.forEach((m) => {
      m.visible = true;
    });
    this.surveyedStations.clear();
    this.surveyMarkers.forEach(marker=>{marker.material.color.setHex(0x22d3ee);marker.scale.setScalar(1);});
    this.syncHazardsToTick(0, true);
  }

  public setGentleSpeed(gentle: boolean) {
    this.gentleSpeed = gentle;
  }

  private applyQualityBudget(budget: GraphicsQualityBudget) {
    this.qualityBudget = budget;
    this.lowGraphics = budget.lowGraphics;
    this.env.setQualityBudget(budget);
    this.rig.setQualityBudget(budget);
    this.vfx.trimRibbonsToBudget(budget);

    if (this.renderPipeline) {
      this.renderPipeline.applyBudget(budget);
    } else if (this.renderer) {
      const targetDpr = this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, budget.maxPixelRatio);
      this.renderer.setPixelRatio(targetDpr);
      this.renderer.setSize(this.width, this.height);
      const enableShadows = !this.isSoftwareGl && budget.shadowsEnabled;
      this.renderer.shadowMap.enabled = enableShadows;
      if (enableShadows) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    if (this.pathPreviewModel && this.pathPreviewBuiltLowGfx !== this.lowGraphics) {
      this.rebuildPathPreview3D();
    }
  }

  public setGraphicsQualityMode(mode: GraphicsQualityMode) {
    const { budget } = this.qualityMonitor.setMode(mode);
    this.applyQualityBudget(budget);
  }

  public setLowGraphics(enabled: boolean) {
    this.setGraphicsQualityMode(enabled ? 'eco' : 'auto');
  }

  public updateChassis(
    chassis: ChassisGrid,
    hoverSlot: { r: number; c: number; valid: boolean; part: PartId } | null = null,
    weldedSlot: [number, number] | null = null,
    weldedPart: PartId | null = null
  ) {
    this.chassis = chassis.map((r) => [...r]);
    this.hoverSlot = hoverSlot;
    this.rig.applyChassis(this.chassis, hoverSlot);
    if (weldedSlot && weldedPart) {
      this.rig.triggerPartPop(weldedPart);
      this.rig.injectImpact(0.65, 0.2, 0);
      this.cameraJuice.addImpulse(0, -0.35, 0.45, 0);
      this.buildTargetSlot = weldedSlot;
      this.buildTimer = 0.92;
      this.celebrateTimer = 0;
      this.installSeq = {
        slot: weldedSlot,
        part: weldedPart,
        startMs: performance.now(),
        elapsed: 0,
        sparkStage: 1,
        celebrated: false
      };
      this.setMood('build', 0.95);
      this.cb.onInstallPhaseChange?.('working');
      const wPos = this.rig.getSlotWorldPosition(weldedSlot[0], weldedSlot[1], _rayOrigin);
      this.spawnPartPlacementEffects(wPos.x, wPos.y, wPos.z, weldedPart);
      this.spawnSparks(wPos.x, wPos.y, wPos.z, 0xfef08a, 6);
    }
  }

  public setMood(mood: BotMood, duration = 2.0, spawnBurst = true) {
    this.botMood = mood;
    this.moodTimer = duration;
    if (mood === 'happy' && spawnBurst) {
      this.spawnConfetti(this.rig.root.position.x, this.rig.root.position.y + 1.5, this.rig.root.position.z, 26);
    }
  }

  public triggerCodeBlockFeedback(feedback: CodeBlockFeedback) {
    if (this.mode !== 'CODE_3D') return;
    this.codeFeedbackTier = feedback.tier;
    this.codeFeedbackTimer = feedback.duration;
    this.codeFeedbackDuration = feedback.duration;
    this.setMood(feedback.mood, feedback.duration, false);
    this.rig.injectImpact(-0.32, 0, 0);

    const bx = this.rig.root.position.x;
    const by = this.rig.root.position.y + 1.35;
    const bz = this.rig.root.position.z;

    if (feedback.sparkCount > 0) {
      this.spawnSparks(bx, by, bz, feedback.sparkColorHex, feedback.sparkCount);
    }
    if (feedback.puffCount > 0) {
      this.vfx.emitPuffs(bx, by - 0.1, bz, feedback.puffColorHex, feedback.puffCount, this.qualityBudget, 0.85);
    }
  }

  public setBotTheme(theme: BotThemeId, burst = false) {
    const next = normalizeBotTheme(theme);
    this.rig.setTheme(next);
    if (burst) {
      const def = BOT_THEMES[next];
      this.celebrateTimer = Math.max(this.celebrateTimer, 1.25);
      this.setMood('happy', 1.55);
      this.spawnSparks(
        this.rig.root.position.x,
        this.rig.root.position.y + 0.95,
        this.rig.root.position.z,
        def.bodyHex,
        24
      );
      this.spawnConfetti(
        this.rig.root.position.x,
        this.rig.root.position.y + 1.55,
        this.rig.root.position.z,
        22
      );
    }
  }

  public setPaintConfig(config: PaintBoothConfig, burstPart: PaintPartKey | null = null) {
    const norm = normalizePaintConfig(config);
    this.rig.applyPaintConfig(norm);
    if (burstPart) {
      const spec = norm.parts[burstPart];
      const hexNum = parseInt(spec.color.slice(1), 16) || 0x38bdf8;
      const pPos = this.rig.getPartWorldPosition(burstPart, _rayOrigin);
      this.touchTimer = Math.max(this.touchTimer, 0.9);
      this.setMood('happy', 1.15);
      this.spawnSparks(pPos.x, pPos.y, pPos.z, hexNum, 22);
      this.spawnSparks(pPos.x, pPos.y + 0.15, pPos.z, 0xfde047, 10);
    }
  }

  public setBotCharacter(charId: BotCharacterId, celebrate = false) {
    const norm = normalizeBotCharacter(charId);
    this.rig.setCharacter(norm);
    if (celebrate) {
      this.touchTimer = Math.max(this.touchTimer, 1.35);
      this.setMood('happy', 1.65);
      this.spawnConfetti(
        this.rig.root.position.x,
        this.rig.root.position.y + 1.6,
        this.rig.root.position.z,
        34
      );
      this.spawnSparks(
        this.rig.root.position.x,
        this.rig.root.position.y + 1.1,
        this.rig.root.position.z,
        0x38bdf8,
        18
      );
    }
  }

  public playSimulation(result: SimResult, options?: { stepMode?: boolean }) {
    this.resetBotToTrackStart();
    this.simResult = result;
    this.simStepMode = Boolean(options?.stepMode);
    this.simPaused = false;
    this.simStepFinished = false;
    this.simQueue = result.events.map((ev) => ({
      ev,
      duration: ev.action === 'SCAN' ? (this.gentleSpeed ? 0.55 : 0.36) : this.gentleSpeed ? 0.72 : 0.48
    }));
    this.simIndex = 0;
    this.simElapsed = 0;
    this.mode = 'SIMULATING';
    this.cb.onSimPauseChange?.(false, false, this.simQueue.length <= 1);

    if (this.simQueue.length === 0) {
      this.finishSimulation();
      return;
    }
    this.prepareCurrentSimStep();
  }

  public setSimStepMode(enabled: boolean) {
    this.simStepMode = Boolean(enabled);
  }

  public pauseSimulation() {
    if (this.mode !== 'SIMULATING' || this.simIndex < 0) return;
    this.simPaused = true;
    const isLast = this.simIndex >= this.simQueue.length - 1;
    this.cb.onSimPauseChange?.(true, this.simStepFinished, isLast);
  }

  public resumeSimulation() {
    if (this.mode !== 'SIMULATING' || this.simIndex < 0) return;
    this.simStepMode = false;
    this.simPaused = false;
    if (this.simStepFinished) {
      this.simStepFinished = false;
      this.simIndex++;
      this.simElapsed = 0;
      if (this.simIndex >= this.simQueue.length) {
        this.finishSimulation();
        return;
      }
      this.prepareCurrentSimStep();
    }
    const isLast = this.simIndex >= this.simQueue.length - 1;
    this.cb.onSimPauseChange?.(false, false, isLast);
  }

  public advanceSimulationStep() {
    if (this.mode !== 'SIMULATING' || this.simIndex < 0) return;
    this.simStepMode = true;
    if (!this.simStepFinished && this.simPaused) {
      // Paused mid-animation: smoothly finish the current instruction then auto-pause
      this.simPaused = false;
      const isLast = this.simIndex >= this.simQueue.length - 1;
      this.cb.onSimPauseChange?.(false, false, isLast);
      return;
    }
    if (!this.simStepFinished) {
      // Currently animating: snap current instruction to its landed pose and advance immediately
      const curStep = this.simQueue[this.simIndex];
      if (curStep && curStep.ev.action !== 'SCAN') {
        this.botTrackZ = clampTrackBotZBeforeClosedGate(this.level?.track, this.simToZ, false);
        const landedSurface = sampleTrackSurfaceAtZ(this.level?.track, this.botTrackZ);
        this.botTrackY = curStep.ev.status === 'fall' ? -3.5 : landedSurface.y;
        this.botTrackPitchX = curStep.ev.status === 'fall' ? 0 : landedSurface.pitchX;
      }
    }
    this.simStepFinished = false;
    this.simPaused = false;
    this.simIndex++;
    this.simElapsed = 0;
    if (this.simIndex >= this.simQueue.length) {
      this.finishSimulation();
      return;
    }
    const isLast = this.simIndex >= this.simQueue.length - 1;
    this.cb.onSimPauseChange?.(false, false, isLast);
    this.prepareCurrentSimStep();
  }

  public stopSimulation() {
    this.simQueue = [];
    this.simIndex = -1;
    this.simElapsed = 0;
    this.simResult = null;
    this.simPaused = false;
    this.simStepFinished = false;
    this.simScanMatch = null;
    this.resetBotToTrackStart();
    this.setMood('neutral', 0);
    this.mode = 'CODE_3D';
    this.cb.onSimPauseChange?.(false, false, false);
  }

  private prepareCurrentSimStep() {
    const step = this.simQueue[this.simIndex];
    if (!step) return;
    const ev = step.ev;
    this.simFromZ = getTrackBotStopZ(this.level?.track, ev.fromPos);
    this.simToZ = getTrackBotStopZ(this.level?.track, ev.toPos);
    this.simScanMatch = ev.scanMatch ?? null;

    this.cb.onSimProgress(this.simIndex, ev);

    if (typeof ev.tick === 'number') {
      this.syncHazardsToTick(ev.tick, false);
    }

    if (ev.action === 'SCAN') {
      this.setMood('scan', step.duration);
      SFX.sensorScan(Boolean(ev.scanMatch));
    } else if (ev.action === 'WAIT') {
      this.setMood('scan', step.duration);
      const marker=this.surveyMarkers.get(ev.toPos);
      if(marker && ev.status==='ok' && ev.fromPos===ev.toPos && !this.surveyedStations.has(ev.toPos)){
        this.surveyedStations.add(ev.toPos);marker.material.color.setHex(0x34d399);marker.scale.setScalar(1.2);
        this.spawnSparks(0,0.5,this.simToZ,0x67e8f9,12);SFX.sensorScan(true);
      }else SFX.uiTick();
    } else if (ev.action === 'JUMP') {
      this.setMood('neutral', 0);
      this.spawnSparks(0, 0.5, this.simFromZ, this.nextTrailColor(), 14);
      SFX.jump();
    } else if (ev.action === 'BOOST') {
      this.setMood('boost', step.duration);
      this.spawnSparks(0, 0.7, this.simFromZ, this.nextTrailColor(), 20);
      SFX.boost();
    } else {
      this.setMood('neutral', 0);
      if (this.activeLoadout.equippedTrailId !== 'classic_spark') {
        this.spawnSparks(0, 0.25, this.simFromZ, this.nextTrailColor(), 8);
      }
      SFX.step();
    }
    if (ev.status === 'stuck') {
      this.spawnSparks(0, 0.35, this.simToZ, 0xd97706, 18);
    } else if (ev.status === 'fail' && ev.hazardId) {
      this.spawnSparks(0, 0.95, this.simToZ, 0xfb7185, 22);
      this.rig.injectImpact(0.75, 0.45, 0);
      this.cameraJuice.addImpulse(0.9, -0.55, 0.6, 0);
    }

    if (ev.newCrystals && ev.newCrystals.length > 0) {
      ev.newCrystals.forEach((tileIdx) => {
        const mesh = this.crystalMeshes.get(tileIdx);
        if (mesh) {
          mesh.visible = false;
          this.spawnSparks(mesh.position.x, mesh.position.y, mesh.position.z, 0x67e8f9, 16);
        }
      });
      SFX.crystal();
    }
  }

  private finishSimulation() {
    const res = this.simResult;
    if (!res) return;
    this.simPaused = false;
    this.simStepFinished = false;
    this.simIndex = -1;
    this.mode = 'CODE_3D';
    this.cb.onSimPauseChange?.(false, false, false);
    if (res.status === 'win') {
      this.simFailResetTimer = 0;
      this.setMood('happy', 2.4);
      this.companionDrone.triggerCelebrate();
      SFX.chirpHappy();
    } else if (
      res.failCode === 'empty' ||
      res.failCode === 'empty_container' ||
      res.failCode === 'empty_function' ||
      res.failCode === 'short'
    ) {
      this.setMood('confused', 2.8);
      SFX.chirpConfused();
      if (Math.abs(this.botTrackZ - TRACK_START_Z) > 0.05 || this.botTrackY < -0.1) {
        this.simFailResetTimer = 1.25;
      }
    } else {
      this.setMood('sad', 3.0);
      SFX.chirpSad();
      if (Math.abs(this.botTrackZ - TRACK_START_Z) > 0.05 || this.botTrackY < -0.1) {
        this.simFailResetTimer = 1.25;
      }
    }
    this.cb.onSimComplete(res);
  }

  private handleResize = () => {
    if (!this.renderer) return;
    this.width = Math.max(320, this.container.clientWidth || window.innerWidth);
    this.height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (this.mode === 'CODE_3D' && !this.codeCamUserDragged) {
      const framing = computeResponsiveCameraFraming('CODE_3D', this.width, this.height);
      this.codeCamTarget = computeCodeCameraPreset(
        this.codeCamPreset,
        this.getCurrentTrackLength(),
        this.width,
        this.height,
        framing.baseFov
      );
    }
    if (this.renderPipeline) {
      this.renderPipeline.resize(this.width, this.height);
    } else {
      this.renderer.setSize(this.width, this.height);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    this.lookX = THREE.MathUtils.clamp(nx, -1, 1);
    this.lookY = THREE.MathUtils.clamp(-ny, -1, 1);

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger touch pinch-to-zoom in BUILD_3D, PAINT_BOOTH, & CODE_3D
    if (
      this.activePointers.size === 2 &&
      (this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH' || this.mode === 'CODE_3D')
    ) {
      const pts = Array.from(this.activePointers.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchStartDist > 12) {
        const ratio = this.pinchStartDist / Math.max(12, curDist);
        this.pointerDragged = true;
        if (this.mode === 'CODE_3D') {
          this.codeCamUserDragged = true;
          this.codeCamTarget = clampCodeCameraState(
            {
              ...this.codeCamTarget,
              distance: this.codePinchStartDist * ratio
            },
            this.getCurrentTrackLength()
          );
        } else {
          this.workshopAutoSpin = false;
          this.orbitTarget = clampWorkshopOrbit({
            ...this.orbitTarget,
            distance: this.pinchStartOrbitDist * ratio
          });
        }
      }
      return;
    }

    // Touch swipe steering & jump during ACTION_RUN_3D
    if (
      this.pointerDownActive &&
      e.pointerId === this.pointerDownId &&
      this.mode === 'ACTION_RUN_3D' &&
      !this.swipeConsumed
    ) {
      const sdx = e.clientX - this.pointerDownX;
      const sdy = e.clientY - this.pointerDownY;
      if (Math.hypot(sdx, sdy) >= 34) {
        this.swipeConsumed = true;
        this.pointerDragged = true;
        if (Math.abs(sdx) >= Math.abs(sdy)) {
          this.steerActionDash(sdx > 0 ? 1 : -1);
        } else if (sdy < -24) {
          this.jumpActionDash();
        }
      }
      return;
    }

    if (
      this.pointerDownActive &&
      e.pointerId === this.pointerDownId &&
      this.mode === 'CODE_3D'
    ) {
      const dx = e.clientX - this.pointerLastX;
      const dy = e.clientY - this.pointerLastY;
      this.pointerLastX = e.clientX;
      this.pointerLastY = e.clientY;
      const totalDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (totalDist >= 6) {
        this.pointerDragged = true;
        this.codeCamUserDragged = true;
      }
      if (this.pointerDragged) {
        const panScale = 0.036 * Math.max(0.75, this.codeCamTarget.distance / 15);
        this.codeCamTarget = clampCodeCameraState(
          {
            ...this.codeCamTarget,
            yaw: this.codeCamTarget.yaw - dx * 0.0072,
            focusZ: this.codeCamTarget.focusZ - dy * panScale
          },
          this.getCurrentTrackLength()
        );
      }
      return;
    }

    if (
      this.pointerDownActive &&
      e.pointerId === this.pointerDownId &&
      (this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH')
    ) {
      const dx = e.clientX - this.pointerLastX;
      const dy = e.clientY - this.pointerLastY;
      this.pointerLastX = e.clientX;
      this.pointerLastY = e.clientY;
      const totalDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (totalDist >= 7) {
        this.pointerDragged = true;
        this.workshopAutoSpin = false;
      }
      if (this.pointerDragged) {
        this.orbitTarget = clampWorkshopOrbit({
          azimuth: this.orbitTarget.azimuth - dx * 0.0085,
          polar: this.orbitTarget.polar - dy * 0.0065,
          distance: this.orbitTarget.distance
        });
      }
    }
  };

  private handleCanvasWheel = (e: WheelEvent) => {
    if (this.mode === 'CODE_3D') {
      e.preventDefault();
      this.codeCamUserDragged = true;
      this.codeCamTarget = clampCodeCameraState(
        {
          ...this.codeCamTarget,
          distance: this.codeCamTarget.distance + e.deltaY * 0.009
        },
        this.getCurrentTrackLength()
      );
      return;
    }
    if (this.mode !== 'BUILD_3D' && this.mode !== 'PAINT_BOOTH') return;
    e.preventDefault();
    this.orbitTarget = clampWorkshopOrbit({
      ...this.orbitTarget,
      distance: this.orbitTarget.distance + e.deltaY * 0.0032
    });
  };

  private resolveTouchZone(obj: THREE.Object3D | null): RobotTouchZone {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur.userData && typeof cur.userData.touchZone === 'string') {
        return cur.userData.touchZone as RobotTouchZone;
      }
      cur = cur.parent;
    }
    return 'body';
  }

  private resolvePaintPart(obj: THREE.Object3D | null): PaintPartKey {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur.userData && typeof cur.userData.paintPart === 'string') {
        return cur.userData.paintPart as PaintPartKey;
      }
      cur = cur.parent;
    }
    return 'chassis';
  }

  private handleCanvasPointerDown = (e: PointerEvent) => {
    if (!this.renderer) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.pinchStartOrbitDist = this.orbitTarget.distance;
      this.codePinchStartDist = this.codeCamTarget.distance;
      this.pointerDragged = true;
      return;
    }
    this.pointerDownActive = true;
    this.pointerDownId = e.pointerId;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.pointerLastX = e.clientX;
    this.pointerLastY = e.clientY;
    this.pointerDragged = false;
    this.swipeConsumed = false;
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.pinchStartDist = 0;
    }
    if (!this.pointerDownActive || e.pointerId !== this.pointerDownId) return;
    const wasDragged = this.pointerDragged;
    this.pointerDownActive = false;
    this.pointerDownId = -1;
    this.pointerDragged = false;
    this.swipeConsumed = false;

    if (wasDragged || !this.renderer) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    if (this.mode === 'CIRCUIT_3D') {
      const hits = this.raycaster.intersectObjects(this.circuitInteractables, false);
      if (hits.length > 0) {
        const { circuitRow, circuitCol } = hits[0].object.userData;
        if (typeof circuitRow === 'number' && typeof circuitCol === 'number') {
          this.cb.onCircuitCellTap(circuitRow, circuitCol);
          return;
        }
      }
    }

    if (
      this.mode === 'TITLE' ||
      this.mode === 'BUILD_3D' ||
      this.mode === 'PAINT_BOOTH' ||
      this.mode === 'CODE_3D' ||
      this.mode === 'VICTORY'
    ) {
      if (this.companionDrone.root.visible) {
        const droneHits = this.raycaster.intersectObject(this.companionDrone.root, true);
        if (droneHits.length > 0) {
          const hit = droneHits[0];
          this.companionDrone.triggerHappySpin();
          this.setMood('happy', 1.1);
          this.spawnSparks(hit.point.x, hit.point.y, hit.point.z, this.nextTrailColor(), 16);
          this.cb.onDroneTap?.();
          return;
        }
      }

      const botHits = this.raycaster.intersectObject(this.rig.visual, true);
      if (botHits.length > 0) {
        const hit = botHits[0];
        if (this.mode === 'PAINT_BOOTH') {
          const pickedPart = this.resolvePaintPart(hit.object);
          this.touchTimer = 0.85;
          this.setMood('happy', 1.0);
          this.spawnSparks(hit.point.x, hit.point.y, hit.point.z, 0xe879f9, 14);
          this.cb.onPaintPartPick?.(pickedPart);
          return;
        }
        const zone = this.resolveTouchZone(hit.object);
        this.touchTimer = 1.45;
        this.setMood('happy', 1.45);
        this.spawnSparks(hit.point.x, hit.point.y, hit.point.z, 0xf472b6, 14);
        this.spawnSparks(hit.point.x, hit.point.y, hit.point.z, 0xfde047, 10);
        this.cb.onBotTap(zone);
      }
    }
  };

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const frameMs = now - this.lastTs;
    const rawDt = Math.min(0.25, Math.max(0.001, frameMs / 1000));
    const dt = Math.min(0.05, rawDt);
    this.lastTs = now;
    this.totalTime += rawDt;

    const frameSec = frameMs / 1000;
    const adaptiveBudget = this.qualityMonitor.recordFrame(frameSec);
    if (adaptiveBudget) {
      this.applyQualityBudget(adaptiveBudget);
    }

    this.env.animateEnvironment(this.totalTime,this.pathReducedMotion);
    // Spin windmills, solar horizon ring, ambient dust motes & crystals
    for (let i = 0; i < this.env.windmills.length; i++) {
      this.env.windmills[i].rotation.z += dt * (0.7 + i * 0.15);
    }
    this.env.solarRing.rotation.z = -0.1 + Math.sin(this.totalTime * 0.14) * 0.04;
    this.env.turntableOuterRing.rotation.z -= dt * 0.22;

    const inWorkshopMode =
      this.mode === 'TITLE' || this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH';
    const isActivelyInstalling = Boolean(
      this.installSeq && !this.installSeq.celebrated && this.buildTargetSlot
    );
    this.renderPipeline?.setBloomSuppressed(inWorkshopMode && !isActivelyInstalling);

    // Hide twinkling ambient motes inside the workshop so kids' eyes stay completely relaxed
    const showMotes = this.qualityBudget.ambientMotesVisible && !inWorkshopMode;
    this.env.ambientMotes.visible = showMotes;
    if (showMotes) {
      for (let i = 0; i < this.env.moteSeeds.length; i++) {
        const m = this.env.moteSeeds[i];
        const bobY = m.y + Math.sin(this.totalTime * m.speed + m.phase) * 0.24;
        const driftX = m.x + Math.cos(this.totalTime * m.speed * 0.5 + m.phase) * 0.18;
        _dummy.position.set(driftX, bobY, m.z);
        _dummy.rotation.set(this.totalTime * 0.4 + m.phase, this.totalTime * 0.6 + m.phase, 0);
        _dummy.scale.setScalar(m.scale);
        _dummy.updateMatrix();
        this.env.ambientMotes.setMatrixAt(i, _dummy.matrix);
      }
      this.env.ambientMotes.instanceMatrix.needsUpdate = true;
    }

    this.crystalMeshes.forEach((m, idx) => {
      if (m.visible) {
        m.rotation.y += dt * 2.2;
        const baseY = typeof m.userData.baseY === 'number' ? m.userData.baseY : 1.0;
        m.position.y = baseY + Math.sin(this.totalTime * 3 + idx) * 0.14;
      }
    });

    // Gate Doors Open Smoothly when solved
    const targetOpen = this.mode === 'ACTION_RUN_3D' || this.mode === 'VICTORY' ? 1.85 : 0;
    this.gateOpenAmt = THREE.MathUtils.damp(this.gateOpenAmt, targetOpen, 7, dt);
    if (this.gateLeftDoor && this.gateRightDoor) {
      this.gateLeftDoor.position.x = -0.975 - this.gateOpenAmt;
      this.gateRightDoor.position.x = 0.975 + this.gateOpenAmt;
    }

    // Chapter 4 Moving Hazards (Timed Laser Barriers & Patrol Drones) smooth damped updates
    if (this.dynamicHazardVisuals.size > 0) {
      if (this.mode === 'CODE_3D') {
        let previewTick = 0;
        if (this.pathHoveredBlockId && this.pathPreviewModel) {
          const hoveredSeg = this.pathPreviewModel.segments.find((seg) =>
            isPreviewItemHighlighted(seg, this.pathHoveredBlockId)
          );
          if (hoveredSeg && typeof hoveredSeg.tick === 'number') {
            previewTick = hoveredSeg.tick;
          }
        }
        if (previewTick !== this.lastHazardTick) {
          this.syncHazardsToTick(previewTick, false);
        }
      }

      this.dynamicHazardVisuals.forEach((vis) => {
        if (vis.kind === 'laser_barrier') {
          const goalScale = vis.targetActive ? 1 : 0;
          vis.beamScale = THREE.MathUtils.damp(vis.beamScale, goalScale, 12, dt);
          vis.beamGroup.visible = vis.beamScale > 0.03;
          vis.beamGroup.scale.set(1, Math.max(0.02, vis.beamScale), Math.max(0.02, vis.beamScale));
          const capHex = vis.targetActive ? 0xfb7185 : 0x34d399;
          const capEmissive = vis.targetActive ? 0xe11d48 : 0x059669;
          for (let i = 0; i < vis.capMats.length; i++) {
            vis.capMats[i].color.setHex(capHex);
            vis.capMats[i].emissive.setHex(capEmissive);
          }
        } else {
          vis.podGroup.position.z = THREE.MathUtils.damp(vis.podGroup.position.z, vis.targetZ, 10, dt);
          vis.podGroup.position.y = 1.18 + Math.sin(this.totalTime * 2.4) * 0.08;
          vis.podGroup.rotation.y = THREE.MathUtils.damp(vis.podGroup.rotation.y, vis.targetYaw, 8, dt);
          vis.rotorGroup.rotation.y += dt * 7.5;
        }
      });
    }

    // Chapter 4 Boss Sentinel Guardian smooth hover & shield petal opening as cores light up
    if (this.bossRig) {
      const allCleared =
        this.bossRig.litCores >= this.bossRig.totalCores || this.mode === 'VICTORY';
      this.bossRig.coreGroup.position.y = Math.sin(this.totalTime * 1.9) * 0.1;
      this.bossRig.visorMat.color.setHex(allCleared ? 0x34d399 : 0xfb7185);
      this.bossRig.visorMat.emissive.setHex(allCleared ? 0x10b981 : 0xe11d48);
      for (let i = 0; i < this.bossRig.petals.length; i++) {
        const petal = this.bossRig.petals[i];
        const opened = i < this.bossRig.litCores || this.mode === 'VICTORY';
        const targetZ = opened ? 1.55 : 1.08;
        const targetTilt = opened ? -0.62 : 0;
        petal.position.z = THREE.MathUtils.damp(petal.position.z, targetZ, 7, dt);
        petal.rotation.x = THREE.MathUtils.damp(petal.rotation.x, targetTilt, 7, dt);
      }
    }

    // 2-Phase Mechanic Installation Work -> Joyful Celebration Sequence
    if (this.installSeq) {
      this.installSeq.elapsed = (now - this.installSeq.startMs) / 1000;
      const wPos = this.rig.getSlotWorldPosition(this.installSeq.slot[0], this.installSeq.slot[1], _weldEnd);

      if (this.installSeq.elapsed < 0.9) {
        // Phase 1: Mechanic welding waves
        if (this.installSeq.sparkStage === 1 && this.installSeq.elapsed >= 0.3) {
          this.installSeq.sparkStage = 2;
          this.spawnSparks(wPos.x, wPos.y, wPos.z, 0xfde047, 16);
          SFX.weldSparks();
        } else if (this.installSeq.sparkStage === 2 && this.installSeq.elapsed >= 0.6) {
          this.installSeq.sparkStage = 3;
          this.spawnSparks(wPos.x, wPos.y, wPos.z, 0x38bdf8, 18);
          this.spawnSparks(wPos.x, wPos.y, wPos.z, 0xfde047, 12);
        }
      } else if (!this.installSeq.celebrated) {
        // Phase 2: Transition to big joyful celebration dance!
        this.installSeq.celebrated = true;
        this.buildTimer = 0;
        this.buildTargetSlot = null;
        this.celebrateTimer = 1.8;
        this.setMood('happy', 1.95);
        this.spawnConfetti(0, 1.65, 0, 38);
        SFX.installComplete();
        this.cb.onInstallPhaseChange?.('celebrating');
        this.cb.onInstallCelebrate?.(this.installSeq.part);
      } else if (this.installSeq.elapsed >= 2.7) {
        this.installSeq = null;
        this.cb.onInstallPhaseChange?.('idle');
      }
    }

    // Turntable glow & tactile lab props animation (steady & glare-free; active shimmer ONLY during equipment install)
    const ringMat = this.env.turntableRing.material as THREE.MeshStandardMaterial;
    if (this.buildTimer > 0) {
      this.env.turntableRing.rotation.z += dt * 1.4;
      ringMat.color.setHex(0xfbbf24);
      ringMat.emissive.setHex(0xf59e0b);
      ringMat.emissiveIntensity = 0.68;
    } else if (this.celebrateTimer > 0) {
      this.env.turntableRing.rotation.z += dt * 1.2;
      ringMat.color.setHex(0x34d399);
      ringMat.emissive.setHex(0x10b981);
      ringMat.emissiveIntensity = 0.6;
    } else if (this.mode === 'PAINT_BOOTH') {
      this.env.turntableRing.rotation.z += dt * 0.5;
      ringMat.color.setHex(0xe879f9);
      ringMat.emissive.setHex(0xc026d3);
      ringMat.emissiveIntensity = 0.52;
    } else {
      this.env.turntableRing.rotation.z += dt * 0.28;
      ringMat.color.setHex(0x38bdf8);
      ringMat.emissive.setHex(0x0ea5e9);
      ringMat.emissiveIntensity = 0.42;
    }

    const gearMult = this.buildTimer > 0 ? 3.2 : this.celebrateTimer > 0 ? 1.8 : 0.7;
    this.env.gearLarge.rotation.z += dt * 0.8 * gearMult;
    this.env.gearSmall.rotation.z -= dt * 1.2 * gearMult;

    // Helper Drone: swoops in to weld ONLY during Phase 1 of equipment installation, calm hover otherwise
    const installing = isActivelyInstalling;
    if (installing && this.buildTargetSlot) {
      const wPos = this.rig.getSlotWorldPosition(this.buildTargetSlot[0], this.buildTargetSlot[1], _weldEnd);
      _droneGoal.set(
        wPos.x + (wPos.x >= 0 ? 0.92 : -0.92) + Math.cos(this.totalTime * 5) * 0.1,
        Math.max(1.2, wPos.y + 0.58 + Math.sin(this.totalTime * 6) * 0.06),
        wPos.z + (wPos.z >= 0 ? 0.85 : -0.85)
      );
      this.env.helperDrone.position.x = THREE.MathUtils.damp(this.env.helperDrone.position.x, _droneGoal.x, 9, dt);
      this.env.helperDrone.position.y = THREE.MathUtils.damp(this.env.helperDrone.position.y, _droneGoal.y, 9, dt);
      this.env.helperDrone.position.z = THREE.MathUtils.damp(this.env.helperDrone.position.z, _droneGoal.z, 9, dt);
      this.env.helperDrone.lookAt(wPos);
      this.env.droneRotor.rotation.y += dt * 20;

      this.env.droneWeldBeam.visible = true;
      _weldStart.copy(this.env.helperDrone.position);
      _weldDiff.subVectors(_weldEnd, _weldStart);
      const len = _weldDiff.length();
      if (len > 0.05) {
        _beamMid.addVectors(_weldStart, _weldEnd).multiplyScalar(0.5);
        _weldDiff.normalize();
        _quat.setFromUnitVectors(_beamUp, _weldDiff);
        this.env.droneWeldBeam.position.copy(_beamMid);
        this.env.droneWeldBeam.quaternion.copy(_quat);
        const gentleShimmer = 0.92 + Math.sin(this.totalTime * 10) * 0.08;
        this.env.droneWeldBeam.scale.set(gentleShimmer, len, gentleShimmer);
        (this.env.droneWeldBeam.material as THREE.MeshBasicMaterial).color.setHex(0x7dd3fc);
      }
    } else {
      this.env.droneWeldBeam.visible = false;
      const cheerY =
        this.celebrateTimer > 0
          ? 2.48 + Math.abs(Math.sin(this.totalTime * 6)) * 0.2
          : 2.25 + Math.sin(this.totalTime * 1.4) * 0.08;
      this.env.helperDrone.position.x = THREE.MathUtils.damp(this.env.helperDrone.position.x, -1.95, 5.5, dt);
      this.env.helperDrone.position.y = THREE.MathUtils.damp(this.env.helperDrone.position.y, cheerY, 6, dt);
      this.env.helperDrone.position.z = THREE.MathUtils.damp(this.env.helperDrone.position.z, -0.25, 5.5, dt);
      this.env.helperDrone.rotation.x = THREE.MathUtils.damp(this.env.helperDrone.rotation.x, 0, 6, dt);
      this.env.helperDrone.rotation.z = THREE.MathUtils.damp(this.env.helperDrone.rotation.z, 0, 6, dt);
      this.env.helperDrone.rotation.y = THREE.MathUtils.damp(
        this.env.helperDrone.rotation.y,
        this.celebrateTimer > 0 ? this.env.helperDrone.rotation.y + dt * 4 : 0.45 + this.lookX * 0.35,
        5,
        dt
      );
      this.env.droneRotor.rotation.y += dt * (this.celebrateTimer > 0 ? 10 : 3.5);
    }
    for (let i = 0; i < this.env.conduitOrbs.length; i++) {
      const orb = this.env.conduitOrbs[i];
      const baseOffset = (orb.userData.phaseOffset as number) || 0;
      if (this.buildTimer > 0) {
        const phase = (((this.totalTime * 0.55 + baseOffset) % 1) + 1) % 1;
        orb.position.z = THREE.MathUtils.lerp(-1.95, -4.15, phase);
        orb.scale.setScalar(0.75 + Math.sin(phase * Math.PI) * 0.25);
      } else {
        orb.position.z = THREE.MathUtils.lerp(-2.15, -3.95, baseOffset);
        orb.scale.setScalar(0.65);
      }
    }

    // Playable 3D Holographic Ghost Preview Update
    if (this.ghostPlan) {
      this.ghostElapsed += rawDt;
      if (this.ghostElapsed >= this.ghostDuration) {
        this.clearGhostPreview();
      } else if (this.ghostPlan.kind === 'build') {
        this.ghostGroup.visible = true;
        this.ghostBotGroup.visible = false;
        this.ghostPartOrb.visible = true;
        this.ghostCircuitRing.visible = false;
        const [tr, tc] = this.ghostPlan.targetSlot;
        const off = CHASSIS_SLOT_OFFSETS[`${tr},${tc}`] || [0, 0.9, 0];
        _ghostPos.set(off[0], off[1], off[2]);
        this.rig.visual.localToWorld(_ghostPos);
        const startX = -1.65;
        const startY = 1.25;
        const startZ = 1.25;
        const cycle = (this.ghostElapsed / 1.4) % 1;
        const arc = Math.sin(cycle * Math.PI) * 0.75;
        this.ghostPartOrb.position.set(
          THREE.MathUtils.lerp(startX, _ghostPos.x, cycle),
          THREE.MathUtils.lerp(startY, _ghostPos.y, cycle) + arc,
          THREE.MathUtils.lerp(startZ, _ghostPos.z, cycle)
        );
        this.ghostPartOrb.rotation.y += dt * 4;
        for (let i = 0; i < this.ghostArcDots.length; i++) {
          const dot = this.ghostArcDots[i];
          const f = (i + 1) / (this.ghostArcDots.length + 1);
          dot.visible = true;
          dot.position.set(
            THREE.MathUtils.lerp(startX, _ghostPos.x, f),
            THREE.MathUtils.lerp(startY, _ghostPos.y, f) + Math.sin(f * Math.PI) * 0.75,
            THREE.MathUtils.lerp(startZ, _ghostPos.z, f)
          );
          dot.scale.setScalar(0.75 + Math.sin(this.totalTime * 6 - i) * 0.25);
        }
      } else if (this.ghostPlan.kind === 'code') {
        this.ghostGroup.visible = true;
        this.ghostBotGroup.visible = true;
        this.ghostPartOrb.visible = false;
        this.ghostCircuitRing.visible = false;
        const evs = this.ghostPlan.simResult.events.filter((ev) => ev.action !== 'SCAN');
        const stepCount = Math.max(1, evs.length);
        const progress = Math.min(0.999, this.ghostElapsed / this.ghostDuration);
        const rawIdx = progress * stepCount;
        const idx = Math.min(evs.length - 1, Math.floor(rawIdx));
        const localT = rawIdx - idx;
        const ev = evs[idx];
        if (ev) {
          if (typeof ev.tick === 'number' && ev.tick !== this.lastHazardTick) {
            this.syncHazardsToTick(ev.tick, false);
          }
          const fZ = getTrackBotStopZ(this.level?.track, ev.fromPos);
          const tZ = getTrackBotStopZ(this.level?.track, ev.toPos);
          const gz = clampTrackBotZBeforeClosedGate(
            this.level?.track,
            THREE.MathUtils.lerp(fZ, tZ, localT),
            false
          );
          const gSurf = sampleTrackSurfaceAtZ(this.level?.track, gz);
          const fSurf = sampleTrackSurfaceAtZ(this.level?.track, fZ);
          const tSurf = sampleTrackSurfaceAtZ(this.level?.track, tZ);
          const baseLerpY = THREE.MathUtils.lerp(fSurf.y, tSurf.y, localT);
          const gy =
            ev.action === 'WAIT'
              ? gSurf.y + Math.sin(localT * Math.PI) * 0.22
              : ev.action === 'JUMP'
                ? Math.max(gSurf.y, baseLerpY + Math.sin(localT * Math.PI) * 1.9)
                : ev.action === 'BOOST'
                  ? Math.max(gSurf.y + 0.04, baseLerpY + Math.sin(localT * Math.PI) * 0.95)
                  : gSurf.y;
          this.ghostBotGroup.position.set(0, gy, gz);
          this.ghostBotGroup.rotation.x = gy <= gSurf.y + 0.12 ? gSurf.pitchX : 0;
          this.ghostBotGroup.rotation.y = 0;
          this.ghostBotGroup.scale.setScalar(1.02 + Math.sin(this.totalTime * 8) * 0.03);
          for (let i = 0; i < this.ghostArcDots.length; i++) {
            const dot = this.ghostArcDots[i];
            const f = (i + 1) / (this.ghostArcDots.length + 1);
            const dzDot = THREE.MathUtils.lerp(fZ, tZ, f);
            const dotSurf = sampleTrackSurfaceAtZ(this.level?.track, dzDot);
            dot.visible = true;
            _arcPos.set(
              0,
              Math.max(
                dotSurf.y + 0.25,
                ev.action === 'JUMP'
                  ? Math.sin(f * Math.PI) * 1.9
                  : ev.action === 'BOOST'
                    ? Math.sin(f * Math.PI) * 0.95
                    : dotSurf.y + 0.35
              ),
              dzDot
            );
            dot.position.copy(_arcPos);
            dot.scale.setScalar(0.85);
          }
        }
      } else if (this.ghostPlan.kind === 'circuit') {
        this.ghostGroup.visible = false;
        this.ghostCircuitRing.visible = true;
        const cellSize = 3.6 / 5;
        this.ghostCircuitRing.position.set(
          (this.ghostPlan.cell.c - 2) * cellSize,
          (2 - this.ghostPlan.cell.r) * cellSize,
          0.25
        );
        const pulse = 1 + Math.sin(this.totalTime * 7) * 0.16;
        this.ghostCircuitRing.scale.setScalar(pulse);
        this.ghostCircuitRing.rotation.z += dt * 2.5;
      }
    } else {
      this.ghostGroup.visible = false;
      this.ghostCircuitRing.visible = false;
    }

    // Live 3D Holographic Path Preview (CODE_3D only, hides automatically during playback or Ghost Demo)
    const showLivePath =
      this.mode === 'CODE_3D' &&
      this.pathPreviewEnabled &&
      !this.ghostPlan &&
      Boolean(this.pathPreviewModel && this.pathPreviewModel.segments.length > 0);
    this.pathPreviewGroup.visible = showLivePath;
    if (showLivePath && this.pathPreviewModel) {
      const hoveredId = this.pathHoveredBlockId;
      const hasHover = Boolean(hoveredId);

      for (let i = 0; i < this.pathSegmentVisuals.length; i++) {
        const item = this.pathSegmentVisuals[i];
        const highlighted = isPreviewItemHighlighted(item.segment, hoveredId);
        const opacityMult = !hasHover ? 1 : highlighted ? 1.32 : 0.22;
        const targetScaleY = !hasHover ? 1 : highlighted ? 1.05 : 0.96;
        item.group.scale.y = THREE.MathUtils.damp(item.group.scale.y, targetScaleY, 14, dt);
        for (let j = 0; j < item.materials.length; j++) {
          const goalOp = Math.min(1, item.baseOpacities[j] * opacityMult);
          item.materials[j].opacity = THREE.MathUtils.damp(item.materials[j].opacity, goalOp, 14, dt);
        }
      }

      for (let i = 0; i < this.pathScanVisuals.length; i++) {
        const scanVis = this.pathScanVisuals[i];
        const highlighted = isPreviewItemHighlighted(scanVis, hoveredId);
        const opacityMult = !hasHover ? 1 : highlighted ? 1.25 : 0.25;
        const goalOp = Math.min(1, scanVis.baseOpacity * opacityMult);
        scanVis.material.opacity = THREE.MathUtils.damp(scanVis.material.opacity, goalOp, 14, dt);
        const targetScale = highlighted ? 1.35 : 1;
        const nextScale = THREE.MathUtils.damp(scanVis.mesh.scale.x, targetScale, 14, dt);
        scanVis.mesh.scale.setScalar(nextScale);
        if (!this.pathReducedMotion) {
          scanVis.mesh.rotation.y += dt * 1.4;
          scanVis.mesh.position.y = scanVis.baseY + Math.sin(this.totalTime * 2.8 + i) * 0.07;
        }
      }

      if (this.pathEndpointBeacon && !this.pathReducedMotion) {
        this.pathEndpointBeacon.rotation.y += dt * 0.85;
        if (this.pathEndpointHazardGlyph) {
          this.pathEndpointHazardGlyph.rotation.y += dt * 2.2;
          this.pathEndpointHazardGlyph.position.y = 0.74 + Math.sin(this.totalTime * 3.8) * 0.08;
        }
      }

      const segs = this.pathPreviewModel.segments;
      const segCount = segs.length;
      if (this.pathPulseDots.length > 0 && segCount > 0) {
        for (let i = 0; i < this.pathPulseDots.length; i++) {
          const dot = this.pathPulseDots[i];
          const normProgress = (this.totalTime * 0.38 + dot.phaseOffset) % 1;
          const scaled = normProgress * segCount;
          const segIdx = Math.min(segCount - 1, Math.floor(scaled));
          const localT = scaled - segIdx;
          const seg = segs[segIdx];
          samplePathSegmentPointInto(this.level?.track, seg, localT, _arcPos);
          dot.mesh.position.copy(_arcPos);
          const dotGoalOp =
            !hasHover || isPreviewItemHighlighted(seg, hoveredId) ? 0.92 : 0.2;
          dot.material.opacity = THREE.MathUtils.damp(dot.material.opacity, dotGoalOp, 14, dt);
        }
      }
    }

    // Mood / Build / Celebration / Touch timers
    if (this.buildTimer > 0) {
      this.buildTimer = Math.max(0, this.buildTimer - dt);
      if (this.buildTimer === 0) this.buildTargetSlot = null;
    }
    if (this.celebrateTimer > 0) {
      this.celebrateTimer = Math.max(0, this.celebrateTimer - dt);
    }
    if (this.touchTimer > 0) {
      this.touchTimer = Math.max(0, this.touchTimer - dt);
    }
    if (this.codeFeedbackTimer > 0) {
      this.codeFeedbackTimer = Math.max(0, this.codeFeedbackTimer - dt);
      if (this.codeFeedbackTimer === 0) {
        this.codeFeedbackTier = null;
      }
    }
    if (this.moodTimer > 0) {
      this.moodTimer = Math.max(0, this.moodTimer - dt);
      if (this.moodTimer === 0 && this.mode !== 'SIMULATING') {
        this.botMood = 'neutral';
      }
    }
    if (this.simFailResetTimer > 0) {
      this.simFailResetTimer = Math.max(0, this.simFailResetTimer - dt);
      if (this.simFailResetTimer === 0 && this.mode === 'CODE_3D') {
        this.resetBotToTrackStart();
      }
    }

    // Update Simulation Playback
    let isMoving = false;
    let isAirborne = false;
    let speed = 0;
    let tiltPitch = 0;

    if (this.mode === 'SIMULATING' && this.simIndex >= 0) {
      const step = this.simQueue[this.simIndex];
      if (step) {
        if (!this.simPaused) {
          this.simElapsed += rawDt;
        }
        const t = Math.min(1, this.simElapsed / step.duration);
        const eased = 1 - Math.pow(1 - t, 2.2);

        if (step.ev.action === 'WAIT') {
          isMoving = false;
          speed = 0;
          const waitSurf = sampleTrackSurfaceAtZ(this.level?.track, this.simFromZ);
          this.botTrackZ = this.simFromZ;
          this.botTrackY = waitSurf.y + Math.sin(t * Math.PI) * 0.14;
          tiltPitch = 0;
        } else if (step.ev.action !== 'SCAN') {
          isMoving = !this.simPaused;
          speed = this.simPaused ? 0 : step.ev.action === 'BOOST' ? 14 : 7;
          this.botTrackZ = clampTrackBotZBeforeClosedGate(
            this.level?.track,
            THREE.MathUtils.lerp(this.simFromZ, this.simToZ, eased),
            false
          );
          const fromSurf = sampleTrackSurfaceAtZ(this.level?.track, this.simFromZ);
          const toSurf = sampleTrackSurfaceAtZ(this.level?.track, this.simToZ);
          const curSurf = sampleTrackSurfaceAtZ(this.level?.track, this.botTrackZ);
          const baseTrackY = THREE.MathUtils.lerp(fromSurf.y, toSurf.y, eased);
          if (step.ev.action === 'JUMP') {
            isAirborne = t > 0.04 && t < 0.96;
            this.botTrackY = Math.max(curSurf.y, baseTrackY + Math.sin(t * Math.PI) * 1.85);
            tiltPitch = (0.5 - t) * 0.45;
          } else if (step.ev.action === 'BOOST') {
            isAirborne = t > 0.15 && t < 0.85;
            this.botTrackY = Math.max(curSurf.y + 0.04, baseTrackY + Math.sin(t * Math.PI) * 0.95);
            tiltPitch = t < 0.96 ? -0.18 : 0;
          } else if (step.ev.status === 'fall') {
            this.botTrackY = -t * t * 3.5;
            tiltPitch = 0.5 * t;
          } else {
            this.botTrackY = curSurf.y;
          }
        }

        if (t >= 1 && !this.simPaused) {
          if (this.simStepMode) {
            this.simPaused = true;
            this.simStepFinished = true;
            const isLast = this.simIndex >= this.simQueue.length - 1;
            this.cb.onSimPauseChange?.(true, true, isLast);
          } else {
            this.simIndex++;
            this.simElapsed = 0;
            if (this.simIndex >= this.simQueue.length) {
              this.finishSimulation();
            } else {
              this.prepareCurrentSimStep();
            }
          }
        }
      }
    } else if (this.mode === 'ACTION_RUN_3D' && this.runnerMetrics) {
      const m = this.runnerMetrics;
      if (!m.finished) {
        isMoving = true;
        const boostMult = m.turboTimer > 0 ? 1.45 : 1;
        speed = this.runnerSpeed * boostMult;
        this.botTrackZ -= speed * rawDt;
        m.distance += speed * rawDt;
        if (m.turboTimer > 0) m.turboTimer = Math.max(0, m.turboTimer - rawDt);
        if (m.magnetTimer > 0) m.magnetTimer = Math.max(0, m.magnetTimer - rawDt);

        // Gravity & Jump
        if (this.runnerJumpY > 0 || this.runnerJumpVy !== 0) {
          this.runnerJumpY += this.runnerJumpVy * dt;
          this.runnerJumpVy -= 28 * dt;
          if (this.runnerJumpY <= 0) {
            this.runnerJumpY = 0;
            this.runnerJumpVy = 0;
            this.rig.injectImpact(0.75, 0.25, 0);
            this.cameraJuice.addImpulse(0, -0.75, 0, 0);
            this.vfx.emitShockwaveRing(
              this.runnerBotX,
              0.04,
              this.botTrackZ,
              0x38bdf8,
              0.38,
              1.7,
              0.32
            );
          }
        }
        isAirborne = this.runnerJumpY > 0.15;

        // Smooth surface & lane placement
        let goalX = 0;
        let goalY = this.runnerJumpY;
        let goalRoll = 0;
        if (m.surface === 'floor') {
          goalX = LANE_X[m.lane] ?? 0;
          goalY = this.runnerJumpY;
          goalRoll = 0;
        } else if (m.surface === 'leftWall') {
          goalX = -WALL_X + 0.52 + this.runnerJumpY * 0.6;
          goalY = WALL_Y[m.lane] ?? 1.5;
          goalRoll = -Math.PI / 2;
        } else {
          goalX = WALL_X - 0.52 - this.runnerJumpY * 0.6;
          goalY = WALL_Y[m.lane] ?? 1.5;
          goalRoll = Math.PI / 2;
        }
        this.runnerBotX = THREE.MathUtils.damp(this.runnerBotX, goalX, 14, dt);
        this.runnerBotY = THREE.MathUtils.damp(this.runnerBotY, goalY, 14, dt);
        this.runnerBotRoll = THREE.MathUtils.damp(this.runnerBotRoll, goalRoll, 14, dt);
        this.botTrackY = this.runnerBotY;

        // Emit continuous high-speed trailing particles behind wheels, thrusters & booster
        const info = computeChassisInfo(this.chassis);
        const safeDt = Math.max(0.004, dt);
        const botVx = (this.runnerBotX - this.prevRunnerBotX) / safeDt;
        const botVy = (this.runnerBotY - this.prevRunnerBotY) / safeDt;
        this.prevRunnerBotX = this.runnerBotX;
        this.prevRunnerBotY = this.runnerBotY;

        this.vfx.updateActionRunnerTrails(
          dt,
          {
            speed,
            surface: m.surface,
            isAirborne,
            turboActive: m.turboTimer > 0,
            hasThrusters: info.hasThrusters,
            hasBooster: info.hasBooster,
            hasMagnet: info.hasMagnet,
            botX: this.runnerBotX,
            botY: this.runnerBotY,
            botZ: this.botTrackZ,
            botVx,
            botVy,
            botRoll: this.runnerBotRoll
          },
          this.qualityBudget
        );

        // Recycle runner tunnel segments ahead of robot
        const segHalf = 16;
        for (const seg of this.runnerSegments) {
          if (seg.position.z > this.botTrackZ + segHalf * 1.5) {
            seg.position.z -= this.runnerSegments.length * segHalf;
          }
        }

        // Collisions & Magnet Pull on Runner Entities
        const pullRadius = m.magnetTimer > 0 || info.hasMagnet ? 4.4 : 1.55;
        for (const ent of this.runnerEntities) {
          if (ent.kind === 'bolt') ent.group.rotation.y += dt * 3.5;

          const dx = this.runnerBotX - ent.group.position.x;
          const dy = this.runnerBotY + 0.7 - ent.group.position.y;
          const dz = this.botTrackZ - ent.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (ent.kind === 'bolt' && dist < pullRadius) {
            ent.group.position.x = THREE.MathUtils.damp(ent.group.position.x, this.runnerBotX, 14, dt);
            ent.group.position.y = THREE.MathUtils.damp(ent.group.position.y, this.runnerBotY + 0.7, 14, dt);
            ent.z = THREE.MathUtils.damp(ent.z, this.botTrackZ, 14, dt);
            ent.group.position.z = ent.z;
            if (dist < 1.25) {
              const { cubesEarned } = applyBoltCollection(m, 1);
              this.spawnSparks(this.runnerBotX, this.runnerBotY + 0.8, this.botTrackZ, 0xfbbf24, 8);
              if (cubesEarned > 0) {
                SFX.compactCrunch();
                this.setMood('happy', 0.9);
              } else {
                SFX.crystal();
              }
              this.respawnEntity(ent, this.botTrackZ - 48 - Math.random() * 44);
              continue;
            }
          } else if (ent.kind === 'barrier' && Math.abs(dz) < 0.95 && Math.abs(dx) < 1.0 && this.runnerBotY < 0.85) {
            if (m.shieldActive || m.turboTimer > 0) {
              m.shieldActive = false;
              this.spawnSparks(ent.group.position.x, 0.8, ent.z, 0x38bdf8, 16);
              this.vfx.emitShockwaveRing(ent.group.position.x, 0.5, ent.z, 0x38bdf8, 0.45, 2.3, 0.38);
              this.rig.injectImpact(0.55, -0.35, 0);
              this.cameraJuice.addImpulse(1.1, 0.7, 0.9, 1.2);
              SFX.compactCrunch();
              this.respawnEntity(ent, this.botTrackZ - 55 - Math.random() * 40);
              continue;
            } else if (!this.runnerEndless) {
              // Gentle kid-friendly bounce slowdown rather than harsh instant death
              this.runnerJumpVy = 5.5;
              this.rig.injectImpact(0.85, 0.5, 0);
              this.cameraJuice.addImpulse(1.2, -0.9, 0.6, 0);
              this.setMood('sad', 0.9);
              SFX.chirpSad();
              this.respawnEntity(ent, this.botTrackZ - 55 - Math.random() * 40);
              continue;
            } else {
              m.finished = true;
              m.crashed = true;
              this.rig.injectImpact(1.05, 0.6, 0);
              this.cameraJuice.addImpulse(1.6, -1.1, 1.2, 0);
              this.setMood('sad', 2.0);
              SFX.chirpSad();
              this.cb.onActionFinish({ ...m });
            }
          }

          if (ent.z > this.botTrackZ + 12) {
            this.respawnEntity(ent, this.botTrackZ - 52 - Math.random() * 48);
          }
        }

        if (!this.runnerEndless && m.targetDistance > 0 && m.distance >= m.targetDistance && !m.finished) {
          m.finished = true;
          this.setMood('happy', 3.0);
          SFX.laserSolved();
          this.cb.onActionFinish({ ...m });
        }

        this.runnerMetricTimer += dt;
        if (this.runnerMetricTimer >= 0.08) {
          this.runnerMetricTimer = 0;
          this.cb.onActionMetrics({ ...m });
        }
      }
    } else if (this.mode === 'PLANET_ADVENTURE_3D' && this.planetMetrics && this.planetWorld) {
      const m = this.planetMetrics;
      const pw = this.planetWorld;
      const caps = m.capabilities;

      if (m.status === 'playing') {
        m.elapsedSeconds += rawDt;
        if (m.boostCooldown > 0) m.boostCooldown = Math.max(0, m.boostCooldown - rawDt);
        if (m.boostActiveTimer > 0) m.boostActiveTimer = Math.max(0, m.boostActiveTimer - rawDt);
        if (m.laserCooldown > 0) m.laserCooldown = Math.max(0, m.laserCooldown - rawDt);

        if (this.planetLaserFlashTimer > 0) {
          this.planetLaserFlashTimer = Math.max(0, this.planetLaserFlashTimer - dt);
          if (this.planetLaserFlashTimer <= 0) {
            pw.laserBeamMesh.visible = false;
          }
        }

        // Ground & Bog Detection
        const groundHere = getPlanetGroundY(this.planetBotX, this.planetBotZ);
        const airborne = this.planetBotY > groundHere + 0.14;
        const bogCheck = isPointInPlanetBog(this.planetBotX, this.planetBotZ);
        m.inBog = bogCheck.inBog;

        // Horizontal Movement Vector (camera looks north along -Z)
        let moveX = this.planetMoveStrafe;
        let moveZ = -this.planetMoveForward;
        const moveMag = Math.hypot(moveX, moveZ);
        if (moveMag > 0.01) {
          moveX /= moveMag;
          moveZ /= moveMag;
          isMoving = true;

          const baseSpeed =
            (this.gentleSpeed ? 7.2 : 9.2) *
            (caps.hasWheels ? 1.08 : 1.0) +
            (m.boostActiveTimer > 0 ? 6.2 : 0);
          const bogMult = getPlanetBogSpeedMultiplier(caps, bogCheck.inBog, airborne);
          speed = baseSpeed * bogMult;

          const stepX = moveX * speed * dt;
          const stepZ = moveZ * speed * dt;

          const canStepTo = (tx: number, tz: number): boolean => {
            const targetGround = getPlanetGroundY(tx, tz);
            if (targetGround > this.planetBotY + 0.48) return false;
            for (const bar of pw.barriers) {
              if (!bar.active) continue;
              const d = Math.hypot(tx - bar.x, tz - bar.z);
              if (d < bar.radius + 0.52 && this.planetBotY < bar.y + 1.75) {
                return false;
              }
            }
            return true;
          };

          const candFull = clampPlanetPosition(this.planetBotX + stepX, this.planetBotZ + stepZ);
          if (canStepTo(candFull.x, candFull.z)) {
            this.planetBotX = candFull.x;
            this.planetBotZ = candFull.z;
          } else {
            const candX = clampPlanetPosition(this.planetBotX + stepX, this.planetBotZ);
            if (canStepTo(candX.x, candX.z)) {
              this.planetBotX = candX.x;
            } else {
              const candZ = clampPlanetPosition(this.planetBotX, this.planetBotZ + stepZ);
              if (canStepTo(candZ.x, candZ.z)) {
                this.planetBotZ = candZ.z;
              }
            }
          }

          // Smooth yaw alignment toward movement direction
          const targetYaw = Math.atan2(-moveX, -moveZ);
          let yawDiff = targetYaw - this.planetBotYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.planetBotYaw += yawDiff * (1 - Math.exp(-12 * dt));
        }

        // Vertical gravity + ground landing
        const groundNow = getPlanetGroundY(this.planetBotX, this.planetBotZ);
        if (this.planetBotY > groundNow || this.planetBotVy !== 0) {
          const prevVy = this.planetBotVy;
          this.planetBotY += this.planetBotVy * dt;
          this.planetBotVy -= 26 * dt;
          if (this.planetBotY <= groundNow) {
            this.planetBotY = groundNow;
            this.planetBotVy = 0;
            this.planetJumpsUsed = 0;
            m.doubleJumpReady = caps.hasThrusters;
            if (prevVy < -3.2) {
              const strength = Math.min(1, Math.abs(prevVy) / 14);
              this.rig.injectImpact(0.8 * strength, 0.25 * strength, 0);
              this.cameraJuice.addImpulse(0, -0.75 * strength, 0, 0);
              this.vfx.emitPuffs(
                this.planetBotX,
                this.planetBotY + 0.06,
                this.planetBotZ,
                0xa5f3fc,
                4,
                this.qualityBudget,
                1.1
              );
            }
          }
        } else {
          this.planetBotY = groundNow;
          this.planetJumpsUsed = 0;
          m.doubleJumpReady = caps.hasThrusters;
        }
        isAirborne = this.planetBotY > groundNow + 0.14;
        tiltPitch = m.boostActiveTimer > 0 ? -0.14 : isMoving ? -0.06 : 0;

        // Booster spark wake
        if (m.boostActiveTimer > 0 && Math.random() < 0.65) {
          const { fx, fz } = getBotForwardXZ(this.planetBotYaw);
          this.spawnSparks(
            this.planetBotX - fx * 0.65,
            this.planetBotY + 0.55,
            this.planetBotZ - fz * 0.65,
            0xf472b6,
            2
          );
        }

        // Magnet aura pulse
        if (caps.hasMagnet) {
          pw.magnetAuraMesh.visible = true;
          pw.magnetAuraMesh.position.set(this.planetBotX, this.planetBotY + 0.16, this.planetBotZ);
          const pulse = 0.92 + Math.sin(this.totalTime * 5.2) * 0.12;
          pw.magnetAuraMesh.scale.setScalar(pulse);
        } else {
          pw.magnetAuraMesh.visible = false;
        }

        // Animate bog ripples & flora glow
        for (let i = 0; i < pw.bogRipples.length; i++) {
          const rip = pw.bogRipples[i];
          const s = 0.65 + ((this.totalTime * 0.55 + i * 0.33) % 1) * 0.95;
          rip.scale.setScalar(s);
        }

        // Core spin + Magnet Pull + Collection
        const pullRadius = getPlanetPullRadius(caps);
        const remainingCores: Array<{ x: number; z: number; name: string }> = [];
        for (const core of pw.cores) {
          if (!core.active) continue;
          core.group.rotation.y += dt * 1.9;
          core.ring.rotation.z += dt * 2.4;
          core.group.position.y = core.baseY + Math.sin(this.totalTime * 2.8 + core.x) * 0.16;

          const dx = this.planetBotX - core.group.position.x;
          const dy = this.planetBotY + 0.75 - core.group.position.y;
          const dz = this.planetBotZ - core.group.position.z;
          const dist = Math.hypot(dx, dy, dz);

          if (caps.hasMagnet && dist < pullRadius) {
            core.group.position.x = THREE.MathUtils.damp(core.group.position.x, this.planetBotX, 8, dt);
            core.group.position.z = THREE.MathUtils.damp(core.group.position.z, this.planetBotZ, 8, dt);
          }

          if (Math.hypot(this.planetBotX - core.group.position.x, this.planetBotZ - core.group.position.z) < 1.38 &&
            Math.abs(this.planetBotY + 0.6 - core.group.position.y) < 1.85) {
            core.active = false;
            core.group.visible = false;
            m.coresCollected += 1;
            this.spawnConfetti(core.group.position.x, core.group.position.y + 0.4, core.group.position.z, 22);
            SFX.crystal();
            this.setMood('happy', 1.2);
            if (m.coresCollected >= m.totalCores && !m.gateUnlocked) {
              m.gateUnlocked = true;
              pw.setGateUnlocked(true);
              SFX.laserSolved();
              this.spawnSparks(PLANET_EXIT_GATE.x, 3.0, PLANET_EXIT_GATE.z, 0x34d399, 28);
            }
          } else {
            remainingCores.push({ x: core.x, z: core.z, name: core.name });
          }
        }

        // Scrap Bolt spin + Magnet Pull + Collection
        for (const bolt of pw.bolts) {
          if (!bolt.active) continue;
          bolt.mesh.rotation.z += dt * 3.0;
          const dx = this.planetBotX - bolt.mesh.position.x;
          const dz = this.planetBotZ - bolt.mesh.position.z;
          const horizDist = Math.hypot(dx, dz);
          if (horizDist < pullRadius) {
            bolt.mesh.position.x = THREE.MathUtils.damp(bolt.mesh.position.x, this.planetBotX, 12, dt);
            bolt.mesh.position.z = THREE.MathUtils.damp(bolt.mesh.position.z, this.planetBotZ, 12, dt);
          }
          const collectDist = Math.hypot(
            this.planetBotX - bolt.mesh.position.x,
            this.planetBotZ - bolt.mesh.position.z
          );
          if (collectDist < 1.2 && Math.abs(this.planetBotY + 0.6 - bolt.mesh.position.y) < 1.8) {
            bolt.active = false;
            bolt.mesh.visible = false;
            m.boltsCollected += 1;
            this.spawnSparks(bolt.mesh.position.x, bolt.mesh.position.y, bolt.mesh.position.z, 0xfbbf24, 8);
            SFX.crystal();
          }
        }

        // Waypoint compass update
        const guide = computePlanetObjectiveGuide(
          this.planetBotX,
          this.planetBotZ,
          remainingCores,
          m.gateUnlocked
        );
        m.objectiveLabel = guide.targetLabel;
        m.objectiveDistance = guide.distanceMeters;
        m.objectiveAngleRad = guide.compassAngleRad;

        // Exit Gate Portal check
        if (m.gateUnlocked) {
          pw.exitPortalMesh.rotation.z += dt * 1.4;
          const gateDist = Math.hypot(
            this.planetBotX - PLANET_EXIT_GATE.x,
            this.planetBotZ - PLANET_EXIT_GATE.z
          );
          const gateY = getPlanetGroundY(PLANET_EXIT_GATE.x, PLANET_EXIT_GATE.z);
          if (gateDist < PLANET_EXIT_GATE.radius && Math.abs(this.planetBotY - gateY) < 2.2) {
            m.status = 'won';
            this.setMood('happy', 2.8);
            this.spawnConfetti(PLANET_EXIT_GATE.x, gateY + 1.8, PLANET_EXIT_GATE.z, 36);
            SFX.laserSolved();
            this.cb.onPlanetFinish?.({ ...m });
          }
        }

        this.planetMetricTimer += dt;
        if (this.planetMetricTimer >= 0.09) {
          this.planetMetricTimer = 0;
          this.cb.onPlanetMetrics?.({ ...m });
        }
      }
    }

    // Enforce closed-gate stop barrier on mission track so robot never enters the end wall
    if (this.mode === 'SIMULATING' || this.mode === 'CODE_3D' || this.mode === 'CIRCUIT_3D') {
      this.botTrackZ = clampTrackBotZBeforeClosedGate(this.level?.track, this.botTrackZ, false);
    }

    // Align robot height & slope pitch to track surface (ramps & mud) when on mission track
    const trackSurface =
      this.mode === 'SIMULATING' || this.mode === 'CODE_3D' || this.mode === 'CIRCUIT_3D'
        ? sampleTrackSurfaceAtZ(this.level?.track, this.botTrackZ)
        : null;
    if (this.mode === 'CODE_3D' && trackSurface && this.botTrackY >= -0.2) {
      this.botTrackY = THREE.MathUtils.damp(this.botTrackY, trackSurface.y, 14, dt);
    }
    const targetTrackPitchX =
      trackSurface &&
      (this.mode === 'SIMULATING' || this.mode === 'CODE_3D') &&
      !isAirborne &&
      this.botTrackY >= -0.2 &&
      this.botTrackY <= trackSurface.y + 0.16
        ? trackSurface.pitchX
        : 0;
    this.botTrackPitchX = THREE.MathUtils.damp(this.botTrackPitchX, targetTrackPitchX, 14, dt);

    // Apply Robot World Transform (step neatly onto the left bay of the wide Gate platform in CIRCUIT_3D)
    const targetTrackX = this.mode === 'CIRCUIT_3D' ? CIRCUIT_BOT_X : 0;
    const smoothTrackX =
      this.mode === 'ACTION_RUN_3D'
        ? this.runnerBotX
        : this.mode === 'PLANET_ADVENTURE_3D'
          ? this.planetBotX
          : THREE.MathUtils.damp(this.rig.root.position.x, targetTrackX, 10, dt);
    this.rig.root.position.set(
      smoothTrackX,
      this.mode === 'PLANET_ADVENTURE_3D' ? this.planetBotY : this.botTrackY,
      this.mode === 'PLANET_ADVENTURE_3D' ? this.planetBotZ : this.botTrackZ
    );
    this.rig.root.rotation.x =
      this.mode === 'SIMULATING' || this.mode === 'CODE_3D' ? this.botTrackPitchX : 0;
    this.rig.root.rotation.z = this.mode === 'ACTION_RUN_3D' ? this.runnerBotRoll : 0;

    // Workshop, Paint Booth, Expressive Mood, & Victory Facing: face -Z robot front toward camera
    if (this.mode === 'TITLE') {
      this.rig.root.rotation.y = -2.55 + Math.sin(this.totalTime * 0.55) * 0.28;
    } else if (this.mode === 'PLANET_ADVENTURE_3D') {
      this.rig.root.rotation.y = this.planetBotYaw;
    } else if (this.mode === 'BUILD_3D') {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -2.42, 6, dt);
    } else if (this.mode === 'PAINT_BOOTH') {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -2.72, 6, dt);
    } else if (this.mode === 'VICTORY') {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -2.75, 6, dt);
    } else if (this.mode === 'CIRCUIT_3D') {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -0.45, 7, dt);
    } else if (
      this.mode === 'CODE_3D' &&
      (this.botMood === 'confused' || this.botMood === 'sad' || this.botMood === 'happy')
    ) {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -2.25, 7, dt);
    } else if (this.mode === 'CODE_3D' && this.botMood === 'boost') {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, -0.75, 7, dt);
    } else {
      this.rig.root.rotation.y = THREE.MathUtils.damp(this.rig.root.rotation.y, 0, 8, dt);
    }

    // Contact shadow height offset (fed directly into articulated RobotRig)
    const shadowHeightOffset =
      this.mode === 'PLANET_ADVENTURE_3D'
        ? Math.max(0, this.planetBotY - getPlanetGroundY(this.planetBotX, this.planetBotZ))
        : Math.max(0, this.botTrackY - (trackSurface?.y ?? 0));

    // Update Robot Articulated Animation Rig (spring kinematics, wheel suspension, plasma shaders)
    this.rig.update({
      dt,
      time: this.totalTime,
      mood: this.botMood,
      speed,
      isMoving,
      isAirborne,
      heightAboveGround: shadowHeightOffset,
      tiltPitch,
      tiltRoll: this.mode === 'ACTION_RUN_3D' ? (this.runnerMetrics?.lane === 0 ? 0.1 : -0.1) * 0.3 : 0,
      lookX: this.lookX,
      lookY: this.lookY,
      buildTargetSlot: this.buildTargetSlot,
      buildTimer: this.buildTimer,
      celebrateTimer: this.celebrateTimer,
      touchTimer: this.touchTimer,
      codeFeedbackTier: this.mode === 'CODE_3D' ? this.codeFeedbackTier : null,
      codeFeedbackTimer: this.mode === 'CODE_3D' ? this.codeFeedbackTimer : 0,
      codeFeedbackDuration: this.codeFeedbackDuration,
      scanMatch: this.simScanMatch,
      shieldActive: Boolean(this.runnerMetrics?.shieldActive),
      turboActive: Boolean(
        (this.runnerMetrics && this.runnerMetrics.turboTimer > 0) ||
          (this.planetMetrics && this.planetMetrics.boostActiveTimer > 0)
      )
    });

    // Update 3D Helper Drone Companion (hovers beside SparkBot in Workshop, Coding Track & Victory)
    const showCompanionDrone =
      Boolean(this.activeLoadout.equippedDroneId) &&
      this.mode !== 'ACTION_RUN_3D' &&
      this.mode !== 'PLANET_ADVENTURE_3D';
    this.companionDrone.root.visible = showCompanionDrone;
    if (showCompanionDrone) {
      const isTrackMode =
        this.mode === 'CODE_3D' ||
        this.mode === 'SIMULATING' ||
        this.mode === 'CIRCUIT_3D' ||
        this.mode === 'VICTORY';
      this.companionDrone.update(dt, this.totalTime, this.rig.root.position, isTrackMode);
    }

    // Update Unified Zero-GC 3D VFX Pools (sparks, pastel puffs, plasma trails, shockwave rings)
    this.vfx.update(dt);

    // Responsive 4-Preset Damped Camera Rig + Interactive 360° Orbit in BUILD_3D & PAINT_BOOTH
    const framing = computeResponsiveCameraFraming(this.mode, this.width, this.height);
    if (this.mode === 'TITLE') {
      _camGoal.set(
        (2.9 + this.lookX * 0.35) * framing.distanceScale,
        2.35 + this.lookY * 0.2,
        4.7 * framing.distanceScale
      );
      _lookGoal.set(-0.6 + framing.lookXOffset, 1.05 + framing.lookYOffset, -0.5);
    } else if (this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH') {
      if (this.workshopAutoSpin && !this.pointerDownActive) {
        this.orbitTarget.azimuth += dt * 0.72;
      }
      // Shortest-angle azimuth interpolation
      let azDiff = this.orbitTarget.azimuth - this.orbitCurrent.azimuth;
      while (azDiff > Math.PI) azDiff -= Math.PI * 2;
      while (azDiff < -Math.PI) azDiff += Math.PI * 2;
      this.orbitCurrent.azimuth += azDiff * (1 - Math.exp(-8 * dt));
      this.orbitCurrent.polar = THREE.MathUtils.damp(this.orbitCurrent.polar, this.orbitTarget.polar, 8, dt);
      this.orbitCurrent.distance = THREE.MathUtils.damp(this.orbitCurrent.distance, this.orbitTarget.distance, 8, dt);

      const r = this.orbitCurrent.distance * framing.distanceScale;
      const sinP = Math.sin(this.orbitCurrent.polar);
      const cosP = Math.cos(this.orbitCurrent.polar);
      const baseLookY = this.mode === 'PAINT_BOOTH' ? 0.2 : 0.24;
      _camGoal.set(
        Math.sin(this.orbitCurrent.azimuth) * sinP * r,
        baseLookY + 0.56 + cosP * r,
        Math.cos(this.orbitCurrent.azimuth) * sinP * r
      );
      _lookGoal.set(0, baseLookY + framing.lookYOffset, 0);
    } else if (this.mode === 'CODE_3D') {
      this.codeCamCurrent.yaw = THREE.MathUtils.damp(this.codeCamCurrent.yaw, this.codeCamTarget.yaw, 8.5, dt);
      this.codeCamCurrent.pitch = THREE.MathUtils.damp(this.codeCamCurrent.pitch, this.codeCamTarget.pitch, 8.5, dt);
      this.codeCamCurrent.distance = THREE.MathUtils.damp(this.codeCamCurrent.distance, this.codeCamTarget.distance, 8.5, dt);
      this.codeCamCurrent.focusZ = THREE.MathUtils.damp(this.codeCamCurrent.focusZ, this.codeCamTarget.focusZ, 8.5, dt);
      this.codeCamCurrent.lookYBias = THREE.MathUtils.damp(this.codeCamCurrent.lookYBias, this.codeCamTarget.lookYBias, 8.5, dt);
      const v = evaluateCodeCameraVectors(this.codeCamCurrent, framing.lookYOffset);
      _camGoal.set(v.camX, v.camY, v.camZ);
      _lookGoal.set(v.lookX, v.lookY, v.lookZ);
    } else if (this.mode === 'SIMULATING') {
      _camGoal.set(
        4.8 * framing.distanceScale,
        3.8 + Math.max(0, this.botTrackY) * 0.4,
        this.botTrackZ + 6.2 * framing.distanceScale
      );
      _lookGoal.set(0, 0.9 + framing.lookYOffset, this.botTrackZ - 3.5);
    } else if (this.mode === 'CIRCUIT_3D') {
      const cz = this.circuitGroup.position.z;
      _camGoal.set(0, CIRCUIT_BOARD_Y - 0.05, cz + 6.2 * framing.distanceScale);
      _lookGoal.set(0, CIRCUIT_BOARD_Y - 0.25 + framing.lookYOffset, cz);
    } else if (this.mode === 'ACTION_RUN_3D') {
      _camGoal.set(
        this.runnerBotX * 0.35,
        3.6 + this.runnerBotY * 0.4,
        this.botTrackZ + 6.8 * framing.distanceScale
      );
      _lookGoal.set(
        this.runnerBotX * 0.4,
        1.2 + this.runnerBotY * 0.35 + framing.lookYOffset,
        this.botTrackZ - 7.5
      );
    } else if (this.mode === 'PLANET_ADVENTURE_3D') {
      _camGoal.set(
        this.planetBotX * 0.88,
        5.1 + this.planetBotY * 0.72,
        this.planetBotZ + 8.6 * framing.distanceScale
      );
      _lookGoal.set(
        this.planetBotX,
        1.05 + this.planetBotY * 0.65 + framing.lookYOffset,
        this.planetBotZ - 2.6
      );
    } else {
      // VICTORY
      _camGoal.set(1.8 * framing.distanceScale, 2.4, this.botTrackZ + 4.4 * framing.distanceScale);
      _lookGoal.set(0, 1.1 + framing.lookYOffset, this.botTrackZ);
    }

    const camLambda =
      this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH'
        ? 9.5
        : this.mode === 'PLANET_ADVENTURE_3D'
          ? 7.2
          : 5.5;
    this.camBasePos.x = THREE.MathUtils.damp(this.camBasePos.x, _camGoal.x, camLambda, dt);
    this.camBasePos.y = THREE.MathUtils.damp(this.camBasePos.y, _camGoal.y, camLambda, dt);
    this.camBasePos.z = THREE.MathUtils.damp(this.camBasePos.z, _camGoal.z, camLambda, dt);
    _curLook.x = THREE.MathUtils.damp(_curLook.x, _lookGoal.x, 7.5, dt);
    _curLook.y = THREE.MathUtils.damp(_curLook.y, _lookGoal.y, 7.5, dt);
    _curLook.z = THREE.MathUtils.damp(_curLook.z, _lookGoal.z, 7.5, dt);

    const targetFovBoost =
      (this.mode === 'ACTION_RUN_3D' && this.runnerMetrics && this.runnerMetrics.turboTimer > 0) ||
      (this.mode === 'PLANET_ADVENTURE_3D' &&
        this.planetMetrics &&
        this.planetMetrics.boostActiveTimer > 0)
        ? 4.5
        : 0;
    const camJuice = this.cameraJuice.step(dt, targetFovBoost);
    this.camera.position.set(
      this.camBasePos.x + camJuice.offsetX,
      this.camBasePos.y + camJuice.offsetY,
      this.camBasePos.z + camJuice.offsetZ
    );
    this.camera.lookAt(_curLook);

    const targetFov = framing.baseFov + camJuice.fovBoost;
    const prevFov = this.camera.fov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7.5, dt);
    if (Math.abs(this.camera.fov - prevFov) > 0.015) {
      this.camera.updateProjectionMatrix();
    }

    // Emit 3D Chassis Slot & Head Screen Coordinates smoothly (~20Hz)
    this.slotEmitTimer += dt;
    if (this.slotEmitTimer >= 0.05) {
      this.slotEmitTimer = 0;
      if (this.mode === 'BUILD_3D') {
        const pts = this.rig.getSlotScreenPoints(this.camera, this.width, this.height, this.chassis);
        this.cb.onSlotScreenUpdate(pts);
      }
      if (this.cb.onHeadScreenUpdate) {
        const headPt = this.rig.getHeadScreenPoint(this.camera, this.width, this.height);
        this.cb.onHeadScreenUpdate(headPt);
      }
    }

    if (this.renderer && !this.contextLost) {
      if (this.renderPipeline) {
        this.renderPipeline.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      this.pacer = scheduleAfterDraw(this.renderer, this.isSoftwareGl, this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    this.pacer?.cancel();
    this.pacer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    this.renderer?.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.renderer?.domElement.removeEventListener('wheel', this.handleCanvasWheel);
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer?.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderPipeline?.dispose();
    this.renderPipeline = null;
    this.env.dispose();
    this.planetWorld?.dispose();
    this.companionDrone.dispose();
    this.rig.dispose();
    clearAndDisposeGroup(this.trackGroup, this.sharedTextures);
    clearAndDisposeGroup(this.pathPreviewGroup, this.sharedTextures);
    clearAndDisposeGroup(this.circuitBeamGroup, this.sharedTextures);
    clearAndDisposeGroup(this.circuitGroup, this.sharedTextures);
    clearAndDisposeGroup(this.runnerGroup, this.sharedTextures);
    disposeObject3D(this.ghostGroup, this.sharedTextures);
    this.envMapTexture?.dispose();
    this.envMapTexture = null;
    this.vfx.dispose();
    this.tex.dispose();
    this.renderer?.dispose();
    SFX.setGlide(false);
    SFX.cancelSpeech();
  }
}
