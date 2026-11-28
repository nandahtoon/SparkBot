// Original procedural score, generated locally. No recordings, downloads or external services.
export type Soundscape = 'workshop'|'canyon'|'dunes'|'glade'|'citadel'|'energy'|'ocean'|'arcade';
const motifs:Record<Soundscape,readonly number[]>={workshop:[60,64,67,69,67,64,62,67],canyon:[60,62,64,67,64,62,67,69],dunes:[62,65,69,72,69,65,67,62],glade:[65,69,72,74,72,69,67,69],citadel:[57,60,64,67,64,60,62,64],energy:[60,67,69,72,69,67,64,62],ocean:[60,64,67,74,72,67,64,67],arcade:[60,67,72,67,64,69,72,69]};
export function soundscapeFor(biome:string,mode:string,gameRoom:boolean):Soundscape{
 if(gameRoom)return 'arcade';
 if(mode==='TITLE'||mode==='BUILD_3D'||mode==='PAINT_BOOTH')return 'workshop';
 switch(biome){case 'solar_dunes':return 'dunes';case 'aurora_glade':return 'glade';case 'reactor_citadel':return 'citadel';case 'energy_valley':return 'energy';case 'ocean_discovery':return 'ocean';default:return 'canyon';}
}
export function renderSoundscape(scene:Soundscape,kind:'music'|'ambience',rate=22050):Float32Array{
 const beat=scene==='arcade'?.5:.8, duration=beat*16, count=Math.round(rate*duration), data=new Float32Array(count);
 const motif=motifs[scene]; let noise=719, smooth=0;
 for(let i=0;i<count;i++){
  const t=i/rate;const progress=t/duration;const fade=Math.min(1,t/.08,(duration-t)/.08);
  if(kind==='music'){
   const note=Math.min(15,Math.floor(t/beat)), phase=t-note*beat;
   const hz=440*Math.pow(2,(motif[note%8]-69)/12);
   const envelope=Math.min(1,phase/.025)*Math.exp(-phase*5);
   const bass=440*Math.pow(2,(motif[0]-81)/12);
   data[i]=fade*(Math.sin(2*Math.PI*hz*phase)*.42+Math.sin(4*Math.PI*hz*phase)*.06)*envelope+fade*Math.sin(2*Math.PI*bass*t)*.085;
  }else{
   noise=(Math.imul(noise,1664525)+1013904223)>>>0;
   const n=noise/4294967296*2-1;smooth+=(n-smooth)*(scene==='ocean'?.025:.012);
   const swell=.3+.7*(.5+.5*Math.sin(progress*2*Math.PI*2));
   const texture=scene==='ocean'?swell:scene==='glade'?.35:scene==='arcade'?.12:.24;
   data[i]=fade*smooth*texture;
  }
 }
 return data;
}
