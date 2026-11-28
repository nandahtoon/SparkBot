// Original procedural score, generated locally. No recordings, downloads or external services.
export type Soundscape = 'workshop'|'canyon'|'dunes'|'glade'|'citadel'|'energy'|'ocean'|'arcade';
const motifs:Record<Soundscape,readonly number[]>={workshop:[60,64,67,69,67,64,62,67],canyon:[60,62,64,67,64,62,67,69],dunes:[62,65,69,72,69,65,67,62],glade:[65,69,72,74,72,69,67,69],citadel:[57,60,64,67,64,60,62,64],energy:[60,67,69,72,69,67,64,62],ocean:[60,64,67,74,72,67,64,67],arcade:[60,67,72,67,64,69,72,69]};
export function soundscapeFor(biome:string,mode:string,gameRoom:boolean):Soundscape{
 if(gameRoom)return 'arcade';
 if(mode==='TITLE'||mode==='BUILD_3D'||mode==='PAINT_BOOTH')return 'workshop';
 switch(biome){case 'solar_dunes':return 'dunes';case 'aurora_glade':return 'glade';case 'reactor_citadel':return 'citadel';case 'energy_valley':return 'energy';case 'ocean_discovery':return 'ocean';default:return 'canyon';}
}

// All eight scores are original short compositions. Each bar contains melody,
// a soft harmonic accompaniment, and a light percussion pulse.
const profiles:Record<Soundscape,{beat:number;brightness:number;rhythm:number;ambience:number}>={
 workshop:{beat:.64,brightness:.24,rhythm:.045,ambience:.18},
 canyon:{beat:.67,brightness:.20,rhythm:.055,ambience:.24},
 dunes:{beat:.83,brightness:.13,rhythm:.025,ambience:.31},
 glade:{beat:.89,brightness:.16,rhythm:.012,ambience:.21},
 citadel:{beat:.71,brightness:.11,rhythm:.06,ambience:.22},
 energy:{beat:.60,brightness:.20,rhythm:.045,ambience:.19},
 ocean:{beat:.90,brightness:.12,rhythm:.012,ambience:.40},
 arcade:{beat:.48,brightness:.25,rhythm:.075,ambience:.10}
};
const TAU=2*Math.PI;
const hz=(note:number)=>440*2**((note-69)/12);
export function renderSoundscape(scene:Soundscape,kind:'music'|'ambience',rate=22050):Float32Array{
 const p=profiles[scene],beat=p.beat,duration=beat*32,count=Math.round(rate*duration),data=new Float32Array(count);
 const motif=motifs[scene];let seed=719,smooth=0,slow=0;
 // Precompute note and chord frequencies outside the sample loop.
 const melody=Array.from({length:32},(_,i)=>hz(motif[(i+(i>=16?2:0))%8]+(i===30?12:0)));
 const roots=[motif[0]-12,motif[3]-12,motif[1]-12,motif[4]-12].map(hz);
 for(let i=0;i<count;i++){
  const t=i/rate,progress=t/duration,fade=Math.max(0,Math.min(1,t/.12,(duration-t)/.12));
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const n=seed/4294967296*2-1;
  smooth+=(n-smooth)*.055;slow+=(smooth-slow)*.015;
  const note=Math.min(31,Math.floor(t/beat)),phase=t-note*beat,bar=Math.floor(note/8),barPhase=t-bar*beat*8;
  if(kind==='music'){
   const f=melody[note],root=roots[bar],attack=Math.min(1,phase/.035);
   const env=attack*Math.exp(-phase*4.2);
   const lead=(Math.sin(TAU*f*phase)+p.brightness*Math.sin(TAU*f*2*phase))*.28*env;
   const accompaniment=(Math.sin(TAU*root*t)+.45*Math.sin(TAU*root*1.5*t)+.22*Math.sin(TAU*root*2*t))*.065*Math.min(1,barPhase/.20,(beat*8-barPhase)/.20);
   const pulse=note%2===0?Math.sin(TAU*root*.5*phase)*Math.exp(-phase*9)*attack*.09:0;
   const percussion=(n-smooth)*Math.exp(-phase*22)*Math.min(1,phase/.01)*p.rhythm;
   data[i]=fade*(lead+accompaniment+pulse+percussion);
  }else{
   const swell=.38+.62*(.5+.5*Math.sin(TAU*progress*4));
   let texture=0;
   switch(scene){
    case 'ocean':texture=(smooth*.48+slow*1.8)*swell;break;
    case 'dunes':texture=(smooth*.42+slow*1.4)*(.55+.45*Math.sin(TAU*progress*3)**2);break;
    case 'glade':{const phase=t%3.4;texture=slow*.45+Math.sin(TAU*(850+160*Math.sin(TAU*phase*.7))*phase)*Math.exp(-(((phase-.25)/.11)**2))*.06;break;}
    case 'citadel':texture=slow*.35+Math.sin(TAU*55*t)*.065*(.6+.4*Math.sin(TAU*.35*t));break;
    case 'energy':texture=slow*.45+Math.sin(TAU*110*t)*.025*(.5+.5*Math.sin(TAU*.6*t));break;
    case 'workshop':texture=slow*.4+(n-smooth)*Math.exp(-(t%4.8)*23)*.045;break;
    case 'arcade':texture=slow*.2;break;
    default:texture=slow*.9+smooth*.18;
   }
   data[i]=fade*texture*p.ambience;
  }
 }
 return data;
}
