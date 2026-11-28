import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getLevelById } from './levels';
import { buildPredictBeforeRunQuestion } from './predictQuiz';
import { getPredictionPrompt,getPredictionSpeech,getPredictionTile,getPredictionResultSpeech,CHOICE_SHAPES } from './predictionPresentation';
test('landing choices map to real track tiles and distinct visual shapes',()=>{
 const level=getLevelById(21)!;
 const question=buildPredictBeforeRunQuestion({level,chassis:level.starterChassis!,program:[{id:'a',type:'MOVE'},{id:'b',type:'MOVE'},{id:'c',type:'JUMP'},{id:'d',type:'MOVE'}]})!;
 assert.equal(getPredictionPrompt(question),'Where will SparkBot stop?');
 assert.ok(question.options.every(opt=>getPredictionTile(opt.id,level.track)!==null));
 assert.equal(new Set(CHOICE_SHAPES).size,3);
 assert.equal(getPredictionTile('tile_999',level.track),null);
 assert.equal(getPredictionTile('clear',level.track),null);
 const speech=getPredictionSpeech(question);
 question.options.forEach((opt,i)=>{assert.ok(speech.includes(['circle','diamond','triangle'][i]));assert.ok(speech.includes('tile '+getPredictionTile(opt.id,level.track)));});
 assert.ok(speech.startsWith('Beep beep!'));
 assert.ok(speech.length<=420);
 assert.match(getPredictionResultSpeech(question,true),/Woo hoo!/);
 assert.ok(getPredictionResultSpeech(question,false).startsWith('Good try!'));
});
test('prediction UI preserves direct run, visual track and manual audio',()=>{
 const card=fs.readFileSync('src/components/PredictBeforeRunCard.tsx','utf8');
 assert.match(card,/prediction-visual-track/);assert.match(card,/Hear question and answer choices/);
 assert.match(card,/skipPredictBtn/);assert.match(card,/launchAfterPredictBtn/);
 assert.match(card,/disabled=\{!speech.supported\|\|muted\}/);
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert.match(app,/showPathPreview && !pendingPredictQuiz/);
});

test('playful speech follows cancellation and mute, with gentle cues after narration',()=>{
 const controller=fs.readFileSync('src/game/readAloud.ts','utf8');
 const audio=fs.readFileSync('src/game/audio.ts','utf8');
 const card=fs.readFileSync('src/components/PredictBeforeRunCard.tsx','utf8');
 assert.match(controller,/utteranceGeneration === generation/);
 assert.match(controller,/style\.playful \? 0\.88/);
 assert.match(controller,/localService/);
 assert.match(audio,/predictionCue\(kind:/);
 assert.match(audio,/filteredTone\('ui',note/);
 assert.match(card,/if\(muted\)return/);
 assert.match(card,/playful:true,onFinished:cue/);
 assert.match(card,/autoReadAloud&&!muted/);
});
