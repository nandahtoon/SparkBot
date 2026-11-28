import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { dismissSplashScreen } from '../game/splashScreen';
import { FORMS, FORM_NAMES, REQUIRED, MISSIONS, MISSION_NAMES, GALACTIC_SAVE_KEY, TICK_MS, TICKS_PER_ENCOUNTER, createGalactic, startGalactic, moveGalactic, transformGalactic, stepGalactic, currentEncounter, readGalacticUnlock, nextGalacticUnlock, hazardLanes, repairTarget, repairRequirement, buyGalacticUpgrade, type GalacticForm } from '../game/galacticAdventure';

const COLORS: Record<GalacticForm,string> = { explorer:'#2dd4bf', astro:'#60a5fa', guardian:'#fbbf24' };
const goalText = {collect:'Collect the crystal',repair:'Repair the robot',block:'Block the energy wave'};
const xAt = (lane:number) => 40+lane*80;
function Robot({form,x,y,animate=false}:{form:GalacticForm;x:number;y:number;animate?:boolean}) {
  const c=COLORS[form];
  const spread=form==='guardian'?7:form==='astro'?4:0;
  const armor=form==='guardian'?1.15:1;
  const joints=(left:boolean)=>({transform:'translateX('+(left?-spread:spread)+'px) rotate('+(left?-spread:spread)+'deg)',transformOrigin:'0px -10px',transition:animate?'transform 240ms ease, fill 240ms ease':undefined});
  return <g transform={'translate('+x+' '+y+')'} className={animate?'ga-bot-move':undefined} stroke="#10233e" strokeWidth="2.2" strokeLinejoin="round">
    <g className={animate?'ga-module':undefined} opacity={form==='guardian'?1:0}><ellipse rx="35" ry="39" fill="#fbbf24" fillOpacity=".13" stroke="#fbbf24" strokeWidth="2"/><path d="M-30 -8 L-40 0 -38 20 -25 29 M30 -8 L40 0 38 20 25 29" fill="none" stroke="#fde68a" strokeWidth="4"/></g>
    <g className={animate?'ga-module':undefined} opacity={form==='astro'?1:0} fill="#60a5fa" stroke="#bfdbfe"><path d="M-19 20 L-11 44 -5 20 Z"/><path d="M5 20 L11 44 19 20 Z"/><rect x="-28" y="-4" width="9" height="24" rx="4"/><rect x="19" y="-4" width="9" height="24" rx="4"/></g>
    <path d="M-14 10 L-15 27 -4 29 -3 12 M3 12 L4 29 15 27 14 10" fill="#cbd5e1"/>
    <rect x="-19" y="25" width="17" height="7" rx="3" fill={c}/><rect x="2" y="25" width="17" height="7" rx="3" fill={c}/>
    <g style={joints(true)} className="ga-joint"><path d="M-14 -11 L-24 -7 -25 12 -15 14 -10 0Z" fill={c}/><rect x="-24" y="7" width="9" height="8" rx="2" fill="#e2e8f0"/></g>
    <g style={joints(false)} className="ga-joint"><path d="M14 -11 L24 -7 25 12 15 14 10 0Z" fill={c}/><rect x="15" y="7" width="9" height="8" rx="2" fill="#e2e8f0"/></g>
    <g style={{transform:'scale('+armor+', 1)',transition:animate?'transform 240ms ease':undefined}} className="ga-joint"><rect x="-16" y="-15" width="32" height="32" rx="9" fill="#e2e8f0"/><path d="M-14 -9 H14 M-13 11 H13" stroke="#94a3b8" fill="none"/></g>
    <path d="M-11 -6 L0 -11 11 -6 10 7 0 12 -10 7Z" fill={c}/>
    <circle cy="0" r="5" fill="#fff" stroke="none"/>
    <path d="M0 -28 V-35" stroke={c} strokeWidth="3"/><circle cy="-36" r="3.5" fill={c}/>
    <rect x="-17" y="-33" width="34" height="23" rx="8" fill={c}/>
    <rect x="-12" y="-28" width="24" height="12" rx="5" fill="#10233e" stroke="none"/>
    <rect x="-8" y="-25" width="5" height="5" rx="2" fill="#fff" stroke="none"/><rect x="3" y="-25" width="5" height="5" rx="2" fill="#fff" stroke="none"/>
  </g>;
}
export default function GalacticAdventure(){
  const [unlocked,setUnlocked]=useState(()=>{try{return readGalacticUnlock(localStorage.getItem(GALACTIC_SAVE_KEY));}catch{return 0;}});
  const [s,setS]=useState(()=>createGalactic());
  const [paused,setPaused]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const e=currentEncounter(s), goal=e?.goal, required=goal?REQUIRED[goal]:null;
  const playing=s.status==='playing';
  const hazards=hazardLanes(s.mission,s.phase);
  const drone=repairTarget(s), repairNeeded=repairRequirement(s);
  const scroll=(s.phase*TICKS_PER_ENCOUNTER+s.tick);
  useEffect(()=>{dismissSplashScreen({minVisibleMs:0});},[]);
  useEffect(()=>{if(!playing||paused)return;const id=window.setInterval(()=>setS(stepGalactic),TICK_MS);return()=>window.clearInterval(id);},[playing,paused]);
  useEffect(()=>{const hide=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  useEffect(()=>{if(s.status!=='won')return;const next=nextGalacticUnlock(unlocked,s);if(next!==unlocked)setUnlocked(next);try{localStorage.setItem(GALACTIC_SAVE_KEY,JSON.stringify({version:1,unlocked:next}));}catch{setSaveError(true);}},[s,unlocked]);
  useEffect(()=>{const key=(ev:KeyboardEvent)=>{if(!playing||paused||ev.altKey||ev.metaKey||ev.ctrlKey||ev.target instanceof HTMLInputElement||ev.target instanceof HTMLTextAreaElement)return;
    if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();setS(p=>moveGalactic(p,p.targetX+(ev.key==='ArrowLeft'?-1:1)));}
    if(['1','2','3'].includes(ev.key)){setS(p=>transformGalactic(p,FORMS[Number(ev.key)-1]));}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[playing,paused]);
  useEffect(()=>()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
  const speak=()=>{if(!('speechSynthesis' in window)||!goal||!required)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(goalText[goal]+'. Choose '+FORM_NAMES[required]+'. Move to the glowing lane.'+(goal==='repair'?' Stay aligned to send repair pulses.':''));u.rate=.85;window.speechSynthesis.speak(u);};
  const select=(m:number)=>{setPaused(false);setS(createGalactic(m));};
  const pointer=(ev:ReactPointerEvent<SVGSVGElement>)=>{if(!playing||paused)return;const matrix=ev.currentTarget.getScreenCTM();if(!matrix)return;const point=ev.currentTarget.createSVGPoint();point.x=ev.clientX;point.y=ev.clientY;const local=point.matrixTransform(matrix.inverse());setS(p=>moveGalactic(p,(local.x-40)/80));};
  const y=55+Math.min(1,s.tick/(TICKS_PER_ENCOUNTER-1))*300;
  const btn='rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-40';
  return <main className="h-[100dvh] overflow-auto bg-slate-950 p-3 text-slate-100" style={{paddingTop:'max(12px, env(safe-area-inset-top))',paddingBottom:'max(12px, env(safe-area-inset-bottom))'}}>
    <style>{'.ga-module{transition:opacity 240ms ease}.ga-bot-move{transition:transform 50ms linear}@media(prefers-reduced-motion:reduce){.ga-module,.ga-bot-move,.ga-joint{transition:none!important}}'}</style>
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-2"><a href="/" className={btn}>← Home</a><div className="text-center"><h1 className="text-xl font-black text-cyan-200">Galactic Adventure</h1><p className="text-xs text-slate-400">SparkBot • Experimental</p></div><button className={btn} onClick={()=>setPaused(p=>!p)} disabled={!playing}>{paused?'Resume':'Pause'}</button></header>
      <nav aria-label="Missions" className="my-2 flex flex-wrap gap-2">{MISSION_NAMES.map((name,i)=><button key={name} className={btn} disabled={i>unlocked} aria-pressed={s.mission===i} onClick={()=>select(i)}>{i+1}. {name}{i>unlocked?' 🔒':''}</button>)}</nav>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.6fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-2">
          <div className="flex justify-between text-sm font-bold"><span>{'🛡️ '.repeat(s.shields)} ({s.shields}/3)</span><span>{Math.min(s.phase,MISSIONS[s.mission].length)}/{MISSIONS[s.mission].length} restored</span></div>
          <div className="flex justify-between text-xs text-cyan-100"><span>💎 {s.cores} energy cores</span><span>Pulse Mk {s.pulseLevel}</span></div>
          {repairNeeded>0&&<div className="my-1 flex gap-1" role="progressbar" aria-label="Robot repair charge" aria-valuemin={0} aria-valuemax={repairNeeded} aria-valuenow={s.repairCharge}>{Array.from({length:repairNeeded},(_,i)=><span key={i} className={'h-2 flex-1 rounded '+(i<s.repairCharge?'bg-cyan-300':'bg-slate-700')}/>)}</div>}
          {s.mission===2&&<div role="progressbar" aria-label="Titan corrupted modules remaining" aria-valuemin={0} aria-valuemax={MISSIONS[2].length} aria-valuenow={MISSIONS[2].length-s.phase} className="my-1 flex gap-1">{MISSIONS[2].map((_,i)=><span key={i} className={'h-2 flex-1 rounded '+(i<s.phase?'bg-emerald-400':'bg-violet-500')}/>)}</div>}
          <svg viewBox="0 0 400 420" role="img" aria-label="Continuous horizontal robot steering with glowing objectives and telegraphed energy formations" className="mx-auto block w-full" style={{maxHeight:'min(54dvh, 520px)',touchAction:'none'}} onPointerDown={ev=>{ev.currentTarget.setPointerCapture(ev.pointerId);pointer(ev);}} onPointerMove={ev=>{if(ev.currentTarget.hasPointerCapture(ev.pointerId))pointer(ev);}}>
            <defs><linearGradient id="gaSky" x1="0%" y1="0%" x2="30%" y2="100%"><stop stopColor={['#10345b','#31205d','#412040'][s.mission]}/><stop offset="1" stopColor="#050b19"/></linearGradient><linearGradient id="gaRock" x1="0%" y1="0%" x2="100%" y2="100%"><stop stopColor={['#296a83','#654a9a','#79465e'][s.mission]}/><stop offset="1" stopColor="#111a32"/></linearGradient><radialGradient id="gaPlanet"><stop stopColor={['#60a5fa','#c4b5fd','#fda4af'][s.mission]}/><stop offset="1" stopColor="#182640"/></radialGradient></defs>
            <rect width="400" height="420" rx="16" fill="url(#gaSky)"/>
            {Array.from({length:36},(_,i)=><circle key={i} cx={(i*73)%400} cy={(i*43+scroll*2)%420} r={i%3===0?1.8:.9} fill="#c4e7ff" opacity=".5"/>)}
            <circle cx="330" cy={65+(scroll*.25)%85} r="52" fill="url(#gaPlanet)" opacity=".65"/><ellipse cx="330" cy={65+(scroll*.25)%85} rx="70" ry="13" transform={'rotate(-22 330 '+(65+(scroll*.25)%85)+')'} fill="none" stroke="#a5b4fc" opacity=".3" strokeWidth="4"/>
            {Array.from({length:8},(_,i)=>{const side=i%2===0,cy=(i*71+scroll*(s.mission===1?1.4:2.5))%500-40;return <g key={i} transform={'translate('+(side?10:390)+' '+cy+')'} opacity=".65"><path d="M-32 -22 -9 -36 19 -22 31 4 12 30 -26 24Z" fill="url(#gaRock)" stroke="#94a3b8" strokeOpacity=".3"/>{s.mission===0?<path d="M-8 8 2 -21 13 5 4 17Z" fill="#67e8f9"/>:s.mission===1?<path d="M-23 0 Q0 -18 20 0 M-20 10 Q0 -8 20 10" fill="none" stroke="#c4b5fd" strokeWidth="3"/>:<rect x="-13" y="-13" width="26" height="26" rx="4" fill="#334155" stroke="#fda4af"/>}</g>})}
            {e&&<rect x={xAt(e.lane)-36} y="0" width="72" height="400" rx="8" fill={goal==='block'?'#fbbf24':'#22d3ee'} opacity=".13" stroke={goal==='block'?'#fbbf24':'#22d3ee'} strokeWidth="2"/>}
            {hazards.map(l=><rect key={l} x={xAt(l)-33} y="15" width="66" height="370" rx="6" fill="#fb7185" opacity=".13" stroke="#fb7185" strokeDasharray="6 8"/> )}
            {[0,1,2,3,4].map(l=><path key={l} d={'M'+xAt(l)+' 5 V398'} stroke="#94a3b8" strokeOpacity=".18" strokeDasharray="3 12"/>)}
            {s.mission===2&&<g transform="translate(200 66)" stroke="#cbd5e1" strokeWidth="2"><path d="M-90 -28 H90 L112 0 90 35 H-90 L-112 0Z" fill="#475569"/><rect x="-48" y="-43" width="96" height="85" rx="22" fill="#64748b"/><rect x="-33" y="-31" width="66" height="20" rx="8" fill="#172554"/><circle cx="-17" cy="-21" r="5" fill="#fbbf24"/><circle cx="17" cy="-21" r="5" fill="#fbbf24"/><circle cy="12" r="18" fill="#a78bfa"/><circle cy="12" r="9" fill="#f0abfc"/></g>}
            {e&&<g transform={'translate('+xAt(drone?.x??e.lane)+' '+(drone?.y??y)+')'}>
              {goal==='collect'?<path d="M0 -21 L18 -2 0 21 -18 -2Z" fill="#67e8f9" stroke="#ecfeff" strokeWidth="3"/>:goal==='repair'?<><rect x="-23" y="-19" width="46" height="38" rx="10" fill={s.repairCharge>=repairNeeded?'#059669':'#7c3aed'} stroke="#ddd6fe" strokeWidth="2"/><rect x="-16" y="-12" width="32" height="12" rx="4" fill="#111827"/><circle cx="-7" cy="-6" r="3" fill="#fbbf24"/><circle cx="7" cy="-6" r="3" fill="#fbbf24"/><path d="M-7 10 H7 M0 3 V17" stroke="#f0abfc" strokeWidth="3"/><path d="M-23 -4 L-34 4 -29 15 -22 10 M23 -4 L34 4 29 15 22 10" fill="#64748b" stroke="#c4b5fd" strokeWidth="2"/><rect x="-13" y="23" width="26" height="4" rx="2" fill="#334155"/><rect x="-13" y="23" width={26*s.repairCharge/Math.max(1,repairNeeded)} height="4" rx="2" fill="#67e8f9"/></>:<><circle r="24" fill="#fbbf24" opacity=".3"/><circle r="13" fill="#fde68a" stroke="#fff" strokeWidth="2"/></>}
            </g>}
            {hazards.map((l,j)=><g key={l} fill="#fb7185" stroke="#fecdd3" strokeWidth="1">{[-15,0,15].map((dx,i)=><g key={i}><circle cx={xAt(l)+dx} cy={y-(j%2===0?Math.abs(dx):15-Math.abs(dx))*1.5} r="7" opacity=".22" stroke="none"/><circle cx={xAt(l)+dx} cy={y-(j%2===0?Math.abs(dx):15-Math.abs(dx))*1.5} r="3.5"/></g>)}</g>)}
            {s.pulses.map((p,i)=><g key={i} transform={'translate('+xAt(p.x)+' '+p.y+')'}><ellipse rx={p.power===2?9:6} ry="16" fill="#38bdf8" opacity=".22"/><rect x={p.power===2?-3:-2} y="-10" width={p.power===2?6:4} height="20" rx="3" fill="#a5f3fc"/><circle r="2.5" fill="#fff"/></g>)}
            <Robot form={s.form} x={xAt(s.x)} y={360} animate/>
          </svg>
          <div className="grid grid-cols-5 gap-1" aria-label="Move to lane">{[0,1,2,3,4].map(l=><button key={l} className={btn+' min-h-11 px-1'} aria-label={'Move to lane '+(l+1)} aria-pressed={Math.round(s.targetX)===l} disabled={!playing||paused} onClick={()=>setS(p=>moveGalactic(p,l))}>{e?.lane===l?'★':Math.round(s.targetX)===l?'●':'○'}</button>)}</div>
        </section>
        <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-3">
          <div className="flex items-center justify-between gap-2"><h2 className="font-black text-cyan-200">{goal?goalText[goal]:'Mission complete!'}</h2><button className={btn} aria-label="Speak mission hint" onClick={speak} disabled={!goal}>🔊</button></div>
          {required&&<p>Choose <strong style={{color:COLORS[required]}}>{FORM_NAMES[required]}</strong>, then move to the glowing ★ lane. {goal==='repair'?'Stay aligned to restore the moving robot with automatic repair pulses.':''}</p>}
          <div className="grid gap-2">{FORMS.map((f,i)=><button key={f} aria-pressed={s.form===f} className={btn+' min-h-12 flex items-center gap-3'} style={{borderColor:s.form===f?COLORS[f]:undefined}} disabled={!playing||paused} onClick={()=>setS(p=>transformGalactic(p,f))}><svg viewBox="-45 -45 90 95" width="42" height="42" aria-hidden="true"><Robot form={f} x={0} y={0}/></svg><span>{i+1}. {FORM_NAMES[f]} {s.form===f?'✓':''}</span></button>)}</div>
          <div className="grid grid-cols-2 gap-2" aria-label="Mission upgrades">
            <button className={btn+' min-h-12 text-sm'} disabled={!playing||paused||s.cores<2||s.shields===3} onClick={()=>setS(p=>buyGalacticUpgrade(p,'shield'))}>🛡️ Restore shield · 2 💎</button>
            <button className={btn+' min-h-12 text-sm'} disabled={!playing||paused||s.cores<2||s.pulseLevel===2} onClick={()=>setS(p=>buyGalacticUpgrade(p,'pulse'))}>⚡ {s.pulseLevel===2?'Pulse upgraded':'Upgrade pulse · 2 💎'}</button>
          </div>
          <div aria-live="polite" className="text-sm text-cyan-100">{({ready:'Ready to explore?',go:'Follow the glowing lane!',success:'Great job! Next challenge!',miss:'Try that challenge again.',hit:'Shield lost. Avoid pink energy.',won:'Mission complete!',retry:'Try again — you can do it!'})[s.feedback]}</div>
          {s.status==='ready'&&<button className={btn+' w-full bg-cyan-800 min-h-12'} onClick={()=>{setPaused(false);setS(startGalactic);speak();}}>▶ Start mission</button>}
          {paused&&playing&&<p className="text-amber-200">Paused. Tap Resume to continue.</p>}
          {s.status==='won'&&s.mission<MISSIONS.length-1&&<button className={btn+' w-full bg-emerald-800'} onClick={()=>select(s.mission+1)}>Next mission →</button>}
          {s.status==='won'&&s.mission===MISSIONS.length-1&&<p className="text-emerald-200 font-bold">Titan restored! Galaxy rescue complete.</p>}
          <button className={btn+' w-full'} onClick={()=>select(s.mission)}>Restart mission</button>
          {saveError&&<p className="text-amber-200">Progress could not be saved on this device.</p>}
          <p className="text-xs text-slate-400">Drag freely or tap a lane. Keyboard: ← → and 1–3. Pink energy is a hazard. No airplane — SparkBot changes form.</p>
        </section>
      </div>
    </div>
  </main>;
}
