import React from 'react';
import {ArrowRight, Clock, X} from 'lucide-react';
import type {DynamicHazardDef} from '../game/types';
import {getSignalPatterns} from '../game/signalPatterns';
export function SignalPatternGuide({hazards,tick}:{hazards:readonly DynamicHazardDef[];tick:number}){
 const patterns=getSignalPatterns(hazards,tick);
 if(!patterns.length)return null;
 return <div data-testid="tidal-signal-guide" className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Gate signals for upcoming command beats">
  <Clock className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true"/>
  {patterns.map(p=><div key={p.id} className="flex min-h-8 items-center gap-1 rounded-lg border border-slate-500 bg-slate-950 px-1.5 py-1" aria-label={`Gate on tile ${p.tile}, repeats every ${p.period} commands. Next beat ${p.nextActive?'blocked':'open'}`}>
   <span className="text-xs font-black text-cyan-100">{p.tile}</span>
   {p.beats.map((beat,i)=><span key={beat.tick} title={`Command beat ${beat.tick}: ${beat.blocked?'stop':'open'}`} className={'flex h-6 w-6 items-center justify-center rounded border '+(beat.blocked?'border-rose-400 bg-rose-950 text-rose-200':'border-emerald-400 bg-emerald-950 text-emerald-200')+(i===0?' ring-1 ring-white':'')} aria-label={beat.blocked?'Stop':'Open'}>{beat.blocked?<X className="h-4 w-4" aria-hidden="true"/>:<ArrowRight className="h-4 w-4" aria-hidden="true"/>}</span>)}
  </div>)}
 </div>;
}
