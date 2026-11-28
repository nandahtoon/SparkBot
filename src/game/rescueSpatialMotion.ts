import {rescueWorldPosition} from './rescueSpatialPresentation';
import type {RescueMap,RescueState} from './rescueAdventure';
export type RescueMotionKind='snap'|'walk'|'repair'|'celebrate'|'blocked';
export interface RescueMotion {kind:RescueMotionKind;from:{x:number;z:number};to:{x:number;z:number};duration:number;heading:number|null;}
export function planRescueMotion(map:RescueMap,previous:RescueState|null,next:RescueState,continuous:boolean,reduced:boolean):RescueMotion{
 const to=rescueWorldPosition(map,next.row,next.col),snap:RescueMotion={kind:'snap',from:to,to,duration:0,heading:null};
 if(!previous||!continuous||reduced||next.feedback==='ready'||previous.won)return snap;
 const distance=Math.abs(next.row-previous.row)+Math.abs(next.col-previous.col);
 const from=rescueWorldPosition(map,previous.row,previous.col);
 const sameRepairs=previous.repaired.length===next.repaired.length&&previous.repaired.every(id=>next.repaired.includes(id));
 if(distance===1&&sameRepairs&&(next.feedback==='move'||next.feedback==='win')&&map.cells[previous.row]?.[previous.col]&&map.cells[previous.row][previous.col]!=='water'&&map.cells[next.row]?.[next.col]&&map.cells[next.row][next.col]!=='water'){
  return {kind:next.won?'celebrate':'walk',from,to,duration:next.won?320:220,heading:Math.atan2(to.x-from.x,to.z-from.z)};
 }
 if(distance===0&&next.feedback==='repair'&&next.repaired.length===previous.repaired.length+1&&previous.repaired.every(id=>next.repaired.includes(id))&&next.repaired.includes(next.row+':'+next.col))return {kind:'repair',from,to,duration:300,heading:null};
 if(distance===0&&sameRepairs&&['blocked','wrong-place','already'].includes(next.feedback))return {kind:'blocked',from,to,duration:160,heading:null};
 return snap;
}
export function sampleRescueMotion(motion:RescueMotion,elapsed:number){
 const t=motion.duration?Math.max(0,Math.min(1,elapsed/motion.duration)):1,e=t*t*(3-2*t),wave=Math.sin(Math.PI*t),walking=motion.kind==='walk'||motion.kind==='celebrate';
 return {x:motion.from.x+(motion.to.x-motion.from.x)*e,z:motion.from.z+(motion.to.z-motion.from.z)*e,bob:walking?.07*wave:motion.kind==='repair'?.045*wave:0,swing:walking?.45*Math.sin(2*Math.PI*t)*wave:0,repair:motion.kind==='repair'?wave:0,celebrate:motion.kind==='celebrate'?wave:0,blocked:motion.kind==='blocked'?wave:0,done:t>=1};
}
