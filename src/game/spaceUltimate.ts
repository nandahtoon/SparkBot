// Round-local fusion module. No persistent inventory, no new save fields.
export const ULTIMATE_STAGE=7;
export const ULTIMATE_COST=80;
export const ULTIMATE_DURATION=5;
export type UltimateState={used:boolean;remaining:number;shield:boolean};
export const newUltimate=():UltimateState=>({used:false,remaining:0,shield:false});
export function canActivateUltimate(expedition:boolean,stage:number,energy:number,state:UltimateState){
 return expedition&&stage===ULTIMATE_STAGE&&energy>=ULTIMATE_COST&&!state.used&&state.remaining===0;
}
export function activateUltimate(expedition:boolean,stage:number,energy:number,state:UltimateState){
 if(!canActivateUltimate(expedition,stage,energy,state))return null;
 return {energy:energy-ULTIMATE_COST,state:{used:true,remaining:ULTIMATE_DURATION,shield:true}};
}
export function tickUltimate(state:UltimateState,dt:number,stage:number):UltimateState{
 const remaining=stage===ULTIMATE_STAGE?Math.max(0,state.remaining-Math.max(0,dt)):0;
 return {...state,remaining,shield:remaining>0&&state.shield};
}
export function absorbUltimateHit(state:UltimateState){
 const absorbed=state.remaining>0&&state.shield;
 return {absorbed,state:absorbed?{...state,shield:false}:state};
}
export function ultimateArmorBlend(remaining:number,reduced=false){
 return remaining<=0?0:reduced?1:Math.min(1,remaining/.3,(ULTIMATE_DURATION-remaining)/.3);
}
