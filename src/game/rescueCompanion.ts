import {BOT_CHARACTERS,normalizeBotCharacter,type BotCharacterId} from './customization';
import {SAVE_KEY} from './types';
import {ROSTER_KEY,SLOT_STORAGE_PREFIX} from './profileRoster';
import type {RescueFeedback} from './rescueAdventure';
import type {CharacterVoiceMood} from './characterVoiceStyle';
export function readRescueCompanion(storage:Pick<Storage,'getItem'>|null){
 const read=(key:string)=>{try{const value=JSON.parse(storage?.getItem(key)??'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}};
 const roster=read(ROSTER_KEY),slot=typeof roster?.activeSlotId==='string'&&Array.isArray(roster.slots)&&roster.slots.some((s:unknown)=>s&&typeof s==='object'&&'id' in s&&s.id===roster.activeSlotId)?read(SLOT_STORAGE_PREFIX+roster.activeSlotId):null;
 const save=slot??read(SAVE_KEY);
 return {character:normalizeBotCharacter(typeof save?.botCharacter==='string'?save.botCharacter:null),muted:save?.muted===true};
}
const lines:Record<BotCharacterId,{repair:string;win:string;retry:string}>={
 sparkbot:{repair:'Power restored!',win:'Great teamwork, engineer!',retry:'Check the path. We can try again.'},
 sprout:{repair:'Our island is shining!',win:'Look what we restored together!',retry:'Let us find another trail.'},
 nova:{repair:'Beacon shining bright!',win:'Home safe, excellent navigation!',retry:'Look for a safe path below.'},
 robobuddy:{repair:'Nice work, explorer!',win:'Adventure complete, scout!',retry:'Let us explore a different route.'},
 learnbot:{repair:'We learned a new step!',win:'You planned and solved it!',retry:'Try one different step.'}
};
export function rescueCompanionReaction(character:BotCharacterId,feedback:RescueFeedback):{text:string;mood:CharacterVoiceMood}{
 const l=lines[character];
 if(feedback==='win')return {text:l.win,mood:'celebrate'};
 if(feedback==='repair')return {text:l.repair,mood:'celebrate'};
 if(feedback==='blocked')return {text:'Water ahead. '+l.retry,mood:'encourage'};
 if(feedback==='wrong-place')return {text:'Go to a beacon first.',mood:'helpful'};
 if(feedback==='already')return {text:'This beacon is fixed. Find another.',mood:'helpful'};
 return {text:feedback==='ready'?BOT_CHARACTERS[character].greeting:'Keep exploring!',mood:'friendly'};
}
