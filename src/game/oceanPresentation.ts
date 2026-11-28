import type { LevelDef } from './types';
export type OceanZone = 'sampling' | 'reef' | 'signal' | 'beacon';
export interface OceanPresentation {zone:OceanZone;name:string;hint:string;nextHint:string;victory:string}
const presentations:Record<number,OceanPresentation>={
 21:{zone:'sampling',name:'Tide Sampling Bay',hint:'Look for every crystal before choosing a jump.',nextHint:'A jump can skip a sample. Use Step to check which crystals you collect.',victory:'All three research samples delivered!'},
 22:{zone:'reef',name:'Coral Research Reef',hint:'Find both ring-shaped observation stations.',nextHint:'Use WAIT while standing on each marked deck, not between stations.',victory:'Both reef observations recorded!'},
 23:{zone:'signal',name:'Tidal Signal Channel',hint:'Watch the barrier change on each beat.',nextHint:'Try WAIT before the barrier. Use Step to see whether the next beat is safe.',victory:'You crossed the timed safety barrier safely!'},
 24:{zone:'beacon',name:'Ocean Beacon Station',hint:'Watch the broken routine and find where the robot falls.',nextHint:'Inspect the repeated commands. Which action can cross a gap? Then restore both light cores.',victory:'Robot repaired and both beacon cores restored!'},
};
export function getOceanPresentation(level:LevelDef|null|undefined):OceanPresentation|null{
 if(!level || level.isDaily || level.isSandbox || level.isClassCode || level.isDebug)return null;
 if(level.isPrototype && level.id===6103)return presentations[22];
 return level.isBonus ? presentations[level.id]??null:null;
}
