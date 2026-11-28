import type { PredictQuizQuestion } from './predictQuiz';
import type { TrackTile } from './types';
export const CHOICE_SHAPES=['●','◆','▲'] as const;
export function getPredictionTile(id:string,track:readonly TrackTile[]):number|null{
 const match=/^tile_(\d+)$/.exec(id);
 if(!match)return null;
 const index=Number(match[1]);
 return Number.isSafeInteger(index)&&index>=0&&index<track.length?index:null;
}
export function getPredictionPrompt(question:PredictQuizQuestion):string{
 if(question.kind==='landing_tile'||question.kind==='function_reuse')return 'Where will SparkBot stop?';
 return question.prompt;
}
export const SPOKEN_SHAPES=['circle','diamond','triangle'] as const;
export function getPredictionSpeech(question:PredictQuizQuestion):string{
 const landing=question.kind==='landing_tile'||question.kind==='function_reuse';
 const intro=landing?'Beep beep! Where will I stop? Look at your code.':`Ready, explorer? ${question.prompt}`;
 const choices=question.options.map((opt,i)=>{
  const shape=SPOKEN_SHAPES[i]??`choice ${i+1}`;
  const tile=/^tile_(\d+)$/.exec(opt.id);
  return tile?`The ${shape}, tile ${tile[1]}.`:`The ${shape}. ${opt.label}.`;
 });
 return [intro,...choices,'Tap your guess! Or press play.'].join(' ');
}
export function getPredictionResultSpeech(question:PredictQuizQuestion,correct:boolean):string{
 const index=question.options.findIndex(opt=>opt.id===question.correctOptionId);
 const answer=question.options[index];
 const shape=SPOKEN_SHAPES[index];
 const tile=answer&&/^tile_(\d+)$/.exec(answer.id);
 const target=shape?`${shape}${tile?`, tile ${tile[1]}`:''}`:answer?.label??'highlighted choice';
 return correct?'Woo hoo! You got it! Press play.':`Good try, explorer! Look at the ${target}. Let's watch what happens.`;
}
