import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderSoundscape,type Soundscape} from './soundscape';
import {characterVoiceStyle,CHARACTER_VOICE_STYLES} from './characterVoiceStyle';
test('expressive voices have bounded mood-specific rate and pitch',()=>{
 assert.equal(characterVoiceStyle('victory_voice'),CHARACTER_VOICE_STYLES.celebrate);
 assert.equal(characterVoiceStyle('hint_code_1'),CHARACTER_VOICE_STYLES.helpful);
 assert.equal(characterVoiceStyle('predict_21','encourage'),CHARACTER_VOICE_STYLES.encourage);
 for(const p of Object.values(CHARACTER_VOICE_STYLES)){assert.ok(p.rate>=.8&&p.rate<=1);assert.ok(p.pitch>=1&&p.pitch<=1.3);}
});
test('eight original scores and ambient textures are deterministic, finite and loop-safe',()=>{
 const scenes:Soundscape[]=['workshop','canyon','dunes','glade','citadel','energy','ocean','arcade'];
 const signatures=new Set<string>();
 for(const scene of scenes)for(const kind of ['music','ambience'] as const){
  const a=renderSoundscape(scene,kind,8000);
  assert.ok(a.length>=8000*15&&a.length<=8000*30);
  assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));
  assert.equal(a[0],0);assert.ok(Math.abs(a[a.length-1])<.005);
  const rms=Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);assert.ok(rms>.0001);
  signatures.add(a.length+':'+rms.toFixed(7));
  assert.deepEqual(a,renderSoundscape(scene,kind,8000));
 }
 assert.equal(signatures.size,16);
});
test('speech priority and scene continuity preserve controls',()=>{
 const a=fs.readFileSync('src/game/audio.ts','utf8'),app=fs.readFileSync('src/App.tsx','utf8');
 assert.match(a,/if\(active\)this.cancelSpeech/);
 assert.match(a,/if\(this.bedDucked\)return/);
 assert.match(a,/cancelScheduledValues\(ctx.currentTime\);gain.gain.setTargetAtTime/);
 assert.match(app,/return \(\)=>document.removeEventListener\('visibilitychange',sync\)/);
});
