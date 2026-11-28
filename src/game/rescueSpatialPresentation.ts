import {rescueGoalCue,type RescueMap,type RescueState,type RescueCell} from './rescueAdventure';
export const RESCUE_TILE_SIZE=2;
export function rescueWorldPosition(map:RescueMap,row:number,col:number){
 const columns=Math.max(...map.cells.map(r=>r.length));
 return {x:(col-(columns-1)/2)*RESCUE_TILE_SIZE,z:(row-(map.cells.length-1)/2)*RESCUE_TILE_SIZE};
}
export function rescueSpatialSnapshot(map:RescueMap,state:RescueState){
 const tiles=map.cells.flatMap((row,r)=>row.map((kind:RescueCell,c)=>({id:r+':'+c,kind,...rescueWorldPosition(map,r,c),repaired:state.repaired.includes(r+':'+c)})));
 return {mapId:map.id,tiles,robot:rescueWorldPosition(map,state.row,state.col),cue:rescueGoalCue(map,state),feedback:state.feedback,won:state.won};
}
