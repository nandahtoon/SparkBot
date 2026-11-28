import React,{useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
import {planRescueMotion,type RescueMotion} from '../game/rescueSpatialMotion';
import type {RescueMap,RescueState} from '../game/rescueAdventure';

// Exclusive standalone renderer. One bounded frame chain during a command; zero scheduled frames at idle.
export function RescueSpatialBoard({map,state,mode,fallback}:{map:RescueMap;state:RescueState;mode:'explore'|'code';fallback:ReactNode}){
 const host=useRef<HTMLDivElement>(null),current=useRef({map,state,mode}),sync=useRef<(()=>void)|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{current.current={map,state,mode};sync.current?.();},[map,state,mode]);
 useEffect(()=>{
  if(failed||!host.current)return;
  const el=host.current;let renderer:THREE.WebGLRenderer|null=null,world:ReturnType<typeof createRescueSpatialScene>|null=null,observer:ResizeObserver|null=null,active=true;
  let frame:number|null=null,motion:RescueMotion|null=null,started=0,previous=current.current;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stop=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;motion=null;};
  const fail=()=>{active=false;stop();setFailed(true);};
  const onLost=(event:Event)=>{event.preventDefault();fail();};
  const render=()=>{if(!active||!renderer||!world||document.hidden)return;try{renderer.render(world.scene,world.camera);}catch{fail();}};
  const tick=(now:number)=>{frame=null;if(!active||!world||!motion||document.hidden)return;const more=world.animate(motion,now-started);render();if(active&&more)frame=requestAnimationFrame(tick);else motion=null;};
  const snap=()=>{stop();if(world){world.update(current.current.state);previous=current.current;render();}};
  const syncState=()=>{if(!active||!world)return;const next=current.current;if(next.map!==map)return;stop();const planned=planRescueMotion(map,previous.state,next.state,previous.map===next.map&&previous.mode===next.mode,preference.matches||document.hidden);previous=next;world.update(next.state);
   if(planned.duration&&!document.hidden){motion=planned;started=performance.now();world.animate(planned,0);render();if(active)frame=requestAnimationFrame(tick);}else render();
  };
  const resize=()=>{if(!active||!renderer||!world)return;const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);world.resize(w,h);render();};
  const onVisibility=()=>{snap();};
  const onPreference=()=>{snap();};
  const cleanup=()=>{active=false;stop();sync.current=null;observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);preference.removeEventListener('change',onPreference);if(renderer){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}world?.dispose();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.setAttribute('aria-hidden','true');
   renderer.domElement.addEventListener('webglcontextlost',onLost);el.appendChild(renderer.domElement);world=createRescueSpatialScene(map);world.update(current.current.state);
   sync.current=syncState;window.addEventListener('resize',resize);document.addEventListener('visibilitychange',onVisibility);preference.addEventListener('change',onPreference);if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(el);}resize();
  }catch{cleanup();setFailed(true);return;}
  return cleanup;
 },[map,failed]);
 if(failed)return <><p role="status" className="text-center text-sm text-sky-200">3D unavailable — keep playing on the map.</p>{fallback}</>;
 return <div ref={host} data-testid="rescue-spatial-board" className="mx-auto h-[clamp(230px,45vh,360px)] w-full max-w-[520px] overflow-hidden rounded-xl border border-cyan-700" role="img" aria-label={`3D rescue board, robot row ${state.row+1}, column ${state.col+1}, ${state.repaired.length} repaired`}/>;
}
