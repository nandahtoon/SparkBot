import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DroneId } from '../game/shopAndQuests';
import { getShopItemById } from '../game/shopAndQuests';

export interface CompanionDroneRig {
  root: THREE.Group;
  setDroneStyle: (droneId: DroneId | null) => void;
  getDroneStyle: () => DroneId | null;
  triggerHappySpin: () => void;
  triggerCelebrate: () => void;
  update: (
    dt: number,
    time: number,
    botWorldPos: THREE.Vector3,
    isTrackMode: boolean
  ) => void;
  dispose: () => void;
}

const _targetPos = new THREE.Vector3();

/**
 * Multi-part procedural 3D Helper Drone Companion that floats beside SparkBot
 * across the Workshop, Bolt Shop, Coding Track, and Celebrations.
 */
export function createCompanionDroneRig(): CompanionDroneRig {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.visible = false;

  const visual = new THREE.Group();
  root.add(visual);

  const primaryMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.22,
      metalness: 0.35,
      clearcoat: 0.85
    })
  );
  const accentMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfde047,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.55
    })
  );
  const darkMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.8
    })
  );
  const eyeMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9
    })
  );

  // 1. Primary Silhouette: Ceramic Egg-Orb Body + Belly Thruster Cone
  const body = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 20, 16)), primaryMat);
  body.scale.set(1.12, 0.92, 1.0);
  body.castShadow = true;
  visual.add(body);

  const bellyNozzle = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.11, 0.06, 0.14, 12)),
    darkMetalMat
  );
  bellyNozzle.position.set(0, -0.26, 0);
  visual.add(bellyNozzle);

  const thrusterGlow = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.085, 0.24, 10)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      })
    )
  );
  thrusterGlow.rotation.x = Math.PI;
  thrusterGlow.position.set(0, -0.4, 0);
  visual.add(thrusterGlow);

  // 2. Secondary Read: Expressive Visor + Glowing Twin Eyes + Rotating Halo Hover Ring
  const visor = new THREE.Mesh(
    track(new RoundedBoxGeometry(0.38, 0.16, 0.18, 2, 0.045)),
    darkMetalMat
  );
  visor.position.set(0, 0.03, 0.2);
  visual.add(visor);

  const eyeGeo = track(new THREE.SphereGeometry(0.046, 12, 10));
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.085, 0.03, 0.29);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.085, 0.03, 0.29);
  visual.add(leftEye, rightEye);

  const hoverRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.41, 0.026, 10, 28)),
    accentMat
  );
  hoverRing.rotation.x = Math.PI / 2;
  hoverRing.position.y = -0.02;
  visual.add(hoverRing);

  // 3. Style-Specific Accent Groups (swapped cleanly per unlocked DroneId)
  // A. Scout Pip Antenna Bobble
  const pipGroup = new THREE.Group();
  const pipStem = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 8)),
    darkMetalMat
  );
  pipStem.position.y = 0.32;
  const pipBulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 12, 10)), accentMat);
  pipBulb.position.y = 0.44;
  pipGroup.add(pipStem, pipBulb);
  visual.add(pipGroup);

  // B. Magneto Bee Twin Wings & Stripes
  const beeGroup = new THREE.Group();
  const wingGeo = track(new THREE.BoxGeometry(0.32, 0.022, 0.16));
  const wingMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      emissive: 0x34d399,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2
    })
  );
  const beeWingL = new THREE.Mesh(wingGeo, wingMat);
  beeWingL.position.set(-0.34, 0.12, -0.04);
  const beeWingR = new THREE.Mesh(wingGeo, wingMat);
  beeWingR.position.set(0.34, 0.12, -0.04);
  const beeStripe = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.28, 0.032, 8, 20)),
    darkMetalMat
  );
  beeStripe.rotation.x = Math.PI / 2;
  beeStripe.position.y = -0.05;
  beeGroup.add(beeWingL, beeWingR, beeStripe);
  beeGroup.visible = false;
  visual.add(beeGroup);

  // C. Turbo Comet Aero Jet-Wings
  const cometGroup = new THREE.Group();
  const finGeo = track(new THREE.ConeGeometry(0.12, 0.42, 4));
  const finL = new THREE.Mesh(finGeo, accentMat);
  finL.rotation.z = Math.PI / 2.2;
  finL.position.set(-0.38, 0.0, -0.08);
  const finR = new THREE.Mesh(finGeo, accentMat);
  finR.rotation.z = -Math.PI / 2.2;
  finR.position.set(0.38, 0.0, -0.08);
  const finTop = new THREE.Mesh(track(new THREE.ConeGeometry(0.08, 0.26, 4)), primaryMat);
  finTop.position.set(0, 0.32, -0.08);
  finTop.rotation.x = -0.35;
  cometGroup.add(finL, finR, finTop);
  cometGroup.visible = false;
  visual.add(cometGroup);

  // D. Golden Owl Ear Crests & Prism Crown
  const owlGroup = new THREE.Group();
  const earGeo = track(new THREE.ConeGeometry(0.075, 0.2, 6));
  const earL = new THREE.Mesh(earGeo, accentMat);
  earL.position.set(-0.18, 0.28, 0.02);
  earL.rotation.z = 0.28;
  const earR = new THREE.Mesh(earGeo, accentMat);
  earR.position.set(0.18, 0.28, 0.02);
  earR.rotation.z = -0.28;
  const owlGem = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.085, 0)), accentMat);
  owlGem.position.set(0, 0.36, 0.04);
  owlGroup.add(earL, earR, owlGem);
  owlGroup.visible = false;
  visual.add(owlGroup);

  // Mark every mesh for interactive tap-to-pet raycasting
  root.traverse((obj) => {
    obj.userData.isCompanionDrone = true;
  });

  let activeStyle: DroneId | null = null;
  let spinTimer = 0;
  let celebrateTimer = 0;
  let initialized = false;

  const setDroneStyle = (droneId: DroneId | null) => {
    activeStyle = droneId;
    root.visible = Boolean(droneId);
    if (!droneId) return;
    const item = getShopItemById(droneId);
    if (item) {
      primaryMat.color.setHex(item.primaryNum);
      accentMat.color.setHex(item.accentNum);
      accentMat.emissive.setHex(item.accentNum);
      eyeMat.color.setHex(item.accentNum);
      (thrusterGlow.material as THREE.MeshBasicMaterial).color.setHex(item.primaryNum);
    }
    pipGroup.visible = droneId === 'scout_pip';
    beeGroup.visible = droneId === 'magneto_bee';
    cometGroup.visible = droneId === 'turbo_comet';
    owlGroup.visible = droneId === 'golden_owl';
  };

  const triggerHappySpin = () => {
    spinTimer = 0.85;
  };

  const triggerCelebrate = () => {
    celebrateTimer = 2.4;
  };

  const update = (
    dt: number,
    time: number,
    botWorldPos: THREE.Vector3,
    isTrackMode: boolean
  ) => {
    if (!root.visible) return;

    if (spinTimer > 0) spinTimer = Math.max(0, spinTimer - dt);
    if (celebrateTimer > 0) celebrateTimer = Math.max(0, celebrateTimer - dt);

    const bob = Math.sin(time * 3.1) * 0.14;
    if (celebrateTimer > 0) {
      const angle = (2.4 - celebrateTimer) * 5.2;
      _targetPos.set(
        botWorldPos.x + Math.cos(angle) * 1.45,
        botWorldPos.y + 1.95 + Math.abs(Math.sin(angle * 2)) * 0.45,
        botWorldPos.z + Math.sin(angle) * 1.45
      );
    } else if (isTrackMode) {
      _targetPos.set(
        botWorldPos.x - 1.38 + Math.sin(time * 1.4) * 0.12,
        botWorldPos.y + 1.88 + bob,
        botWorldPos.z + 0.42
      );
    } else {
      _targetPos.set(
        botWorldPos.x + 1.48 + Math.cos(time * 1.1) * 0.14,
        botWorldPos.y + 1.72 + bob,
        botWorldPos.z + 0.35
      );
    }

    if (!initialized) {
      root.position.copy(_targetPos);
      initialized = true;
    } else {
      root.position.x = THREE.MathUtils.damp(root.position.x, _targetPos.x, 6.2, dt);
      root.position.y = THREE.MathUtils.damp(root.position.y, _targetPos.y, 6.2, dt);
      root.position.z = THREE.MathUtils.damp(root.position.z, _targetPos.z, 6.2, dt);
    }

    // Playful tilt, hover ring rotation, wing flap, & tap barrel-roll
    hoverRing.rotation.z = time * 2.2;
    if (beeGroup.visible) {
      const flap = Math.sin(time * 22) * 0.38;
      beeWingL.rotation.z = flap;
      beeWingR.rotation.z = -flap;
    }
    if (owlGroup.visible) {
      owlGem.rotation.y = time * 2.6;
    }

    const thrusterPulse = 0.85 + Math.sin(time * 16) * 0.16;
    thrusterGlow.scale.set(1, thrusterPulse, 1);

    if (spinTimer > 0) {
      const p = 1 - spinTimer / 0.85;
      visual.rotation.y = p * Math.PI * 2;
      visual.position.y = Math.sin(p * Math.PI) * 0.42;
      const sc = 1 + Math.sin(p * Math.PI) * 0.18;
      visual.scale.setScalar(sc);
    } else {
      visual.rotation.y = THREE.MathUtils.damp(
        visual.rotation.y,
        isTrackMode ? Math.PI + 0.25 : -0.35 + Math.sin(time * 1.3) * 0.18,
        6,
        dt
      );
      visual.position.y = THREE.MathUtils.damp(visual.position.y, 0, 8, dt);
      visual.scale.setScalar(THREE.MathUtils.damp(visual.scale.x, 1, 8, dt));
    }
  };

  return {
    root,
    setDroneStyle,
    getDroneStyle: () => activeStyle,
    triggerHappySpin,
    triggerCelebrate,
    update,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    }
  };
}
