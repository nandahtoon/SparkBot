import React,{useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
import {planRescueMotion} from '../game/rescueSpatialMotion';
import {createRescueFrameChain} from '../game/rescueFrameChain';
import type {BotCharacterId} from '../game/customization';
import type {RescueMap,RescueState} from '../game/rescueAdventure';

// Exclusive standalone renderer. One bounded frame chain during a command; zero scheduled frames at idle.
export function RescueSpatialBoard({map,state,mode,fallback,character='sparkbot'}:{character?:BotCharacterId;map:RescueMap;state:RescueState;mode:'explore'|'code';fallback:ReactNode}){
 const host=useRef<HTMLDivElement>(null),current=useRef({map,state,mode}),sync=useRef<(()=>void)|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{current.current={map,state,mode};sync.current?.();},[map,state,mode]);
 useEffect(()=>{
  if(failed||!host.current)return;
  const el=host.current;let renderer:THREE.WebGLRenderer|null=null,world:ReturnType<typeof createRescueSpatialScene>|null=null,observer:ResizeObserver|null=null,active=true;
  let previous=current.current;
  const frames=createRescueFrameChain(cb=>window.requestAnimationFrame(cb),id=>window.cancelAnimationFrame(id));
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stop=()=>frames.stop();
  const fail=()=>{active=false;stop();setFailed(true);};
  const onLost=(event:Event)=>{event.preventDefault();fail();};
  const render=()=>{if(!active||!renderer||!world||document.hidden)return;try{renderer.render(world.scene,world.camera);}catch{fail();}};

  const snap=()=>{stop();if(!active||!world||current.current.map!==map)return;try{world.update(current.current.state);previous=current.current;render();}catch{fail();}};
  const syncState=()=>{if(!active||!world)return;const next=current.current;if(next.map!==map)return;stop();
   try{
    const planned=planRescueMotion(map,previous.state,next.state,previous.map===next.map&&previous.mode===next.mode,preference.matches||document.hidden);previous=next;world.update(next.state);
    if(planned.duration&&!document.hidden){const started=performance.now();world.animate(planned,0);render();if(active)frames.start(now=>{
     if(!active||!world||document.hidden)return false;
     try{const more=world.animate(planned,now-started);render();return active&&more;}catch{fail();return false;}
    });}else render();
   }catch{fail();}
  };
  const resize=()=>{if(!active||!renderer||!world)return;const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;try{renderer.setSize(w,h,false);world.resize(w,h);render();}catch{fail();}};
  const onVisibility=()=>{snap();};
  const onPreference=()=>{snap();};
  const cleanup=()=>{active=false;frames.dispose();sync.current=null;observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);if(typeof preference.removeEventListener==='function')preference.removeEventListener('change',onPreference);else preference.removeListener?.(onPreference);if(renderer){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}world?.dispose();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.setAttribute('aria-hidden','true');
   renderer.domElement.addEventListener('webglcontextlost',onLost);el.appendChild(renderer.domElement);world=createRescueSpatialScene(map,character);world.update(current.current.state);
   sync.current=syncState;window.addEventListener('resize',resize);document.addEventListener('visibilitychange',onVisibility);if(typeof preference.addEventListener==='function')preference.addEventListener('change',onPreference);else preference.addListener?.(onPreference);if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(el);}resize();
  }catch{cleanup();setFailed(true);return;}
  return cleanup;
 },[map,failed,character]);
 if(failed)return <><p role="status" className="text-center text-sm text-sky-200">3D unavailable — keep playing on the map.</p>{fallback}</>;
 return <div ref={host} data-testid="rescue-spatial-board" className="mx-auto h-[clamp(210px,40dvh,340px)] w-full max-w-[520px] landscape:h-[clamp(160px,48dvh,300px)] overflow-hidden rounded-xl border border-cyan-700" role="img" aria-label={`3D rescue board, robot row ${state.row+1}, column ${state.col+1}, ${state.repaired.length} repaired`}/>;
}
