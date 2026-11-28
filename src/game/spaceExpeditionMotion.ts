import type {SpaceEnemy} from './arcadeGames';
export const SPACE_STAGE_TRANSITION_SECONDS=1.15;
// Presentation transition consumes visible time only, never advances the round.
export function advanceSpaceTransition(remaining:number,dt:number,reduced:boolean){
 const next=reduced?0:Math.max(0,remaining-Math.max(0,dt));
 return {remaining:next,gameplayDt:remaining>0?0:Math.max(0,dt)};
}
export function advanceExpeditionObstacle(enemy:SpaceEnemy,stage:number,elapsed:number,dt:number,width:number,verticalScale:number):SpaceEnemy{
 const phase=elapsed*2+enemy.id*.7;
 let lateral=1,vertical=1;
 switch(stage){
  case 2:lateral=.75+.25*Math.cos(phase);break;
  case 3:lateral=Math.cos(phase);vertical=.9;break;
  case 4:lateral=.4;vertical=.65+.35*(1+Math.sin(phase));break;
  case 5:lateral=Math.cos(phase*1.45)>=0?1:-1;vertical=.85;break;
  case 6:lateral=.3*Math.cos(phase);vertical=1;break;
  case 7:lateral=Math.cos(phase*.8);vertical=.8+.4*(1+Math.sin(phase));break;
 }
 const low=enemy.radius+10,high=Math.max(low,width-low);
 let x=enemy.x+enemy.vx*lateral*dt,vx=enemy.vx;
 if(x<low||x>high){x=Math.max(low,Math.min(high,x));vx=-vx;}
 return {...enemy,x,vx,y:enemy.y+enemy.vy*verticalScale*vertical*dt};
}
