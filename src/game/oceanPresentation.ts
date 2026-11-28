import type { LevelDef } from './types';
export type OceanZone = 'sampling' | 'reef' | 'signal' | 'beacon';
export interface OceanPresentation {zone:OceanZone;name:string;hint:string;nextHint:string;victory:string}
const presentations:Record<number,OceanPresentation>={
 21:{zone:'sampling',name:'Tide Sampling Bay',hint:'Look for every crystal before choosing a jump.',nextHint:'A jump can skip a sample. Use Step to check which crystals you collect.',victory:'All five research samples delivered!'},
 22:{zone:'reef',name:'Coral Research Reef',hint:'Find all three ring-shaped observation stations and the reef crystals.',nextHint:'Use WAIT on each marked deck and collect all three samples before reaching the flag.',victory:'All reef observations and samples recorded!'},
 23:{zone:'signal',name:'Tidal Signal Channel',hint:'The three gates blink in different patterns. A cross means stop, an arrow means open.',nextHint:'Use Step and watch the next beat for each gate. WAIT on the safe deck before crossing.',victory:'All three tide gates crossed safely!'},
 24:{zone:'beacon',name:'Ocean Beacon Station',hint:'Watch the broken routine and find where the robot falls.',nextHint:'Inspect the repeated commands. Which action can cross a gap? Finish the approach, then restore both light cores.',victory:'Robot repaired and both beacon cores restored!'},
};
export function getOceanPresentation(level:LevelDef|null|undefined):OceanPresentation|null{
 if(!level || level.isDaily || level.isSandbox || level.isClassCode || level.isDebug)return null;
 if(level.isPrototype && level.id===6103)return {...presentations[22],hint:'Find both ring-shaped observation stations.',nextHint:'Use WAIT while standing on each marked deck, not between stations.',victory:'Both reef observations recorded!'};
 return level.isBonus ? presentations[level.id]??null:null;
}
