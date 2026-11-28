import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JourneyCard } from './JourneyCard';
import { CharacterVoiceButton } from './CharacterVoiceButton';
import type { JourneyPreview } from '../game/journey';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bug,
  Check,
  Clock,
  Cpu,
  Gamepad2,
  Heart,
  Layers,
  Lightbulb,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Star,
  StepForward,
  ToggleRight,
  Trophy,
  X,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTERS,
  type BotCharacterId,
  type ChassisInfo,
  type CodeBlock,
  type SimResult
} from '../game/engine';
import {
  ALL_GAME_ROOM_GAMES,
  ARCADE_GAMES,
  computeConnectReward,
  computeSpaceShooterReward,
  createConnectPuzzle,
  DIR_BOTTOM,
  DIR_LEFT,
  DIR_RIGHT,
  DIR_TOP,
  EDUCATIONAL_MINI_GAMES,
  getTileConnections,
  rotateConnectTile,
  spawnSpaceWave,
  type ArcadeGameId,
  type ConnectPuzzleState,
  type ConnectTile,
  type SpaceEnemy
} from '../game/arcadeGames';
import {
  BUG_DETECTIVE_PUZZLES,
  cloneProgramBlocks,
  computeBugDetectiveReward,
  computeLogicGateReward,
  cycleBugActionBlockType,
  cycleBugIfCondition,
  cycleBugLoopCount,
  evaluateBugDetectiveAttempt,
  evaluateLogicCircuit,
  LOGIC_GATE_PUZZLES,
  swapTopLevelBugBlocks,
  type BugDetectivePuzzle,
  type LogicGateKind,
  type LogicGatePuzzle
} from '../game/educationalMiniGames';
import { derivePlanetCapabilities, PLANET_EQUIPMENT_META } from '../game/planetAdventure';
import type { DroneId } from '../game/shopAndQuests';
import { SFX } from '../game/audio';
import { BlockIcon, PartIcon } from './Icons';
import { ArcadeSceneArt } from './KidVisualArt';
import { WallBreakerCanvasGame } from './WallBreakerCanvasGame';
import { SPACE_BOT_FORM_INFO, SPACE_TRANSFORM_DURATION, nextSpaceBotForm, spaceBotShots, spaceBotImpact, type SpaceBotForm } from '../game/spaceBotForms';
import { drawSpaceBot } from '../game/spaceBotArt';
import {SPACE_EXPEDITION_STAGES,SPACE_RESCUE_GOAL,spaceStageCount,spaceRoundOutcome,spawnExpeditionWave,moveSpaceBotToward,rescueSignalPosition,type SpaceRoundMode} from '../game/spaceExpedition';

interface GameRoomModalProps {
  visible: boolean;
  activeCharacter: BotCharacterId;
  equippedDroneId?: DroneId | null;
  totalBolts: number;
  hasNextLevel: boolean;
  nextJourney?: JourneyPreview|null;
  voiceMuted?: boolean;
  chassisInfo?: ChassisInfo;
  externalSummary?: GameRoomRoundSummary | null;
  onClearExternalSummary?: () => void;
  onAwardBolts: (bolts: number, gameId: ArcadeGameId, score: number) => void;
  onEducationalProgress?: (info: {
    gameId: ArcadeGameId;
    won: boolean;
    perfectFixes?: number;
    gatesSolved?: number;
  }) => void;
  onLaunchRobotRun: () => void;
  onLaunchPlanetAdventure?: () => void;
  onNextLevel: () => void;
  onClose: () => void;
}

export interface GameRoomRoundSummary {
  gameId: ArcadeGameId;
  title: string;
  score: number;
  boltsEarned: number;
  won: boolean;
  detail: string;
}

/* Wall Breaker mini-game is implemented in ./WallBreakerCanvasGame.tsx */


/* ============================================================================
 * Mini-Game 2: POWER CONNECT (Full-Screen Tactile Conduit Rotation Puzzle)
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
          onFinish(
            nextCleared * 100 + Math.max(0, 60 - nextMoves * 2),
            bolts,
            true,
            `Connected all 3 power grids in ${nextMoves} taps!`
          );
        }
      }, 720);
    }
  };

  return (
    <div className="safe-bottom flex h-full w-full flex-1 flex-col items-center justify-between gap-2 overflow-hidden bg-slate-950 px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex w-full max-w-xl items-center justify-between gap-2 tabular-nums">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 text-sm font-black text-cyan-300">
          <Layers className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span>{boardIdx + 1}/3</span>
        </span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-3 text-sm font-black text-emerald-300">
          <Zap className="h-4 w-4 fill-emerald-300 text-emerald-300" aria-hidden="true" />
          <span>
            {puzzle.poweredCores}/{puzzle.totalCores}
          </span>
        </span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 text-sm font-black text-amber-300">
          <RotateCw className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <span>{moves}</span>
        </span>
      </div>

      {/* Full-Viewport Scaled Square 4x4 Conduit Grid */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          data-testid="power-connect-grid"
          className={`grid aspect-square w-[min(92vw,calc(100dvh-148px),560px)] grid-cols-4 grid-rows-4 gap-2 rounded-2xl border-2 p-3 transition-colors sm:gap-3 sm:p-4 ${
            celebrating
              ? 'border-emerald-400 bg-emerald-950/35'
              : 'border-slate-700/90 bg-slate-900/90'
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
                  className={`flex h-full w-full items-center justify-center rounded-xl border transition-transform ${
                    tile.kind === 'empty'
                      ? 'border-slate-800/70 bg-slate-950/50'
                      : rotatable
                        ? tile.powered
                          ? 'border-cyan-400/70 bg-cyan-950/40 hover:border-cyan-300 active:scale-95'
                          : 'border-slate-700 bg-slate-800/90 hover:border-sky-400 active:scale-95'
                        : 'border-slate-700/80 bg-slate-950/90'
                  }`}
                >
                  <PipeTileSvg tile={tile} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Visual Icon Flow Cue — Zero Reading Needed */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-1.5" aria-hidden="true">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
          <Zap className="h-3.5 w-3.5 fill-slate-950" />
        </span>
        <span className="h-0.5 w-4 rounded bg-cyan-400" />
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/60 bg-slate-800 text-cyan-300">
          <RotateCw className="h-3.5 w-3.5" />
        </span>
        <span className="h-0.5 w-4 rounded bg-cyan-400" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]" />
      </div>
    </div>
  );
};

/* ============================================================================
 * Mini-Game 3: SPACE SHOOTER (Full-Screen Dynamic Retina HTML5 Canvas)
 * ========================================================================== */
const SpaceShooterRound: React.FC<{
  mode: SpaceRoundMode;
  character: BotCharacterId;
  onFinish: (score: number, bolts: number, won: boolean, detail: string) => void;
}> = ({ character, mode, onFinish }) => {
  const expedition=mode==='expedition',stageCount=spaceStageCount(mode);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstTriggerRef = useRef<(() => void) | null>(null);
  const transformRef = useRef<(() => void) | null>(null);
  const [hud, setHud] = useState({
    score: 0,
    wave: 1,
    shields: 3,
    stars: 0,
    timeLeft: 35,
    burstReady: true,
    form: 'scout' as SpaceBotForm,
    guardReady: true,
    rescued: 0
  });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let arenaW = Math.max(320, Math.floor(container.clientWidth || window.innerWidth));
    let arenaH = Math.max(180, Math.floor(container.clientHeight || window.innerHeight - 48));
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

    const getShipY = (h: number) => h - Math.max(60, Math.min(86, h * 0.1));
    let shipX = arenaW / 2, pointerTarget:number|null=null;
    let shipY = getShipY(arenaH);

    let score = 0;
    let wave = 1;
    let shields = 3;
    let starsCollected = 0;
    let timeLeft = 35;
    let nextEnemyId = 1;
    const spawn=(stage:number,id:number)=>expedition?spawnExpeditionWave(arenaW,stage,id):spawnSpaceWave(arenaW,stage,id);
    let enemies: SpaceEnemy[] = spawn(wave, nextEnemyId);
    let rescued=0;
    const signals:{x:number;y:number;index:number}[]=[];
    nextEnemyId += enemies.length + 2;

    const bullets: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    const stars: Array<{ x: number; y: number; vy: number }> = [];
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    const bgStars = Array.from({ length: 72 }, (_, i) => ({
      x: (i * 137) % arenaW,
      y: (i * 89) % arenaH,
      speed: 24 + (i % 5) * 18,
      size: 1 + (i % 2)
    }));

    const keys = { left: false, right: false };
    let fireCooldown = 0;
    let burstCooldown = 0;
    let invulnTimer = 0;
    let hudTimer = 0;
    let ended = false;
    let form: SpaceBotForm = 'scout', previousForm: SpaceBotForm = 'scout', transformTime = SPACE_TRANSFORM_DURATION, guardCooldown = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const transform = () => {
      if (ended || transformTime < SPACE_TRANSFORM_DURATION) return;
      previousForm = form; form = nextSpaceBotForm(form); transformTime = reducedMotion.matches ? SPACE_TRANSFORM_DURATION : 0;
      setHud(old => ({...old, form, guardReady:guardCooldown<=0})); SFX.uiTick();
    };
    transformRef.current = transform;

    const handleResize = () => {
      const nextW = Math.max(320, Math.floor(container.clientWidth || window.innerWidth));
      const nextH = Math.max(180, Math.floor(container.clientHeight || window.innerHeight - 48));
      if (Math.abs(nextW - arenaW) < 2 && Math.abs(nextH - arenaH) < 2) return;
      const sx = nextW / Math.max(1, arenaW);
      const sy = nextH / Math.max(1, arenaH);
      arenaW = nextW;
      arenaH = nextH;
      configureCanvas(arenaW, arenaH);

      shipX = Math.max(30, Math.min(arenaW - 30, shipX * sx));
      shipY = getShipY(arenaH);
      if(pointerTarget!==null)pointerTarget=Math.max(30,Math.min(arenaW-30,pointerTarget*sx));
      for(const signal of signals){signal.x=rescueSignalPosition(arenaW,signal.index);signal.y*=sy;}
      for (const en of enemies) {
        en.x = Math.max(en.radius + 10, Math.min(arenaW - en.radius - 10, en.x * sx));
        en.y *= sy;
      }
      for (const bullet of bullets) { bullet.x *= sx; bullet.y *= sy; }
      for (const spark of sparks) { spark.x *= sx; spark.y *= sy; }
      for (const st of stars) {
        st.x *= sx;
        st.y *= sy;
      }
      for (const s of bgStars) {
        s.x = (s.x * sx) % arenaW;
        s.y = (s.y * sy) % arenaH;
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    const spawnBoom = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 65 + Math.random() * 145;
        sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.4, color });
      }
    };

    const triggerTurboBurst = () => {
      if (burstCooldown > 0 || ended || (expedition&&wave===8)) return;
      burstCooldown = 1.25;
      bullets.push(
        { x: shipX - 10, y: shipY - 18, vx: -105, vy: -520 },
        { x: shipX, y: shipY - 22, vx: 0, vy: -560 },
        { x: shipX + 10, y: shipY - 18, vx: 105, vy: -520 }
      );
      SFX.boost();
    };
    burstTriggerRef.current = triggerTurboBurst;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
      if (e.key.toLowerCase() === 't' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); transform(); }
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if(!e.repeat) triggerTurboBurst();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * arenaW;
      const target=Math.max(30, Math.min(arenaW - 30, relX));
      if(expedition)pointerTarget=target;else shipX=target;
    };
    const onPointerDown = (e: PointerEvent) => {
      onPointerMove(e);
      triggerTurboBurst();
    };

    const clearKeys=()=>{keys.left=false;keys.right=false;pointerTarget=null;};
    window.addEventListener('blur',clearKeys);
    document.addEventListener('visibilitychange',clearKeys);
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
      const dt = Math.max(0,Math.min(0.04, (now - last) / 1000));
      last = now;
      if (ended) return;
      if (document.hidden) { rafId=requestAnimationFrame(loop); return; }
      transformTime=Math.min(SPACE_TRANSFORM_DURATION,transformTime+dt);
      if(reducedMotion.matches)transformTime=SPACE_TRANSFORM_DURATION;
      guardCooldown=Math.max(0,guardCooldown-dt);

      if(!expedition)timeLeft = Math.max(0, timeLeft - dt);
      if (!expedition&&spaceRoundOutcome(mode,shields,timeLeft,score,wave,enemies.length,rescued)==='won') {
        finishRound(true, `Defended space through Wave ${wave} and grabbed ${starsCollected} stars!`);
        return;
      }

      const shipSpeed = Math.max(410, arenaW * 0.68) * SPACE_BOT_FORM_INFO[form].speed;
      if (keys.left||keys.right)pointerTarget=null;
      if (keys.left) shipX -= shipSpeed * dt;
      if (keys.right) shipX += shipSpeed * dt;
      if(pointerTarget!==null)shipX=moveSpaceBotToward(shipX,pointerTarget,shipSpeed,dt);
      shipX = Math.max(30, Math.min(arenaW - 30, shipX));

      fireCooldown -= dt;
      burstCooldown = Math.max(0, burstCooldown - dt);
      invulnTimer = Math.max(0, invulnTimer - dt);

      // Auto-fire friendly twin lasers
      if (fireCooldown <= 0 && !(expedition&&wave===8)) {
        fireCooldown = SPACE_BOT_FORM_INFO[form].interval;
        const bulletSpd = Math.max(490, arenaH * 0.95);
        bullets.push(...spaceBotShots(form,shipX,shipY,bulletSpd));
      }

      // Move bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -16 || b.x < -16 || b.x > arenaW + 16) bullets.splice(i, 1);
      }

      const verticalScale = Math.max(0.95, arenaH / 460);

      // Move enemies & collide
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        en.x += en.vx * dt;
        en.y += en.vy * verticalScale * dt;
        if (en.x < en.radius + 10 || en.x > arenaW - en.radius - 10) {
          en.vx = -en.vx;
          en.x = Math.max(en.radius + 10, Math.min(arenaW - en.radius - 10, en.x));
        }

        // Bullet hits
        let destroyed = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(b.x - en.x, b.y - en.y) <= en.radius + 7) {
            bullets.splice(j, 1);
            en.hp -= 1;
            if (en.hp <= 0) {
              score += en.points;
              spawnBoom(en.x, en.y, en.color, 12);
              SFX.crystal();
              if (Math.random() < 0.45) {
                stars.push({ x: en.x, y: en.y, vy: 125 * verticalScale });
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
        if (invulnTimer <= 0 && Math.hypot(en.x - shipX, en.y - shipY) <= en.radius + 19) {
          const impact=spaceBotImpact(form,shields,guardCooldown);shields=impact.shields;guardCooldown=impact.guardCooldown;
          invulnTimer = 1.05;
          spawnBoom(shipX, shipY, impact.absorbed?'#6ee7b7':'#fb7185', 14);
          if(impact.absorbed)SFX.uiTick();else SFX.chirpConfused();
          enemies.splice(i, 1);
          if (shields <= 0) {
            finishRound(spaceRoundOutcome(mode,shields,timeLeft,score,wave,enemies.length,rescued)==='won', `Reached Wave ${wave} with ${score} pts`);
            return;
          }
          continue;
        }

        if (en.y > arenaH + 32) {
          en.y = -24;
          en.x = 44 + Math.random() * (arenaW - 88);
        }
      }

      // Next wave
      if (enemies.length === 0 && !(expedition&&wave===8)) {
        wave += 1;
        score += 45;
        if (wave > stageCount) {
          finishRound(true, `Cleared all 4 space waves with ${starsCollected} stars!`);
          return;
        }
        if(expedition){
          // Restore one shield between stages, without exceeding the starting three.
          shields=Math.min(3,shields+1);
          if(wave===8){bullets.length=0;stars.length=0;for(let i=0;i<SPACE_RESCUE_GOAL;i++)signals.push({x:rescueSignalPosition(arenaW,i),y:-25-i*42,index:i});}
        }
        enemies = spawn(wave, nextEnemyId);
        nextEnemyId += enemies.length + 2;
        SFX.laserSolved();
      }
      if(expedition&&wave===8){
        for(let i=signals.length-1;i>=0;i--){const signal=signals[i];signal.y+=90*verticalScale*dt;
          if(Math.hypot(signal.x-shipX,signal.y-shipY)<=SPACE_BOT_FORM_INFO[form].collectRadius){rescued++;score+=25;spawnBoom(signal.x,signal.y,'#6ee7b7',8);signals.splice(i,1);SFX.crystal();}
          else if(signal.y>arenaH+20)signal.y=-25;
        }
        if(spaceRoundOutcome(mode,shields,timeLeft,score,wave,enemies.length,rescued)==='won'){finishRound(true,'All 8 stages complete! Three rescue signals recovered.');return;}
      }

      // Collectible stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const st = stars[i];
        st.y += st.vy * dt;
        if (Math.hypot(st.x - shipX, st.y - shipY) <= SPACE_BOT_FORM_INFO[form].collectRadius) {
          starsCollected += 1;
          score += 25;
          spawnBoom(st.x, st.y, '#fde047', 8);
          SFX.crystal();
          stars.splice(i, 1);
        } else if (st.y > arenaH + 20) {
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
        if (s.y > arenaH) {
          s.y = -4;
          s.x = (s.x + 131) % arenaW;
        }
      }

      // Render space canvas
      ctx.fillStyle = expedition?['#07152b','#211a28','#161c3f','#10302c','#251f2e','#112941','#1c153c','#0a302d'][wave-1]:'#050a1a';
      ctx.fillRect(0, 0, arenaW, arenaH);

      for (const s of bgStars) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.fillRect(s.x, s.y, s.size, s.size * 2.2);
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
        ctx.arc(st.x, st.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rescue signals are friendly collectibles, never shot targets.
      for(const signal of signals){ctx.save();ctx.translate(signal.x,signal.y);ctx.strokeStyle='#a7f3d0';ctx.lineWidth=2;ctx.fillStyle='#155e56';ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#ecfdf5';ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();ctx.restore();}
      // Draw lasers
      ctx.fillStyle = '#38bdf8';
      for (const b of bullets) {
        ctx.beginPath();
        ctx.roundRect(b.x - 2.5, b.y - 8, 5, 16, 2.5);
        ctx.fill();
      }

      // Draw the selected companion as a transforming robot, never an aircraft.
      ctx.save();
      ctx.translate(shipX,shipY);
      if(invulnTimer>0&&!reducedMotion.matches&&Math.floor(invulnTimer*16)%2===0)ctx.globalAlpha=.65;
      drawSpaceBot(ctx,character,previousForm,form,transformTime/SPACE_TRANSFORM_DURATION,guardCooldown<=0);
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
        setHud({
          score,
          wave,
          shields,
          stars: starsCollected,
          timeLeft: Math.ceil(timeLeft),
          burstReady: burstCooldown <= 0.05&&!(expedition&&wave===8),
          form,
          guardReady: guardCooldown <= 0,
          rescued
        });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      burstTriggerRef.current = null;
      transformRef.current = null;
      window.removeEventListener('blur',clearKeys);
      document.removeEventListener('visibilitychange',clearKeys);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [character,mode,expedition,stageCount]);

  return (
    <div ref={containerRef} className="relative h-full w-full flex-1 overflow-hidden bg-[#050a1a]">
      {/* Floating Commercial Icon HUD — Zero Reading Needed */}
      <div className="pointer-events-none absolute inset-x-2.5 top-2 z-10 flex items-center justify-between gap-2 sm:inset-x-4 tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-black text-emerald-300 sm:text-sm">
            <Trophy className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            <span>{hud.score}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-black text-sky-300 sm:text-sm">
            <Layers className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            <span>{hud.wave}/{stageCount}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-amber-400/40 bg-slate-950/80 px-2.5 text-xs font-black text-amber-300 sm:text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-300" aria-hidden="true" />
            <span>{hud.stars}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2"
            aria-label={`${hud.shields} shields left`}
          >
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${i < hud.shields ? 'fill-emerald-400 text-emerald-300' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-black text-slate-200 sm:text-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{expedition?(hud.wave===8?hud.rescued+'/'+SPACE_RESCUE_GOAL:'∞'):hud.timeLeft}</span>
          </span>
        </div>
      </div>

      {expedition&&<div className="pointer-events-none absolute inset-x-3 top-12 z-10 text-center"><span className="rounded-lg bg-slate-950/85 px-2 py-1 text-xs font-black text-white">{SPACE_EXPEDITION_STAGES[hud.wave-1].title} · {hud.wave===8?hud.rescued+'/'+SPACE_RESCUE_GOAL:SPACE_EXPEDITION_STAGES[hud.wave-1].hint}</span></div>}
      <canvas
        ref={canvasRef}
        data-testid="space-shooter-canvas"
        className="block h-full w-full cursor-crosshair touch-none"
      />

      <button type="button" onClick={()=>transformRef.current?.()} aria-label={'Transform robot, current form '+SPACE_BOT_FORM_INFO[hud.form].label} className="safe-bottom absolute bottom-3 left-3 z-10 flex min-h-12 items-center gap-2 rounded-2xl border border-emerald-300 bg-slate-950/90 px-3 text-left text-emerald-100 focus-visible:ring-2 focus-visible:ring-white"><RotateCw className="h-5 w-5" aria-hidden="true"/><span><span className="block text-xs font-black">{SPACE_BOT_FORM_INFO[hud.form].label} · T</span><span className="block text-[10px]">{hud.form==='guard'?(hud.guardReady?'Shield ready':'Recharging'):SPACE_BOT_FORM_INFO[hud.form].hint}</span></span></button>
      {/* Chunky 3D Tactile Turbo Burst Button */}
      <button
        type="button"
        onClick={() => burstTriggerRef.current?.()}
        disabled={!hud.burstReady}
        aria-label="Fire 3-Way Turbo Burst"
        className={`safe-bottom absolute right-3 bottom-3 z-10 flex h-12 items-center gap-1.5 rounded-2xl border-2 px-4 text-sm font-black transition-all active:translate-y-0.5 sm:right-5 sm:bottom-4 ${
          hud.burstReady
            ? 'border-sky-200 bg-gradient-to-b from-sky-400 to-sky-600 text-slate-950 shadow-[0_4px_0_#0369a1]'
            : 'border-slate-700 bg-slate-900/85 text-slate-500'
        }`}
      >
        <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
        <span>×3</span>
      </button>
    </div>
  );
};

const SpaceShooterGame: React.FC<{character:BotCharacterId;onFinish:(score:number,bolts:number,won:boolean,detail:string)=>void}>=({character,onFinish})=>{
 const [mode,setMode]=useState<SpaceRoundMode|null>(null);
 if(mode)return <SpaceShooterRound character={character} mode={mode} onFinish={onFinish}/>;
 return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-slate-950 p-4" data-testid="space-mode-select">
  <h3 className="text-xl font-black text-white">Space Transform</h3><p className="text-sm text-sky-200">{BOT_CHARACTERS[character].name} · Choose your adventure</p>
  <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
   <button type="button" onClick={()=>setMode('classic')} className="min-h-24 rounded-2xl border-2 border-sky-400 bg-sky-950 p-3 text-left text-white"><span className="block text-lg font-black">Classic</span><span className="block text-sm">4 waves · 35 seconds</span><span className="block text-xs text-sky-200">Practice transformations</span></button>
   <button type="button" onClick={()=>setMode('expedition')} className="min-h-24 rounded-2xl border-2 border-emerald-400 bg-emerald-950 p-3 text-left text-white"><span className="block text-lg font-black">Expedition</span><span className="block text-sm">8 stages · No timer</span><span className="block text-xs text-emerald-200">Explore, transform, rescue</span></button>
  </div>
 </div>;
};

/* ============================================================================
 * STEM Mini-Game A: BUG DETECTIVE (Full-Screen Coding & Debugging Studio)
 * ========================================================================== */
const BUG_PACK_A: BugDetectivePuzzle[] = [
  BUG_DETECTIVE_PUZZLES[0],
  BUG_DETECTIVE_PUZZLES[2],
  BUG_DETECTIVE_PUZZLES[3]
];
const BUG_PACK_B: BugDetectivePuzzle[] = [
  BUG_DETECTIVE_PUZZLES[1],
  BUG_DETECTIVE_PUZZLES[4],
  BUG_DETECTIVE_PUZZLES[5]
];

const BugDetectiveGame: React.FC<{
  runSeed: number;
  onFinish: (
    score: number,
    bolts: number,
    won: boolean,
    detail: string,
    perfectFixes: number
  ) => void;
}> = ({ runSeed, onFinish }) => {
  const puzzles = useMemo(
    () => (runSeed % 2 === 1 ? BUG_PACK_A : BUG_PACK_B),
    [runSeed]
  );
  const [stageIdx, setStageIdx] = useState(0);
  const puzzle = puzzles[stageIdx];
  const [program, setProgram] = useState<CodeBlock[]>(() =>
    cloneProgramBlocks(puzzle.starterProgram)
  );
  const [lastSim, setLastSim] = useState<SimResult | null>(null);
  const [stepCursor, setStepCursor] = useState<number>(-1);
  const [botTile, setBotTile] = useState<number>(0);
  const [failingId, setFailingId] = useState<string | null>(null);
  const [attemptsOnPuzzle, setAttemptsOnPuzzle] = useState(0);
  const [firstTryFixes, setFirstTryFixes] = useState(0);
  const [showClue, setShowClue] = useState(false);

  const loadPuzzle = useCallback(
    (idx: number) => {
      const nextPuz = puzzles[idx];
      setStageIdx(idx);
      setProgram(cloneProgramBlocks(nextPuz.starterProgram));
      setLastSim(null);
      setStepCursor(-1);
      setBotTile(0);
      setFailingId(null);
      setAttemptsOnPuzzle(0);
      setShowClue(false);
    },
    [puzzles]
  );

  const handleTestFix = () => {
    const res = evaluateBugDetectiveAttempt(puzzle, program);
    setLastSim(res);
    setStepCursor(-1);
    const lastEv = res.events[res.events.length - 1];
    setBotTile(lastEv ? lastEv.toPos : 0);

    if (res.status === 'win') {
      SFX.laserSolved();
      setFailingId(null);
      const nextPerfect = firstTryFixes + (attemptsOnPuzzle === 0 ? 1 : 0);
      setFirstTryFixes(nextPerfect);
      window.setTimeout(() => {
        if (stageIdx + 1 < puzzles.length) {
          loadPuzzle(stageIdx + 1);
        } else {
          const reward = computeBugDetectiveReward(puzzles.length, nextPerfect);
          onFinish(
            reward.score,
            reward.bolts,
            true,
            `Fixed all ${puzzles.length} program bugs (${nextPerfect} first-try repairs)!`,
            nextPerfect
          );
        }
      }, 750);
    } else {
      SFX.chirpConfused();
      setAttemptsOnPuzzle((n) => n + 1);
      setFailingId(lastEv?.blockId || null);
      setShowClue(true);
    }
  };

  const handleStep = () => {
    SFX.uiTick();
    const sim = lastSim ?? evaluateBugDetectiveAttempt(puzzle, program);
    if (!lastSim) {
      setLastSim(sim);
    }
    if (sim.events.length === 0) {
      setBotTile(0);
      setFailingId(null);
      return;
    }
    const nextIdx = stepCursor + 1 < sim.events.length ? stepCursor + 1 : 0;
    const ev = sim.events[nextIdx];
    setStepCursor(nextIdx);
    setBotTile(ev.toPos);
    setFailingId(sim.status !== 'win' && nextIdx === sim.events.length - 1 ? ev.blockId : null);
  };

  const handleAddMove = () => {
    if (!puzzle.allowAddMove || program.length >= 8) return;
    SFX.click();
    setProgram((prev) => [
      ...prev,
      { id: `bd_added_${Date.now()}_${prev.length}`, type: 'MOVE' }
    ]);
    setLastSim(null);
    setStepCursor(-1);
    setFailingId(null);
  };

  const renderEditableBlock = (
    blk: CodeBlock,
    idx: number,
    siblingsLen: number,
    isTopLevel: boolean
  ) => {
    const isFailing = failingId === blk.id;
    const isActiveStep =
      stepCursor >= 0 && lastSim?.events[stepCursor]?.blockId === blk.id;

    const tone =
      blk.type === 'LOOP'
        ? 'border-emerald-400/75 bg-emerald-500/15 text-emerald-100'
        : blk.type === 'IF'
          ? 'border-violet-400/75 bg-violet-500/15 text-violet-100'
          : blk.type === 'BOOST'
            ? 'border-pink-400/75 bg-pink-500/15 text-pink-100'
            : blk.type === 'JUMP'
              ? 'border-amber-400/75 bg-amber-500/15 text-amber-100'
              : 'border-sky-400/75 bg-sky-500/15 text-sky-100';

    const ring = isFailing
      ? 'ring-2 ring-rose-400 border-rose-400'
      : isActiveStep
        ? 'ring-2 ring-cyan-300'
        : '';

    return (
      <div
        key={blk.id}
        data-bug-block={blk.id}
        data-failing={isFailing ? 'true' : 'false'}
        className={`flex flex-col gap-1.5 rounded-xl border-2 px-3 py-2 ${tone} ${ring}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <BlockIcon type={blk.type} condition={blk.condition} className="h-5 w-5 shrink-0" />
          <span className="text-xs font-black tracking-wide sm:text-sm">
            {blk.type === 'LOOP'
              ? `LOOP ×${blk.count || 2}`
              : blk.type === 'IF'
                ? `IF [${blk.condition || 'GAP'}]`
                : blk.type}
          </span>

          {blk.type === 'LOOP' && (
            <button
              type="button"
              data-bug-action={`loop-${blk.id}`}
              onClick={() => {
                SFX.click();
                setProgram((prev) => cycleBugLoopCount(prev, blk.id));
                setLastSim(null);
                setFailingId(null);
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-400 px-2 py-0.5 text-[11px] font-black text-slate-950 hover:bg-emerald-300 active:scale-95"
            >
              ×{blk.count || 2} Tap
            </button>
          )}

          {blk.type === 'IF' && (
            <button
              type="button"
              data-bug-action={`if-${blk.id}`}
              onClick={() => {
                SFX.click();
                setProgram((prev) => cycleBugIfCondition(prev, blk.id));
                setLastSim(null);
                setFailingId(null);
              }}
              className="rounded-lg border border-violet-300 bg-violet-400 px-2 py-0.5 text-[11px] font-black text-slate-950 hover:bg-violet-300 active:scale-95"
            >
              Swap Sensor
            </button>
          )}

          {puzzle.operationHint === 'swap_cmd' &&
            (blk.type === 'MOVE' || blk.type === 'JUMP' || blk.type === 'BOOST') && (
              <button
                type="button"
                data-bug-action={`cmd-${blk.id}`}
                onClick={() => {
                  SFX.click();
                  setProgram((prev) => cycleBugActionBlockType(prev, blk.id));
                  setLastSim(null);
                  setFailingId(null);
                }}
                className="rounded-lg border border-amber-300/80 bg-slate-900/90 px-2 py-0.5 text-[11px] font-black text-amber-200 hover:border-amber-200 active:scale-95"
              >
                Switch Action
              </button>
            )}

          {isTopLevel && siblingsLen > 1 && idx + 1 < siblingsLen && (
            <button
              type="button"
              data-bug-action={`swap-${idx}`}
              onClick={() => {
                SFX.click();
                setProgram((prev) => swapTopLevelBugBlocks(prev, idx, idx + 1));
                setLastSim(null);
                setFailingId(null);
              }}
              aria-label={`Swap block ${idx + 1} with next block`}
              className="ml-auto flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/90 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:border-sky-400 active:scale-95"
            >
              <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
              <span>Swap</span>
            </button>
          )}
        </div>

        {blk.children && blk.children.length > 0 && (
          <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-slate-600/70 pl-2.5">
            {blk.children.map((ch, cIdx) =>
              renderEditableBlock(ch, cIdx, blk.children!.length, false)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="bug-detective-game"
      className="flex h-full w-full flex-1 flex-col overflow-hidden bg-slate-950"
    >
      {/* Main Full-Screen Scrollable Workspace */}
      <div className="touch-pan-y mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300 tabular-nums">
          <div className="flex items-center gap-2">
            <span className="font-black text-sky-300">
              Puzzle {stageIdx + 1}/{puzzles.length}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-black text-white">{puzzle.title}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
          </div>
          <span className="font-black text-emerald-300">Lesson: {puzzle.bugLesson}</span>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Column: Prompt + Test Track + Feedback */}
          <div className="flex flex-col gap-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs font-medium text-slate-100 sm:text-sm">
              {puzzle.prompt}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                <span>Test Track</span>
                <span>
                  Bot Tile {botTile + 1}/{puzzle.level.track.length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {puzzle.level.track.map((tile, idx) => {
                  const hasBot = botTile === idx;
                  const tileTone =
                    tile.type === 'gate'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : tile.type === 'gap'
                        ? 'border-rose-400/70 bg-rose-950/60 text-rose-200'
                        : tile.type === 'mud'
                          ? 'border-amber-500/70 bg-amber-950/60 text-amber-200'
                          : tile.type === 'ramp'
                            ? 'border-pink-400/70 bg-pink-950/60 text-pink-200'
                            : 'border-slate-700 bg-slate-800/90 text-slate-200';
                  return (
                    <div
                      key={idx}
                      className={`relative flex h-14 flex-col items-center justify-center rounded-xl border text-[11px] font-black uppercase sm:h-16 ${tileTone} ${
                        hasBot ? 'ring-2 ring-sky-300' : ''
                      }`}
                    >
                      <span>{tile.type === 'normal' ? `Tile ${idx}` : tile.type}</span>
                      {tile.crystal && <span className="text-[10px] text-cyan-300">Gem</span>}
                      {hasBot && (
                        <span className="mt-0.5 rounded bg-sky-400 px-1.5 text-[9px] font-black text-slate-950">
                          BOT
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {(lastSim || showClue) && (
              <div
                data-testid="bug-detective-feedback"
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                  lastSim?.status === 'win'
                    ? 'border-emerald-400/80 bg-emerald-500/15 text-emerald-200'
                    : 'border-amber-400/80 bg-amber-500/15 text-amber-100'
                }`}
              >
                {lastSim?.status === 'win'
                  ? 'Bug Squashed! SparkBot reached the Finish Gate!'
                  : lastSim?.failReason || puzzle.prompt}
              </div>
            )}
          </div>

          {/* Right Column: Editable Program Blocks */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/75 p-3.5 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Program Blocks (Tap to Repair)
              </span>
              {puzzle.allowAddMove && (
                <button
                  type="button"
                  data-bug-action="add-move"
                  onClick={handleAddMove}
                  className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-sky-400/80 bg-sky-500/20 px-2.5 text-xs font-black text-sky-100 hover:bg-sky-500/30 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Add MOVE</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {program.map((blk, i) => renderEditableBlock(blk, i, program.length, true))}
            </div>
          </div>
        </div>
      </div>

      {/* Slim Pinned Bottom Action Bar */}
      <div className="safe-bottom border-t border-slate-800 bg-slate-900/95 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                SFX.click();
                loadPuzzle(stageIdx);
              }}
              className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:border-slate-500 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleStep}
              className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-400/70 bg-sky-500/20 px-3 text-xs font-black text-sky-100 hover:bg-sky-500/30 active:scale-95"
            >
              <StepForward className="h-4 w-4" aria-hidden="true" />
              <span>Step</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="bug-test-fix-btn"
            onClick={handleTestFix}
            className="flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-500 px-4 text-xs font-black text-slate-950 hover:bg-emerald-400 active:scale-95 sm:px-5 sm:text-sm"
          >
            <Play className="h-4 w-4 fill-slate-950" aria-hidden="true" />
            <span>Test Fix</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * STEM Mini-Game B: LOGIC GATE LAB (Full-Screen Interactive Circuit Bench)
 * ========================================================================== */
const LOGIC_PACK_A: LogicGatePuzzle[] = [
  LOGIC_GATE_PUZZLES[0],
  LOGIC_GATE_PUZZLES[2],
  LOGIC_GATE_PUZZLES[3],
  LOGIC_GATE_PUZZLES[5]
];
const LOGIC_PACK_B: LogicGatePuzzle[] = [
  LOGIC_GATE_PUZZLES[1],
  LOGIC_GATE_PUZZLES[2],
  LOGIC_GATE_PUZZLES[4],
  LOGIC_GATE_PUZZLES[5]
];

const LogicGateLabGame: React.FC<{
  runSeed: number;
  onFinish: (
    score: number,
    bolts: number,
    won: boolean,
    detail: string,
    gatesSolved: number
  ) => void;
}> = ({ runSeed, onFinish }) => {
  const boards = useMemo(
    () => (runSeed % 2 === 1 ? LOGIC_PACK_A : LOGIC_PACK_B),
    [runSeed]
  );
  const [boardIdx, setBoardIdx] = useState(0);
  const puzzle = boards[boardIdx];

  const [switchValues, setSwitchValues] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const inp of puzzle.inputs) init[inp.id] = inp.initialValue;
    return init;
  });
  const [gateOverrides, setGateOverrides] = useState<Record<string, LogicGateKind>>({});
  const [checksCount, setChecksCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const loadBoard = useCallback(
    (idx: number) => {
      const nextB = boards[idx];
      setBoardIdx(idx);
      const init: Record<string, boolean> = {};
      for (const inp of nextB.inputs) init[inp.id] = inp.initialValue;
      setSwitchValues(init);
      setGateOverrides({});
      setStatusMessage(null);
      setShowHint(false);
    },
    [boards]
  );

  const evalRes = useMemo(
    () => evaluateLogicCircuit(puzzle, switchValues, gateOverrides),
    [gateOverrides, puzzle, switchValues]
  );

  const hasNotStage = puzzle.gates.length > 1;
  const primaryGate = puzzle.gates[puzzle.gates.length - 1];
  const primaryGateKind = primaryGate.locked
    ? primaryGate.kind
    : gateOverrides[primaryGate.id] || primaryGate.kind;

  const handleToggleSwitch = (id: string) => {
    SFX.uiTick();
    setSwitchValues((prev) => ({ ...prev, [id]: !prev[id] }));
    setStatusMessage(null);
  };

  const handleSelectGate = (gateId: string, kind: LogicGateKind) => {
    SFX.mirror();
    setGateOverrides((prev) => ({ ...prev, [gateId]: kind }));
    setStatusMessage(null);
  };

  const handleVerifyBoard = () => {
    const nextChecks = checksCount + 1;
    setChecksCount(nextChecks);
    if (evalRes.solved) {
      SFX.laserSolved();
      setStatusMessage(`${puzzle.outputLabel} Powered! Advancing...`);
      window.setTimeout(() => {
        if (boardIdx + 1 < boards.length) {
          loadBoard(boardIdx + 1);
        } else {
          const reward = computeLogicGateReward(boards.length, nextChecks);
          onFinish(
            reward.score,
            reward.bolts,
            true,
            `Wired all ${boards.length} Logic Gate boards (AND · OR · NOT)!`,
            boards.length
          );
        }
      }, 650);
    } else {
      SFX.chirpConfused();
      setShowHint(true);
      setStatusMessage(
        puzzle.mode === 'toggle_inputs'
          ? `Output is still OFF (0). Flip the input switches so ${puzzle.outputLabel} turns ON!`
          : 'Some Truth Check tests failed. Try picking a different Logic Gate chip!'
      );
    }
  };

  return (
    <div
      data-testid="logic-gate-lab-game"
      className="flex h-full w-full flex-1 flex-col overflow-hidden bg-slate-950"
    >
      <div className="touch-pan-y mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300 tabular-nums">
          <div className="flex items-center gap-2">
            <span className="font-black text-violet-300">
              Board {boardIdx + 1}/{boards.length}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-black text-white">{puzzle.title}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
          </div>
          <span className={evalRes.outputActive ? 'font-black text-emerald-300' : 'text-slate-400'}>
            Live Output: {evalRes.outputActive ? '1 (ON)' : '0 (OFF)'}
          </span>
        </div>

        {/* Spacious Full-Screen Circuit Bench */}
        <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-4">
          {/* Interactive SVG Circuit Board (8 cols on lg) */}
          <div className="flex flex-1 flex-col justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/85 p-4 sm:p-6 lg:col-span-8">
            <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
              {/* Column 1: Input Switches */}
              <div className="flex flex-col gap-3">
                {puzzle.inputs.map((inp) => {
                  const isOn = Boolean(switchValues[inp.id]);
                  return (
                    <button
                      key={inp.id}
                      type="button"
                      data-logic-switch={inp.id}
                      aria-pressed={isOn}
                      onClick={() => handleToggleSwitch(inp.id)}
                      className={`flex min-h-[58px] flex-col items-start justify-center rounded-xl border-2 px-3 py-2 text-left transition-colors active:scale-95 sm:min-h-[68px] ${
                        isOn
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-400'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1 text-xs font-black sm:text-sm">
                        <span>{inp.id}</span>
                        <span className={isOn ? 'text-emerald-300' : 'text-slate-500'}>
                          {isOn ? '1 ON' : '0 OFF'}
                        </span>
                      </div>
                      <span className="mt-0.5 truncate text-[11px] font-medium text-slate-300">
                        {inp.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Column 2: Gate Nodes & Live SVG Wires */}
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="relative flex w-full items-center justify-center py-2">
                  <svg viewBox="0 0 180 120" className="h-28 w-full sm:h-36" aria-hidden="true">
                    {puzzle.inputs.map((inp, idx) => {
                      const yStart = puzzle.inputs.length === 1 ? 60 : idx === 0 ? 30 : 90;
                      const activeWire = Boolean(evalRes.nodeValues[inp.id]);
                      return (
                        <path
                          key={inp.id}
                          d={`M 4 ${yStart} C 48 ${yStart}, 48 60, 90 60`}
                          fill="none"
                          stroke={activeWire ? '#22d3ee' : '#475569'}
                          strokeWidth={activeWire ? 5 : 3}
                          strokeLinecap="round"
                        />
                      );
                    })}
                    <line
                      x1="90"
                      y1="60"
                      x2="176"
                      y2="60"
                      stroke={evalRes.outputActive ? '#34d399' : '#475569'}
                      strokeWidth={evalRes.outputActive ? 5 : 3}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div
                    data-testid="logic-primary-gate"
                    className={`absolute left-1/2 top-1/2 flex min-w-[82px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl border-2 px-2.5 py-1.5 text-center shadow-lg sm:min-w-[108px] sm:px-3 sm:py-2 ${
                      evalRes.outputActive
                        ? 'border-cyan-400 bg-slate-950/95 text-cyan-100 shadow-cyan-500/20'
                        : 'border-slate-600 bg-slate-950/95 text-slate-200'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">
                      {primaryGate.label}
                    </span>
                    <span className="text-sm font-black text-white sm:text-lg">{primaryGateKind}</span>
                  </div>
                </div>

                {hasNotStage && (
                  <div className="rounded-lg border border-amber-400/70 bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-200">
                    B → NOT = {evalRes.nodeValues.G_NOT ? '1' : '0'}
                  </div>
                )}

                {!primaryGate.locked && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {(['AND', 'OR', 'NOT'] as LogicGateKind[]).map((kind) => {
                      const selected = primaryGateKind === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          data-logic-gate-choice={kind}
                          onClick={() => handleSelectGate(primaryGate.id, kind)}
                          className={`h-9 rounded-xl border px-3 text-xs font-black transition-transform active:scale-95 ${
                            selected
                              ? 'border-violet-300 bg-violet-500 text-white'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-violet-400'
                          }`}
                        >
                          {kind}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column 3: Vault Output Core */}
              <div className="flex flex-col items-center justify-center">
                <div
                  data-testid="logic-output-core"
                  className={`flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 text-center transition-colors sm:h-32 sm:w-32 ${
                    evalRes.outputActive
                      ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.35)]'
                      : 'border-slate-700 bg-slate-950 text-slate-400'
                  }`}
                >
                  <Cpu
                    className={`h-7 w-7 sm:h-9 sm:w-9 ${evalRes.outputActive ? 'text-emerald-300' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                  <span className="mt-1 text-xs font-black sm:text-sm">{puzzle.outputLabel}</span>
                  <span className="text-[11px] font-bold">
                    {evalRes.outputActive ? 'POWERED' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rule + Truth Table + Hint Panel (4 cols on lg) */}
          <div className="flex shrink-0 flex-col justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/75 p-4 lg:col-span-4 lg:self-start">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium leading-relaxed text-slate-200 sm:text-sm">
                {puzzle.ruleSummary}
              </p>

              {evalRes.truthResults.length > 0 && (
                <div
                  data-testid="logic-truth-table"
                  className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 p-3"
                >
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Safety Truth Checks
                  </div>
                  {evalRes.truthResults.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums"
                    >
                      <span className="text-slate-300">
                        {Object.entries(row.inputs)
                          .map(([k, v]) => `${k}=${v ? 1 : 0}`)
                          .join(' · ')}
                      </span>
                      <span className="text-slate-400">→ Need {row.expected ? 1 : 0}</span>
                      <span className={row.passed ? 'text-emerald-300' : 'text-rose-300'}>
                        {row.passed ? 'Pass' : `Got ${row.actual ? 1 : 0}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showHint && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-100">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>{puzzle.hint}</span>
                </div>
              )}

              {statusMessage && (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    evalRes.solved
                      ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200'
                      : 'border-rose-400/70 bg-rose-500/15 text-rose-200'
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slim Pinned Bottom Action Bar */}
      <div className="safe-bottom border-t border-slate-800 bg-slate-900/95 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              SFX.uiTick();
              setShowHint((v) => !v);
            }}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:border-amber-400 active:scale-95"
          >
            <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <span>Hint</span>
          </button>
          <button
            type="button"
            data-testid="logic-verify-btn"
            onClick={handleVerifyBoard}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-500 px-4 text-xs font-black text-slate-950 hover:bg-emerald-400 active:scale-95 sm:px-5 sm:text-sm"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Verify Circuit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * Main Full-Screen Arcade Game Room Hub & Player
 * ========================================================================== */
export const GameRoomModal: React.FC<GameRoomModalProps> = ({
  visible,
  activeCharacter,
  equippedDroneId = null,
  totalBolts,
  hasNextLevel,
  nextJourney,
  voiceMuted=false,
  chassisInfo,
  externalSummary = null,
  onClearExternalSummary,
  onAwardBolts,
  onEducationalProgress,
  onLaunchRobotRun,
  onLaunchPlanetAdventure,
  onNextLevel,
  onClose
}) => {
  const [view, setView] = useState<'HUB' | 'PLAYING' | 'ROUND_SUMMARY'>('HUB');
  const [activeGame, setActiveGame] = useState<ArcadeGameId | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<GameRoomRoundSummary | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const charDef = useMemo(() => BOT_CHARACTERS[activeCharacter], [activeCharacter]);
  const planetCaps = useMemo(
    () => (chassisInfo ? derivePlanetCapabilities(chassisInfo) : null),
    [chassisInfo]
  );

  useEffect(() => {
    const syncFs = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFs);
    return () => document.removeEventListener('fullscreenchange', syncFs);
  }, []);

  useEffect(() => {
    if (!visible) {
      setView('HUB');
      setActiveGame(null);
      setSummary(null);
    } else if (externalSummary) {
      setActiveGame(externalSummary.gameId);
      setSummary(externalSummary);
      setView('ROUND_SUMMARY');
    }
  }, [externalSummary, visible]);

  const toggleBrowserFullscreen = useCallback(() => {
    SFX.uiTick();
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSelectGame = useCallback(
    (gameId: ArcadeGameId) => {
      if (gameId === 'planet_adventure' && !onLaunchPlanetAdventure) return;
      SFX.click();
      onClearExternalSummary?.();
      if (gameId === 'robot_run') {
        onLaunchRobotRun();
        return;
      }
      if (gameId === 'planet_adventure' && onLaunchPlanetAdventure) {
        onLaunchPlanetAdventure();
        return;
      }
      setActiveGame(gameId);
      setSummary(null);
      setRunKey((k) => k + 1);
      setView('PLAYING');
    },
    [onClearExternalSummary, onLaunchPlanetAdventure, onLaunchRobotRun]
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

  const activeCard = ALL_GAME_ROOM_GAMES.find((g) => g.id === activeGame) || null;
  const canBrowserFullscreen =
    typeof document !== 'undefined' && Boolean(document.documentElement?.requestFullscreen);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Arcade Game Room"
      data-testid="game-room-modal"
      data-gameroom-view={view.toLowerCase()}
      data-active-game={activeGame || ''}
      data-fullscreen="true"
      className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-slate-950"
    >
      {/* Slim Full-Width Commercial Header Bar (>= 40-44px touch targets) */}
      <header className="safe-top flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/95 px-2.5 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {view !== 'HUB' && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClearExternalSummary?.();
                setView('HUB');
                setActiveGame(null);
                setSummary(null);
              }}
              aria-label="Back to Game Room"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-slate-700 bg-slate-800 px-3 text-xs font-black text-slate-100 hover:border-sky-400 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Games</span>
            </button>
          )}
          <Gamepad2 className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <h2 className="truncate text-sm font-black tracking-tight text-white sm:text-base">
            {view === 'PLAYING' && activeCard ? activeCard.title : 'Arcade'}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span
            aria-label={`${totalBolts} Bolts`}
            className="tabular flex h-10 items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-500/15 px-2.5 text-xs font-black text-amber-200 sm:text-sm"
          >
            <Zap className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
            <span>{totalBolts}</span>
          </span>
          {view === 'PLAYING' && activeGame && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                setRunKey((k) => k + 1);
              }}
              aria-label="Restart Mini-Game"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>
          )}
          {canBrowserFullscreen && (
            <button
              type="button"
              data-testid="gameroom-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              aria-label={isNativeFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800 text-sky-300 hover:border-sky-400 active:scale-95 sm:flex"
            >
              {isNativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          {view !== 'PLAYING' && hasNextLevel && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onNextLevel();
              }}
              aria-label="Next Mission"
              className="flex h-10 items-center gap-1 whitespace-nowrap rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 text-xs font-black text-slate-950 shadow-[0_3px_0_#047857] active:translate-y-0.5"
            >
              <Play className="h-3.5 w-3.5 fill-slate-950" />
              <span>Next</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              SFX.click();
              onClose();
            }}
            aria-label="Close Game Room"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Surface: Edge-to-Edge in PLAYING, Clean Full-Screen Hub/Summary */}
      {view === 'PLAYING' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeGame === 'bug_detective' && (
            <BugDetectiveGame
              key={runKey}
              runSeed={runKey}
              onFinish={(score, bolts, won, detail, perfectFixes) => {
                onEducationalProgress?.({
                  gameId: 'bug_detective',
                  won,
                  perfectFixes
                });
                handleRoundFinish('bug_detective', 'Bug Detective', score, bolts, won, detail);
              }}
            />
          )}

          {activeGame === 'logic_gate_lab' && (
            <LogicGateLabGame
              key={runKey}
              runSeed={runKey}
              onFinish={(score, bolts, won, detail, gatesSolved) => {
                onEducationalProgress?.({
                  gameId: 'logic_gate_lab',
                  won,
                  gatesSolved
                });
                handleRoundFinish('logic_gate_lab', 'Logic Gate Lab', score, bolts, won, detail);
              }}
            />
          )}

          {activeGame === 'break_wall' && (
            <WallBreakerCanvasGame
              key={runKey}
              activeCharacter={activeCharacter}
              equippedDroneId={equippedDroneId}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('break_wall', 'Wall Breaker', score, bolts, won, detail)
              }
            />
          )}

          {activeGame === 'connect_nodes' && (
            <PowerConnectGame
              key={runKey}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('connect_nodes', 'Power Connect', score, bolts, won, detail)
              }
            />
          )}

          {activeGame === 'space_shooter' && (
            <SpaceShooterGame
              key={runKey}
              character={activeCharacter}
              onFinish={(score, bolts, won, detail) =>
                handleRoundFinish('space_shooter', 'Space Shooter', score, bolts, won, detail)
              }
            />
          )}
        </div>
      ) : (
        <div className="touch-pan-y safe-bottom flex-1 overflow-y-auto px-3 py-3.5 sm:px-6 sm:py-5">
          {view === 'HUB' && (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
              <section className="relative isolate overflow-hidden rounded-3xl border border-violet-500/50 bg-gradient-to-br from-slate-900 via-indigo-950 to-cyan-950 p-4" data-testid="living-game-room">
                <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 -z-10 h-36 w-36 rounded-full border-[18px] border-cyan-400/20 motion-safe:animate-pulse"/>
                <div aria-hidden="true" className="pointer-events-none absolute bottom-4 right-12 -z-10 h-8 w-8 rotate-45 rounded-lg bg-violet-400/30 motion-safe:animate-bounce"/>
                <div className="flex items-center gap-3"><Gamepad2 className="h-10 w-10 text-cyan-300"/><div className="flex-1"><h3 className="text-lg font-black text-white">SparkBot Clubhouse</h3><p className="text-xs text-sky-200">Play a mini-game or keep exploring!</p></div><CharacterVoiceButton id="room_welcome" text="Hey explorer! Welcome to my clubhouse. Pick a game, or let's go on our next adventure!" muted={voiceMuted}/></div>
              </section>
              {nextJourney&&hasNextLevel&&<JourneyCard next={nextJourney} onStart={onNextLevel}/>}
              <div className="flex flex-col gap-3" data-testid="clubhouse-card-view">
              {/* Action Arcade Cartridges First — Visual Scene Cards (Zero Reading Needed!) */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <Gamepad2 className="h-5 w-5 text-amber-300" aria-hidden="true" />
                  <h3 className="text-sm font-black tracking-tight text-white">Action Games</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ARCADE_GAMES.map((game) => {
                    const isPlanetCard = game.id === 'planet_adventure';
                    return (
                      <button
                        key={game.id}
                        type="button"
                        data-arcade-game={game.id}
                        disabled={isPlanetCard&&!onLaunchPlanetAdventure}
                        onClick={() => handleSelectGame(game.id)}
                        aria-label={`Play ${game.title}`}
                        className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-700/90 bg-slate-900 p-2 text-left transition-all hover:-translate-y-0.5 hover:border-sky-400/80 active:scale-[0.98] disabled:opacity-50 ${
                          isPlanetCard ? 'col-span-2 sm:col-span-2' : ''
                        }`}
                      >
                        {/* Hand-Crafted Game Scene Cover */}
                        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800">
                          <ArcadeSceneArt
                            gameId={game.id}
                            className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] sm:h-28"
                          />
                          <span className="tabular absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-xl bg-slate-950/85 px-2 py-0.5 text-[11px] font-black text-amber-300">
                            <Zap className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                            +{game.baseBolts}
                          </span>
                        </div>

                        {/* Equipment Icon Row for Planet Expedition */}
                        {isPlanetCard && planetCaps && (
                          <div
                            data-testid="planet-card-loadout"
                            className="mt-2 flex flex-wrap items-center gap-1.5 px-1"
                          >
                            {PLANET_EQUIPMENT_META.map((item) => {
                              const unlocked =
                                item.part === 'treads'
                                  ? planetCaps.hasTreads
                                  : item.part === 'thrusters'
                                    ? planetCaps.hasThrusters
                                    : item.part === 'booster'
                                      ? planetCaps.hasBooster
                                      : item.part === 'laser'
                                        ? planetCaps.hasLaser
                                        : planetCaps.hasMagnet;
                              return (
                                <span
                                  key={item.part}
                                  data-loadout-part={item.part}
                                  data-loadout-unlocked={unlocked ? 'true' : 'false'}
                                  aria-label={`${item.label} ${unlocked ? 'ready' : 'locked'}`}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${
                                    unlocked
                                      ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                                      : 'border-slate-700 bg-slate-950 text-slate-500 opacity-55'
                                  }`}
                                >
                                  <PartIcon id={item.part} className="h-4.5 w-4.5" />
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Bold Title + Chunky Play Badge */}
                        <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-0.5">
                          <h4 className="min-w-0 break-words text-sm font-black leading-tight text-white sm:text-base">
                            {game.title}
                          </h4>
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-950 shadow-md transition-transform group-hover:scale-105"
                            style={{ backgroundColor: game.accentHex }}
                          >
                            <Play className="h-4 w-4 fill-slate-950" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* STEM Brain Lab Visual Cartridges */}
              <section className="flex flex-col gap-3 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 px-1">
                  <Cpu className="h-5 w-5 text-sky-300" aria-hidden="true" />
                  <h3 className="text-sm font-black tracking-tight text-white">STEM Lab</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {EDUCATIONAL_MINI_GAMES.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      data-arcade-game={game.id}
                      onClick={() => handleSelectGame(game.id)}
                      aria-label={`Play ${game.title}`}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-slate-700/90 bg-slate-900 p-2 text-left transition-all hover:-translate-y-0.5 hover:border-sky-400/80 active:scale-[0.98]"
                    >
                      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800">
                        <ArcadeSceneArt
                          gameId={game.id}
                          className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] sm:h-28"
                        />
                        <span className="tabular absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-xl bg-slate-950/85 px-2 py-0.5 text-[11px] font-black text-amber-300">
                          <Zap className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                          +{game.baseBolts}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-0.5">
                        <h4 className="min-w-0 break-words text-sm font-black leading-tight text-white sm:text-base">
                          {game.title}
                        </h4>
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-950 shadow-md transition-transform group-hover:scale-105"
                          style={{ backgroundColor: game.accentHex }}
                        >
                          <Play className="h-4 w-4 fill-slate-950" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              </div>
            </div>
          )}

          {view === 'ROUND_SUMMARY' && summary && (
            <div
              data-testid="game-room-summary"
              className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-5 py-6 text-center"
            >
              {/* 3 Big Visual Stars */}
              <div className="flex items-center gap-2.5">
                {[1, 2, 3].map((s) => {
                  const earned = summary.won ? 3 : summary.score >= 120 ? 2 : 1;
                  return (
                    <Star
                      key={s}
                      className={`${s === 2 ? '-translate-y-2 h-14 w-14' : 'h-11 w-11'} ${
                        s <= earned
                          ? 'fill-amber-400 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.65)]'
                          : 'fill-slate-800 text-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              <h3 className="text-2xl font-black text-white">{summary.title}</h3>

              {/* Visual Score + Bolts Tiles */}
              <div className="grid w-full grid-cols-2 gap-3 tabular-nums">
                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-sky-400/50 bg-slate-900 py-4">
                  <Trophy className="h-6 w-6 text-sky-300" aria-hidden="true" />
                  <span className="text-2xl font-black text-white">{summary.score}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-amber-400/60 bg-amber-500/12 py-4">
                  <Zap className="h-6 w-6 fill-amber-300 text-amber-300" aria-hidden="true" />
                  <span className="text-2xl font-black text-amber-300">+{summary.boltsEarned}</span>
                </div>
              </div>

              {/* Big Chunky 3D Tactile Buttons */}
              <div className="grid w-full grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectGame(summary.gameId)}
                  aria-label="Play Again"
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-base font-black text-slate-950 shadow-[0_4px_0_#047857] active:translate-y-0.5"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onClearExternalSummary?.();
                    setView('HUB');
                    setActiveGame(null);
                    setSummary(null);
                  }}
                  aria-label="Switch Game"
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-600 bg-slate-800 text-base font-black text-white hover:border-sky-400 active:scale-95"
                >
                  <Gamepad2 className="h-5 w-5 text-amber-300" />
                  <span>Games</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
