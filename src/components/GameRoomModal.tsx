import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Blocks,
  Cable,
  Check,
  Gamepad2,
  Heart,
  Play,
  Rocket,
  RotateCcw,
  Star,
  Trophy,
  X,
  Zap
} from 'lucide-react';
import { BOT_CHARACTERS, type BotCharacterId } from '../game/engine';
import {
  ARCADE_GAMES,
  computeConnectReward,
  computeSpaceShooterReward,
  computeWallBreakerReward,
  createConnectPuzzle,
  createWallBreakerLayout,
  DIR_BOTTOM,
  DIR_LEFT,
  DIR_RIGHT,
  DIR_TOP,
  getTileConnections,
  rotateConnectTile,
  spawnSpaceWave,
  type ArcadeGameId,
  type ConnectPuzzleState,
  type ConnectTile,
  type SpaceEnemy,
  type WallBrick
} from '../game/arcadeGames';
import { SFX } from '../game/audio';

interface GameRoomModalProps {
  visible: boolean;
  activeCharacter: BotCharacterId;
  totalBolts: number;
  hasNextLevel: boolean;
  onAwardBolts: (bolts: number, gameId: ArcadeGameId, score: number) => void;
  onLaunchRobotRun: () => void;
  onNextLevel: () => void;
  onClose: () => void;
}

interface RoundSummary {
  gameId: ArcadeGameId;
  title: string;
  score: number;
  boltsEarned: number;
  won: boolean;
  detail: string;
}

const ARENA_W = 720;
const ARENA_H = 420;

/* ============================================================================
 * Mini-Game 1: WALL BREAKER (HTML5 Canvas)
 * ========================================================================== */
const WallBreakerGame: React.FC<{
  accentColor: string;
  onFinish: (score: number, bolts: number, won: boolean, detail: string) => void;
}> = ({ accentColor, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, timeLeft: 45, remaining: 21 });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bricks: WallBrick[] = createWallBreakerLayout(ARENA_W, ARENA_H, 1);
    let paddleX = ARENA_W / 2;
    const paddleW = 122;
    const paddleH = 14;
    const paddleY = ARENA_H - 34;

    let ballX = ARENA_W / 2;
    let ballY = paddleY - 14;
    let ballVx = 215;
    let ballVy = -265;
    const ballR = 9;

    let score = 0;
    let lives = 3;
    let timeLeft = 45;
    let stage = 1;
    let ended = false;
    let hudTimer = 0;

    const drops: Array<{ x: number; y: number; vy: number }> = [];
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    const keys = { left: false, right: false };

    const spawnSparks = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 70 + Math.random() * 140;
        sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.42, color });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * ARENA_W;
      paddleX = Math.max(paddleW / 2 + 8, Math.min(ARENA_W - paddleW / 2 - 8, relX));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerMove);

    let last = performance.now();
    let rafId = 0;

    const finishRound = (won: boolean, detail: string) => {
      if (ended) return;
      ended = true;
      const bolts = computeWallBreakerReward(score, won);
      if (won) SFX.laserSolved();
      finishRef.current(score, bolts, won, detail);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (ended) return;

      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        finishRound(score >= 120, `Smashed ${score} pts before time ran out`);
        return;
      }

      if (keys.left) paddleX -= 460 * dt;
      if (keys.right) paddleX += 460 * dt;
      paddleX = Math.max(paddleW / 2 + 8, Math.min(ARENA_W - paddleW / 2 - 8, paddleX));

      ballX += ballVx * dt;
      ballY += ballVy * dt;

      // Arena wall bounces
      if (ballX - ballR < 8) {
        ballX = 8 + ballR;
        ballVx = Math.abs(ballVx);
        SFX.uiTick();
      } else if (ballX + ballR > ARENA_W - 8) {
        ballX = ARENA_W - 8 - ballR;
        ballVx = -Math.abs(ballVx);
        SFX.uiTick();
      }
      if (ballY - ballR < 8) {
        ballY = 8 + ballR;
        ballVy = Math.abs(ballVy);
        SFX.uiTick();
      }

      // Paddle bounce
      if (
        ballVy > 0 &&
        ballY + ballR >= paddleY - paddleH / 2 &&
        ballY - ballR <= paddleY + paddleH / 2 &&
        ballX >= paddleX - paddleW / 2 - ballR &&
        ballX <= paddleX + paddleW / 2 + ballR
      ) {
        const hitOffset = (ballX - paddleX) / (paddleW / 2);
        const speed = Math.min(430, Math.hypot(ballVx, ballVy) * 1.015);
        const angle = hitOffset * 1.05;
        ballVx = Math.sin(angle) * speed;
        ballVy = -Math.cos(angle) * speed;
        ballY = paddleY - paddleH / 2 - ballR - 1;
        spawnSparks(ballX, paddleY - 6, accentColor, 6);
        SFX.mirror();
      }

      // Brick collisions
      for (let i = bricks.length - 1; i >= 0; i--) {
        const b = bricks[i];
        const nearX = Math.max(b.x, Math.min(ballX, b.x + b.w));
        const nearY = Math.max(b.y, Math.min(ballY, b.y + b.h));
        const dx = ballX - nearX;
        const dy = ballY - nearY;
        if (dx * dx + dy * dy <= ballR * ballR) {
          if (Math.abs(dx) > Math.abs(dy)) ballVx = -ballVx;
          else ballVy = -ballVy;

          b.hp -= 1;
          spawnSparks(nearX, nearY, b.color, b.hp <= 0 ? 12 : 6);
          if (b.hp <= 0) {
            score += b.points;
            SFX.crystal();
            if (b.hasBonusBolt) {
              drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vy: 145 });
            }
            bricks.splice(i, 1);
          } else {
            score += 5;
            SFX.click();
          }
          break;
        }
      }

      // Bonus bolt pickups
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.vy * dt;
        if (
          Math.abs(d.x - paddleX) <= paddleW / 2 + 12 &&
          Math.abs(d.y - paddleY) <= paddleH + 10
        ) {
          score += 30;
          spawnSparks(d.x, d.y, '#fde047', 10);
          SFX.crystal();
          drops.splice(i, 1);
        } else if (d.y > ARENA_H + 20) {
          drops.splice(i, 1);
        }
      }

      // Missed ball
      if (ballY - ballR > ARENA_H + 14) {
        lives -= 1;
        if (lives <= 0) {
          finishRound(score >= 120, 'Reactor wall challenge complete');
          return;
        }
        ballX = paddleX;
        ballY = paddleY - 16;
        ballVx = (Math.random() < 0.5 ? -1 : 1) * 205;
        ballVy = -265;
        SFX.chirpConfused();
      }

      // Cleared all bricks
      if (bricks.length === 0) {
        if (stage === 1) {
          stage = 2;
          score += 60;
          bricks = createWallBreakerLayout(ARENA_W, ARENA_H, 2);
          ballX = paddleX;
          ballY = paddleY - 16;
          ballVy = -280;
          SFX.laserSolved();
        } else {
          score += 100;
          finishRound(true, 'Smashed both reactor walls!');
          return;
        }
      }

      // Update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      // Render arena
      ctx.fillStyle = '#091124';
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);

      // Subtle blueprint grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 36; gx < ARENA_W; gx += 36) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ARENA_H);
        ctx.stroke();
      }
      for (let gy = 36; gy < ARENA_H; gy += 36) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(ARENA_W, gy);
        ctx.stroke();
      }

      // Draw bricks
      for (const b of bricks) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 6);
        ctx.fill();

        // Top gloss highlight
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 4);

        // Armor rim or crack line
        if (b.maxHp > 1 && b.hp === 2) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        } else if (b.maxHp > 1 && b.hp === 1) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.35, b.y + 2);
          ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.55);
          ctx.lineTo(b.x + b.w * 0.65, b.y + b.h - 2);
          ctx.stroke();
        }
      }

      // Draw bolt drops
      for (const d of drops) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', d.x, d.y + 1);
      }

      // Draw paddle
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(paddleX - paddleW / 2, paddleY - paddleH / 2, paddleW, paddleH, 8);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(paddleX - paddleW * 0.32, paddleY - 3, paddleW * 0.64, 5, 3);
      ctx.fill();

      // Draw plasma ball
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw sparks
      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.42);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x - 2.5, sp.y - 2.5, 5, 5);
      }
      ctx.globalAlpha = 1;

      hudTimer += dt;
      if (hudTimer >= 0.12) {
        hudTimer = 0;
        setHud({ score, lives, timeLeft: Math.ceil(timeLeft), remaining: bricks.length });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerMove);
    };
  }, [accentColor]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[720px] items-center justify-between text-sm font-bold text-slate-200 tabular-nums">
        <div className="flex items-center gap-4">
          <span>Score: <strong className="text-amber-300">{hud.score}</strong></span>
          <span className="text-slate-500">·</span>
          <span>Blocks: <strong className="text-sky-300">{hud.remaining}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" aria-label={`${hud.lives} lives left`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${i < hud.lives ? 'fill-rose-500 text-rose-400' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <span className="text-slate-500">·</span>
          <span>{hud.timeLeft}s</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={ARENA_W}
        height={ARENA_H}
        data-testid="wall-breaker-canvas"
        className="w-full max-w-[720px] cursor-none touch-none rounded-2xl border border-slate-700 bg-[#091124] shadow-2xl"
      />
      <p className="text-xs font-medium text-slate-400">
        Move your mouse, drag, or press A / D to bounce the plasma orb and smash every wall block.
      </p>
    </div>
  );
};

/* ============================================================================
 * Mini-Game 2: POWER CONNECT (Tactile Conduit Rotation Puzzle)
 * ========================================================================== */
const PipeTileSvg: React.FC<{ tile: ConnectTile }> = ({ tile }) => {
  const mask = getTileConnections(tile);
  const strokeColor = tile.powered ? '#22d3ee' : '#64748b';
  const glowColor = tile.powered ? 'rgba(34,211,238,0.65)' : 'none';

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full">
      {tile.kind !== 'empty' && (
        <g
          stroke={strokeColor}
          strokeWidth={tile.powered ? 11 : 9}
          strokeLinecap="round"
          style={tile.powered ? { filter: `drop-shadow(0 0 5px ${glowColor})` } : undefined}
        >
          {(mask & DIR_TOP) !== 0 && <line x1="32" y1="32" x2="32" y2="4" />}
          {(mask & DIR_RIGHT) !== 0 && <line x1="32" y1="32" x2="60" y2="32" />}
          {(mask & DIR_BOTTOM) !== 0 && <line x1="32" y1="32" x2="32" y2="60" />}
          {(mask & DIR_LEFT) !== 0 && <line x1="32" y1="32" x2="4" y2="32" />}
        </g>
      )}
      {tile.kind === 'source' && (
        <g>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#f59e0b" stroke="#fef3c7" strokeWidth="2.5" />
          <path d="M35 20 L25 34 H32 L29 44 L39 30 H32 Z" fill="#0f172a" />
        </g>
      )}
      {tile.kind === 'core' && (
        <g>
          <circle
            cx="32"
            cy="32"
            r="16"
            fill={tile.powered ? '#10b981' : '#1e293b'}
            stroke={tile.powered ? '#a7f3d0' : '#94a3b8'}
            strokeWidth="3"
          />
          <circle cx="32" cy="32" r="6" fill={tile.powered ? '#ecfdf5' : '#475569'} />
        </g>
      )}
      {tile.kind !== 'empty' && tile.kind !== 'source' && tile.kind !== 'core' && (
        <circle cx="32" cy="32" r="7" fill={tile.powered ? '#cffafe' : '#475569'} />
      )}
    </svg>
  );
};

const PowerConnectGame: React.FC<{
  onFinish: (score: number, bolts: number, won: boolean, detail: string) => void;
}> = ({ onFinish }) => {
  const [boardIdx, setBoardIdx] = useState(0);
  const [puzzle, setPuzzle] = useState<ConnectPuzzleState>(() => createConnectPuzzle(0));
  const [moves, setMoves] = useState(0);
  const [boardsCleared, setBoardsCleared] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const handleTapTile = (r: number, c: number) => {
    if (celebrating) return;
    const tile = puzzle.grid[r]?.[c];
    if (!tile || tile.locked) return;
    const next = rotateConnectTile(puzzle, r, c);
    const nextMoves = moves + 1;
    setPuzzle(next);
    setMoves(nextMoves);
    SFX.mirror();

    if (next.solved) {
      SFX.laserSolved();
      setCelebrating(true);
      const nextCleared = boardsCleared + 1;
      setBoardsCleared(nextCleared);

      window.setTimeout(() => {
        if (boardIdx < 2) {
          const nextIdx = boardIdx + 1;
          setBoardIdx(nextIdx);
          setPuzzle(createConnectPuzzle(nextIdx));
          setCelebrating(false);
        } else {
          const bolts = computeConnectReward(nextCleared, nextMoves);
          onFinish(nextCleared * 100 + Math.max(0, 60 - nextMoves * 2), bolts, true, `Connected all 3 power grids in ${nextMoves} taps!`);
        }
      }, 720);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[420px] items-center justify-between text-sm font-bold text-slate-200 tabular-nums">
        <span>Board <strong className="text-cyan-300">{boardIdx + 1} / 3</strong></span>
        <span className="text-slate-500">·</span>
        <span>Cores: <strong className="text-emerald-300">{puzzle.poweredCores}/{puzzle.totalCores}</strong></span>
        <span className="text-slate-500">·</span>
        <span>Taps: <strong className="text-amber-300">{moves}</strong></span>
      </div>

      <div
        data-testid="power-connect-grid"
        className={`grid grid-cols-4 gap-2.5 rounded-2xl border-2 p-4 transition-colors ${
          celebrating
            ? 'border-emerald-400 bg-emerald-950/40'
            : 'border-slate-700 bg-slate-950/90'
        }`}
      >
        {puzzle.grid.map((row, r) =>
          row.map((tile, c) => {
            const rotatable = !tile.locked;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!rotatable}
                data-connect-cell={`${r}-${c}`}
                data-powered={tile.powered ? 'true' : 'false'}
                onClick={() => handleTapTile(r, c)}
                aria-label={
                  tile.kind === 'source'
                    ? 'Power Source'
                    : tile.kind === 'core'
                      ? `Power Core ${tile.powered ? 'Powered' : 'Unpowered'}`
                      : tile.kind === 'empty'
                        ? 'Empty Slot'
                        : `Rotate ${tile.kind} conduit row ${r + 1} column ${c + 1}`
                }
                className={`flex h-16 w-16 items-center justify-center rounded-xl border transition-transform sm:h-20 sm:w-20 ${
                  tile.kind === 'empty'
                    ? 'border-slate-800/70 bg-slate-900/40'
                    : rotatable
                      ? tile.powered
                        ? 'border-cyan-400/70 bg-cyan-950/40 hover:border-cyan-300 active:scale-95'
                        : 'border-slate-700 bg-slate-800/90 hover:border-sky-400 active:scale-95'
                      : 'border-slate-700/80 bg-slate-900'
                }`}
              >
                <PipeTileSvg tile={tile} />
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs font-medium text-slate-400">
        Tap glowing pipe tiles to rotate them until power flows from the battery to every green core.
      </p>
    </div>
  );
};

/* ============================================================================
 * Mini-Game 3: SPACE SHOOTER (HTML5 Canvas)
 * ========================================================================== */
const SpaceShooterGame: React.FC<{
  accentColor: string;
  onFinish: (score: number, bolts: number, won: boolean, detail: string) => void;
}> = ({ accentColor, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState({ score: 0, wave: 1, shields: 3, stars: 0, timeLeft: 35 });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let shipX = ARENA_W / 2;
    const shipY = ARENA_H - 46;
    let score = 0;
    let wave = 1;
    let shields = 3;
    let starsCollected = 0;
    let timeLeft = 35;
    let nextEnemyId = 1;
    let enemies: SpaceEnemy[] = spawnSpaceWave(ARENA_W, wave, nextEnemyId);
    nextEnemyId += enemies.length + 2;

    const bullets: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    const stars: Array<{ x: number; y: number; vy: number }> = [];
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    const bgStars = Array.from({ length: 48 }, (_, i) => ({
      x: (i * 97) % ARENA_W,
      y: (i * 61) % ARENA_H,
      speed: 25 + (i % 4) * 18,
      size: 1 + (i % 2)
    }));

    const keys = { left: false, right: false, burst: false };
    let fireCooldown = 0;
    let burstCooldown = 0;
    let invulnTimer = 0;
    let hudTimer = 0;
    let ended = false;

    const spawnBoom = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 65 + Math.random() * 145;
        sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.4, color });
      }
    };

    const triggerTurboBurst = () => {
      if (burstCooldown > 0 || ended) return;
      burstCooldown = 1.25;
      bullets.push(
        { x: shipX - 10, y: shipY - 18, vx: -95, vy: -460 },
        { x: shipX, y: shipY - 22, vx: 0, vy: -490 },
        { x: shipX + 10, y: shipY - 18, vx: 95, vy: -460 }
      );
      SFX.boost();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        triggerTurboBurst();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * ARENA_W;
      shipX = Math.max(30, Math.min(ARENA_W - 30, relX));
    };
    const onPointerDown = (e: PointerEvent) => {
      onPointerMove(e);
      triggerTurboBurst();
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
      const bolts = computeSpaceShooterReward(score, starsCollected);
      if (won) SFX.laserSolved();
      finishRef.current(score, bolts, won, detail);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (ended) return;

      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        finishRound(true, `Defended space through Wave ${wave} and grabbed ${starsCollected} stars!`);
        return;
      }

      if (keys.left) shipX -= 410 * dt;
      if (keys.right) shipX += 410 * dt;
      shipX = Math.max(30, Math.min(ARENA_W - 30, shipX));

      fireCooldown -= dt;
      burstCooldown = Math.max(0, burstCooldown - dt);
      invulnTimer = Math.max(0, invulnTimer - dt);

      // Auto-fire friendly twin lasers
      if (fireCooldown <= 0) {
        fireCooldown = 0.24;
        bullets.push(
          { x: shipX - 11, y: shipY - 16, vx: 0, vy: -470 },
          { x: shipX + 11, y: shipY - 16, vx: 0, vy: -470 }
        );
      }

      // Move bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -16 || b.x < -16 || b.x > ARENA_W + 16) bullets.splice(i, 1);
      }

      // Move enemies & collide
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        en.x += en.vx * dt;
        en.y += en.vy * dt;
        if (en.x < en.radius + 10 || en.x > ARENA_W - en.radius - 10) {
          en.vx = -en.vx;
          en.x = Math.max(en.radius + 10, Math.min(ARENA_W - en.radius - 10, en.x));
        }

        // Bullet hits
        let destroyed = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(b.x - en.x, b.y - en.y) <= en.radius + 6) {
            bullets.splice(j, 1);
            en.hp -= 1;
            if (en.hp <= 0) {
              score += en.points;
              spawnBoom(en.x, en.y, en.color, 12);
              SFX.crystal();
              if (Math.random() < 0.45) {
                stars.push({ x: en.x, y: en.y, vy: 120 });
              }
              enemies.splice(i, 1);
              destroyed = true;
            } else {
              spawnBoom(b.x, b.y, '#e0f2fe', 5);
              SFX.uiTick();
            }
            break;
          }
        }
        if (destroyed) continue;

        // Ship collision
        if (invulnTimer <= 0 && Math.hypot(en.x - shipX, en.y - shipY) <= en.radius + 18) {
          shields -= 1;
          invulnTimer = 1.05;
          spawnBoom(shipX, shipY, '#fb7185', 14);
          SFX.chirpConfused();
          enemies.splice(i, 1);
          if (shields <= 0) {
            finishRound(score >= 120, `Reached Wave ${wave} with ${score} pts`);
            return;
          }
          continue;
        }

        if (en.y > ARENA_H + 32) {
          en.y = -24;
          en.x = 44 + Math.random() * (ARENA_W - 88);
        }
      }

      // Next wave
      if (enemies.length === 0) {
        wave += 1;
        score += 45;
        if (wave > 4) {
          finishRound(true, `Cleared all 4 space waves with ${starsCollected} stars!`);
          return;
        }
        enemies = spawnSpaceWave(ARENA_W, wave, nextEnemyId);
        nextEnemyId += enemies.length + 2;
        SFX.laserSolved();
      }

      // Collectible stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const st = stars[i];
        st.y += st.vy * dt;
        if (Math.hypot(st.x - shipX, st.y - shipY) <= 28) {
          starsCollected += 1;
          score += 25;
          spawnBoom(st.x, st.y, '#fde047', 8);
          SFX.crystal();
          stars.splice(i, 1);
        } else if (st.y > ARENA_H + 20) {
          stars.splice(i, 1);
        }
      }

      // Sparks & scrolling background stars
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }
      for (const s of bgStars) {
        s.y += s.speed * dt;
        if (s.y > ARENA_H) {
          s.y = -4;
          s.x = (s.x + 131) % ARENA_W;
        }
      }

      // Render space canvas
      ctx.fillStyle = '#060c1f';
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);

      for (const s of bgStars) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.fillRect(s.x, s.y, s.size, s.size * 2);
      }

      // Draw enemies
      for (const en of enemies) {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.fillStyle = en.color;
        if (en.kind === 'saucer') {
          ctx.beginPath();
          ctx.ellipse(0, 0, en.radius, en.radius * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(0, -4, en.radius * 0.42, Math.PI, 0);
          ctx.fill();
        } else if (en.kind === 'drone') {
          ctx.beginPath();
          ctx.moveTo(0, en.radius);
          ctx.lineTo(-en.radius, -en.radius * 0.7);
          ctx.lineTo(en.radius, -en.radius * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, -2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(15,23,42,0.3)';
          ctx.beginPath();
          ctx.arc(-4, -3, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw falling stars
      for (const st of stars) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(st.x, st.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw lasers
      ctx.fillStyle = '#38bdf8';
      for (const b of bullets) {
        ctx.beginPath();
        ctx.roundRect(b.x - 2.5, b.y - 8, 5, 14, 2.5);
        ctx.fill();
      }

      // Draw robot starfighter
      ctx.save();
      ctx.translate(shipX, shipY);
      if (invulnTimer > 0 && Math.floor(invulnTimer * 16) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }
      // Thruster glow
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-7, 14);
      ctx.lineTo(7, 14);
      ctx.lineTo(0, 26 + Math.random() * 5);
      ctx.closePath();
      ctx.fill();
      // Wings
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-22, 14);
      ctx.lineTo(22, 14);
      ctx.closePath();
      ctx.fill();
      // Cute visor cockpit
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 11, 5);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-4, -1, 2.4, 0, Math.PI * 2);
      ctx.arc(4, -1, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sparks
      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.4);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x - 2.5, sp.y - 2.5, 5, 5);
      }
      ctx.globalAlpha = 1;

      hudTimer += dt;
      if (hudTimer >= 0.12) {
        hudTimer = 0;
        setHud({ score, wave, shields, stars: starsCollected, timeLeft: Math.ceil(timeLeft) });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [accentColor]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[720px] items-center justify-between text-sm font-bold text-slate-200 tabular-nums">
        <div className="flex items-center gap-3">
          <span>Score: <strong className="text-emerald-300">{hud.score}</strong></span>
          <span className="text-slate-500">·</span>
          <span>Wave <strong className="text-sky-300">{hud.wave}/4</strong></span>
          <span className="text-slate-500">·</span>
          <span className="flex items-center gap-1 text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            {hud.stars}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" aria-label={`${hud.shields} shields left`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${i < hud.shields ? 'fill-emerald-400 text-emerald-300' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <span className="text-slate-500">·</span>
          <span>{hud.timeLeft}s</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={ARENA_W}
        height={ARENA_H}
        data-testid="space-shooter-canvas"
        className="w-full max-w-[720px] cursor-crosshair touch-none rounded-2xl border border-slate-700 bg-[#060c1f] shadow-2xl"
      />
      <p className="text-xs font-medium text-slate-400">
        Move with mouse, drag, or A / D. Click or press Space for a 3-way turbo laser burst!
      </p>
    </div>
  );
};

/* ============================================================================
 * Main Arcade Game Room Hub Modal
 * ========================================================================== */
const GAME_ICON: Record<ArcadeGameId, React.ReactNode> = {
  break_wall: <Blocks className="h-7 w-7 text-amber-300" />,
  connect_nodes: <Cable className="h-7 w-7 text-cyan-300" />,
  robot_run: <Zap className="h-7 w-7 text-fuchsia-300" />,
  space_shooter: <Rocket className="h-7 w-7 text-emerald-300" />
};

export const GameRoomModal: React.FC<GameRoomModalProps> = ({
  visible,
  activeCharacter,
  totalBolts,
  hasNextLevel,
  onAwardBolts,
  onLaunchRobotRun,
  onNextLevel,
  onClose
}) => {
  const [view, setView] = useState<'HUB' | 'PLAYING' | 'ROUND_SUMMARY'>('HUB');
  const [activeGame, setActiveGame] = useState<ArcadeGameId | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<RoundSummary | null>(null);

  const charDef = useMemo(() => BOT_CHARACTERS[activeCharacter], [activeCharacter]);

  useEffect(() => {
    if (!visible) {
      setView('HUB');
      setActiveGame(null);
      setSummary(null);
    }
  }, [visible]);

  const handleSelectGame = useCallback(
    (gameId: ArcadeGameId) => {
      SFX.click();
      if (gameId === 'robot_run') {
        onLaunchRobotRun();
        return;
      }
      setActiveGame(gameId);
      setSummary(null);
      setRunKey((k) => k + 1);
      setView('PLAYING');
    },
    [onLaunchRobotRun]
  );

  const handleRoundFinish = useCallback(
    (gameId: ArcadeGameId, title: string, score: number, bolts: number, won: boolean, detail: string) => {
      onAwardBolts(bolts, gameId, score);
      setSummary({ gameId, title, score, boltsEarned: bolts, won, detail });
      setView('ROUND_SUMMARY');
    },
    [onAwardBolts]
  );

  if (!visible) return null;

  const activeCard = ARCADE_GAMES.find((g) => g.id === activeGame) || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Arcade Game Room"
      data-testid="game-room-modal"
      data-gameroom-view={view.toLowerCase()}
      data-active-game={activeGame || ''}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-2.5 sm:p-5"
    >
      <div className="anim-pop flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Clean 3-Zone Arcade Header */}
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            {view !== 'HUB' && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setView('HUB');
                  setActiveGame(null);
                  setSummary(null);
                }}
                aria-label="Back to Game Room"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:border-sky-400 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>All Games</span>
              </button>
            )}
            <Gamepad2 className="h-6 w-6 text-amber-300" aria-hidden="true" />
            <h2 className="whitespace-nowrap text-lg font-black tracking-tight text-white">
              {view === 'PLAYING' && activeCard ? activeCard.title : 'Mission Game Room'}
            </h2>
          </div>

          <div className="hidden items-center gap-3 text-xs font-bold text-slate-300 sm:flex tabular-nums">
            <span>{charDef.name}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Zap className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
              {totalBolts} Bolts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasNextLevel && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onNextLevel();
                }}
                className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-300/80 bg-emerald-500 px-3.5 text-xs font-black text-slate-950 transition-transform hover:bg-emerald-400 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Next Mission</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClose();
              }}
              aria-label="Close Game Room"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main Content Surface */}
        <div className="touch-pan-y flex-1 overflow-y-auto p-3.5 sm:p-5">
          {view === 'HUB' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-300">
                  Mission unlocked the Arcade Room — pick an action game to play with {charDef.name} and win bonus bolts.
                </p>
                <span className="text-xs font-bold text-slate-400 tabular-nums">
                  4 Action Games Ready
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ARCADE_GAMES.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    data-arcade-game={game.id}
                    onClick={() => handleSelectGame(game.id)}
                    aria-label={`Play ${game.title}`}
                    className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-700/90 bg-slate-800/75 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400 active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950"
                        style={{ boxShadow: `0 0 22px ${game.accentHex}22` }}
                      >
                        {GAME_ICON[game.id]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-white group-hover:text-sky-200">
                          {game.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                          {game.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-700/70 pt-3">
                      <span className="truncate text-[11px] font-medium text-slate-400">
                        {game.controlsHint}
                      </span>
                      <span
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black text-slate-950 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: game.accentHex }}
                      >
                        <Play className="h-3.5 w-3.5 fill-slate-950" />
                        <span>Play</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'PLAYING' && activeGame === 'break_wall' && (
            <WallBreakerGame
              key={runKey}
              accentColor={charDef.accentCss}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('break_wall', 'Wall Breaker', score, bolts, won, detail)
              }
            />
          )}

          {view === 'PLAYING' && activeGame === 'connect_nodes' && (
            <PowerConnectGame
              key={runKey}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('connect_nodes', 'Power Connect', score, bolts, won, detail)
              }
            />
          )}

          {view === 'PLAYING' && activeGame === 'space_shooter' && (
            <SpaceShooterGame
              key={runKey}
              accentColor={charDef.accentCss}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('space_shooter', 'Space Shooter', score, bolts, won, detail)
              }
            />
          )}

          {view === 'ROUND_SUMMARY' && summary && (
            <div
              data-testid="game-room-summary"
              className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/60 bg-amber-400/15 text-amber-300">
                {summary.won ? <Trophy className="h-9 w-9" /> : <Check className="h-9 w-9" />}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {summary.won ? `${summary.title} Clear!` : `${summary.title} Complete`}
                </h3>
                <p className="mt-1 text-sm text-slate-300">{summary.detail}</p>
              </div>

              <div className="flex items-center gap-6 rounded-2xl border border-slate-700 bg-slate-950/75 px-6 py-3.5 text-sm font-bold tabular-nums">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-medium text-slate-400">Score</span>
                  <span className="text-xl font-black text-sky-300">{summary.score}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" aria-hidden="true" />
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-medium text-slate-400">Reward</span>
                  <span className="flex items-center gap-1 text-xl font-black text-amber-300">
                    <Zap className="h-4 w-4 fill-amber-400" />+{summary.boltsEarned}
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectGame(summary.gameId)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-sky-400/80 bg-sky-500 px-5 text-sm font-black text-slate-950 hover:bg-sky-400 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setView('HUB');
                    setActiveGame(null);
                    setSummary(null);
                  }}
                  className="flex h-12 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 text-sm font-bold text-white hover:border-slate-400 active:scale-95"
                >
                  <Gamepad2 className="h-4 w-4 text-amber-300" />
                  <span>Switch Game</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
