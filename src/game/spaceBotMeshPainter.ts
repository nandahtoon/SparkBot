import {projectSpaceBotMesh,type SpaceModelPose} from './spaceBotMesh';
import {spaceBotTransformPose} from './spaceBotForms';
import {SPACE_ABILITIES} from './spaceBotEvolution';
// A round owns one bounded sprite cache. No WebGL context or additional animation loop.
export function createSpaceMeshPainter(){
 const cache=new Map<string,HTMLCanvasElement>();let unavailable=false;
 return (ctx:CanvasRenderingContext2D,p:SpaceModelPose,guardReady:boolean,flash:number,fusionShield:boolean):boolean=>{
  if(unavailable)return false;
  const progress=Math.round(p.progress*8)/8,fusion=Math.round(p.fusion*5)/5;
  const key=[p.character,p.from,p.to,progress,p.evolved,fusion,p.boost].join(':');
  let sprite=cache.get(key);
  try{
   if(!sprite){
    sprite=document.createElement('canvas');sprite.width=192;sprite.height=192;
    const g=sprite.getContext('2d');if(!g){unavailable=true;return false;}
    g.translate(96,96);g.scale(2.4,2.4);
    for(const f of projectSpaceBotMesh({...p,progress,fusion})){g.beginPath();f.vertices.forEach((v,i)=>i===0?g.moveTo(v[0],v[1]):g.lineTo(v[0],v[1]));g.closePath();g.fillStyle=f.color;g.fill();g.strokeStyle=f.color;g.lineWidth=.18;g.stroke();}
    if(cache.size>=32){const first=cache.keys().next().value;if(first!==undefined)cache.delete(first);}
    cache.set(key,sprite);
   }
  }catch{unavailable=true;cache.clear();return false;}
  ctx.save();
  const pose=spaceBotTransformPose(p.from,p.to,p.progress);
  const ring=(r:number,color:string,opacity:number)=>{ctx.save();ctx.globalAlpha*=opacity;ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();};
  if(p.evolved){ring(29,SPACE_ABILITIES[p.to].color,.65);if(flash>0)ring(30+(1-flash/.45)*9,SPACE_ABILITIES[p.to].color,Math.min(1,flash/.45));}
  if(pose.guard>0)ring(30,'#6ee7b7',pose.guard*(guardReady?.9:.3));
  if(p.fusion>0){ring(34,'#fde68a',p.fusion);if(fusionShield)ring(37,'#a7f3d0',p.fusion);}
  ctx.drawImage(sprite,-40,-40,80,80);ctx.restore();return true;
 };
}
