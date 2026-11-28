import {spawnSpaceWave,type SpaceEnemy} from './arcadeGames';
export type SpaceRoundMode='classic'|'expedition';
export const SPACE_EXPEDITION_STAGES=[
 {title:'Learn to Fly',hint:'Find your rhythm',pattern:'intro'},
 {title:'Meteor Field',hint:'Dodge drifting rocks',pattern:'meteor'},
 {title:'Energy Pulse',hint:'Pulse reaches wide groups',pattern:'split'},
 {title:'Shield Defense',hint:'Guard can absorb a hit',pattern:'shield'},
 {title:'Asteroid Maze',hint:'Scout moves faster',pattern:'maze'},
 {title:'Station Approach',hint:'Clear the station corridor',pattern:'corridor'},
 {title:'Transform Challenge',hint:'Switch forms as needed',pattern:'mixed'},
 {title:'Galactic Guardian',hint:'Collect three rescue signals',pattern:'rescue'}
] as const;
export const SPACE_RESCUE_GOAL=3;
export function spaceStageCount(mode:SpaceRoundMode){return mode==='classic'?4:SPACE_EXPEDITION_STAGES.length;}
export function spaceRoundOutcome(mode:SpaceRoundMode,shields:number,timeLeft:number,score:number,stage:number,remaining:number,rescued:number):'playing'|'won'|'lost'{
 if(shields<=0)return mode==='classic'&&score>=120?'won':'lost';
 if(mode==='classic')return timeLeft<=0||stage>4?'won':'playing';
 return stage===8&&remaining===0&&rescued>=SPACE_RESCUE_GOAL?'won':'playing';
}
export function spawnExpeditionWave(width:number,stage:number,id:number):SpaceEnemy[]{
 if(stage<1||stage>=8)return [];
 const count=[4,5,6,6,7,7,8][stage-1];
 const source=spawnSpaceWave(width,Math.min(stage,4),id);
 return Array.from({length:count},(_,i)=>{
  const e=source[i%source.length],lane=(i+1)/(count+1),sign=i%2===0?1:-1;
  const kind:SpaceEnemy['kind']=stage===2||stage===5?'meteor':stage===4?'saucer':stage===6?'drone':e.kind;
  const hp=kind==='saucer'?2:1,radius=kind==='saucer'?20:16;
  const position=stage===3?(i<count/2?.18+(i%3)*.08:.66+(i%3)*.08):stage===6?(i%2===0?.22:.78):lane;
  return {...e,id:id+i,kind,hp,maxHp:hp,radius,x:Math.max(radius+10,Math.min(width-radius-10,width*position)),y:-30-i*(stage===5?32:18),vx:sign*(stage===5?85:stage===6?18:30+stage*5),vy:36+stage*5+(stage===7?i%3*12:0),color:kind==='meteor'?'#fbbf24':kind==='saucer'?'#c084fc':'#fb7185',points:kind==='saucer'?30:15};
 });
}
export function moveSpaceBotToward(x:number,target:number,speed:number,dt:number){const d=target-x,step=Math.max(0,speed*dt);return x+Math.sign(d)*Math.min(Math.abs(d),step);}
export function rescueSignalPosition(width:number,index:number){return width*[.22,.50,.78][index%3];}
