import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSoundscape,soundscapeFor} from './soundscape';
import {getNextCampaignLevel,getJourneyPreview} from './journey';
import {getLevelById} from './levels';
import {normalizeAudioSettings} from './audioConfig';
test('original background music and environmental beds are bounded, deterministic and distinct',()=>{
 for(const scene of ['workshop','ocean','arcade'] as const){
  const music=renderSoundscape(scene,'music',8000), ambience=renderSoundscape(scene,'ambience',8000);
  assert.equal(music.length,ambience.length);assert.ok(music.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
  assert.ok(ambience.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));assert.equal(music[0],0);assert.ok(music.some((x,i)=>x!==ambience[i]));
 }
 assert.equal(soundscapeFor('ocean_discovery','CODE_3D',false),'ocean');assert.equal(soundscapeFor('ocean_discovery','CODE_3D',true),'arcade');
 assert.equal(normalizeAudioSettings({musicVolume:0,ambienceVolume:2}).musicVolume,0);assert.equal(normalizeAudioSettings({ambienceVolume:2}).ambienceVolume,1);
});
test('journey previews use actual consecutive campaign definitions, not imaginary levels',()=>{
 for(let id=1;id<24;id++){const level=getLevelById(id)!,next=getJourneyPreview(level)!;assert.equal(next.id,id+1);assert.deepEqual(next.track,getLevelById(id+1)!.track.map(t=>({type:t.type,crystal:t.crystal})));}
 assert.equal(getNextCampaignLevel(getLevelById(24)),null);
 for(const flag of ['isPrototype','isDaily','isSandbox','isDebug','isClassCode'])assert.equal(getJourneyPreview({...getLevelById(1)!,[flag]:true}),null);
});
