import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_CHARACTER_ORDER} from './customization';
import {SPACE_BOT_FORMS} from './spaceBotForms';
import {buildSpaceBotMesh,projectSpaceBotMesh,type SpaceModelPose} from './spaceBotMesh';
const initial:SpaceModelPose={character:'sparkbot',from:'scout',to:'scout',progress:1,evolved:false,fusion:0,boost:false};
test('all companions have solid head, body, limbs and accessories with real depth',()=>{
 for(const character of BOT_CHARACTER_ORDER){const m=buildSpaceBotMesh({...initial,character});for(const name of ['head','visor','torso','arm','leg','boot','eye'])assert.ok(m.some(f=>f.part===name));const head=m.filter(f=>f.part==='head').flatMap(f=>f.vertices);assert.ok(Math.max(...head.map(v=>v[2]))-Math.min(...head.map(v=>v[2]))>10);}
});
test('all transformation combinations produce finite bounded projected geometry',()=>{
 for(const character of BOT_CHARACTER_ORDER)for(const from of SPACE_BOT_FORMS)for(const to of SPACE_BOT_FORMS)for(const progress of [0,.5,1])for(const fusion of [0,1]){const pose={...initial,character,from,to,progress,fusion,evolved:true},faces=projectSpaceBotMesh(pose);assert.ok(faces.length>0);for(const face of faces)for(const [x,y,z] of face.vertices){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));assert.ok(Math.abs(x)<40&&Math.abs(y)<40);}for(let i=1;i<faces.length;i++)assert.ok(faces[i].depth>=faces[i-1].depth);}
});
test('fusion adds actual armor geometry, base endpoints match and identity differs',()=>{
 assert.equal(buildSpaceBotMesh(initial).some(f=>f.part==='fusion-chest'),false);assert.ok(buildSpaceBotMesh({...initial,fusion:1}).some(f=>f.part==='fusion-chest'));
 assert.deepEqual(buildSpaceBotMesh({...initial,from:'scout',to:'pulse',progress:1}),buildSpaceBotMesh({...initial,from:'pulse',to:'pulse',progress:1}));
 assert.notDeepEqual(buildSpaceBotMesh({...initial,character:'sprout'}),buildSpaceBotMesh({...initial,character:'nova'}));
});
