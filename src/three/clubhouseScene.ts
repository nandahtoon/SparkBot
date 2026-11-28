import * as THREE from 'three';
import { ALL_GAME_ROOM_GAMES,type ArcadeGameId } from '../game/arcadeGames';
export const CLUBHOUSE_LAYOUT=ALL_GAME_ROOM_GAMES.map((game,i)=>({
 ...game,x:i<4?(i-1.5)*2.55:(i-5)*2.55,z:i<4?-2.25:1.7
}));
export function createClubhouseScene(accent:string){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x11182f);
 const resources=new Set<{dispose:()=>void}>();
 const own=<T extends {dispose:()=>void}>(v:T)=>{resources.add(v);return v;};
 const cube=own(new THREE.BoxGeometry(1,1,1)),orb=own(new THREE.SphereGeometry(1,12,8)),cylinder=own(new THREE.CylinderGeometry(1,1,1,16)),torus=own(new THREE.TorusGeometry(1,.09,6,24));
 const material=(color:THREE.ColorRepresentation,emissive:THREE.ColorRepresentation=0)=>own(new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.32,roughness:.65}));
 const dark=material(0x1e293b),trim=material(0xcbd5e1),floor=material(0x303b62),wall=material(0x222b4b),glass=material(0x10233a),white=material(0xf1f5f9),eye=material(0x67e8f9,0x0891b2);
 const add=(g:THREE.Object3D,geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
 };
 add(scene,cube,floor,0,-.22,0,12,.4,9);
 add(scene,cube,wall,0,1.25,-4.4,12,2.8,.25);
 for(const x of [-5.9,5.9])add(scene,cube,wall,x,.55,0,.22,1.5,8.8);
 for(let i=0;i<8;i++)add(scene,cube,material(i%2?0x283b64:0x32476b),0,.005,-3.5+i,11.5,.025,.045);
 const cabinets=new Map<ArcadeGameId,THREE.Group>();
 const anchors=new Map<ArcadeGameId,THREE.Vector3>();
 const lights:THREE.Mesh[]=[];
 for(const item of CLUBHOUSE_LAYOUT){
  const g=new THREE.Group();g.name=item.id;g.position.set(item.x,0,item.z);scene.add(g);cabinets.set(item.id,g);
  const color=material(item.accentHex,item.accentHex);
  add(g,cube,dark,0,.86,0,1.65,1.72,1.05);
  add(g,cube,color,0,1.72,0,1.78,.28,1.12);
  add(g,cube,color,0,.42,.54,1.67,.12,.11);
  add(g,cube,glass,0,1.23,.55,1.36,.76,.12);
  // Each screen uses a different recognizable shape, no text texture required.
  const screenIcon=item.id==='connect_nodes'?torus:item.id==='robot_run'?cylinder:item.id==='planet_adventure'?orb:cube;
  const icon=add(g,screenIcon,color,0,1.24,.65,.34,.29,.08);
  if(item.id==='bug_detective')icon.rotation.z=Math.PI/4;
  if(item.id==='logic_gate_lab'){add(g,orb,color,-.39,1.25,.65,.12,.12,.06);add(g,orb,color,.39,1.25,.65,.12,.12,.06);}
  if(item.id==='break_wall')for(const dx of [-.34,.34])add(g,cube,color,dx,1.43,.65,.23,.1,.05);
  if(item.id==='space_shooter')icon.rotation.z=Math.PI/4;
  add(g,cube,trim,0,.72,.69,1.66,.12,.6);
  add(g,cylinder,dark,-.43,.85,.69,.08,.22,.08);
  add(g,orb,color,-.43,.99,.69,.12,.12,.12);
  add(g,cylinder,color,.35,.83,.69,.16,.08,.16);
  lights.push(add(g,orb,color,0,1.94,0,.13,.13,.13));
  anchors.set(item.id,new THREE.Vector3(item.x,1.05,item.z+.52));
 }
 const bot=new THREE.Group();bot.position.set(4.45,.0,1.8);scene.add(bot);
 const body=material(accent);
 add(bot,cube,body,0,.65,0,.74,.72,.55);add(bot,cube,white,0,1.28,0,.91,.63,.65);
 add(bot,cube,glass,0,1.32,.34,.72,.35,.045);
 for(const x of [-.2,.2]){add(bot,orb,eye,x,1.32,.37,.075,.075,.035);add(bot,cylinder,dark,x*1.7,.23,0,.18,.27,.18);}
 add(bot,cylinder,trim,0,1.7,0,.045,.25,.045);add(bot,orb,eye,0,1.85,0,.1,.1,.1);
 const arm=add(bot,cube,body,-.52,.75,0,.19,.56,.22);add(bot,cube,body,.52,.75,0,.19,.56,.22);
 const hemi=new THREE.HemisphereLight(0xdbeafe,0x514b80,2.0);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(3,9,6);scene.add(key);
 const camera=new THREE.OrthographicCamera(-6.6,6.6,4,-4,.1,80);camera.position.set(0,10,12);camera.lookAt(0,.65,0);
 return {scene,camera,cabinets,anchors,animate(time:number,reduced:boolean){
  arm.rotation.z=reduced?-.35:-.35+Math.sin(time*2.1)*.25;
  bot.position.y=reduced?0:Math.sin(time*1.8)*.05;
  lights.forEach((m,i)=>m.scale.setScalar(.13*(reduced?1:1+.12*Math.sin(time*2+i))));
 },dispose(){resources.forEach(r=>r.dispose());scene.clear();}};
}
