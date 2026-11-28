import React from 'react';
import { ArrowRight, Flag, Gem, Lock, MapPin, Play } from 'lucide-react';
import type { JourneyPreview } from '../game/journey';
export function JourneyCard({next,locked=false,onStart}:{next:JourneyPreview;locked?:boolean;onStart?:()=>void}){
 const ocean=next.biome==='ocean_discovery';
 return <div data-testid="journey-preview" className="relative isolate overflow-hidden rounded-2xl border border-sky-600/70 bg-slate-900 p-3 text-left">
   <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-40" style={{background:ocean?'linear-gradient(160deg,#164e63,#0e7490,#082f49)':'linear-gradient(160deg,#172554,#155e75,#111827)'}}/>
   <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-xs font-bold text-sky-200"><MapPin className="h-4 w-4"/> Next · {next.world}</span>{locked?<Lock className="h-4 w-4 text-slate-300"/>:<ArrowRight className="h-4 w-4 text-sky-300"/>}</div>
   <div className="my-1 text-sm font-black text-white">{next.id} · {next.name}</div>
   <div className="flex items-center gap-1 overflow-hidden" aria-label="Next mission route preview">
     {next.track.map((tile,i)=><span key={i} className={'flex h-6 min-w-0 flex-1 items-center justify-center rounded border '+(tile.type==='gap'?'border-dashed border-slate-400 bg-slate-950/40':tile.type==='gate'?'border-emerald-300 bg-emerald-900':'border-sky-700 bg-sky-950')} aria-label={tile.type+(tile.crystal?' with crystal':'')}>{tile.type==='gate'?<Flag className="h-3 w-3 text-emerald-200"/>:tile.crystal?<Gem className="h-3 w-3 text-cyan-200"/>:null}</span>)}
   </div>
   {onStart&&!locked&&<button type="button" onClick={onStart} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 font-black text-slate-950"><Play className="h-5 w-5 fill-current"/> Next Mission</button>}
 </div>
}
