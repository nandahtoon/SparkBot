import type { LevelDef, MissionObjective, SimResult, CircuitTraceResult } from './types';

// Unannotated campaign/custom levels preserve their existing gate-and-optics flow.
// Existing debug missions preserve route-only completion.
export function getMissionObjective(level: LevelDef): MissionObjective {
  return level.objective ?? {kind: level.isDebug ? 'repair' : 'power'};
}
export function requiresMissionCircuit(level: LevelDef): boolean {
  return getMissionObjective(level).kind === 'power';
}
export function getCollectionRequirement(level: LevelDef): number | null {
  const objective = getMissionObjective(level);
  if (objective.kind !== 'collect') return null;
  const available = level.track.filter(tile => tile.crystal && tile.type !== 'gap' && tile.type !== 'start').length;
  const target = objective.requiredCrystals;
  if (!Number.isSafeInteger(target) || target < 1 || target > available) return null;
  return target;
}
export function getRouteObjectiveFailure(level: LevelDef, collected: number): string | null {
  if (getMissionObjective(level).kind !== 'collect') return null;
  const target = getCollectionRequirement(level);
  if (target === null) return 'This collection challenge needs a valid goal.';
  return collected >= target ? null : `Collect ${target} crystals before reaching the station (${collected}/${target}). Try a different route program.`;
}
export function isMissionComplete(level: LevelDef, sim: SimResult, circuit?: CircuitTraceResult): boolean {
  if (sim.status !== 'win' || sim.finalPos !== level.track.length - 1 || getRouteObjectiveFailure(level, sim.collectedCrystals)) return false;
  return !requiresMissionCircuit(level) || Boolean(circuit?.solved && circuit.totalCores > 0 && circuit.litCount === circuit.totalCores);
}
export function getMissionObjectiveLabel(level: LevelDef): string {
  switch (getMissionObjective(level).kind) {
    case 'delivery': return 'Deliver the robot to the station.';
    case 'collect': return `Collect ${getCollectionRequirement(level) ?? 'the required'} crystals and reach the station.`;
    case 'repair': return 'Fix the program and reach the station.';
    case 'power': return 'Reach the station and power every core.';
  }
}
