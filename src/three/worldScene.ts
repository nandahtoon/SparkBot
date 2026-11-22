import * as THREE from 'three';
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
  normalizeBotCharacter,
  normalizeBotTheme,
  normalizePaintConfig,
  stepActionSurfaceMove,
  traceCircuit,
  type ActionDashMetrics
} from '../game/engine';
import { SFX } from '../game/audio';
import {
  createProceduralTextures,
  detectSoftwareGl,
  scheduleAfterDraw
} from './materials';
import {
  clampWorkshopOrbit,
  DEFAULT_WORKSHOP_ORBIT,
  type WorkshopOrbitState
} from '../game/audioConfig';
import type { RobotTouchZone } from '../game/robotVoice';
import {
  createPartPlacement3DBurst,
  evaluatePuffScale
} from '../game/partParticles';
import {
  getGraphicsQualityBudget,
  scaleParticleCount
} from '../game/graphicsConfig';
import {
  computeActionTrailEmitConfig,
  computeRibbonSegmentSample,
  computeTrailEmitterOffsets,
  createActionTrailSpawnSample,
  evaluateTrailParticleTransform,
  type ActionTrailParticleInit
} from '../game/actionTrail';
import type { CodeBlockFeedback, CodeComplexityTier } from '../game/codeFeedback';
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

export type WorldMode =
  | 'TITLE'
  | 'BUILD_3D'
  | 'PAINT_BOOTH'
  | 'CODE_3D'
  | 'SIMULATING'
  | 'CIRCUIT_3D'
  | 'ACTION_RUN_3D'
  | 'VICTORY';

export interface WorldCallbacks {
  onBotTap: (zone: RobotTouchZone) => void;
  onPaintPartPick?: (part: PaintPartKey) => void;
  onInstallCelebrate?: (part: PartId) => void;
  onInstallPhaseChange?: (phase: 'idle' | 'working' | 'celebrating') => void;
  onCircuitCellTap: (r: number, c: number) => void;
  onSimProgress: (eventIndex: number, ev: SimEvent) => void;
  onSimPauseChange?: (paused: boolean, awaitingStep: boolean, isLastStep: boolean) => void;
  onSimComplete: (result: SimResult) => void;
  onActionMetrics: (metrics: ActionDashMetrics) => void;
  onActionFinish: (metrics: ActionDashMetrics) => void;
  onSlotScreenUpdate: (pts: SlotScreenPoint[]) => void;
  onHeadScreenUpdate?: (pt: HeadScreenPoint) => void;
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

const TILE_SPACING = 3.5;
const TRACK_START_Z = -4.2;
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
const _color = new THREE.Color();
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
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private tex;
  private rig;

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
  private swipeConsumed = false;
  private resizeObserver: ResizeObserver | null = null;

  // Extracted Skyport & Workshop Environment Handles
  private env: WorkshopEnvironmentHandles;

  // Groups
  private trackGroup = new THREE.Group();
  private crystalMeshes: Map<number, THREE.Mesh> = new Map();
  private gateLeftDoor: THREE.Mesh | null = null;
  private gateRightDoor: THREE.Mesh | null = null;
  private gateOpenAmt = 0;

  // 3D Circuit Board on Gate
  private circuitGroup = new THREE.Group();
  private circuitCellMeshes: THREE.Object3D[][] = [];
  private circuitBeamGroup = new THREE.Group();
  private circuitInteractables: THREE.Object3D[] = [];

  // Particle Spark Ring Buffer
  private sparkInst: THREE.InstancedMesh;
  private sparks: Array<{
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    color: number;
  }> = [];
  private sparkCursor = 0;

  // Soft 3D Pastel Puff Ring Buffer (for cute color-coded part placement puffs)
  private puffInst: THREE.InstancedMesh;
  private puffs: Array<{
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    baseScale: number;
    color: number;
  }> = [];
  private puffCursor = 0;
  private placementBurstSeq = 0;

  // High-Speed Action Dash Trailing Particle Ring Buffer (Additive Neon Speed Streaks)
  private trailInst: THREE.InstancedMesh;
  private trailParticles: Array<{
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    baseWidth: number;
    streakLength: number;
    color: number;
    spin: number;
    roll: number;
  }> = [];
  private trailCursor = 0;
  private trailEmitAccum = 0;
  private trailColorSeq = 0;
  private trailAnchorIdx = 0;
  private prevRunnerBotX = 0;
  private prevRunnerBotY = 0;

  // Continuous Curved 3D Slipstream Ribbons (Left Wake, Right Wake, Center Booster Wake)
  private trailRibbons: Array<{
    mesh: THREE.Mesh;
    positions: Float32Array;
    colors: Float32Array;
    history: Array<{ x: number; y: number; z: number; roll: number; color: number; halfWidth: number }>;
    count: number;
  }> = [];
  private ribbonSampleTimer = 0;

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
  private simFromZ = 0;
  private simToZ = 0;
  private simScanMatch: boolean | null = null;

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

  // Playable 3D Holographic Ghost Preview
  private ghostGroup = new THREE.Group();
  private ghostBotGroup = new THREE.Group();
  private ghostPartOrb!: THREE.Mesh;
  private ghostArcDots: THREE.Mesh[] = [];
  private ghostCircuitRing!: THREE.Mesh;
  private ghostPlan: GhostPreviewPlan | null = null;
  private ghostElapsed = 0;
  private ghostDuration = 2.8;

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

    this.width = Math.max(320, container.clientWidth || window.innerWidth);
    this.height = Math.max(240, container.clientHeight || window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x13203d);
    this.scene.fog = new THREE.FogExp2(0x13203d, 0.0115);

    this.camera = new THREE.PerspectiveCamera(52, this.width / this.height, 0.15, 220);
    this.camera.position.set(3.2, 2.5, 5.2);
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
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );
      this.renderer.setSize(this.width, this.height);
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
      this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    } catch {
      this.cb.onWebglLost(true);
    }

    const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    this.tex = createProceduralTextures(maxAniso);

    this.env = buildWorkshopEnvironment(this.scene, this.tex, this.isSoftwareGl);

    this.rig = createRobotRig(this.tex, this.isSoftwareGl);
    this.scene.add(this.rig.root);

    this.scene.add(this.trackGroup);
    this.scene.add(this.circuitGroup);
    this.circuitGroup.add(this.circuitBeamGroup);
    this.scene.add(this.runnerGroup);

    // Pre-allocate welding/crystal/confetti spark pool (72 particles)
    const sparkCount = 72;
    this.sparkInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.095, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      sparkCount
    );
    this.sparkInst.frustumCulled = false;
    this.scene.add(this.sparkInst);
    for (let i = 0; i < sparkCount; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.6,
        color: 0xfde047
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.sparkInst.setMatrixAt(i, _dummy.matrix);
    }

    // Pre-allocate soft pastel 3D puff pool (48 low-poly puffy spheres for part placement)
    const puffCount = 48;
    this.puffInst = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.11, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0.04
      }),
      puffCount
    );
    this.puffInst.frustumCulled = false;
    this.scene.add(this.puffInst);
    for (let i = 0; i < puffCount; i++) {
      this.puffs.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.7,
        baseScale: 1,
        color: 0xbae6fd
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.puffInst.setMatrixAt(i, _dummy.matrix);
    }

    // Pre-allocate Action Dash slender plasma speed-streak pool (160 additive glowing needles)
    const trailCount = 160;
    this.trailInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.052, 0),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      trailCount
    );
    this.trailInst.frustumCulled = false;
    this.scene.add(this.trailInst);
    for (let i = 0; i < trailCount; i++) {
      this.trailParticles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.35,
        baseWidth: 1,
        streakLength: 1,
        color: 0x38bdf8,
        spin: 5,
        roll: 0
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.trailInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(0x38bdf8);
      this.trailInst.setColorAt(i, _color);
    }
    this.trailInst.instanceMatrix.needsUpdate = true;
    if (this.trailInst.instanceColor) this.trailInst.instanceColor.needsUpdate = true;

    // Pre-allocate 3 continuous curved neon slipstream ribbons (Left, Right, Center/Booster)
    const ribbonPoints = 16;
    const ribbonMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.64,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ribbonIndices: number[] = [];
    for (let i = 0; i < ribbonPoints - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      ribbonIndices.push(a, b, c, b, d, c);
    }
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const positions = new Float32Array(ribbonPoints * 2 * 3);
      const colors = new Float32Array(ribbonPoints * 2 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setIndex(ribbonIndices);
      const mesh = new THREE.Mesh(geo, ribbonMat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.scene.add(mesh);
      const history: Array<{ x: number; y: number; z: number; roll: number; color: number; halfWidth: number }> = [];
      for (let p = 0; p < ribbonPoints; p++) {
        history.push({ x: 0, y: -50, z: 0, roll: 0, color: 0x38bdf8, halfWidth: 0.14 });
      }
      this.trailRibbons.push({ mesh, positions, colors, history, count: 0 });
    }

    this.setupGhostPreviewRig();
    this.setupActionRunnerPool();

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
    this.cb.onWebglLost(true);
  };

  private handleContextRestored = () => {
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
  }

  public spawnConfetti(x: number, y: number, z: number, count = 32) {
    const budget = getGraphicsQualityBudget(this.lowGraphics);
    const effectiveCount = scaleParticleCount(count, budget.confettiScale, 4);
    const palette = [0x34d399, 0xfbbf24, 0x38bdf8, 0xf472b6, 0xa78bfa];
    for (let i = 0; i < effectiveCount; i++) {
      const sp = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      sp.active = true;
      sp.x = x + (Math.random() - 0.5) * 0.6;
      sp.y = y + Math.random() * 0.4;
      sp.z = z + (Math.random() - 0.5) * 0.6;
      const a = (i / Math.max(1, effectiveCount)) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 2.4 + Math.random() * 3.8;
      sp.vx = Math.cos(a) * spd;
      sp.vy = 2.6 + Math.random() * 3.8;
      sp.vz = Math.sin(a) * spd;
      sp.life = 0;
      sp.maxLife = 0.75 + Math.random() * 0.45;
      sp.color = palette[i % palette.length];
    }
  }

  public spawnSparks(x: number, y: number, z: number, colorHex: number, count = 16) {
    const budget = getGraphicsQualityBudget(this.lowGraphics);
    const effectiveCount = scaleParticleCount(count, budget.sparkScale, 2);
    for (let i = 0; i < effectiveCount; i++) {
      const sp = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      sp.active = true;
      sp.x = x;
      sp.y = y;
      sp.z = z;
      const a = (i / Math.max(1, effectiveCount)) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.2 + Math.random() * 3.4;
      sp.vx = Math.cos(a) * spd;
      sp.vy = 1.6 + Math.random() * 3.2;
      sp.vz = Math.sin(a) * spd;
      sp.life = 0;
      sp.maxLife = 0.45 + Math.random() * 0.3;
      sp.color = colorHex;
    }
  }

  public spawnPartPlacementEffects(x: number, y: number, z: number, part: PartId) {
    const specs = createPartPlacement3DBurst(part, ++this.placementBurstSeq, this.lowGraphics);
    for (const spec of specs) {
      if (spec.kind === 'puff') {
        const pf = this.puffs[this.puffCursor];
        this.puffCursor = (this.puffCursor + 1) % this.puffs.length;
        pf.active = true;
        pf.x = x + spec.ox;
        pf.y = y + spec.oy;
        pf.z = z + spec.oz;
        pf.vx = spec.vx;
        pf.vy = spec.vy;
        pf.vz = spec.vz;
        pf.life = 0;
        pf.maxLife = spec.maxLife;
        pf.baseScale = spec.baseScale;
        pf.color = spec.colorHex;
      } else {
        const sp = this.sparks[this.sparkCursor];
        this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
        sp.active = true;
        sp.x = x + spec.ox;
        sp.y = y + spec.oy;
        sp.z = z + spec.oz;
        sp.vx = spec.vx;
        sp.vy = spec.vy;
        sp.vz = spec.vz;
        sp.life = 0;
        sp.maxLife = spec.maxLife;
        sp.color = spec.colorHex;
      }
    }
  }

  public setLevel(level: LevelDef) {
    this.level = level;
    this.clearGhostPreview();
    this.rebuildTrack(level);
    this.circuitGrid = level.circuit.map((row) => row.map((c) => ({ ...c })));
    this.rebuildCircuit3D();
    this.resetBotToWorkshop();
  }

  private rebuildTrack(level: LevelDef) {
    this.trackGroup.clear();
    this.crystalMeshes.clear();
    this.gateLeftDoor = null;
    this.gateRightDoor = null;
    this.gateOpenAmt = 0;

    const normalMat = new THREE.MeshStandardMaterial({
      map: this.tex.floorDeck,
      bumpMap: this.tex.floorBump,
      bumpScale: 0.02,
      color: 0x334155,
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
      emissiveIntensity: 0.9,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.1
    });

    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
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
        const wedge = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.24, TILE_SPACING - 0.32), rampMat);
        wedge.position.set(0, 0.22, tz);
        wedge.rotation.x = 0.24;
        this.trackGroup.add(base, wedge);
      } else {
        const deck = new THREE.Mesh(
          new RoundedBoxGeometry(3.2, 0.38, TILE_SPACING - 0.16, 2, 0.06),
          tile.type === 'start' ? startMat : normalMat
        );
        deck.position.set(0, -0.19, tz);
        deck.receiveShadow = true;
        this.trackGroup.add(deck);

        // Glowing side rails
        [-1.55, 1.55].forEach((rx) => {
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

      if (tile.crystal) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), crystalMat);
        crystal.position.set(0, 1.05, tz);
        const halo = new THREE.Mesh(crystalRingGeo, crystalRingMat);
        halo.rotation.x = Math.PI / 2.6;
        crystal.add(halo);
        this.trackGroup.add(crystal);
        this.crystalMeshes.set(i, crystal);
      }

      if (tile.type === 'gate') {
        const gateZ = tz - 0.4;
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
        [-2.2, 2.2].forEach((gx) => {
          const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.65, 4.4, 0.85, 2, 0.08), pillarMat);
          pillar.position.set(gx, 2.1, gateZ);
          pillar.castShadow = !this.isSoftwareGl;
          this.trackGroup.add(pillar);
        });
        const lintel = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.65, 0.9, 2, 0.08), pillarMat);
        lintel.position.set(0, 4.3, gateZ);
        this.trackGroup.add(lintel);

        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          map: this.tex.hazard,
          roughness: 0.4,
          metalness: 0.65
        });
        this.gateLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.8, 0.35), doorMat);
        this.gateLeftDoor.position.set(-0.95, 1.9, gateZ);
        this.gateRightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.8, 0.35), doorMat);
        this.gateRightDoor.position.set(0.95, 1.9, gateZ);
        this.trackGroup.add(this.gateLeftDoor, this.gateRightDoor);

        // Position 3D Circuit Board clearly above track on the Gate
        this.circuitGroup.position.set(0, 2.5, gateZ + 0.95);
        // Position Action Runner continuation seamlessly beyond the Gate
        this.runnerBaseZ = gateZ - 4.0;
      }
    }
  }

  public setCircuitGrid(grid: CircuitGrid) {
    this.circuitGrid = grid.map((row) => row.map((c) => ({ ...c })));
    this.rebuildCircuit3D();
  }

  private rebuildCircuit3D() {
    // Preserve circuitBeamGroup inside circuitGroup
    while (this.circuitGroup.children.length > 0) {
      const ch = this.circuitGroup.children[0];
      this.circuitGroup.remove(ch);
    }
    this.circuitGroup.add(this.circuitBeamGroup);
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

    // Build 3D Laser Beam Segments
    this.circuitBeamGroup.clear();
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
    this.runnerBotX = 0;
    this.runnerBotY = 0;
    this.prevRunnerBotX = 0;
    this.prevRunnerBotY = 0;
    this.runnerBotRoll = 0;
    this.runnerJumpY = 0;
    this.runnerJumpVy = 0;
    this.clearActionTrails();
    this.camera.position.set(0, 3.6, startZ + 6.8);
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
    this.trailEmitAccum = 0;
    this.ribbonSampleTimer = 0;
    for (let i = 0; i < this.trailParticles.length; i++) {
      this.trailParticles[i].active = false;
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.trailInst.setMatrixAt(i, _dummy.matrix);
    }
    this.trailInst.instanceMatrix.needsUpdate = true;
    for (const rb of this.trailRibbons) {
      rb.count = 0;
      rb.mesh.visible = false;
    }
  }

  private updateActionRibbons(
    dt: number,
    anchors: ReadonlyArray<{ offsetX: number; offsetY: number; offsetZ: number }>,
    palette: readonly number[],
    baseHalfWidth: number,
    roll: number
  ) {
    this.ribbonSampleTimer += dt;
    const shouldShift = this.ribbonSampleTimer >= 0.014;
    if (shouldShift) this.ribbonSampleTimer = 0;

    // Pick 3 representative emitters: left wheel/thruster, right wheel/thruster, and center/booster
    const chosenAnchors = [
      anchors[0],
      anchors[1] ?? anchors[0],
      anchors[anchors.length - 1] ?? anchors[0]
    ];
    const maxRibbons = getGraphicsQualityBudget(this.lowGraphics).maxRibbonCount;

    for (let rIdx = 0; rIdx < this.trailRibbons.length; rIdx++) {
      const rb = this.trailRibbons[rIdx];
      if (rIdx >= maxRibbons) {
        rb.count = 0;
        rb.mesh.visible = false;
        continue;
      }
      const anc = maxRibbons === 1 ? chosenAnchors[2] : chosenAnchors[rIdx];
      const hx = this.runnerBotX + anc.offsetX;
      const hy = this.runnerBotY + anc.offsetY;
      const hz = this.botTrackZ + anc.offsetZ;
      const col = palette[rIdx % palette.length];
      const hw = rIdx === 2 ? baseHalfWidth * 1.15 : baseHalfWidth;

      if (rb.count === 0) {
        for (let i = 0; i < rb.history.length; i++) {
          const pt = rb.history[i];
          pt.x = hx;
          pt.y = hy;
          pt.z = hz + i * 0.04;
          pt.roll = roll;
          pt.color = col;
          pt.halfWidth = hw;
        }
        rb.count = rb.history.length;
      } else {
        if (shouldShift) {
          for (let i = rb.history.length - 1; i > 0; i--) {
            const dst = rb.history[i];
            const src = rb.history[i - 1];
            dst.x = src.x;
            dst.y = src.y;
            dst.z = src.z;
            dst.roll = src.roll;
            dst.color = src.color;
            dst.halfWidth = src.halfWidth;
          }
        }
        const head = rb.history[0];
        head.x = hx;
        head.y = hy;
        head.z = hz;
        head.roll = roll;
        head.color = col;
        head.halfWidth = hw;
      }

      const posAttr = rb.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = rb.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
      const len = rb.history.length;
      for (let i = 0; i < len; i++) {
        const pt = rb.history[i];
        const t = i / (len - 1);
        const seg = computeRibbonSegmentSample(t, pt.halfWidth, pt.color);
        const cosR = Math.cos(pt.roll);
        const sinR = Math.sin(pt.roll);
        // Ribbon width perpendicular to robot up-axis (rotates flat along walls when wall-running!)
        const rx = cosR * seg.halfWidth;
        const ry = sinR * seg.halfWidth;

        const vIdx = i * 6;
        rb.positions[vIdx] = pt.x - rx;
        rb.positions[vIdx + 1] = pt.y - ry;
        rb.positions[vIdx + 2] = pt.z;
        rb.positions[vIdx + 3] = pt.x + rx;
        rb.positions[vIdx + 4] = pt.y + ry;
        rb.positions[vIdx + 5] = pt.z;

        rb.colors[vIdx] = seg.r;
        rb.colors[vIdx + 1] = seg.g;
        rb.colors[vIdx + 2] = seg.b;
        rb.colors[vIdx + 3] = seg.r;
        rb.colors[vIdx + 4] = seg.g;
        rb.colors[vIdx + 5] = seg.b;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      rb.mesh.visible = true;
    }
  }

  private spawnActionTrailParticle(init: ActionTrailParticleInit, roll: number) {
    const tr = this.trailParticles[this.trailCursor];
    this.trailCursor = (this.trailCursor + 1) % this.trailParticles.length;
    tr.active = true;
    tr.x = init.x;
    tr.y = init.y;
    tr.z = init.z;
    tr.vx = init.vx;
    tr.vy = init.vy;
    tr.vz = init.vz;
    tr.life = 0;
    tr.maxLife = init.maxLife;
    tr.baseWidth = init.baseWidth;
    tr.streakLength = init.streakLength;
    tr.color = init.color;
    tr.spin = init.spin;
    tr.roll = roll;
  }

  private spawnActionTrailBurst(count: number, speedBoost = 1.25) {
    if (!this.runnerMetrics) return;
    const m = this.runnerMetrics;
    const info = computeChassisInfo(this.chassis);
    const boostMult = m.turboTimer > 0 ? 1.45 : 1;
    const effSpeed = this.runnerSpeed * boostMult * speedBoost;
    const budget = getGraphicsQualityBudget(this.lowGraphics);
    const effectiveCount = scaleParticleCount(count, budget.trailBurstScale, 2);
    const cfg = computeActionTrailEmitConfig({
      speed: effSpeed,
      surface: m.surface,
      isAirborne: this.runnerJumpY > 0.15,
      turboActive: m.turboTimer > 0,
      hasBooster: info.hasBooster,
      hasMagnet: info.hasMagnet,
      lowGraphics: this.lowGraphics
    });
    const anchors = computeTrailEmitterOffsets(
      this.runnerBotRoll,
      info.hasThrusters,
      info.hasBooster
    );
    for (let i = 0; i < effectiveCount; i++) {
      const anchor = anchors[i % anchors.length];
      const sample = createActionTrailSpawnSample({
        botX: this.runnerBotX,
        botY: this.runnerBotY,
        botZ: this.botTrackZ,
        botVx: (Math.random() - 0.5) * 4.5,
        botVy: (Math.random() - 0.3) * 3.0,
        speed: effSpeed,
        anchor,
        config: cfg,
        jitterX: Math.random() * 2 - 1,
        jitterY: Math.random() * 2 - 1,
        colorIdx: this.trailColorSeq++,
        lifeJitter: Math.random()
      });
      this.spawnActionTrailParticle(sample, this.runnerBotRoll);
    }
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
      this.spawnActionTrailBurst(next.surface !== this.runnerMetrics.surface ? 12 : 8, 1.25);
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
    }
  }

  public setMode(mode: WorldMode) {
    this.mode = mode;
    this.clearGhostPreview();
    if (mode !== 'CODE_3D') {
      this.codeFeedbackTimer = 0;
      this.codeFeedbackTier = null;
    }
    if (mode !== 'ACTION_RUN_3D') {
      this.runnerGroup.visible = false;
      this.trackGroup.visible = true;
      this.circuitGroup.visible = true;
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
    } else if (mode === 'CIRCUIT_3D') {
      const gateIdx = Math.max(1, (this.level?.track.length ?? 6) - 1);
      this.botTrackZ = TRACK_START_Z - (gateIdx - 0.85) * TILE_SPACING;
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

  public triggerTouchReaction(zone: RobotTouchZone = 'head') {
    this.touchTimer = 1.45;
    this.setMood('happy', 1.45);
    const pos = this.rig.root.position;
    this.spawnSparks(pos.x, pos.y + (zone === 'head' ? 1.85 : 1.05), pos.z, 0xf472b6, 14);
    this.spawnSparks(pos.x, pos.y + (zone === 'head' ? 1.85 : 1.05), pos.z, 0xfde047, 10);
  }

  public resetBotToWorkshop() {
    this.botTrackZ = 0;
    this.botTrackY = 0;
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
  }

  public setGentleSpeed(gentle: boolean) {
    this.gentleSpeed = gentle;
  }

  public setLowGraphics(enabled: boolean) {
    this.lowGraphics = Boolean(enabled);
    const budget = getGraphicsQualityBudget(this.lowGraphics);
    this.env.ambientMotes.visible = budget.ambientMotesVisible;

    if (this.renderer) {
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

    if (this.lowGraphics) {
      for (let i = budget.maxRibbonCount; i < this.trailRibbons.length; i++) {
        this.trailRibbons[i].count = 0;
        this.trailRibbons[i].mesh.visible = false;
      }
    }
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

    const bx = this.rig.root.position.x;
    const by = this.rig.root.position.y + 1.35;
    const bz = this.rig.root.position.z;

    if (feedback.sparkCount > 0) {
      this.spawnSparks(bx, by, bz, feedback.sparkColorHex, feedback.sparkCount);
    }
    if (feedback.puffCount > 0) {
      const budget = getGraphicsQualityBudget(this.lowGraphics);
      const effectivePuffs = scaleParticleCount(feedback.puffCount, budget.puffScale, 1);
      for (let i = 0; i < effectivePuffs; i++) {
        const pf = this.puffs[this.puffCursor];
        this.puffCursor = (this.puffCursor + 1) % this.puffs.length;
        const a = (i / Math.max(1, effectivePuffs)) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 0.55 + Math.random() * 0.55;
        pf.active = true;
        pf.x = bx + Math.cos(a) * 0.2;
        pf.y = by - 0.1 + Math.random() * 0.2;
        pf.z = bz + Math.sin(a) * 0.2;
        pf.vx = Math.cos(a) * spd;
        pf.vy = 0.75 + Math.random() * 0.55;
        pf.vz = Math.sin(a) * spd;
        pf.life = 0;
        pf.maxLife = 0.62 + Math.random() * 0.24;
        pf.baseScale = 0.75 + Math.random() * 0.35;
        pf.color = i % 2 === 0 ? feedback.puffColorHex : feedback.sparkColorHex;
      }
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
    this.resetBotToWorkshop();
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
        this.botTrackZ = this.simToZ;
        this.botTrackY = curStep.ev.status === 'fall' ? -3.5 : 0;
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
    this.resetBotToWorkshop();
    this.setMood('neutral', 0);
    this.mode = 'CODE_3D';
    this.cb.onSimPauseChange?.(false, false, false);
  }

  private prepareCurrentSimStep() {
    const step = this.simQueue[this.simIndex];
    if (!step) return;
    const ev = step.ev;
    this.simFromZ = ev.fromPos === 0 ? 0 : TRACK_START_Z - ev.fromPos * TILE_SPACING;
    this.simToZ = ev.toPos === 0 ? 0 : TRACK_START_Z - ev.toPos * TILE_SPACING;
    this.simScanMatch = ev.scanMatch ?? null;

    this.cb.onSimProgress(this.simIndex, ev);

    if (ev.action === 'SCAN') {
      this.setMood('scan', step.duration);
      SFX.sensorScan(Boolean(ev.scanMatch));
    } else if (ev.action === 'JUMP') {
      this.setMood('neutral', 0);
      SFX.jump();
    } else if (ev.action === 'BOOST') {
      this.setMood('boost', step.duration);
      this.spawnSparks(0, 0.7, this.simFromZ, 0xf472b6, 18);
      SFX.boost();
    } else {
      this.setMood('neutral', 0);
      SFX.step();
    }
    if (ev.status === 'stuck') {
      this.spawnSparks(0, 0.35, this.simToZ, 0xd97706, 18);
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
      this.setMood('happy', 2.4);
      SFX.chirpHappy();
    } else if (res.failCode === 'empty' || res.failCode === 'empty_container' || res.failCode === 'short') {
      this.setMood('confused', 2.8);
      SFX.chirpConfused();
    } else {
      this.setMood('sad', 3.0);
      SFX.chirpSad();
    }
    this.cb.onSimComplete(res);
  }

  private handleResize = () => {
    if (!this.renderer) return;
    this.width = Math.max(320, this.container.clientWidth || window.innerWidth);
    this.height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
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

    // Two-finger touch pinch-to-zoom in BUILD_3D & PAINT_BOOTH
    if (
      this.activePointers.size === 2 &&
      (this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH')
    ) {
      const pts = Array.from(this.activePointers.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchStartDist > 12) {
        const ratio = this.pinchStartDist / Math.max(12, curDist);
        this.pointerDragged = true;
        this.workshopAutoSpin = false;
        this.orbitTarget = clampWorkshopOrbit({
          ...this.orbitTarget,
          distance: this.pinchStartOrbitDist * ratio
        });
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
    const rawDt = Math.min(0.25, Math.max(0.001, (now - this.lastTs) / 1000));
    const dt = Math.min(0.05, rawDt);
    this.lastTs = now;
    this.totalTime += rawDt;

    // Spin windmills, solar horizon ring, ambient dust motes & crystals
    for (let i = 0; i < this.env.windmills.length; i++) {
      this.env.windmills[i].rotation.z += dt * (0.7 + i * 0.15);
    }
    this.env.solarRing.rotation.z = -0.1 + Math.sin(this.totalTime * 0.14) * 0.04;
    this.env.turntableOuterRing.rotation.z -= dt * 0.22;

    if (this.env.ambientMotes.visible) {
      for (let i = 0; i < this.env.moteSeeds.length; i++) {
        const m = this.env.moteSeeds[i];
        const bobY = m.y + Math.sin(this.totalTime * m.speed + m.phase) * 0.32;
        const driftX = m.x + Math.cos(this.totalTime * m.speed * 0.5 + m.phase) * 0.22;
        _dummy.position.set(driftX, bobY, m.z);
        _dummy.rotation.set(this.totalTime * 0.6 + m.phase, this.totalTime * 0.9 + m.phase, 0);
        _dummy.scale.setScalar(m.scale * (0.78 + Math.sin(this.totalTime * 2.2 + m.phase) * 0.22));
        _dummy.updateMatrix();
        this.env.ambientMotes.setMatrixAt(i, _dummy.matrix);
      }
      this.env.ambientMotes.instanceMatrix.needsUpdate = true;
    }

    this.crystalMeshes.forEach((m, idx) => {
      if (m.visible) {
        m.rotation.y += dt * 2.2;
        m.position.y = 1.0 + Math.sin(this.totalTime * 3 + idx) * 0.14;
      }
    });

    // Gate Doors Open Smoothly when solved
    const targetOpen = this.mode === 'ACTION_RUN_3D' || this.mode === 'VICTORY' ? 1.85 : 0;
    this.gateOpenAmt = THREE.MathUtils.damp(this.gateOpenAmt, targetOpen, 7, dt);
    if (this.gateLeftDoor && this.gateRightDoor) {
      this.gateLeftDoor.position.x = -0.95 - this.gateOpenAmt;
      this.gateRightDoor.position.x = 0.95 + this.gateOpenAmt;
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

    // Turntable glow & tactile lab props animation
    const ringMat = this.env.turntableRing.material as THREE.MeshStandardMaterial;
    if (this.celebrateTimer > 0) {
      this.env.turntableRing.rotation.z += dt * 2.4;
      ringMat.color.setHex(0x34d399);
      ringMat.emissive.setHex(0x10b981);
      ringMat.emissiveIntensity = 2.0 + Math.sin(this.totalTime * 14) * 0.45;
    } else if (this.buildTimer > 0) {
      this.env.turntableRing.rotation.z += dt * 1.6;
      ringMat.color.setHex(0xfbbf24);
      ringMat.emissive.setHex(0xf59e0b);
      ringMat.emissiveIntensity = 1.9;
    } else if (this.mode === 'PAINT_BOOTH') {
      this.env.turntableRing.rotation.z += dt * 0.9;
      ringMat.color.setHex(0xe879f9);
      ringMat.emissive.setHex(0xc026d3);
      ringMat.emissiveIntensity = 1.8 + Math.sin(this.totalTime * 4) * 0.3;
    } else {
      this.env.turntableRing.rotation.z += dt * 0.4;
      ringMat.color.setHex(0x38bdf8);
      ringMat.emissive.setHex(0x0ea5e9);
      ringMat.emissiveIntensity = 1.5;
    }

    const gearMult = this.buildTimer > 0 ? 3.5 : this.celebrateTimer > 0 ? 2.2 : 1;
    this.env.gearLarge.rotation.z += dt * 0.9 * gearMult;
    this.env.gearSmall.rotation.z -= dt * 1.35 * gearMult;

    // Helper Drone: swoops in to weld during Phase 1 of installation, cheers above in Phase 2!
    const installing = Boolean(this.installSeq && !this.installSeq.celebrated && this.buildTargetSlot);
    if (installing && this.buildTargetSlot) {
      const wPos = this.rig.getSlotWorldPosition(this.buildTargetSlot[0], this.buildTargetSlot[1], _weldEnd);
      _droneGoal.set(
        wPos.x + (wPos.x >= 0 ? 0.92 : -0.92) + Math.cos(this.totalTime * 7) * 0.14,
        Math.max(1.2, wPos.y + 0.58 + Math.sin(this.totalTime * 10) * 0.08),
        wPos.z + (wPos.z >= 0 ? 0.85 : -0.85)
      );
      this.env.helperDrone.position.x = THREE.MathUtils.damp(this.env.helperDrone.position.x, _droneGoal.x, 9, dt);
      this.env.helperDrone.position.y = THREE.MathUtils.damp(this.env.helperDrone.position.y, _droneGoal.y, 9, dt);
      this.env.helperDrone.position.z = THREE.MathUtils.damp(this.env.helperDrone.position.z, _droneGoal.z, 9, dt);
      this.env.helperDrone.lookAt(wPos);
      this.env.droneRotor.rotation.y += dt * 28;

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
        const flicker = 0.8 + Math.sin(this.totalTime * 42) * 0.35;
        this.env.droneWeldBeam.scale.set(flicker, len, flicker);
        (this.env.droneWeldBeam.material as THREE.MeshBasicMaterial).color.setHex(
          Math.sin(this.totalTime * 35) > 0 ? 0x38bdf8 : 0xfde047
        );
      }
    } else {
      this.env.droneWeldBeam.visible = false;
      const cheerY =
        this.celebrateTimer > 0
          ? 2.55 + Math.abs(Math.sin(this.totalTime * 10)) * 0.3
          : 2.25 + Math.sin(this.totalTime * 2.1) * 0.12;
      this.env.helperDrone.position.x = THREE.MathUtils.damp(this.env.helperDrone.position.x, -1.95, 5.5, dt);
      this.env.helperDrone.position.y = THREE.MathUtils.damp(this.env.helperDrone.position.y, cheerY, 6, dt);
      this.env.helperDrone.position.z = THREE.MathUtils.damp(this.env.helperDrone.position.z, -0.25, 5.5, dt);
      this.env.helperDrone.rotation.x = THREE.MathUtils.damp(this.env.helperDrone.rotation.x, 0, 6, dt);
      this.env.helperDrone.rotation.z = THREE.MathUtils.damp(this.env.helperDrone.rotation.z, 0, 6, dt);
      this.env.helperDrone.rotation.y = THREE.MathUtils.damp(
        this.env.helperDrone.rotation.y,
        this.celebrateTimer > 0 ? this.env.helperDrone.rotation.y + dt * 6 : 0.45 + this.lookX * 0.35,
        5,
        dt
      );
      this.env.droneRotor.rotation.y += dt * (this.celebrateTimer > 0 ? 26 : 18);
    }
    for (let i = 0; i < this.env.conduitOrbs.length; i++) {
      const orb = this.env.conduitOrbs[i];
      const phase = (((this.totalTime * 0.55 + (orb.userData.phaseOffset as number)) % 1) + 1) % 1;
      orb.position.z = THREE.MathUtils.lerp(-1.95, -4.15, phase);
      orb.scale.setScalar(0.75 + Math.sin(phase * Math.PI) * 0.45);
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
          const fZ = ev.fromPos === 0 ? 0 : TRACK_START_Z - ev.fromPos * TILE_SPACING;
          const tZ = ev.toPos === 0 ? 0 : TRACK_START_Z - ev.toPos * TILE_SPACING;
          const gz = THREE.MathUtils.lerp(fZ, tZ, localT);
          const gy =
            ev.action === 'JUMP'
              ? Math.sin(localT * Math.PI) * 1.9
              : ev.action === 'BOOST'
                ? Math.sin(localT * Math.PI) * 0.95
                : 0;
          this.ghostBotGroup.position.set(0, gy, gz);
          this.ghostBotGroup.rotation.y = 0;
          this.ghostBotGroup.scale.setScalar(1.02 + Math.sin(this.totalTime * 8) * 0.03);
          for (let i = 0; i < this.ghostArcDots.length; i++) {
            const dot = this.ghostArcDots[i];
            const f = (i + 1) / (this.ghostArcDots.length + 1);
            dot.visible = true;
            _arcPos.set(
              0,
              (ev.action === 'JUMP' ? Math.sin(f * Math.PI) * 1.9 : ev.action === 'BOOST' ? Math.sin(f * Math.PI) * 0.95 : 0.35),
              THREE.MathUtils.lerp(fZ, tZ, f)
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

        if (step.ev.action !== 'SCAN') {
          isMoving = !this.simPaused;
          speed = this.simPaused ? 0 : step.ev.action === 'BOOST' ? 14 : 7;
          this.botTrackZ = THREE.MathUtils.lerp(this.simFromZ, this.simToZ, eased);
          if (step.ev.action === 'JUMP') {
            isAirborne = t > 0.04 && t < 0.96;
            this.botTrackY = Math.sin(t * Math.PI) * 1.85;
            tiltPitch = (0.5 - t) * 0.45;
          } else if (step.ev.action === 'BOOST') {
            isAirborne = t > 0.15 && t < 0.85;
            this.botTrackY = Math.sin(t * Math.PI) * 0.95;
            tiltPitch = t < 0.96 ? -0.18 : 0;
          } else if (step.ev.status === 'fall') {
            this.botTrackY = -t * t * 3.5;
            tiltPitch = 0.5 * t;
          } else {
            this.botTrackY = 0;
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

        const trailCfg = computeActionTrailEmitConfig({
          speed,
          surface: m.surface,
          isAirborne,
          turboActive: m.turboTimer > 0,
          hasBooster: info.hasBooster,
          hasMagnet: info.hasMagnet,
          lowGraphics: this.lowGraphics
        });
        const trailAnchors = computeTrailEmitterOffsets(
          this.runnerBotRoll,
          info.hasThrusters,
          info.hasBooster
        );
        const ribbonHalfWidth =
          trailCfg.state === 'turbo' ? 0.165 : trailCfg.state === 'wallrun' ? 0.13 : 0.105;
        this.updateActionRibbons(
          dt,
          trailAnchors,
          trailCfg.palette,
          ribbonHalfWidth,
          this.runnerBotRoll
        );
        this.trailEmitAccum = Math.min(12, this.trailEmitAccum + trailCfg.spawnRatePerSec * dt);
        while (this.trailEmitAccum >= 1) {
          this.trailEmitAccum -= 1;
          const anchor = trailAnchors[this.trailAnchorIdx % trailAnchors.length];
          this.trailAnchorIdx += 1;
          const sample = createActionTrailSpawnSample({
            botX: this.runnerBotX,
            botY: this.runnerBotY,
            botZ: this.botTrackZ,
            botVx,
            botVy,
            speed,
            anchor,
            config: trailCfg,
            jitterX: Math.random() * 2 - 1,
            jitterY: Math.random() * 2 - 1,
            colorIdx: this.trailColorSeq++,
            lifeJitter: Math.random()
          });
          this.spawnActionTrailParticle(sample, this.runnerBotRoll);
        }

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
              SFX.compactCrunch();
              this.respawnEntity(ent, this.botTrackZ - 55 - Math.random() * 40);
              continue;
            } else if (!this.runnerEndless) {
              // Gentle kid-friendly bounce slowdown rather than harsh instant death
              this.runnerJumpVy = 5.5;
              this.setMood('sad', 0.9);
              SFX.chirpSad();
              this.respawnEntity(ent, this.botTrackZ - 55 - Math.random() * 40);
              continue;
            } else {
              m.finished = true;
              m.crashed = true;
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
    }

    // Apply Robot World Transform (step slightly left in CIRCUIT_3D so 5x5 board is unobstructed)
    const circuitOffsetX = this.mode === 'CIRCUIT_3D' ? -1.45 : 0;
    this.rig.root.position.set(
      this.mode === 'ACTION_RUN_3D' ? this.runnerBotX : circuitOffsetX,
      this.botTrackY,
      this.botTrackZ
    );
    this.rig.root.rotation.x = 0;
    this.rig.root.rotation.z = this.mode === 'ACTION_RUN_3D' ? this.runnerBotRoll : 0;

    // Workshop, Paint Booth, Expressive Mood, & Victory Facing: face -Z robot front toward camera
    if (this.mode === 'TITLE') {
      this.rig.root.rotation.y = -2.55 + Math.sin(this.totalTime * 0.55) * 0.28;
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

    // Contact shadow height adjustment
    this.rig.contactShadow.position.y = Math.max(0.02, 0.02 - Math.max(0, this.botTrackY) * 0.8);
    const shScale = THREE.MathUtils.clamp(1 - Math.max(0, this.botTrackY) * 0.18, 0.4, 1);
    this.rig.contactShadow.scale.setScalar(shScale);

    // Update Robot Articulated Animation Rig
    this.rig.update({
      dt,
      time: this.totalTime,
      mood: this.botMood,
      speed,
      isMoving,
      isAirborne,
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
      turboActive: Boolean(this.runnerMetrics && this.runnerMetrics.turboTimer > 0)
    });

    // Update Particle Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.sparkInst.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      sp.vy -= 9.8 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      const s = Math.max(0.05, 1 - sp.life / sp.maxLife);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.scale.setScalar(s);
      _dummy.rotation.y += dt * 8;
      _dummy.updateMatrix();
      this.sparkInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(sp.color);
      this.sparkInst.setColorAt(i, _color);
    }
    this.sparkInst.instanceMatrix.needsUpdate = true;
    if (this.sparkInst.instanceColor) this.sparkInst.instanceColor.needsUpdate = true;

    // Update Soft 3D Pastel Puffs (buoyant rise + air drag + pillowy pop scale)
    const puffDrag = Math.exp(-2.8 * dt);
    for (let i = 0; i < this.puffs.length; i++) {
      const pf = this.puffs[i];
      if (!pf.active) continue;
      pf.life += dt;
      if (pf.life >= pf.maxLife) {
        pf.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.puffInst.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      pf.vx *= puffDrag;
      pf.vz *= puffDrag;
      pf.vy = pf.vy * Math.exp(-1.5 * dt) + 0.35 * dt;
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.z += pf.vz * dt;
      const progress = pf.life / pf.maxLife;
      const s = Math.max(0.02, evaluatePuffScale(progress) * pf.baseScale);
      _dummy.position.set(pf.x, pf.y, pf.z);
      _dummy.rotation.set(progress * 1.4, progress * 2.1, 0);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      this.puffInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(pf.color);
      this.puffInst.setColorAt(i, _color);
    }
    this.puffInst.instanceMatrix.needsUpdate = true;
    if (this.puffInst.instanceColor) this.puffInst.instanceColor.needsUpdate = true;

    // Update Action Dash High-Speed Trailing Particles (elongated luminous speed streaks)
    let trailMatrixDirty = false;
    let trailColorDirty = false;
    const trailLateralDrag = Math.exp(-3.4 * dt);
    for (let i = 0; i < this.trailParticles.length; i++) {
      const tr = this.trailParticles[i];
      if (!tr.active) continue;
      tr.life += dt;
      if (tr.life >= tr.maxLife) {
        tr.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.trailInst.setMatrixAt(i, _dummy.matrix);
        trailMatrixDirty = true;
        continue;
      }
      tr.vx *= trailLateralDrag;
      tr.vy *= trailLateralDrag;
      tr.x += tr.vx * dt;
      tr.y += tr.vy * dt;
      tr.z += tr.vz * dt;
      const progress = tr.life / tr.maxLife;
      const xf = evaluateTrailParticleTransform(progress, tr.baseWidth, tr.streakLength);
      _dummy.position.set(tr.x, tr.y, tr.z);
      _dummy.rotation.set(0, 0, tr.roll + tr.life * tr.spin);
      _dummy.scale.set(xf.scaleX * 0.48, xf.scaleY * 0.42, xf.scaleZ * 5.8);
      _dummy.updateMatrix();
      this.trailInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(tr.color).multiplyScalar(xf.brightness);
      this.trailInst.setColorAt(i, _color);
      trailMatrixDirty = true;
      trailColorDirty = true;
    }
    if (trailMatrixDirty) this.trailInst.instanceMatrix.needsUpdate = true;
    if (trailColorDirty && this.trailInst.instanceColor) {
      this.trailInst.instanceColor.needsUpdate = true;
    }

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
      _camGoal.set(6.6 * framing.distanceScale, 5.4 * Math.min(1.18, framing.distanceScale), 5.4 * framing.distanceScale);
      _lookGoal.set(0, 0.85 + framing.lookYOffset, -7.2);
    } else if (this.mode === 'SIMULATING') {
      _camGoal.set(
        4.8 * framing.distanceScale,
        3.8 + Math.max(0, this.botTrackY) * 0.4,
        this.botTrackZ + 6.2 * framing.distanceScale
      );
      _lookGoal.set(0, 0.9 + framing.lookYOffset, this.botTrackZ - 3.5);
    } else if (this.mode === 'CIRCUIT_3D') {
      const cz = this.circuitGroup.position.z;
      _camGoal.set(0, 2.55, cz + 5.8 * framing.distanceScale);
      _lookGoal.set(0, 2.45 + framing.lookYOffset, cz);
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
    } else {
      // VICTORY
      _camGoal.set(1.8 * framing.distanceScale, 2.4, this.botTrackZ + 4.4 * framing.distanceScale);
      _lookGoal.set(0, 1.1 + framing.lookYOffset, this.botTrackZ);
    }

    const camLambda = this.mode === 'BUILD_3D' || this.mode === 'PAINT_BOOTH' ? 9.5 : 5.5;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camGoal.x, camLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camGoal.y, camLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camGoal.z, camLambda, dt);
    _curLook.x = THREE.MathUtils.damp(_curLook.x, _lookGoal.x, 7.5, dt);
    _curLook.y = THREE.MathUtils.damp(_curLook.y, _lookGoal.y, 7.5, dt);
    _curLook.z = THREE.MathUtils.damp(_curLook.z, _lookGoal.z, 7.5, dt);
    this.camera.lookAt(_curLook);

    // Responsive base FOV + subtle speed-reactive FOV kick during Action Dash
    const targetFov =
      this.mode === 'ACTION_RUN_3D' && this.runnerMetrics && this.runnerMetrics.turboTimer > 0
        ? framing.baseFov + 4.5
        : framing.baseFov;
    const prevFov = this.camera.fov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
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

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
      this.pacer = scheduleAfterDraw(this.renderer, this.isSoftwareGl, this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    this.pacer?.cancel();
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
    this.env.dispose();
    this.sparkInst.geometry.dispose();
    (this.sparkInst.material as THREE.Material).dispose();
    this.puffInst.geometry.dispose();
    (this.puffInst.material as THREE.Material).dispose();
    this.trailInst.geometry.dispose();
    (this.trailInst.material as THREE.Material).dispose();
    const disposedRibbonMats = new Set<THREE.Material>();
    for (const rb of this.trailRibbons) {
      rb.mesh.geometry.dispose();
      const mat = rb.mesh.material as THREE.Material;
      if (!disposedRibbonMats.has(mat)) {
        mat.dispose();
        disposedRibbonMats.add(mat);
      }
    }
    this.tex.dispose();
    this.renderer?.dispose();
    SFX.setGlide(false);
    SFX.cancelSpeech();
  }
}
