import React,{useEffect,useState} from 'react';
import { Bot,Flag,SkipForward } from 'lucide-react';
import type { MissionTravel } from '../game/adventureMap';
export function MissionTravelOverlay({travel,onFinish}:{travel:MissionTravel;onFinish:()=>void}){
 const [moving,setMoving]=useState(false);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raf=requestAnimationFrame(()=>setMoving(true));
  const timer=window.setTimeout(onFinish,reduced?450:1800);
  return ()=>{cancelAnimationFrame(raf);window.clearTimeout(timer);};
 },[onFinish,travel]);
 return <div data-testid="mission-travel-overlay" className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/95 p-4" role="status" aria-label={`Traveling to mission ${travel.toId}: ${travel.toName}`}>
  <div className="w-full max-w-md rounded-3xl border border-sky-500 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-5 text-white shadow-2xl">
   <div className="text-center text-xs font-black text-sky-200">Next Adventure</div>
   <div className="mt-1 text-center text-xl font-black">{travel.toName}</div>
   <div className="my-5 flex items-center justify-between text-xs font-bold text-sky-100"><span>{travel.fromId} · {travel.fromWorld}</span><span className="text-right">{travel.toId} · {travel.toWorld}</span></div>
   <div className="relative mx-3 h-20">
    <div className="absolute left-0 right-0 top-10 h-2 rounded-full bg-slate-700"/>
    <div className="absolute left-0 top-10 h-2 rounded-full bg-sky-400 motion-safe:transition-[width] motion-safe:duration-[1300ms]" style={{width:moving?'100%':'0%'}}/>
    <div className="absolute top-2 left-0 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-slate-900 shadow-lg motion-safe:transition-[left] motion-safe:duration-[1300ms]" style={{left:moving?'100%':'0%',borderColor:travel.accent}}><Bot className="h-8 w-8 text-cyan-200"/></div>
    <Flag className="absolute -right-3 top-10 h-6 w-6 text-emerald-300" aria-hidden="true"/>
   </div>
   <button type="button" onClick={onFinish} aria-label="Skip travel animation" className="mx-auto flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 bg-slate-800 px-5 font-bold"><SkipForward className="h-5 w-5"/> Skip</button>
  </div>
 </div>;
}
