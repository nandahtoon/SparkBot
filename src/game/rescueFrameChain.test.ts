import test from 'node:test';
import assert from 'node:assert/strict';
import {createRescueFrameChain} from './rescueFrameChain';
import {rescueKeyboardAction} from './rescueKeyboard';
function fakeFrames(){
 let next=0;const live=new Map<number,(time:number)=>void>(),all=new Map<number,(time:number)=>void>();
 const chain=createRescueFrameChain(cb=>{const id=++next;live.set(id,cb);all.set(id,cb);return id;},id=>{live.delete(id);});
 return {chain,live,fire(id:number,t:number){live.delete(id);all.get(id)?.(t);},latest:()=>next};
}
test('one finite frame chain; idle and terminal frames do not reschedule',()=>{
 const f=fakeFrames();let count=0;assert.equal(f.chain.isPending(),false);f.chain.start(()=>++count<3);
 for(let t=1;t<=3;t++){assert.equal(f.live.size,1);f.fire(f.latest(),t);}
 assert.equal(count,3);assert.equal(f.live.size,0);assert.equal(f.chain.isPending(),false);
});
test('rapid command replacement, visibility cancellation and disposal reject stale callbacks',()=>{
 const f=fakeFrames();let old=0,fresh=0;f.chain.start(()=>{old++;return true;});const stale=f.latest();
 f.chain.start(()=>{fresh++;return true;});const current=f.latest();f.fire(stale,0);assert.equal(old,0);assert.equal(f.live.size,1);
 f.fire(current,10);assert.equal(fresh,1);assert.equal(f.live.size,1);const queued=f.latest();f.chain.stop();f.fire(queued,20);assert.equal(fresh,1);assert.equal(f.live.size,0);
 f.chain.start(()=>true);const last=f.latest();f.chain.dispose();f.fire(last,30);f.chain.start(()=>true);assert.equal(f.live.size,0);
});
test('stop during frame execution cannot schedule a new frame',()=>{
 const f=fakeFrames();f.chain.start(()=>{f.chain.stop();return true;});f.fire(f.latest(),0);assert.equal(f.live.size,0);
});
test('keyboard controls are absolute, repair only via R, no interception of other keys',()=>{
 assert.deepEqual(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','r','R'].map(rescueKeyboardAction),['up','right','down','left','repair','repair']);
 for(const k of ['Tab','Enter',' ','Escape','w'])assert.equal(rescueKeyboardAction(k),null);
});
