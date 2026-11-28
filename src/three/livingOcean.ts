import * as THREE from 'three';
import type {OceanZone} from '../game/oceanPresentation';
import {TRACK_START_Z,TRACK_TILE_SPACING} from '../game/trackSurface';
import type {JourneyPreview} from '../game/journey';

type Own=<T extends {dispose:()=>void}>(item:T)=>T;
export function oceanTrackStyle(zone:OceanZone|undefined){
 switch(zone){
 case 'reef':return {deck:0x5aa69e,trim:0x86efac,deckWidth:3.5};
 case 'signal':return {deck:0x3b7696,trim:0xffd166,deckWidth:3.2};
 case 'beacon':return {deck:0x577c95,trim:0xc4b5fd,deckWidth:3.2};
 default:return {deck:0xc9a575,trim:0x2dd4bf,deckWidth:3.45};
 }
}
export function createLivingOcean(own:Own){
 const root=new THREE.Group();root.name='living-ocean';root.visible=false;
 const box=own(new THREE.BoxGeometry(1,1,1)),ball=own(new THREE.SphereGeometry(1,10,7)),cone=own(new THREE.ConeGeometry(1,1,7)),cylinder=own(new THREE.CylinderGeometry(1,1,1,12));
 const mat=(c:number)=>own(new THREE.MeshStandardMaterial({color:c,roughness:.8}));
 const white=mat(0xfff4df),blue=mat(0x176e8e),teal=mat(0x40c9bc),coral=mat(0xff927d),gold=mat(0xfbd36b),green=mat(0x359f87);
 const add=(g:THREE.Group,geo:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
  const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
 };
 const zones:Record<OceanZone,THREE.Group>={sampling:new THREE.Group(),reef:new THREE.Group(),signal:new THREE.Group(),beacon:new THREE.Group()};
 for(const [name,g] of Object.entries(zones)){g.name='ocean-zone-'+name;root.add(g);g.visible=false;}
 const vessel=(g:THREE.Group,x:number,z:number,m:THREE.Material)=>{
  const boat=new THREE.Group();boat.position.set(x,-3.05,z);g.add(boat);
  add(boat,ball,m,0,0,0,.8,.45,1.85);
  add(boat,box,white,0,.45,.15,1.12,.58,1.2);
  add(boat,box,blue,0,.49,.77,.82,.3,.06);
  add(boat,box,gold,0,.79,.15,1.23,.12,1.32);
  return boat;
 };
 const boats=[vessel(zones.sampling,-6.9,-11,teal),vessel(zones.signal,7,-19,gold)];
 for(const side of [-1,1]){
  const x=side*7.5,z=side<0?-12:-23;
  const reef=zones.reef;
  for(let i=0;i<4;i++){
   const b=add(reef,ball,i%2?teal:coral,x+(i%2)*1.15,-3.15,z-i*.8,1.1,.55,.9);
   for(let j=0;j<2;j++){const branch=add(reef,cone,i%2?green:coral,b.position.x+(j-.5)*.55,-2.65,z-i*.8,.22,1.35,.22);branch.rotation.z=(j-.5)*.65;}
  }
  const station=zones.sampling;
  add(station,box,blue,x,-2.9,z,3.5,.48,3.1);
  add(station,box,white,x,-1.8,z,2.6,1.65,2);
  add(station,box,teal,x,-.87,z,3,.24,2.4);
  add(station,box,blue,x,-1.65,z+1.03,1.9,.75,.08);
  const signal=zones.signal;
  add(signal,cylinder,white,x,-1.35,z,.38,3.6,.38);
  add(signal,box,blue,x,.55,z,1.6,.4,.65);
  add(signal,ball,gold,x,.88,z,.35,.35,.35);
 }
 const lighthouse=zones.beacon;
 add(lighthouse,cylinder,blue,8,-2.85,-24,2.4,.65,2.4);
 add(lighthouse,cylinder,white,8,-.1,-24,.85,5,.85);
 for(const y of [-1.4,.65])add(lighthouse,cylinder,coral,8,y,-24,.88,.5,.88);
 add(lighthouse,cylinder,gold,8,2.6,-24,1.1,.7,1.1);
 add(lighthouse,cone,blue,8,3.3,-24,1.2,.85,1.2);
 // Tiny stylized fish just above the waterline, away from the route.
 const fish=new THREE.Group();fish.name='ocean-fish-school';root.add(fish);
 const fishMeshes:THREE.Group[]=[];
 for(let i=0;i<5;i++){
  const f=new THREE.Group();fish.add(f);
  add(f,ball,i%2?gold:teal,0,0,0,.43,.16,.19);
  const tail=add(f,cone,i%2?gold:teal,-.49,0,0,.23,.4,.18);tail.rotation.z=-Math.PI/2;
  fishMeshes.push(f);
 }
 let active:OceanZone|undefined;
 return {root,zones,show(zone:OceanZone|undefined){active=zone;root.visible=Boolean(zone);for(const [k,g] of Object.entries(zones))g.visible=k===zone;fish.visible=zone==='reef'||zone==='sampling';},animate(t:number,reduced:boolean,eco:boolean){
  if(!active)return;
  const time=reduced?0:t;
  fish.visible=!eco&&(active==='reef'||active==='sampling');
  for(let i=0;i<fishMeshes.length;i++){const f=fishMeshes[i],a=time*.25+i*.45;f.position.set(-6.5+Math.sin(a)*1.4,-3.24,-17+Math.cos(a)*3.0+i*.4);f.rotation.y=Math.atan2(Math.sin(a)*3,Math.cos(a)*1.4);}
  for(const [i,b] of boats.entries()){b.position.y=-3.05+Math.sin(time*1.3+i)*.13;b.rotation.z=Math.sin(time*.9+i)*.045;}
 }};
}
// A real-scale scenic next route, entirely outside current playable tile coordinates.
// It is not added to the simulator; gaps remain open and collectible markers are decorative.
export function createOceanDestinationPreview(next:JourneyPreview,currentLength:number){
 const group=new THREE.Group();group.name='ocean-next-destination';
 group.position.set(6.6,-1.35,TRACK_START_Z-(currentLength-1)*TRACK_TILE_SPACING-4.6);
 const deck=new THREE.BoxGeometry(2.3,.25,2.25),float=new THREE.BoxGeometry(2.55,.6,2.4),gem=new THREE.OctahedronGeometry(.21),box=new THREE.BoxGeometry(1,1,1);
 const deckMat=new THREE.MeshStandardMaterial({color:0x80c8c7,roughness:.8}),floatMat=new THREE.MeshStandardMaterial({color:0xe9bb75,roughness:.9}),white=new THREE.MeshStandardMaterial({color:0xf3f4e5,roughness:.8}),roof=new THREE.MeshStandardMaterial({color:0x287890,roughness:.8}),mark=new THREE.MeshBasicMaterial({color:0x67e8f9});
 const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);};
 next.track.forEach((tile,i)=>{if(tile.type==='gap')return;const z=-i*2.4;add(float,floatMat,0,-.45,z);add(deck,deckMat,0,0,z);if(tile.crystal)add(gem,mark,0,.56,z);});
 const z=-(next.track.length-1)*2.4-1.8;
 add(box,white,0,1.05,z,3.3,2,1.9);add(box,roof,0,2.15,z,3.6,.3,2.2);add(box,mark,0,1.3,z+1,1.8,.62,.06);
 // Near entrance flag makes the route visible as a separate upcoming location.
 add(box,white,1.4,1.05,0,.12,2.1,.12);add(box,mark,1.9,1.92,0,.9,.48,.1);
 return group;
}
