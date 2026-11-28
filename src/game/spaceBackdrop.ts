// Cached procedural backgrounds; no image downloads, extra RAF or WebGL context.
const palettes=[
 ['#07152b','#183b67','#63a7de'],['#211a28','#57333b','#de916c'],['#161c3f','#4b387a','#b8a4fa'],['#10302c','#245c59','#73ddc5'],
 ['#251f2e','#654c46','#c6a586'],['#112941','#25597a','#a4ddfb'],['#1c153c','#5d397c','#d6a8fa'],['#0a302d','#215c58','#79e6ba']
];
export function drawExpeditionBackdrop(ctx:CanvasRenderingContext2D,w:number,h:number,stage:number){
 const [dark,mid,light]=palettes[Math.max(0,Math.min(7,stage-1))];
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,mid);bg.addColorStop(.55,dark);bg.addColorStop(1,'#050c1c');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.38;
 for(let i=0;i<45;i++){ctx.fillStyle=i%4===0?light:'#c5d6ed';ctx.beginPath();ctx.arc((i*137+stage*67)%w,(i*83+31)%h,i%6===0?1.6:.75,0,Math.PI*2);ctx.fill();}
 ctx.restore();
 const r=Math.min(w,h)*(.17+stage%3*.035),x=w*(stage%2?.82:.19),y=h*.24;
 ctx.save();ctx.globalAlpha=.38;
 if(stage===6||stage===8){
  ctx.translate(w*.5,h*.26);const size=Math.min(w,h)*.16;
  ctx.strokeStyle=light;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,size*1.65,size*.50,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=mid;ctx.fillRect(-size*.45,-size*.25,size*.9,size*.5);
  for(const side of [-1,1]){ctx.fillStyle='#456d99';ctx.fillRect(side*size*.95-size*.40,-size*.22,size*.8,size*.44);ctx.strokeStyle=light;ctx.strokeRect(side*size*.95-size*.40,-size*.22,size*.8,size*.44);for(let j=1;j<4;j++){const a=side*size*.95-size*.40+size*.2*j;ctx.beginPath();ctx.moveTo(a,-size*.22);ctx.lineTo(a,size*.22);ctx.stroke();}}
  ctx.fillStyle=light;ctx.beginPath();ctx.arc(0,0,size*.12,0,Math.PI*2);ctx.fill();
 }else{
  if(stage===3||stage===7){ctx.strokeStyle=light;ctx.lineWidth=r*.12;ctx.beginPath();ctx.ellipse(x,y,r*1.55,r*.42,-.36,0,Math.PI*2);ctx.stroke();}
  const planet=ctx.createRadialGradient(x-r*.36,y-r*.4,r*.06,x,y,r);planet.addColorStop(0,light);planet.addColorStop(.7,mid);planet.addColorStop(1,dark);
  ctx.fillStyle=planet;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.save();ctx.clip();
  ctx.strokeStyle=light;ctx.globalAlpha=.15;ctx.lineWidth=r*.12;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(x,y+i*r*.28,r*.95,r*.18,-.25,0,Math.PI*2);ctx.stroke();}ctx.restore();
 }
 ctx.restore();
}
