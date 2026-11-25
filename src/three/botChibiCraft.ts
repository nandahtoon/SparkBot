import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface ChibiEyeHandle {
  group: THREE.Group;
  irisMesh: THREE.Mesh;
  pupilGroup: THREE.Group;
  upperLid: THREE.Mesh;
  lowerLid: THREE.Mesh;
  corneaDome: THREE.Mesh;
}

export interface ChibiCraftTextures {
  irisTex: THREE.CanvasTexture;
  chestCoreTex: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates high-craft procedural 2D canvas textures for glossy chibi toy-ceramic bots:
 * 1. Multi-ring luminous anime/toy-bot iris with dark limbal ring & inner light crescent
 * 2. Recessed chest telemetry heart-spark screen with micro charge bars
 */
export function createChibiCraftTextures(maxAniso: number): ChibiCraftTextures {
  // 1. Multi-ring luminous radial iris texture (tinted dynamically by eyeGlow color)
  const irisCanvas = document.createElement('canvas');
  irisCanvas.width = 256;
  irisCanvas.height = 256;
  const ictx = irisCanvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  // Deep luminous base radial gradient
  const grad = ictx.createRadialGradient(cx, cy, 18, cx, cy, 122);
  grad.addColorStop(0.0, '#e0f7ff');
  grad.addColorStop(0.32, '#ffffff');
  grad.addColorStop(0.62, '#bae6fd');
  grad.addColorStop(0.84, '#38bdf8');
  grad.addColorStop(0.95, '#0c4a6e');
  grad.addColorStop(1.0, '#07182b');
  ictx.fillStyle = grad;
  ictx.fillRect(0, 0, 256, 256);

  // Subtle radial crystal iris fibers
  ictx.save();
  ictx.translate(cx, cy);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ictx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(14,116,144,0.24)';
    ictx.lineWidth = i % 3 === 0 ? 3 : 1.8;
    ictx.beginPath();
    ictx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
    ictx.lineTo(Math.cos(a) * 112, Math.sin(a) * 112);
    ictx.stroke();
  }
  ictx.restore();

  // Warm lower luminous bounce crescent (signature cute Pixar/vinyl toy eye glow)
  const bounceGrad = ictx.createRadialGradient(cx, cy + 54, 6, cx, cy + 54, 64);
  bounceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  bounceGrad.addColorStop(0.55, 'rgba(224, 242, 254, 0.35)');
  bounceGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ictx.fillStyle = bounceGrad;
  ictx.beginPath();
  ictx.arc(cx, cy + 54, 64, 0, Math.PI * 2);
  ictx.fill();

  const irisTex = new THREE.CanvasTexture(irisCanvas);
  irisTex.colorSpace = THREE.SRGBColorSpace;
  irisTex.anisotropy = maxAniso;
  irisTex.needsUpdate = true;

  // 2. Cute recessed chest heart-spark telemetry core texture
  const chestCanvas = document.createElement('canvas');
  chestCanvas.width = 256;
  chestCanvas.height = 160;
  const cctx = chestCanvas.getContext('2d')!;

  const bg = cctx.createLinearGradient(0, 0, 0, 160);
  bg.addColorStop(0, '#091529');
  bg.addColorStop(1, '#112240');
  cctx.fillStyle = bg;
  cctx.fillRect(0, 0, 256, 160);

  // Subtle rounded inner border glow
  cctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  cctx.lineWidth = 5;
  cctx.strokeRect(10, 10, 236, 140);

  // Micro scanlines
  cctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  for (let y = 16; y < 144; y += 12) {
    cctx.fillRect(14, y, 228, 3);
  }

  // Central glowing heart-spark icon
  const hGlow = cctx.createRadialGradient(128, 80, 6, 128, 80, 52);
  hGlow.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
  hGlow.addColorStop(0.6, 'rgba(14, 165, 233, 0.2)');
  hGlow.addColorStop(1, 'rgba(14, 165, 233, 0)');
  cctx.fillStyle = hGlow;
  cctx.beginPath();
  cctx.arc(128, 80, 52, 0, Math.PI * 2);
  cctx.fill();

  cctx.fillStyle = '#38bdf8';
  cctx.beginPath();
  cctx.moveTo(128, 114);
  cctx.bezierCurveTo(86, 86, 88, 44, 128, 66);
  cctx.bezierCurveTo(168, 44, 170, 86, 128, 114);
  cctx.closePath();
  cctx.fill();

  // Inner golden spark bolt inside heart
  cctx.fillStyle = '#fef08a';
  cctx.beginPath();
  cctx.moveTo(132, 62);
  cctx.lineTo(118, 83);
  cctx.lineTo(128, 83);
  cctx.lineTo(123, 102);
  cctx.lineTo(140, 77);
  cctx.lineTo(129, 77);
  cctx.closePath();
  cctx.fill();

  // Left & right mini energy charge bars
  const barColors = ['#34d399', '#34d399', '#38bdf8', '#fbbf24'];
  for (let i = 0; i < 4; i++) {
    cctx.fillStyle = barColors[i];
    const y = 112 - i * 24;
    cctx.fillRect(28, y, 28, 14);
    cctx.fillRect(200, y, 28, 14);
  }

  const chestCoreTex = new THREE.CanvasTexture(chestCanvas);
  chestCoreTex.colorSpace = THREE.SRGBColorSpace;
  chestCoreTex.anisotropy = maxAniso;
  chestCoreTex.needsUpdate = true;

  return {
    irisTex,
    chestCoreTex,
    dispose: () => {
      irisTex.dispose();
      chestCoreTex.dispose();
    }
  };
}

/**
 * Builds a layered glossy chibi 3D eye assembly with:
 * - Luminous gradient iris disc
 * - Deep pupil + triple specular starlight catchlights
 * - Articulated upper & lower curved eyelids for natural blinks and cute expressions
 * - Glossy clearcoat crystal cornea dome
 */
export function buildChibiEyeAssembly(params: {
  irisMat: THREE.Material;
  pupilMat: THREE.Material;
  catchlightMat: THREE.Material;
  lidMat: THREE.Material;
  corneaMat: THREE.Material;
}): ChibiEyeHandle {
  const group = new THREE.Group();

  // Outer iris ring (faces -Z front of bot)
  const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.132, 28), params.irisMat);
  irisMesh.rotation.y = Math.PI;
  group.add(irisMesh);

  // Pupil + triple catchlight group (tracks lookX/lookY smoothly)
  const pupilGroup = new THREE.Group();
  pupilGroup.position.set(0, 0, -0.006);

  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.072, 24), params.pupilMat);
  pupil.rotation.y = Math.PI;

  // Signature twin pearl catchlights + tiny diamond glint
  const catchMain = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), params.catchlightMat);
  catchMain.rotation.y = Math.PI;
  catchMain.position.set(-0.028, 0.036, -0.004);

  const catchSub = new THREE.Mesh(new THREE.CircleGeometry(0.017, 14), params.catchlightMat);
  catchSub.rotation.y = Math.PI;
  catchSub.position.set(0.03, -0.026, -0.004);

  const catchMicro = new THREE.Mesh(new THREE.CircleGeometry(0.01, 10), params.catchlightMat);
  catchMicro.rotation.y = Math.PI;
  catchMicro.position.set(-0.044, -0.005, -0.004);

  pupilGroup.add(pupil, catchMain, catchSub, catchMicro);
  group.add(pupilGroup);

  // Articulated upper & lower curved shutter eyelids (scale Y smoothly during blink / mood)
  const lidShapeUpper = new THREE.Shape();
  lidShapeUpper.absarc(0, 0, 0.142, 0, Math.PI, false);
  lidShapeUpper.lineTo(-0.142, 0);
  const upperLidGeo = new THREE.ShapeGeometry(lidShapeUpper, 20);
  const upperLid = new THREE.Mesh(upperLidGeo, params.lidMat);
  upperLid.rotation.y = Math.PI;
  upperLid.position.set(0, 0.142, -0.014);
  upperLid.scale.set(1, 0.001, 1);
  group.add(upperLid);

  const lidShapeLower = new THREE.Shape();
  lidShapeLower.absarc(0, 0, 0.142, Math.PI, Math.PI * 2, false);
  lidShapeLower.lineTo(0.142, 0);
  const lowerLidGeo = new THREE.ShapeGeometry(lidShapeLower, 20);
  const lowerLid = new THREE.Mesh(lowerLidGeo, params.lidMat);
  lowerLid.rotation.y = Math.PI;
  lowerLid.position.set(0, -0.142, -0.014);
  lowerLid.scale.set(1, 0.001, 1);
  group.add(lowerLid);

  // Subtle curved glossy cornea dome for ceramic/glass toy specular highlight
  const corneaDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.136, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32),
    params.corneaMat
  );
  corneaDome.rotation.x = -Math.PI / 2;
  corneaDome.position.set(0, 0, 0.095);
  group.add(corneaDome);

  return { group, irisMesh, pupilGroup, upperLid, lowerLid, corneaDome };
}

/**
 * Builds an articulated miniature titanium/chrome ball-and-socket gimbal joint
 * with chrome collar band and brass end caps for premium toy-robot detail.
 */
export function buildGimbalJoint(params: {
  radius: number;
  titaniumMat: THREE.Material;
  chromeMat: THREE.Material;
  brassMat: THREE.Material;
}): THREE.Group {
  const { radius, titaniumMat, chromeMat, brassMat } = params;
  const g = new THREE.Group();

  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), titaniumMat);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.96, radius * 0.16, 10, 22),
    chromeMat
  );
  const axleCapL = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, radius * 2.18, 12),
    brassMat
  );
  axleCapL.rotation.z = Math.PI / 2;

  g.add(ball, ring, axleCapL);
  return g;
}

/**
 * Builds a chunky chibi explorer sneaker/boot with ceramic upper, toe bumper,
 * glowing heel trim strip, sculpted rubber outsole, and chrome ankle ring.
 * Grounded cleanly at local y = -0.42 (world y = 0.0 when hip is at y = 0.42).
 */
export function buildExplorerSneakerBoot(params: {
  isSoftwareGl: boolean;
  shellMat: THREE.Material;
  trimMat: THREE.Material;
  rubberMat: THREE.Material;
  chromeMat: THREE.Material;
  glowMat: THREE.Material;
}): THREE.Group {
  const g = new THREE.Group();

  const ankleRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.102, 0.018, 10, 20),
    params.chromeMat
  );
  ankleRing.rotation.x = Math.PI / 2;
  ankleRing.position.set(0, -0.23, -0.01);

  const bootUpper = new THREE.Mesh(
    new RoundedBoxGeometry(0.245, 0.155, 0.355, 5, 0.075),
    params.shellMat
  );
  bootUpper.position.set(0, -0.31, -0.055);
  bootUpper.castShadow = !params.isSoftwareGl;

  // Glossy curved toe cap bumper
  const toeCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    params.trimMat
  );
  toeCap.rotation.x = -Math.PI / 2;
  toeCap.scale.set(1.02, 0.72, 0.62);
  toeCap.position.set(0, -0.325, -0.175);

  const bootMidStripe = new THREE.Mesh(
    new RoundedBoxGeometry(0.258, 0.052, 0.368, 4, 0.022),
    params.trimMat
  );
  bootMidStripe.position.set(0, -0.358, -0.055);

  // Cute glowing heel accent LED bar
  const heelLed = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.024, 0.028, 2, 0.01),
    params.glowMat
  );
  heelLed.position.set(0, -0.33, 0.125);

  const bootSole = new THREE.Mesh(
    new RoundedBoxGeometry(0.27, 0.054, 0.39, 4, 0.022),
    params.rubberMat
  );
  bootSole.position.set(0, -0.393, -0.055);

  g.add(ankleRing, bootUpper, toeCap, bootMidStripe, heelLed, bootSole);
  return g;
}

/**
 * Builds SparkBot's upgraded glossy chibi chest telemetry core:
 * Rounded chrome bezel, recessed illuminated heart-spark screen, micro LED status dots,
 * brass corner rivets, and sleek top solar energy deck.
 */
export function buildSparkBotChestCore(params: {
  chestCoreTex: THREE.CanvasTexture;
  chromeMat: THREE.Material;
  darkMat: THREE.Material;
  brassMat: THREE.Material;
  eyeGlowMat: THREE.Material;
  solarMat: THREE.Material;
  amberGlowMat: THREE.Material;
}): THREE.Group {
  const g = new THREE.Group();

  // Beveled chrome outer frame
  const outerBezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.39, 0.085, 5, 0.036),
    params.chromeMat
  );
  outerBezel.position.set(0, 0.81, -0.4);

  // Dark recessed screen housing
  const innerFrame = new THREE.Mesh(
    new RoundedBoxGeometry(0.55, 0.32, 0.07, 4, 0.028),
    params.darkMat
  );
  innerFrame.position.set(0, 0.81, -0.415);

  // Glowing illuminated heart-spark telemetry panel
  const coreScreenMat = new THREE.MeshStandardMaterial({
    map: params.chestCoreTex,
    emissive: 0x38bdf8,
    emissiveMap: params.chestCoreTex,
    emissiveIntensity: 0.72,
    roughness: 0.14,
    metalness: 0.08
  });
  const coreScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.28), coreScreenMat);
  coreScreen.rotation.y = Math.PI;
  coreScreen.position.set(0, 0.81, -0.454);

  // 4 miniature brass corner rivets
  const rivetGeo = new THREE.SphereGeometry(0.018, 10, 8);
  [
    [-0.27, 0.96],
    [0.27, 0.96],
    [-0.27, 0.66],
    [0.27, 0.66]
  ].forEach(([rx, ry]) => {
    const rivet = new THREE.Mesh(rivetGeo, params.brassMat);
    rivet.position.set(rx, ry, -0.442);
    g.add(rivet);
  });

  // Top sculpted status bar + twin micro indicator gems
  const chestGauge = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.052, 0.045, 3, 0.022),
    params.eyeGlowMat
  );
  chestGauge.position.set(0, 1.07, -0.405);

  const ledL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), params.amberGlowMat);
  ledL.position.set(-0.23, 1.07, -0.41);
  const ledR = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), params.amberGlowMat);
  ledR.position.set(0.23, 1.07, -0.41);

  // Sleek tilted top solar charging pad on upper back
  const solarDeck = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.045, 0.28, 3, 0.018),
    params.solarMat
  );
  solarDeck.position.set(0, 1.24, 0.24);
  solarDeck.rotation.x = -0.22;

  g.add(outerBezel, innerFrame, coreScreen, chestGauge, ledL, ledR, solarDeck);
  return g;
}
