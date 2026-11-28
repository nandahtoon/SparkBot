import {rescueGoalCue,type RescueMap,type RescueState} from './rescueAdventure';
const stories={
 bay:{title:'Light the harbor',intro:'The harbor lights have gone dark. Help boats find their way home. Walk along the docks, repair both beacons, then return to the green home dock.',seek:'Look for a dark harbor light. Find a safe dock path.',repair:'You reached a harbor light. Tap the wrench to restore it.',home:'The harbor lights are shining. Return to the green home dock.',complete:'The harbor is ready for boats again. You are home safe!'},
 reef:{title:'Help the reef station',intro:'The reef research team needs its two signal beacons. Follow the safe paths beside the coral, repair both signals, then return home.',seek:'Look for a dark research beacon. Stay on the safe paths.',repair:'You reached a research beacon. Tap the wrench to restore its signal.',home:'Both research signals are working. Return to the green home dock.',complete:'The reef team can receive signals again. You are home safe!'}
};
export function rescueStory(map:RescueMap){return map.id==='reef'?stories.reef:stories.bay;}
export function rescueStoryVoice(map:RescueMap,state:RescueState){
 const story=rescueStory(map);switch(rescueGoalCue(map,state)){case 'seek':return story.seek;case 'repair-here':return story.repair;case 'return-home':return story.home;case 'complete':return story.complete;}
}
export function rescueLandmarkHighlight(map:RescueMap,state:RescueState,id:string,kind:string):boolean{
 const cue=rescueGoalCue(map,state);
 if(kind==='dock')return cue==='return-home';
 if(kind!=='beacon'||state.repaired.includes(id))return false;
 return cue==='seek'||(cue==='repair-here'&&id===state.row+':'+state.col);
}
export function rescueShoreEdges(map:RescueMap,r:number,c:number){
 const wet=(row:number,col:number)=>!map.cells[row]?.[col]||map.cells[row][col]==='water';
 return {north:wet(r-1,c),south:wet(r+1,c),west:wet(r,c-1),east:wet(r,c+1)};
}
