import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { Gamepad2,Play } from 'lucide-react';
import { BOT_CHARACTERS,type BotCharacterId } from '../game/engine';
import type { ArcadeGameId } from '../game/arcadeGames';
import { CLUBHOUSE_LAYOUT,createClubhouseScene } from '../three/clubhouseScene';
type Props={onSelectGame:(id:ArcadeGameId)=>void;activeCharacter:BotCharacterId;planetAvailable:boolean;onUnavailable:()=>void};
type Point={x:number;y:number};
export function Clubhouse3D({onSelectGame,activeCharacter,planetAvailable,onUnavailable}:Props){
 const host=useRef<HTMLDivElement>(null);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 const [points,setPoints]=useState<Partial<Record<ArcadeGameId,Point>>>({});
 const accent=BOT_CHARACTERS[activeCharacter].accentCss;
 useEffect(()=>{
  if(failed||!host.current)return;
  const el=host.current;
  let renderer:THREE.WebGLRenderer|undefined;
  let room:ReturnType<typeof createClubhouseScene>|undefined;
  let observer:ResizeObserver|undefined;
  let raf=0,stopped=false,last=-Infinity;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const resize=()=>{
   if(!renderer||!room)return;
   const width=el.clientWidth,height=el.clientHeight;if(!width||!height)return;
   const aspect=width/height,halfWidth=Math.max(6.6,4.1*aspect),halfHeight=halfWidth/aspect;
   room.camera.left=-halfWidth;room.camera.right=halfWidth;room.camera.top=halfHeight;room.camera.bottom=-halfHeight;room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);
   renderer.setSize(width,height,false);
   const next:Partial<Record<ArcadeGameId,Point>>={};
   room.anchors.forEach((v,id)=>{const p=v.clone().project(room!.camera);next[id]={x:(p.x+1)*50,y:(1-p.y)*50};});
   setPoints(next);renderer.render(room.scene,room.camera);
  };
  const lost=(e:Event)=>{e.preventDefault();setFailed(true);onUnavailable();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
   renderer.domElement.className='absolute inset-0 h-full w-full';
   renderer.domElement.setAttribute('aria-hidden','true');
   renderer.domElement.addEventListener('webglcontextlost',lost);
   el.prepend(renderer.domElement);
   room=createClubhouseScene(accent);
   resize();observer=new ResizeObserver(resize);observer.observe(el);
   setReady(true);
   const tick=(ms:number)=>{
    if(stopped)return;
    if(!document.hidden&&!reduced.matches&&ms-last>=1000/24){room?.animate(ms/1000,false);if(room)renderer?.render(room.scene,room.camera);last=ms;}
    raf=requestAnimationFrame(tick);
   };
   const resetMotion=()=>{if(room&&renderer){room.animate(0,reduced.matches);renderer.render(room.scene,room.camera);}};
   reduced.addEventListener?.('change',resetMotion);raf=requestAnimationFrame(tick);
   return ()=>{stopped=true;cancelAnimationFrame(raf);observer?.disconnect();reduced.removeEventListener?.('change',resetMotion);renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.remove();room?.dispose();renderer?.dispose();renderer?.forceContextLoss();};
  }catch{
   stopped=true;cancelAnimationFrame(raf);observer?.disconnect();renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.remove();room?.dispose();renderer?.dispose();renderer?.forceContextLoss();setFailed(true);onUnavailable();
  }
 },[failed,accent,onUnavailable]);
 return <section className="overflow-hidden rounded-2xl border border-cyan-700 bg-slate-900" data-testid="clubhouse-3d">
   <div className="flex items-center justify-between gap-2 px-3 py-2">
    <div className="flex items-center gap-2 text-sm font-black text-white"><Gamepad2 className="h-5 w-5 text-cyan-300"/> Arcade Clubhouse</div>
    <span className="text-xs text-sky-200">Pick a cabinet</span>
   </div>
   {!failed?<div ref={host} className="relative isolate h-[clamp(230px,60vw,360px)] overflow-hidden bg-slate-950" aria-label="Interactive arcade room">
    {ready&&CLUBHOUSE_LAYOUT.map(game=>{
     const point=points[game.id];if(!point)return null;
     const unavailable=game.id==='planet_adventure'&&!planetAvailable;
     return <button key={game.id} type="button" disabled={unavailable} data-clubhouse-game={game.id} aria-label={'Play '+game.title} onClick={()=>onSelectGame(game.id)}
      className="absolute z-10 flex min-h-11 w-[17%] max-w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border border-white/60 bg-slate-950/80 px-1 py-1 text-center text-[11px] font-black leading-tight text-white shadow-lg focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
      style={{left:point.x+'%',top:point.y+'%',borderColor:game.accentHex}}>
      <Play className="h-4 w-4 fill-current" style={{color:game.accentHex}} aria-hidden="true"/>{game.title}
     </button>;
    })}
    {!ready&&<div className="absolute inset-0 grid place-items-center text-sm text-sky-200">Opening clubhouse…</div>}
   </div>:<p role="status" className="px-3 pb-3 text-xs text-slate-300">3D room unavailable.</p>}
  </section>;
}
