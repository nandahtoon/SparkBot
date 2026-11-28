import type {SpaceBotForm} from './spaceBotForms';
export const SPACE_CORE_MAX=100;
export const SPACE_CORE_COST=40;
export const SPACE_CORE_RECHARGE=12;
export const SPACE_SCOUT_BOOST_SECONDS=2.4;
export const SPACE_EVOLUTION_UNLOCK_STAGE=3;
export const SPACE_ABILITIES:Record<SpaceBotForm,{label:string;hint:string;color:string}>={
 scout:{label:'Dash',hint:'Faster movement',color:'#67e8f9'},
 pulse:{label:'Pulse Wave',hint:'Five energy beams',color:'#c4b5fd'},
 guard:{label:'Shield Reset',hint:'Restore guard protection',color:'#6ee7b7'}
};
export function spaceEvolutionEnabled(expedition:boolean,stage:number){return expedition&&stage>=SPACE_EVOLUTION_UNLOCK_STAGE&&stage<8;}
export function rechargeSpaceCore(energy:number,dt:number){return Math.min(SPACE_CORE_MAX,Math.max(0,energy)+Math.max(0,dt)*SPACE_CORE_RECHARGE);}
export function canUseSpaceAbility(form:SpaceBotForm,energy:number,boostRemaining:number,guardCooldown:number){
 return energy>=SPACE_CORE_COST&&(form!=='scout'||boostRemaining<=0)&&(form!=='guard'||guardCooldown>0);
}
export function activateSpaceAbility(form:SpaceBotForm,energy:number,boostRemaining:number,guardCooldown:number){
 if(!canUseSpaceAbility(form,energy,boostRemaining,guardCooldown))return null;
 return {energy:energy-SPACE_CORE_COST,boostRemaining:form==='scout'?SPACE_SCOUT_BOOST_SECONDS:boostRemaining,guardCooldown:form==='guard'?0:guardCooldown,pulse:form==='pulse'};
}
export function spaceAbilitySpeed(form:SpaceBotForm,boostRemaining:number){return form==='scout'&&boostRemaining>0?1.65:1;}
export function spacePulseWave(x:number,y:number,speed:number){
 return [-2,-1,0,1,2].map(i=>({x:x+i*7,y:y-20,vx:i*115,vy:-speed}));
}
