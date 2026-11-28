// Experimental adventure-first rules, isolated from campaign saves and rewards.
// Absolute map directions teach spatial planning before adding relative turns.
export type RescueAction='up'|'right'|'down'|'left'|'repair';
export type RescueCell='dock'|'path'|'water'|'beacon';
export interface RescueMap{ id:string; name:string; cells:readonly (readonly RescueCell[])[]; }
export const RESCUE_MAPS:readonly RescueMap[]=[
 {id:'bay',name:'Beacon Bay',cells:[
  ['path','path','beacon','water','water'],
  ['path','water','path','path','path'],
  ['dock','path','path','water','beacon'],
  ['path','water','path','path','path'],
  ['path','path','path','water','water']
 ]},
 {id:'reef',name:'Reef Rescue',cells:[
  ['water','beacon','path','path','path'],
  ['path','path','water','water','path'],
  ['dock','water','path','path','path'],
  ['path','path','path','water','path'],
  ['water','water','path','beacon','path']
 ]}
];
export const RESCUE_ACTIONS:readonly RescueAction[]=['up','right','down','left','repair'];
export const RESCUE_MAX_COMMANDS=32;
export type RescueFeedback='ready'|'move'|'blocked'|'repair'|'already'|'wrong-place'|'win';
export interface RescueState{row:number;col:number;repaired:readonly string[];feedback:RescueFeedback;won:boolean;}
const key=(r:number,c:number)=>r+':'+c;
const offsets:Record<Exclude<RescueAction,'repair'>,[number,number]>={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]};
export function rescueGoal(map:RescueMap){return map.cells.flat().filter(c=>c==='beacon').length;}
export function startRescue(map:RescueMap):RescueState{
 const row=map.cells.findIndex(r=>r.includes('dock')),col=map.cells[row].indexOf('dock');
 return {row,col,repaired:[],feedback:'ready',won:false};
}
export function stepRescue(map:RescueMap,state:RescueState,action:RescueAction):RescueState{
 if(state.won)return state;
 if(action==='repair'){
  if(map.cells[state.row]?.[state.col]!=='beacon')return {...state,feedback:'wrong-place'};
  const id=key(state.row,state.col);
  if(state.repaired.includes(id))return {...state,feedback:'already'};
  return {...state,repaired:[...state.repaired,id],feedback:'repair'};
 }
 const [dr,dc]=offsets[action],row=state.row+dr,col=state.col+dc;
 const target=map.cells[row]?.[col];
 if(!target||target==='water')return {...state,feedback:'blocked'};
 const won=target==='dock'&&state.repaired.length===rescueGoal(map);
 return {...state,row,col,won,feedback:won?'win':'move'};
}
export function traceRescue(map:RescueMap,program:readonly RescueAction[]){
 const trace=[startRescue(map)];
 for(const action of program.slice(0,RESCUE_MAX_COMMANDS)){
  const next=stepRescue(map,trace[trace.length-1],action);trace.push(next);
  if(next.won||['blocked','wrong-place','already'].includes(next.feedback))break;
 }
 return trace;
}

// Goal cues are derived from the same rules for both direct and coded play.
export type RescueGoalCue='seek'|'repair-here'|'return-home'|'complete';
export function rescueGoalCue(map:RescueMap,state:RescueState):RescueGoalCue{
 if(state.won)return 'complete';
 if(state.repaired.length===rescueGoal(map))return 'return-home';
 if(map.cells[state.row]?.[state.col]==='beacon'&&!state.repaired.includes(key(state.row,state.col)))return 'repair-here';
 return 'seek';
}
// Pause/step resumes from the visible state; a completed trace can be replayed.
export function rescueRunStartCursor(cursor:number,last:number){return cursor>=last?0:Math.max(0,cursor);}
