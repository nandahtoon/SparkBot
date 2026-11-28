import * as THREE from 'three';
import {rescueSpatialSnapshot,RESCUE_TILE_SIZE} from '../game/rescueSpatialPresentation';
import {startRescue,type RescueMap,type RescueState} from '../game/rescueAdventure';

// Scene data only: no WebGL renderer, clock, input or game rules.
export function createRescueSpatialScene(map:RescueMap){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b536f);
 const resources=new Set<{dispose:()=>void}>();let disposed=false;
 const own=<T extends {dispose:()=>void}>(r:T)=>{resources.add(r);return r;};
 const box=own(new THREE.BoxGeometry(1,1,1)),ball=own(new THREE.SphereGeometry(1,16,10)),cylinder=own(new THREE.CylinderGeometry(1,1,1,20)),cone=own(new THREE.ConeGeometry(1,1,4));
 const mat=(color:number,emissive=0)=>own(new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.65,roughness:.72}));
 const water=mat(0x177ca2),sand=mat(0xe2bd84),wood=mat(0x856548),green=mat(0x1da77d),white=mat(0xf8fafc),dark=mat(0x23354b),blue=mat(0x38bdf8),eye=mat(0x7ceaff,0x0891b2),off=mat(0x8d99a6),on=mat(0xffd15a,0xffa500);
 const mesh=(g:THREE.Object3D,geo:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const v=new THREE.Mesh(geo,m);v.position.set(x,y,z);v.scale.set(sx,sy,sz);g.add(v);return v;};
 const tiles=new Map<string,THREE.Group>(),beacons=new Map<string,{lamp:THREE.Mesh;flag:THREE.Group}>();
 for(const tile of rescueSpatialSnapshot(map,startRescue(map)).tiles){
  const g=new THREE.Group();g.name=tile.id;g.position.set(tile.x,0,tile.z);scene.add(g);tiles.set(tile.id,g);
  if(tile.kind==='water'){mesh(g,box,water,0,-.2,0,2,.13,2);continue;}
  mesh(g,box,wood,0,-.18,0,1.97,.36,1.97);
  mesh(g,box,tile.kind==='dock'?green:sand,0,.02,0,1.94,.12,1.94);
  for(const z of [-.64,.64])mesh(g,box,wood,0,.09,z,1.78,.025,.045);
  if(tile.kind==='dock'){
   mesh(g,box,white,-.55,.38,-.55,.55,.6,.55);
   const roof=mesh(g,cone,green,-.55,.82,-.55,.5,.38,.5);roof.rotation.y=Math.PI/4;
   mesh(g,box,dark,-.55,.36,-.255,.16,.3,.03);
  }
  if(tile.kind==='beacon'){
   mesh(g,cylinder,dark,-.53,.22,-.53,.31,.3,.31);
   mesh(g,cylinder,white,-.53,.65,-.53,.12,.8,.12);
   const lamp=mesh(g,ball,off,-.53,1.16,-.53,.29,.29,.29);
   const flag=new THREE.Group();flag.position.set(-.53,1.63,-.53);g.add(flag);
   const short=mesh(flag,box,green,-.1,-.04,0,.24,.09,.10);short.rotation.z=-Math.PI/4;
   const long=mesh(flag,box,green,.12,.06,0,.42,.09,.10);long.rotation.z=Math.PI/4;flag.visible=false;
   beacons.set(tile.id,{lamp,flag});
  }
 }
 const robot=new THREE.Group();robot.name='rescue-robot';scene.add(robot);
 mesh(robot,box,blue,0,.57,0,.65,.57,.48);mesh(robot,box,white,0,1.06,0,.86,.54,.64);
 mesh(robot,box,dark,0,1.08,.33,.7,.31,.045);
 for(const x of [-.19,.19]){mesh(robot,ball,eye,x,1.08,.36,.064,.064,.035);mesh(robot,box,dark,x,.18,0,.24,.25,.42);}
 for(const x of [-.43,.43])mesh(robot,box,blue,x,.57,0,.17,.42,.23);
 mesh(robot,cylinder,white,0,1.42,0,.04,.23,.04);mesh(robot,ball,eye,0,1.57,0,.09,.09,.09);
 scene.add(new THREE.HemisphereLight(0xe0f2fe,0x78613c,2.2));
 const sun=new THREE.DirectionalLight(0xffffff,2.0);sun.position.set(3,9,5);scene.add(sun);
 const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,60);camera.position.set(0,12,10);camera.lookAt(0,.1,0);
 function resize(width:number,height:number){const aspect=Math.max(.1,width/Math.max(1,height));const span=Math.max(map.cells.length,Math.max(...map.cells.map(r=>r.length)))*RESCUE_TILE_SIZE/2+1.1;const halfH=Math.max(span,span/aspect);camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();}
 function update(state:RescueState){if(disposed)return;const snap=rescueSpatialSnapshot(map,state);robot.position.set(snap.robot.x,.09,snap.robot.z);for(const tile of snap.tiles){const beacon=beacons.get(tile.id);if(beacon){beacon.lamp.material=tile.repaired?on:off;beacon.flag.visible=tile.repaired;}}}
 update(startRescue(map));
 return {scene,camera,robot,tiles,beacons,resize,update,dispose(){if(disposed)return;disposed=true;resources.forEach(r=>r.dispose());resources.clear();scene.clear();}};
}
