import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_CHARACTER_ORDER} from './customization';
import {readRescueCompanion,rescueCompanionReaction} from './rescueCompanion';
import {SAVE_KEY} from './types';
import {ROSTER_KEY,SLOT_STORAGE_PREFIX} from './profileRoster';
import {RESCUE_MAPS,startRescue,stepRescue} from './rescueAdventure';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
test('active learner slot is read without writing, legacy and malformed saves fall back',()=>{
 const data=new Map<string,string>([[SAVE_KEY,JSON.stringify({botCharacter:'nova',muted:false})],[ROSTER_KEY,JSON.stringify({activeSlotId:'slot_2',slots:[{id:'slot_2'}]})],[SLOT_STORAGE_PREFIX+'slot_2',JSON.stringify({botCharacter:'sprout',muted:true})]]);
 const storage={getItem:(key:string)=>data.get(key)??null},before=JSON.stringify([...data]);assert.deepEqual(readRescueCompanion(storage),{character:'sprout',muted:true});assert.equal(JSON.stringify([...data]),before);
 data.set(ROSTER_KEY,'invalid');assert.equal(readRescueCompanion(storage).character,'nova');assert.equal(readRescueCompanion(null).character,'sparkbot');
});
test('all five companions use distinct scene identity and keep rules independent',()=>{
 const m=RESCUE_MAPS[0],s=startRescue(m),next=stepRescue(m,s,'up');
 for(const id of BOT_CHARACTER_ORDER){const world=createRescueSpatialScene(m,id);assert.equal(world.robot.userData.character,id);assert.ok(world.robot.getObjectByName('companion-'+id));world.update(next);assert.equal(world.robot.position.z,-2);assert.equal(rescueCompanionReaction(id,'win').mood,'celebrate');assert.match(rescueCompanionReaction(id,'blocked').text,/Water ahead/);world.dispose();}
});
