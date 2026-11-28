import test from 'node:test';
import assert from 'node:assert/strict';
import {RESCUE_MAPS,RESCUE_ACTIONS,RESCUE_MAX_COMMANDS,startRescue,stepRescue,traceRescue,rescueFailedCommandIndex,replaceRescueCommand,rescueGoalCue,type RescueAction,type RescueState} from './rescueAdventure';

const errors=new Set(['blocked','wrong-place','already']);
const stateKey=(s:RescueState)=>JSON.stringify([s.row,s.col,[...s.repaired].sort(),s.won,s.feedback]);
const logicalKey=(s:RescueState)=>JSON.stringify([s.row,s.col,[...s.repaired].sort(),s.won]);
for(const map of RESCUE_MAPS)test('exhaustive reachable rescue state and representative trace invariants: '+map.name,()=>{
 const initial=startRescue(map),q=[initial],seen=new Set<string>(),beacons=map.cells.flatMap((r,i)=>r.flatMap((c,j)=>c==='beacon'?[i+':'+j]:[]));let transitions=0;
 for(let i=0;i<q.length;i++){
  const s=q[i],k=stateKey(s);if(seen.has(k))continue;seen.add(k);
  assert.notEqual(map.cells[s.row]?.[s.col],'water');assert.ok(map.cells[s.row]?.[s.col]);assert.equal(new Set(s.repaired).size,s.repaired.length);assert.ok(s.repaired.every(id=>beacons.includes(id)));
  const here=map.cells[s.row][s.col];assert.equal(rescueGoalCue(map,s),s.won?'complete':s.repaired.length===beacons.length?'return-home':here==='beacon'&&!s.repaired.includes(s.row+':'+s.col)?'repair-here':'seek');
  for(const a of RESCUE_ACTIONS){const before=JSON.stringify(s),n=stepRescue(map,s,a);assert.equal(JSON.stringify(s),before);transitions++;
   if(s.won){assert.deepEqual(n,s);}
   else if(a==='repair'){assert.equal(n.row,s.row);assert.equal(n.col,s.col);assert.equal(n.won,false);const id=s.row+':'+s.col;const expected=here!=='beacon'?'wrong-place':s.repaired.includes(id)?'already':'repair';assert.equal(n.feedback,expected);assert.deepEqual(n.repaired,expected==='repair'?[...s.repaired,id]:s.repaired);}
   else{const r=s.row+(a==='down'?1:a==='up'?-1:0),c=s.col+(a==='right'?1:a==='left'?-1:0),target=map.cells[r]?.[c],legal=Boolean(target&&target!=='water');assert.equal(n.row,legal?r:s.row);assert.equal(n.col,legal?c:s.col);assert.deepEqual(n.repaired,s.repaired);const win=legal&&target==='dock'&&s.repaired.length===beacons.length;assert.equal(n.won,win);assert.equal(n.feedback,!legal?'blocked':win?'win':'move');}
   if(!seen.has(stateKey(n)))q.push(n);
  }
 }
 const queue:{s:RescueState;p:RescueAction[]}[]=[{s:initial,p:[]}],visited=new Set<string>();let traces=0,replacements=0,shortest:number|null=null;
 for(let i=0;i<queue.length;i++){
  const {s,p}=queue[i],k=logicalKey(s);if(visited.has(k))continue;visited.add(k);if(s.won){shortest??=p.length;continue;}
  for(const a of RESCUE_ACTIONS){const n=stepRescue(map,s,a),program=[...p,a],trace=traceRescue(map,program);assert.deepEqual(trace.at(-1),n);assert.equal(trace.length,program.length+1);traces++;
   const fail=errors.has(n.feedback);assert.equal(rescueFailedCommandIndex(trace,p.length),null);assert.equal(rescueFailedCommandIndex(trace,program.length),fail?p.length:null);
   if(fail){const withSuffix:RescueAction[]=[...program,'up','repair'];for(const replacement of RESCUE_ACTIONS){const fixed=replaceRescueCommand(withSuffix,p.length,replacement);assert.deepEqual(fixed,[...p,replacement,'up','repair']);assert.equal(withSuffix[p.length],a);replacements++;}}
   else if(program.length<RESCUE_MAX_COMMANDS)queue.push({s:n,p:program});
  }
 }
 assert.ok(shortest!==null&&shortest<=RESCUE_MAX_COMMANDS);const long:RescueAction[]=Array.from({length:40},(_,i)=>i%2?'down':'up');assert.equal(traceRescue(map,long).length,RESCUE_MAX_COMMANDS+1);
 assert.equal(seen.size,215);assert.equal(transitions,1075);assert.equal(traces,355);assert.equal(replacements,map.id==='bay'?970:1005);assert.equal(shortest,map.id==='bay'?16:18);
 console.log(JSON.stringify({map:map.name,states:seen.size,transitions,traces,replacements,shortest}));
});
