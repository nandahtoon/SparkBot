import React,{useState} from 'react';
import { Bot,Check,Lock,Star,ChevronRight } from 'lucide-react';
import type { AdventureSave } from '../game/adventureMap';
import { buildMainGameSnapshot } from '../game/mainGameFoundation';
import { CharacterVoiceButton } from './CharacterVoiceButton';
const symbols=['⚙','☀','✦','⚡','▧','≈'];
export function AdventureMap({save,currentLevelId,onSelectLevel,muted}:{save:AdventureSave;currentLevelId:number;onSelectLevel:(id:number)=>void;muted:boolean}){
 const {chapters}=buildMainGameSnapshot(save);
 const initial=chapters.find(c=>c.missions.some(m=>m.id===currentLevelId))?.id??chapters[0].id;
 const [selected,setSelected]=useState(initial);
 const chapter=chapters.find(c=>c.id===selected)??chapters[0];
 return <section data-testid="interactive-world-map" aria-label="Adventure world map" className="space-y-3 rounded-2xl border border-sky-700/70 bg-slate-950 p-3">
  <div className="flex items-center justify-between gap-2">
   <h3 className="text-sm font-black text-white">Adventure Map</h3>
   <CharacterVoiceButton id="adventure_map_voice" text={`Let's explore! ${chapter.title}. Tap a mission to travel there.`} muted={muted}/>
  </div>
  <div className="grid grid-cols-3 gap-2" aria-label="Choose a world">
   {chapters.map((ch,i)=><button key={ch.id} type="button" aria-pressed={ch.id===chapter.id} aria-label={ch.title+', '+ch.missions.filter(m=>m.stars>0).length+' of '+ch.missions.length+' complete'} onClick={()=>setSelected(ch.id)} className="relative flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-slate-900 px-1 py-2 text-center focus-visible:outline-2 focus-visible:outline-white" style={{borderColor:ch.id===chapter.id?ch.accent:'#334155'}}>
    <span aria-hidden="true" className="text-2xl font-black leading-none" style={{color:ch.accent}}>{symbols[i%6]}</span>
    <span className="text-[11px] font-black leading-tight text-slate-100">{ch.title}</span>
    <span className="text-[10px] text-sky-200">{ch.missions.filter(m=>m.stars>0).length}/{ch.missions.length}</span>
   </button>)}
  </div>
  <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 px-3 py-3">
   <h4 className="mb-2 text-center text-sm font-black text-white">{chapter.title}</h4>
   <div className="relative flex flex-col gap-2">
    <div aria-hidden="true" className="absolute bottom-8 left-[27px] top-8 -z-10 w-1 rounded-full opacity-50" style={{background:chapter.accent}}/>
    {chapter.missions.map(m=><button key={m.id} type="button" disabled={!m.unlocked} aria-current={m.id===currentLevelId?'step':undefined} aria-label={`Mission ${m.id}: ${m.name}, ${m.unlocked?m.stars+' stars':'locked'}`} onClick={()=>onSelectLevel(m.id)} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-600 bg-slate-900 px-2 py-1.5 text-left disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white" style={m.id===currentLevelId?{borderColor:chapter.accent}:undefined}>
     <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-slate-800 text-lg font-black" style={{borderColor:chapter.accent,color:chapter.accent}}>{!m.unlocked?<Lock className="h-5 w-5"/>:m.id===currentLevelId?<Bot className="h-6 w-6"/>:m.stars>0?<Check className="h-6 w-6"/>:m.id}</span>
     <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{m.id} · {m.name}</span><span className="flex gap-0.5" aria-hidden="true">{[1,2,3].map(n=><Star key={n} className={'h-3.5 w-3.5 '+(n<=m.stars?'fill-amber-300 text-amber-300':'text-slate-500')}/>)}</span></span>
     {m.unlocked&&<ChevronRight className="h-5 w-5 text-sky-300" aria-hidden="true"/>}
    </button>)}
   </div>
  </div>
 </section>;
}
