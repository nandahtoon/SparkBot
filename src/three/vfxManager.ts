import * as THREE from 'three';
import type { PartId } from '../game/engine';
import type { GraphicsQualityBudget } from '../game/graphicsConfig';
import { scaleParticleCount } from '../game/graphicsConfig';
import { createPartPlacement3DBurst, evaluatePuffScale } from '../game/partParticles';
import {
  computeActionTrailEmitConfig,
  computeRibbonSegmentSample,
  computeTrailEmitterOffsets,
  createActionTrailSpawnSample,
  evaluateTrailParticleTransform
} from '../game/actionTrail';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface SparkParticle {
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
}

interface PuffParticle {
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
}

interface TrailParticle {
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
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  color: number;
}

interface SlipstreamRibbon {
  mesh: THREE.Mesh;
  positions: Float32Array;
  colors: Float32Array;
  history: Array<{ x: number; y: number; z: number; roll: number; color: number; halfWidth: number }>;
  count: number;
}

/**
 * Zero-GC unified 3D VFX & Particle Pool Manager.
 * Consolidates instanced sparks, pastel puffs, Action Dash plasma speed streaks,
 * continuous slipstream ribbons, and expanding 3D shockwave/landing rings.
 */
export class VfxManager {
  private readonly sparkInst: THREE.InstancedMesh;
  private readonly sparks: SparkParticle[] = [];
  private sparkCursor = 0;

  private readonly puffInst: THREE.InstancedMesh;
  private readonly puffs: PuffParticle[] = [];
  private puffCursor = 0;
  private placementBurstSeq = 0;

  private readonly trailInst: THREE.InstancedMesh;
  private readonly trailParticles: TrailParticle[] = [];
  private trailCursor = 0;
  private trailEmitAccum = 0;
  private trailSpawnSeq = 0;

  private readonly ringInst: THREE.InstancedMesh;
  private readonly rings: ShockwaveRing[] = [];
  private ringCursor = 0;

  private readonly trailRibbons: SlipstreamRibbon[] = [];
  private ribbonSampleAccum = 0;

  constructor(scene: THREE.Scene) {
    // 1. Welding / Crystal / Confetti Spark Pool (72 instanced glowing octahedrons)
    const sparkCount = 72;
    this.sparkInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.095, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      sparkCount
    );
    this.sparkInst.frustumCulled = false;
    scene.add(this.sparkInst);
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

    // 2. Soft 3D Pastel Puff Pool (48 puffy icosahedrons for part snaps & landings)
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
    scene.add(this.puffInst);
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

    // 3. Action Dash Slender Plasma Speed-Streak Pool (160 additive glowing needles)
    const trailCount = 160;
    this.trailInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.052, 0),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }),
      trailCount
    );
    this.trailInst.frustumCulled = false;
    scene.add(this.trailInst);
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

    // 4. Expanding 3D Shockwave & Landing Pulse Ring Pool (18 additive torus rings)
    const ringCount = 18;
    const ringGeo = new THREE.TorusGeometry(0.45, 0.032, 8, 28);
    ringGeo.rotateX(Math.PI / 2);
    this.ringInst = new THREE.InstancedMesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }),
      ringCount
    );
    this.ringInst.frustumCulled = false;
    scene.add(this.ringInst);
    for (let i = 0; i < ringCount; i++) {
      this.rings.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        life: 0,
        maxLife: 0.45,
        startScale: 0.45,
        endScale: 2.1,
        color: 0x38bdf8
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.ringInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(0x38bdf8);
      this.ringInst.setColorAt(i, _color);
    }
    this.ringInst.instanceMatrix.needsUpdate = true;
    if (this.ringInst.instanceColor) this.ringInst.instanceColor.needsUpdate = true;

    // 5. Three Continuous Curved Neon Slipstream Ribbons
    const ribbonPoints = 16;
    const ribbonMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.64,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
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
      scene.add(mesh);
      const history: SlipstreamRibbon['history'] = [];
      for (let p = 0; p < ribbonPoints; p++) {
        history.push({ x: 0, y: -50, z: 0, roll: 0, color: 0x38bdf8, halfWidth: 0.14 });
      }
      this.trailRibbons.push({ mesh, positions, colors, history, count: 0 });
    }
  }

  public emitSparks(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    budget: GraphicsQualityBudget,
    spread = 2.4
  ): void {
    const scaledCount = scaleParticleCount(count, budget.sparkScale, 1);
    for (let i = 0; i < scaledCount; i++) {
      const p = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const a = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * spread;
      p.vx = Math.cos(a) * spd;
      p.vy = 1.2 + Math.random() * (spread * 1.1);
      p.vz = Math.sin(a) * spd;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.4;
      p.color = colorHex;
    }
  }

  public emitConfetti(
    x: number,
    y: number,
    z: number,
    budget: GraphicsQualityBudget,
    count = 36
  ): void {
    const scaledCount = scaleParticleCount(count, budget.confettiScale, 2);
    const palette = [0x38bdf8, 0xfbbf24, 0xf472b6, 0x34d399, 0xa78bfa];
    for (let i = 0; i < scaledCount; i++) {
      const p = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.6;
      p.y = y + 0.6;
      p.z = z + (Math.random() - 0.5) * 0.6;
      p.vx = (Math.random() - 0.5) * 4.2;
      p.vy = 2.8 + Math.random() * 3.5;
      p.vz = (Math.random() - 0.5) * 4.2;
      p.life = 0;
      p.maxLife = 0.9 + Math.random() * 0.6;
      p.color = palette[i % palette.length];
    }
  }

  public emitPartPlacementBurst(
    part: PartId,
    x: number,
    y: number,
    z: number,
    budget: GraphicsQualityBudget
  ): void {
    const specs = createPartPlacement3DBurst(part, ++this.placementBurstSeq, budget.lowGraphics);
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      if (sp.kind === 'puff') {
        const puff = this.puffs[this.puffCursor];
        this.puffCursor = (this.puffCursor + 1) % this.puffs.length;
        puff.active = true;
        puff.x = x + sp.ox;
        puff.y = y + sp.oy;
        puff.z = z + sp.oz;
        puff.vx = sp.vx;
        puff.vy = sp.vy;
        puff.vz = sp.vz;
        puff.life = 0;
        puff.maxLife = sp.maxLife;
        puff.baseScale = sp.baseScale;
        puff.color = sp.colorHex;
      } else {
        const spark = this.sparks[this.sparkCursor];
        this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
        spark.active = true;
        spark.x = x + sp.ox;
        spark.y = y + sp.oy;
        spark.z = z + sp.oz;
        spark.vx = sp.vx;
        spark.vy = sp.vy;
        spark.vz = sp.vz;
        spark.life = 0;
        spark.maxLife = sp.maxLife;
        spark.color = sp.colorHex;
      }
    }
  }

  public emitPuffs(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    budget: GraphicsQualityBudget,
    spread = 1.4
  ): void {
    const scaled = scaleParticleCount(count, budget.puffScale, 1);
    for (let i = 0; i < scaled; i++) {
      const puff = this.puffs[this.puffCursor];
      this.puffCursor = (this.puffCursor + 1) % this.puffs.length;
      const angle = (i / Math.max(1, scaled)) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 0.55 + Math.random() * spread;
      puff.active = true;
      puff.x = x + Math.cos(angle) * 0.16;
      puff.y = y + 0.08;
      puff.z = z + Math.sin(angle) * 0.16;
      puff.vx = Math.cos(angle) * spd;
      puff.vy = 0.4 + Math.random() * 0.65;
      puff.vz = Math.sin(angle) * spd;
      puff.life = 0;
      puff.maxLife = 0.36 + Math.random() * 0.22;
      puff.baseScale = 0.72 + Math.random() * 0.45;
      puff.color = colorHex;
    }
  }

  public emitShockwaveRing(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    startScale = 0.45,
    endScale = 2.2,
    duration = 0.42
  ): void {
    const ring = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.z = z;
    ring.life = 0;
    ring.maxLife = Math.max(0.18, duration);
    ring.startScale = startScale;
    ring.endScale = endScale;
    ring.color = colorHex;
  }

  public resetActionTrails(): void {
    this.trailEmitAccum = 0;
    this.ribbonSampleAccum = 0;
    for (let i = 0; i < this.trailParticles.length; i++) {
      this.trailParticles[i].active = false;
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.trailInst.setMatrixAt(i, _dummy.matrix);
    }
    this.trailInst.instanceMatrix.needsUpdate = true;
    for (let r = 0; r < this.trailRibbons.length; r++) {
      this.trailRibbons[r].count = 0;
      this.trailRibbons[r].mesh.visible = false;
    }
  }

  public trimRibbonsToBudget(budget: GraphicsQualityBudget): void {
    const maxRibbons = budget.maxRibbonCount;
    for (let r = maxRibbons; r < this.trailRibbons.length; r++) {
      this.trailRibbons[r].count = 0;
      this.trailRibbons[r].mesh.visible = false;
    }
  }

  public spawnActionTrailBurst(
    params: {
      speed: number;
      surface: 'floor' | 'leftWall' | 'rightWall';
      isAirborne: boolean;
      turboActive: boolean;
      hasThrusters: boolean;
      hasBooster: boolean;
      hasMagnet: boolean;
      botX: number;
      botY: number;
      botZ: number;
      botVx: number;
      botVy: number;
      botRoll: number;
    },
    budget: GraphicsQualityBudget,
    overrideColor?: number,
    countOverride?: number
  ): void {
    const cfg = computeActionTrailEmitConfig({
      speed: params.speed,
      surface: params.surface,
      isAirborne: params.isAirborne,
      turboActive: params.turboActive,
      hasBooster: params.hasBooster,
      hasMagnet: params.hasMagnet,
      lowGraphics: budget.lowGraphics
    });
    const emitters = computeTrailEmitterOffsets(
      params.botRoll,
      params.hasThrusters,
      params.hasBooster
    );
    const total =
      countOverride !== undefined
        ? scaleParticleCount(countOverride, budget.trailBurstScale, 2)
        : cfg.burstCount;
    for (let i = 0; i < total; i++) {
      const anchor = emitters[i % emitters.length];
      const seq = ++this.trailSpawnSeq;
      const sample = createActionTrailSpawnSample({
        botX: params.botX,
        botY: params.botY,
        botZ: params.botZ,
        botVx: params.botVx,
        botVy: params.botVy,
        speed: params.speed,
        anchor,
        config: cfg,
        jitterX: Math.random() * 2 - 1,
        jitterY: Math.random() * 2 - 1,
        colorIdx: seq,
        lifeJitter: Math.random()
      });
      const tr = this.trailParticles[this.trailCursor];
      this.trailCursor = (this.trailCursor + 1) % this.trailParticles.length;
      tr.active = true;
      tr.x = sample.x;
      tr.y = sample.y;
      tr.z = sample.z;
      tr.vx = sample.vx * 1.45;
      tr.vy = sample.vy * 1.35 + (params.isAirborne ? -0.5 : 0.25);
      tr.vz = sample.vz * 1.15;
      tr.life = 0;
      tr.maxLife = sample.maxLife * 1.15;
      tr.baseWidth = sample.baseWidth * 1.15;
      tr.streakLength = sample.streakLength * 1.25;
      tr.color = overrideColor ?? sample.color;
      tr.spin = sample.spin;
      tr.roll = params.botRoll;
    }
  }

  public updateActionRunnerTrails(
    dt: number,
    params: {
      speed: number;
      surface: 'floor' | 'leftWall' | 'rightWall';
      isAirborne: boolean;
      turboActive: boolean;
      hasThrusters: boolean;
      hasBooster: boolean;
      hasMagnet: boolean;
      botX: number;
      botY: number;
      botZ: number;
      botVx: number;
      botVy: number;
      botRoll: number;
    },
    budget: GraphicsQualityBudget
  ): void {
    const trailCfg = computeActionTrailEmitConfig({
      speed: params.speed,
      surface: params.surface,
      isAirborne: params.isAirborne,
      turboActive: params.turboActive,
      hasBooster: params.hasBooster,
      hasMagnet: params.hasMagnet,
      lowGraphics: budget.lowGraphics
    });
    const emitters = computeTrailEmitterOffsets(
      params.botRoll,
      params.hasThrusters,
      params.hasBooster
    );

    this.trailEmitAccum += dt * trailCfg.spawnRatePerSec;
    const toSpawn = Math.min(8, Math.floor(this.trailEmitAccum));
    if (toSpawn > 0) {
      this.trailEmitAccum -= toSpawn;
      for (let s = 0; s < toSpawn; s++) {
        const seq = ++this.trailSpawnSeq;
        const anchor = emitters[seq % emitters.length];
        const sample = createActionTrailSpawnSample({
          botX: params.botX,
          botY: params.botY,
          botZ: params.botZ,
          botVx: params.botVx,
          botVy: params.botVy,
          speed: params.speed,
          anchor,
          config: trailCfg,
          jitterX: Math.random() * 2 - 1,
          jitterY: Math.random() * 2 - 1,
          colorIdx: seq,
          lifeJitter: Math.random()
        });
        const tr = this.trailParticles[this.trailCursor];
        this.trailCursor = (this.trailCursor + 1) % this.trailParticles.length;
        tr.active = true;
        tr.x = sample.x;
        tr.y = sample.y;
        tr.z = sample.z;
        tr.vx = sample.vx;
        tr.vy = sample.vy;
        tr.vz = sample.vz;
        tr.life = 0;
        tr.maxLife = sample.maxLife;
        tr.baseWidth = sample.baseWidth;
        tr.streakLength = sample.streakLength;
        tr.color = sample.color;
        tr.spin = sample.spin;
        tr.roll = params.botRoll;
      }
    }

    const activeRibbonLimit = Math.min(emitters.length, budget.maxRibbonCount);
    const primaryColor = trailCfg.palette[0] ?? 0x38bdf8;
    const secondaryColor = trailCfg.palette[1] ?? primaryColor;
    const baseRibbonHalfWidth =
      trailCfg.state === 'turbo'
        ? 0.16
        : trailCfg.state === 'wallrun'
          ? 0.13
          : trailCfg.state === 'airborne'
            ? 0.12
            : 0.1;

    this.ribbonSampleAccum += dt;
    if (this.ribbonSampleAccum >= 0.022) {
      this.ribbonSampleAccum = 0;
      for (let rIdx = 0; rIdx < this.trailRibbons.length; rIdx++) {
        const rb = this.trailRibbons[rIdx];
        if (rIdx >= activeRibbonLimit) {
          rb.count = 0;
          rb.mesh.visible = false;
          continue;
        }
        const em = emitters[rIdx];
        for (let p = rb.history.length - 1; p > 0; p--) {
          const dst = rb.history[p];
          const src = rb.history[p - 1];
          dst.x = src.x;
          dst.y = src.y;
          dst.z = src.z;
          dst.roll = src.roll;
          dst.color = src.color;
          dst.halfWidth = src.halfWidth;
        }
        rb.history[0].x = params.botX + em.offsetX;
        rb.history[0].y = params.botY + em.offsetY;
        rb.history[0].z = params.botZ + em.offsetZ;
        rb.history[0].roll = params.botRoll;
        rb.history[0].color = rIdx === 2 ? secondaryColor : primaryColor;
        rb.history[0].halfWidth = baseRibbonHalfWidth * (rIdx === 2 ? 1.25 : 0.92);
        rb.count = Math.min(rb.history.length, rb.count + 1);
      }
    }

    for (let rIdx = 0; rIdx < this.trailRibbons.length; rIdx++) {
      const rb = this.trailRibbons[rIdx];
      if (rIdx >= activeRibbonLimit || rb.count < 2) {
        rb.mesh.visible = false;
        continue;
      }
      rb.mesh.visible = true;
      const totalPts = rb.history.length;
      const denom = Math.max(1, totalPts - 1);
      for (let p = 0; p < totalPts; p++) {
        const clampedIdx = Math.min(p, rb.count - 1);
        const h = rb.history[clampedIdx];
        const ageT = p / denom;
        const seg = computeRibbonSegmentSample(ageT, h.halfWidth, h.color);
        const cosR = Math.cos(h.roll);
        const sinR = Math.sin(h.roll);
        const sideX = cosR * seg.halfWidth;
        const sideY = sinR * seg.halfWidth;
        const vBase = p * 6;
        rb.positions[vBase] = h.x - sideX;
        rb.positions[vBase + 1] = h.y - sideY;
        rb.positions[vBase + 2] = h.z;
        rb.positions[vBase + 3] = h.x + sideX;
        rb.positions[vBase + 4] = h.y + sideY;
        rb.positions[vBase + 5] = h.z;

        const glowBoost = 1.2;
        rb.colors[vBase] = seg.r * glowBoost;
        rb.colors[vBase + 1] = seg.g * glowBoost;
        rb.colors[vBase + 2] = seg.b * glowBoost;
        rb.colors[vBase + 3] = seg.r * glowBoost;
        rb.colors[vBase + 4] = seg.g * glowBoost;
        rb.colors[vBase + 5] = seg.b * glowBoost;
      }
      (rb.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (rb.mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public update(dt: number): void {
    // 1. Update Instanced Sparks
    let sparkDirty = false;
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
        sparkDirty = true;
        continue;
      }
      sp.vy -= 9.5 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      const sc = Math.max(0.01, 1 - sp.life / sp.maxLife);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.rotation.set(sp.life * 8, sp.life * 6, 0);
      _dummy.scale.setScalar(sc);
      _dummy.updateMatrix();
      this.sparkInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(sp.color).multiplyScalar(1.35);
      this.sparkInst.setColorAt(i, _color);
      sparkDirty = true;
    }
    if (sparkDirty) {
      this.sparkInst.instanceMatrix.needsUpdate = true;
      if (this.sparkInst.instanceColor) this.sparkInst.instanceColor.needsUpdate = true;
    }

    // 2. Update Soft 3D Pastel Puffs
    let puffDirty = false;
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
        puffDirty = true;
        continue;
      }
      pf.vx *= puffDrag;
      pf.vz *= puffDrag;
      pf.vy += 0.45 * dt;
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.z += pf.vz * dt;
      const progress = pf.life / pf.maxLife;
      const sc = Math.max(0.001, evaluatePuffScale(progress) * pf.baseScale);
      _dummy.position.set(pf.x, pf.y, pf.z);
      _dummy.rotation.set(pf.life * 2.2, pf.life * 1.8, 0);
      _dummy.scale.setScalar(sc);
      _dummy.updateMatrix();
      this.puffInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(pf.color);
      this.puffInst.setColorAt(i, _color);
      puffDirty = true;
    }
    if (puffDirty) {
      this.puffInst.instanceMatrix.needsUpdate = true;
      if (this.puffInst.instanceColor) this.puffInst.instanceColor.needsUpdate = true;
    }

    // 3. Update Action Dash Plasma Speed Streaks
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
      _color.setHex(tr.color).multiplyScalar(xf.brightness * 1.25);
      this.trailInst.setColorAt(i, _color);
      trailMatrixDirty = true;
      trailColorDirty = true;
    }
    if (trailMatrixDirty) this.trailInst.instanceMatrix.needsUpdate = true;
    if (trailColorDirty && this.trailInst.instanceColor) {
      this.trailInst.instanceColor.needsUpdate = true;
    }

    // 4. Update Expanding 3D Shockwave & Landing Rings
    let ringDirty = false;
    for (let i = 0; i < this.rings.length; i++) {
      const rg = this.rings[i];
      if (!rg.active) continue;
      rg.life += dt;
      if (rg.life >= rg.maxLife) {
        rg.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.ringInst.setMatrixAt(i, _dummy.matrix);
        ringDirty = true;
        continue;
      }
      const t = rg.life / rg.maxLife;
      const easeOut = 1 - Math.pow(1 - t, 3);
      const radiusScale = THREE.MathUtils.lerp(rg.startScale, rg.endScale, easeOut);
      const thicknessScale = Math.max(0.05, 1 - t);
      _dummy.position.set(rg.x, rg.y + 0.04, rg.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(radiusScale, thicknessScale, radiusScale);
      _dummy.updateMatrix();
      this.ringInst.setMatrixAt(i, _dummy.matrix);
      _color.setHex(rg.color).multiplyScalar((1 - t) * 1.5);
      this.ringInst.setColorAt(i, _color);
      ringDirty = true;
    }
    if (ringDirty) {
      this.ringInst.instanceMatrix.needsUpdate = true;
      if (this.ringInst.instanceColor) this.ringInst.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.sparkInst.geometry.dispose();
    (this.sparkInst.material as THREE.Material).dispose();
    this.puffInst.geometry.dispose();
    (this.puffInst.material as THREE.Material).dispose();
    this.trailInst.geometry.dispose();
    (this.trailInst.material as THREE.Material).dispose();
    this.ringInst.geometry.dispose();
    (this.ringInst.material as THREE.Material).dispose();
    const disposedMats = new Set<THREE.Material>();
    for (const rb of this.trailRibbons) {
      rb.mesh.geometry.dispose();
      const mat = rb.mesh.material as THREE.Material;
      if (!disposedMats.has(mat)) {
        mat.dispose();
        disposedMats.add(mat);
      }
    }
  }
}
