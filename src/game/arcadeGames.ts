/**
 * Pure game rules, puzzle generation, and reward math for the post-mission
 * Arcade Game Room (Wall Breaker, Power Connect, Robot Run & Collect, Space Shooter).
 */

export type ArcadeGameId =
  | 'bug_detective'
  | 'logic_gate_lab'
  | 'break_wall'
  | 'connect_nodes'
  | 'robot_run'
  | 'space_shooter'
  | 'planet_adventure';

export interface ArcadeGameCardDef {
  id: ArcadeGameId;
  title: string;
  subtitle: string;
  controlsHint: string;
  accentHex: string;
  baseBolts: number;
  isEducational?: boolean;
}

export const EDUCATIONAL_MINI_GAMES: ArcadeGameCardDef[] = [
  {
    id: 'bug_detective',
    title: 'Bug Detective',
    subtitle: 'Spot logic bugs, reorder Parsons blocks, and step-test SparkBot repairs',
    controlsHint: 'Tap blocks to edit or swap · Test Fix',
    accentHex: '#38bdf8',
    baseBolts: 35,
    isEducational: true
  },
  {
    id: 'logic_gate_lab',
    title: 'Logic Gate Lab',
    subtitle: 'Flip binary sensors and wire AND, OR, and NOT gates to unlock vault cores',
    controlsHint: 'Toggle switches · Select gate chip · Verify',
    accentHex: '#a78bfa',
    baseBolts: 35,
    isEducational: true
  }
];

export const ARCADE_GAMES: ArcadeGameCardDef[] = [
  {
    id: 'break_wall',
    title: 'Wall Breaker',
    subtitle: 'Pilot your robot deflector, catch power-ups, blast Bomb Cores, and fire Mega Lasers',
    controlsHint: 'Slide or A/D to move · Space / Tap Blast for Mega Laser',
    accentHex: '#f59e0b',
    baseBolts: 30
  },
  {
    id: 'connect_nodes',
    title: 'Power Connect',
    subtitle: 'Rotate energy conduits to link every power core',
    controlsHint: 'Tap or click tiles to rotate',
    accentHex: '#22d3ee',
    baseBolts: 35
  },
  {
    id: 'robot_run',
    title: 'Robot Run & Collect',
    subtitle: 'Dash along the 3D neon track and grab glowing bolts',
    controlsHint: 'A/D or Arrows to steer · Space to jump',
    accentHex: '#d946ef',
    baseBolts: 50
  },
  {
    id: 'space_shooter',
    title: 'Space Shooter',
    subtitle: 'Pilot your star-bot, blast drones, and collect stars',
    controlsHint: 'Move mouse/touch or A/D · Space turbo burst',
    accentHex: '#34d399',
    baseBolts: 40
  },
  {
    id: 'planet_adventure',
    title: 'Planet Expedition',
    subtitle: 'Explore an alien crater with your bot gear, collect 5 Energy Cores, and power the Exit Gate',
    controlsHint: 'WASD/Arrows move · Space jump · Shift boost · E laser',
    accentHex: '#10b981',
    baseBolts: 65
  }
];

export const ALL_GAME_ROOM_GAMES: ArcadeGameCardDef[] = [
  ...EDUCATIONAL_MINI_GAMES,
  ...ARCADE_GAMES
];

/* ============================================================================
 * 1. WALL BREAKER (Robot Deflector Reactor Smash with Special Cores & Power-Ups)
 * ========================================================================== */

export type WallBrickKind = 'standard' | 'armored' | 'bomb' | 'prism' | 'bolt_vault';

export type WallPowerUpKind = 'wide' | 'multi' | 'laser' | 'fire' | 'bolt';

export interface WallBrick {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  points: number;
  hasBonusBolt: boolean;
  kind?: WallBrickKind;
  hitFlash?: number;
}

const WALL_ROW_COLORS = ['#fb7185', '#f59e0b', '#38bdf8', '#34d399'];

export function createWallBreakerLayout(
  arenaWidth: number,
  arenaHeight: number,
  stage = 1
): WallBrick[] {
  const cols = 7;
  const rows = Math.min(5, 3 + Math.min(2, stage - 1));
  const padX = Math.max(18, Math.min(34, Math.floor(arenaWidth * 0.055)));
  const topY = 58;
  const gap = Math.max(6, Math.min(10, Math.floor(arenaWidth * 0.015)));
  const usableW = Math.max(240, arenaWidth - padX * 2);
  const brickW = (usableW - gap * (cols - 1)) / cols;
  const brickH = Math.min(28, Math.max(20, Math.floor(arenaHeight * 0.056)));

  const bricks: WallBrick[] = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Architectural arch cutouts on stage >= 2
      if (stage >= 2 && r === rows - 1 && (c === 1 || c === cols - 2)) continue;

      const isBomb =
        (stage === 1 && r === 1 && (c === 1 || c === 5)) ||
        (stage >= 2 && ((r === 1 && c === 3) || (r === 2 && (c === 0 || c === 6))));
      const isPrism =
        (stage === 1 && r === 1 && c === 3) ||
        (stage >= 2 && r === 1 && (c === 1 || c === 5));
      const isArmored = !isBomb && !isPrism && (r === 0 || (stage >= 2 && (r + c) % 4 === 0));
      const hasBonusBolt = (r * cols + c) % 5 === 2;

      let kind: WallBrickKind = 'standard';
      let color = WALL_ROW_COLORS[r % WALL_ROW_COLORS.length];
      let maxHp = 1;
      let points = 15;

      if (isBomb) {
        kind = 'bomb';
        color = '#f97316';
        maxHp = 1;
        points = 30;
      } else if (isPrism) {
        kind = 'prism';
        color = '#a855f7';
        maxHp = 1;
        points = 30;
      } else if (isArmored) {
        kind = 'armored';
        color = WALL_ROW_COLORS[r % WALL_ROW_COLORS.length];
        maxHp = 2;
        points = 25;
      } else if (hasBonusBolt) {
        kind = 'bolt_vault';
        color = '#eab308';
        maxHp = 1;
        points = 20;
      }

      bricks.push({
        id: id++,
        row: r,
        col: c,
        x: padX + c * (brickW + gap),
        y: topY + r * (brickH + gap),
        w: brickW,
        h: brickH,
        hp: maxHp,
        maxHp,
        color,
        points,
        hasBonusBolt: hasBonusBolt || isBomb || isPrism,
        kind,
        hitFlash: 0
      });
    }
  }
  return bricks;
}

const POWERUP_ROTATION: WallPowerUpKind[] = ['wide', 'laser', 'multi', 'fire', 'bolt'];

export function pickWallPowerUpKind(brick: WallBrick, dropIndex: number): WallPowerUpKind {
  if (brick.kind === 'prism') return 'multi';
  if (brick.kind === 'bomb') return 'fire';
  if (brick.kind === 'bolt_vault') {
    return POWERUP_ROTATION[Math.abs(dropIndex) % POWERUP_ROTATION.length];
  }
  return dropIndex % 2 === 0 ? 'bolt' : POWERUP_ROTATION[Math.abs(dropIndex) % POWERUP_ROTATION.length];
}

export function findBombBlastTargets(bricks: WallBrick[], centerBrick: WallBrick): WallBrick[] {
  const cx = centerBrick.x + centerBrick.w / 2;
  const cy = centerBrick.y + centerBrick.h / 2;
  const maxDx = centerBrick.w * 1.48;
  const maxDy = centerBrick.h * 1.65;
  return bricks.filter((b) => {
    if (b.id === centerBrick.id) return false;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h / 2;
    return Math.abs(bx - cx) <= maxDx && Math.abs(by - cy) <= maxDy;
  });
}

export function computeWallBreakerReward(score: number, cleared: boolean): number {
  const base = Math.max(10, Math.floor(score / 12));
  return Math.min(120, base + (cleared ? 25 : 0));
}

/* ============================================================================
 * 2. POWER CONNECT (Conduit rotation puzzle with BFS flow solver)
 * ========================================================================== */

/** Bitmask for pipe openings: 0=Top(1), 1=Right(2), 2=Bottom(4), 3=Left(8) */
export const DIR_TOP = 1;
export const DIR_RIGHT = 2;
export const DIR_BOTTOM = 4;
export const DIR_LEFT = 8;

export type PipeKind = 'empty' | 'source' | 'core' | 'straight' | 'corner' | 'tee' | 'cross';

export interface ConnectTile {
  r: number;
  c: number;
  kind: PipeKind;
  /** Number of 90-degree clockwise rotations (0..3) */
  rot: number;
  locked: boolean;
  powered: boolean;
}

export interface ConnectPuzzleState {
  puzzleIndex: number;
  rows: number;
  cols: number;
  grid: ConnectTile[][];
  poweredCores: number;
  totalCores: number;
  solved: boolean;
}

const BASE_MASK: Record<PipeKind, number> = {
  empty: 0,
  source: DIR_RIGHT,
  core: DIR_LEFT,
  straight: DIR_LEFT | DIR_RIGHT,
  corner: DIR_TOP | DIR_RIGHT,
  tee: DIR_TOP | DIR_RIGHT | DIR_BOTTOM,
  cross: DIR_TOP | DIR_RIGHT | DIR_BOTTOM | DIR_LEFT
};

export function rotateMask(mask: number, rotSteps: number): number {
  const steps = ((rotSteps % 4) + 4) % 4;
  let m = mask;
  for (let i = 0; i < steps; i++) {
    let next = 0;
    if (m & DIR_TOP) next |= DIR_RIGHT;
    if (m & DIR_RIGHT) next |= DIR_BOTTOM;
    if (m & DIR_BOTTOM) next |= DIR_LEFT;
    if (m & DIR_LEFT) next |= DIR_TOP;
    m = next;
  }
  return m;
}

export function getTileConnections(tile: Pick<ConnectTile, 'kind' | 'rot'>): number {
  return rotateMask(BASE_MASK[tile.kind], tile.rot);
}

interface PresetCell {
  kind: PipeKind;
  solvedRot: number;
  scrambleOffset?: number;
  locked?: boolean;
}

/**
 * Curated kid-friendly 4x4 energy conduit puzzles guaranteed to be 100% solvable.
 * Each board starts scrambled by 1–3 quarter turns on rotatable tiles.
 */
const CONNECT_PRESETS: PresetCell[][][] = [
  // Board 1: Single glowing power path with a fun branch to 2 cores
  [
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'corner', solvedRot: 1, scrambleOffset: 1 },
      { kind: 'straight', solvedRot: 0, scrambleOffset: 1 },
      { kind: 'core', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'source', solvedRot: 0, locked: true },
      { kind: 'tee', solvedRot: 3, scrambleOffset: 2 },
      { kind: 'corner', solvedRot: 2, scrambleOffset: 1 },
      { kind: 'empty', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'corner', solvedRot: 0, scrambleOffset: 1 },
      { kind: 'core', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true }
    ]
  ],
  // Board 2: Twin reactor split (upper + lower conduit loop to 2 cores)
  [
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'corner', solvedRot: 1, scrambleOffset: 2 },
      { kind: 'straight', solvedRot: 0, scrambleOffset: 1 },
      { kind: 'core', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'source', solvedRot: 0, locked: true },
      { kind: 'tee', solvedRot: 2, scrambleOffset: 1 },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'straight', solvedRot: 1, scrambleOffset: 1 },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'corner', solvedRot: 0, scrambleOffset: 3 },
      { kind: 'straight', solvedRot: 0, scrambleOffset: 1 },
      { kind: 'core', solvedRot: 0, locked: true }
    ]
  ],
  // Board 3: 3-Core Star Hub with cross-junction & bends
  [
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'core', solvedRot: 3, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'source', solvedRot: 0, locked: true },
      { kind: 'straight', solvedRot: 0, scrambleOffset: 1 },
      { kind: 'cross', solvedRot: 0, scrambleOffset: 0 },
      { kind: 'core', solvedRot: 0, locked: true }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'corner', solvedRot: 0, scrambleOffset: 2 },
      { kind: 'corner', solvedRot: 2, scrambleOffset: 1 }
    ],
    [
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'empty', solvedRot: 0, locked: true },
      { kind: 'core', solvedRot: 1, locked: true }
    ]
  ]
];

export function evaluateConnectGrid(
  grid: ConnectTile[][],
  puzzleIndex: number
): ConnectPuzzleState {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const next: ConnectTile[][] = grid.map((row) => row.map((cell) => ({ ...cell, powered: false })));

  const queue: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].kind === 'source') {
        next[r][c].powered = true;
        queue.push([r, c]);
      }
    }
  }

  const neighbors: Array<{ dr: number; dc: number; outBit: number; inBit: number }> = [
    { dr: -1, dc: 0, outBit: DIR_TOP, inBit: DIR_BOTTOM },
    { dr: 0, dc: 1, outBit: DIR_RIGHT, inBit: DIR_LEFT },
    { dr: 1, dc: 0, outBit: DIR_BOTTOM, inBit: DIR_TOP },
    { dr: 0, dc: -1, outBit: DIR_LEFT, inBit: DIR_RIGHT }
  ];

  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const mask = getTileConnections(next[r][c]);
    for (const nb of neighbors) {
      if ((mask & nb.outBit) === 0) continue;
      const nr = r + nb.dr;
      const nc = c + nb.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const target = next[nr][nc];
      if (target.powered || target.kind === 'empty') continue;
      const targetMask = getTileConnections(target);
      if ((targetMask & nb.inBit) !== 0) {
        target.powered = true;
        queue.push([nr, nc]);
      }
    }
  }

  let totalCores = 0;
  let poweredCores = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].kind === 'core') {
        totalCores++;
        if (next[r][c].powered) poweredCores++;
      }
    }
  }

  return {
    puzzleIndex,
    rows,
    cols,
    grid: next,
    poweredCores,
    totalCores,
    solved: totalCores > 0 && poweredCores === totalCores
  };
}

export function createConnectPuzzle(puzzleIndex = 0, solved = false): ConnectPuzzleState {
  const idx = ((puzzleIndex % CONNECT_PRESETS.length) + CONNECT_PRESETS.length) % CONNECT_PRESETS.length;
  const preset = CONNECT_PRESETS[idx];
  const rawGrid: ConnectTile[][] = preset.map((row, r) =>
    row.map((cell, c) => ({
      r,
      c,
      kind: cell.kind,
      rot: solved ? cell.solvedRot : (cell.solvedRot + (cell.scrambleOffset || 0)) % 4,
      locked: Boolean(cell.locked || cell.kind === 'empty' || cell.kind === 'source' || cell.kind === 'core'),
      powered: false
    }))
  );
  return evaluateConnectGrid(rawGrid, idx);
}

export function rotateConnectTile(
  state: ConnectPuzzleState,
  r: number,
  c: number
): ConnectPuzzleState {
  const tile = state.grid[r]?.[c];
  if (!tile || tile.locked) return state;
  const cloned = state.grid.map((row) => row.map((cell) => ({ ...cell })));
  cloned[r][c].rot = (cloned[r][c].rot + 1) % 4;
  return evaluateConnectGrid(cloned, state.puzzleIndex);
}

export function computeConnectReward(boardsCleared: number, totalMoves: number): number {
  const efficiencyBonus = boardsCleared > 0 && totalMoves <= boardsCleared * 10 ? 15 : 0;
  return Math.min(120, Math.max(15, boardsCleared * 25 + efficiencyBonus));
}

/* ============================================================================
 * 3. SPACE SHOOTER (Wave spawner & scoring)
 * ========================================================================== */

export interface SpaceEnemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  kind: 'drone' | 'meteor' | 'saucer';
  color: string;
  points: number;
}

export function spawnSpaceWave(
  arenaWidth: number,
  wave: number,
  nextIdStart = 1
): SpaceEnemy[] {
  const count = Math.min(8, 4 + wave);
  const padX = 48;
  const usableW = Math.max(200, arenaWidth - padX * 2);
  const stepX = count > 1 ? usableW / (count - 1) : 0;
  const enemies: SpaceEnemy[] = [];

  for (let i = 0; i < count; i++) {
    const kind: SpaceEnemy['kind'] =
      wave >= 2 && i % 3 === 1 ? 'saucer' : i % 2 === 0 ? 'drone' : 'meteor';
    const maxHp = kind === 'saucer' ? 2 : 1;
    enemies.push({
      id: nextIdStart + i,
      x: count > 1 ? padX + i * stepX : arenaWidth * 0.5,
      y: -26 - (i % 3) * 38,
      vx: (i % 2 === 0 ? 1 : -1) * (26 + wave * 6),
      vy: 42 + wave * 7 + (i % 2) * 10,
      radius: kind === 'saucer' ? 20 : 16,
      hp: maxHp,
      maxHp,
      kind,
      color: kind === 'saucer' ? '#c084fc' : kind === 'drone' ? '#fb7185' : '#fbbf24',
      points: kind === 'saucer' ? 30 : 15
    });
  }
  return enemies;
}

export function computeSpaceShooterReward(score: number, starsCollected: number): number {
  return Math.min(130, Math.max(15, Math.floor(score / 10) + starsCollected * 4));
}
