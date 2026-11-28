import type {BotCharacterId} from './customization';
export type SpaceBotForm='scout'|'pulse'|'guard';
export const SPACE_BOT_FORMS=['scout','pulse','guard'] as const;
export const SPACE_BOT_FORM_INFO:Record<SpaceBotForm,{label:string;hint:string;speed:number;interval:number;spread:number;collectRadius:number}>={
 scout:{label:'Scout',hint:'Fast movement',speed:1.12,interval:.22,spread:0,collectRadius:30},
 pulse:{label:'Pulse',hint:'Wide energy beams',speed:.90,interval:.33,spread:95,collectRadius:30},
 guard:{label:'Guard',hint:'Rechargeable shield',speed:.82,interval:.25,spread:0,collectRadius:36}
};
export const SPACE_GUARD_RECHARGE=6;
export const SPACE_TRANSFORM_DURATION=.28;
export function nextSpaceBotForm(form:SpaceBotForm):SpaceBotForm{return SPACE_BOT_FORMS[(SPACE_BOT_FORMS.indexOf(form)+1)%SPACE_BOT_FORMS.length];}
export function spaceBotShots(form:SpaceBotForm,x:number,y:number,speed:number){
 const spread=SPACE_BOT_FORM_INFO[form].spread;
 return form==='pulse'?[{x:x-12,y:y-17,vx:-spread,vy:-speed},{x,y:y-22,vx:0,vy:-speed},{x:x+12,y:y-17,vx:spread,vy:-speed}]:[{x:x-11,y:y-16,vx:0,vy:-speed},{x:x+11,y:y-16,vx:0,vy:-speed}];
}
export function spaceBotImpact(form:SpaceBotForm,shields:number,guardCooldown:number){
 const absorbed=form==='guard'&&guardCooldown<=0;
 return {absorbed,shields:absorbed?shields:Math.max(0,shields-1),guardCooldown:absorbed?SPACE_GUARD_RECHARGE:guardCooldown};
}
export function spaceBotTransformPose(from:SpaceBotForm,to:SpaceBotForm,progress:number){
 const t=Math.max(0,Math.min(1,progress)),k=t*t*(3-2*t);
 const shapes={scout:{armX:16,armY:3,armAngle:.12,footX:8,guard:0},pulse:{armX:23,armY:-3,armAngle:.72,footX:10,guard:0},guard:{armX:19,armY:1,armAngle:.30,footX:12,guard:1}};
 const a=shapes[from],b=shapes[to],mix=(x:number,y:number)=>x+(y-x)*k;
 return {armX:mix(a.armX,b.armX),armY:mix(a.armY,b.armY),armAngle:mix(a.armAngle,b.armAngle),footX:mix(a.footX,b.footX),guard:mix(a.guard,b.guard)};
}
export const SPACE_CHARACTER_ACCENTS:Record<BotCharacterId,string>={sparkbot:'#fbbf24',sprout:'#fb923c',nova:'#38bdf8',robobuddy:'#60a5fa',learnbot:'#facc15'};
