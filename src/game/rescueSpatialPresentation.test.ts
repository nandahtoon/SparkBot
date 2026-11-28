import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RESCUE_MAPS,startRescue,stepRescue,traceRescue} from './rescueAdventure';
import {rescueWorldPosition,rescueSpatialSnapshot,RESCUE_TILE_SIZE} from './rescueSpatialPresentation';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
for(const map of RESCUE_MAPS)test('spatial scene maps deterministic board: '+map.id,()=>{
 const start=startRescue(map),snap=rescueSpatialSnapshot(map,start);assert.equal(snap.tiles.length,25);assert.equal(new Set(snap.tiles.map(t=>t.x+':'+t.z)).size,25);
 const p=rescueWorldPosition(map,2,2),up=rescueWorldPosition(map,1,2),right=rescueWorldPosition(map,2,3);assert.equal(up.z,p.z-RESCUE_TILE_SIZE);assert.equal(right.x,p.x+RESCUE_TILE_SIZE);
 const world=createRescueSpatialScene(map);assert.equal(world.tiles.size,25);assert.equal(world.beacons.size,2);assert.equal(world.robot.position.x,snap.robot.x);assert.equal(world.robot.position.z,snap.robot.z);
 for(const [id,b] of world.beacons){const [row,col]=id.split(':').map(Number);const repaired=stepRescue(map,{...start,row,col},'repair');world.update(repaired);assert.equal(b.flag.visible,true);assert.equal(world.robot.position.x,rescueWorldPosition(map,row,col).x);world.update(start);assert.equal(b.flag.visible,false);}
 const states=traceRescue(map,['up','left','right']);for(const s of states){world.update(s);const pos=rescueSpatialSnapshot(map,s).robot;assert.equal(world.robot.position.x,pos.x);assert.equal(world.robot.position.z,pos.z);}
 world.resize(320,500);assert.ok(world.camera.right>=6);world.resize(800,320);assert.ok(world.camera.top>=6);
 world.dispose();world.dispose();assert.equal(world.scene.children.length,0);
});
test('experiment route owns the only renderer and keeps normal App alternative',()=>{
 const main=fs.readFileSync('src/main.tsx','utf8'),board=fs.readFileSync('src/components/RescueSpatialBoard.tsx','utf8');assert.match(main,/experimentalRescue\?<Suspense/);assert.match(main,/:<App \/>/);assert.doesNotMatch(board,/setAnimationLoop/);assert.match(board,/active&&more\)frame=requestAnimationFrame/);assert.match(board,/cancelAnimationFrame\(frame\)/);assert.match(board,/visibilitychange/);assert.match(board,/prefers-reduced-motion/);assert.match(board,/webglcontextlost/);assert.match(board,/renderer\.dispose\(\)/);assert.match(board,/return cleanup/);assert.match(board,/\{fallback\}/);
});
