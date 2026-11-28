import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BOT_CHARACTERS,BOT_CHARACTER_ORDER,normalizeBotCharacter} from './customization';
test('companion refresh keeps all existing saved identities and selection callbacks',()=>{
 assert.deepEqual(BOT_CHARACTER_ORDER,['sparkbot','sprout','nova','robobuddy','learnbot']);
 for(const id of BOT_CHARACTER_ORDER){assert.equal(normalizeBotCharacter(id),id);assert.equal(BOT_CHARACTERS[id].id,id);}
 const ui=fs.readFileSync('src/components/BotProfileModal.tsx','utf8'),art=fs.readFileSync('src/components/CompanionPortrait.tsx','utf8'),rig=fs.readFileSync('src/three/robotRig.ts','utf8');
 assert.match(ui,/data-character=\{activeCharacter\}/);assert.match(ui,/filter\(id=>id!==activeCharacter\)/);assert.match(ui,/onSelectCharacter\(charId\)/);assert.match(ui,/overflow-y-auto overscroll-contain/);
 for(const id of BOT_CHARACTER_ORDER)assert.ok(art.includes(id));
 assert.match(rig,/sproutCrest.visible = norm === 'sprout'/);
 assert.match(rig,/activeCharacter === 'nova' \? 1.08 : 1.04/);
});
