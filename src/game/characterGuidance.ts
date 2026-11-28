import type {LevelDef,PartId} from './types';
import type {MissionTutorialStepDef} from './missionTutorial';
import {getMissionObjectiveLabel,getSurveyStations} from './missionObjectives';
export function tutorialVoice(step:MissionTutorialStepDef):string{
 switch(step.id){
 case 'build_budget':return 'Hi, explorer! Let’s build a robot. Tap Got it to start!';
 case 'build_wheels':return 'I need wheels! '+step.actionHint+'.';
 case 'build_laser':return 'Let’s give me a laser! '+step.actionHint+'.';
 case 'build_next_phase':return 'Ready to roll! Tap the green arrow.';
 case 'code_add_move':return 'Let’s go! '+step.actionHint+'.';
 case 'code_rail_review':return 'Great building! Look at your commands. Tap next when ready.';
 case 'code_run':return 'Ready, set, go! Tap play and watch me move.';
 default:return step.actionHint;
 }
}
export function missionVoice(level:LevelDef):string{
 const stations=getSurveyStations(level);
 const intro=stations?'Look for the clock circles! Stop on each one and tap the clock command. Then reach the flag. ':level.id===23&&level.isBonus&&!level.isDaily&&!level.isSandbox&&!level.isClassCode&&!level.isDebug?'Two gates! A cross means stop. An arrow means open. Use the clock to wait on a safe deck. ':'';
 return 'Ready, explorer? '+level.name+'. '+intro+(level.brief||getMissionObjectiveLabel(level));
}
export function buildVoice(part:PartId|null,name?:string,slot?:string):string{
 return part?`Let’s add ${name||part}! Tap the part, then the glowing ${slot||'robot slot'}.`:'I’m ready to roll! Tap the green arrow to start coding.';
}
export function victoryVoice(message?:string,hasNext=false):string{
 return 'Woo hoo! '+(message||'We did it, explorer!')+(hasNext?' Ready for another adventure?':' Great exploring!');
}
