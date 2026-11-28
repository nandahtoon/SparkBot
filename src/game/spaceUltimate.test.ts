import test from 'node:test';
import assert from 'node:assert/strict';
import {ULTIMATE_DURATION,ULTIMATE_COST,newUltimate,canActivateUltimate,activateUltimate,tickUltimate,absorbUltimateHit,ultimateArmorBlend} from './spaceUltimate';
test('fusion unlocks only at stage seven, requires energy, activates once per round',()=>{
 const initial=newUltimate();for(let stage=1;stage<=8;stage++){assert.equal(canActivateUltimate(true,stage,100,initial),stage===7);assert.equal(canActivateUltimate(false,stage,100,initial),false);}
 assert.equal(activateUltimate(true,7,79,initial),null);
 const result=activateUltimate(true,7,100,initial)!;assert.equal(result.energy,100-ULTIMATE_COST);assert.equal(result.state.remaining,ULTIMATE_DURATION);assert.deepEqual(initial,newUltimate());assert.equal(activateUltimate(true,7,100,result.state),null);
});
test('fusion shield absorbs exactly one impact and does not renew',()=>{
 const active=activateUltimate(true,7,100,newUltimate())!.state;const first=absorbUltimateHit(active);assert.equal(first.absorbed,true);assert.equal(absorbUltimateHit(first.state).absorbed,false);assert.equal(tickUltimate(first.state,1,7).shield,false);
});
test('fusion uses gameplay time, expires, cancels before rescue and has bounded armor blend',()=>{
 const active=activateUltimate(true,7,100,newUltimate())!.state;assert.deepEqual(tickUltimate(active,0,7),active);assert.equal(tickUltimate(active,5,7).remaining,0);assert.equal(tickUltimate(active,0,8).shield,false);assert.equal(tickUltimate(active,0,8).used,true);
 for(let i=0;i<=50;i++){const value=ultimateArmorBlend(i/10);assert.ok(value>=0&&value<=1);}assert.equal(ultimateArmorBlend(5,true),1);assert.equal(ultimateArmorBlend(0,true),0);
});
