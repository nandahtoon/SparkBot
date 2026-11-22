import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  PLANET_BOGS,
  PLANET_BOLTS,
  PLANET_CORES,
  PLANET_CRYSTAL_BARRIERS,
  PLANET_EXIT_GATE,
  PLANET_PLATEAUS,
  PLANET_RAMPS,
  PLANET_SPAWN,
  getPlanetGroundY,
  type PlanetCrystalBarrier
} from '../game/planetAdventure';

export interface PlanetCoreHandle {
  id: string;
  name: string;
  x: number;
  baseY: number;
  z: number;
  active: boolean;
  group: THREE.Group;
  ring: THREE.Mesh;
}

export interface PlanetBoltHandle {
  id: string;
  x: number;
  baseY: number;
  z: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  active: boolean;
  mesh: THREE.Mesh;
}

export interface PlanetBarrierHandle extends PlanetCrystalBarrier {
  active: boolean;
  group: THREE.Group;
}

export interface AlienPlanetWorldHandles {
  planetGroup: THREE.Group;
  cores: PlanetCoreHandle[];
  bolts: PlanetBoltHandle[];
  barriers: PlanetBarrierHandle[];
  exitPortalMesh: THREE.Mesh;
  exitBeaconMesh: THREE.Mesh;
  exitRingMat: THREE.MeshStandardMaterial;
  exitPortalMat: THREE.MeshBasicMaterial;
  exitBeaconMat: THREE.MeshBasicMaterial;
  magnetAuraMesh: THREE.Mesh;
  laserBeamMesh: THREE.Mesh;
  bogRipples: THREE.Mesh[];
  floraCaps: THREE.Mesh[];
  setGateUnlocked: (unlocked: boolean) => void;
  resetCollectibles: () => void;
  dispose: () => void;
}

export function buildAlienPlanetWorld(isSoftwareGl: boolean): AlienPlanetWorldHandles {
  const planetGroup = new THREE.Group();
  planetGroup.visible = false;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // 1. Alien Basalt Crater Floor & Distant Canyon Rim
  const floorGeo = track(new THREE.BoxGeometry(48, 1.2, 56));
  const floorMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.88,
      metalness: 0.14
    })
  );
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -0.6, -13);
  floor.receiveShadow = !isSoftwareGl;
  planetGroup.add(floor);

  // Subtle Bioluminescent Crater Floor Circuit Veins
  const padGeo = track(new THREE.CylinderGeometry(2.1, 2.35, 0.08, 24));
  const padMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65
    })
  );
  const spawnPad = new THREE.Mesh(padGeo, padMat);
  spawnPad.position.set(PLANET_SPAWN.x, 0.04, PLANET_SPAWN.z);
  const spawnRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.8, 0.06, 8, 32)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.2
      })
    )
  );
  spawnRing.rotation.x = Math.PI / 2;
  spawnRing.position.set(PLANET_SPAWN.x, 0.08, PLANET_SPAWN.z);
  planetGroup.add(spawnPad, spawnRing);

  // Outer Crater Rim Boulders framing the west, north, and east horizon (keep south camera corridor open)
  const rockGeo = track(new THREE.DodecahedronGeometry(1.6, 0));
  const rockMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x26354d,
      roughness: 0.9,
      metalness: 0.1
    })
  );
  const rimCoords: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 28; i++) {
    const t = i / 28;
    const angle = t * Math.PI * 2;
    const rx = Math.cos(angle) * 22.4;
    const rz = -14.5 + Math.sin(angle) * 24.0;
    if (rz > 4.5) continue;
    const sc = 1.0 + (i % 4) * 0.45;
    rimCoords.push([rx, sc * 0.6, rz, sc]);
  }
  const rimInst = new THREE.InstancedMesh(rockGeo, rockMat, rimCoords.length);
  const dummy = new THREE.Object3D();
  rimCoords.forEach(([x, y, z, s], idx) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(s * 1.25, s * 1.35, s * 1.15);
    dummy.rotation.set(idx * 0.4, idx * 0.9, idx * 0.2);
    dummy.updateMatrix();
    rimInst.setMatrixAt(idx, dummy.matrix);
  });
  rimInst.instanceMatrix.needsUpdate = true;
  planetGroup.add(rimInst);

  // 2. Stepped Ochre-Slate Alien Plateaus & Walk-up Ramps
  const plateauBodyMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.78,
      metalness: 0.16
    })
  );
  const plateauTopMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.72,
      metalness: 0.12
    })
  );
  const plateauEdgeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0d9488,
      emissiveIntensity: 0.75,
      roughness: 0.25
    })
  );

  for (const p of PLANET_PLATEAUS) {
    const w = p.maxX - p.minX;
    const d = p.maxZ - p.minZ;
    const cx = (p.minX + p.maxX) * 0.5;
    const cz = (p.minZ + p.maxZ) * 0.5;

    const body = new THREE.Mesh(
      track(new RoundedBoxGeometry(w, Math.max(0.2, p.height - 0.16), d, 2, 0.08)),
      plateauBodyMat
    );
    body.position.set(cx, (p.height - 0.16) * 0.5, cz);
    body.castShadow = !isSoftwareGl;
    body.receiveShadow = !isSoftwareGl;

    const cap = new THREE.Mesh(
      track(new RoundedBoxGeometry(w + 0.12, 0.2, d + 0.12, 2, 0.06)),
      plateauTopMat
    );
    cap.position.set(cx, p.height - 0.1, cz);
    cap.receiveShadow = !isSoftwareGl;

    const trim = new THREE.Mesh(
      track(new THREE.BoxGeometry(w + 0.16, 0.06, d + 0.16)),
      plateauEdgeMat
    );
    trim.position.set(cx, p.height - 0.22, cz);

    planetGroup.add(body, cap, trim);
  }

  const rampMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.28
    })
  );
  const chevronMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.85
    })
  );

  for (const r of PLANET_RAMPS) {
    const w = r.maxX - r.minX;
    const d = r.maxZ - r.minZ;
    const cx = (r.minX + r.maxX) * 0.5;
    const cz = (r.minZ + r.maxZ) * 0.5;
    const run = Math.abs(r.highCoord - r.lowCoord);
    const slopeLen = Math.hypot(run, r.height);
    const pitchAngle = Math.atan2(r.height, run);

    const widthAcross = r.axis === 'z' ? w : d;
    const plank = new THREE.Mesh(
      track(new THREE.BoxGeometry(r.axis === 'z' ? widthAcross : slopeLen, 0.24, r.axis === 'z' ? slopeLen : widthAcross)),
      rampMat
    );
    plank.position.set(cx, r.height * 0.5 - 0.06, cz);

    if (r.axis === 'z') {
      // highCoord < lowCoord means rises toward -Z
      plank.rotation.x = r.highCoord < r.lowCoord ? pitchAngle : -pitchAngle;
    } else {
      // highCoord > lowCoord means rises toward +X
      plank.rotation.z = r.highCoord > r.lowCoord ? pitchAngle : -pitchAngle;
    }
    plank.receiveShadow = !isSoftwareGl;
    planetGroup.add(plank);

    // Subtle glowing guide strip down ramp center
    const strip = new THREE.Mesh(
      track(new THREE.BoxGeometry(r.axis === 'z' ? 0.32 : slopeLen * 0.88, 0.04, r.axis === 'z' ? slopeLen * 0.88 : 0.32)),
      chevronMat
    );
    strip.position.set(cx, r.height * 0.5 + 0.07, cz);
    strip.rotation.copy(plank.rotation);
    planetGroup.add(strip);
  }

  // 3. Alien Spore Bogs (sticky mud-purple pools with glowing spore bubbles)
  const bogMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x581c87,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.1
    })
  );
  const bogRimMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.55
    })
  );
  const bogRipples: THREE.Mesh[] = [];
  for (const bog of PLANET_BOGS) {
    const pool = new THREE.Mesh(
      track(new THREE.CylinderGeometry(bog.radius, bog.radius * 1.04, 0.06, 28)),
      bogMat
    );
    pool.position.set(bog.x, 0.03, bog.z);
    const rim = new THREE.Mesh(
      track(new THREE.TorusGeometry(bog.radius * 0.96, 0.055, 8, 32)),
      bogRimMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(bog.x, 0.065, bog.z);

    const bubble = new THREE.Mesh(
      track(new THREE.TorusGeometry(bog.radius * 0.45, 0.045, 8, 24)),
      bogRimMat
    );
    bubble.rotation.x = Math.PI / 2;
    bubble.position.set(bog.x, 0.075, bog.z);
    bogRipples.push(bubble);
    planetGroup.add(pool, rim, bubble);
  }

  // 4. Bioluminescent Alien Flora Clusters (teal glow mushrooms & crystal tufts)
  const stemMat = track(new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.6 }));
  const capMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x0d9488,
      emissiveIntensity: 1.05,
      roughness: 0.25
    })
  );
  const floraPositions: Array<[number, number, number]> = [
    [-7.5, -4.5, 1.0],
    [-16.2, -11.5, 1.2],
    [-5.5, -18.5, 0.95],
    [6.5, -5.5, 1.1],
    [16.2, -13.0, 1.25],
    [9.0, 4.0, 0.9],
    [-8.5, 4.2, 1.05],
    [6.5, -28.0, 1.15],
    [-6.5, -28.5, 1.15]
  ];
  const floraCaps: THREE.Mesh[] = [];
  for (const [fx, fz, scale] of floraPositions) {
    const gy = getPlanetGroundY(fx, fz);
    const g = new THREE.Group();
    g.position.set(fx, gy, fz);
    g.scale.setScalar(scale);
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.13, 0.9, 8)), stemMat);
    stem.position.y = 0.45;
    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(0.45, 0.34, 10)), capMat);
    cap.position.y = 0.95;
    floraCaps.push(cap);
    g.add(stem, cap);
    planetGroup.add(g);
  }

  // 5. Destructible Crystal Barricades (shatterable by Laser Emitter)
  const barrierCrystalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xd946ef,
      emissiveIntensity: 0.9,
      roughness: 0.16,
      metalness: 0.25
    })
  );
  const barrierGeo = track(new THREE.OctahedronGeometry(0.55, 0));
  const barriers: PlanetBarrierHandle[] = PLANET_CRYSTAL_BARRIERS.map((b) => {
    const group = new THREE.Group();
    group.position.set(b.x, b.y, b.z);
    [-0.52, 0, 0.52].forEach((ox, idx) => {
      const shard = new THREE.Mesh(barrierGeo, barrierCrystalMat);
      shard.position.set(ox, idx === 1 ? 0.92 : 0.65, idx === 1 ? 0 : (idx === 0 ? 0.18 : -0.18));
      shard.scale.set(0.75, idx === 1 ? 1.7 : 1.25, 0.75);
      shard.rotation.y = idx * 0.7;
      group.add(shard);
    });
    planetGroup.add(group);
    return { ...b, active: true, group };
  });

  // 6. Floating Energy Cores (Main Quest Collectibles)
  const coreGeo = track(new THREE.OctahedronGeometry(0.42, 0));
  const coreMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
      roughness: 0.12,
      metalness: 0.35
    })
  );
  const coreRingGeo = track(new THREE.TorusGeometry(0.62, 0.055, 8, 24));
  const coreRingMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.2
    })
  );

  const cores: PlanetCoreHandle[] = PLANET_CORES.map((c) => {
    const baseY = getPlanetGroundY(c.x, c.z) + c.hoverOffset;
    const group = new THREE.Group();
    group.position.set(c.x, baseY, c.z);
    const crystal = new THREE.Mesh(coreGeo, coreMat);
    const ring = new THREE.Mesh(coreRingGeo, coreRingMat);
    ring.rotation.x = Math.PI / 3;
    group.add(crystal, ring);
    planetGroup.add(group);
    return {
      id: c.id,
      name: c.name,
      x: c.x,
      baseY,
      z: c.z,
      active: true,
      group,
      ring
    };
  });

  // 7. Floating Golden Scrap Bolts
  const boltGeo = track(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 6));
  const boltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      roughness: 0.22,
      metalness: 0.82
    })
  );
  const bolts: PlanetBoltHandle[] = PLANET_BOLTS.map((b) => {
    const baseY = getPlanetGroundY(b.x, b.z) + b.hoverOffset;
    const mesh = new THREE.Mesh(boltGeo, boltMat);
    mesh.position.set(b.x, baseY, b.z);
    mesh.rotation.x = Math.PI / 2;
    planetGroup.add(mesh);
    return {
      id: b.id,
      x: b.x,
      baseY,
      z: b.z,
      homeX: b.x,
      homeY: baseY,
      homeZ: b.z,
      active: true,
      mesh
    };
  });

  // 8. Extraction Exit Gate + Vertical Beacon Beam
  const gateGroup = new THREE.Group();
  const gateY = getPlanetGroundY(PLANET_EXIT_GATE.x, PLANET_EXIT_GATE.z);
  gateGroup.position.set(PLANET_EXIT_GATE.x, gateY, PLANET_EXIT_GATE.z);

  const gatePillarMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.78 })
  );
  const exitRingMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.9,
      roughness: 0.2
    })
  );
  const exitPortalMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    })
  );
  const exitBeaconMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const pillarGeo = track(new RoundedBoxGeometry(0.58, 3.8, 0.58, 2, 0.08));
  [-2.05, 2.05].forEach((px) => {
    const pMesh = new THREE.Mesh(pillarGeo, gatePillarMat);
    pMesh.position.set(px, 1.9, 0);
    gateGroup.add(pMesh);
  });
  const archTop = new THREE.Mesh(
    track(new RoundedBoxGeometry(4.7, 0.55, 0.65, 2, 0.08)),
    gatePillarMat
  );
  archTop.position.set(0, 3.9, 0);
  const gateRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.75, 0.14, 12, 32)), exitRingMat);
  gateRing.position.set(0, 2.0, 0);
  const exitPortalMesh = new THREE.Mesh(track(new THREE.CircleGeometry(1.62, 28)), exitPortalMat);
  exitPortalMesh.position.set(0, 2.0, 0);
  const exitBeaconMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.65, 1.35, 24, 16, 1, true)),
    exitBeaconMat
  );
  exitBeaconMesh.position.set(0, 12.2, 0);
  gateGroup.add(archTop, gateRing, exitPortalMesh, exitBeaconMesh);
  planetGroup.add(gateGroup);

  // 9. Robot Magnet Field Aura & Laser Beam Pulse VFX (attached/positioned dynamically)
  const magnetAuraMesh = new THREE.Mesh(
    track(new THREE.TorusGeometry(2.1, 0.05, 8, 36)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
  );
  magnetAuraMesh.rotation.x = Math.PI / 2;
  magnetAuraMesh.visible = false;
  planetGroup.add(magnetAuraMesh);

  const laserBeamMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.11, 0.16, 9.0, 10)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
  );
  laserBeamMesh.visible = false;
  planetGroup.add(laserBeamMesh);

  const setGateUnlocked = (unlocked: boolean) => {
    if (unlocked) {
      exitRingMat.color.setHex(0x34d399);
      exitRingMat.emissive.setHex(0x10b981);
      exitRingMat.emissiveIntensity = 1.85;
      exitPortalMat.color.setHex(0x22d3ee);
      exitPortalMat.opacity = 0.72;
      exitBeaconMat.opacity = 0.34;
    } else {
      exitRingMat.color.setHex(0xf59e0b);
      exitRingMat.emissive.setHex(0xb45309);
      exitRingMat.emissiveIntensity = 0.9;
      exitPortalMat.color.setHex(0x64748b);
      exitPortalMat.opacity = 0.16;
      exitBeaconMat.opacity = 0.0;
    }
  };

  const resetCollectibles = () => {
    for (const c of cores) {
      c.active = true;
      c.group.visible = true;
      c.group.position.set(c.x, c.baseY, c.z);
    }
    for (const b of bolts) {
      b.active = true;
      b.x = b.homeX;
      b.z = b.homeZ;
      b.mesh.visible = true;
      b.mesh.position.set(b.homeX, b.homeY, b.homeZ);
    }
    for (const bar of barriers) {
      bar.active = true;
      bar.group.visible = true;
    }
    laserBeamMesh.visible = false;
    setGateUnlocked(false);
  };

  setGateUnlocked(false);

  return {
    planetGroup,
    cores,
    bolts,
    barriers,
    exitPortalMesh,
    exitBeaconMesh,
    exitRingMat,
    exitPortalMat,
    exitBeaconMat,
    magnetAuraMesh,
    laserBeamMesh,
    bogRipples,
    floraCaps,
    setGateUnlocked,
    resetCollectibles,
    dispose: () => {
      for (const item of disposables) item.dispose();
    }
  };
}
