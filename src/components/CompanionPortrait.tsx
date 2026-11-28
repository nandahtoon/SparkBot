import React,{useId} from 'react';
import type {BotCharacterId} from '../game/customization';
const looks={
 sparkbot:['#12334e','#fbbf24','#e8f4ff','#e9ad32'],
 sprout:['#164638','#fb923c','#fff8ea','#eee9d9'],
 nova:['#193d65','#fbbf24','#eef5ff','#e0edf9'],
 robobuddy:['#47314b','#60a5fa','#fff2de','#e9e6d9'],
 learnbot:['#263d69','#facc15','#60caff','#fadd58']
};
export function CompanionPortrait({character,className}:{character:BotCharacterId;className?:string}){
 const id=useId().replace(/:/g,''),[sky,accent,shell,body]=looks[character];
 return <svg viewBox="0 0 320 220" className={className} aria-hidden="true" focusable="false">
 <defs><linearGradient id={id+'bg'} x2="0%" y2="100%"><stop stopColor={sky}/><stop offset="1" stopColor="#0b1728"/></linearGradient><linearGradient id={id+'shell'} x2="80%" y2="100%"><stop stopColor="#fff"/><stop offset=".55" stopColor={shell}/><stop offset="1" stopColor="#839db1"/></linearGradient></defs>
 <rect width="320" height="220" rx="12" fill={'url(#'+id+'bg)'}/>
 <circle cx="160" cy="95" r="84" fill="none" stroke={accent} strokeOpacity=".23" strokeWidth="2"/>
 <path d="M0 175L61 127l42 31 52-41 54 48 52-37 59 39v53H0Z" fill="#0f2235" opacity=".8"/>
 <ellipse cx="160" cy="207" rx="77" ry="9" fill="#020b18" opacity=".6"/>
 {character==='nova'&&<g fill="#e4f4ff" stroke="#7dd3fc" strokeWidth="2">{[-1,1].map(s=><path key={s} d={`M${160+s*38} 146 Q${160+s*105} 94 ${160+s*113} 111 Q${160+s*118} 152 ${160+s*52} 181Z`}/>)}</g>}
 <rect x="121" y="180" width="27" height="23" rx="10" fill="#253e55"/><rect x="172" y="180" width="27" height="23" rx="10" fill="#253e55"/>
 <rect x="108" y="127" width="104" height="65" rx="27" fill={body} stroke="#829aaf" strokeWidth="2"/>
 <g fill={'url(#'+id+'shell)'} stroke="#8da4b4" strokeWidth="2"><rect x="87" y="131" width="26" height="45" rx="13" transform="rotate(17 100 147)"/><rect x="207" y="131" width="26" height="45" rx="13" transform="rotate(-20 220 147)"/></g>
 <circle cx="160" cy="160" r="21" fill="#122a41" stroke={accent} strokeWidth="3"/>
 {character==='sprout'?<path d="M160 170v-15q-17 1-14-12 13-1 14 12 1-14 14-12 3 13-14 15" fill="#70e898" stroke="#70e898" strokeWidth="2"/>:<path d="m164 142-14 20h9l-3 15 15-22h-9z" fill={accent}/>}
 {character==='sprout'&&<path d="M108 127Q160 143 209 127L203 139Q156 153 113 139L83 152 67 144 107 132Z" fill="#dc4941"/>}
 <g fill={'url(#'+id+'shell)'} stroke="#a2b8c9" strokeWidth="2"><rect x="94" y="43" width="132" height="96" rx="37"/><rect x="80" y="72" width="25" height="41" rx="12"/><rect x="215" y="72" width="25" height="41" rx="12"/></g>
 <g fill={accent}><circle cx="91" cy="92" r="7"/><circle cx="229" cy="92" r="7"/></g>
 <rect x="106" y="57" width="108" height="69" rx="27" fill="#091b30"/>
 <path d="M115 68Q160 49 203 68" stroke="#fff" strokeOpacity=".13" strokeWidth="3" fill="none"/>
 {[-1,1].map(s=><g key={s}><ellipse cx={160+s*24} cy="87" rx="13" ry="16" fill="#28c8ff"/><ellipse cx={160+s*24} cy="87" rx="8" ry="11" fill="#073e79"/><circle cx={157+s*24} cy="82" r="4" fill="#e8fbff"/><ellipse cx={160+s*35} cy="109" rx="7" ry="3" fill="#ff9eaa" opacity=".85"/></g>)}
 {character==='nova'?<path d="M149 105q11-9 22 0l-11 13Z" fill="#ffbc46"/>:<path d="M149 106q11 8 22 0q-2 13-11 13t-11-13" fill="#ff9bab"/>}
 {character==='sprout'&&<g><path d="M160 42q-21-27-36-14 10 18 36 14q13-25 30-17-2 20-30 17" fill="#82d86a"/><g fill="#67d9ff" stroke="#d99a3a" strokeWidth="5"><ellipse cx="135" cy="47" rx="20" ry="11" transform="rotate(-12 135 47)"/><ellipse cx="185" cy="47" rx="20" ry="11" transform="rotate(12 185 47)"/></g></g>}
 {character==='nova'&&<g fill="#f5c052"><path d="m101 55 5-25 24 15Z"/><path d="m219 55-5-25-24 15Z"/></g>}
 {character==='robobuddy'&&<g fill="#d4ae71" stroke="#946a3c" strokeWidth="2"><path d="M111 48q3-31 49-31t49 31Z"/><ellipse cx="160" cy="49" rx="77" ry="9"/><circle cx="160" cy="35" r="10" fill="#b5efff"/></g>}
 {(character==='sparkbot'||character==='learnbot')&&<g><path d="M160 44V25" stroke="#9bb6c8" strokeWidth="5"/>{character==='sparkbot'?<circle cx="160" cy="23" r="8" fill={accent}/>:<path d="m160 9 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill={accent}/>}</g>}
 </svg>;
}
