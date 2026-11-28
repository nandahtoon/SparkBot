import { LEVELS,BONUS_LEVELS } from './levels';
import { STORY_CHAPTERS } from './educationStrategy';
import { getCampaignStars } from './missionCurriculum';
import type { LevelDef,SaveProfile } from './types';
import { getBiomeForLevel } from './biomes';
export type AdventureSave=Pick<SaveProfile,'stars'|'bonusStars'|'unlockedLevel'>;
export function canEnterCampaign(level:LevelDef,save:AdventureSave):boolean{
 return !level.isPrototype&&!level.isDebug&&!level.isDaily&&!level.isSandbox&&!level.isClassCode&&
  (level.isBonus?BONUS_LEVELS.some(l=>l.id===level.id):LEVELS.some(l=>l.id===level.id)&&level.id<=save.unlockedLevel);
}
export function buildAdventureMap(save:AdventureSave){
 const levels=new Map([...LEVELS,...BONUS_LEVELS].map(l=>[l.id,l]));
 return STORY_CHAPTERS.map(chapter=>({
  id:chapter.id,title:chapter.title.split(' · ').at(-1)??chapter.title,accent:chapter.accentColor,
  missions:chapter.levelIds.flatMap(id=>{
   const level=levels.get(id);if(!level)return [];
   return [{id,name:level.name,stars:getCampaignStars(save,level),unlocked:canEnterCampaign(level,save),biome:getBiomeForLevel(level).id}];
  })
 }));
}
export type MissionTravel={fromId:number;fromName:string;toId:number;toName:string;fromWorld:string;toWorld:string;accent:string};
export function createMissionTravel(from:LevelDef,to:LevelDef):MissionTravel|null{
 const flags=(l:LevelDef)=>l.isPrototype||l.isDaily||l.isDebug||l.isSandbox||l.isClassCode;
 if(flags(from)||flags(to)||to.id!==from.id+1)return null;
 const all=[...LEVELS,...BONUS_LEVELS];
 if(!all.some(l=>l.id===from.id)||!all.some(l=>l.id===to.id))return null;
 const a=getBiomeForLevel(from),b=getBiomeForLevel(to);
 return {fromId:from.id,fromName:from.name,toId:to.id,toName:to.name,fromWorld:a.name,toWorld:b.name,accent:b.accentCss};
}
