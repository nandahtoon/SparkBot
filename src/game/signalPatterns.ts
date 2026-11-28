import type {DynamicHazardDef} from './types';
import {evaluateHazardAtTick} from './hazards';
// Visual guide is a read-only projection of the actual deterministic simulator clock.
export function getSignalPatterns(hazards:readonly DynamicHazardDef[],tick:number){
 const now=Math.max(0,Math.floor(Number.isFinite(tick)?tick:0));
 return hazards.flatMap(h=>{
  if(h.kind!=='laser_gate')return [];
  const period=Math.max(2,Math.floor(h.period||2));
  const current=evaluateHazardAtTick(h,now);
  return [{id:h.id,tile:h.tileIndex,period,active:current.active,nextActive:current.nextActive,
   beats:Array.from({length:Math.min(period,6)},(_,i)=>({tick:now+i+1,blocked:evaluateHazardAtTick(h,now+i+1).active}))}];
 });
}
