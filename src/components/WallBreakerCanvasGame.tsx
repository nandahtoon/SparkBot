import React, { useEffect, useRef, useState } from 'react';
import { Flame, Heart, Layers, Star, Timer, Zap } from 'lucide-react';
import { BOT_CHARACTERS, type BotCharacterId } from '../game/engine';
import {
  computeWallBreakerReward,
  createWallBreakerLayout,
  findBombBlastTargets,
  pickWallPowerUpKind,
  type WallBrick,
  type WallPowerUpKind
} from '../game/arcadeGames';
import { getShopItemById, type DroneId } from '../game/shopAndQuests';
import { SFX } from '../game/audio';

interface WallBreakerCanvasGameProps {
  activeCharacter: BotCharacterId;
  equippedDroneId?: DroneId | null;
  onFinish: (score: number, bolts: number, won: boolean, detail: string) => void;
}

interface PlasmaOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
  stuckTimer: number;
  trail: Array<{ x: number; y: number }>;
}

interface PowerUpCapsule {
  x: number;
  y: number;
  vy: number;
  kind: WallPowerUpKind;
  phase: number;
}

interface LaserBolt {
  x: number;
  y: number;
  vy: number;
  color: string;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ShockwaveRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingCallout {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface MegaBeamFx {
  x: number;
  life: number;
  maxLife: number;
}

interface DroneZapFx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  color: string;
}

interface PatrolGuardian {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  stunTimer: number;
}

const POWERUP_VISUALS: Record<
  WallPowerUpKind,
  { bg: string; border: string; text: string; glyph: string; label: string }
> = {
  wide: { bg: '#10b981', border: '#a7f3d0', text: '#022c22', glyph: '↔', label: '↔ WIDE!' },
  multi: { bg: '#06b6d4', border: '#a5f3fc', text: '#083344', glyph: '×3', label: '×3!' },
  laser: { bg: '#f43f5e', border: '#fecdd3', text: '#fff1f2', glyph: '▲▲', label: '▲▲ LASER!' },
  fire: { bg: '#f59e0b', border: '#fef08a', text: '#451a03', glyph: '★', label: '★ COMET!' },
  bolt: { bg: '#eab308', border: '#fef9c3', text: '#422006', glyph: '⚡', label: '+35 ⚡' }
};

export const WallBreakerCanvasGame: React.FC<WallBreakerCanvasGameProps> = ({
  activeCharacter,
  equippedDroneId = null,
  onFinish
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const megaTriggerRef = useRef<(() => void) | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const charDef = BOT_CHARACTERS[activeCharacter] || BOT_CHARACTERS.sparkbot;

  const [hud, setHud] = useState({
    score: 0,
    lives: 3,
    timeLeft: 60,
    remaining: 21,
    stage: 1,
    combo: 0,
    overcharge: 0,
    wideLeft: 0,
    laserLeft: 0,
    fireLeft: 0
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let arenaW = Math.max(320, Math.floor(container.clientWidth || window.innerWidth));
    let arenaH = Math.max(360, Math.floor(container.clientHeight || window.innerHeight - 48));
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const configureCanvas = (w: number, h: number) => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    configureCanvas(arenaW, arenaH);

    // Pre-generate static starfield (zero per-frame allocation)
    const stars = Array.from({ length: 42 }, (_, idx) => ({
      nx: ((idx * 97 + 13) % 100) / 100,
      ny: ((idx * 53 + 29) % 100) / 100,
      r: (idx % 3 === 0 ? 1.8 : 1.05),
      phase: idx * 0.9
    }));

    const droneItem = equippedDroneId ? getShopItemById(equippedDroneId) : null;
    const getBaseShieldW = (w: number) => Math.max(96, Math.min(164, w * 0.25));
    const getRobotBaseY = (h: number) => h - Math.max(58, Math.min(82, h * 0.11));
    const getSpeedScale = (w: number, h: number) => Math.max(0.88, Math.min(1.42, Math.hypot(w, h) / 840));

    let baseShieldW = getBaseShieldW(arenaW);
    let shieldW = baseShieldW;
    const shieldH = 12;
    let robotY = getRobotBaseY(arenaH);
    let shieldY = robotY - 30;
    let robotX = arenaW / 2;
    let prevRobotX = robotX;
    let robotVx = 0;
    let robotTilt = 0;
    let robotBounce = 0;
    let robotMood: 'normal' | 'happy' | 'dizzy' = 'normal';
    let robotMoodTimer = 0;
    let speedScale = getSpeedScale(arenaW, arenaH);

    // Helper Drone wingman state (from Bolt Shop!)
    let droneX = robotX + 64;
    let droneY = robotY - 38;
    let droneZapCooldown = 4.2;

    // Wall & gameplay state
    let bricks: WallBrick[] = createWallBreakerLayout(arenaW, arenaH, 1);
    const ballR = 8.5;
    let orbs: PlasmaOrb[] = [
      {
        x: robotX,
        y: shieldY - ballR - 4,
        vx: 195 * speedScale,
        vy: -265 * speedScale,
        stuck: true,
        stuckTimer: 0,
        trail: []
      }
    ];

    let score = 0;
    let lives = 3;
    let timeLeft = 60;
    let stage = 1;
    let combo = 0;
    let overcharge = 0; // 0..100
    let wideTimer = 0;
    let laserTimer = 0;
    let laserShootCd = 0;
    let fireTimer = 0;
    let dropCounter = 0;
    let shakeMag = 0;
    let wallFlashLeft = 0;
    let wallFlashRight = 0;
    let wallFlashTop = 0;
    let stageBannerText = '1 / 2';
    let stageBannerTimer = 1.6;
    let slideHintTimer = 3.8;
    let hasMovedRobot = false;
    let elapsed = 0;
    let ended = false;
    let hudTimer = 0;

    // Stage 2 Patrol Guard Drone
    let guardian: PatrolGuardian | null = null;
    const spawnGuardian = () => {
      const lowestY = bricks.reduce((m, b) => Math.max(m, b.y + b.h), 180);
      guardian = {
        x: arenaW * 0.5,
        y: Math.min(shieldY - 96, lowestY + 34),
        w: Math.max(58, Math.min(82, arenaW * 0.14)),
        h: 16,
        vx: 125 * speedScale,
        stunTimer: 0
      };
    };

    const capsules: PowerUpCapsule[] = [];
    const lasers: LaserBolt[] = [];
    const sparks: SparkParticle[] = [];
    const rings: ShockwaveRing[] = [];
    const callouts: FloatingCallout[] = [];
    const megaBeams: MegaBeamFx[] = [];
    const droneZaps: DroneZapFx[] = [];
    const keys = { left: false, right: false };

    const addShake = (amount: number) => {
      if (prefersReducedMotion) return;
      shakeMag = Math.min(9, Math.max(shakeMag, amount));
    };

    const spawnSparks = (x: number, y: number, color: string, count = 10, maxSpeed = 170) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.45;
        const spd = 55 + Math.random() * maxSpeed;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.45,
          maxLife: 0.45,
          size: 2.5 + Math.random() * 3,
          color
        });
      }
    };

    const spawnRing = (x: number, y: number, color: string, maxR = 46) => {
      rings.push({ x, y, r: 6, maxR, life: 0.34, maxLife: 0.34, color });
    };

    const spawnCallout = (x: number, y: number, text: string, color: string, scale = 1) => {
      callouts.push({
        x: Math.max(46, Math.min(arenaW - 46, x)),
        y,
        vy: -42,
        text,
        color,
        life: 0.95,
        maxLife: 0.95,
        scale
      });
    };

    const launchStuckOrbs = () => {
      let launched = false;
      for (const orb of orbs) {
        if (orb.stuck) {
          orb.stuck = false;
          const aim = Math.sin(elapsed * 2.6) * 0.55;
          const spd = 325 * speedScale;
          orb.vx = Math.sin(aim) * spd;
          orb.vy = -Math.cos(aim) * spd;
          launched = true;
        }
      }
      if (launched) {
        robotBounce = 0.7;
        SFX.mirror();
      }
    };

    const spawnExtraOrbs = (originX: number, originY: number, count: number) => {
      const spd = 335 * speedScale;
      for (let i = 0; i < count; i++) {
        if (orbs.length >= 3) break;
        const angle = (i === 0 ? -0.48 : 0.48) + (Math.random() - 0.5) * 0.16;
        orbs.push({
          x: originX,
          y: originY,
          vx: Math.sin(angle) * spd,
          vy: -Math.abs(Math.cos(angle) * spd),
          stuck: false,
          stuckTimer: 0,
          trail: []
        });
      }
    };

    const damageBrick = (brick: WallBrick, dmg: number, source: 'orb' | 'bomb' | 'laser' | 'mega' | 'drone') => {
      const idx = bricks.findIndex((b) => b.id === brick.id);
      if (idx < 0) return;
      brick.hp -= dmg;
      brick.hitFlash = 0.16;

      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;

      if (brick.hp > 0) {
        score += 5;
        spawnSparks(cx, cy, '#ffffff', 6, 120);
        SFX.click();
        return;
      }

      // Destroyed!
      bricks.splice(idx, 1);
      combo += 1;
      const comboMult = combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1;
      const gained = Math.round(brick.points * comboMult);
      score += gained;
      overcharge = Math.min(100, overcharge + (source === 'mega' ? 0 : 9));

      spawnSparks(cx, cy, brick.color, 13, 185);
      spawnRing(cx, cy, brick.color, 34);
      spawnCallout(cx, cy - 4, combo >= 3 ? `+${gained} ×${combo}!` : `+${gained}`, '#fde047', combo >= 3 ? 1.1 : 0.95);

      if (source !== 'bomb') SFX.crystal();

      // Special brick reactions!
      if (brick.kind === 'bomb') {
        addShake(7);
        spawnRing(cx, cy, '#f97316', 96);
        spawnSparks(cx, cy, '#fb923c', 22, 240);
        spawnCallout(cx, cy - 16, 'BOOM!', '#fb923c', 1.35);
        SFX.bugSquashed();
        const blastTargets = findBombBlastTargets(bricks, brick);
        for (const t of blastTargets) {
          damageBrick(t, 2, 'bomb');
        }
      } else if (brick.kind === 'prism') {
        spawnRing(cx, cy, '#c084fc', 64);
        spawnExtraOrbs(cx, cy, 1);
        spawnCallout(cx, cy - 14, '×2!', '#e879f9', 1.2);
        SFX.droneChirp(combo);
      }

      // Drop power-up capsule or bonus bolt
      if (brick.hasBonusBolt || brick.kind === 'bolt_vault') {
        const pKind = pickWallPowerUpKind(brick, dropCounter++);
        capsules.push({
          x: cx,
          y: cy,
          vy: 145 * speedScale,
          kind: pKind,
          phase: dropCounter * 1.1
        });
      }
    };

    const fireMegaLaser = () => {
      if (ended) return;
      if (overcharge < 100) {
        launchStuckOrbs();
        return;
      }
      overcharge = 0;
      robotBounce = 1.0;
      robotMood = 'happy';
      robotMoodTimer = 1.2;
      addShake(8);
      megaBeams.push({ x: robotX, life: 0.42, maxLife: 0.42 });
      spawnRing(robotX, shieldY, '#fde047', 74);
      spawnCallout(robotX, shieldY - 36, '⚡⚡⚡', '#fde047', 1.4);
      SFX.laserSolved();
      SFX.speakWallE('celebrate', charDef.voicePitch, 1);

      const beamHalfW = 28;
      const targets = bricks.filter((b) => {
        const bx = b.x + b.w / 2;
        return Math.abs(bx - robotX) <= beamHalfW + b.w * 0.45;
      });
      for (const b of targets) {
        damageBrick(b, 2, 'mega');
      }
      if (guardian && Math.abs(guardian.x - robotX) <= beamHalfW + guardian.w * 0.5) {
        guardian.stunTimer = 2.6;
        score += 45;
        spawnCallout(guardian.x, guardian.y - 14, '+45 ★', '#38bdf8', 1.15);
      }
    };
    megaTriggerRef.current = fireMegaLaser;

    const handleResize = () => {
      const nextW = Math.max(320, Math.floor(container.clientWidth || window.innerWidth));
      const nextH = Math.max(360, Math.floor(container.clientHeight || window.innerHeight - 48));
      if (Math.abs(nextW - arenaW) < 2 && Math.abs(nextH - arenaH) < 2) return;
      const sx = nextW / Math.max(1, arenaW);
      const sy = nextH / Math.max(1, arenaH);
      arenaW = nextW;
      arenaH = nextH;
      configureCanvas(arenaW, arenaH);

      baseShieldW = getBaseShieldW(arenaW);
      shieldW = wideTimer > 0 ? Math.min(arenaW * 0.42, baseShieldW * 1.42) : baseShieldW;
      robotY = getRobotBaseY(arenaH);
      shieldY = robotY - 30;
      speedScale = getSpeedScale(arenaW, arenaH);
      robotX = Math.max(shieldW / 2 + 12, Math.min(arenaW - shieldW / 2 - 12, robotX * sx));
      prevRobotX = robotX;

      for (const orb of orbs) {
        orb.x = Math.max(ballR + 10, Math.min(arenaW - ballR - 10, orb.x * sx));
        orb.y = Math.max(46 + ballR, Math.min(shieldY - ballR - 4, orb.y * sy));
        orb.trail = [];
      }
      for (const b of bricks) {
        b.x *= sx;
        b.y *= sy;
        b.w *= sx;
        b.h *= sy;
      }
      for (const c of capsules) {
        c.x *= sx;
        c.y *= sy;
      }
      if (guardian) {
        guardian.x *= sx;
        guardian.y *= sy;
        guardian.w = Math.max(58, Math.min(82, arenaW * 0.14));
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (overcharge >= 100) fireMegaLaser();
        else launchStuckOrbs();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * arenaW;
      const clamped = Math.max(shieldW / 2 + 12, Math.min(arenaW - shieldW / 2 - 12, relX));
      if (Math.abs(clamped - robotX) > 12) hasMovedRobot = true;
      robotX = clamped;
    };
    const onPointerDown = (e: PointerEvent) => {
      onPointerMove(e);
      launchStuckOrbs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);

    let last = performance.now();
    let rafId = 0;

    const finishRound = (won: boolean, detail: string) => {
      if (ended) return;
      ended = true;
      const bolts = computeWallBreakerReward(score, won);
      if (won) {
        SFX.laserSolved();
        SFX.speakWallE('celebrate', charDef.voicePitch, 0);
      }
      finishRef.current(score, bolts, won, detail);
    };

    // Draw the player's actual chosen Robot character holding its deflector shield!
    const drawHeroRobot = (
      x: number,
      y: number,
      sY: number,
      sW: number,
      tilt: number,
      bounce: number,
      lookX: number,
      lookY: number,
      t: number
    ) => {
      const squashX = 1 + bounce * 0.14;
      const squashY = 1 - bounce * 0.16;

      ctx.save();
      ctx.translate(x, y + bounce * 5);

      // Floor hover rail glow beneath robot
      const railGrad = ctx.createRadialGradient(0, 22, 2, 0, 22, 42);
      railGrad.addColorStop(0, `${charDef.accentCss}66`);
      railGrad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = railGrad;
      ctx.beginPath();
      ctx.ellipse(0, 22, 42, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dual hover-jet thruster flames
      const flameH = 9 + Math.sin(t * 42) * 3.5 + Math.min(8, Math.abs(robotVx) * 0.015);
      for (const side of [-11, 11]) {
        const fGrad = ctx.createLinearGradient(side, 12, side, 12 + flameH);
        fGrad.addColorStop(0, '#fef08a');
        fGrad.addColorStop(0.55, '#38bdf8');
        fGrad.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(side - 4.5, 12);
        ctx.lineTo(side + 4.5, 12);
        ctx.lineTo(side, 12 + flameH);
        ctx.closePath();
        ctx.fill();
      }

      ctx.rotate(tilt);
      ctx.scale(squashX, squashY);

      // Twin Shoulder Blasters when LASER power-up is active!
      if (laserTimer > 0) {
        for (const side of [-25, 25]) {
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(side - 4, -14, 8, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fda4af';
          ctx.beginPath();
          ctx.arc(side, -15, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Robot rounded chassis torso
      ctx.fillStyle = charDef.defaultBodyHex;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-18, -6, 36, 20, 9);
      ctx.fill();
      ctx.stroke();

      // Chest core badge (pulses gold when Overcharge is ready!)
      const coreColor = overcharge >= 100 ? '#fde047' : charDef.accentCss;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-9, -1, 18, 9, 4);
      ctx.fill();
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.roundRect(-7, 1, Math.max(3, 14 * (overcharge / 100)), 5, 2.5);
      ctx.fill();

      // Robot expressive arms reaching up to project the energy shield!
      ctx.strokeStyle = charDef.defaultAccentHex;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-17, 1);
      ctx.lineTo(-27, -15);
      ctx.moveTo(17, 1);
      ctx.lineTo(27, -15);
      ctx.stroke();

      // Glowing emitter palms
      for (const side of [-27, 27]) {
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(side, -16, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Robot head dome (character-styled!)
      ctx.fillStyle = charDef.defaultHeadHex;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-15, -24, 30, 19, 8);
      ctx.fill();
      ctx.stroke();

      // Character-specific head crest / antenna
      if (activeCharacter === 'sprout') {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.quadraticCurveTo(2, -31, 7, -33);
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(8, -33, 5, 2.6, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeCharacter === 'nova') {
        // Owl ear tufts
        ctx.fillStyle = charDef.defaultAccentHex;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 10, -23);
          ctx.lineTo(side * 15, -30);
          ctx.lineTo(side * 4, -24);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Classic glowing antenna
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, -31);
        ctx.stroke();
        ctx.fillStyle = overcharge >= 100 ? '#fde047' : charDef.accentCss;
        ctx.beginPath();
        ctx.arc(0, -32, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dark glass visor faceplate
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-12, -21, 24, 12, 5);
      ctx.fill();

      // Live tracking eyes inside visor!
      const dx = lookX - x;
      const dy = lookY - (y - 16);
      const dist = Math.max(1, Math.hypot(dx, dy));
      const pupilOffX = (dx / dist) * 2.2;
      const pupilOffY = (dy / dist) * 1.5;

      if (robotMood === 'dizzy') {
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.moveTo(ex - 2.5, -17.5);
          ctx.lineTo(ex + 2.5, -12.5);
          ctx.moveTo(ex + 2.5, -17.5);
          ctx.lineTo(ex - 2.5, -12.5);
          ctx.stroke();
        }
      } else if (robotMood === 'happy' || combo >= 3 || overcharge >= 100) {
        // Happy glowing arcs!
        ctx.strokeStyle = overcharge >= 100 ? '#fde047' : '#38bdf8';
        ctx.lineWidth = 2.4;
        for (const ex of [-5.5, 5.5]) {
          ctx.beginPath();
          ctx.arc(ex, -14, 3.3, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
      } else {
        for (const ex of [-5.5, 5.5]) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(ex + pupilOffX * 0.4, -15 + pupilOffY * 0.4, 3.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + pupilOffX, -15.4 + pupilOffY, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      // Holographic Curved Energy Deflector Shield projected above SparkBot's hands!
      ctx.save();
      const shieldColor =
        overcharge >= 100
          ? '#fde047'
          : wideTimer > 0
            ? '#34d399'
            : laserTimer > 0
              ? '#fb7185'
              : charDef.accentCss;

      // Energy tether beams from robot palms to shield ends
      ctx.strokeStyle = `${shieldColor}55`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 26, y - 15 + bounce * 5);
      ctx.lineTo(x - sW / 2 + 6, sY + 2);
      ctx.moveTo(x + 26, y - 15 + bounce * 5);
      ctx.lineTo(x + sW / 2 - 6, sY + 2);
      ctx.stroke();

      // Glowing shield bar
      ctx.shadowColor = shieldColor;
      ctx.shadowBlur = overcharge >= 100 ? 22 : 14;
      const barGrad = ctx.createLinearGradient(x - sW / 2, sY, x + sW / 2, sY);
      barGrad.addColorStop(0, shieldColor);
      barGrad.addColorStop(0.5, '#f8fafc');
      barGrad.addColorStop(1, shieldColor);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(x - sW / 2, sY - shieldH / 2 + bounce * 2.5, sW, shieldH, 7);
      ctx.fill();

      // Shield inner energy core stripe
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.roundRect(x - sW * 0.36, sY - 2.2 + bounce * 2.5, sW * 0.72, 4.4, 2.2);
      ctx.fill();

      // Shield side bumper caps
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 2;
      for (const sx of [x - sW / 2 + 3, x + sW / 2 - 3]) {
        ctx.beginPath();
        ctx.arc(sx, sY + bounce * 2.5, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawHelperDrone = (dx: number, dy: number, t: number) => {
      if (!droneItem) return;
      ctx.save();
      ctx.translate(dx, dy + Math.sin(t * 4.5) * 4);
      // Halo glow
      ctx.fillStyle = `${droneItem.primaryHex}33`;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = droneItem.accentHex;
      const wingFlap = Math.sin(t * 18) * 3;
      ctx.beginPath();
      ctx.ellipse(-11, wingFlap * 0.3, 6, 3, -0.35, 0, Math.PI * 2);
      ctx.ellipse(11, -wingFlap * 0.3, 6, 3, 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Orb body
      ctx.fillStyle = droneItem.primaryHex;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Visor eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 5.5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-2, -0.3, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -0.3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      elapsed += dt;
      if (ended) return;

      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        finishRound(score >= 150, `Smashed ${score} pts with ${charDef.name}!`);
        return;
      }

      // Power-up timers
      if (wideTimer > 0) wideTimer = Math.max(0, wideTimer - dt);
      if (laserTimer > 0) laserTimer = Math.max(0, laserTimer - dt);
      if (fireTimer > 0) fireTimer = Math.max(0, fireTimer - dt);
      if (robotMoodTimer > 0) {
        robotMoodTimer = Math.max(0, robotMoodTimer - dt);
        if (robotMoodTimer === 0) robotMood = 'normal';
      }
      if (stageBannerTimer > 0) stageBannerTimer = Math.max(0, stageBannerTimer - dt);
      if (slideHintTimer > 0) {
        slideHintTimer = Math.max(0, slideHintTimer - dt * (hasMovedRobot ? 4 : 1));
      }
      wallFlashLeft = Math.max(0, wallFlashLeft - dt * 3);
      wallFlashRight = Math.max(0, wallFlashRight - dt * 3);
      wallFlashTop = Math.max(0, wallFlashTop - dt * 3);
      shakeMag = Math.max(0, shakeMag - dt * 22);
      robotBounce = Math.max(0, robotBounce - dt * 5.2);

      const targetShieldW = wideTimer > 0 ? Math.min(arenaW * 0.42, baseShieldW * 1.42) : baseShieldW;
      shieldW += (targetShieldW - shieldW) * Math.min(1, dt * 10);

      // Robot movement & tilt physics
      const moveSpeed = Math.max(460, arenaW * 0.78);
      if (keys.left) {
        robotX -= moveSpeed * dt;
        hasMovedRobot = true;
      }
      if (keys.right) {
        robotX += moveSpeed * dt;
        hasMovedRobot = true;
      }
      robotX = Math.max(shieldW / 2 + 12, Math.min(arenaW - shieldW / 2 - 12, robotX));
      robotVx = (robotX - prevRobotX) / Math.max(0.001, dt);
      prevRobotX = robotX;
      const targetTilt = Math.max(-0.22, Math.min(0.22, robotVx * 0.00038));
      robotTilt += (targetTilt - robotTilt) * Math.min(1, dt * 12);

      // Auto-fire shoulder lasers when LASER power-up is active
      if (laserTimer > 0) {
        laserShootCd -= dt;
        if (laserShootCd <= 0) {
          laserShootCd = 0.42;
          lasers.push(
            { x: robotX - 25, y: robotY - 18, vy: -520 * speedScale, color: '#fb7185' },
            { x: robotX + 25, y: robotY - 18, vy: -520 * speedScale, color: '#fb7185' }
          );
          SFX.uiTick();
        }
      }

      // Helper Drone wingman follow & periodic assist zap!
      if (droneItem) {
        const targetDx = Math.max(24, Math.min(arenaW - 24, robotX + (robotX > arenaW * 0.7 ? -64 : 64)));
        const targetDy = robotY - 36;
        droneX += (targetDx - droneX) * Math.min(1, dt * 5.5);
        droneY += (targetDy - droneY) * Math.min(1, dt * 5.5);
        droneZapCooldown -= dt;
        if (droneZapCooldown <= 0 && bricks.length > 0) {
          droneZapCooldown = 5.2;
          const targetBrick = bricks[Math.floor(Math.random() * bricks.length)];
          const bx = targetBrick.x + targetBrick.w / 2;
          const by = targetBrick.y + targetBrick.h / 2;
          droneZaps.push({ x1: droneX, y1: droneY, x2: bx, y2: by, life: 0.25, color: droneItem.primaryHex });
          spawnCallout(droneX, droneY - 14, '⚡', droneItem.primaryHex, 1.05);
          SFX.droneChirp(1);
          damageBrick(targetBrick, 1, 'drone');
        }
      }

      // Stage 2 Patrol Guardian Drone movement
      if (guardian) {
        if (guardian.stunTimer > 0) {
          guardian.stunTimer = Math.max(0, guardian.stunTimer - dt);
        } else {
          guardian.x += guardian.vx * dt;
          if (guardian.x - guardian.w / 2 < 16) {
            guardian.x = 16 + guardian.w / 2;
            guardian.vx = Math.abs(guardian.vx);
          } else if (guardian.x + guardian.w / 2 > arenaW - 16) {
            guardian.x = arenaW - 16 - guardian.w / 2;
            guardian.vx = -Math.abs(guardian.vx);
          }
        }
      }

      // Update shoulder laser bolts
      for (let i = lasers.length - 1; i >= 0; i--) {
        const lz = lasers[i];
        lz.y += lz.vy * dt;
        let hit = false;
        for (let bi = bricks.length - 1; bi >= 0; bi--) {
          const b = bricks[bi];
          if (lz.x >= b.x && lz.x <= b.x + b.w && lz.y >= b.y && lz.y <= b.y + b.h) {
            damageBrick(b, 1, 'laser');
            hit = true;
            break;
          }
        }
        if (!hit && guardian && guardian.stunTimer <= 0) {
          if (
            Math.abs(lz.x - guardian.x) <= guardian.w / 2 &&
            Math.abs(lz.y - guardian.y) <= guardian.h / 2 + 4
          ) {
            guardian.stunTimer = 2.0;
            score += 30;
            spawnSparks(guardian.x, guardian.y, '#38bdf8', 12, 160);
            spawnCallout(guardian.x, guardian.y - 12, '+30 STUN!', '#38bdf8', 1.05);
            hit = true;
          }
        }
        if (hit || lz.y < 42) {
          lasers.splice(i, 1);
        }
      }

      // Update Plasma Orbs
      for (let oi = orbs.length - 1; oi >= 0; oi--) {
        const orb = orbs[oi];
        if (orb.stuck) {
          orb.x = robotX;
          orb.y = shieldY - shieldH / 2 - ballR - 3;
          orb.stuckTimer += dt;
          if (orb.stuckTimer >= 1.55) {
            launchStuckOrbs();
          }
          continue;
        }

        orb.trail.push({ x: orb.x, y: orb.y });
        if (orb.trail.length > 10) orb.trail.shift();

        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;

        // Side & top energy rails
        if (orb.x - ballR < 10) {
          orb.x = 10 + ballR;
          orb.vx = Math.abs(orb.vx);
          wallFlashLeft = 1;
          SFX.uiTick();
        } else if (orb.x + ballR > arenaW - 10) {
          orb.x = arenaW - 10 - ballR;
          orb.vx = -Math.abs(orb.vx);
          wallFlashRight = 1;
          SFX.uiTick();
        }
        if (orb.y - ballR < 42) {
          orb.y = 42 + ballR;
          orb.vy = Math.abs(orb.vy);
          wallFlashTop = 1;
          SFX.uiTick();
        }

        // Robot Deflector Shield bounce
        if (
          orb.vy > 0 &&
          orb.y + ballR >= shieldY - shieldH / 2 &&
          orb.y - ballR <= shieldY + shieldH / 2 + 8 &&
          orb.x >= robotX - shieldW / 2 - ballR &&
          orb.x <= robotX + shieldW / 2 + ballR
        ) {
          const hitOffset = Math.max(-1, Math.min(1, (orb.x - robotX) / (shieldW / 2)));
          const maxSpd = 490 * speedScale;
          const speed = Math.min(maxSpd, Math.max(305 * speedScale, Math.hypot(orb.vx, orb.vy) * 1.018));
          const angle = hitOffset * 1.05;
          orb.vx = Math.sin(angle) * speed;
          orb.vy = -Math.cos(angle) * speed;
          orb.y = shieldY - shieldH / 2 - ballR - 1;
          combo = 0; // Reset combo streak cleanly on paddle bounce
          robotBounce = 0.85;
          spawnSparks(orb.x, shieldY - 4, charDef.accentCss, 8, 130);
          spawnRing(orb.x, shieldY - 2, charDef.accentCss, 26);
          SFX.mirror();
        }

        // Stage 2 Patrol Guardian collision
        if (guardian && guardian.stunTimer <= 0) {
          const nearX = Math.max(guardian.x - guardian.w / 2, Math.min(orb.x, guardian.x + guardian.w / 2));
          const nearY = Math.max(guardian.y - guardian.h / 2, Math.min(orb.y, guardian.y + guardian.h / 2));
          const dx = orb.x - nearX;
          const dy = orb.y - nearY;
          if (dx * dx + dy * dy <= ballR * ballR) {
            if (Math.abs(dx) > Math.abs(dy)) orb.vx = -orb.vx;
            else orb.vy = -orb.vy;
            guardian.stunTimer = 2.2;
            score += 40;
            addShake(4);
            spawnSparks(guardian.x, guardian.y, '#f43f5e', 14, 175);
            spawnRing(guardian.x, guardian.y, '#fb7185', 44);
            spawnCallout(guardian.x, guardian.y - 16, '+40 ★', '#fb7185', 1.15);
            SFX.bugSquashed();
          }
        }

        // Brick collisions
        for (let bi = bricks.length - 1; bi >= 0; bi--) {
          const b = bricks[bi];
          const nearX = Math.max(b.x, Math.min(orb.x, b.x + b.w));
          const nearY = Math.max(b.y, Math.min(orb.y, b.y + b.h));
          const dx = orb.x - nearX;
          const dy = orb.y - nearY;
          if (dx * dx + dy * dy <= ballR * ballR) {
            const pierce = fireTimer > 0 && b.hp <= 1;
            if (!pierce) {
              if (Math.abs(dx) > Math.abs(dy)) orb.vx = -orb.vx;
              else orb.vy = -orb.vy;
            }
            damageBrick(b, fireTimer > 0 ? 2 : 1, 'orb');
            break;
          }
        }

        // Missed orb
        if (orb.y - ballR > arenaH + 18) {
          orbs.splice(oi, 1);
        }
      }

      // All orbs lost -> lose a life
      if (orbs.length === 0) {
        lives -= 1;
        combo = 0;
        robotMood = 'dizzy';
        robotMoodTimer = 1.1;
        addShake(5);
        if (lives <= 0) {
          finishRound(score >= 150, `${charDef.name} smashed ${score} pts!`);
          return;
        }
        orbs.push({
          x: robotX,
          y: shieldY - shieldH / 2 - ballR - 3,
          vx: 195 * speedScale,
          vy: -265 * speedScale,
          stuck: true,
          stuckTimer: 0,
          trail: []
        });
        SFX.chirpConfused();
      }

      // Power-up capsules
      for (let i = capsules.length - 1; i >= 0; i--) {
        const cap = capsules[i];
        cap.y += cap.vy * dt;
        cap.phase += dt * 5;
        if (
          Math.abs(cap.x - robotX) <= shieldW / 2 + 16 &&
          cap.y >= shieldY - 14 &&
          cap.y <= robotY + 24
        ) {
          const meta = POWERUP_VISUALS[cap.kind];
          robotBounce = 0.75;
          robotMood = 'happy';
          robotMoodTimer = 0.9;
          spawnSparks(cap.x, cap.y, meta.bg, 12, 165);
          spawnRing(cap.x, cap.y, meta.bg, 40);
          spawnCallout(robotX, shieldY - 26, meta.label, meta.border, 1.15);
          SFX.questClaim();

          if (cap.kind === 'wide') {
            wideTimer = 9;
          } else if (cap.kind === 'laser') {
            laserTimer = 8;
            laserShootCd = 0.1;
          } else if (cap.kind === 'fire') {
            fireTimer = 7;
          } else if (cap.kind === 'multi') {
            const refOrb = orbs[0];
            spawnExtraOrbs(refOrb ? refOrb.x : robotX, refOrb ? refOrb.y : shieldY - 18, 2);
          } else {
            score += 35;
            overcharge = Math.min(100, overcharge + 18);
          }
          capsules.splice(i, 1);
        } else if (cap.y > arenaH + 24) {
          capsules.splice(i, 1);
        }
      }

      // Stage clear check
      if (bricks.length === 0) {
        if (stage === 1) {
          stage = 2;
          score += 80;
          timeLeft = Math.min(60, timeLeft + 18);
          bricks = createWallBreakerLayout(arenaW, arenaH, 2);
          spawnGuardian();
          orbs = [
            {
              x: robotX,
              y: shieldY - shieldH / 2 - ballR - 3,
              vx: 210 * speedScale,
              vy: -285 * speedScale,
              stuck: true,
              stuckTimer: 0,
              trail: []
            }
          ];
          robotMood = 'happy';
          robotMoodTimer = 1.6;
          stageBannerText = '2 / 2';
          stageBannerTimer = 1.8;
          addShake(6);
          SFX.laserSolved();
          SFX.speakWallE('celebrate', charDef.voicePitch, 2);
        } else {
          score += 120;
          finishRound(true, `${charDef.name} smashed both Reactor Walls!`);
          return;
        }
      }

      // Update brick hit flash, sparks, rings, callouts, beams
      for (const b of bricks) {
        if (b.hitFlash && b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 180 * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.life -= dt;
        rg.r = rg.maxR * (1 - rg.life / rg.maxLife);
        if (rg.life <= 0) rings.splice(i, 1);
      }
      for (let i = callouts.length - 1; i >= 0; i--) {
        const co = callouts[i];
        co.y += co.vy * dt;
        co.life -= dt;
        if (co.life <= 0) callouts.splice(i, 1);
      }
      for (let i = megaBeams.length - 1; i >= 0; i--) {
        megaBeams[i].life -= dt;
        if (megaBeams[i].life <= 0) megaBeams.splice(i, 1);
      }
      for (let i = droneZaps.length - 1; i >= 0; i--) {
        droneZaps[i].life -= dt;
        if (droneZaps[i].life <= 0) droneZaps.splice(i, 1);
      }

      /* ===================== RENDER ARENA ===================== */
      ctx.save();
      if (shakeMag > 0.2) {
        ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
      }

      // Rich radial twilight hangar sky gradient
      const bgGrad = ctx.createRadialGradient(
        arenaW * 0.5,
        arenaH * 0.26,
        30,
        arenaW * 0.5,
        arenaH * 0.55,
        Math.max(arenaW, arenaH) * 0.85
      );
      bgGrad.addColorStop(0, stage === 2 ? '#1f1638' : '#122447');
      bgGrad.addColorStop(0.55, '#0b152d');
      bgGrad.addColorStop(1, '#060c1b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, arenaW, arenaH);

      // Subtle twinkling starfield
      for (const st of stars) {
        const alpha = 0.22 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 2.1 + st.phase));
        ctx.fillStyle = `rgba(186, 230, 253, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(st.nx * arenaW, 44 + st.ny * (arenaH - 60), st.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle holographic perspective floor track line where the robot glides
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, robotY + 21);
      ctx.lineTo(arenaW - 16, robotY + 21);
      ctx.stroke();

      // Glowing metallic energy arena bumper rails
      const drawRail = (x1: number, y1: number, x2: number, y2: number, flash: number) => {
        ctx.strokeStyle = flash > 0.05 ? `rgba(125, 211, 252, ${0.4 + flash * 0.6})` : 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = flash > 0.05 ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      drawRail(8, 42, 8, arenaH - 12, wallFlashLeft);
      drawRail(arenaW - 8, 42, arenaW - 8, arenaH - 12, wallFlashRight);
      drawRail(8, 42, arenaW - 8, 42, wallFlashTop);

      // Draw Mega Laser vertical beam
      for (const mb of megaBeams) {
        const ratio = mb.life / mb.maxLife;
        ctx.save();
        ctx.globalAlpha = ratio;
        const g = ctx.createLinearGradient(mb.x - 32, 0, mb.x + 32, 0);
        g.addColorStop(0, 'rgba(253,224,71,0)');
        g.addColorStop(0.25, 'rgba(251,191,36,0.85)');
        g.addColorStop(0.5, '#ffffff');
        g.addColorStop(0.75, 'rgba(251,191,36,0.85)');
        g.addColorStop(1, 'rgba(253,224,71,0)');
        ctx.fillStyle = g;
        ctx.fillRect(mb.x - 32 * ratio, 42, 64 * ratio, shieldY - 42);
        ctx.restore();
      }

      // Draw Helper Drone zap beams
      for (const dz of droneZaps) {
        ctx.save();
        ctx.strokeStyle = dz.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = dz.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(dz.x1, dz.y1);
        ctx.lineTo((dz.x1 + dz.x2) / 2 + (Math.random() - 0.5) * 14, (dz.y1 + dz.y2) / 2);
        ctx.lineTo(dz.x2, dz.y2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Reactor Bricks with beveled glass sheen, rivets, and special core icons
      for (const b of bricks) {
        const flash = b.hitFlash && b.hitFlash > 0;
        ctx.save();
        ctx.fillStyle = flash ? '#ffffff' : b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 7);
        ctx.fill();

        // Top glossy bevel highlight
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.roundRect(b.x + 3, b.y + 2.5, b.w - 6, Math.max(4, b.h * 0.26), 3);
        ctx.fill();

        // Bottom depth shadow
        ctx.fillStyle = 'rgba(15,23,42,0.28)';
        ctx.fillRect(b.x + 3, b.y + b.h - 4, b.w - 6, 3);

        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;

        if (b.kind === 'bomb') {
          const pulse = 0.65 + 0.35 * Math.sin(elapsed * 7);
          ctx.strokeStyle = `rgba(254, 240, 138, ${pulse.toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 6);
          ctx.stroke();
          ctx.fillStyle = '#431407';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(8, b.h * 0.32), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(4, b.h * 0.16), 0, Math.PI * 2);
          ctx.fill();
        } else if (b.kind === 'prism') {
          ctx.strokeStyle = '#f5d0fe';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 6);
          ctx.stroke();
          // Shimmering diamond emblem
          const s = Math.min(7, b.h * 0.28);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(cx, cy - s);
          ctx.lineTo(cx + s, cy);
          ctx.lineTo(cx, cy + s);
          ctx.lineTo(cx - s, cy);
          ctx.closePath();
          ctx.fill();
        } else if (b.kind === 'bolt_vault') {
          ctx.fillStyle = '#422006';
          ctx.font = `900 ${Math.max(11, Math.floor(b.h * 0.56))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', cx, cy + 1);
        } else if (b.maxHp > 1 && b.hp === 2) {
          // Titanium armor frame + corner rivets
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 5);
          ctx.stroke();
          ctx.fillStyle = '#e2e8f0';
          for (const rx of [b.x + 6, b.x + b.w - 6]) {
            ctx.beginPath();
            ctx.arc(rx, cy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (b.maxHp > 1 && b.hp === 1) {
          // Cracked armor visual
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.34, b.y + 2);
          ctx.lineTo(b.x + b.w * 0.52, b.y + b.h * 0.52);
          ctx.lineTo(b.x + b.w * 0.42, b.y + b.h * 0.65);
          ctx.lineTo(b.x + b.w * 0.64, b.y + b.h - 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Stage 2 Patrol Guardian Drone
      if (guardian) {
        ctx.save();
        ctx.translate(guardian.x, guardian.y);
        const stunned = guardian.stunTimer > 0;
        ctx.globalAlpha = stunned ? 0.45 : 1;
        ctx.fillStyle = stunned ? '#475569' : '#be123c';
        ctx.strokeStyle = stunned ? '#94a3b8' : '#fda4af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-guardian.w / 2, -guardian.h / 2, guardian.w, guardian.h, 8);
        ctx.fill();
        ctx.stroke();
        // Glowing scanner eye
        const scanX = stunned ? 0 : Math.sin(elapsed * 5) * (guardian.w * 0.24);
        ctx.fillStyle = stunned ? '#cbd5e1' : '#fef08a';
        ctx.beginPath();
        ctx.arc(scanX, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Power-Up Capsules (icon + crisp pill capsule)
      for (const cap of capsules) {
        const meta = POWERUP_VISUALS[cap.kind];
        ctx.save();
        ctx.translate(cap.x, cap.y);
        ctx.shadowColor = meta.bg;
        ctx.shadowBlur = 10;
        ctx.fillStyle = meta.bg;
        ctx.strokeStyle = meta.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 11);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = meta.text;
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.glyph, 0, 0.5);
        ctx.restore();
      }

      // Draw shoulder laser bolts
      for (const lz of lasers) {
        ctx.save();
        ctx.fillStyle = '#fff1f2';
        ctx.shadowColor = lz.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(lz.x - 2.5, lz.y - 10, 5, 16, 2.5);
        ctx.fill();
        ctx.restore();
      }

      // Pick closest orb for SparkBot eye tracking
      let trackX = arenaW / 2;
      let trackY = arenaH * 0.35;
      if (orbs.length > 0) {
        let closest = orbs[0];
        for (const o of orbs) {
          if (o.y > closest.y) closest = o;
        }
        trackX = closest.x;
        trackY = closest.y;
      }

      // Draw Helper Drone (if equipped in Bolt Shop) & Hero Robot Deflector
      drawHelperDrone(droneX, droneY, elapsed);
      drawHeroRobot(robotX, robotY, shieldY, shieldW, robotTilt, robotBounce, trackX, trackY, elapsed);

      // Zero-Reading Animated Slide Arrow Hint (fades out automatically once player moves!)
      if (slideHintTimer > 0) {
        const hAlpha = Math.min(0.85, slideHintTimer * 0.55);
        const shift = Math.sin(elapsed * 5.2) * 8;
        ctx.save();
        ctx.globalAlpha = hAlpha;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Left chevron
        const lx = robotX - shieldW / 2 - 20 - shift;
        ctx.beginPath();
        ctx.moveTo(lx + 7, robotY - 7);
        ctx.lineTo(lx, robotY);
        ctx.lineTo(lx + 7, robotY + 7);
        ctx.stroke();
        // Right chevron
        const rx = robotX + shieldW / 2 + 20 + shift;
        ctx.beginPath();
        ctx.moveTo(rx - 7, robotY - 7);
        ctx.lineTo(rx, robotY);
        ctx.lineTo(rx - 7, robotY + 7);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Plasma Orbs & Comet Ribbon Trails
      for (const orb of orbs) {
        const isFire = fireTimer > 0;
        const orbGlow = isFire ? '#f59e0b' : '#38bdf8';

        // Dotted aim guide when orb is docked on shield
        if (orb.stuck) {
          const aim = Math.sin(elapsed * 2.6) * 0.55;
          ctx.save();
          ctx.setLineDash([5, 6]);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(orb.x, orb.y);
          ctx.lineTo(orb.x + Math.sin(aim) * 76, orb.y - Math.cos(aim) * 76);
          ctx.stroke();
          ctx.restore();
        }

        // Comet trail
        for (let ti = 0; ti < orb.trail.length; ti++) {
          const pt = orb.trail[ti];
          const frac = (ti + 1) / orb.trail.length;
          ctx.fillStyle = isFire
            ? `rgba(251, 191, 36, ${(frac * 0.45).toFixed(2)})`
            : `rgba(56, 189, 248, ${(frac * 0.38).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ballR * frac * 0.88, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.shadowColor = orbGlow;
        ctx.shadowBlur = isFire ? 20 : 14;
        ctx.fillStyle = isFire ? '#fef08a' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, ballR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isFire ? '#f97316' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, ballR * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Shockwave Rings
      for (const rg of rings) {
        const alpha = Math.max(0, rg.life / rg.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Sparks
      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw Floating Score / Combo Callouts
      for (const co of callouts) {
        const alpha = Math.min(1, (co.life / co.maxLife) * 1.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${Math.round(13 * co.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(2,6,23,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(co.text, co.x, co.y);
        ctx.fillStyle = co.color;
        ctx.fillText(co.text, co.x, co.y);
        ctx.restore();
      }

      // Stage Banner
      if (stageBannerTimer > 0) {
        const alpha = Math.min(1, stageBannerTimer * 1.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '900 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(2,6,23,0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText(stageBannerText, arenaW / 2, arenaH * 0.54);
        ctx.fillStyle = '#fde047';
        ctx.fillText(stageBannerText, arenaW / 2, arenaH * 0.54);
        ctx.restore();
      }

      ctx.restore(); // end shake transform

      hudTimer += dt;
      if (hudTimer >= 0.1) {
        hudTimer = 0;
        setHud({
          score,
          lives,
          timeLeft: Math.ceil(timeLeft),
          remaining: bricks.length,
          stage,
          combo,
          overcharge: Math.round(overcharge),
          wideLeft: Math.ceil(wideTimer),
          laserLeft: Math.ceil(laserTimer),
          fireLeft: Math.ceil(fireTimer)
        });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [activeCharacter, charDef.accentCss, charDef.defaultAccentHex, charDef.defaultBodyHex, charDef.defaultHeadHex, charDef.name, charDef.voicePitch, equippedDroneId]);

  return (
    <div ref={containerRef} className="relative h-full w-full flex-1 overflow-hidden bg-[#060c1b]">
      {/* Zero-Reading Commercial Icon + Number Top HUD */}
      <div className="pointer-events-none absolute inset-x-3 top-1.5 z-10 flex items-center justify-between text-xs font-black text-slate-100 sm:inset-x-5 sm:text-sm tabular-nums">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="inline-flex items-center gap-1 text-amber-300" aria-label={`Score ${hud.score}`}>
            <Star className="h-4 w-4 fill-amber-400 text-amber-300" aria-hidden="true" />
            <span>{hud.score}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sky-300" aria-label={`Wall ${hud.stage} of 2`}>
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{hud.stage}/2</span>
          </span>
          {hud.combo >= 2 && (
            <span className="inline-flex items-center gap-0.5 text-orange-300" aria-label={`Combo ${hud.combo}`}>
              <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-300" aria-hidden="true" />
              <span>×{hud.combo}</span>
            </span>
          )}
          {hud.wideLeft > 0 && <span className="text-emerald-300">↔ {hud.wideLeft}</span>}
          {hud.laserLeft > 0 && <span className="text-rose-300">▲▲ {hud.laserLeft}</span>}
          {hud.fireLeft > 0 && <span className="text-amber-300">★ {hud.fireLeft}</span>}
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="flex items-center gap-1" aria-label={`${hud.lives} lives left`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${i < hud.lives ? 'fill-rose-500 text-rose-400' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <span className="inline-flex items-center gap-1 text-slate-200" aria-label={`${hud.timeLeft} seconds left`}>
            <Timer className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            <span>{hud.timeLeft}</span>
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="wall-breaker-canvas"
        className="block h-full w-full touch-none"
      />

      {/* Chunky 3D Tactile Mega Laser Trigger (Zero Reading Needed, 48px Touch Target) */}
      <div className="safe-bottom pointer-events-none absolute bottom-2.5 right-3 z-10 flex items-center sm:right-5">
        <button
          type="button"
          onClick={() => megaTriggerRef.current?.()}
          disabled={hud.overcharge < 100}
          aria-label={hud.overcharge >= 100 ? 'Fire Mega Laser' : `Mega Laser ${hud.overcharge}%`}
          className={`pointer-events-auto relative flex h-12 min-w-[108px] items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 px-4 text-sm font-black transition-transform active:translate-y-0.5 tabular-nums ${
            hud.overcharge >= 100
              ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-[0_4px_0_#b45309,0_0_20px_rgba(251,191,36,0.5)]'
              : 'border-slate-700 bg-slate-900/95 text-slate-300'
          }`}
        >
          {hud.overcharge < 100 && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 bg-sky-500/25 transition-all"
              style={{ width: `${hud.overcharge}%` }}
            />
          )}
          <Zap
            className={`relative h-5 w-5 shrink-0 ${
              hud.overcharge >= 100 ? 'fill-slate-950 text-slate-950' : 'text-amber-300'
            }`}
          />
          <span className="relative whitespace-nowrap">
            {hud.overcharge >= 100 ? 'BLAST!' : `${hud.overcharge}%`}
          </span>
        </button>
      </div>
    </div>
  );
};
