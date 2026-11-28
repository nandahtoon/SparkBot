import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BIOME_THEMES,getBiomeForLevel} from './biomes';
import {getWorldArchitecture} from './worldArchitecture';
import {createChapterLandmarks} from '../three/chapterLandmarks';
import {getLevelById} from './levels';
import {getJourneyPreview} from './journey';
test('six biomes have unique architecture and bounded scenery outside track',()=>{
 const disposable:{dispose:()=>void}[]=[];
 const scenery=createChapterLandmarks(item=>{disposable.push(item);return item;});
 const ids=Object.keys(BIOME_THEMES) as (keyof typeof BIOME_THEMES)[];
 assert.equal(new Set(ids.map(id=>getWorldArchitecture(id).silhouette)).size,6);
 for(const id of ids){scenery.show(id);assert.equal(Object.values(scenery.groups).filter(g=>g.visible).length,1);
  const group=scenery.groups[id]!;assert.ok(group.children.length>=6&&group.children.length<=24);
  group.updateMatrixWorld(true);for(const child of group.children){const bounds=new THREE.Box3().setFromObject(child);assert.ok(bounds.min.x>3||bounds.max.x< -3);}
  scenery.animate(5,false);scenery.animate(0,true);
 }
 disposable.forEach(item=>item.dispose());
});
test('next route previews reflect actual destination world landmark',()=>{
 for(const id of [4,8,12,16,20,21,22,23]){
 const next=getJourneyPreview(getLevelById(id)!)!;
 assert.equal(next.landmark,getWorldArchitecture(getBiomeForLevel(getLevelById(id+1)!).id).landmark);assert.equal(next.id,id+1);}
});
