import test from 'node:test';
import assert from 'node:assert/strict';
import {SLICE_MISSIONS,startSlice,stepSlice,sliceActions,type SliceId,type Command,type SliceAction} from './adventureRuleSlice';
import {earlyStatus} from './adventureEarlyRules';
const m=(to:string):Command=>({kind:'move',to});
const a=(action:SliceAction):Command=>({kind:'act',action});
const run=(id:SliceId,commands:Command[])=>commands.reduce((s,c)=>stepSlice(id,s,c),startSlice());
test('1: assemble before loading, and deliver only at dock',()=>{
 assert.equal(run(1,[a('load-cargo'),m('dock')]).at,'home');
 assert.equal(run(1,[a('fit-wheels'),a('load-cargo'),a('deliver')]).won,false);
 assert.equal(run(1,[a('fit-wheels'),a('load-cargo'),m('dock'),a('deliver')]).won,true);
});
test('2: choose different jump lengths; wrong choice recoverable',()=>{
 assert.equal(run(2,[a('jump-long'),m('island')]).at,'home');
 assert.equal(run(2,[a('jump-short'),a('jump-short')]).at,'island');
 assert.equal(run(2,[a('jump-short'),a('jump-long')]).won,true);
});
test('3: bridge locks and test required before crossing',()=>{
 assert.equal(run(3,[m('bridge'),a('lock-plank'),a('test-bridge'),m('finish')]).at,'bridge');
 assert.equal(run(3,[m('bridge'),a('place-plank'),a('lock-plank'),a('test-bridge'),m('finish')]).won,true);
});
test('4: equipment choices affect terrain and pattern order matters',()=>{
 assert.equal(run(4,[a('fit-wheels'),m('mud')]).at,'home');
 assert.equal(run(4,[a('fit-treads'),m('mud'),m('camp'),a('trace-loop')]).won,false);
 assert.equal(run(4,[a('fit-wheels'),m('dry'),m('camp'),a('pattern-turn'),a('trace-loop')]).won,false);
 for(const [part,route] of [['fit-wheels','dry'],['fit-treads','mud']] as const)
  assert.equal(run(4,[a(part),m(route),m('camp'),a('pattern-move'),a('pattern-turn'),a('trace-loop')]).won,true);
});
test('5: loaded lift must reach summit; height clamped',()=>{
 assert.equal(run(5,[m('lift'),a('boost'),m('summit')]).at,'lift');
 assert.equal(run(5,[a('load-cargo'),m('lift'),a('boost'),m('summit')]).at,'lift');
 const s=run(5,[a('load-cargo'),m('lift'),a('boost'),a('boost'),a('boost'),m('summit'),a('deliver')]);
 assert.equal(s.power.height,2);assert.equal(s.won,true);
});
test('6: aligned phase differs by platform; wait changes phase',()=>{
 assert.equal(run(6,[a('hop')]).at,'home');
 assert.equal(run(6,[a('wait'),a('hop'),a('hop')]).at,'middle');
 assert.equal(run(6,[a('wait'),a('hop'),a('wait'),a('hop')]).won,true);
});
test('7: energy cost, charging and alternate route',()=>{
 const blocked=run(7,[m('short'),m('finish')]);assert.equal(blocked.at,'short');assert.equal(blocked.power.battery,1);
 const recovered=run(7,[m('short'),m('charger'),a('charge'),m('finish')]);assert.equal(recovered.won,true);assert.equal(recovered.power.battery,2);
 assert.equal(run(7,[m('charger'),a('charge'),m('finish')]).won,true);
});
test('8: both switches must be connected; rotating twice disconnects',()=>{
 assert.equal(run(8,[m('a'),a('rotate-wire'),m('reactor'),a('energize')]).won,false);
 assert.equal(run(8,[m('a'),a('rotate-wire'),a('rotate-wire'),m('b'),a('rotate-wire'),m('reactor'),a('energize')]).won,false);
 for(const [x,y] of [['a','b'],['b','a']])assert.equal(run(8,[m(x),a('rotate-wire'),m(y),a('rotate-wire'),m('reactor'),a('energize')]).won,true);
});
test('all twelve graphs have reciprocal links, reachable sites and immutable state',()=>{
 assert.deepEqual(Object.keys(SLICE_MISSIONS).map(Number),[1,2,3,4,5,6,7,8,13,14,15,16]);
 for(const id of [1,2,3,4,5,6,7,8,13,14,15,16] as const){
  const sites=SLICE_MISSIONS[id].sites;
  const seen=new Set(['home']);
  for(const n of sites)for(const link of n.links)assert.ok(sites.find(x=>x.id===link)?.links.includes(n.id));
  for(let i=0;i<sites.length;i++)for(const n of sites)if(seen.has(n.id))for(const link of n.links)seen.add(link);
  assert.equal(seen.size,sites.length);
  const s=startSlice(),before=JSON.stringify(s);
  assert.equal(stepSlice(id,s,m('invalid')).at,'home');
  assert.equal(JSON.stringify(s),before);
  assert.ok(Array.isArray(sliceActions(id,'home')));
 }
 for(const id of [1,2,3,4,5,6,7,8] as const)assert.ok(earlyStatus(id,startSlice()).length>0);
});
