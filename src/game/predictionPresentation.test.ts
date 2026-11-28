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
 question.options.forEach((opt,i)=>assert.ok(speech.includes('Choice '+(i+1)+'. '+opt.label)));
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
