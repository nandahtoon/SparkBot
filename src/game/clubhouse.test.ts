import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ALL_GAME_ROOM_GAMES} from './arcadeGames';
import {CLUBHOUSE_LAYOUT,createClubhouseScene} from '../three/clubhouseScene';
test('clubhouse contains one actual cabinet and anchor for each existing game',()=>{
 const room=createClubhouseScene('#38bdf8');
 assert.equal(CLUBHOUSE_LAYOUT.length,7);
 assert.deepEqual([...room.cabinets.keys()],ALL_GAME_ROOM_GAMES.map(g=>g.id));
 assert.equal(room.anchors.size,7);
 for(const game of CLUBHOUSE_LAYOUT){assert.equal(room.cabinets.get(game.id)?.position.x,game.x);assert.ok(room.anchors.has(game.id));}
 room.animate(1,false);room.animate(0,true);room.dispose();assert.equal(room.scene.children.length,0);
});
test('arcade has one player-facing catalog; experimental 3D room stays isolated',()=>{
 const room=fs.readFileSync('src/components/GameRoomModal.tsx','utf8');
 const club=fs.readFileSync('src/components/Clubhouse3D.tsx','utf8');
 assert.doesNotMatch(room,/Clubhouse3D|clubhouse-view-picker|clubhouseView/);
 assert.equal((room.match(/data-testid="clubhouse-card-view"/g)||[]).length,1);
 assert.equal((room.match(/ARCADE_GAMES\.map/g)||[]).length,1);
 assert.equal((room.match(/EDUCATIONAL_MINI_GAMES\.map/g)||[]).length,1);
 assert.match(room,/disabled=\{isPlanetCard&&!onLaunchPlanetAdventure\}/);
 assert.ok(room.indexOf('<JourneyCard next=')<room.indexOf('data-testid="clubhouse-card-view"'));
 assert.match(club,/onSelectGame\(game.id\)/);
 assert.match(club,/webglcontextlost/);
 assert.match(club,/cancelAnimationFrame\(raf\)/);
 assert.match(club,/forceContextLoss\(\)/);
 assert.match(club,/document.hidden/);
});
