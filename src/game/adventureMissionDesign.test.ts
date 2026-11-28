import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,BONUS_LEVELS} from './levels';
import {ADVENTURE_MISSION_DESIGNS,CAMPAIGN_REDESIGN_POLICY} from './adventureMissionDesign';
import {SLICE_MISSIONS,startSlice,stepSlice,type SliceId,type Command} from './adventureRuleSlice';
test('redesign covers exactly existing campaign IDs with distinct primary mechanics and bounded targets',()=>{
 const ids=[...LEVELS,...BONUS_LEVELS].map(l=>l.id).sort((a,b)=>a-b);
 assert.deepEqual(ADVENTURE_MISSION_DESIGNS.map(d=>d.id),ids);
 assert.equal(new Set(ADVENTURE_MISSION_DESIGNS.map(d=>d.mechanic)).size,24);
 for(const d of ADVENTURE_MISSION_DESIGNS){
  assert.equal([...LEVELS,...BONUS_LEVELS].find(l=>l.id===d.id)?.name,d.legacyName);
  assert.ok(d.minAreas>=1&&d.maxAreas>=d.minAreas&&d.minMinutes>=1&&d.maxMinutes>=d.minMinutes&&d.maxMinutes<=10);
  assert.ok(d.difficulty>=1&&d.difficulty<=5);
 }
 assert.equal(CAMPAIGN_REDESIGN_POLICY.miniGameExpansion,'HOLD');
});
const move=(to:string):Command=>({kind:'move',to});
const act=(action:Extract<Command,{kind:'act'}>['action']):Command=>({kind:'act',action});
const run=(id:SliceId,commands:Command[])=>commands.reduce((s,c)=>stepSlice(id,s,c),startSlice());
test('rescue requires tools, repair, rescue and return; two routes are possible',()=>{
 assert.equal(run(13,[move('lookout'),move('bridge'),move('robot')]).at,'bridge');
 assert.equal(run(13,[move('tools'),act('collect'),move('bridge'),act('repair'),move('robot'),act('rescue')]).won,false);
 for(const via of [[],[move('lookout')]])assert.equal(run(13,[move('tools'),act('collect'),...via,move('bridge'),act('repair'),move('robot'),act('rescue'),move('bridge'),move('tools'),move('home')]).won,true);
});
test('convoy requires both signals; order can vary',()=>{
 assert.equal(run(14,[move('north'),act('signal'),move('junction'),move('terminal')]).won,false);
 for(const [a,b] of [['north','south'],['south','north']])assert.equal(run(14,[move(a),act('signal'),move('junction'),move(b),act('signal'),move('junction'),move('terminal')]).won,true);
});
test('energy allocation enforces capacity, supports mistakes and recovery, and exact demand',()=>{
 const s=run(15,[move('shelter'),act('allocate'),act('allocate'),act('allocate'),act('allocate')]);
 assert.equal(s.power.shelter,3);
 assert.equal(run(15,[move('shelter'),act('allocate'),move('home')]).won,false);
 const repaired=[act('reclaim'),act('reclaim'),move('hub'),move('lift'),act('allocate'),act('allocate'),move('hub'),move('home')].reduce((x,c)=>stepSlice(15,x,c),s);
 assert.equal(repaired.won,true);
});
test('guardian requires diagnostics before switches and both switches before restart',()=>{
 assert.equal(run(16,[move('east'),act('align'),move('guardian'),act('restart')]).won,false);
 assert.equal(run(16,[move('scanner'),act('scan'),move('west'),act('align'),move('east'),act('align'),move('guardian'),act('restart')]).won,true);
});
test('all slice graphs have reciprocal connected links, blocked moves and immutable transitions',()=>{
 for(const id of [13,14,15,16] as const){
  const sites=SLICE_MISSIONS[id].sites;
  for(const n of sites)for(const link of n.links)assert.ok(sites.find(x=>x.id===link)?.links.includes(n.id));
  const seen=new Set(['home']);for(let i=0;i<sites.length;i++)for(const n of sites)if(seen.has(n.id))for(const l of n.links)seen.add(l);
  assert.equal(seen.size,sites.length);
  const start=startSlice(),before=JSON.stringify(start);
  assert.equal(stepSlice(id,start,move('nonexistent')).at,'home');
  assert.equal(JSON.stringify(start),before);
 }
});
