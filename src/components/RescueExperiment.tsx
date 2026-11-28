import React,{useEffect,useState} from 'react';
import {ArrowLeft,Settings2,Volume2,VolumeX,Map,Box} from 'lucide-react';
import {RescueAdventure} from './RescueAdventure';
import {RescueSpatialBoard} from './RescueSpatialBoard';
import {dismissSplashScreen} from '../game/splashScreen';
export default function RescueExperiment(){
 const [muted,setMuted]=useState(false),[spatial,setSpatial]=useState(true),[settings,setSettings]=useState(false);
 useEffect(()=>{dismissSplashScreen({minVisibleMs:0});},[]);
 return <main className="h-full overflow-y-auto bg-slate-950 text-white overscroll-contain"><div className="mx-auto max-w-xl space-y-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
 <header className="flex items-center justify-between gap-2"><a href="/" aria-label="Back to SparkBot" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-500"><ArrowLeft aria-hidden="true"/></a><h1 className="flex-1 text-center text-lg font-black">Rescue Adventure</h1><button type="button" aria-label="Adventure settings" aria-expanded={settings} onClick={()=>setSettings(v=>!v)} className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-500"><Settings2 aria-hidden="true"/></button></header>
 {settings&&<div className="flex gap-2" data-testid="rescue-settings"><button type="button" aria-pressed={spatial} onClick={()=>setSpatial(v=>!v)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-500 bg-slate-800 font-bold">{spatial?<Map aria-hidden="true"/>:<Box aria-hidden="true"/>}{spatial?'Use 2D map':'Try 3D map'}</button><button type="button" aria-pressed={muted} onClick={()=>setMuted(v=>!v)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-500 px-3">{muted?<VolumeX aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}{muted?'Unmute':'Mute'}</button></div>}
 <RescueAdventure experimentalControls muted={muted} renderBoard={spatial?(map,state,fallback,mode)=><RescueSpatialBoard map={map} state={state} mode={mode} fallback={fallback}/>:undefined}/>
 </div></main>;
}
