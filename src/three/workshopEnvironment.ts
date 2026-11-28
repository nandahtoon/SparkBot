import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ProceduralTextures } from './materials';
import type { GraphicsQualityBudget } from '../game/graphicsConfig';
import type { BiomeThemeDef } from '../game/biomes';

export interface WorkshopEnvironmentHandles {
  workshopGroup: THREE.Group;
  skyportGroup: THREE.Group;
  turntableRing: THREE.Mesh;
  turntableOuterRing: THREE.Mesh;
  windmills: THREE.Group[];
  gearLarge: THREE.Mesh;
  gearSmall: THREE.Mesh;
  helperDrone: THREE.Group;
  droneRotor: THREE.Group;
  droneWeldBeam: THREE.Mesh;
  conduitOrbs: THREE.Mesh[];
  ambientMotes: THREE.InstancedMesh;
  moteSeeds: Array<{ x: number; y: number; z: number; phase: number; speed: number; scale: number }>;
  solarRing: THREE.Mesh;
  applyBiome: (biome: BiomeThemeDef) => void;
  setQualityBudget: (budget: GraphicsQualityBudget) => void;
  dispose: () => void;
}

export function createGearGeometry(radius: number, teeth: number, thickness: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const innerR = radius * 0.78;
  const outerR = radius;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.45;
    const a3 = a0 + step * 0.7;
    if (i === 0) shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    else shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.28, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1
  });
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildWorkshopEnvironment(
  scene: THREE.Scene,
  tex: ProceduralTextures,
  isSoftwareGl: boolean
): WorkshopEnvironmentHandles {
  const disposables: Array<{ dispose: () => void }> = [];
  const trackDisposable = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // 1. Studio 3-Point + Warm/Cool Skyport Lighting Rig (Glare-Free Pixar Ceramic Calibration)
  const hemi = new THREE.HemisphereLight(0xcbe5ff, 0x24324d, 0.5);
  hemi.position.set(0, 32, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff5e6, 1.22);
  key.position.set(8.5, 14.5, 10.5);
  key.castShadow = !isSoftwareGl;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 64;
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3.2;
  scene.add(key);

  // Soft cool-sky front-left fill so glossy ceramic faces stay luminous without washing out
  const fill = new THREE.DirectionalLight(0xdbeafe, 0.36);
  fill.position.set(-7.5, 6.2, 8.5);
  scene.add(fill);

  // Crisp studio cyan-ice rim/backlight carving out glossy ceramic silhouettes & chrome bevels
  const rim = new THREE.DirectionalLight(0x93e5ff, 0.75);
  rim.position.set(-5.5, 8.2, -11.5);
  scene.add(rim);

  // Secondary warm golden rear-right kicker for dual-tone studio edge sheen
  const warmAccent = new THREE.PointLight(0xfbbf24, 0.55, 12, 2);
  warmAccent.position.set(2.6, 2.7, -1.6);
  scene.add(warmAccent);

  // Hardware GPU Studio Softboxes (subtle glossy catchlights, skipped on software WebGL)
  let softboxTop: THREE.RectAreaLight | null = null;
  let softboxSide: THREE.RectAreaLight | null = null;
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    softboxTop = new THREE.RectAreaLight(0xe0f2fe, 0.55, 5.2, 1.8);
    softboxTop.position.set(0, 5.4, 3.0);
    softboxTop.lookAt(0, 1.05, 0);
    scene.add(softboxTop);

    softboxSide = new THREE.RectAreaLight(0xfff1d6, 0.35, 2.2, 3.0);
    softboxSide.position.set(3.8, 2.3, 1.6);
    softboxSide.lookAt(0, 1.0, 0);
    scene.add(softboxSide);
  }

  // 2. Seamless Procedural Twilight Skyport Dome (replaces flat solid background)
  const skyDomeGeo = trackDisposable(new THREE.SphereGeometry(165, 32, 20));
  const skyDomeMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      map: tex.skyDome,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })
  );
  const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  skyDome.renderOrder = -10;
  scene.add(skyDome);

  const skyportGroup = new THREE.Group();
  scene.add(skyportGroup);

  // Distant atmospheric floor below the skyport cliffs (natural open perimeter)
  const skyFloorGeo = trackDisposable(new THREE.CircleGeometry(185, 36));
  const skyFloorMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x0e192f,
      roughness: 0.92,
      metalness: 0.08
    })
  );
  const skyFloor = new THREE.Mesh(skyFloorGeo, skyFloorMat);
  skyFloor.rotation.x = -Math.PI / 2;
  skyFloor.position.y = -9.5;
  skyportGroup.add(skyFloor);

  // Distant Architectural Solar Ring arcing across the twilight horizon
  const solarRingGeo = trackDisposable(new THREE.TorusGeometry(42, 0.34, 10, 64, Math.PI * 1.15));
  const solarRingMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.72
    })
  );
  const solarRing = new THREE.Mesh(solarRingGeo, solarRingMat);
  solarRing.position.set(0, -4.5, -72);
  solarRing.rotation.z = -0.1;
  skyportGroup.add(solarRing);

  // Layered Architectural Skyport Towers + Illuminated Hangar Collar Bands + Beacons via InstancedMesh
  const mesaGeo = trackDisposable(new THREE.CylinderGeometry(3.0, 5.8, 17, 6));
  const mesaMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.24
    })
  );
  const mesaCapGeo = trackDisposable(new THREE.CylinderGeometry(3.55, 3.2, 1.4, 6));
  const mesaCapMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.62
    })
  );
  const mesaBandGeo = trackDisposable(new THREE.CylinderGeometry(3.68, 3.68, 0.28, 6));
  const mesaBandMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false
    })
  );
  const mesaCount = 18;
  const mesas = new THREE.InstancedMesh(mesaGeo, mesaMat, mesaCount);
  mesas.frustumCulled = false;
  const mesaCaps = new THREE.InstancedMesh(mesaCapGeo, mesaCapMat, mesaCount);
  mesaCaps.frustumCulled = false;
  const mesaBands = new THREE.InstancedMesh(mesaBandGeo, mesaBandMat, mesaCount);
  mesaBands.frustumCulled = false;

  const beaconGeo = trackDisposable(new THREE.CylinderGeometry(0.18, 0.24, 1.05, 8));
  const beaconMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false
    })
  );
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, mesaCount);
  beacons.frustumCulled = false;

  const mesaPalette = [0x1c2c4a, 0x223557, 0x182640, 0x273b5e];
  for (let i = 0; i < mesaCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const distX = 18 + (i % 4) * 9.5;
    const distZ = 8 - i * 10.5;
    const scaleX = 0.92 + (i % 3) * 0.32;
    const scaleY = 0.78 + (i % 4) * 0.26;
    const scaleZ = 0.92 + (i % 2) * 0.32;
    const baseY = -3.8 + (i % 3) * 1.3;
    const topY = baseY + 8.5 * scaleY;

    _dummy.position.set(side * distX, baseY, distZ);
    _dummy.scale.set(scaleX, scaleY, scaleZ);
    _dummy.rotation.set(0, i * 0.8, 0);
    _dummy.updateMatrix();
    mesas.setMatrixAt(i, _dummy.matrix);
    _color.setHex(mesaPalette[i % mesaPalette.length]);
    mesas.setColorAt(i, _color);

    // Stepped architectural hangar deck crown
    _dummy.position.set(side * distX, topY - 0.15, distZ);
    _dummy.scale.set(scaleX, 1, scaleZ);
    _dummy.updateMatrix();
    mesaCaps.setMatrixAt(i, _dummy.matrix);

    // Illuminated cyan/amber skyport observation strip around tower crown
    _dummy.position.set(side * distX, topY + 0.12, distZ);
    _dummy.scale.set(scaleX, 1, scaleZ);
    _dummy.updateMatrix();
    mesaBands.setMatrixAt(i, _dummy.matrix);
    _color.setHex(i % 3 === 0 ? 0xfbbf24 : 0x38bdf8).multiplyScalar(0.65);
    mesaBands.setColorAt(i, _color);

    // Subtle glowing navigation spire perched atop tower plateau
    _dummy.position.set(side * distX, topY + 0.95, distZ);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    beacons.setMatrixAt(i, _dummy.matrix);
    _color.setHex(i % 3 === 0 ? 0xfbbf24 : 0x38bdf8).multiplyScalar(0.85);
    beacons.setColorAt(i, _color);
  }
  mesas.instanceMatrix.needsUpdate = true;
  if (mesas.instanceColor) mesas.instanceColor.needsUpdate = true;
  mesaCaps.instanceMatrix.needsUpdate = true;
  mesaBands.instanceMatrix.needsUpdate = true;
  if (mesaBands.instanceColor) mesaBands.instanceColor.needsUpdate = true;
  beacons.instanceMatrix.needsUpdate = true;
  if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
  skyportGroup.add(mesas, mesaCaps, mesaBands, beacons);

  // Rotating Skyport Windmills in background
  const windmills: THREE.Group[] = [];
  const towerMat = trackDisposable(
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.48, metalness: 0.56 })
  );
  const hubMat = trackDisposable(
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.26, metalness: 0.72 })
  );
  const bladeMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.52,
      roughness: 0.25,
      metalness: 0.3
    })
  );
  const towerGeo = trackDisposable(new THREE.CylinderGeometry(0.26, 0.54, 8.4, 10));
  const hubGeo = trackDisposable(new THREE.SphereGeometry(0.32, 12, 10));
  const bladeGeo = trackDisposable(new THREE.BoxGeometry(0.24, 2.8, 0.07));

  [
    [-19, 1.8, -14],
    [15, 2.2, -24],
    [-16, 2.8, -38],
    [16, 1.8, -48]
  ].forEach(([wx, wy, wz]) => {
    const wm = new THREE.Group();
    wm.position.set(wx, wy, wz);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = -4.2;
    wm.add(tower);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    wm.add(hub);
    const rotor = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 1.4;
      const piv = new THREE.Group();
      piv.rotation.z = (b / 3) * Math.PI * 2;
      piv.add(blade);
      rotor.add(piv);
    }
    wm.add(rotor);
    skyportGroup.add(wm);
    windmills.push(rotor);
  });

  // Ocean surface and distant reef islands, outside the playable walkway.
  const oceanGroup = new THREE.Group();
  oceanGroup.visible = false;
  const oceanWater = new THREE.Mesh(trackDisposable(new THREE.CircleGeometry(125,48)),
    trackDisposable(new THREE.MeshStandardMaterial({color:0x169ac1,roughness:0.32,metalness:0.12})));
  oceanWater.rotation.x=-Math.PI/2;
  oceanWater.position.set(0,-3.4,-20);
  oceanGroup.add(oceanWater);
  const islandGeo=trackDisposable(new THREE.CylinderGeometry(3.4,5.2,1.8,10));
  const islandMat=trackDisposable(new THREE.MeshStandardMaterial({color:0xf1d79b,roughness:0.94}));
  const coralGeo=trackDisposable(new THREE.ConeGeometry(0.48,2.4,6));
  const coralMat=trackDisposable(new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.82}));
  const islands=new THREE.InstancedMesh(islandGeo,islandMat,6);
  const coral=new THREE.InstancedMesh(coralGeo,coralMat,24);
  const waveGeo=trackDisposable(new THREE.TorusGeometry(2.6,0.035,4,20,Math.PI*1.1));
  const waveMat=trackDisposable(new THREE.MeshBasicMaterial({color:0xb0f3ef,transparent:true,opacity:0.55}));
  const ripples=new THREE.InstancedMesh(waveGeo,waveMat,18);
  const oceanTransform=new THREE.Object3D();
  const oceanColor=new THREE.Color();
  for(let i=0;i<6;i++){
    const x=(i%2===0?-1:1)*(12+Math.floor(i/2)*4);
    const z=-10-Math.floor(i/2)*17;
    oceanTransform.position.set(x,-3.1,z);oceanTransform.rotation.set(0,0,0);oceanTransform.scale.set(1,1,1);
    oceanTransform.updateMatrix();islands.setMatrixAt(i,oceanTransform.matrix);
    for(let j=0;j<4;j++){
      oceanTransform.position.set(x+(j%2===0?-1:1)*1.15,-1.15,z+(j<2?-1:1)*1.1);
      oceanTransform.rotation.set((j%2===0?-1:1)*0.22,j*0.9,0.15);
      oceanTransform.scale.set(0.75,0.8+j*0.15,0.75);oceanTransform.updateMatrix();
      coral.setMatrixAt(i*4+j,oceanTransform.matrix);coral.setColorAt(i*4+j,oceanColor.setHex([0xf08f9a,0xf7b56d,0x71dbbb,0xae9bed][j]));
    }
    for(let j=0;j<3;j++){
      oceanTransform.position.set(x,-3.35,z);oceanTransform.rotation.set(-Math.PI/2,0,j*1.8);
      oceanTransform.scale.setScalar(1.7+j*0.45);oceanTransform.updateMatrix();ripples.setMatrixAt(i*3+j,oceanTransform.matrix);
    }
  }
  for(const mesh of [islands,coral,ripples])mesh.instanceMatrix.needsUpdate=true;
  if(coral.instanceColor)coral.instanceColor.needsUpdate=true;
  oceanGroup.add(islands,coral,ripples);skyportGroup.add(oceanGroup);

  // Chapter 5 solar arrays: background-only, shared geometry and materials.
  const energyArrays = new THREE.Group();
  energyArrays.visible = false;
  const panelGeo = trackDisposable(new THREE.BoxGeometry(3.2, 0.12, 1.9));
  const panelMat = trackDisposable(new THREE.MeshStandardMaterial({color: 0x204b79, metalness: 0.35, roughness: 0.48}));
  const frameGeo = trackDisposable(new THREE.BoxGeometry(3.38, 0.13, 2.08));
  const frameMat = trackDisposable(new THREE.MeshStandardMaterial({color: 0x8caeb8, roughness: 0.7}));
  const standGeo = trackDisposable(new THREE.BoxGeometry(0.25, 2.6, 0.25));
  const solarPanels = new THREE.InstancedMesh(panelGeo, panelMat, 8);
  const solarFrames = new THREE.InstancedMesh(frameGeo, frameMat, 8);
  const solarStands = new THREE.InstancedMesh(standGeo, frameMat, 8);
  const solarTransform = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const x = (i < 4 ? -1 : 1) * (14 + (i % 2) * 4);
    const z = -19 - Math.floor((i % 4) / 2) * 7;
    solarTransform.position.set(x, -3.8, z);
    solarTransform.rotation.set(-0.38, 0, 0);
    solarTransform.updateMatrix();
    solarFrames.setMatrixAt(i, solarTransform.matrix);
    solarTransform.position.y += 0.12;
    solarTransform.updateMatrix();
    solarPanels.setMatrixAt(i, solarTransform.matrix);
    solarTransform.position.set(x, -5.1, z);
    solarTransform.rotation.set(0, 0, 0);
    solarTransform.updateMatrix();
    solarStands.setMatrixAt(i, solarTransform.matrix);
  }
  solarPanels.instanceMatrix.needsUpdate = true;
  solarFrames.instanceMatrix.needsUpdate = true;
  solarStands.instanceMatrix.needsUpdate = true;
  energyArrays.add(solarFrames, solarPanels, solarStands);
  skyportGroup.add(energyArrays);

  // 3. Upgraded Dual-Tier Studio Workshop Pedestal & Gantry
  const workshopGroup = new THREE.Group();

  const basePlinthGeo = trackDisposable(new THREE.CylinderGeometry(2.72, 3.05, 0.26, 36));
  const basePlinthMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.36,
      metalness: 0.78
    })
  );
  const basePlinth = new THREE.Mesh(basePlinthGeo, basePlinthMat);
  basePlinth.position.y = -0.36;
  basePlinth.receiveShadow = true;
  workshopGroup.add(basePlinth);

  const baseDeckGeo = trackDisposable(new THREE.CylinderGeometry(2.38, 2.6, 0.3, 36));
  const baseDeckMat = trackDisposable(
    new THREE.MeshPhysicalMaterial({
      map: tex.floorDeck,
      bumpMap: tex.floorBump,
      bumpScale: 0.018,
      color: 0x3b4d68,
      roughness: 0.38,
      metalness: 0.58,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28
    })
  );
  const base = new THREE.Mesh(baseDeckGeo, baseDeckMat);
  base.position.y = -0.15;
  base.receiveShadow = true;
  workshopGroup.add(base);

  // Soft studio spotlight stage glow decal on pedestal top (polygonOffset avoids Z-fighting)
  const stageGlowGeo = trackDisposable(new THREE.CircleGeometry(2.12, 36));
  const stageGlowMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      map: tex.turntableGlow,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  const stageGlow = new THREE.Mesh(stageGlowGeo, stageGlowMat);
  stageGlow.rotation.x = -Math.PI / 2;
  stageGlow.position.y = 0.018;
  workshopGroup.add(stageGlow);

  // Inner luminous holographic turntable ring
  const turntableRingGeo = trackDisposable(new THREE.TorusGeometry(2.15, 0.055, 12, 48));
  const turntableRingMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.42,
      roughness: 0.18,
      metalness: 0.25
    })
  );
  const turntableRing = new THREE.Mesh(turntableRingGeo, turntableRingMat);
  turntableRing.rotation.x = Math.PI / 2;
  turntableRing.position.y = 0.032;
  workshopGroup.add(turntableRing);

  // Outer precision chamfered metallic collar with segmented amber accents
  const outerRingGeo = trackDisposable(new THREE.TorusGeometry(2.58, 0.045, 10, 48));
  const outerRingMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.22,
      metalness: 0.88
    })
  );
  const turntableOuterRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  turntableOuterRing.rotation.x = Math.PI / 2;
  turntableOuterRing.position.y = -0.22;
  workshopGroup.add(turntableOuterRing);

  // Repair gantry frame arch flanking the back of pedestal (never blocking foreground)
  const archMat = trackDisposable(
    new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.36,
      metalness: 0.78,
      clearcoat: 0.28
    })
  );
  const chromeCollarMat = trackDisposable(
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.18, metalness: 0.9 })
  );
  const glowMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.48,
      roughness: 0.18
    })
  );
  const cyanStripMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.2
    })
  );

  const postGeo = trackDisposable(new RoundedBoxGeometry(0.24, 3.05, 0.24, 2, 0.04));
  const collarGeo = trackDisposable(new RoundedBoxGeometry(0.32, 0.12, 0.32, 2, 0.02));
  const lampGeo = trackDisposable(new THREE.BoxGeometry(0.14, 0.58, 0.12));
  [-2.55, 2.55].forEach((px) => {
    const post = new THREE.Mesh(postGeo, archMat);
    post.position.set(px, 1.35, -0.95);
    const collarLow = new THREE.Mesh(collarGeo, chromeCollarMat);
    collarLow.position.set(px, 0.28, -0.95);
    const collarHigh = new THREE.Mesh(collarGeo, chromeCollarMat);
    collarHigh.position.set(px, 2.68, -0.95);
    const lamp = new THREE.Mesh(lampGeo, glowMat);
    lamp.position.set(px * 0.92, 2.35, -0.82);
    workshopGroup.add(post, collarLow, collarHigh, lamp);
  });

  const topBeam = new THREE.Mesh(
    trackDisposable(new RoundedBoxGeometry(5.35, 0.22, 0.28, 2, 0.04)),
    archMat
  );
  topBeam.position.set(0, 2.95, -0.95);
  const overheadStrip = new THREE.Mesh(
    trackDisposable(new THREE.BoxGeometry(3.4, 0.05, 0.08)),
    cyanStripMat
  );
  overheadStrip.position.set(0, 2.82, -0.9);
  workshopGroup.add(topBeam, overheadStrip);

  // Tactile Prop 1: Side Interlocking Mechanical Gear Bench (Left Flank, never blocks center bot)
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-2.55, 0.56, -0.35);
  const benchTop = new THREE.Mesh(
    trackDisposable(new RoundedBoxGeometry(1.15, 0.14, 0.85, 2, 0.03)),
    trackDisposable(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.68 }))
  );
  benchGroup.add(benchTop);
  const legGeo = trackDisposable(new THREE.CylinderGeometry(0.06, 0.08, 0.56, 8));
  [
    [-0.45, -0.32],
    [0.45, -0.32],
    [-0.45, 0.32],
    [0.45, 0.32]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, archMat);
    leg.position.set(lx, -0.28, lz);
    benchGroup.add(leg);
  });
  const goldMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.32,
      roughness: 0.24,
      metalness: 0.78
    })
  );
  const skyMat = trackDisposable(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.38,
      roughness: 0.24,
      metalness: 0.75
    })
  );
  const gearLarge = new THREE.Mesh(trackDisposable(createGearGeometry(0.32, 10, 0.08)), goldMat);
  gearLarge.rotation.x = -Math.PI / 2;
  gearLarge.position.set(-0.2, 0.08, 0.04);
  const gearSmall = new THREE.Mesh(trackDisposable(createGearGeometry(0.21, 7, 0.08)), skyMat);
  gearSmall.rotation.x = -Math.PI / 2;
  gearSmall.position.set(0.28, 0.08, -0.1);
  const wrenchHandle = new THREE.Mesh(
    trackDisposable(new RoundedBoxGeometry(0.42, 0.05, 0.09, 1, 0.015)),
    trackDisposable(new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.28, metalness: 0.62 }))
  );
  wrenchHandle.position.set(0.18, 0.1, 0.24);
  wrenchHandle.rotation.y = 0.45;
  benchGroup.add(gearLarge, gearSmall, wrenchHandle);
  workshopGroup.add(benchGroup);

  // Tactile Prop 2: Floating Composite Helper Drone (watches SparkBot & cursor focus)
  const helperDrone = new THREE.Group();
  helperDrone.position.set(-1.95, 2.25, -0.25);
  const droneShell = new THREE.Mesh(
    trackDisposable(new THREE.SphereGeometry(0.26, 18, 14)),
    trackDisposable(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.18,
        metalness: 0.45,
        clearcoat: 0.85
      })
    )
  );
  droneShell.scale.set(1.15, 0.88, 1.0);
  const droneVisor = new THREE.Mesh(
    trackDisposable(new RoundedBoxGeometry(0.34, 0.14, 0.18, 2, 0.04)),
    trackDisposable(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.85 }))
  );
  droneVisor.position.set(0, 0.02, 0.18);
  const droneEye = new THREE.Mesh(
    trackDisposable(new THREE.SphereGeometry(0.055, 10, 10)),
    trackDisposable(new THREE.MeshBasicMaterial({ color: 0x22d3ee }))
  );
  droneEye.position.set(0, 0.02, 0.26);
  const droneRing = new THREE.Mesh(
    trackDisposable(new THREE.TorusGeometry(0.34, 0.032, 8, 24)),
    cyanStripMat
  );
  droneRing.rotation.x = Math.PI / 2;
  const droneRotor = new THREE.Group();
  droneRotor.position.y = 0.27;
  const rotorBlade = new THREE.Mesh(trackDisposable(new THREE.BoxGeometry(0.56, 0.025, 0.07)), archMat);
  droneRotor.add(rotorBlade);
  helperDrone.add(droneShell, droneVisor, droneEye, droneRing, droneRotor);
  workshopGroup.add(helperDrone);

  // 3D Holographic Welding Laser Beam from Helper Drone to active installation slot
  const droneWeldBeam = new THREE.Mesh(
    trackDisposable(new THREE.CylinderGeometry(0.028, 0.052, 1, 10)),
    trackDisposable(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    )
  );
  droneWeldBeam.visible = false;
  scene.add(droneWeldBeam);

  // Tactile Prop 3: Glowing Energy Conduit Rails + Flowing Energy Orbs bridging Pedestal to Track
  const conduitMat = trackDisposable(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.78 })
  );
  const railGeo = trackDisposable(new THREE.CylinderGeometry(0.045, 0.045, 2.3, 8));
  const orbGeo = trackDisposable(new THREE.SphereGeometry(0.085, 10, 10));
  const orbMat = trackDisposable(new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  const conduitOrbs: THREE.Mesh[] = [];
  [-1.78, 1.78].forEach((cx, railIdx) => {
    const rail = new THREE.Mesh(railGeo, conduitMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(cx, 0.04, -3.05);
    workshopGroup.add(rail);
    for (let k = 0; k < 3; k++) {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(cx, 0.09, -2.0 - k * 0.72);
      orb.userData = { railIdx, phaseOffset: k / 3 };
      workshopGroup.add(orb);
      conduitOrbs.push(orb);
    }
  });

  // 4. Floating Ambient Workshop Dust Motes (InstancedMesh, subtle depth & studio atmosphere)
  const moteCount = 44;
  const moteGeo = trackDisposable(new THREE.OctahedronGeometry(0.036, 0));
  const moteMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const ambientMotes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  ambientMotes.frustumCulled = false;
  const moteSeeds: WorkshopEnvironmentHandles['moteSeeds'] = [];
  const moteColors = [0x7dd3fc, 0xfde68a, 0xa5f3fc, 0xf5d0fe];
  for (let i = 0; i < moteCount; i++) {
    const angle = (i / moteCount) * Math.PI * 2 + (i % 5) * 0.37;
    const radius = 2.6 + (i % 7) * 1.4;
    const seed = {
      x: Math.cos(angle) * radius,
      y: 0.4 + (i % 6) * 0.85,
      z: Math.sin(angle) * radius - (i % 4) * 2.2,
      phase: i * 0.91,
      speed: 0.35 + (i % 5) * 0.12,
      scale: 0.65 + (i % 4) * 0.28
    };
    moteSeeds.push(seed);
    _dummy.position.set(seed.x, seed.y, seed.z);
    _dummy.scale.setScalar(seed.scale);
    _dummy.updateMatrix();
    ambientMotes.setMatrixAt(i, _dummy.matrix);
    _color.setHex(moteColors[i % moteColors.length]);
    ambientMotes.setColorAt(i, _color);
  }
  ambientMotes.instanceMatrix.needsUpdate = true;
  if (ambientMotes.instanceColor) ambientMotes.instanceColor.needsUpdate = true;
  scene.add(ambientMotes);

  let currentShadowSize: number = isSoftwareGl ? 0 : 2048;

  const setQualityBudget = (budget: GraphicsQualityBudget) => {
    const allowShadows = !isSoftwareGl && budget.shadowsEnabled && budget.shadowMapSize > 0;
    key.castShadow = allowShadows;
    if (allowShadows && budget.shadowMapSize !== currentShadowSize) {
      currentShadowSize = budget.shadowMapSize;
      key.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
      key.shadow.needsUpdate = true;
    } else if (!allowShadows) {
      currentShadowSize = 0;
    }
    if (softboxTop) softboxTop.visible = !isSoftwareGl && budget.softboxEnabled;
    if (softboxSide) softboxSide.visible = !isSoftwareGl && budget.softboxEnabled;
    ambientMotes.visible = budget.ambientMotesVisible;
  };

  const applyBiome = (biome: BiomeThemeDef) => {
    energyArrays.visible = biome.id === 'energy_valley';
    const ocean = biome.id === 'ocean_discovery';
    oceanGroup.visible = ocean;
    for(const mesh of [solarRing,mesas,mesaCaps,mesaBands,beacons]) mesh.visible = !ocean;
    for(const rotor of windmills) if(rotor.parent) rotor.parent.visible = !ocean;
    hemi.color.setHex(biome.hemiSkyHex);
    hemi.groundColor.setHex(biome.hemiGroundHex);
    key.color.setHex(biome.keyLightHex);
    rim.color.setHex(biome.rimLightHex);
    skyFloorMat.color.setHex(biome.skyFloorHex);
    solarRingMat.color.setHex(biome.solarRingHex);
    solarRingMat.emissive.setHex(biome.solarRingEmissiveHex);
    for (let i = 0; i < mesaCount; i++) {
      _color.setHex(biome.mesaHex).offsetHSL(0, 0, ((i % 3) - 1) * 0.03);
      mesas.setColorAt(i, _color);
      _color.setHex(i % 3 === 0 ? biome.solarRingHex : biome.mesaBandHex).multiplyScalar(0.7);
      mesaBands.setColorAt(i, _color);
      _color.setHex(i % 3 === 0 ? biome.solarRingHex : biome.mesaBandHex).multiplyScalar(0.88);
      beacons.setColorAt(i, _color);
    }
    if (mesas.instanceColor) mesas.instanceColor.needsUpdate = true;
    if (mesaBands.instanceColor) mesaBands.instanceColor.needsUpdate = true;
    if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
  };

  scene.add(workshopGroup);

  return {
    workshopGroup,
    skyportGroup,
    turntableRing,
    turntableOuterRing,
    windmills,
    gearLarge,
    gearSmall,
    helperDrone,
    droneRotor,
    droneWeldBeam,
    conduitOrbs,
    ambientMotes,
    moteSeeds,
    solarRing,
    applyBiome,
    setQualityBudget,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    }
  };
}
