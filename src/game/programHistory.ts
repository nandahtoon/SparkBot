import type { CodeBlock } from './types';

export const MAX_PROGRAM_HISTORY = 30;

export interface ProgramHistoryState {
  past: CodeBlock[][];
  future: CodeBlock[][];
}

export function cloneProgram(blocks: ReadonlyArray<CodeBlock>): CodeBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((blk) => ({
    id: blk.id,
    type: blk.type,
    ...(blk.count !== undefined ? { count: blk.count } : {}),
    ...(blk.condition !== undefined ? { condition: blk.condition } : {}),
    ...(Array.isArray(blk.children) ? { children: cloneProgram(blk.children) } : {})
  }));
}

export function areProgramsEqual(
  a: ReadonlyArray<CodeBlock>,
  b: ReadonlyArray<CodeBlock>
): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ba = a[i];
    const bb = b[i];
    if (
      ba.id !== bb.id ||
      ba.type !== bb.type ||
      ba.count !== bb.count ||
      ba.condition !== bb.condition
    ) {
      return false;
    }
    const ca = ba.children || [];
    const cb = bb.children || [];
    if (!areProgramsEqual(ca, cb)) return false;
  }
  return true;
}

export function createEmptyProgramHistory(): ProgramHistoryState {
  return {
    past: [],
    future: []
  };
}

export function pushProgramHistory(
  history: ProgramHistoryState,
  prevProgram: ReadonlyArray<CodeBlock>,
  nextProgram: ReadonlyArray<CodeBlock>,
  maxDepth = MAX_PROGRAM_HISTORY
): ProgramHistoryState {
  if (areProgramsEqual(prevProgram, nextProgram)) {
    return history;
  }
  const nextPast = [...history.past, cloneProgram(prevProgram)];
  if (nextPast.length > maxDepth) {
    nextPast.splice(0, nextPast.length - maxDepth);
  }
  return {
    past: nextPast,
    future: []
  };
}

export function undoProgramHistory(
  history: ProgramHistoryState,
  currentProgram: ReadonlyArray<CodeBlock>,
  maxDepth = MAX_PROGRAM_HISTORY
): { program: CodeBlock[]; history: ProgramHistoryState; changed: boolean } {
  if (history.past.length === 0) {
    return {
      program: cloneProgram(currentProgram),
      history,
      changed: false
    };
  }
  const previous = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);
  const nextFuture = [cloneProgram(currentProgram), ...history.future].slice(0, maxDepth);
  return {
    program: cloneProgram(previous),
    history: {
      past: nextPast,
      future: nextFuture
    },
    changed: true
  };
}

export function redoProgramHistory(
  history: ProgramHistoryState,
  currentProgram: ReadonlyArray<CodeBlock>,
  maxDepth = MAX_PROGRAM_HISTORY
): { program: CodeBlock[]; history: ProgramHistoryState; changed: boolean } {
  if (history.future.length === 0) {
    return {
      program: cloneProgram(currentProgram),
      history,
      changed: false
    };
  }
  const [nextHead, ...restFuture] = history.future;
  const nextPast = [...history.past, cloneProgram(currentProgram)];
  if (nextPast.length > maxDepth) {
    nextPast.splice(0, nextPast.length - maxDepth);
  }
  return {
    program: cloneProgram(nextHead),
    history: {
      past: nextPast,
      future: restFuture
    },
    changed: true
  };
}
