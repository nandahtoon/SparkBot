import React,{useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {createRescueSpatialScene} from '../three/rescueSpatialScene';
import type {RescueMap,RescueState} from '../game/rescueAdventure';

// Only the standalone experiment mounts this renderer. Render on state/size change, never a background loop.
export function RescueSpatialBoard({map,state,fallback}:{map:RescueMap;state:RescueState;fallback:ReactNode}){
 const host=useRef<HTMLDivElement>(null),current=useRef(state),draw=useRef<(()=>void)|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{current.current=state;draw.current?.();},[state]);
 useEffect(()=>{
  if(failed||!host.current)return;
  const el=host.current;let renderer:THREE.WebGLRenderer|null=null,world:ReturnType<typeof createRescueSpatialScene>|null=null,observer:ResizeObserver|null=null,active=true;
  const onLost=(event:Event)=>{event.preventDefault();active=false;setFailed(true);};
  const render=()=>{if(!active||!renderer||!world)return;try{world.update(current.current);renderer.render(world.scene,world.camera);}catch{active=false;setFailed(true);}};
  const resize=()=>{if(!active||!renderer||!world)return;const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);world.resize(w,h);render();};
  const cleanup=()=>{active=false;draw.current=null;observer?.disconnect();window.removeEventListener('resize',resize);if(renderer){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}world?.dispose();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.setAttribute('aria-hidden','true');
   renderer.domElement.addEventListener('webglcontextlost',onLost);el.appendChild(renderer.domElement);world=createRescueSpatialScene(map);
   draw.current=render;window.addEventListener('resize',resize);if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(el);}resize();
  }catch{cleanup();setFailed(true);return;}
  return cleanup;
 },[map,failed]);
 if(failed)return <><p role="status" className="text-center text-sm text-sky-200">3D unavailable — keep playing on the map.</p>{fallback}</>;
 return <div ref={host} data-testid="rescue-spatial-board" className="mx-auto h-[clamp(230px,45vh,360px)] w-full max-w-[520px] overflow-hidden rounded-xl border border-cyan-700" role="img" aria-label={`3D rescue board, robot row ${state.row+1}, column ${state.col+1}, ${state.repaired.length} repaired`}/>;
}
