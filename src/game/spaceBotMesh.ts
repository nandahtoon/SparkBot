import {BOT_CHARACTERS,type BotCharacterId} from './customization';
import {spaceBotTransformPose,type SpaceBotForm} from './spaceBotForms';
import {SPACE_ABILITIES} from './spaceBotEvolution';
type V=[number,number,number];
type Face={vertices:V[];color:string;part:string};
export type SpaceModelPose={character:BotCharacterId;from:SpaceBotForm;to:SpaceBotForm;progress:number;evolved:boolean;fusion:number;boost:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function buildSpaceBotMesh(p:SpaceModelPose):Face[]{
 const d=BOT_CHARACTERS[p.character],pose=spaceBotTransformPose(p.from,p.to,p.progress),f=clamp(p.fusion),faces:Face[]=[];
 // Eight-corner chamfered rings give every part real depth and beveled surfaces.
 function part(name:string,c:V,size:V,color:string,angle=0,pivot?:V){
  const [w,h,z]=size.map(n=>n/2),b=Math.min(w,h,z)*.35;
  const rings:V[][]=[];
  for(const [depth,inset] of [[-z,b],[-z+b,0],[z-b,0],[z,b]]){
   const a=w-inset,q=h-inset,k=Math.min(a,q)*.32;
   const outline=[[-a+k,-q],[a-k,-q],[a,-q+k],[a,q-k],[a-k,q],[-a+k,q],[-a,q-k],[-a,-q+k]];
   rings.push(outline.map(([x,y])=>{const v:V=[x+c[0],y+c[1],depth+c[2]];if(pivot){const dx=v[0]-pivot[0],dy=v[1]-pivot[1];v[0]=pivot[0]+dx*Math.cos(angle)-dy*Math.sin(angle);v[1]=pivot[1]+dx*Math.sin(angle)+dy*Math.cos(angle);}return v;}));
  }
  const add=(vertices:V[])=>faces.push({vertices,color,part:name});
  add([...rings[0]].reverse());add(rings[3]);
  for(let j=0;j<3;j++)for(let i=0;i<8;i++)add([rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]]);
 }
 const dark='#23374f',visor='#10243c',cyan='#67e8f9',gold='#e8bb57',accent=d.accentCss;
 part('torso',[0,7,0],[24,24,14],d.defaultBodyHex);
 part('core',[0,7,8],[11,11,4],accent);part('core-light',[0,7,10.5],[5,5,1.5],cyan);
 for(const side of [-1,1]){
  const x=side*(pose.armX+f*4),y=pose.armY-f*2,angle=-side*(pose.armAngle+f*.16),pivot:V=[x,y-6,0];
  part('shoulder',[x,y-6,0],[10,10,11],dark);
  part('arm',[x,y+3,0],[9,18,11],d.defaultBodyHex,angle,pivot);
  part('hand',[x,y+11,1],[9,8,10],accent,angle,pivot);
  if(p.evolved)part('module',[x,y+3,6],[10,7,3],SPACE_ABILITIES[p.to].color,angle,pivot);
  if(f>0){part('fusion-shoulder',[x,y-8-f*2,0],[10+f*7,8,13],gold);part('fusion-forearm',[x,y+5,5],[8+f*5,12,5], '#b6d1e6',angle,pivot);}
  const foot=side*pose.footX;part('leg',[foot,20,0],[9,12,12],dark);part('boot',[foot,25,3],[10,7,14],accent);part('thruster',[foot,29+(p.boost?2:0),0],[5,p.boost?10:5,6],cyan);
 }
 if(f>0){part('fusion-chest',[0,7,8],[16+f*6,17,4],gold);part('fusion-core',[0,7,11],[9,9,3],cyan);}
 part('neck',[0,-3,0],[11,7,11],dark);
 part('head',[0,-14,0],[32,24,19],d.defaultHeadHex);
 part('visor',[0,-14,10],[26,16,3],visor);
 for(const side of [-1,1]){part('eye',[side*6,-15,12],[6,8,2],cyan);part('eye-highlight',[side*6-1,-17,13.2],[2,2,1],'#ffffff');part('ear',[side*16,-13,0],[5,10,9],accent);}
 part('smile',[0,-8,12],[6,2,1.6],'#fda4af');part('smile',[-4,-9,12],[2,2,1.6],'#fda4af');part('smile',[4,-9,12],[2,2,1.6],'#fda4af');
 if(p.character==='sprout'){part('scarf',[0,-2,3],[25,5,15],'#dc4941');part('leaf',[-4,-28,0],[11,4,4],'#86d771',-.45,[-4,-28,0]);part('leaf',[4,-28,0],[11,4,4],'#86d771',.45,[4,-28,0]);for(const s of [-1,1])part('goggles',[s*7,-25,6],[10,5,5],gold);}
 else if(p.character==='nova'){for(const s of [-1,1])part('owl-ear',[s*11,-27,0],[7,8,7],gold);part('beak',[0,-9,13],[5,5,4],gold);}
 else if(p.character==='robobuddy'){part('hat-brim',[0,-27,0],[36,4,22],gold);part('hat',[0,-31,0],[20,7,17],accent);part('lamp',[0,-31,9],[6,5,3],cyan);}
 else {part('antenna',[0,-28,0],[3,7,3],dark);part('antenna-tip',[0,-32,0],[6,5,6],accent);if(p.character==='learnbot')part('badge',[0,-26,6],[9,3,4],gold);}
 return faces;
}
export function projectSpaceBotMesh(p:SpaceModelPose){
 const yaw=.23,pitch=.13,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const project=([x,y,z]:V):V=>{const u=x*cy+z*sy,depth=z*cy-x*sy;return [u,y*cp-depth*sp,y*sp+depth*cp];};
 return buildSpaceBotMesh(p).flatMap(face=>{
  const vertices=face.vertices.map(project),a=vertices[0],b=vertices[1],c=vertices[2],u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0],len=Math.hypot(nx,ny,nz);
  if(nz<=0||len===0)return [];
  const shade=.60+.40*Math.max(0,(-.35*nx-.5*ny+.79*nz)/len);
  const rgb=[1,3,5].map(i=>Math.round(parseInt(face.color.slice(i,i+2),16)*shade));
  return [{vertices,depth:vertices.reduce((n,v)=>n+v[2],0)/vertices.length,color:'rgb('+rgb.join(',')+')',part:face.part}];
 }).sort((a,b)=>a.depth-b.depth);
}
