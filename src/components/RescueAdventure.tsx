import React,{useEffect,useMemo,useState} from 'react';
import {ArrowUp,ArrowRight,ArrowDown,ArrowLeft,Wrench,Bot,Home,Lightbulb,Check,Play,Pause,RotateCcw,Undo2,Footprints,Code2,StepForward} from 'lucide-react';
import {CharacterVoiceButton} from './CharacterVoiceButton';
import {RESCUE_MAPS,RESCUE_ACTIONS,RESCUE_MAX_COMMANDS,startRescue,stepRescue,traceRescue,rescueGoal,type RescueAction} from '../game/rescueAdventure';
const icons={up:ArrowUp,right:ArrowRight,down:ArrowDown,left:ArrowLeft,repair:Wrench};
const actionLabels={up:'Up',right:'Right',down:'Down',left:'Left',repair:'Repair beacon'};
const feedback={ready:'Find the two beacons!',move:'Keep exploring!',blocked:'Water ahead! Try another way.',repair:'Beacon restored!',already:'This beacon is already fixed.', 'wrong-place':'Go to a beacon first.',win:'You restored both beacons and came home!'};
export function RescueAdventure({muted}:{muted:boolean}){
 const [mapIndex,setMapIndex]=useState(0),[mode,setMode]=useState<'explore'|'code'>('explore');
 const map=RESCUE_MAPS[mapIndex];
 const [direct,setDirect]=useState(()=>startRescue(RESCUE_MAPS[0]));
 const [program,setProgram]=useState<RescueAction[]>([]),[cursor,setCursor]=useState(0),[running,setRunning]=useState(false);
 const trace=useMemo(()=>traceRescue(map,program),[map,program]);
 const state=mode==='explore'?direct:trace[Math.min(cursor,trace.length-1)];
 const last=trace.length-1;
 const reset=()=>{setRunning(false);setCursor(0);setDirect(startRescue(map));};
 const switchMap=(i:number)=>{setMapIndex(i);setRunning(false);setCursor(0);setProgram([]);setDirect(startRescue(RESCUE_MAPS[i]));};
 const switchMode=(m:'explore'|'code')=>{setMode(m);reset();};
 useEffect(()=>{
  if(!running||mode!=='code')return;
  if(cursor>=last){setRunning(false);return;}
  const timer=window.setTimeout(()=>setCursor(c=>Math.min(c+1,last)),350);
  return ()=>window.clearTimeout(timer);
 },[running,mode,cursor,last]);
 const act=(action:RescueAction)=>{
  if(mode==='explore'){setDirect(s=>stepRescue(map,s,action));return;}
  if(running||program.length>=RESCUE_MAX_COMMANDS)return;
  setCursor(0);setProgram(p=>[...p,action]);
 };
 return <div className="mt-3 space-y-2" data-testid="rescue-adventure-prototype">
  <div className="flex items-center justify-between gap-2"><div className="flex flex-wrap gap-1">{RESCUE_MAPS.map((m,i)=><button key={m.id} type="button" aria-pressed={i===mapIndex} onClick={()=>switchMap(i)} className={'min-h-11 rounded-lg border px-2 text-xs font-bold '+(i===mapIndex?'border-cyan-300 bg-cyan-900 text-white':'border-slate-600 bg-slate-900 text-slate-200')}>{i+1} · {m.name}</button>)}</div><CharacterVoiceButton id="rescue_intro" text="Let's save the beacons! Use the arrows to move. Tap the wrench when you are on a beacon. Fix both, then go back home. Try it yourself, then build a program!" muted={muted}/></div>
  <div className="flex gap-2"><button type="button" aria-pressed={mode==='explore'} onClick={()=>switchMode('explore')} className={'flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-bold '+(mode==='explore'?'border-emerald-300 bg-emerald-800 text-white':'border-slate-500 text-slate-200')}><Footprints className="h-5 w-5"/> Explore</button><button type="button" aria-pressed={mode==='code'} onClick={()=>switchMode('code')} className={'flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-bold '+(mode==='code'?'border-sky-300 bg-sky-800 text-white':'border-slate-500 text-slate-200')}><Code2 className="h-5 w-5"/> Code</button></div>
  <div className="flex items-center justify-center gap-2 text-cyan-100"><Wrench className="h-5 w-5"/><span className="font-black">{state.repaired.length}/{rescueGoal(map)}</span><ArrowRight className="h-4 w-4"/><Home className="h-5 w-5 text-emerald-300"/></div>
  <div className="mx-auto grid max-w-[300px] grid-cols-5 gap-1 rounded-xl bg-cyan-950 p-1" role="img" aria-label={`Rescue board, robot row ${state.row+1}, column ${state.col+1}, ${state.repaired.length} repaired`}>
   {map.cells.flatMap((row,r)=>row.map((cell,c)=>{
    const bot=state.row===r&&state.col===c,done=state.repaired.includes(r+':'+c);
    return <div key={r+':'+c} className={'relative flex aspect-square items-center justify-center rounded-md border '+(cell==='water'?'border-cyan-900 bg-cyan-800/60':cell==='dock'?'border-emerald-300 bg-emerald-900':cell==='beacon'?'border-amber-300 bg-slate-700':'border-teal-400/70 bg-teal-900')} aria-hidden="true">
     {cell==='water'?<span className="text-lg text-cyan-300">≈</span>:cell==='dock'?<Home className="h-6 w-6 text-emerald-200"/>:cell==='beacon'?(done?<Check className="h-6 w-6 text-emerald-300"/>:<Lightbulb className="h-6 w-6 text-amber-300"/>):null}
     {bot&&<span className="absolute inset-0.5 flex items-center justify-center rounded-lg border-2 border-yellow-200 bg-slate-950/90 shadow-md"><Bot className="h-7 w-7 text-yellow-300"/></span>}
    </div>;
   }))}
  </div>
  <div className="flex min-h-8 items-center justify-center gap-2 text-center text-sm font-bold text-white" role="status">{state.won&&<Check className="h-5 w-5 text-emerald-300"/>}{feedback[state.feedback]}</div>
  <div className="grid grid-cols-5 gap-1">
   {RESCUE_ACTIONS.map(action=>{const Icon=icons[action];return <button key={action} type="button" aria-label={actionLabels[action]} disabled={running||(mode==='explore'?state.won:program.length>=RESCUE_MAX_COMMANDS)} onClick={()=>act(action)} className={'flex min-h-12 items-center justify-center rounded-xl border disabled:opacity-50 '+(action==='repair'?'border-amber-300 bg-amber-900 text-amber-100':'border-sky-400 bg-slate-800 text-sky-200')}><Icon className="h-6 w-6" aria-hidden="true"/></button>})}
  </div>
  {mode==='code'&&<>
   <div className="flex min-h-12 flex-wrap items-center gap-1 rounded-xl border border-slate-600 bg-slate-950 p-2" aria-label="Command sequence">{program.map((a,i)=>{const Icon=icons[a];return <span key={i} className={'flex h-8 w-8 items-center justify-center rounded border '+(i===cursor-1?'border-yellow-300 bg-yellow-900':'border-sky-700 bg-slate-800')}><Icon className="h-4 w-4 text-sky-100" aria-label={actionLabels[a]}/></span>})}{program.length===0&&<span className="text-xs text-slate-400">Tap arrows and wrench to plan.</span>}</div>
   <div className="flex flex-wrap gap-1"><button type="button" aria-label={running?'Pause program':'Run program'} disabled={!program.length} onClick={()=>{if(running){setRunning(false);return;}setCursor(0);setRunning(true);}} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 font-bold text-white disabled:opacity-50">{running?<Pause className="h-5 w-5"/>:<Play className="h-5 w-5"/>}{running?'Pause':'Run'}</button><button type="button" aria-label="Step program" disabled={running||cursor>=last} onClick={()=>setCursor(c=>Math.min(c+1,last))} className="min-h-11 rounded-xl border border-sky-400 px-3 text-sky-100 disabled:opacity-50"><StepForward className="h-5 w-5"/></button><button type="button" aria-label="Undo last command" disabled={running||!program.length} onClick={()=>{setProgram(p=>p.slice(0,-1));setCursor(0);}} className="min-h-11 rounded-xl border border-slate-500 px-3 text-white disabled:opacity-50"><Undo2 className="h-5 w-5"/></button><button type="button" aria-label="Clear program" disabled={running} onClick={()=>{setProgram([]);setCursor(0);}} className="min-h-11 rounded-xl border border-slate-500 px-3 text-white disabled:opacity-50">Clear</button></div>
  </>}
  <button type="button" onClick={reset} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-500 text-sm font-bold text-slate-200"><RotateCcw className="h-4 w-4"/> Reset</button>
  <p className="text-xs text-slate-300">Practice only · No stars or rewards</p>
 </div>;
}
