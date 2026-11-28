import type {BotCharacterId} from './customization';
import type {RescueMotion} from './rescueSpatialMotion';

const personality:Record<BotCharacterId,{stride:number;tilt:number;cheer:number;repairArm:number}>={
 sparkbot:{stride:1,tilt:.04,cheer:1,repairArm:0},
 sprout:{stride:.85,tilt:.10,cheer:.95,repairArm:1},
 nova:{stride:.60,tilt:.07,cheer:.85,repairArm:0},
 robobuddy:{stride:1.12,tilt:.06,cheer:1.16,repairArm:1},
 learnbot:{stride:.78,tilt:.12,cheer:1.1,repairArm:0}
};
export function sampleCompanionPose(character:BotCharacterId,kind:RescueMotion['kind'],progress:number){
 const t=Math.max(0,Math.min(1,progress)),v=personality[character],active=t>0&&t<1;
 const w=active?Math.sin(Math.PI*t):0,cycle=active?Math.sin(2*Math.PI*t):0;
 const walk=kind==='walk'||kind==='celebrate',repair=kind==='repair',win=kind==='celebrate',blocked=kind==='blocked';
 const cheer=win?w*v.cheer:0,tool=repair?w:0;
 const swing=walk?cycle*w*.48*v.stride:0;
 // One brief blink within a walking command, no idle timer.
 const blink=kind==='walk'?Math.max(0,1-Math.abs(t-.72)/.12):0;
 return {armL:swing-tool*(v.repairArm===0?1.08:.24)-cheer*.9,armR:-swing-tool*(v.repairArm===1?1.08:.24)-cheer*.9,
 footL:walk?cycle*w*.16*v.stride:0,footR:walk?-cycle*w*.16*v.stride:0,
 liftL:walk?Math.max(0,cycle)*w*.05:0,liftR:walk?Math.max(0,-cycle)*w*.05:0,
 headTilt:blocked?v.tilt*w:walk?cycle*w*v.tilt:repair?-v.tilt*w:0,headNod:repair?.13*w:win?-.10*w:0,
 blink,cheer,wing:character==='nova'?(win?.40*w:walk?.20*cycle*w:0):0};
}
export function interpolateCompanionHeading(from:number,to:number,progress:number){
 const t=Math.max(0,Math.min(1,progress));if(t===1)return to;
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 const k=Math.min(1,t*3),ease=k*k*(3-2*k);
 return from+delta*ease;
}
