import React,{useEffect,useState} from 'react';
import {RescueAdventure} from './RescueAdventure';
import {RescueSpatialBoard} from './RescueSpatialBoard';
import {dismissSplashScreen} from '../game/splashScreen';
export default function RescueExperiment(){
 const [muted,setMuted]=useState(false),[spatial,setSpatial]=useState(true);
 useEffect(()=>{dismissSplashScreen({minVisibleMs:0});},[]);
 return <main className="h-full overflow-y-auto bg-slate-950 text-white overscroll-contain"><div className="mx-auto max-w-xl space-y-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
 <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-black">SparkBot · Rescue Lab</h1><a href="/" className="rounded-xl border border-slate-500 px-3 py-3">Exit lab</a></div>
 <p className="text-xs text-sky-200">Experimental preview · practice only</p>
 <div className="flex gap-2"><button type="button" aria-pressed={spatial} onClick={()=>setSpatial(v=>!v)} className="min-h-12 flex-1 rounded-xl border border-cyan-500 bg-slate-800 font-bold">{spatial?'Use 2D map':'Try 3D map'}</button><button type="button" aria-pressed={muted} onClick={()=>setMuted(v=>!v)} className="min-h-12 rounded-xl border border-slate-500 px-4">{muted?'Unmute':'Mute'}</button></div>
 <RescueAdventure experimentalControls muted={muted} renderBoard={spatial?(map,state,fallback,mode)=><RescueSpatialBoard map={map} state={state} mode={mode} fallback={fallback}/>:undefined}/>
 </div></main>;
}
