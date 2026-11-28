import test from 'node:test';
import assert from 'node:assert/strict';
import {RESCUE_MAPS,startRescue,stepRescue,rescueGoalCue} from './rescueAdventure';
import {rescueStory,rescueStoryVoice,rescueLandmarkHighlight,rescueShoreEdges} from './rescueStory';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
test('distinct story context, same goal order and no route solution',()=>{
 assert.notEqual(rescueStory(RESCUE_MAPS[0]).title,rescueStory(RESCUE_MAPS[1]).title);
 for(const map of RESCUE_MAPS){const start=startRescue(map),ids=map.cells.flatMap((r,i)=>r.flatMap((c,j)=>c==='beacon'?[i+':'+j]:[])),dock=start.row+':'+start.col;
 assert.match(rescueStoryVoice(map,start),/safe/);assert.equal(rescueLandmarkHighlight(map,start,dock,'dock'),false);
 for(const id of ids)assert.equal(rescueLandmarkHighlight(map,start,id,'beacon'),true);
 const [row,col]=ids[0].split(':').map(Number),at={...start,row,col};assert.equal(rescueGoalCue(map,at),'repair-here');assert.match(rescueStoryVoice(map,at),/wrench/);assert.equal(rescueLandmarkHighlight(map,at,ids[1],'beacon'),false);
 const repaired=stepRescue(map,at,'repair');assert.equal(rescueLandmarkHighlight(map,repaired,ids[0],'beacon'),false);
 const all={...repaired,repaired:ids};assert.equal(rescueLandmarkHighlight(map,all,dock,'dock'),true);assert.match(rescueStoryVoice(map,all),/home/);assert.equal(rescueLandmarkHighlight(map,{...all,won:true},dock,'dock'),false);
 }
});
test('scene landmark and shore details follow actual board; no obstacle on connecting edges',()=>{
 for(const map of RESCUE_MAPS){const world=createRescueSpatialScene(map),start=startRescue(map),dock=start.row+':'+start.col,ids=[...world.beacons.keys()];assert.equal(world.landmarks.size,3);
 for(const [id,tile] of world.tiles){const [r,c]=id.split(':').map(Number);if(map.cells[r][c]==='water')continue;for(const [side,wet] of Object.entries(rescueShoreEdges(map,r,c)))assert.equal(Boolean(tile.getObjectByName('shore-'+side)),wet);}
 assert.equal(world.landmarks.get(dock)!.marker.visible,false);
 const [row,col]=ids[0].split(':').map(Number);world.update({...start,row,col});assert.equal(world.landmarks.get(ids[0])!.marker.visible,true);assert.equal(world.landmarks.get(ids[1])!.marker.visible,false);
 world.update({...start,repaired:ids});assert.equal(world.landmarks.get(dock)!.marker.visible,true);for(const id of ids)assert.equal(world.landmarks.get(id)!.marker.visible,false);
 world.update(start);assert.equal(world.landmarks.get(dock)!.marker.visible,false);world.dispose();}
});
