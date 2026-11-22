import type { CircuitGrid, CircuitSegment, CircuitTraceResult } from './types';

// Direction indices: 0=RIGHT, 1=DOWN, 2=LEFT, 3=UP
const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 }
];

export function reflectDir(dir: number, rot: number): number {
  if (rot === 0) {
    if (dir === 0) return 3;
    if (dir === 3) return 0;
    if (dir === 2) return 1;
    return 2;
  }
  if (dir === 0) return 1;
  if (dir === 1) return 0;
  if (dir === 2) return 3;
  return 2;
}

export function cloneCircuitGrid(grid: CircuitGrid): CircuitGrid {
  return grid.map((row) => row.map((cell) => ({ type: cell.type, rot: cell.rot })));
}

export function traceCircuit(grid: CircuitGrid): CircuitTraceResult {
  let totalCores = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].type === 'core') totalCores++;
    }
  }

  const segments: CircuitSegment[] = [];
  const litCores: Record<string, boolean> = {};
  const visited: Record<string, boolean> = {};
  const queue = [{ r: 2, c: 0, dir: 0, fromX: -0.5, fromY: 2.5 }];

  while (queue.length > 0) {
    const beam = queue.shift()!;
    const cr = beam.r;
    const cc = beam.c;
    const dir = beam.dir;
    const key = `${cr},${cc},${dir}`;
    if (visited[key]) continue;
    visited[key] = true;

    if (cr < 0 || cr >= 5 || cc < 0 || cc >= 5) continue;

    const cell = grid[cr][cc];
    const cx = cc + 0.5;
    const cy = cr + 0.5;

    if (cell.type === 'wall') {
      const hitX = cx - DIRS[dir].dc * 0.35;
      const hitY = cy - DIRS[dir].dr * 0.35;
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: hitX, y2: hitY });
      continue;
    }

    if (cell.type === 'core') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      litCores[`${cr},${cc}`] = true;
      continue;
    }

    if (cell.type === 'mirror') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      const nd = reflectDir(dir, cell.rot);
      queue.push({ r: cr + DIRS[nd].dr, c: cc + DIRS[nd].dc, dir: nd, fromX: cx, fromY: cy });
      continue;
    }

    if (cell.type === 'splitter') {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      const sd = reflectDir(dir, cell.rot);
      const nr1 = cr + DIRS[dir].dr;
      const nc1 = cc + DIRS[dir].dc;
      if (nr1 < 0 || nr1 >= 5 || nc1 < 0 || nc1 >= 5) {
        segments.push({ x1: cx, y1: cy, x2: cx + DIRS[dir].dc * 0.5, y2: cy + DIRS[dir].dr * 0.5 });
      } else {
        queue.push({ r: nr1, c: nc1, dir, fromX: cx, fromY: cy });
      }
      const nr2 = cr + DIRS[sd].dr;
      const nc2 = cc + DIRS[sd].dc;
      if (nr2 < 0 || nr2 >= 5 || nc2 < 0 || nc2 >= 5) {
        segments.push({ x1: cx, y1: cy, x2: cx + DIRS[sd].dc * 0.5, y2: cy + DIRS[sd].dr * 0.5 });
      } else {
        queue.push({ r: nr2, c: nc2, dir: sd, fromX: cx, fromY: cy });
      }
      continue;
    }

    const nr = cr + DIRS[dir].dr;
    const nc = cc + DIRS[dir].dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx + DIRS[dir].dc * 0.5, y2: cy + DIRS[dir].dr * 0.5 });
    } else {
      segments.push({ x1: beam.fromX, y1: beam.fromY, x2: cx, y2: cy });
      queue.push({ r: nr, c: nc, dir, fromX: cx, fromY: cy });
    }
  }

  const litCount = Object.keys(litCores).length;
  return {
    segments,
    litCores,
    litCount,
    totalCores,
    solved: totalCores > 0 && litCount === totalCores
  };
}

export function findCircuitFixCell(grid: CircuitGrid): { r: number; c: number; flips: number } | null {
  if (!grid || traceCircuit(grid).solved) return null;
  const toggleables: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].type === 'mirror' || grid[r][c].type === 'splitter') {
        toggleables.push({ r, c });
      }
    }
  }
  if (toggleables.length > 0 && toggleables.length <= 7) {
    const maxMask = 1 << toggleables.length;
    let bestDiff = 999;
    let bestFirst: { r: number; c: number } | null = null;
    for (let mask = 1; mask < maxMask; mask++) {
      const copy = cloneCircuitGrid(grid);
      let flips = 0;
      let firstFlip: { r: number; c: number } | null = null;
      for (let b = 0; b < toggleables.length; b++) {
        if ((mask >> b) & 1) {
          flips++;
          const tg = toggleables[b];
          if (!firstFlip) firstFlip = tg;
          copy[tg.r][tg.c].rot = copy[tg.r][tg.c].rot === 0 ? 1 : 0;
        }
      }
      if (traceCircuit(copy).solved && flips < bestDiff) {
        bestDiff = flips;
        bestFirst = firstFlip;
      }
    }
    if (bestFirst) return { r: bestFirst.r, c: bestFirst.c, flips: bestDiff };
  }
  return null;
}
