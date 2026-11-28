import React,{useEffect} from 'react';
import { Volume2, Square } from 'lucide-react';
import { SPEECH,useReadAloud } from '../game/readAloud';
import { SFX } from '../game/audio';
import type {CharacterVoiceMood} from '../game/characterVoiceStyle';
export function CharacterVoiceButton({id,text,muted=false,auto=false,label='Listen to SparkBot',mood,pitchOffset}:{id:string;text:string;muted?:boolean;auto?:boolean;label?:string;mood?:CharacterVoiceMood;pitchOffset?:number}){
 const state=useReadAloud();
 useEffect(()=>{
  if(auto&&!muted&&text){SFX.cancelSpeech();SPEECH.speak(text,id,{playful:true,mood,pitchOffset});}
  return ()=>SPEECH.stopOwned(id);
 },[id,text,auto,muted,mood,pitchOffset]);
 if(!state.supported||muted||!text)return null;
 const speaking=state.activeId===id;
 return <button type="button" data-character-voice={id} aria-label={speaking?'Stop listening':label} onClick={()=>{if(!speaking)SFX.cancelSpeech();SPEECH.toggleSpeak(text,id,{playful:true,mood,pitchOffset});}} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/70 bg-slate-900 text-sky-200 active:scale-95">
 {speaking?<Square className="h-4 w-4 fill-current" aria-hidden="true"/>:<Volume2 className="h-5 w-5" aria-hidden="true"/>}
 </button>;
}
