import { getLevelById } from './levels';
import { getBiomeForLevel } from './biomes';
import type { LevelDef } from './types';
import { getWorldArchitecture } from './worldArchitecture';
export function getNextCampaignLevel(level:LevelDef|null|undefined):LevelDef|null{
 if(!level||level.isPrototype||level.isDebug||level.isDaily||level.isSandbox||level.isClassCode||!getLevelById(level.id))return null;
 return getLevelById(level.id+1)??null;
}
export function getJourneyPreview(level:LevelDef){
 const next=getNextCampaignLevel(level);
 return next?{id:next.id,name:next.name,biome:getBiomeForLevel(next).id,world:getBiomeForLevel(next).name,landmark:getWorldArchitecture(getBiomeForLevel(next).id).landmark,track:next.track.map(tile=>({type:tile.type,crystal:tile.crystal}))}:null;
}
export type JourneyPreview=NonNullable<ReturnType<typeof getJourneyPreview>>;
