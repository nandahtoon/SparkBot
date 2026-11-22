import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {
  BotCharacterId,
  BotThemeId,
  ChassisGrid,
  PaintBoothConfig,
  PaintPartKey,
  PartId
} from '../game/engine';
import {
  BOT_CHARACTERS,
  BOT_THEMES,
  computeChassisInfo,
  normalizeBotCharacter,
  normalizeBotTheme
} from '../game/engine';
import type { ProceduralTextures } from './materials';
import type { RobotTouchZone } from '../game/robotVoice';
import type { CodeComplexityTier } from '../game/codeFeedback';

export type BotMood = 'neutral' | 'happy' | 'sad' | 'confused' | 'build' | 'scan' | 'boost' | 'wallrun';

export interface RobotAnimParams {
  dt: number;
  time: number;
  mood: BotMood;
  speed: number;
  isMoving: boolean;
  isAirborne: boolean;
  tiltPitch: number;
  tiltRoll: number;
  lookX: number;
  lookY: number;
  buildTargetSlot: [number, number] | null;
  buildTimer: number;
  celebrateTimer: number;
  touchTimer: number;
  codeFeedbackTier?: CodeComplexityTier | null;
  codeFeedbackTimer?: number;
  codeFeedbackDuration?: number;
  scanMatch: boolean | null;
  shieldActive: boolean;
  turboActive: boolean;
}

export interface SlotScreenPoint {
  r: number;
  c: number;
  x: number;
  y: number;
  visible: boolean;
  part: PartId | null;
}

export interface HeadScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export const CHASSIS_SLOT_OFFSETS: Record<string, [number, number, number]> = {
  '0,0': [0.58, 1.32, 0.24],
  '0,1': [0, 1.38, -0.02],
  '0,2': [0, 1.34, -0.45],
  '1,0': [-0.76, 0.86, 0.22],
  '1,1': [0, 0.86, 0.0],
  '1,2': [0.46, 0.84, -0.66],
  '2,0': [0.06, 0.24, -0.22],
  '2,1': [-0.62, 0.34, -0.34],
  '2,2': [0, 0.34, -0.56]
};

export interface RobotRig {
  root: THREE.Group;
  visual: THREE.Group;
  contactShadow: THREE.Mesh;
  applyChassis: (chassis: ChassisGrid, hoverSlot?: { r: number; c: number; valid: boolean; part: PartId } | null) => void;
  update: (p: RobotAnimParams) => void;
  getSlotScreenPoints: (camera: THREE.Camera, width: number, height: number, chassis: ChassisGrid) => SlotScreenPoint[];
  getHeadScreenPoint: (camera: THREE.Camera, width: number, height: number) => HeadScreenPoint;
  getSlotWorldPosition: (r: number, c: number, out: THREE.Vector3) => THREE.Vector3;
  getPartWorldPosition: (part: PaintPartKey, out: THREE.Vector3) => THREE.Vector3;
  triggerPartPop: (part: PartId) => void;
  setTheme: (theme: BotThemeId) => void;
  applyPaintConfig: (config: PaintBoothConfig) => void;
  setCharacter: (charId: BotCharacterId) => void;
}

const _tmpVec = new THREE.Vector3();

function makeStarGeo(rOut: number, rIn: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.28,
    bevelSize: rOut * 0.08,
    bevelSegments: 2
  });
  g.center();
  return g;
}

function makeCuteMouthGeo(radius: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, Math.PI * 2, false);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 18);
}

export function createRobotRig(tex: ProceduralTextures, isSoftwareGl: boolean): RobotRig {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  // Smooth Pixar / vinyl-ceramic PBR materials with soft clearcoat & varied roughness
  const mats = {
    body: new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      map: tex.chassisPanel,
      bumpMap: tex.metalBump,
      bumpScale: 0.004,
      roughness: 0.28,
      metalness: 0.14,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16
    }),
    accent: new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      roughness: 0.36,
      metalness: 0.38,
      clearcoat: 0.45,
      clearcoatRoughness: 0.24
    }),
    steel: new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.75,
      clearcoat: 0.5
    }),
    headShell: new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      map: tex.chassisPanel,
      bumpMap: tex.metalBump,
      bumpScale: 0.003,
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12
    }),
    armPaint: new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      map: tex.chassisPanel,
      bumpMap: tex.metalBump,
      bumpScale: 0.003,
      roughness: 0.26,
      metalness: 0.16,
      clearcoat: 0.68,
      clearcoatRoughness: 0.16
    }),
    wheelPaint: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      map: tex.chassisPanel,
      roughness: 0.26,
      metalness: 0.22,
      clearcoat: 0.7
    }),
    treadPaint: new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      map: tex.chassisPanel,
      roughness: 0.38,
      metalness: 0.2,
      clearcoat: 0.45
    }),
    laserPaint: new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      map: tex.chassisPanel,
      roughness: 0.22,
      metalness: 0.32,
      clearcoat: 0.78
    }),
    darkFrame: new THREE.MeshStandardMaterial({ color: 0x162032, roughness: 0.42, metalness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x172030,
      bumpMap: tex.metalBump,
      bumpScale: 0.006,
      roughness: 0.92,
      metalness: 0.04
    }),
    machinedGunmetal: new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      bumpMap: tex.metalBump,
      bumpScale: 0.005,
      roughness: 0.28,
      metalness: 0.84,
      clearcoat: 0.28
    }),
    titaniumFrame: new THREE.MeshPhysicalMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.78,
      clearcoat: 0.35
    }),
    chromeTrim: new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.14,
      metalness: 0.94,
      clearcoat: 0.85
    }),
    brushedCopper: new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      bumpMap: tex.metalBump,
      bumpScale: 0.004,
      roughness: 0.24,
      metalness: 0.9,
      clearcoat: 0.35
    }),
    caliperRed: new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.22,
      metalness: 0.32,
      clearcoat: 0.88
    }),
    exhaustInterior: new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.72,
      metalness: 0.5,
      side: THREE.DoubleSide
    }),
    amberGlow: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.35,
      roughness: 0.16,
      metalness: 0.1
    }),
    laserCrystal: new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.9,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0
    }),
    magnetCoreGlow: new THREE.MeshStandardMaterial({
      color: 0xa5b4fc,
      emissive: 0x6366f1,
      emissiveIntensity: 1.45,
      roughness: 0.14,
      metalness: 0.2
    }),
    bootTrim: new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.32, metalness: 0.18, clearcoat: 0.55 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.74, metalness: 0.06 }),
    leatherLight: new THREE.MeshStandardMaterial({ color: 0xc26d27, roughness: 0.68, metalness: 0.08 }),
    hazard: new THREE.MeshStandardMaterial({
      map: tex.hazard,
      roughness: 0.42,
      metalness: 0.18
    }),
    solarPanel: new THREE.MeshPhysicalMaterial({
      map: tex.solarCells,
      roughness: 0.14,
      metalness: 0.38,
      clearcoat: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22
    }),
    tankRed: new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      map: tex.chassisPanel,
      roughness: 0.2,
      metalness: 0.22,
      clearcoat: 0.88,
      clearcoatRoughness: 0.1
    }),
    boosterPink: new THREE.MeshPhysicalMaterial({
      color: 0xf472b6,
      map: tex.chassisPanel,
      roughness: 0.22,
      metalness: 0.25,
      clearcoat: 0.8
    }),
    brass: new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.85,
      clearcoat: 0.6
    }),
    magCoil: new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      map: tex.chassisPanel,
      emissive: 0x6366f1,
      emissiveIntensity: 0.28,
      roughness: 0.26,
      metalness: 0.42,
      clearcoat: 0.72
    }),
    eyeGlow: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.55,
      roughness: 0.12,
      metalness: 0.05
    }),
    eyeDeep: new THREE.MeshStandardMaterial({
      color: 0x091326,
      roughness: 0.08,
      metalness: 0.1
    }),
    catchlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    cheekBlush: new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    }),
    mouthPink: new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide }),
    happyArc: new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.15
    }),
    tearMat: new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.88,
      roughness: 0.08,
      clearcoat: 1.0
    }),
    glassLens: new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      ior: 1.5,
      depthWrite: false
    }),
    sapphireLens: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.06,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    }),
    flameMat: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    }),
    flameCoreMat: new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.94,
      depthWrite: false
    }),
    boostOuterMat: new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.84,
      depthWrite: false
    }),
    boostCoreMat: new THREE.MeshBasicMaterial({
      color: 0xfdf2f8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    }),
    scanCone: new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    }),
    shield: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.0,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false
    }),
    antennaGlow: new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.5,
      roughness: 0.18
    }),
    sparkleMat: new THREE.MeshBasicMaterial({ color: 0xfde047 }),
    questionMat: new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xa855f7,
      emissiveIntensity: 1.5,
      roughness: 0.2
    })
  };

  // ---------------------------------------------------------
  // 1. Sculpted Pillowy Toy-Ceramic Torso & Rounded Waist
  // ---------------------------------------------------------
  const torsoGroup = new THREE.Group();
  visual.add(torsoGroup);

  const chassisMesh = new THREE.Mesh(
    new RoundedBoxGeometry(0.94, 0.78, 0.82, 6, 0.25),
    mats.body
  );
  chassisMesh.position.set(0, 0.84, 0);
  chassisMesh.castShadow = !isSoftwareGl;
  chassisMesh.receiveShadow = true;
  chassisMesh.userData.touchZone = 'body' as RobotTouchZone;
  chassisMesh.userData.paintPart = 'chassis' as PaintPartKey;
  visual.userData.touchZone = 'body' as RobotTouchZone;
  visual.userData.paintPart = 'chassis' as PaintPartKey;
  torsoGroup.add(chassisMesh);

  // Soft sculpted waist belt + rounded pelvis connector
  const waistBelt = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.055, 14, 32),
    mats.accent
  );
  waistBelt.rotation.x = Math.PI / 2;
  waistBelt.position.set(0, 0.48, 0);
  waistBelt.scale.set(1.06, 0.92, 1.0);
  torsoGroup.add(waistBelt);

  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.26, 0.16, 24),
    mats.darkFrame
  );
  pelvisMesh.position.set(0, 0.42, 0);
  torsoGroup.add(pelvisMesh);

  // Soft rounded neck collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.068, 14, 28),
    mats.accent
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.24, -0.01);
  torsoGroup.add(collar);

  // Classic SparkBot accents (hidden on Sprout/Nova/RoboBuddy/LearnBot)
  const sparkBotChestGroup = new THREE.Group();
  const hatchPlate = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.36, 0.08, 4, 0.03),
    mats.hazard
  );
  hatchPlate.position.set(0, 0.76, -0.4);
  const chestGauge = new THREE.Mesh(
    new RoundedBoxGeometry(0.38, 0.08, 0.05, 3, 0.025),
    mats.eyeGlow
  );
  chestGauge.position.set(0, 1.04, -0.4);
  const solarDeck = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.04, 0.28, 2, 0.015),
    mats.solarPanel
  );
  solarDeck.position.set(0, 1.24, 0.24);
  solarDeck.rotation.x = -0.22;
  sparkBotChestGroup.add(hatchPlate, chestGauge, solarDeck);
  torsoGroup.add(sparkBotChestGroup);

  // ---------------------------------------------------------
  // 2. Sculpted Chubby Articulated Arms + Cute Rounded Hands
  // ---------------------------------------------------------
  interface ArmRig {
    shoulder: THREE.Group;
    elbow: THREE.Group;
    wrist: THREE.Group;
    pincerL: THREE.Mesh;
    pincerR: THREE.Mesh;
    weldTip: THREE.Mesh;
    side: number;
  }
  const arms: ArmRig[] = [];
  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.52, 0.98, -0.02);
    shoulder.userData.paintPart = 'arms' as PaintPartKey;

    // Rounded toy-ceramic shoulder pauldron + dark inner ball joint
    const innerJoint = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), mats.darkFrame);
    shoulder.add(innerJoint);

    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 16), mats.armPaint);
    pauldron.scale.set(1.05, 0.95, 1.05);
    pauldron.position.set(side * 0.04, 0.02, 0);
    pauldron.castShadow = !isSoftwareGl;
    shoulder.add(pauldron);

    // Chubby capsule upper arm angling smoothly downward/forward
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.18, 10, 18), mats.armPaint);
    upperArm.rotation.x = Math.PI / 2;
    upperArm.position.set(side * 0.05, -0.03, -0.17);
    upperArm.castShadow = !isSoftwareGl;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.05, -0.03, -0.32);
    shoulder.add(elbow);

    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 14), mats.bootTrim);
    elbow.add(elbowCap);

    const foreArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.15, 10, 18), mats.armPaint);
    foreArm.rotation.x = Math.PI / 2;
    foreArm.position.set(0, 0, -0.13);
    elbow.add(foreArm);

    const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.02, 10, 20), mats.brass);
    cuffRing.position.set(0, 0, -0.2);
    elbow.add(cuffRing);

    const wrist = new THREE.Group();
    wrist.position.set(0, 0, -0.25);
    elbow.add(wrist);

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 14), mats.darkFrame);
    wrist.add(palm);

    // Cute rounded smooth C-mitten fingers
    const pincerL = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.075, 8, 14), mats.armPaint);
    pincerL.rotation.x = Math.PI / 2;
    pincerL.position.set(0, 0.042, -0.07);
    wrist.add(pincerL);

    const pincerR = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.075, 8, 14), mats.armPaint);
    pincerR.rotation.x = Math.PI / 2;
    pincerR.position.set(0, -0.042, -0.07);
    wrist.add(pincerR);

    const weldTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0 })
    );
    weldTip.position.set(0, 0, -0.14);
    wrist.add(weldTip);

    visual.add(shoulder);
    arms.push({ shoulder, elbow, wrist, pincerL, pincerR, weldTip, side });
  });

  // ---------------------------------------------------------
  // 3. Cute Sculpted Articulated Legs & Explorer Boots
  //    (Replaces ugly flat skids when no wheels/treads attached)
  // ---------------------------------------------------------
  const bootsGroup = new THREE.Group();
  const legPivots: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.24, 0.42, 0);

    const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 14), mats.darkFrame);
    legPivot.add(hipJoint);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.14, 10, 18), mats.headShell);
    shin.position.set(0, -0.14, 0);
    shin.castShadow = !isSoftwareGl;
    legPivot.add(shin);

    // Chunky rounded explorer sneaker/boot grounded cleanly at y = -0.42 (world y = 0.0)
    const bootUpper = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.15, 0.34, 5, 0.07),
      mats.headShell
    );
    bootUpper.position.set(0, -0.31, -0.05);
    bootUpper.castShadow = !isSoftwareGl;
    legPivot.add(bootUpper);

    const bootToeTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.255, 0.06, 0.36, 4, 0.025),
      mats.bootTrim
    );
    bootToeTrim.position.set(0, -0.36, -0.05);
    legPivot.add(bootToeTrim);

    const bootSole = new THREE.Mesh(
      new RoundedBoxGeometry(0.265, 0.055, 0.38, 4, 0.02),
      mats.rubber
    );
    bootSole.position.set(0, -0.392, -0.05);
    legPivot.add(bootSole);

    bootsGroup.add(legPivot);
    legPivots.push(legPivot);
  });
  visual.add(bootsGroup);

  // ---------------------------------------------------------
  // 4. Short Smooth Neck + Expressive Oversized Chibi Head
  // ---------------------------------------------------------
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.25, -0.01);
  visual.add(neckGroup);

  const neckCore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.22, 20), mats.darkFrame);
  neckCore.position.y = 0.1;
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.028, 10, 22), mats.steel);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.11;
  neckGroup.add(neckCore, neckRing);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.44, -0.02);
  headGroup.userData.touchZone = 'head' as RobotTouchZone;
  headGroup.userData.paintPart = 'head' as PaintPartKey;
  neckGroup.add(headGroup);

  // Antenna on top of head (SparkBot, Sprout, LearnBot)
  const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.28, 14), mats.steel);
  antennaStem.position.set(0, 0.46, 0.02);
  headGroup.add(antennaStem);

  const antennaBulb = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 16), mats.antennaGlow);
  antennaBulb.position.set(0, 0.62, 0.02);
  headGroup.add(antennaBulb);

  // ---- 4a. Classic / LearnBot Twin Binocular Pods ----
  const podsGroup = new THREE.Group();
  headGroup.add(podsGroup);

  const eyeBridge = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.14, 0.18, 4, 0.04), mats.darkFrame);
  eyeBridge.position.set(0, 0.04, -0.05);
  podsGroup.add(eyeBridge);

  const brows: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.36, 28), mats.headShell);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.24, 0.04, -0.06);
    pod.castShadow = !isSoftwareGl;
    podsGroup.add(pod);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.032, 14, 28), mats.accent);
    rim.position.set(side * 0.24, 0.04, -0.24);
    podsGroup.add(rim);

    const barrel = new THREE.Mesh(new THREE.CircleGeometry(0.18, 28), mats.eyeDeep);
    barrel.rotation.y = Math.PI;
    barrel.position.set(side * 0.24, 0.04, -0.244);
    podsGroup.add(barrel);

    const glassCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.38),
      mats.glassLens
    );
    glassCap.rotation.x = -Math.PI / 2;
    glassCap.position.set(side * 0.24, 0.04, -0.17);
    podsGroup.add(glassCap);

    const brow = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.06, 0.12, 4, 0.025), mats.body);
    brow.position.set(side * 0.24, 0.25, -0.19);
    podsGroup.add(brow);
    brows.push(brow);
  });

  // ---- 4b. Smooth Oversized Rounded Chibi Visor Helmet (Sprout, Nova, RoboBuddy) ----
  const visorHelmetGroup = new THREE.Group();
  const helmetShell = new THREE.Mesh(
    new RoundedBoxGeometry(1.06, 0.78, 0.86, 6, 0.31),
    mats.headShell
  );
  helmetShell.position.set(0, 0.08, 0.04);
  helmetShell.castShadow = !isSoftwareGl;

  // Glossy dark curved face visor screen
  const visorBezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.86, 0.52, 0.18, 5, 0.16),
    mats.darkFrame
  );
  visorBezel.position.set(0, 0.05, -0.32);

  const visorScreen = new THREE.Mesh(
    new RoundedBoxGeometry(0.8, 0.46, 0.16, 5, 0.14),
    new THREE.MeshPhysicalMaterial({
      color: 0x0b1326,
      roughness: 0.06,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    })
  );
  visorScreen.position.set(0, 0.05, -0.345);
  visorHelmetGroup.add(helmetShell, visorBezel, visorScreen);

  // Cute glowing circular ear headphones/pods on both sides
  [-1, 1].forEach((side) => {
    const earOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 24), mats.headShell);
    earOuter.rotation.z = Math.PI / 2;
    earOuter.position.set(side * 0.54, 0.05, 0.02);

    const earTrim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 12, 24), mats.accent);
    earTrim.rotation.y = Math.PI / 2;
    earTrim.position.set(side * 0.59, 0.05, 0.02);

    const earCore = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.11, 20), mats.eyeGlow);
    earCore.rotation.z = Math.PI / 2;
    earCore.position.set(side * 0.55, 0.05, 0.02);
    visorHelmetGroup.add(earOuter, earTrim, earCore);
  });
  visorHelmetGroup.visible = false;
  headGroup.add(visorHelmetGroup);

  // ---- 4c. Living Expressive Eyes (Iris + Pupil + Twin Specular Catchlights + Cheeks + Smile!) ----
  const eyeGroups: THREE.Group[] = [];
  const eyeIrisMeshes: THREE.Mesh[] = [];
  const eyePupilGroups: THREE.Group[] = [];
  const happyArcs: THREE.Mesh[] = [];
  const cheekBlushes: THREE.Mesh[] = [];
  const tears: THREE.Mesh[] = [];

  [-1, 1].forEach((side) => {
    const eg = new THREE.Group();
    eg.position.set(side * 0.24, 0.05, -0.258);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.125, 24), mats.eyeGlow);
    iris.rotation.y = Math.PI;
    eg.add(iris);
    eyeIrisMeshes.push(iris);

    const pGroup = new THREE.Group();
    pGroup.position.set(0, 0, -0.006);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.072, 20), mats.eyeDeep);
    pupil.rotation.y = Math.PI;
    // Crisp twin Pixar white specular catchlights for living warmth!
    const catchBig = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), mats.catchlight);
    catchBig.rotation.y = Math.PI;
    catchBig.position.set(-0.026, 0.034, -0.005);
    const catchSmall = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), mats.catchlight);
    catchSmall.rotation.y = Math.PI;
    catchSmall.position.set(0.028, -0.024, -0.005);
    pGroup.add(pupil, catchBig, catchSmall);
    eg.add(pGroup);
    eyePupilGroups.push(pGroup);

    headGroup.add(eg);
    eyeGroups.push(eg);

    // Smooth 3D glowing happy ^ ^ crescent arc (positioned cleanly proud of visor!)
    const happyArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.026, 12, 24, Math.PI),
      mats.happyArc
    );
    happyArc.position.set(side * 0.24, 0.03, -0.268);
    happyArc.visible = false;
    headGroup.add(happyArc);
    happyArcs.push(happyArc);

    // Soft rosy coral cheek blush ovals
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.062, 18), mats.cheekBlush);
    blush.rotation.y = Math.PI;
    blush.scale.set(1.35, 0.72, 1);
    blush.position.set(side * 0.28, -0.06, -0.44);
    blush.visible = false;
    headGroup.add(blush);
    cheekBlushes.push(blush);

    // 3D teardrop for Sad pose
    const tear = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 14), mats.tearMat);
    tear.scale.set(0.85, 1.35, 0.85);
    tear.position.set(side * 0.24, -0.1, -0.35);
    tear.visible = false;
    headGroup.add(tear);
    tears.push(tear);
  });

  // Cute friendly smiling mouth (visible on Visor characters & LearnBot!)
  const cuteMouthMesh = new THREE.Mesh(makeCuteMouthGeo(0.075), mats.mouthPink);
  cuteMouthMesh.rotation.y = Math.PI;
  cuteMouthMesh.position.set(0, -0.055, -0.442);
  cuteMouthMesh.visible = false;
  headGroup.add(cuteMouthMesh);

  // ---------------------------------------------------------
  // 5. Character-Specific Sculpted 3D Costumes (Matches Reference Art!)
  // ---------------------------------------------------------

  // 5a. Shared Warm Explorer Backpack with Rolled Bedroll (Sprout & RoboBuddy)
  const backpackGroup = new THREE.Group();
  const packBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.56, 0.32, 5, 0.1),
    mats.leather
  );
  packBody.position.set(0, 0.84, 0.5);
  packBody.castShadow = !isSoftwareGl;
  const packFlap = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.16, 0.34, 4, 0.06),
    mats.leatherLight
  );
  packFlap.position.set(0, 1.04, 0.51);
  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.58, 18),
    new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.72 })
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.18, 0.5);
  const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.1, 0.06, 2, 0.02), mats.brass);
  buckle.position.set(0, 0.94, 0.67);
  backpackGroup.add(packBody, packFlap, bedroll, buckle);
  backpackGroup.visible = false;
  torsoGroup.add(backpackGroup);

  // 5b. Domed Brass Aviator Goggles (Sprout & Nova)
  const gogglesGroup = new THREE.Group();
  const goggleStrap = new THREE.Mesh(
    new THREE.TorusGeometry(0.41, 0.036, 10, 28),
    mats.leather
  );
  goggleStrap.rotation.x = Math.PI / 2 - 0.14;
  goggleStrap.scale.set(1.12, 0.88, 1);
  goggleStrap.position.set(0, 0.33, 0.01);
  gogglesGroup.add(goggleStrap);
  [-1, 1].forEach((side) => {
    const gHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.105, 24), mats.brass);
    gHousing.rotation.x = Math.PI / 2 - 0.36;
    gHousing.position.set(side * 0.2, 0.39, -0.31);
    const gLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.48),
      mats.sapphireLens
    );
    gLens.rotation.x = -Math.PI / 2 - 0.36;
    gLens.position.set(side * 0.2, 0.41, -0.33);
    gogglesGroup.add(gHousing, gLens);
  });
  gogglesGroup.visible = false;
  headGroup.add(gogglesGroup);

  // 5c. Sprout Flowing Red Scarf + Glowing Eco Leaf Medallion
  const sproutExtrasGroup = new THREE.Group();
  const redScarfMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.72, metalness: 0.04 });
  const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.105, 14, 28), redScarfMat);
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.scale.set(1.05, 0.94, 1);
  scarfCollar.position.set(0, 1.24, -0.01);

  const scarfTailPivot = new THREE.Group();
  scarfTailPivot.position.set(-0.28, 1.22, 0.18);
  const scarfTail1 = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.08, 0.42, 4, 0.035), redScarfMat);
  scarfTail1.position.set(-0.1, -0.02, 0.18);
  scarfTail1.rotation.set(0.18, -0.38, 0.1);
  const scarfTail2 = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.065, 0.32, 4, 0.03), redScarfMat);
  scarfTail2.position.set(-0.22, -0.05, 0.42);
  scarfTail2.rotation.set(0.26, -0.55, 0.15);
  scarfTailPivot.add(scarfTail1, scarfTail2);

  const leafMedallionRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.036, 12, 26), mats.eyeGlow);
  leafMedallionRing.position.set(0, 0.86, -0.42);
  const leafMedallionBg = new THREE.Mesh(new THREE.CircleGeometry(0.165, 24), mats.darkFrame);
  leafMedallionBg.rotation.y = Math.PI;
  leafMedallionBg.position.set(0, 0.86, -0.425);
  const leafGlowMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.5,
    roughness: 0.2
  });
  const leafL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 12), leafGlowMat);
  leafL.scale.set(1.25, 0.65, 0.35);
  leafL.rotation.z = 0.55;
  leafL.position.set(-0.048, 0.88, -0.44);
  const leafR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 12), leafGlowMat);
  leafR.scale.set(1.25, 0.65, 0.35);
  leafR.rotation.z = -0.55;
  leafR.position.set(0.048, 0.88, -0.44);
  sproutExtrasGroup.add(scarfCollar, scarfTailPivot, leafMedallionRing, leafMedallionBg, leafL, leafR);
  sproutExtrasGroup.visible = false;
  torsoGroup.add(sproutExtrasGroup);

  // 5d. Nova Owl-Bot Beak + Ear Tufts + 5-Feather Layered Glowing Wings + Brass Compass
  const novaHeadGroup = new THREE.Group();
  const beakMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.26, clearcoat: 0.6 });
  const owlBeakTop = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 16), beakMat);
  owlBeakTop.rotation.x = -Math.PI / 2 - 0.18;
  owlBeakTop.position.set(0, -0.02, -0.46);
  const owlBeakBot = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.095, 14), new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 }));
  owlBeakBot.rotation.x = -Math.PI / 2 + 0.35;
  owlBeakBot.position.set(0, -0.065, -0.445);
  novaHeadGroup.add(owlBeakTop, owlBeakBot);

  // Cute sculpted owl ear-feather tufts
  [-1, 1].forEach((side) => {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 14), mats.brass);
    tuft.position.set(side * 0.44, 0.44, -0.02);
    tuft.rotation.z = side * -0.42;
    tuft.rotation.x = -0.12;
    novaHeadGroup.add(tuft);
  });
  novaHeadGroup.visible = false;
  headGroup.add(novaHeadGroup);

  const novaWingsGroup = new THREE.Group();
  const wingPivots: THREE.Group[] = [];
  const featherWhiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    clearcoat: 0.72
  });
  const featherTipGlowMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.85,
    roughness: 0.2
  });
  [-1, 1].forEach((side) => {
    const wPivot = new THREE.Group();
    wPivot.position.set(side * 0.48, 0.98, 0.22);
    for (let f = 0; f < 5; f++) {
      const len = 0.62 - f * 0.075;
      const feather = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.068 - f * 0.005, len, 8, 16),
        f < 2 ? featherWhiteMat : featherTipGlowMat
      );
      feather.scale.set(1, 1, 0.45);
      feather.rotation.z = side * (Math.PI / 2 - 0.35 + f * 0.22);
      feather.rotation.y = side * -0.25;
      feather.position.set(
        side * (0.28 + Math.cos(f * 0.38) * 0.14),
        0.18 - f * 0.11,
        f * 0.035
      );
      wPivot.add(feather);
    }
    novaWingsGroup.add(wPivot);
    wingPivots.push(wPivot);
  });

  // Nova gold-ringed chest emerald leaf medallion + brass hip compass
  const novaChestRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 14, 28), mats.brass);
  novaChestRing.position.set(0, 0.86, -0.42);
  const novaChestBg = new THREE.Mesh(new THREE.CircleGeometry(0.165, 24), mats.darkFrame);
  novaChestBg.rotation.y = Math.PI;
  novaChestBg.position.set(0, 0.86, -0.425);
  const novaLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), leafGlowMat);
  novaLeaf.scale.set(1.1, 1.3, 0.35);
  novaLeaf.position.set(0, 0.86, -0.44);

  const hipCompass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 22), mats.brass);
  hipCompass.rotation.x = Math.PI / 2;
  hipCompass.position.set(-0.46, 0.58, -0.18);
  const compassDial = new THREE.Mesh(new THREE.CircleGeometry(0.105, 20), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
  compassDial.rotation.y = Math.PI;
  compassDial.position.set(-0.46, 0.58, -0.215);
  novaWingsGroup.add(novaChestRing, novaChestBg, novaLeaf, hipCompass, compassDial);
  novaWingsGroup.visible = false;
  torsoGroup.add(novaWingsGroup);

  // 5e. RoboBuddy Sculpted Curved LatheGeometry Wide-Brim Safari Hat + Blue Star Bandana
  const roboBuddyHatGroup = new THREE.Group();
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xd99142, roughness: 0.62, metalness: 0.04 });
  const hatProfile = [
    new THREE.Vector2(0.01, 0.68),
    new THREE.Vector2(0.24, 0.66),
    new THREE.Vector2(0.42, 0.58),
    new THREE.Vector2(0.49, 0.42),
    new THREE.Vector2(0.51, 0.36),
    new THREE.Vector2(0.72, 0.33),
    new THREE.Vector2(0.84, 0.27),
    new THREE.Vector2(0.82, 0.24),
    new THREE.Vector2(0.5, 0.31)
  ];
  const hatGeo = new THREE.LatheGeometry(hatProfile, 36);
  const hatMesh = new THREE.Mesh(hatGeo, hatMat);
  hatMesh.position.set(0, 0.06, 0.04);
  hatMesh.rotation.x = 0.08;
  hatMesh.castShadow = !isSoftwareGl;

  const hatBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.515, 0.525, 0.085, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, side: THREE.DoubleSide })
  );
  hatBand.position.set(0, 0.45, 0.04);
  hatBand.rotation.x = 0.08;
  roboBuddyHatGroup.add(hatMesh, hatBand);

  // Cute aviator goggles perched right on the safari hat crown
  [-1, 1].forEach((side) => {
    const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.09, 22), mats.brass);
    hg.rotation.x = Math.PI / 2 - 0.28;
    hg.position.set(side * 0.19, 0.56, -0.34);
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
      mats.sapphireLens
    );
    hl.rotation.x = -Math.PI / 2 - 0.28;
    hl.position.set(side * 0.19, 0.57, -0.36);
    roboBuddyHatGroup.add(hg, hl);
  });
  roboBuddyHatGroup.visible = false;
  headGroup.add(roboBuddyHatGroup);

  const roboBuddyBodyGroup = new THREE.Group();
  const blueScarfMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.56 });
  const blueScarf = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 14, 28), blueScarfMat);
  blueScarf.rotation.x = Math.PI / 2;
  blueScarf.scale.set(1.06, 0.94, 1);
  blueScarf.position.set(0, 1.24, -0.01);

  const bandanaFront = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.34, 4), blueScarfMat);
  bandanaFront.rotation.x = Math.PI + 0.18;
  bandanaFront.rotation.y = Math.PI / 4;
  bandanaFront.scale.set(1.1, 1, 0.38);
  bandanaFront.position.set(0, 1.07, -0.4);

  const starGoldMat = new THREE.MeshPhysicalMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    clearcoat: 0.75
  });
  const chestStar = new THREE.Mesh(makeStarGeo(0.135, 0.062, 0.045), starGoldMat);
  chestStar.position.set(0, 1.04, -0.47);
  roboBuddyBodyGroup.add(blueScarf, bandanaFront, chestStar);
  roboBuddyBodyGroup.visible = false;
  torsoGroup.add(roboBuddyBodyGroup);

  // 5f. LearnBot Giant Starry Binocular Eyes + Spinning Golden Star Antenna + Smiling Chest Screen
  const learnBotHeadGroup = new THREE.Group();
  const antennaStar = new THREE.Mesh(makeStarGeo(0.18, 0.085, 0.055), starGoldMat);
  antennaStar.position.set(0, 0.64, 0.02);
  learnBotHeadGroup.add(antennaStar);

  // Soft pastel yellow eyebrow caps over LearnBot's big twin eyes
  [-1, 1].forEach((side) => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
      mats.body
    );
    cap.position.set(side * 0.29, 0.14, -0.06);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.235, 0.036, 14, 30),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.4,
        roughness: 0.12
      })
    );
    halo.position.set(side * 0.29, 0.05, -0.285);
    learnBotHeadGroup.add(cap, halo);
  });
  learnBotHeadGroup.visible = false;
  headGroup.add(learnBotHeadGroup);

  const learnBotBodyGroup = new THREE.Group();
  const smileScreen = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.3, 0.09, 4, 0.07),
    mats.darkFrame
  );
  smileScreen.position.set(0, 0.92, -0.41);
  const smileArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.024, 12, 22, Math.PI),
    mats.happyArc
  );
  smileArc.rotation.z = Math.PI;
  smileArc.position.set(0, 0.94, -0.465);

  const beltStarRing = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.026, 12, 24), mats.eyeGlow);
  beltStarRing.position.set(0, 0.61, -0.425);
  const beltStar = new THREE.Mesh(makeStarGeo(0.105, 0.048, 0.04), starGoldMat);
  beltStar.position.set(0, 0.61, -0.445);
  learnBotBodyGroup.add(smileScreen, smileArc, beltStarRing, beltStar);
  learnBotBodyGroup.visible = false;
  torsoGroup.add(learnBotBodyGroup);

  // Floating 3D '?' Hologram for Confused pose
  const confusedGroup = new THREE.Group();
  confusedGroup.position.set(0, 0.88, 0.02);
  confusedGroup.visible = false;
  const qHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.032, 12, 20, Math.PI * 1.45),
    mats.questionMat
  );
  qHook.position.set(0, 0.14, 0);
  qHook.rotation.z = -0.35;
  const qStem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 12), mats.questionMat);
  qStem.position.set(0, 0.02, 0);
  const qDot = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), mats.questionMat);
  qDot.position.set(0, -0.08, 0);
  confusedGroup.add(qHook, qStem, qDot);
  headGroup.add(confusedGroup);

  // Orbiting 3D Star Sparkles + Joy Hearts
  const happySparkleGroup = new THREE.Group();
  happySparkleGroup.position.set(0, 0.68, 0);
  happySparkleGroup.visible = false;
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), mats.sparkleMat);
    const a = (i / 4) * Math.PI * 2;
    sp.position.set(Math.cos(a) * 0.62, (i % 2) * 0.16, Math.sin(a) * 0.62);
    happySparkleGroup.add(sp);
  }
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.06);
  heartShape.bezierCurveTo(-0.09, 0.02, -0.1, 0.12, -0.04, 0.13);
  heartShape.bezierCurveTo(0, 0.13, 0, 0.07, 0, 0.07);
  heartShape.bezierCurveTo(0, 0.07, 0, 0.13, 0.04, 0.13);
  heartShape.bezierCurveTo(0.1, 0.12, 0.09, 0.02, 0, -0.06);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.03, bevelEnabled: false });
  heartGeo.center();
  const heartMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
  const joyHearts: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const hm = new THREE.Mesh(heartGeo, heartMat);
    const a = (i / 3) * Math.PI * 2 + 0.5;
    hm.position.set(Math.cos(a) * 0.52, 0.25 + i * 0.08, Math.sin(a) * 0.52);
    happySparkleGroup.add(hm);
    joyHearts.push(hm);
  }
  headGroup.add(happySparkleGroup);

  // 3D Mechanic Wrench + Glowing Bolt Socket Ring (shown during equipment installation)
  const mechanicToolGroup = new THREE.Group();
  const wrenchPivot = new THREE.Group();
  const wrenchMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.8,
    clearcoat: 0.6
  });
  const wrenchHandleMesh = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.56, 0.07, 3, 0.025), wrenchMat);
  wrenchHandleMesh.position.set(0, 0.28, 0);
  const wrenchHeadRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.04, 12, 22, Math.PI * 1.45),
    mats.steel
  );
  wrenchHeadRing.rotation.z = 0.8;
  const boltGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 })
  );
  wrenchPivot.add(wrenchHandleMesh, wrenchHeadRing);
  mechanicToolGroup.add(wrenchPivot, boltGlowRing);
  mechanicToolGroup.visible = false;
  visual.add(mechanicToolGroup);

  // ---------------------------------------------------------
  // 6. Modular Swappable 3D Equipment Part Groups (High-Detail PBR Assemblies)
  // ---------------------------------------------------------

  // 6a. Standard Wheels (Precision Off-Road Alloy Wheels, Tread Lugs, Brake Calipers & Coil-Over Suspension)
  const wheelsGroup = new THREE.Group();
  const spinningWheels: THREE.Group[] = [];

  const wheelTireGeo = new THREE.CylinderGeometry(0.245, 0.245, 0.19, 28);
  wheelTireGeo.rotateZ(Math.PI / 2);
  const wheelSidewallGeo = new THREE.TorusGeometry(0.205, 0.04, 10, 26);
  wheelSidewallGeo.rotateY(Math.PI / 2);
  const wheelTreadLugGeo = new THREE.BoxGeometry(0.198, 0.024, 0.048);
  const wheelRimBarrelGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.202, 22);
  wheelRimBarrelGeo.rotateZ(Math.PI / 2);
  const wheelRimLipGeo = new THREE.TorusGeometry(0.152, 0.018, 10, 24);
  wheelRimLipGeo.rotateY(Math.PI / 2);
  const wheelSpokeGeo = new THREE.BoxGeometry(0.022, 0.265, 0.032);
  const wheelHubHexGeo = new THREE.CylinderGeometry(0.052, 0.058, 0.228, 6);
  wheelHubHexGeo.rotateZ(Math.PI / 2);
  const wheelLugNutGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.026, 6);
  wheelLugNutGeo.rotateZ(Math.PI / 2);
  const wheelGlowRingGeo = new THREE.TorusGeometry(0.095, 0.013, 8, 22);
  wheelGlowRingGeo.rotateY(Math.PI / 2);
  const brakeDiscGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.024, 20);
  brakeDiscGeo.rotateZ(Math.PI / 2);
  const brakeCaliperGeo = new RoundedBoxGeometry(0.056, 0.105, 0.082, 2, 0.014);
  const suspArmGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.26, 10);
  suspArmGeo.rotateZ(Math.PI / 2);
  const axleShaftGeo = new THREE.CylinderGeometry(0.024, 0.024, 1.08, 12);
  axleShaftGeo.rotateZ(Math.PI / 2);
  const diffHousingGeo = new THREE.SphereGeometry(0.068, 14, 12);
  const suspShockGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.26, 10);
  const suspSpringGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.14, 12);
  const fenderTopGeo = new RoundedBoxGeometry(0.24, 0.075, 1.02, 4, 0.03);
  const fenderLipGeo = new RoundedBoxGeometry(0.23, 0.09, 0.12, 3, 0.025);
  const fenderTrimGeo = new RoundedBoxGeometry(0.026, 0.036, 0.94, 2, 0.01);
  const markerLampGeo = new THREE.BoxGeometry(0.045, 0.028, 0.024);

  // Undercarriage chassis spine + front/rear solid drive axles & differentials (zero floating arms)
  const chassisSpine = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.18, 0.78, 3, 0.035),
    mats.machinedGunmetal
  );
  chassisSpine.position.set(0, 0.34, 0);
  const skidPlate = new THREE.Mesh(
    new RoundedBoxGeometry(0.28, 0.038, 0.84, 2, 0.012),
    mats.titaniumFrame
  );
  skidPlate.position.set(0, 0.235, 0);
  wheelsGroup.add(chassisSpine, skidPlate);

  [-0.34, 0.34].forEach((zOff) => {
    const axle = new THREE.Mesh(axleShaftGeo, mats.machinedGunmetal);
    axle.position.set(0, 0.25, zOff);
    const diff = new THREE.Mesh(diffHousingGeo, mats.titaniumFrame);
    diff.position.set(0, 0.25, zOff);
    wheelsGroup.add(axle, diff);
  });

  [-1, 1].forEach((side) => {
    // Contoured multi-piece wheel arch fender + mudguard lips + side rail + marker lamps
    const fenderTop = new THREE.Mesh(fenderTopGeo, mats.wheelPaint);
    fenderTop.position.set(side * 0.62, 0.535, 0);
    fenderTop.castShadow = !isSoftwareGl;
    wheelsGroup.add(fenderTop);

    const fenderRail = new THREE.Mesh(fenderTrimGeo, mats.machinedGunmetal);
    fenderRail.position.set(side * 0.74, 0.525, 0);
    wheelsGroup.add(fenderRail);

    const fenderChromeBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.88, 8),
      mats.chromeTrim
    );
    fenderChromeBar.rotation.x = Math.PI / 2;
    fenderChromeBar.position.set(side * 0.745, 0.555, 0);
    wheelsGroup.add(fenderChromeBar);

    [-1, 1].forEach((endDir) => {
      const mudLip = new THREE.Mesh(fenderLipGeo, mats.machinedGunmetal);
      mudLip.position.set(side * 0.62, 0.485, endDir * 0.52);
      mudLip.rotation.x = endDir * 0.48;
      wheelsGroup.add(mudLip);

      const lamp = new THREE.Mesh(markerLampGeo, endDir < 0 ? mats.eyeGlow : mats.amberGlow);
      lamp.position.set(side * 0.65, 0.535, endDir * 0.518);
      wheelsGroup.add(lamp);
    });

    [-0.34, 0.34].forEach((zOff) => {
      // Stationary suspension A-arms anchored into undercarriage spine, brass coil-over shock & red brake caliper
      const upperArm = new THREE.Mesh(suspArmGeo, mats.titaniumFrame);
      upperArm.position.set(side * 0.36, 0.33, zOff);
      upperArm.rotation.z = side * -0.22;

      const shockRod = new THREE.Mesh(suspShockGeo, mats.chromeTrim);
      shockRod.position.set(side * 0.44, 0.4, zOff);
      shockRod.rotation.z = side * 0.32;
      const shockCoil = new THREE.Mesh(suspSpringGeo, mats.brass);
      shockCoil.position.set(side * 0.44, 0.4, zOff);
      shockCoil.rotation.z = side * 0.32;

      const brakeDisc = new THREE.Mesh(brakeDiscGeo, mats.titaniumFrame);
      brakeDisc.position.set(side * 0.545, 0.25, zOff);
      const caliper = new THREE.Mesh(brakeCaliperGeo, mats.caliperRed);
      caliper.position.set(side * 0.56, 0.315, zOff + (zOff < 0 ? 0.055 : -0.055));

      wheelsGroup.add(upperArm, shockRod, shockCoil, brakeDisc, caliper);

      // Spinning rubber tire + 12 tread lugs + 5-spoke deep-dish alloy wheel
      const wPivot = new THREE.Group();
      wPivot.position.set(side * 0.62, 0.25, zOff);

      const tire = new THREE.Mesh(wheelTireGeo, mats.rubber);
      tire.castShadow = !isSoftwareGl;
      wPivot.add(tire);

      [-0.072, 0.072].forEach((sx) => {
        const sw = new THREE.Mesh(wheelSidewallGeo, mats.rubber);
        sw.position.x = sx;
        wPivot.add(sw);
      });

      // Molded radial off-road tread lugs around tire perimeter
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const lug = new THREE.Mesh(wheelTreadLugGeo, mats.rubber);
        lug.position.set(0, Math.cos(a) * 0.244, Math.sin(a) * 0.244);
        lug.rotation.x = -a;
        wPivot.add(lug);
      }

      const rimBarrel = new THREE.Mesh(wheelRimBarrelGeo, mats.machinedGunmetal);
      const rimLipOut = new THREE.Mesh(wheelRimLipGeo, mats.wheelPaint);
      rimLipOut.position.x = side * 0.095;
      const rimLipIn = new THREE.Mesh(wheelRimLipGeo, mats.titaniumFrame);
      rimLipIn.position.x = -side * 0.095;
      wPivot.add(rimBarrel, rimLipOut, rimLipIn);

      // 5-spoke alloy star & miniature hex lug nuts
      for (let s = 0; s < 5; s++) {
        const sa = (s / 5) * Math.PI;
        const spoke = new THREE.Mesh(wheelSpokeGeo, mats.chromeTrim);
        spoke.position.x = side * 0.092;
        spoke.rotation.x = sa;
        wPivot.add(spoke);

        const nutA = (s / 5) * Math.PI * 2;
        const nut = new THREE.Mesh(wheelLugNutGeo, mats.brass);
        nut.position.set(side * 0.108, Math.cos(nutA) * 0.056, Math.sin(nutA) * 0.056);
        wPivot.add(nut);
      }

      const hubCap = new THREE.Mesh(wheelHubHexGeo, mats.chromeTrim);
      const hubGlow = new THREE.Mesh(wheelGlowRingGeo, mats.eyeGlow);
      hubGlow.position.x = side * 0.106;
      wPivot.add(hubCap, hubGlow);

      wheelsGroup.add(wPivot);
      spinningWheels.push(wPivot);
    });
  });
  wheelsGroup.visible = false;
  visual.add(wheelsGroup);

  // 6b. Monster Treads (Cleated Armored Tank Tracks, Toothed Drive Sprockets, Bogies & Hydraulic Shocks)
  const treadsGroup = new THREE.Group();
  const treadShape = new THREE.Shape();
  treadShape.moveTo(-0.54, 0);
  treadShape.lineTo(0.54, 0);
  treadShape.lineTo(0.24, 0.45);
  treadShape.lineTo(-0.24, 0.45);
  treadShape.closePath();
  const treadGeo = new THREE.ExtrudeGeometry(treadShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.045,
    bevelSegments: 3
  });
  treadGeo.center();

  const cleatGeo = new THREE.BoxGeometry(0.275, 0.028, 0.058);
  const sprocketBodyGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.285, 16);
  sprocketBodyGeo.rotateZ(Math.PI / 2);
  const sprocketRimGeo = new THREE.TorusGeometry(0.122, 0.018, 8, 18);
  sprocketRimGeo.rotateY(Math.PI / 2);
  const sprocketToothGeo = new THREE.BoxGeometry(0.295, 0.036, 0.034);
  const sprocketBoltGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.325, 6);
  sprocketBoltGeo.rotateZ(Math.PI / 2);
  const bogieWheelGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.28, 14);
  bogieWheelGeo.rotateZ(Math.PI / 2);
  const armorSkirtGeo = new RoundedBoxGeometry(0.068, 0.165, 0.82, 4, 0.024);
  const armorRecessGeo = new RoundedBoxGeometry(0.024, 0.055, 0.56, 2, 0.01);
  const armorBoltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.028, 6);
  armorBoltGeo.rotateZ(Math.PI / 2);
  const trackBumperGeo = new RoundedBoxGeometry(0.28, 0.055, 0.16, 3, 0.018);
  const trackRailGeo = new RoundedBoxGeometry(0.25, 0.045, 0.56, 3, 0.015);
  const hydOuterGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.24, 10);
  const hydRodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 10);

  // Perimeter track grouser cleat positions & tilt angles around the trapezoidal belt
  const cleatSamples: Array<[number, number, number]> = [
    // Bottom ground-contact span
    [0.018, -0.44, 0],
    [0.018, -0.26, 0],
    [0.018, -0.09, 0],
    [0.018, 0.09, 0],
    [0.018, 0.26, 0],
    [0.018, 0.44, 0],
    // Front ramp (-Z)
    [0.14, -0.51, 0.98],
    [0.30, -0.41, 0.98],
    [0.44, -0.31, 0.98],
    // Top crest
    [0.525, -0.15, 0],
    [0.525, 0.0, 0],
    [0.525, 0.15, 0],
    // Rear ramp (+Z)
    [0.44, 0.31, -0.98],
    [0.30, 0.41, -0.98],
    [0.14, 0.51, -0.98]
  ];

  const treadSprockets: THREE.Object3D[] = [];
  [-1, 1].forEach((side) => {
    const tx = side * 0.65;
    const tm = new THREE.Mesh(treadGeo, mats.rubber);
    tm.rotation.y = Math.PI / 2;
    tm.position.set(tx, 0.27, 0);
    tm.castShadow = !isSoftwareGl;
    treadsGroup.add(tm);

    // Molded perimeter rubber grouser cleats
    cleatSamples.forEach(([cy, cz, rx]) => {
      const cleat = new THREE.Mesh(cleatGeo, mats.machinedGunmetal);
      cleat.position.set(tx, cy, cz);
      cleat.rotation.x = rx;
      treadsGroup.add(cleat);
    });

    // Top armored track rail + angled front/rear heavy mudguard bumpers
    const topRail = new THREE.Mesh(trackRailGeo, mats.titaniumFrame);
    topRail.position.set(tx, 0.565, 0);
    treadsGroup.add(topRail);

    [-1, 1].forEach((endDir) => {
      const bumper = new THREE.Mesh(trackBumperGeo, mats.machinedGunmetal);
      bumper.position.set(tx, 0.45, endDir * 0.39);
      bumper.rotation.x = endDir * 0.72;
      treadsGroup.add(bumper);
    });

    // Armored side skirt guard positioned above lower bogies so toothed sprockets shine cleanly
    const guard = new THREE.Mesh(armorSkirtGeo, mats.treadPaint);
    guard.position.set(side * 0.805, 0.315, 0);
    guard.castShadow = !isSoftwareGl;
    const guardRecess = new THREE.Mesh(armorRecessGeo, mats.machinedGunmetal);
    guardRecess.position.set(side * 0.835, 0.315, 0);
    treadsGroup.add(guard, guardRecess);

    [-0.31, -0.11, 0.11, 0.31].forEach((bz) => {
      const bolt = new THREE.Mesh(armorBoltGeo, mats.brass);
      bolt.position.set(side * 0.844, 0.368, bz);
      treadsGroup.add(bolt);
    });

    // Dual diagonal hydraulic chassis-to-track shock struts
    [-0.22, 0.22].forEach((sz) => {
      const hydOuter = new THREE.Mesh(hydOuterGeo, mats.machinedGunmetal);
      hydOuter.position.set(side * 0.48, 0.42, sz);
      hydOuter.rotation.z = side * 0.45;
      const hydRod = new THREE.Mesh(hydRodGeo, mats.chromeTrim);
      hydRod.position.set(side * 0.51, 0.35, sz);
      hydRod.rotation.z = side * 0.45;
      treadsGroup.add(hydOuter, hydRod);
    });

    // 3 toothed main drive sprockets (high-drive + front/rear idlers)
    [
      [0.145, -0.37],
      [0.145, 0.37],
      [0.375, 0]
    ].forEach(([hy, hz]) => {
      const spGroup = new THREE.Group();
      spGroup.position.set(tx, hy, hz);
      const body = new THREE.Mesh(sprocketBodyGeo, mats.treadPaint);
      const rim = new THREE.Mesh(sprocketRimGeo, mats.machinedGunmetal);
      rim.position.x = side * 0.142;
      const cap = new THREE.Mesh(sprocketBoltGeo, mats.brass);
      spGroup.add(body, rim, cap);

      for (let t = 0; t < 8; t++) {
        const ta = (t / 8) * Math.PI * 2;
        const tooth = new THREE.Mesh(sprocketToothGeo, mats.machinedGunmetal);
        tooth.position.set(0, Math.cos(ta) * 0.142, Math.sin(ta) * 0.142);
        tooth.rotation.x = -ta;
        spGroup.add(tooth);
      }
      treadsGroup.add(spGroup);
      treadSprockets.push(spGroup);
    });

    // 2 lower bogie road rollers
    [-0.13, 0.13].forEach((rz) => {
      const bogie = new THREE.Mesh(bogieWheelGeo, mats.machinedGunmetal);
      bogie.position.set(tx, 0.115, rz);
      const bogieHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.305, 8).rotateZ(Math.PI / 2),
        mats.chromeTrim
      );
      bogie.add(bogieHub);
      treadsGroup.add(bogie);
      treadSprockets.push(bogie);
    });
  });
  treadsGroup.visible = false;
  visual.add(treadsGroup);

  // 6c. Jump Thrusters (Twin Pressurized Rocket Canisters, Copper Manifold & Lathe Bell Nozzles)
  const thrustersGroup = new THREE.Group();
  thrustersGroup.position.set(0, 0.82, 0.54);
  const thrusterFlames: THREE.Object3D[] = [];

  // Contoured LatheGeometry rocket bell nozzle
  const bellProfile = [
    new THREE.Vector2(0.055, 0.12),
    new THREE.Vector2(0.052, 0.06),
    new THREE.Vector2(0.088, 0.0),
    new THREE.Vector2(0.122, -0.075),
    new THREE.Vector2(0.132, -0.125),
    new THREE.Vector2(0.116, -0.125),
    new THREE.Vector2(0.095, -0.05),
    new THREE.Vector2(0.044, 0.08)
  ];
  const thrusterNozzleGeo = new THREE.LatheGeometry(bellProfile, 24);
  const tankBandGeo = new THREE.TorusGeometry(0.138, 0.014, 10, 24);
  tankBandGeo.rotateX(Math.PI / 2);
  const valveDomeGeo = new THREE.CylinderGeometry(0.046, 0.062, 0.065, 14);
  const valveCapGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.022, 6);
  const copperPipeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10);
  copperPipeGeo.rotateZ(Math.PI / 2);

  // Central machined dorsal saddle & glowing pressure manifold core
  const dorsalSaddle = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.42, 0.16, 3, 0.03),
    mats.machinedGunmetal
  );
  dorsalSaddle.position.set(0, 0.02, -0.08);
  const manifoldCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.12, 16),
    mats.titaniumFrame
  );
  manifoldCore.rotation.x = Math.PI / 2;
  manifoldCore.position.set(0, 0.05, 0.02);
  const manifoldGauge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.02, 16),
    mats.eyeGlow
  );
  manifoldGauge.rotation.x = Math.PI / 2;
  manifoldGauge.position.set(0, 0.05, 0.082);
  const manifoldCrossPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.46, 12),
    mats.brushedCopper
  );
  manifoldCrossPipe.rotation.z = Math.PI / 2;
  manifoldCrossPipe.position.set(0, 0.16, 0.0);
  const lowerCrossBrace = new THREE.Mesh(
    new RoundedBoxGeometry(0.44, 0.055, 0.09, 2, 0.015),
    mats.machinedGunmetal
  );
  lowerCrossBrace.position.set(0, -0.15, -0.04);
  thrustersGroup.add(dorsalSaddle, manifoldCore, manifoldGauge, manifoldCrossPipe, lowerCrossBrace);

  [-0.23, 0.23].forEach((tx) => {
    const sideSign = tx < 0 ? -1 : 1;
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.34, 10, 22), mats.tankRed);
    tank.position.set(tx, 0.03, 0.02);
    tank.castShadow = !isSoftwareGl;

    // Brushed chrome reinforcement straps + top brass pressure relief valve
    const bandTop = new THREE.Mesh(tankBandGeo, mats.chromeTrim);
    bandTop.position.set(tx, 0.15, 0.02);
    const bandBot = new THREE.Mesh(tankBandGeo, mats.chromeTrim);
    bandBot.position.set(tx, -0.11, 0.02);

    const valve = new THREE.Mesh(valveDomeGeo, mats.brass);
    valve.position.set(tx, 0.34, 0.02);
    const valveCap = new THREE.Mesh(valveCapGeo, mats.chromeTrim);
    valveCap.position.set(tx, 0.38, 0.02);

    // Side copper feed line & rear gauge housing
    const feedPipe = new THREE.Mesh(copperPipeGeo, mats.brushedCopper);
    feedPipe.position.set(tx - sideSign * 0.12, -0.04, 0.02);

    const gaugePod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.032, 16).rotateX(Math.PI / 2),
      mats.darkFrame
    );
    gaugePod.position.set(tx, 0.04, 0.152);
    const gaugeMeter = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.01), mats.amberGlow);
    gaugeMeter.position.set(tx, 0.04, 0.168);

    // Contoured LatheGeometry bell nozzle + brass throat ring + dark exhaust chamber
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(tx, -0.31, 0.045);
    nozzleGroup.rotation.x = 0.2;
    const nozzleBell = new THREE.Mesh(thrusterNozzleGeo, mats.machinedGunmetal);
    const throatRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.016, 8, 20).rotateX(Math.PI / 2),
      mats.brass
    );
    throatRing.position.y = 0.065;
    const nozzleInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.105, 0.16, 16, 1, true),
      mats.exhaustInterior
    );
    nozzleInner.position.y = -0.035;
    const nozzleLipGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.009, 8, 22).rotateX(Math.PI / 2),
      mats.eyeGlow
    );
    nozzleLipGlow.position.y = -0.115;
    nozzleGroup.add(nozzleBell, throatRing, nozzleInner, nozzleLipGlow);

    // Dual-layer animated thrust plume (outer blue flame + hot white inner core)
    const flameGroup = new THREE.Group();
    flameGroup.position.set(tx, -0.68, 0.12);
    flameGroup.rotation.x = Math.PI * 0.92;
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.64, 16), mats.flameMat);
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.44, 12), mats.flameCoreMat);
    innerFlame.position.y = -0.08;
    flameGroup.add(outerFlame, innerFlame);
    flameGroup.visible = false;

    thrustersGroup.add(
      tank,
      bandTop,
      bandBot,
      valve,
      valveCap,
      feedPipe,
      gaugePod,
      gaugeMeter,
      nozzleGroup,
      flameGroup
    );
    thrusterFlames.push(flameGroup);
  });
  thrustersGroup.visible = false;
  visual.add(thrustersGroup);

  // 6d. Turbo Booster (Aerodynamic Delta Wings, Ram-Air Scoop, Lathe Turbine Shroud & Vectoring Nozzle)
  const boosterGroup = new THREE.Group();
  boosterGroup.position.set(0, 1.25, 0.42);

  // Dorsal mounting pylon connecting booster to torso back
  const boosterPylon = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.22, 0.24, 3, 0.025),
    mats.machinedGunmetal
  );
  boosterPylon.position.set(0, -0.1, -0.14);
  boosterGroup.add(boosterPylon);

  // Contoured LatheGeometry jet turbine cowling
  const jetCowlingProfile = [
    new THREE.Vector2(0.01, 0.28),
    new THREE.Vector2(0.115, 0.25),
    new THREE.Vector2(0.165, 0.14),
    new THREE.Vector2(0.175, -0.02),
    new THREE.Vector2(0.155, -0.2),
    new THREE.Vector2(0.13, -0.26)
  ];
  const jetNacelleGeo = new THREE.LatheGeometry(jetCowlingProfile, 26);
  const jetCore = new THREE.Mesh(jetNacelleGeo, mats.boosterPink);
  jetCore.rotation.x = -Math.PI / 2.2;
  jetCore.castShadow = !isSoftwareGl;
  boosterGroup.add(jetCore);

  // Dorsal ram-air intake scoop + chrome lip + dark intake slats
  const intakeScoop = new THREE.Mesh(
    new RoundedBoxGeometry(0.15, 0.1, 0.24, 3, 0.025),
    mats.boosterPink
  );
  intakeScoop.position.set(0, 0.165, -0.02);
  intakeScoop.rotation.x = 0.12;
  const intakeLip = new THREE.Mesh(
    new RoundedBoxGeometry(0.162, 0.105, 0.032, 2, 0.01),
    mats.chromeTrim
  );
  intakeLip.position.set(0, 0.155, -0.135);
  const intakeGrille = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.065, 0.02), mats.exhaustInterior);
  intakeGrille.position.set(0, 0.155, -0.146);
  boosterGroup.add(intakeScoop, intakeLip, intakeGrille);

  // Rear vectoring afterburner exhaust shroud + 6 radial petal flaps + turbine blades + plasma ring
  const turbineRear = new THREE.Group();
  turbineRear.position.set(0, -0.04, 0.25);
  turbineRear.rotation.x = -Math.PI / 2.2;
  const shroudRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.142, 0.112, 0.16, 20, 1, true),
    mats.machinedGunmetal
  );
  const exhaustInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.095, 0.15, 16, 1, true),
    mats.exhaustInterior
  );
  const afterburnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.104, 0.014, 10, 22).rotateX(Math.PI / 2),
    mats.eyeGlow
  );
  afterburnerRing.position.y = -0.068;
  const turbineHub = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.09, 12), mats.chromeTrim);
  turbineHub.rotation.x = Math.PI;
  turbineRear.add(shroudRing, exhaustInner, afterburnerRing, turbineHub);

  // 6 angled vectoring exhaust petals + recessed turbine fan blades
  const petalGeo = new THREE.BoxGeometry(0.052, 0.13, 0.016);
  const bladeGeo = new THREE.BoxGeometry(0.018, 0.008, 0.095);
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, mats.titaniumFrame);
    petal.position.set(Math.cos(a) * 0.125, -0.02, Math.sin(a) * 0.125);
    petal.rotation.y = -a + Math.PI / 2;
    petal.rotation.x = -0.14;
    turbineRear.add(petal);

    const blade = new THREE.Mesh(bladeGeo, mats.chromeTrim);
    blade.position.set(Math.cos(a) * 0.055, 0.015, Math.sin(a) * 0.055);
    blade.rotation.y = -a;
    blade.rotation.z = 0.35;
    turbineRear.add(blade);
  }
  boosterGroup.add(turbineRear);

  // Swept aerodynamic delta wings + chrome leading-edge trim + upturned winglets + tip beacons
  const makeSweptWingGeo = (side: number) => {
    const shape = new THREE.Shape();
    if (side > 0) {
      shape.moveTo(0, -0.14);
      shape.lineTo(0.58, -0.02);
      shape.lineTo(0.54, 0.16);
      shape.lineTo(0, 0.18);
    } else {
      shape.moveTo(0, 0.18);
      shape.lineTo(-0.54, 0.16);
      shape.lineTo(-0.58, -0.02);
      shape.lineTo(0, -0.14);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.042,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2
    });
    g.rotateX(Math.PI / 2);
    return g;
  };

  [-1, 1].forEach((side) => {
    const wingAssembly = new THREE.Group();
    wingAssembly.position.set(side * 0.12, 0.04, 0.02);
    wingAssembly.rotation.z = side * 0.2;

    const wingMesh = new THREE.Mesh(makeSweptWingGeo(side), mats.boosterPink);
    wingMesh.castShadow = !isSoftwareGl;

    // Brushed chrome leading-edge aero trim
    const leadingEdge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.011, 0.57, 8),
      mats.chromeTrim
    );
    leadingEdge.rotation.z = Math.PI / 2;
    leadingEdge.rotation.y = side * -0.2;
    leadingEdge.position.set(side * 0.29, -0.018, -0.08);

    // Upturned aero winglet + glowing navigation tip beacon
    const winglet = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, 0.18, 0.19, 2, 0.012),
      mats.machinedGunmetal
    );
    winglet.position.set(side * 0.56, 0.06, 0.06);
    winglet.rotation.z = side * -0.32;

    const tipBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), mats.eyeGlow);
    tipBeacon.position.set(side * 0.59, 0.145, 0.05);

    // Side heat-dissipation vent louver on fuselage flank
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.065, 0.16), mats.machinedGunmetal);
    vent.position.set(side * 0.055, -0.03, 0.03);

    wingAssembly.add(wingMesh, leadingEdge, winglet, tipBeacon, vent);
    boosterGroup.add(wingAssembly);
  });

  // Dual-layer animated afterburner plasma exhaust
  const boostFlame = new THREE.Group();
  boostFlame.rotation.x = Math.PI / 2.2;
  boostFlame.position.set(0, -0.1, 0.68);
  const boostOuter = new THREE.Mesh(new THREE.ConeGeometry(0.175, 0.88, 16), mats.boostOuterMat);
  const boostInner = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.62, 12), mats.boostCoreMat);
  boostInner.position.y = -0.1;
  boostFlame.add(boostOuter, boostInner);
  boostFlame.visible = false;
  boosterGroup.add(boostFlame);
  boosterGroup.visible = false;
  visual.add(boosterGroup);

  // 6e. Front Laser Emitter (Hex Collar, Cooling Fins, Copper Conduit, Sight, Crystal & Glass Dome)
  const laserGroup = new THREE.Group();
  laserGroup.position.set(0, 0.78, -0.49);

  // Hexagonal machined turret mounting flange + 6 chrome bolts
  const turretFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.08, 6),
    mats.machinedGunmetal
  );
  turretFlange.rotation.x = Math.PI / 2;
  laserGroup.add(turretFlange);

  const flangeBoltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.03, 6);
  flangeBoltGeo.rotateX(Math.PI / 2);
  for (let b = 0; b < 6; b++) {
    const ba = (b / 6) * Math.PI * 2 + Math.PI / 6;
    const fBolt = new THREE.Mesh(flangeBoltGeo, mats.chromeTrim);
    fBolt.position.set(Math.cos(ba) * 0.145, Math.sin(ba) * 0.145, -0.042);
    laserGroup.add(fBolt);
  }

  // Painted armored emitter shroud + machined gunmetal barrel core
  const turretHousing = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.21, 0.19, 4, 0.045),
    mats.laserPaint
  );
  turretHousing.position.z = -0.11;
  turretHousing.castShadow = !isSoftwareGl;

  const innerBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.082, 0.34, 20),
    mats.machinedGunmetal
  );
  innerBarrel.rotation.x = Math.PI / 2;
  innerBarrel.position.z = -0.22;
  laserGroup.add(turretHousing, innerBarrel);

  // 4 precision radial cooling heat-sink fin rings along barrel
  const finRingGeo = new THREE.CylinderGeometry(0.102, 0.102, 0.016, 20);
  finRingGeo.rotateX(Math.PI / 2);
  [-0.21, -0.255, -0.3, -0.345].forEach((fz, idx) => {
    const fin = new THREE.Mesh(finRingGeo, idx % 2 === 0 ? mats.titaniumFrame : mats.chromeTrim);
    fin.position.z = fz;
    laserGroup.add(fin);
  });

  // Twin side stabilizer guide rails
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(
      new RoundedBoxGeometry(0.026, 0.034, 0.28, 2, 0.008),
      mats.laserPaint
    );
    rail.position.set(side * 0.105, 0, -0.24);
    laserGroup.add(rail);
  });

  // Top micro optical rangefinder sight
  const sightBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.064, 0.056, 0.14, 2, 0.015),
    mats.darkFrame
  );
  sightBody.position.set(0, 0.125, -0.15);
  const sightLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12).rotateX(Math.PI / 2),
    mats.amberGlow
  );
  sightLens.position.set(0, 0.125, -0.222);
  laserGroup.add(sightBody, sightLens);

  // Side curved brushed copper power conduit
  const conduitTube = new THREE.Mesh(
    new THREE.TorusGeometry(0.095, 0.015, 8, 18, Math.PI * 0.85),
    mats.brushedCopper
  );
  conduitTube.rotation.y = Math.PI / 2;
  conduitTube.position.set(0.115, -0.055, -0.11);
  laserGroup.add(conduitTube);

  // Multi-layered optical muzzle: chrome bezel, glowing faceted crystal & glass condenser dome
  const muzzleBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.082, 0.016, 10, 24),
    mats.chromeTrim
  );
  muzzleBezel.position.z = -0.382;
  const crystalTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 1), mats.laserCrystal);
  crystalTip.position.z = -0.385;
  const condenserDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.088, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    mats.glassLens
  );
  condenserDome.rotation.x = -Math.PI / 2;
  condenserDome.position.z = -0.365;
  laserGroup.add(muzzleBezel, crystalTip, condenserDome);
  laserGroup.visible = false;
  visual.add(laserGroup);

  const scanConeMesh = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 22, 1, true), mats.scanCone);
  scanConeMesh.rotation.x = Math.PI / 2;
  scanConeMesh.position.set(0, 0.95, -2.1);
  visual.add(scanConeMesh);

  // 6f. Magnet Coils (Twin Copper-Wound Industrial Electromagnet Pods + Polarity Pole Shoes, Zero Clipping)
  const magnetGroup = new THREE.Group();
  const coilHousingGeo = new RoundedBoxGeometry(0.155, 0.16, 0.34, 4, 0.035);
  const coilCoreGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.3, 16);
  coilCoreGeo.rotateX(Math.PI / 2);
  const copperWindingGeo = new THREE.TorusGeometry(0.064, 0.014, 10, 20);
  const poleShoeGeo = new RoundedBoxGeometry(0.092, 0.092, 0.085, 3, 0.02);
  const polarityRingGeo = new THREE.BoxGeometry(0.098, 0.098, 0.022);
  const magClampGeo = new RoundedBoxGeometry(0.12, 0.075, 0.2, 2, 0.015);
  const magCapacitorGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.24, 12);
  magCapacitorGeo.rotateX(Math.PI / 2);

  [-1, 1].forEach((side) => {
    // Positioned cleanly on front-lower torso flanks (clears wheels/treads below and arms above!)
    const pod = new THREE.Group();
    pod.position.set(side * 0.48, 0.58, -0.22);
    pod.rotation.y = side * -0.12;

    const clamp = new THREE.Mesh(magClampGeo, mats.machinedGunmetal);
    clamp.position.set(-side * 0.07, 0.0, 0.04);

    const housing = new THREE.Mesh(coilHousingGeo, mats.magCoil);
    housing.position.set(0, 0, 0.02);
    housing.castShadow = !isSoftwareGl;

    const ironCore = new THREE.Mesh(coilCoreGeo, mats.machinedGunmetal);
    ironCore.position.set(0, 0, -0.14);

    // 5 tightly wound brushed copper induction coil rings
    for (let w = 0; w < 5; w++) {
      const winding = new THREE.Mesh(copperWindingGeo, mats.brushedCopper);
      winding.position.set(0, 0, -0.06 - w * 0.036);
      pod.add(winding);
    }

    // Glowing inductive energy capacitor strip along outer flank
    const capTube = new THREE.Mesh(magCapacitorGeo, mats.magnetCoreGlow);
    capTube.position.set(side * 0.078, 0.015, -0.02);

    // Chamfered chrome magnetic pole shoe + N/S polarity band (Red on left, Cyan on right)
    const poleShoe = new THREE.Mesh(poleShoeGeo, mats.chromeTrim);
    poleShoe.position.set(0, 0, -0.28);
    const polarityBand = new THREE.Mesh(
      polarityRingGeo,
      side < 0 ? mats.caliperRed : mats.eyeGlow
    );
    polarityBand.position.set(0, 0, -0.245);

    pod.add(clamp, housing, ironCore, capTube, poleShoe, polarityBand);
    magnetGroup.add(pod);
  });

  // Under-chin inductive flux bridge connecting both magnet pods cleanly in front of lower torso
  const fluxBridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.88, 12).rotateZ(Math.PI / 2),
    mats.brushedCopper
  );
  fluxBridge.position.set(0, 0.49, -0.36);
  const fluxCenterNode = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.075, 0.085, 3, 0.02),
    mats.machinedGunmetal
  );
  fluxCenterNode.position.set(0, 0.49, -0.37);
  const fluxCenterGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.02), mats.magnetCoreGlow);
  fluxCenterGlow.position.set(0, 0.49, -0.415);
  magnetGroup.add(fluxBridge, fluxCenterNode, fluxCenterGlow);

  magnetGroup.visible = false;
  visual.add(magnetGroup);

  // 6g. Hover Ghost Preview Ring
  const ghostGroup = new THREE.Group();
  const ghostRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 12, 28),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85 })
  );
  ghostGroup.add(ghostRing);
  ghostGroup.visible = false;
  visual.add(ghostGroup);

  // Energy Shield Bubble
  const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.26, 26, 20), mats.shield);
  shieldMesh.position.set(0, 0.92, 0);
  shieldMesh.visible = false;
  visual.add(shieldMesh);

  // Soft Radial Contact Shadow
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({
      map: tex.shadowBlob,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  const partGroups: Record<PartId, THREE.Group> = {
    wheels: wheelsGroup,
    treads: treadsGroup,
    thrusters: thrustersGroup,
    booster: boosterGroup,
    laser: laserGroup,
    magnet: magnetGroup
  };
  (Object.keys(partGroups) as PartId[]).forEach((pid) => {
    partGroups[pid].userData.touchZone = pid as RobotTouchZone;
    partGroups[pid].userData.paintPart = pid as PaintPartKey;
  });

  const paintMatMap: Record<PaintPartKey, THREE.MeshPhysicalMaterial> = {
    chassis: mats.body,
    head: mats.headShell,
    arms: mats.armPaint,
    wheels: mats.wheelPaint,
    treads: mats.treadPaint,
    thrusters: mats.tankRed,
    booster: mats.boosterPink,
    laser: mats.laserPaint,
    magnet: mats.magCoil
  };

  let activeCharacter: BotCharacterId = 'sparkbot';
  let currentEyeXSpan = 0.24;

  const popScales: Record<PartId, number> = {
    wheels: 1,
    treads: 1,
    thrusters: 1,
    booster: 1,
    laser: 1,
    magnet: 1
  };
  const prevVisible: Record<PartId, boolean> = {
    wheels: false,
    treads: false,
    thrusters: false,
    booster: false,
    laser: false,
    magnet: false
  };

  function triggerPartPop(part: PartId) {
    popScales[part] = 0.18;
  }

  function setTheme(theme: BotThemeId) {
    const def = BOT_THEMES[normalizeBotTheme(theme)];
    mats.body.color.setHex(def.bodyHex);
    mats.accent.color.setHex(def.collarHex);
  }

  function applyPaintConfig(config: PaintBoothConfig) {
    (Object.keys(paintMatMap) as PaintPartKey[]).forEach((key) => {
      const spec = config.parts[key];
      if (!spec) return;
      const mat = paintMatMap[key];
      mat.color.set(spec.color);
      const nextMap = tex.decals[spec.decal] || tex.chassisPanel;
      if (mat.map !== nextMap) {
        mat.map = nextMap;
        mat.needsUpdate = true;
      }
      if (key === 'magnet') {
        mat.emissive.set(spec.color);
      }
    });
  }

  function setCharacter(charId: BotCharacterId) {
    const norm = normalizeBotCharacter(charId);
    activeCharacter = norm;
    const isVisor = norm === 'sprout' || norm === 'nova' || norm === 'robobuddy';
    const isLearn = norm === 'learnbot';

    podsGroup.visible = !isVisor;
    visorHelmetGroup.visible = isVisor;
    gogglesGroup.visible = norm === 'sprout' || norm === 'nova';
    sproutExtrasGroup.visible = norm === 'sprout';
    novaHeadGroup.visible = norm === 'nova';
    novaWingsGroup.visible = norm === 'nova';
    roboBuddyHatGroup.visible = norm === 'robobuddy';
    roboBuddyBodyGroup.visible = norm === 'robobuddy';
    backpackGroup.visible = norm === 'sprout' || norm === 'robobuddy';
    learnBotHeadGroup.visible = isLearn;
    learnBotBodyGroup.visible = isLearn;
    sparkBotChestGroup.visible = norm === 'sparkbot';

    antennaStem.visible = norm === 'sparkbot' || norm === 'sprout' || norm === 'learnbot';
    antennaBulb.visible = norm === 'sparkbot' || norm === 'sprout';
    antennaStem.position.set(norm === 'sprout' ? -0.36 : 0, norm === 'sprout' ? 0.5 : 0.46, 0.02);
    antennaStem.rotation.z = norm === 'sprout' ? 0.34 : 0;
    antennaBulb.position.set(norm === 'sprout' ? -0.43 : 0, norm === 'sprout' ? 0.64 : 0.62, 0.02);

    // Oversized binocular eyes for LearnBot matching its adorable reference art
    podsGroup.scale.setScalar(isLearn ? 1.22 : 1.0);

    // Clean non-Z-fighting front Z clearance for eyes, cheeks, and mouth
    const eyeZ = isVisor ? -0.442 : isLearn ? -0.305 : -0.258;
    const eyeXSpan = isVisor ? 0.195 : isLearn ? 0.29 : 0.24;
    const eyeScale = isLearn ? 1.38 : isVisor ? 0.92 : 1.0;
    currentEyeXSpan = eyeXSpan;

    eyeGroups.forEach((eg, idx) => {
      const s = idx === 0 ? -1 : 1;
      eg.position.set(s * eyeXSpan, 0.055, eyeZ);
      eg.scale.setScalar(eyeScale);
      happyArcs[idx].position.set(s * eyeXSpan, 0.04, eyeZ - 0.012);
      happyArcs[idx].scale.setScalar(isLearn ? 1.15 : 0.96);
      tears[idx].position.set(s * eyeXSpan, -0.09, eyeZ - 0.02);
      cheekBlushes[idx].visible = isVisor;
      cheekBlushes[idx].position.set(s * 0.275, -0.065, eyeZ - 0.002);
    });

    // Cute smiling mouth visible on Sprout, RoboBuddy, and LearnBot (Nova has a 3D golden beak!)
    cuteMouthMesh.visible = norm === 'sprout' || norm === 'robobuddy' || isLearn;
    cuteMouthMesh.position.set(0, isLearn ? -0.075 : -0.055, eyeZ - 0.004);
    cuteMouthMesh.scale.setScalar(isLearn ? 0.85 : 1.0);

    const def = BOT_CHARACTERS[norm];
    mats.accent.color.set(def.defaultAccentHex);
  }

  function applyChassis(
    chassis: ChassisGrid,
    hoverSlot?: { r: number; c: number; valid: boolean; part: PartId } | null
  ) {
    const info = computeChassisInfo(chassis);
    bootsGroup.visible = !info.hasDrive;
    const activeMap: Record<PartId, boolean> = {
      wheels: info.hasWheels && !info.hasTreads,
      treads: info.hasTreads,
      thrusters: info.hasThrusters,
      booster: info.hasBooster,
      laser: info.hasLaserAny,
      magnet: info.hasMagnet
    };

    (Object.keys(partGroups) as PartId[]).forEach((pid) => {
      const vis = activeMap[pid];
      partGroups[pid].visible = vis;
      if (vis && !prevVisible[pid]) {
        popScales[pid] = 0.25;
      }
      prevVisible[pid] = vis;
    });

    if (hoverSlot) {
      const off = CHASSIS_SLOT_OFFSETS[`${hoverSlot.r},${hoverSlot.c}`] || [0, 0.85, 0];
      ghostGroup.position.set(off[0], off[1], off[2]);
      (ghostRing.material as THREE.MeshBasicMaterial).color.setHex(hoverSlot.valid ? 0x34d399 : 0xfb7185);
      ghostGroup.visible = true;
    } else {
      ghostGroup.visible = false;
    }
  }

  // Smooth spring state
  let squashY = 1;
  let droopY = 0;
  let headPitch = 0;
  let headYaw = 0;
  let headRoll = 0;
  let celebrateSpin = 0;
  let wheelAngle = 0;
  let tearPhase = 0;
  let blinkTimer = 3.2;

  function update(p: RobotAnimParams) {
    const dt = Math.min(p.dt, 0.05);

    // Elastic overshoot pop spring on newly installed parts
    (Object.keys(partGroups) as PartId[]).forEach((pid) => {
      if (partGroups[pid].visible) {
        const target = popScales[pid] < 0.92 ? 1.14 : 1;
        popScales[pid] = THREE.MathUtils.damp(popScales[pid], target, 12, dt);
        if (Math.abs(popScales[pid] - 1) < 0.015) popScales[pid] = 1;
        partGroups[pid].scale.setScalar(popScales[pid]);
      }
    });

    if (ghostGroup.visible) {
      const pulse = 1 + Math.sin(p.time * 7) * 0.1;
      ghostGroup.scale.setScalar(pulse);
      ghostGroup.lookAt(
        ghostGroup.position.x,
        ghostGroup.position.y + 0.4,
        ghostGroup.position.z - 4
      );
    }

    // Mechanic 3D Wrench & Socket Bolt Ring Animation
    const isInstalling = p.buildTimer > 0 && p.buildTargetSlot !== null;
    mechanicToolGroup.visible = isInstalling;
    if (isInstalling && p.buildTargetSlot) {
      const off = CHASSIS_SLOT_OFFSETS[`${p.buildTargetSlot[0]},${p.buildTargetSlot[1]}`] || [0, 0.85, -0.5];
      const outDirZ = off[2] >= 0 ? 0.32 : -0.32;
      const outDirX = off[0] < -0.2 ? -0.22 : 0.28;
      mechanicToolGroup.position.set(off[0] + outDirX, off[1] + 0.06, off[2] + outDirZ);
      mechanicToolGroup.rotation.y = off[2] >= 0 ? 0 : Math.PI;
      wrenchPivot.rotation.z = Math.sin(p.time * 22) * 0.85 - 0.35;
      boltGlowRing.scale.setScalar(0.85 + Math.sin(p.time * 26) * 0.22);
      boltGlowRing.rotation.z = p.time * 5.5;
    }

    // Organic mood-driven kinematics
    const isCelebrating = p.celebrateTimer > 0;
    const isTouched = p.touchTimer > 0;
    const fbTier = p.codeFeedbackTier ?? null;
    const fbTimer = p.codeFeedbackTimer ?? 0;
    const fbDur = Math.max(0.1, p.codeFeedbackDuration ?? 1);
    const isCodeFeedback = Boolean(fbTier && fbTimer > 0);
    const fbProgress = isCodeFeedback ? THREE.MathUtils.clamp(1 - fbTimer / fbDur, 0, 1) : 0;

    let targetSquash = 1;
    let targetDroop = 0;
    let targetHeadPitch = -p.lookY * 0.18 + Math.sin(p.time * 1.6) * 0.035;
    let targetHeadYaw = p.lookX * 0.32 + Math.sin(p.time * 1.1) * 0.06;
    let targetHeadRoll = Math.sin(p.time * 1.4) * 0.03;
    let targetSpinY = 0;
    let antennaHex = 0xfde047;
    let eyeHex = 0x38bdf8;
    let showHappy = false;
    let showSad = false;
    let showConfused = false;

    if (isInstalling || p.mood === 'build') {
      targetHeadPitch = 0.22;
      targetHeadYaw = Math.sin(p.time * 9) * 0.15;
      targetSquash = 1 + Math.sin(p.time * 18) * 0.035;
      targetDroop = Math.abs(Math.sin(p.time * 10)) * 0.04;
      antennaHex = 0xfbbf24;
      eyeHex = 0xfde047;
    } else if (isCelebrating) {
      showHappy = true;
      const hop = Math.abs(Math.sin(p.time * 8.5));
      targetDroop = hop * 0.36;
      targetSquash = 1 + (hop - 0.45) * 0.14;
      targetHeadPitch = -0.18;
      targetHeadYaw = Math.sin(p.time * 6) * 0.26;
      targetHeadRoll = Math.sin(p.time * 7) * 0.12;
      const spinProgress = THREE.MathUtils.clamp((1.75 - p.celebrateTimer) / 0.85, 0, 1);
      const easedSpin = 1 - Math.pow(1 - spinProgress, 3);
      targetSpinY = easedSpin * Math.PI * 2;
      antennaHex = 0xfde047;
      eyeHex = 0x38bdf8;
    } else if (isTouched) {
      showHappy = true;
      const bounce = Math.abs(Math.sin(p.time * 9.5));
      targetDroop = bounce * 0.22;
      targetSquash = 1 + Math.sin(p.time * 14) * 0.08;
      targetHeadPitch = -0.14;
      targetHeadRoll = Math.sin(p.time * 10) * 0.18;
      targetHeadYaw = Math.cos(p.time * 7) * 0.2;
      targetSpinY = Math.sin(p.time * 8) * 0.18;
      antennaHex = 0xf472b6;
      eyeHex = 0x38bdf8;
    } else if (isCodeFeedback && fbTier === 'nested') {
      // Eureka Master-Logic: joyful double-hop + smooth 360° pirouette
      showHappy = true;
      const doubleHop = Math.abs(Math.sin(fbProgress * Math.PI * 2));
      targetDroop = doubleHop * 0.38;
      targetSquash = 1 + (doubleHop - 0.45) * 0.15;
      targetHeadPitch = -0.2;
      targetHeadYaw = Math.sin(fbProgress * Math.PI * 4) * 0.24;
      targetHeadRoll = Math.sin(fbProgress * Math.PI * 3) * 0.14;
      const easedSpin = 1 - Math.pow(1 - Math.min(1, fbProgress * 1.25), 3);
      targetSpinY = easedSpin * Math.PI * 2;
      antennaHex = 0x34d399;
      eyeHex = 0x34d399;
    } else if (isCodeFeedback && fbTier === 'loop') {
      // Iterative Loop Twirl: smooth rhythmic 360° turn + double bounce
      showHappy = true;
      const pulse = Math.abs(Math.sin(fbProgress * Math.PI * 2));
      targetDroop = pulse * 0.22;
      targetSquash = 1 + Math.sin(fbProgress * Math.PI * 4) * 0.08;
      targetHeadPitch = -0.12;
      targetHeadRoll = Math.sin(fbProgress * Math.PI * 2) * 0.14;
      const easeInOut =
        fbProgress < 0.5
          ? 4 * fbProgress * fbProgress * fbProgress
          : 1 - Math.pow(-2 * fbProgress + 2, 3) / 2;
      targetSpinY = easeInOut * Math.PI * 2;
      antennaHex = 0xfbbf24;
      eyeHex = 0xfde047;
    } else if (isCodeFeedback && fbTier === 'conditional') {
      // Detective Sensor Sweep: uses 'scan' mood with curious head tilt & wide visor scan
      targetDroop = Math.sin(fbProgress * Math.PI) * 0.06;
      targetSquash = 1 + Math.sin(fbProgress * Math.PI * 2) * 0.03;
      targetHeadPitch = 0.16;
      targetHeadYaw = Math.sin(fbProgress * Math.PI * 3) * 0.44;
      targetHeadRoll = Math.cos(fbProgress * Math.PI * 2) * 0.2;
      antennaHex = 0xa78bfa;
      eyeHex = 0x22d3ee;
    } else if (isCodeFeedback && fbTier === 'dynamic') {
      // Dynamic Power-Up (JUMP / BOOST): anticipatory crouch then springy launch pop
      showHappy = p.mood === 'happy';
      const crouch = fbProgress < 0.28 ? -(fbProgress / 0.28) * 0.14 : 0;
      const launch = fbProgress >= 0.28 ? Math.sin(((fbProgress - 0.28) / 0.72) * Math.PI) * 0.28 : 0;
      targetDroop = crouch + launch;
      targetSquash = fbProgress < 0.28 ? 0.88 : 1 + launch * 0.36;
      targetHeadPitch = fbProgress < 0.28 ? 0.12 : -0.18;
      targetHeadYaw = Math.sin(fbProgress * Math.PI * 2) * 0.15;
      antennaHex = p.mood === 'boost' ? 0xf472b6 : 0xfb923c;
      eyeHex = p.mood === 'boost' ? 0xf472b6 : 0x38bdf8;
    } else if (isCodeFeedback && fbTier === 'simple') {
      // Simple Motion (MOVE): snappy cheerful double-nod + eager mini-hop
      showHappy = true;
      const miniHop = Math.sin(fbProgress * Math.PI);
      targetDroop = miniHop * 0.15;
      targetSquash = 1 + miniHop * 0.06;
      targetHeadPitch = Math.sin(fbProgress * Math.PI * 4) * 0.16 - 0.06;
      targetHeadYaw = Math.sin(fbProgress * Math.PI * 2) * 0.12;
      antennaHex = 0x38bdf8;
      eyeHex = 0x38bdf8;
    } else if (p.mood === 'happy') {
      showHappy = true;
      const hop = Math.abs(Math.sin(p.time * 7));
      targetDroop = hop * 0.28;
      targetSquash = 1 + (hop - 0.5) * 0.1;
      targetHeadPitch = -0.15;
      targetHeadYaw = Math.sin(p.time * 3.8) * 0.22;
      antennaHex = 0x34d399;
      eyeHex = 0x38bdf8;
    } else if (p.mood === 'sad') {
      showSad = true;
      targetDroop = -0.12;
      targetSquash = 0.9;
      targetHeadPitch = 0.36;
      targetHeadYaw = Math.sin(p.time * 2) * 0.08;
      targetHeadRoll = Math.sin(p.time * 2) * 0.08;
      antennaHex = 0xfb7185;
      eyeHex = 0x60a5fa;
    } else if (p.mood === 'confused') {
      showConfused = true;
      targetHeadRoll = Math.sin(p.time * 4.8) * 0.28;
      targetHeadYaw = Math.cos(p.time * 2.4) * 0.24;
      targetHeadPitch = -0.06;
      antennaHex = 0xa78bfa;
      eyeHex = 0xc084fc;
    } else if (p.mood === 'scan') {
      targetHeadPitch = 0.2;
      targetHeadYaw = Math.sin(p.time * 12) * 0.32;
      antennaHex = 0xa78bfa;
      eyeHex = p.scanMatch === true ? 0x34d399 : 0xa78bfa;
    } else if (p.mood === 'boost' || p.turboActive) {
      targetSquash = 0.94;
      antennaHex = 0xf472b6;
    } else if (p.isAirborne) {
      targetSquash = 1.08;
    } else if (p.isMoving) {
      targetDroop = Math.abs(Math.sin(p.time * 11)) * 0.045;
    } else {
      // Gentle living breathing cadence
      const breath = Math.sin(p.time * 2.3);
      targetDroop = breath * 0.024;
      targetSquash = 1 + breath * 0.016;
    }

    squashY = THREE.MathUtils.damp(squashY, targetSquash, 10, dt);
    droopY = THREE.MathUtils.damp(droopY, targetDroop, 10, dt);
    headPitch = THREE.MathUtils.damp(headPitch, targetHeadPitch, 9, dt);
    headYaw = THREE.MathUtils.damp(headYaw, targetHeadYaw, 9, dt);
    headRoll = THREE.MathUtils.damp(headRoll, targetHeadRoll, 9, dt);
    if (isCelebrating || (isCodeFeedback && (fbTier === 'loop' || fbTier === 'nested'))) {
      celebrateSpin = THREE.MathUtils.damp(celebrateSpin, targetSpinY, 12, dt);
    } else if (isTouched) {
      celebrateSpin = THREE.MathUtils.damp(celebrateSpin, targetSpinY, 10, dt);
    } else {
      if (celebrateSpin > Math.PI) celebrateSpin -= Math.PI * 2;
      celebrateSpin = THREE.MathUtils.damp(celebrateSpin, 0, 9, dt);
    }

    visual.position.y = droopY;
    const invXZ = 1 / Math.sqrt(Math.max(0.8, squashY));
    visual.scale.set(invXZ, squashY, invXZ);
    visual.rotation.x = THREE.MathUtils.damp(visual.rotation.x, p.tiltPitch, 10, dt);
    visual.rotation.y = celebrateSpin;
    visual.rotation.z = THREE.MathUtils.damp(visual.rotation.z, p.tiltRoll, 10, dt);

    headGroup.rotation.set(headPitch, headYaw, headRoll);
    mats.antennaGlow.color.setHex(antennaHex);
    mats.antennaGlow.emissive.setHex(antennaHex);
    mats.eyeGlow.color.setHex(eyeHex);
    mats.eyeGlow.emissive.setHex(eyeHex);

    // Natural eye blinking
    blinkTimer -= dt;
    let eyeScaleY = 1;
    if (blinkTimer <= 0) {
      if (blinkTimer > -0.11) eyeScaleY = 0.1;
      else blinkTimer = 2.6 + (Math.sin(p.time * 1.7) + 1) * 1.2;
    }

    const baseEyeScale = activeCharacter === 'learnbot' ? 1.38 : activeCharacter === 'sparkbot' ? 1.0 : 0.92;
    eyeGroups.forEach((eg, idx) => {
      eg.visible = !showHappy;
      happyArcs[idx].visible = showHappy;
      if (showConfused) {
        eg.scale.set(baseEyeScale, baseEyeScale * (idx === 0 ? 0.5 : 1.08), 1);
      } else {
        eg.scale.set(baseEyeScale, baseEyeScale * eyeScaleY, 1);
      }
      eyePupilGroups[idx].position.x = -p.lookX * 0.026;
      eyePupilGroups[idx].position.y = p.lookY * 0.024;
      if (brows[idx]) {
        brows[idx].rotation.z = showSad
          ? (idx === 0 ? 0.32 : -0.32)
          : showConfused
            ? (idx === 0 ? -0.24 : 0.12)
            : showHappy
              ? (idx === 0 ? -0.16 : 0.16)
              : 0;
      }
    });

    // Cute mouth expressive bounce when talking/happy
    if (cuteMouthMesh.visible) {
      const talkOpen =
        isTouched || isCelebrating || showHappy
          ? 0.95 + Math.abs(Math.sin(p.time * 14)) * 0.45
          : 0.72 + Math.sin(p.time * 2.3) * 0.06;
      const mouthBase = activeCharacter === 'learnbot' ? 0.85 : 1.0;
      cuteMouthMesh.scale.set(mouthBase, mouthBase * talkOpen, 1);
    }

    if (showSad) {
      tearPhase = (tearPhase + dt * 1.55) % 1;
      tears.forEach((tear, idx) => {
        tear.visible = true;
        const ph = (tearPhase + idx * 0.45) % 1;
        tear.position.y = -0.07 - ph * 0.36;
        tear.scale.setScalar(0.75 + Math.sin(ph * Math.PI) * 0.32);
      });
    } else {
      tears.forEach((t) => {
        t.visible = false;
      });
    }

    confusedGroup.visible = showConfused;
    if (showConfused) {
      confusedGroup.position.y = 0.88 + Math.sin(p.time * 4.5) * 0.08;
      confusedGroup.rotation.y = Math.sin(p.time * 2.5) * 0.35;
    }

    happySparkleGroup.visible = showHappy;
    if (showHappy) {
      happySparkleGroup.rotation.y += dt * (isCelebrating ? 4.4 : 2.8);
      const showHearts = isCelebrating || isTouched;
      joyHearts.forEach((hm, idx) => {
        hm.visible = showHearts;
        if (showHearts) {
          hm.position.y = 0.24 + Math.sin(p.time * 5.5 + idx * 2.1) * 0.12;
          hm.scale.setScalar(0.95 + Math.sin(p.time * 7 + idx) * 0.18);
        }
      });
    }

    // Articulated Cute Walking/Hopping Legs when wearing Explorer Boots
    if (bootsGroup.visible) {
      legPivots.forEach((leg, idx) => {
        let legPitch = 0;
        if (p.isMoving) {
          legPitch = Math.sin(p.time * Math.max(8, p.speed * 1.05) + idx * Math.PI) * 0.52;
        } else if (isCelebrating || isTouched || showHappy) {
          legPitch = Math.sin(p.time * 10 + idx * Math.PI) * 0.26;
        } else {
          legPitch = Math.sin(p.time * 2.3 + idx * Math.PI) * 0.03;
        }
        leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, legPitch, 12, dt);
      });
    }

    // Articulated Chubby Builder & Runner Arms
    arms.forEach((arm, idx) => {
      const s = arm.side;
      let shX = 0;
      let shY = 0;
      let shZ = 0;
      let elX = 0;
      let wrZ = 0;
      let pinch = 0.042;
      let weldAlpha = 0;

      if (isInstalling || p.mood === 'build') {
        const tOff = p.buildTargetSlot
          ? CHASSIS_SLOT_OFFSETS[`${p.buildTargetSlot[0]},${p.buildTargetSlot[1]}`] || [0, 0.85, -0.5]
          : [0, 0.85, -0.5];
        const aimY = THREE.MathUtils.clamp((tOff[1] - 0.9) * 1.4, -0.7, 0.8);
        const aimZ = tOff[2] > 0.1 ? -2.0 : 0.25;
        shX = aimY + Math.sin(p.time * 20 + idx * 1.5) * 0.16;
        shY = aimZ > 0 ? -s * 0.45 : s * 0.8;
        elX = 0.45 + Math.cos(p.time * 20 + idx) * 0.2;
        wrZ = p.time * 14 * s;
        pinch = 0.02 + Math.abs(Math.sin(p.time * 18)) * 0.035;
        weldAlpha = 0.78 + Math.sin(p.time * 36) * 0.22;
      } else if (isCelebrating) {
        shX = 1.65 + Math.sin(p.time * 11 + idx * Math.PI) * 0.35;
        shZ = s * (0.45 + Math.sin(p.time * 9) * 0.12);
        elX = 0.4;
        pinch = 0.024 + Math.abs(Math.sin(p.time * 14)) * 0.036;
      } else if (isTouched) {
        // Cheerful friendly one-hand wave + cute balance pose
        shX = idx === 1 ? 1.48 + Math.sin(p.time * 12) * 0.32 : 0.35;
        shZ = s * (idx === 1 ? 0.48 : 0.22);
        elX = idx === 1 ? 0.42 : 0.25;
      } else if (isCodeFeedback && fbTier === 'nested') {
        // Triumph twin-arm overhead pump for nested compound logic
        shX = 1.72 + Math.sin(fbProgress * Math.PI * 6 + idx * Math.PI) * 0.34;
        shZ = s * (0.48 + Math.sin(fbProgress * Math.PI * 4) * 0.14);
        elX = 0.44;
        pinch = 0.022 + Math.abs(Math.sin(p.time * 14)) * 0.036;
      } else if (isCodeFeedback && fbTier === 'loop') {
        // Alternating rhythmic conductor wave during loop twirl
        shX = 1.15 + Math.sin(fbProgress * Math.PI * 6 + idx * Math.PI) * 0.55;
        shZ = s * 0.5;
        elX = 0.45;
      } else if (isCodeFeedback && fbTier === 'conditional') {
        // Curious detective-scanner pose: right arm raised to visor, left arm balanced
        if (idx === 1) {
          shX = 1.25;
          shY = -0.35;
          shZ = -0.18;
          elX = 0.95 + Math.sin(fbProgress * Math.PI * 4) * 0.12;
        } else {
          shX = 0.22;
          shZ = -0.4;
          elX = 0.42;
        }
      } else if (isCodeFeedback && fbTier === 'dynamic') {
        // Power-launch arm sweep
        shX = fbProgress < 0.28 ? -0.65 : 1.38;
        shZ = s * 0.42;
        elX = 0.36;
      } else if (isCodeFeedback && fbTier === 'simple') {
        // Quick friendly single-arm yes-pump for simple MOVE
        shX = idx === 1 ? 1.12 * Math.sin(fbProgress * Math.PI) : -0.25;
        shZ = s * (idx === 1 ? 0.36 : 0.18);
        elX = idx === 1 ? 0.48 : 0.35;
      } else if (showHappy) {
        shX = 1.4 + Math.sin(p.time * 8 + idx * 1.2) * 0.28;
        shZ = s * 0.38;
        elX = 0.35;
      } else if (showSad) {
        shX = -0.85;
        shZ = s * 0.16;
        elX = -0.2;
      } else if (showConfused) {
        if (idx === 1) {
          shX = 1.15;
          shY = -0.3;
          elX = 1.05 + Math.sin(p.time * 8) * 0.14;
          shZ = -0.22;
        } else {
          shX = 0.15;
          shZ = -0.45;
          elX = 0.4;
        }
      } else if (p.isMoving) {
        const swing = Math.sin(p.time * Math.max(8, p.speed * 0.95) + idx * Math.PI);
        shX = swing * 0.52;
        elX = 0.32 + swing * 0.16;
        shZ = s * 0.12;
      } else {
        // Natural relaxed Pixar standing arm posture with gentle breathing sway
        shX = -0.38 + Math.sin(p.time * 2.3 + idx * 0.8) * 0.05;
        shZ = s * (0.2 + Math.sin(p.time * 2.3) * 0.03);
        elX = 0.38;
      }

      arm.shoulder.rotation.x = THREE.MathUtils.damp(arm.shoulder.rotation.x, shX, 11, dt);
      arm.shoulder.rotation.y = THREE.MathUtils.damp(arm.shoulder.rotation.y, shY, 11, dt);
      arm.shoulder.rotation.z = THREE.MathUtils.damp(arm.shoulder.rotation.z, shZ, 11, dt);
      arm.elbow.rotation.x = THREE.MathUtils.damp(arm.elbow.rotation.x, elX, 11, dt);
      arm.wrist.rotation.z = wrZ;
      arm.pincerL.position.y = pinch;
      arm.pincerR.position.y = -pinch;
      (arm.weldTip.material as THREE.MeshBasicMaterial).opacity = Math.max(0, weldAlpha);
    });

    // Spin wheels & treads proportionally
    const spinFeedbackWheels = isCodeFeedback && (fbTier === 'simple' || fbTier === 'loop' || fbTier === 'nested');
    if (p.isMoving || p.speed > 0.1 || isCelebrating || spinFeedbackWheels) {
      const spinRate = isCelebrating || fbTier === 'nested' ? 8.5 : spinFeedbackWheels ? 5.5 : Math.max(4, p.speed);
      wheelAngle -= spinRate * dt * 1.15;
      spinningWheels.forEach((w) => {
        w.rotation.x = wheelAngle;
      });
      treadSprockets.forEach((sp) => {
        sp.rotation.x = wheelAngle * 1.4;
      });
    }

    // Thruster & Booster Flames
    const codeFlamePreview =
      isCodeFeedback && ((fbTier === 'dynamic' && fbProgress > 0.25) || (fbTier === 'nested' && fbProgress < 0.65));
    const fireThrusters =
      p.isAirborne || p.mood === 'boost' || (isCelebrating && p.celebrateTimer > 1.15) || codeFlamePreview;
    thrusterFlames.forEach((f, i) => {
      f.visible = fireThrusters && thrustersGroup.visible;
      if (f.visible) {
        f.scale.setScalar(0.85 + Math.sin(p.time * 32 + i) * 0.25);
      }
    });
    boostFlame.visible =
      (p.mood === 'boost' || p.turboActive || (isCelebrating && p.celebrateTimer > 1.15) || codeFlamePreview) &&
      boosterGroup.visible;
    if (boostFlame.visible) {
      boostFlame.scale.set(1, 0.9 + Math.sin(p.time * 38) * 0.35, 1);
    }

    // Subtle live equipment animations (optical crystal shimmer + inductive coil pulse)
    if (laserGroup.visible) {
      crystalTip.rotation.z = p.time * (p.mood === 'scan' ? 4.2 : 1.1);
      mats.laserCrystal.emissiveIntensity =
        p.mood === 'scan' ? 2.4 + Math.sin(p.time * 18) * 0.5 : 1.7 + Math.sin(p.time * 3.4) * 0.25;
    }
    if (magnetGroup.visible) {
      mats.magnetCoreGlow.emissiveIntensity = 1.25 + Math.sin(p.time * 4.5) * 0.35;
    }

    // Sensor Scan Cone
    if (p.mood === 'scan') {
      mats.scanCone.opacity = 0.28 + Math.sin(p.time * 24) * 0.08;
      mats.scanCone.color.setHex(p.scanMatch === true ? 0x34d399 : 0x22d3ee);
      scanConeMesh.rotation.z = Math.sin(p.time * 16) * 0.35;
    } else {
      mats.scanCone.opacity = THREE.MathUtils.damp(mats.scanCone.opacity, 0, 14, dt);
    }

    // Character-specific secondary organic animations
    if (novaWingsGroup.visible) {
      const flapSpeed = isCelebrating || p.isAirborne ? 14 : isTouched ? 10 : 3.6;
      const flapAmp = isCelebrating || p.isAirborne ? 0.38 : 0.14;
      wingPivots.forEach((wp, idx) => {
        const s = idx === 0 ? -1 : 1;
        wp.rotation.y = s * (0.16 + Math.sin(p.time * flapSpeed) * flapAmp);
        wp.rotation.z = s * (0.06 + Math.cos(p.time * flapSpeed) * flapAmp * 0.45);
      });
    }
    if (learnBotHeadGroup.visible) {
      antennaStar.rotation.y = p.time * (isCelebrating ? 5.5 : 1.9);
      antennaStar.position.y = 0.64 + Math.sin(p.time * 4.5) * 0.025;
    }
    if (sproutExtrasGroup.visible) {
      scarfTailPivot.rotation.y = Math.sin(p.time * 4.2) * 0.18;
      scarfTailPivot.rotation.x = Math.cos(p.time * 3.2) * 0.08;
    }

    // Shield Bubble
    shieldMesh.visible = p.shieldActive || p.turboActive;
    if (shieldMesh.visible) {
      mats.shield.color.setHex(p.turboActive ? 0xfbbf24 : 0x38bdf8);
      mats.shield.opacity = 0.22 + Math.sin(p.time * 6) * 0.06;
    }
  }

  function getSlotWorldPosition(r: number, c: number, out: THREE.Vector3): THREE.Vector3 {
    const off = CHASSIS_SLOT_OFFSETS[`${r},${c}`] || [0, 0.85, 0];
    out.set(off[0], off[1], off[2]);
    visual.localToWorld(out);
    return out;
  }

  function getPartWorldPosition(part: PaintPartKey, out: THREE.Vector3): THREE.Vector3 {
    const localMap: Record<PaintPartKey, [number, number, number]> = {
      chassis: [0, 0.85, -0.3],
      head: [0, 1.75, -0.1],
      arms: [0.62, 0.96, -0.2],
      wheels: [0.6, 0.26, 0],
      treads: [0.62, 0.26, 0],
      thrusters: [0, 0.82, 0.56],
      booster: [0, 1.18, 0.42],
      laser: [0, 0.78, -0.72],
      magnet: [0.48, 0.58, -0.28]
    };
    const pt = localMap[part] || [0, 0.9, 0];
    out.set(pt[0], pt[1], pt[2]);
    visual.localToWorld(out);
    return out;
  }

  function getSlotScreenPoints(
    camera: THREE.Camera,
    width: number,
    height: number,
    chassis: ChassisGrid
  ): SlotScreenPoint[] {
    const pts: SlotScreenPoint[] = [];
    const visibleSlots: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1]
    ];
    for (const [r, c] of visibleSlots) {
      getSlotWorldPosition(r, c, _tmpVec);
      _tmpVec.project(camera);
      const visible = _tmpVec.z >= -1 && _tmpVec.z <= 1;
      pts.push({
        r,
        c,
        x: (_tmpVec.x * 0.5 + 0.5) * width,
        y: (-_tmpVec.y * 0.5 + 0.5) * height,
        visible,
        part: chassis[r]?.[c] ?? null
      });
    }
    return pts;
  }

  function getHeadScreenPoint(
    camera: THREE.Camera,
    width: number,
    height: number
  ): HeadScreenPoint {
    _tmpVec.set(0, activeCharacter === 'robobuddy' ? 2.52 : 2.34, 0);
    visual.localToWorld(_tmpVec);
    _tmpVec.project(camera);
    const visible = _tmpVec.z >= -1 && _tmpVec.z <= 1;
    return {
      x: (_tmpVec.x * 0.5 + 0.5) * width,
      y: (-_tmpVec.y * 0.5 + 0.5) * height,
      visible
    };
  }

  // Keep reference clean to avoid unused variable warning
  void currentEyeXSpan;
  void eyeIrisMeshes;

  return {
    root,
    visual,
    contactShadow,
    applyChassis,
    update,
    getSlotScreenPoints,
    getHeadScreenPoint,
    getSlotWorldPosition,
    getPartWorldPosition,
    triggerPartPop,
    setTheme,
    applyPaintConfig,
    setCharacter
  };
}
