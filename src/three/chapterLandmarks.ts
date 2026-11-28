import * as THREE from 'three';
import type {BiomeId} from '../game/biomes';
export function createChapterLandmarks(trackDisposable:<T extends {dispose:()=>void}>(item:T)=>T){
 const groups:Partial<Record<BiomeId,THREE.Group>>={};
 const animation:{mesh:THREE.Mesh;base:number;phase:number}[]=[];
 const box=trackDisposable(new THREE.BoxGeometry(1,1,1)),column=trackDisposable(new THREE.CylinderGeometry(.7,1,1,8)),crystal=trackDisposable(new THREE.OctahedronGeometry(1)),ring=trackDisposable(new THREE.TorusGeometry(1,.13,6,24));
 const mat=(color:number,emissive=0)=>trackDisposable(new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:emissive?.25:0,roughness:.75}));
 const metal=mat(0x64748b),orange=mat(0xfbbf24),sand=mat(0xc89b60),rock=mat(0x96653d),green=mat(0x318d79),gem=mat(0x7cead3,0x159d8c),purple=mat(0x655580),pink=mat(0xf472b6,0xbe185d),solar=mat(0x245b85),white=mat(0xf1f5e9),float=mat(0xf6aa53);
 const add=(group:THREE.Group,geo:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;
 };
 for(const id of ['skyport_canyon','solar_dunes','aurora_glade','reactor_citadel','energy_valley','ocean_discovery'] as const){
  const g=new THREE.Group();g.name='chapter-landmarks-'+id;g.visible=false;groups[id]=g;
  for(const side of [-1,1]){
   const x=side*8.5,z=side<0?-12:-28;
   if(id==='skyport_canyon'){
    for(const dx of [-1.5,1.5])add(g,box,metal,x+dx,-.3,z,.55,6,.65);
    add(g,box,orange,x,2.8,z,4,.45,.75);
    add(g,box,metal,x+side*1.2,-2.6,z-2,2.2,1.2,2.4);
   }else if(id==='solar_dunes'){
    for(const dx of [-1.6,1.6])add(g,column,rock,x+dx,-.2,z,1,5.6,1);
    add(g,ring,sand,x,2.5,z,2.1,1.9,.95);
    add(g,column,sand,x+side*3,-2,z-4,2.5,2.8,3);
   }else if(id==='aurora_glade'){
    for(let i=0;i<5;i++){const cx=x+(i%3-1)*1.25,cz=z-Math.floor(i/3)*2;
     add(g,column,green,cx,-2.5,cz,1.15,1.4,1.15);
     const m=add(g,crystal,gem,cx,-.25+i*.18,cz,.7,1.8+i*.2,.7);m.rotation.z=(i-2)*.13;animation.push({mesh:m,base:m.position.y,phase:i+side});}
   }else if(id==='reactor_citadel'){
    add(g,column,purple,x,-.6,z,2.1,6,2.1);
    for(let i=0;i<3;i++){const hoop=add(g,ring,pink,x,-2+i*1.8,z,1.9,1.9,.7);hoop.rotation.x=Math.PI/2;}
    const m=add(g,crystal,pink,x,3.1,z,.85,1.2,.85);animation.push({mesh:m,base:m.position.y,phase:side});
   }else if(id==='energy_valley'){
    add(g,column,white,x,-1.4,z,.65,3.9,.65);
    const m=add(g,box,solar,x,.8,z,4.5,.18,3.1);m.rotation.z=side*.18;
    for(let i=0;i<3;i++)add(g,box,white,x+(i-1)*1.4,.92+(i-1)*side*.25,z,.055,.09,2.9);
   }else{
    add(g,column,float,x,-2.8,z,2.3,1,2.3);add(g,box,white,x,-1.3,z,3.1,2.2,2.6);add(g,box,solar,x,-.05,z,3.4,.28,2.9);add(g,box,gem,x,-1.15,z+1.32,1.8,.9,.08);
    const m=add(g,crystal,orange,x,1,z,.38,.55,.38);animation.push({mesh:m,base:m.position.y,phase:side});
   }
  }
 }
 return {groups,show(id:BiomeId){for(const [key,g] of Object.entries(groups))g.visible=key===id;},animate(time:number,reduced:boolean){for(const a of animation){if(a.mesh.parent?.visible)a.mesh.position.y=a.base+(reduced?0:Math.sin(time*.9+a.phase)*.12);}}};
}
