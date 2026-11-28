import React,{useEffect,useState} from 'react';
import {ADVENTURE_MISSION_DESIGNS} from '../game/adventureMissionDesign';
import {SLICE_MISSIONS,startSlice,stepSlice,sliceActions,type SliceId,type Command} from '../game/adventureRuleSlice';
import {dismissSplashScreen} from '../game/splashScreen';
import {CharacterVoiceButton} from './CharacterVoiceButton';

const ids=[13,14,15,16] as const;
const labels={collect:'Collect tool',repair:'Repair bridge',rescue:'Rescue robot',signal:'Send safe signal',allocate:'Deliver energy',reclaim:'Reclaim energy',scan:'Scan fault',align:'Align switch',restart:'Restart guardian'};
export function AdventureSlicePreview(){
 const [id,setId]=useState<SliceId>(13);
 const [state,setState]=useState(startSlice);
 const [muted,setMuted]=useState(false);
 useEffect(()=>{dismissSplashScreen({minVisibleMs:0});},[]);
 const mission=SLICE_MISSIONS[id],design=ADVENTURE_MISSION_DESIGNS.find(d=>d.id===id)!;
 const site=mission.sites.find(n=>n.id===state.at)!;
 const send=(cmd:Command)=>setState(s=>stepSlice(id,s,cmd));
 const select=(next:SliceId)=>{setId(next);setState(startSlice());};
 return <main className="safe-top safe-bottom h-full overflow-y-auto bg-slate-950 text-slate-100">
  <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
   <header className="flex flex-wrap items-center justify-between gap-2">
    <div><h1 className="text-2xl font-black text-sky-200">SparkBot · Adventure</h1><p className="text-xs text-slate-300">Campaign rule test · no save changes</p></div>
    <div className="flex gap-2"><button type="button" onClick={()=>setMuted(v=>!v)} aria-label={muted?'Unmute voice':'Mute voice'} className="min-h-11 rounded-xl border border-slate-500 px-3">{muted?'🔇':'🔊'}</button><a href="/?legacyGame=1" className="flex min-h-11 items-center rounded-xl border border-slate-500 px-3">Legacy game</a></div>
   </header>
   <nav aria-label="Test missions" className="grid grid-cols-4 gap-2">{ids.map(n=><button key={n} type="button" aria-pressed={id===n} onClick={()=>select(n)} className={'min-h-12 rounded-xl border font-bold '+(id===n?'border-emerald-300 bg-emerald-900':'border-slate-600 bg-slate-800')}>{n}</button>)}</nav>
   <section className="rounded-2xl border border-sky-800 bg-slate-900 p-3">
    <div className="flex items-center gap-2"><div className="flex-1"><h2 className="text-xl font-black">{design.title}</h2><p className="text-sm text-sky-100">{mission.goal}</p></div><CharacterVoiceButton id={'slice_goal_'+id} text={mission.goal} muted={muted}/></div>
   </section>
   <section aria-label="Connected mission sites" className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-950 p-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{mission.sites.map(n=>{
      const here=state.at===n.id,reachable=site.links.includes(n.id),done=state.flags.includes(n.id)||(n.id==='tools'&&state.flags.includes('tool'));
      return <button key={n.id} type="button" disabled={!reachable||state.won} aria-current={here?'location':undefined} aria-label={n.name+(here?', here':reachable?', connected':', not connected')} onClick={()=>send({kind:'move',to:n.id})} className={'min-h-20 rounded-xl border-2 p-2 text-left '+(here?'border-sky-300 bg-sky-950':reachable?'border-emerald-500 bg-emerald-950':'border-slate-700 bg-slate-900 opacity-70')}>
       <span aria-hidden="true" className="block text-2xl">{here?'🤖':n.icon}{done?' ✓':''}</span><span className="block text-sm font-bold">{n.name}</span><span className="text-xs text-slate-300">{here?'You are here':reachable?'Travel':'Not adjacent'}</span>
      </button>;
    })}</div>
   </section>
   {id===15&&<div className="rounded-xl border border-amber-500 bg-slate-900 p-3 text-sm font-bold">⚡ Available: {3-state.power.shelter-state.power.lift} · Shelter {state.power.shelter}/1 · Lift {state.power.lift}/2</div>}
   <section className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
    <h3 className="font-bold">{site.name}</h3>
    <p role="status" className="my-2 text-sm text-sky-100">{state.message}</p>
    <div className="flex flex-wrap gap-2">{!state.won&&sliceActions(id,state.at).map(action=><button key={action} type="button" onClick={()=>send({kind:'act',action})} className="min-h-12 flex-1 rounded-xl bg-emerald-400 px-3 font-black text-slate-950">{labels[action]}</button>)}</div>
    {state.won&&<div className="mt-2 text-xl font-black text-emerald-300">Mission complete! ⭐</div>}
    <div className="mt-3 flex gap-2"><button type="button" onClick={()=>setState(startSlice())} className="min-h-11 flex-1 rounded-xl border border-slate-500">Restart</button>{state.won&&id<16&&<button type="button" onClick={()=>select((id+1) as SliceId)} className="min-h-11 flex-1 rounded-xl bg-sky-400 font-black text-slate-950">Next mission</button>}</div>
   </section>
  </div>
 </main>;
}
