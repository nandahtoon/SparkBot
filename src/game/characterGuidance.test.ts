import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getLevelById} from './levels';
import {missionVoice,buildVoice,victoryVoice} from './characterGuidance';
test('mission narration preserves the real brief and build guidance follows the next part',()=>{
 for(const id of [1,21,22,23,24]){
  const level=getLevelById(id)!;
  assert.ok(missionVoice(level).includes(level.brief));
 }
 assert.match(buildVoice('wheels','Wheels','bottom pad'),/Wheels.*bottom pad/);
 assert.match(buildVoice(null),/green arrow/);
 assert.match(victoryVoice('Both stations observed!',true),/Both stations observed!/);
});
test('shared guidance respects mute and cancels only its own speech',()=>{
 const button=fs.readFileSync('src/components/CharacterVoiceButton.tsx','utf8');
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert.match(button,/SPEECH.stopOwned\(id\)/);
 assert.match(button,/playful:true/);
 assert.match(button,/auto&&!muted/);
 assert.match(app,/!pendingPredictQuiz && !showMap/);
 assert.match(app,/autoVoice=\{Boolean\(save.readAloudEnabled\)\}/);
});
