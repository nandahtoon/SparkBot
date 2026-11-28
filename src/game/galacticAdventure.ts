export const FORMS = ['explorer', 'astro', 'guardian'] as const;
export type GalacticForm = typeof FORMS[number];
export type Lane = 0 | 1 | 2 | 3 | 4;
export type Goal = 'collect' | 'repair' | 'block';
export type Encounter = Readonly<{ lane: Lane; goal: Goal; hazard: Lane | null }>;
export const FORM_NAMES: Record<GalacticForm, string> = { explorer: 'Explorer', astro: 'Astro', guardian: 'Guardian' };
export const REQUIRED: Record<Goal, GalacticForm> = { collect: 'explorer', repair: 'astro', block: 'guardian' };
export const MISSION_NAMES = ['Crystal Run', 'Drone Rescue', 'Titan Core'] as const;
export const MISSIONS: readonly (readonly Encounter[])[] = [
  [{lane:2,goal:'collect',hazard:null},{lane:0,goal:'collect',hazard:3},{lane:4,goal:'collect',hazard:1}],
  [{lane:1,goal:'repair',hazard:3},{lane:3,goal:'repair',hazard:1},{lane:2,goal:'repair',hazard:4}],
  [{lane:2,goal:'block',hazard:null},{lane:0,goal:'repair',hazard:2},{lane:4,goal:'block',hazard:null},{lane:2,goal:'repair',hazard:0}]
];
export const TICKS_PER_ENCOUNTER = 80;
export const TICK_MS = 50;
export type GalacticState = Readonly<{
  mission: number; phase: number; tick: number; lane: Lane; form: GalacticForm;
  shields: number; status: 'ready'|'playing'|'won'|'retry'; feedback: 'ready'|'go'|'success'|'miss'|'hit'|'won'|'retry';
}>;
export function createGalactic(mission = 0): GalacticState {
  const safe = Number.isInteger(mission) && mission >= 0 && mission < MISSIONS.length ? mission : 0;
  return {mission:safe,phase:0,tick:0,lane:2,form:'explorer',shields:3,status:'ready',feedback:'ready'};
}
export function currentEncounter(s: GalacticState): Encounter | undefined { return MISSIONS[s.mission]?.[s.phase]; }
export function startGalactic(s: GalacticState): GalacticState {
  return s.status === 'ready' ? {...s,status:'playing',feedback:'go'} : s;
}
export function moveGalactic(s: GalacticState, lane: number): GalacticState {
  return s.status === 'playing' && Number.isFinite(lane) ? {...s,lane:Math.max(0,Math.min(4,Math.round(lane))) as Lane} : s;
}
export function transformGalactic(s: GalacticState, form: GalacticForm): GalacticState {
  return s.status === 'playing' && FORMS.includes(form) ? {...s,form} : s;
}
export function stepGalactic(s: GalacticState): GalacticState {
  if (s.status !== 'playing') return s;
  const e = currentEncounter(s);
  if (!e) return {...s,status:'won',feedback:'won'};
  if (s.tick + 1 < TICKS_PER_ENCOUNTER) return {...s,tick:s.tick+1};
  const correct = s.lane === e.lane && s.form === REQUIRED[e.goal];
  const hit = (s.lane === e.hazard || (e.goal === 'block' && s.lane === e.lane)) && s.form !== 'guardian';
  const shields = s.shields - Number(hit);
  if (shields <= 0) return {...s,tick:0,shields,status:'retry',feedback:'retry'};
  if (!correct) return {...s,tick:0,shields,feedback:hit?'hit':'miss'};
  const phase = s.phase+1;
  const won = phase === MISSIONS[s.mission].length;
  return {...s,phase,tick:0,shields,status:won?'won':'playing',feedback:won?'won':'success'};
}
export const GALACTIC_SAVE_KEY = 'sparkbot.galactic.experimental.v1';
export function readGalacticUnlock(raw: string | null): number {
  try { const x = JSON.parse(raw ?? 'null'); return x?.version === 1 && Number.isInteger(x.unlocked) ? Math.max(0,Math.min(MISSIONS.length-1,x.unlocked)) : 0; } catch { return 0; }
}
export function nextGalacticUnlock(previous: number, s: GalacticState): number {
  const safe = Number.isInteger(previous) ? Math.max(0,Math.min(MISSIONS.length-1,previous)) : 0;
  return s.status === 'won' ? Math.max(safe,Math.min(MISSIONS.length-1,s.mission+1)) : safe;
}
