import test from 'node:test';
import assert from 'node:assert/strict';
import {RESCUE_MAPS,RESCUE_ACTIONS,RESCUE_MAX_COMMANDS,startRescue,stepRescue,traceRescue,rescueGoal,rescueGoalCue,rescueRunStartCursor,rescueFailedCommandIndex,replaceRescueCommand,type RescueAction} from './rescueAdventure';
test('both rescue boards require navigation, explicit repair and return, with two distinct beacons',()=>{
 for(const map of RESCUE_MAPS){
  assert.equal(rescueGoal(map),2);
  const initial=startRescue(map),q=[{state:initial,actions:[] as RescueAction[]}],seen=new Set<string>();let solution:RescueAction[]|null=null;
  while(q.length){const item=q.shift()!,s=item.state,k=[s.row,s.col,...[...s.repaired].sort()].join(':');if(seen.has(k))continue;seen.add(k);
   if(s.won){solution=item.actions;break;}
   if(item.actions.length>=RESCUE_MAX_COMMANDS)continue;
   for(const action of RESCUE_ACTIONS){const next=stepRescue(map,s,action);if(!['blocked','wrong-place','already'].includes(next.feedback))q.push({state:next,actions:[...item.actions,action]});}
  }
  assert.ok(solution,map.id);assert.equal(solution.filter(a=>a==='repair').length,2);
  const end=traceRescue(map,solution).at(-1)!;assert.equal(end.won,true);assert.equal(end.row,initial.row);assert.equal(end.col,initial.col);assert.equal(initial.repaired.length,0);
  assert.deepEqual(traceRescue(map,solution),traceRescue(map,solution));
 }
});
test('water, wrong repair, repeated repair and incomplete return never award success',()=>{
 const m=RESCUE_MAPS[0],s=startRescue(m);
 assert.equal(stepRescue(m,s,'left').feedback,'blocked');
 assert.equal(stepRescue(m,s,'repair').feedback,'wrong-place');
 const at=traceRescue(m,['up','up','right','right','repair']).at(-1)!;
 assert.equal(at.repaired.length,1);assert.equal(stepRescue(m,at,'repair').feedback,'already');
 const back=traceRescue(m,['up','down']).at(-1)!;assert.equal(back.won,false);
 assert.equal(traceRescue(m,['left','up']).length,2);
 assert.ok(traceRescue(m,Array(100).fill('up')).length<=RESCUE_MAX_COMMANDS+1);
});

test('visual goal cues distinguish seeking, repair, return and completion',()=>{
 const m=RESCUE_MAPS[0];let s=startRescue(m);assert.equal(rescueGoalCue(m,s),'seek');
 for(const a of ['up','up','right','right'] as const)s=stepRescue(m,s,a);
 assert.equal(rescueGoalCue(m,s),'repair-here');s=stepRescue(m,s,'repair');assert.equal(rescueGoalCue(m,s),'seek');
 for(const a of ['down','right','right','down','repair'] as const)s=stepRescue(m,s,a);
 assert.equal(rescueGoalCue(m,s),'return-home');
 for(const a of ['down','left','left','up','left','left'] as const)s=stepRescue(m,s,a);
 assert.equal(s.won,true);assert.equal(rescueGoalCue(m,s),'complete');
});
test('paused or stepped code resumes at the visible cursor; finished playback restarts',()=>{
 assert.equal(rescueRunStartCursor(0,8),0);assert.equal(rescueRunStartCursor(3,8),3);assert.equal(rescueRunStartCursor(8,8),0);assert.equal(rescueRunStartCursor(0,0),0);
});

test('observed middle command failure can be replaced without erasing the valid prefix or suffix',()=>{
 const map=RESCUE_MAPS[0],program:RescueAction[]=['up','left','right','right','repair'];const trace=traceRescue(map,program);
 assert.equal(rescueFailedCommandIndex(trace,0),null);assert.equal(rescueFailedCommandIndex(trace,1),null);assert.equal(rescueFailedCommandIndex(trace,2),1);assert.equal(rescueFailedCommandIndex(trace,3),null);
 const fixed=replaceRescueCommand(program,1,'up');assert.deepEqual(fixed,['up','up','right','right','repair']);assert.equal(program[1],'left');
 const after=traceRescue(map,fixed);assert.equal(after.at(-1)?.feedback,'repair');assert.equal(after.at(-1)?.repaired.length,1);assert.equal(rescueFailedCommandIndex(after,5),null);
 assert.deepEqual(replaceRescueCommand(program,-1,'up'),program);assert.deepEqual(replaceRescueCommand(program,program.length,'up'),program);
});
test('wrong repair and repeated repair identify the observed command, and full programs can still be corrected',()=>{
 const m=RESCUE_MAPS[0];assert.equal(rescueFailedCommandIndex(traceRescue(m,['repair']),1),0);
 assert.equal(rescueFailedCommandIndex(traceRescue(m,['up','up','right','right','repair','repair']),6),5);
 const full:RescueAction[]=Array(RESCUE_MAX_COMMANDS).fill('left');const next=replaceRescueCommand(full,0,'up');assert.equal(next.length,RESCUE_MAX_COMMANDS);assert.equal(next[0],'up');assert.equal(full[0],'left');
});
