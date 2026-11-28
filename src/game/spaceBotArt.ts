import {BOT_CHARACTERS,type BotCharacterId} from './customization';
import {spaceBotTransformPose,type SpaceBotForm} from './spaceBotForms';

// Render the same recognizable robot head, body, arms and feet in each form. No aircraft silhouette.
export function drawSpaceBot(ctx:CanvasRenderingContext2D,character:BotCharacterId,from:SpaceBotForm,to:SpaceBotForm,progress:number,guardReady:boolean){
 const p=spaceBotTransformPose(from,to,progress),def=BOT_CHARACTERS[character],accent=def.accentCss;
 const part=(x:number,y:number,w:number,h:number,r:number,color:string,stroke='#263b55')=>{ctx.fillStyle=color;ctx.strokeStyle=stroke;ctx.lineWidth=1.1;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();};
 if(p.guard>.01){ctx.save();ctx.globalAlpha*=p.guard*(guardReady?.9:.3);ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const side of [-1,1]){
  const x=side*p.footX;part(x-5,11,10,11,4,'#253c56');part(x-4,21,8,5,2,accent);
  ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.ellipse(x,28,3,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(side*p.armX,p.armY);ctx.rotate(-side*p.armAngle);
  part(-5,-8,10,19,4,def.defaultBodyHex);part(-4,-11,8,7,3,accent);ctx.restore();
 }
 part(-12,-4,24,23,8,def.defaultBodyHex);part(-5,3,10,8,3,accent);
 part(-16,-24,32,24,9,def.defaultHeadHex);part(-12,-20,24,15,6,'#0b223a');
 ctx.fillStyle='#67e8f9';for(const x of [-5,5]){ctx.beginPath();ctx.ellipse(x,-13,3.2,4,0,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#fda4af';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-10,3,.15,Math.PI-.15);ctx.stroke();
 if(character==='sprout'){part(-12,-1,24,4,2,'#dc4941');ctx.fillStyle='#86d771';ctx.beginPath();ctx.ellipse(-4,-27,5,2,-.55,0,Math.PI*2);ctx.ellipse(4,-27,5,2,.55,0,Math.PI*2);ctx.fill();}
 else if(character==='nova'){ctx.fillStyle='#fbbf24';for(const x of [-10,10]){ctx.beginPath();ctx.moveTo(x-4,-23);ctx.lineTo(x,-30);ctx.lineTo(x+4,-23);ctx.closePath();ctx.fill();}}
 else if(character==='robobuddy'){part(-19,-27,38,4,2,'#e5bd79');part(-10,-32,20,6,3,'#60a5fa');}
 else {ctx.strokeStyle='#dbeafe';ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(0,-29);ctx.stroke();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(0,-31,3,0,Math.PI*2);ctx.fill();}
}
