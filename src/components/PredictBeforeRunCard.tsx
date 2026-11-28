import React, { useEffect, useState } from 'react';
import { Brain, Check, Flag, GitBranch, Pause, Play, ShieldAlert, SkipForward, Volume2, VolumeX, Zap } from 'lucide-react';
import type { PredictQuizQuestion } from '../game/predictQuiz';
import type { CodeBlock, TrackTile } from '../game/types';
import { SPEECH, useReadAloud } from '../game/readAloud';
import { SFX } from '../game/audio';
import { CHOICE_SHAPES, getPredictionPrompt, getPredictionResultSpeech, getPredictionSpeech, getPredictionTile } from '../game/predictionPresentation';

interface PredictBeforeRunCardProps {
 question:PredictQuizQuestion|null;
 track:TrackTile[];
 program:CodeBlock[];
 muted?:boolean;
 autoReadAloud?:boolean;
 onComplete:(result:{correct:boolean;skipped:boolean})=>void;
}
const colors=['#67e8f9','#fbbf24','#c4b5fd'];
function TilePicture({type}:{type:TrackTile['type']}){
 if(type==='gap')return <span className="inline-block h-5 w-7 rounded border-2 border-dashed border-slate-500" aria-hidden="true"/>;
 if(type==='gate')return <Flag className="h-6 w-6" aria-hidden="true"/>;
 if(type==='start')return <span className="text-lg" aria-hidden="true">🤖</span>;
 if(type==='mud')return <span className="h-5 w-7 rounded bg-amber-800" aria-hidden="true">≈</span>;
 if(type==='ramp')return <span className="text-lg" aria-hidden="true">◢</span>;
 return <span className="h-5 w-7 rounded border border-sky-200 bg-slate-600" aria-hidden="true"/>;
}
function OptionPicture({id,tile,track}:{id:string;tile:number|null;track:TrackTile[]}){
 if(tile!==null)return <TilePicture type={track[tile].type}/>;
 if(['win','clear','then'].includes(id))return <Check className="h-7 w-7" aria-hidden="true"/>;
 if(['blocked','hazard'].includes(id))return <ShieldAlert className="h-7 w-7" aria-hidden="true"/>;
 if(id==='else')return <GitBranch className="h-7 w-7" aria-hidden="true"/>;
 if(id==='skip')return <SkipForward className="h-7 w-7" aria-hidden="true"/>;
 return <Pause className="h-7 w-7" aria-hidden="true"/>;
}
const blockSymbols:Partial<Record<CodeBlock['type'],string>>={MOVE:'→',JUMP:'⤴',BOOST:'»',WAIT:'Ⅱ',LOOP:'↻',IF:'⑂',CALL_FUNC:'★'};
export const PredictBeforeRunCard:React.FC<PredictBeforeRunCardProps>=({question,track,program,muted=false,autoReadAloud=false,onComplete})=>{
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const speech=useReadAloud();
 const questionId=question?.id;
 const narration=question?getPredictionSpeech(question):'';
 const voiceId=`predict_${questionId}`;
 useEffect(()=>{setSelectedId(null);},[questionId]);
 useEffect(()=>{
  if(!questionId)return;
  if(autoReadAloud&&!muted){
   SFX.cancelSpeech();
   if(!SPEECH.speak(narration,voiceId,{playful:true}))SFX.predictionCue('invite');
  }else if(!muted)SFX.predictionCue('invite');
  return ()=>{if(SPEECH.getSnapshot().activeId?.startsWith('predict_'))SPEECH.stop();};
 },[questionId,autoReadAloud,muted,narration,voiceId]);
 if(!question)return null;
 const answered=selectedId!==null;
 const isCorrect=answered&&selectedId===question.correctOptionId;
 const tiles=question.options.map(opt=>getPredictionTile(opt.id,track));
 const visualTrack=tiles.every(tile=>tile!==null);
 const finish=()=>{SPEECH.stop();onComplete({correct:isCorrect,skipped:!answered});};
 const read=()=>{
  if(speech.activeId===voiceId){SPEECH.stop();return;}
  SFX.cancelSpeech();
  SPEECH.speak(answered?getPredictionResultSpeech(question,isCorrect):narration,voiceId,{playful:true,mood:answered?(isCorrect?'celebrate':'encourage'):'curious'});
 };
 const choose=(id:string)=>{
  setSelectedId(id);
  const correct=id===question.correctOptionId;
  if(muted)return;
  SFX.cancelSpeech();
  const cue=()=>SFX.predictionCue(correct?'correct':'try');
  if(!SPEECH.speak(getPredictionResultSpeech(question,correct),voiceId,{playful:true,mood:correct?'celebrate':'encourage',onFinished:cue}))cue();
 };
 return <div id="predictBeforeRunCard" role="dialog" aria-modal="false" aria-label="Predict Before Run Check" className="pointer-events-auto fixed inset-x-2 bottom-2 z-30 mx-auto max-w-xl sm:inset-x-4 sm:bottom-4">
  <div className="anim-pop flex max-h-[58dvh] flex-col gap-2 overflow-y-auto rounded-3xl border-2 border-sky-400/80 bg-slate-900/95 p-3 text-slate-100 shadow-2xl sm:p-4">
   <div className="flex items-center gap-2">
    <Brain className="h-7 w-7 shrink-0 text-sky-300" aria-hidden="true"/>
    <h3 className="min-w-0 flex-1 text-sm font-black leading-tight">{getPredictionPrompt(question)}</h3>
    <button type="button" onClick={read} disabled={!speech.supported||muted} aria-label={speech.activeId===voiceId?'Stop reading':'Hear question and answer choices'} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500 bg-sky-950 text-sky-200 disabled:opacity-40">{speech.activeId===voiceId?<VolumeX className="h-6 w-6"/>:<Volume2 className="h-6 w-6"/>}</button>
    {!answered&&<button id="skipPredictBtn" type="button" onClick={finish} aria-label="Skip question and run" className="flex h-12 shrink-0 items-center gap-1 rounded-xl bg-emerald-400 px-3 font-black text-slate-950"><Play className="h-6 w-6 fill-current" aria-hidden="true"/><span className="text-xs">Run</span></button>}
   </div>
   {visualTrack&&<div className="rounded-xl bg-slate-950/65 p-2" data-testid="prediction-visual-track">
    <div className="flex flex-wrap items-center gap-1 pb-1" aria-label="Your program">
     {program.slice(0,10).map((block,i)=><span key={block.id+'-'+i} className="rounded-md border border-sky-800 bg-sky-950 px-2 py-1 text-base font-black text-sky-100" aria-label={block.type}>{blockSymbols[block.type]??'•'}{block.type==='LOOP'&&<small>×{block.count}</small>}</span>)}
     {program.length>10&&<span>…</span>}
    </div>
    <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${Math.min(track.length,12)},minmax(0,1fr))`}}>
     {track.map((tile,i)=>{const pick=tiles.indexOf(i);return <div key={i} className="relative flex min-h-12 flex-col items-center justify-end gap-0.5 text-sky-200" aria-label={`Tile ${i}, ${tile.type}${pick>=0?', choice '+(pick+1):''}`}>
       {pick>=0&&<span className="text-base font-black leading-none" style={{color:colors[pick]}}>{CHOICE_SHAPES[pick]}</span>}
       <TilePicture type={tile.type}/><span className="text-[10px] tabular-nums">{i}</span>
     </div>})}
    </div>
   </div>}
   {!visualTrack&&<p className="text-xs text-slate-300">{question.helperText}</p>}
   <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${question.options.length},minmax(0,1fr))`}}>
    {question.options.map((opt,i)=>{
      const right=answered&&opt.id===question.correctOptionId;
      const picked=selectedId===opt.id;
      const tone=right?'border-emerald-400 bg-emerald-900/60':picked?'border-amber-400 bg-amber-900/50':'border-slate-600 bg-slate-800';
      return <button key={opt.id} type="button" disabled={answered} data-predict-option={opt.id} aria-label={`Choice ${i+1}: ${opt.label}. ${opt.detail??''}`} onClick={()=>choose(opt.id)} className={`relative flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-center ${tone}`}>
        <span className="flex items-center gap-1 font-black" style={{color:colors[i]}}><span className="text-xl leading-none">{CHOICE_SHAPES[i]}</span><OptionPicture id={opt.id} tile={tiles[i]} track={track}/></span>
        <span className="text-lg font-black">{tiles[i]!==null?tiles[i]:i+1}</span>
        {tiles[i]===null&&<span className="text-[10px] leading-tight">{opt.label}</span>}
        {right&&<Check className="absolute right-1 top-1 h-4 w-4 text-emerald-300" aria-hidden="true"/>}
      </button>;
    })}
   </div>
   {answered&&<div className="flex items-center justify-between gap-2" role="status">
    <span className={`flex items-center gap-1 text-sm font-bold ${isCorrect?'text-emerald-300':'text-amber-200'}`}>{isCorrect?<><Check className="h-5 w-5"/>Great! <Zap className="h-4 w-4"/>+20</>:'Good try!'}</span>
    <button id="launchAfterPredictBtn" type="button" onClick={finish} className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-slate-950"><Play className="h-6 w-6 fill-current"/>Run</button>
   </div>}
  </div>
 </div>;
};
