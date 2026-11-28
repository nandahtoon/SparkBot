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
  if (objective.kind !== 'collect' && objective.kind !== 'survey') return null;
  const available = level.track.filter(tile => tile.crystal && tile.type !== 'gap' && tile.type !== 'start').length;
  const target = objective.requiredCrystals;
  if (typeof target !== 'number' || !Number.isSafeInteger(target) || target < 1 || target > available) return null;
  return target;
}
export function getSurveyStations(level: LevelDef): number[] | null {
  const objective = getMissionObjective(level);
  if (objective.kind !== 'survey') return null;
  const stations = objective.stations;
  if (!Array.isArray(stations) || !stations.length || new Set(stations).size !== stations.length || stations.some(i=>!Number.isSafeInteger(i) || i<=0 || i>=level.track.length-1 || level.track[i]?.type !== 'normal')) return null;
  return [...stations];
}
export function getSurveyProgress(level: LevelDef, events: SimResult['events']): number {
  const stations = getSurveyStations(level) ?? [];
  const visited = new Set(events.filter(ev=>ev.action==='WAIT' && ev.status==='ok' && ev.fromPos===ev.toPos && stations.includes(ev.toPos)).map(ev=>ev.toPos));
  return visited.size;
}
export function getRouteObjectiveFailure(level: LevelDef, collected: number, events: SimResult['events'] = []): string | null {
  if (getMissionObjective(level).kind === 'survey') {
    const stations = getSurveyStations(level);
    if (!stations) return 'This survey needs valid observation stations.';
    const count = getSurveyProgress(level, events);
    if (count !== stations.length) return `Pause with WAIT at every survey station (${count}/${stations.length}).`;
    const objective=getMissionObjective(level);
    if (objective.kind==='survey' && objective.requiredCrystals!==undefined) {
      const target=getCollectionRequirement(level);
      if (target===null) return 'This survey needs a valid collection goal.';
      if (collected<target) return `Collect ${target} crystals before reaching the station (${collected}/${target}).`;
    }
    return null;
  }
  if (getMissionObjective(level).kind !== 'collect') return null;
  const target = getCollectionRequirement(level);
  if (target === null) return 'This collection challenge needs a valid goal.';
  return collected >= target ? null : `Collect ${target} crystals before reaching the station (${collected}/${target}). Try a different route program.`;
}
export function isMissionComplete(level: LevelDef, sim: SimResult, circuit?: CircuitTraceResult): boolean {
  if (sim.status !== 'win' || sim.finalPos !== level.track.length - 1 || getRouteObjectiveFailure(level, sim.collectedCrystals, sim.events)) return false;
  return !requiresMissionCircuit(level) || Boolean(circuit?.solved && circuit.totalCores > 0 && circuit.litCount === circuit.totalCores);
}
export function getMissionObjectiveLabel(level: LevelDef): string {
  switch (getMissionObjective(level).kind) {
    case 'delivery': return 'Deliver the robot to the station.';
    case 'collect': return `Collect ${getCollectionRequirement(level) ?? 'the required'} crystals and reach the station.`;
    case 'repair': return 'Fix the program and reach the station.';
    case 'power': return 'Reach the station and power every core.';
    case 'survey': return `Use WAIT at the marked survey stations (tiles ${(getSurveyStations(level) ?? []).join(' and ')}), ${getCollectionRequirement(level)===null?'':`collect ${getCollectionRequirement(level)} crystals, `}then reach the station.`;
  }
}
