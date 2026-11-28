import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BOT_CHARACTERS,type BotCharacterId} from '../game/customization';
import {rescueSpatialSnapshot,RESCUE_TILE_SIZE} from '../game/rescueSpatialPresentation';
import {type RescueMotion,sampleRescueMotion} from '../game/rescueSpatialMotion';
import {startRescue,type RescueMap,type RescueState} from '../game/rescueAdventure';

// Scene data only: no WebGL renderer, clock, input or game rules.
export function createRescueSpatialScene(map:RescueMap,character:BotCharacterId='sparkbot'){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b536f);
 const resources=new Set<{dispose:()=>void}>();let disposed=false;
 const own=<T extends {dispose:()=>void}>(r:T)=>{resources.add(r);return r;};
 const box=own(new THREE.BoxGeometry(1,1,1)),ball=own(new THREE.SphereGeometry(1,16,10)),cylinder=own(new THREE.CylinderGeometry(1,1,1,20)),cone=own(new THREE.ConeGeometry(1,1,4));
 const mat=(color:number,emissive=0)=>own(new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.65,roughness:.72}));
 const water=mat(map.id==='reef'?0x126d88:0x177ca2),sand=mat(map.id==='reef'?0xaad1ae:0xe2bd84),wood=mat(map.id==='reef'?0x557b70:0x856548),green=mat(0x1da77d),white=mat(0xf8fafc),dark=mat(0x23354b),blue=mat(0x38bdf8),eye=mat(0x7ceaff,0x0891b2),off=mat(0x8d99a6),on=mat(0xffd15a,0xffa500);
 const mesh=(g:THREE.Object3D,geo:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const v=new THREE.Mesh(geo,m);v.position.set(x,y,z);v.scale.set(sx,sy,sz);g.add(v);return v;};
 const foam=mat(0x70c9d3),coral=mat(0xf2a279),leaf=mat(0x559d88);
 const ringGeo=own(new THREE.TorusGeometry(.64,.035,8,28));
 const tiles=new Map<string,THREE.Group>(),beacons=new Map<string,{lamp:THREE.Mesh;flag:THREE.Group}>();
 for(const tile of rescueSpatialSnapshot(map,startRescue(map)).tiles){
  const g=new THREE.Group();g.name=tile.id;g.position.set(tile.x,0,tile.z);scene.add(g);tiles.set(tile.id,g);
  if(tile.kind==='water'){mesh(g,box,water,0,-.2,0,2,.13,2);mesh(g,box,foam,-.36,-.115,.23,.58,.025,.055);mesh(g,box,foam,.43,-.115,-.4,.36,.025,.045);if(map.id==='reef'){mesh(g,ball,coral,-.52,-.02,-.48,.17,.12,.14);mesh(g,ball,leaf,-.25,-.04,-.56,.12,.09,.12);}continue;}
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
 const robot=new THREE.Group();robot.name='rescue-robot';robot.userData.character=character;scene.add(robot);
 const def=BOT_CHARACTERS[character],bodyMat=mat(parseInt(def.defaultBodyHex.slice(1),16)),headMat=mat(parseInt(def.defaultHeadHex.slice(1),16)),accentMat=mat(parseInt(def.accentCss.slice(1),16));
 const rounded=own(new RoundedBoxGeometry(1,1,1,3,.18)),pink=mat(0xff8eaa),gold=mat(0xf5b740),red=mat(0xdc4941);
 mesh(robot,rounded,bodyMat,0,.57,0,.65,.57,.48);mesh(robot,rounded,headMat,0,1.06,0,.96,.64,.67);
 mesh(robot,rounded,dark,0,1.08,.34,.79,.43,.10);
 const feet:THREE.Mesh[]=[],arms:THREE.Mesh[]=[],eyes:THREE.Mesh[]=[];
 for(const x of [-.19,.19]){eyes.push(mesh(robot,ball,eye,x,1.13,.405,.085,.105,.035));mesh(robot,ball,pink,x*1.45,.99,.402,.06,.024,.02);feet.push(mesh(robot,rounded,dark,x,.18,0,.24,.25,.42));}
 for(const x of [-.46,.46]){arms.push(mesh(robot,rounded,bodyMat,x,.57,0,.17,.42,.23));mesh(robot,ball,accentMat,x,1.08,0,.12,.15,.15);}
 const mouth=mesh(robot,ball,pink,0,1.015,.406,.07,.027,.02);
 mesh(robot,ball,accentMat,0,.59,.25,.15,.15,.035);
 const accessory=new THREE.Group();accessory.name='companion-'+character;robot.add(accessory);
 if(character==='sprout'){mesh(accessory,rounded,red,0,.79,0,.67,.12,.53);for(const s of [-1,1]){const l=mesh(accessory,ball,green,s*.10,1.49,0,.15,.055,.06);l.rotation.z=s*.65;mesh(accessory,ball,gold,s*.20,1.37,.24,.15,.10,.09);}}
 else if(character==='nova'){mouth.material=gold;mouth.scale.set(.09,.065,.045);for(const s of [-1,1]){const wing=mesh(accessory,ball,headMat,s*.48,.70,-.20,.20,.36,.08);wing.rotation.z=-s*.48;mesh(accessory,cone,gold,s*.32,1.46,0,.10,.20,.10);}}
 else if(character==='robobuddy'){mesh(accessory,cylinder,gold,0,1.40,0,.56,.065,.43);mesh(accessory,cylinder,accentMat,0,1.49,0,.33,.20,.30);mesh(accessory,ball,eye,0,1.49,.30,.085,.085,.065);}
 else {mesh(accessory,cylinder,headMat,0,1.43,0,.04,.22,.04);mesh(accessory,character==='learnbot'?cone:ball,accentMat,0,1.59,0,.11,.14,.11);}
 const effect=mesh(scene,ringGeo,on,0,.17,0,1,1,1);effect.rotation.x=-Math.PI/2;effect.visible=false;
 const warning=mesh(scene,ringGeo,coral,0,.18,0,1,1,1);warning.rotation.x=-Math.PI/2;warning.visible=false;
 scene.add(new THREE.HemisphereLight(0xe0f2fe,0x78613c,2.2));
 const sun=new THREE.DirectionalLight(0xffffff,2.0);sun.position.set(3,9,5);scene.add(sun);
 const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,60);camera.position.set(0,12,10);camera.lookAt(0,.1,0);
 // Fit the projected board envelope, rather than a square world-space radius.
 const halfX=Math.max(...map.cells.map(r=>r.length))*RESCUE_TILE_SIZE/2+.1,halfZ=map.cells.length*RESCUE_TILE_SIZE/2+.1;
 const fitPoints:THREE.Vector3[]=[];
 for(const x of [-halfX,halfX])for(const z of [-halfZ,halfZ])for(const y of [-.4,2.05])fitPoints.push(new THREE.Vector3(x,y,z));
 function resize(width:number,height:number){
  const aspect=Math.max(.1,width/Math.max(1,height));camera.updateMatrixWorld(true);
  const p=fitPoints.map(v=>v.clone().applyMatrix4(camera.matrixWorldInverse));
  const minX=Math.min(...p.map(v=>v.x)),maxX=Math.max(...p.map(v=>v.x)),minY=Math.min(...p.map(v=>v.y)),maxY=Math.max(...p.map(v=>v.y));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,halfH=Math.max((maxY-minY)/2+.32,((maxX-minX)/2+.32)/aspect);
  camera.left=cx-halfH*aspect;camera.right=cx+halfH*aspect;camera.top=cy+halfH;camera.bottom=cy-halfH;camera.updateProjectionMatrix();
 }
 function clearPose(){robot.position.y=.09;arms.forEach(a=>a.rotation.x=0);feet.forEach(f=>f.position.z=0);effect.visible=false;warning.visible=false;}
 function update(state:RescueState){if(disposed)return;const happy=state.feedback==='repair'||state.won;const unsure=['blocked','wrong-place','already'].includes(state.feedback);eyes.forEach((e,i)=>{e.scale.y=happy?.060:unsure&&i===0?.055:.105;});mouth.scale.y=character==='nova'?.065:happy?.055:.027;const snap=rescueSpatialSnapshot(map,state);clearPose();robot.position.set(snap.robot.x,.09,snap.robot.z);for(const tile of snap.tiles){const beacon=beacons.get(tile.id);if(beacon){beacon.lamp.material=tile.repaired?on:off;beacon.flag.visible=tile.repaired;}}}
 function animate(motion:RescueMotion,elapsed:number){if(disposed)return false;const p=sampleRescueMotion(motion,elapsed);clearPose();robot.position.set(p.x,.09+p.bob,p.z);if(motion.heading!==null)robot.rotation.y=motion.heading;
  if(!p.done){arms[0].rotation.x=p.swing-p.repair*.9;arms[1].rotation.x=-p.swing-p.celebrate*.9;feet[0].position.z=p.swing*.16;feet[1].position.z=-p.swing*.16;
   if(p.repair||p.celebrate){effect.position.set(p.x,.17,p.z);effect.scale.setScalar(1+.34*Math.max(p.repair,p.celebrate));effect.visible=true;}
   if(p.blocked){warning.position.set(p.x,.18,p.z);warning.scale.setScalar(.9+.15*p.blocked);warning.visible=true;}
  }return !p.done;
 }
 update(startRescue(map));
 return {scene,camera,robot,tiles,beacons,resize,update,animate,dispose(){if(disposed)return;disposed=true;resources.forEach(r=>r.dispose());resources.clear();scene.clear();}};
}
