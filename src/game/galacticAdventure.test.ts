import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalactic,startGalactic,moveGalactic,transformGalactic,stepGalactic,currentEncounter,MISSIONS,REQUIRED,TICKS_PER_ENCOUNTER,readGalacticUnlock,nextGalacticUnlock,hazardLanes,FORM_SPEED,FORMS} from './galacticAdventure';
const advance=(s:ReturnType<typeof createGalactic>)=>{for(let i=0;i<TICKS_PER_ENCOUNTER;i++)s=stepGalactic(s);return s;};
test('every mission is solvable with correct robot forms and safe lane',()=>{
  let unlock=0;
  for(let m=0;m<MISSIONS.length;m++){
    let s=startGalactic(createGalactic(m));
    for(const e of MISSIONS[m]){
      assert.equal(currentEncounter(s),e);
      assert.notEqual(e.lane,e.hazard);
      const original=s;
      s=advance(transformGalactic(moveGalactic(s,e.lane),REQUIRED[e.goal]));
      assert.equal(original.tick,0);
      assert.equal(s.shields,3);
    }
    assert.equal(s.status,'won');assert.equal(stepGalactic(s),s);
    unlock=nextGalacticUnlock(unlock,s);
    assert.equal(unlock,Math.min(m+1,MISSIONS.length-1));
  }
});
test('incorrect form does not advance; guardian blocks incoming energy',()=>{
  let s=startGalactic(createGalactic(2));
  s=advance(s);assert.equal(s.phase,0);assert.equal(s.shields,2);
  s=advance(transformGalactic(s,'guardian'));assert.equal(s.phase,1);assert.equal(s.shields,2);
  s=advance(moveGalactic(s,2));assert.equal(s.shields,2);assert.equal(s.phase,1);
});
test('missed objectives repeat; three unshielded impacts cause retry',()=>{
  let s=startGalactic(createGalactic(2));
  s=advance(moveGalactic(s,0));assert.equal(s.phase,0);assert.equal(s.shields,3);
  s=moveGalactic(s,2);for(let i=0;i<3;i++)s=advance(s);
  assert.equal(s.status,'retry');assert.equal(s.shields,0);assert.equal(stepGalactic(s),s);
});
test('ready state does not advance and save is versioned, bounded and monotonic',()=>{
  const s=createGalactic(-3);assert.equal(s.mission,0);assert.equal(stepGalactic(s),s);
  assert.equal(moveGalactic(s,4),s);assert.equal(readGalacticUnlock('bad'),0);
  assert.equal(readGalacticUnlock('{"version":2,"unlocked":2}'),0);
  assert.equal(readGalacticUnlock('{"version":1,"unlocked":100}'),2);
  assert.equal(nextGalacticUnlock(2,s),2);
});

test('continuous movement is bounded and uses distinct form speeds',()=>{
  for(const form of FORMS){
    let s=transformGalactic(startGalactic(createGalactic()),form);
    s=moveGalactic(s,99);assert.equal(s.targetX,4);assert.equal(s.x,2);
    s=stepGalactic(s);assert.ok(Math.abs(s.x-2-FORM_SPEED[form])<1e-9);
    for(let i=0;i<20;i++)s=stepGalactic(s);
    assert.equal(s.x,4);assert.equal(s.lane,4);
    s=moveGalactic(s,1.25);for(let i=0;i<20;i++)s=stepGalactic(s);
    assert.equal(s.x,1.25);assert.equal(s.lane,1);
    assert.equal(moveGalactic(s,NaN),s);
  }
});
test('formation hazards are unique, bounded and never overlap the objective',()=>{
  for(let m=0;m<MISSIONS.length;m++)for(let p=0;p<MISSIONS[m].length;p++){
    const e=MISSIONS[m][p], lanes=hazardLanes(m,p);
    assert.equal(new Set(lanes).size,lanes.length);
    assert.ok(lanes.every(l=>l>=0&&l<=4&&l!==e.lane));
    if(e.hazard!==null)assert.ok(lanes.includes(e.hazard));
    if(m>0&&p>0&&e.hazard!==null)assert.equal(lanes.length,2);
  }
});
test('late steering uses actual position, not target, for impact resolution',()=>{
  let s=startGalactic(createGalactic());
  s=moveGalactic(s,0);for(let i=0;i<TICKS_PER_ENCOUNTER-1;i++)s=stepGalactic(s);
  s=moveGalactic(s,2);s=stepGalactic(s);
  assert.equal(s.phase,0);assert.equal(s.feedback,'miss');assert.equal(s.targetX,2);
});
test('second formation lane also causes shield loss at impact',()=>{
  let s=startGalactic(createGalactic(1));
  s=advance(transformGalactic(moveGalactic(s,1),'astro'));
  assert.equal(s.phase,1);
  const l=hazardLanes(1,1)[1];
  s=advance(moveGalactic(s,l));assert.equal(s.shields,2);assert.equal(s.phase,1);
});
