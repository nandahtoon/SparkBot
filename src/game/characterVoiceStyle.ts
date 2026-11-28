export type CharacterVoiceMood='friendly'|'curious'|'helpful'|'celebrate'|'encourage';
export const CHARACTER_VOICE_STYLES:Record<CharacterVoiceMood,{rate:number;pitch:number}>={
 friendly:{rate:.88,pitch:1.18},curious:{rate:.85,pitch:1.23},helpful:{rate:.82,pitch:1.10},
 celebrate:{rate:.96,pitch:1.28},encourage:{rate:.84,pitch:1.12}
};
export function voiceMoodFor(id:string):CharacterVoiceMood{
 if(id.startsWith('victory'))return 'celebrate';
 if(id.startsWith('hint_')||id.startsWith('build_')||id.startsWith('tut_'))return 'helpful';
 if(id.startsWith('predict_')||id.startsWith('mission_'))return 'curious';
 return 'friendly';
}
export function characterVoiceStyle(id:string,mood?:CharacterVoiceMood){
 return CHARACTER_VOICE_STYLES[mood??voiceMoodFor(id)];
}
