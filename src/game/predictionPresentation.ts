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
export function getPredictionSpeech(question:PredictQuizQuestion):string{
 return [getPredictionPrompt(question),...question.options.map((opt,i)=>`Choice ${i+1}. ${opt.label}. ${opt.detail??''}`)].join(' ');
}
export function getPredictionResultSpeech(question:PredictQuizQuestion,correct:boolean):string{
 const answer=question.options.find(opt=>opt.id===question.correctOptionId);
 return correct?'Great prediction! Press play to watch.':`Good try! The answer is ${answer?.label??'shown'}. Press play to watch.`;
}
