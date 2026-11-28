import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildAdventureMap,canEnterCampaign,createMissionTravel} from './adventureMap';
import {getLevelById} from './levels';
const save={stars:{1:2},bonusStars:{9:{stars:3,bonusStar:true}},unlockedLevel:2};
test('world map covers exactly 24 actual missions and preserves existing unlock rules',()=>{
 const chapters=buildAdventureMap(save);
 assert.equal(chapters.length,6);
 const nodes=chapters.flatMap(ch=>ch.missions);
 assert.deepEqual(nodes.map(m=>m.id),Array.from({length:24},(_,i)=>i+1));
 assert.equal(nodes[0].stars,2);assert.equal(nodes[1].unlocked,true);assert.equal(nodes[2].unlocked,false);
 assert.equal(nodes[8].stars,3);assert.equal(nodes[23].unlocked,true);
 assert.equal(canEnterCampaign({...getLevelById(1)!,isSandbox:true},save),false);
});
test('travel only depicts real consecutive campaign missions, including chapter boundaries',()=>{
 for(const id of [1,3,7,12,16,20,23]){
  const from=getLevelById(id)!,to=getLevelById(id+1)!;
  const travel=createMissionTravel(from,to)!;
  assert.equal(travel.toId,id+1);assert.equal(travel.toName,to.name);
 }
 assert.equal(createMissionTravel(getLevelById(1)!,getLevelById(3)!),null);
 assert.equal(createMissionTravel({...getLevelById(1)!,isPrototype:true},getLevelById(2)!),null);
});
test('travel overlay is dismissible and does not own progression writes',()=>{
 const ui=fs.readFileSync('src/components/MissionTravelOverlay.tsx','utf8');
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert.match(ui,/Skip travel animation/);assert.match(ui,/clearTimeout/);assert.match(ui,/prefers-reduced-motion/);
 assert.doesNotMatch(ui,/setSave|beginLevel/);
 assert.match(app,/beginLevel\(target\);\s*if\(travel\)/);
 assert.match(app,/target&&canEnterCampaign\(target,save\)/);
});
