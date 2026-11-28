import test from 'node:test';
import assert from 'node:assert/strict';
import {SPACE_CORE_MAX,SPACE_CORE_COST,SPACE_SCOUT_BOOST_SECONDS,spaceEvolutionEnabled,rechargeSpaceCore,canUseSpaceAbility,activateSpaceAbility,spaceAbilitySpeed,spacePulseWave} from './spaceBotEvolution';
test('advanced core unlocked only in expedition stages 3–7',()=>{
 for(let i=1;i<=8;i++){assert.equal(spaceEvolutionEnabled(false,i),false);assert.equal(spaceEvolutionEnabled(true,i),i>=3&&i<8);}
});
test('core is capped, charges only when time advances and rejects insufficient energy',()=>{
 assert.equal(rechargeSpaceCore(95,1),SPACE_CORE_MAX);assert.equal(rechargeSpaceCore(20,0),20);assert.equal(activateSpaceAbility('pulse',SPACE_CORE_COST-1,0,0),null);
 const a=activateSpaceAbility('pulse',100,0,0)!;assert.equal(a.energy,100-SPACE_CORE_COST);assert.equal(a.pulse,true);
});
test('dash is bounded and cannot stack; shield reset only when protection is spent',()=>{
 const dash=activateSpaceAbility('scout',100,0,0)!;assert.equal(dash.boostRemaining,SPACE_SCOUT_BOOST_SECONDS);assert.equal(canUseSpaceAbility('scout',100,dash.boostRemaining,0),false);assert.ok(spaceAbilitySpeed('scout',1)>1);assert.equal(spaceAbilitySpeed('pulse',1),1);assert.equal(spaceAbilitySpeed('scout',0),1);
 assert.equal(activateSpaceAbility('guard',100,0,0),null);const guard=activateSpaceAbility('guard',100,0,3)!;assert.equal(guard.guardCooldown,0);assert.equal(guard.energy,60);assert.equal(guard.pulse,false);
});
test('five deterministic symmetric pulse beams',()=>{const shots=spacePulseWave(100,200,500);assert.equal(shots.length,5);assert.equal(shots[2].vx,0);assert.equal(shots[0].vx,-shots[4].vx);assert.equal(shots[0].x+shots[4].x,200);assert.ok(shots.every(s=>s.vy===-500));});
