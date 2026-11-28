import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalactic,startGalactic,moveGalactic,transformGalactic,stepGalactic,currentEncounter,MISSIONS,REQUIRED,TICKS_PER_ENCOUNTER,readGalacticUnlock,nextGalacticUnlock} from './galacticAdventure';
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
