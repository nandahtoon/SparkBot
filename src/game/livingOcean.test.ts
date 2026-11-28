import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLivingOcean,createOceanDestinationPreview,oceanTrackStyle} from '../three/livingOcean';
import {getJourneyPreview} from './journey';
import {getLevelById} from './levels';
import type {OceanZone} from './oceanPresentation';
test('ocean zones have distinct geometry, safe off-track placement and reduced-motion animation',()=>{
 const resources:{dispose:()=>void}[]=[];
 const scene=createLivingOcean(v=>{resources.push(v);return v;});
 const zones:OceanZone[]=['sampling','reef','signal','beacon'];
 assert.equal(new Set(zones.map(z=>oceanTrackStyle(z).deck)).size,4);
 for(const zone of zones){
  scene.show(zone);assert.equal(Object.values(scene.zones).filter(g=>g.visible).length,1);
  scene.animate(17,false,false);scene.animate(0,true,true);
  scene.root.updateMatrixWorld(true);
  for(const mesh of scene.zones[zone].children){const b=new THREE.Box3().setFromObject(mesh);assert.ok(b.min.x>3||b.max.x< -3);}
 }
 scene.show(undefined);assert.equal(scene.root.visible,false);resources.forEach(r=>r.dispose());
});
test('upcoming ocean destination uses real route data and stays outside current track corridor',()=>{
 for(const id of [21,22,23]){
  const level=getLevelById(id)!,next=getJourneyPreview(level)!;
  const g=createOceanDestinationPreview(next,level.track.length);g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.x>3);
  assert.ok(g.children.length>=next.track.filter(t=>t.type!=='gap').length*2);
  const owned=new Set<{dispose:()=>void}>();g.traverse(o=>{if(o instanceof THREE.Mesh){owned.add(o.geometry);if(!Array.isArray(o.material))owned.add(o.material);}});owned.forEach(v=>v.dispose());
 }
});
