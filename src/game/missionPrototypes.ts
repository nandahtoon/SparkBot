import { makeCircuit } from './levels';
import type { LevelDef } from './types';

// Practice-only challenges; deliberately separate from campaign IDs and progress.
export const MISSION_PROTOTYPES: readonly LevelDef[] = [
  {
    id: 6101, isPrototype: true, name: 'Crystal Courier', ageLabel: '',
    brief: 'Pick up every crystal. Jumping too far can leave one behind!',
    objective: {kind:'collect',requiredCrystals:3},
    budget: 80, parBudget:80, parBlocks:5, loopUnlocked:false,
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    track:[
      {type:'start',crystal:false}, {type:'normal',crystal:true},
      {type:'normal',crystal:true}, {type:'gap',crystal:false},
      {type:'normal',crystal:true}, {type:'gate',crystal:false}
    ], circuit:makeCircuit([])
  },
  {
    id: 6102, isPrototype: true, name: 'Signal Repair', ageLabel:'',
    brief:'The supply robot has a broken routine. Run it, inspect the mistake, then repair its code.',
    objective:{kind:'repair'}, budget:80,parBudget:80,parBlocks:4,loopUnlocked:true,
    debugClue:'The robot has a repeating routine. Watch where it stops and fix the commands.',
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    starterProgram:[{id:'repair-loop',type:'LOOP',count:2,children:[
      {id:'repair-move',type:'MOVE'},{id:'repair-bug',type:'MOVE'}
    ]}],
    track:[
      {type:'start',crystal:false},{type:'normal',crystal:true},{type:'gap',crystal:false},
      {type:'normal',crystal:false},{type:'normal',crystal:true},{type:'gap',crystal:false},
      {type:'gate',crystal:false}
    ],circuit:makeCircuit([])
  },
  {
    id:6103,isPrototype:true,name:'Reef Survey',ageLabel:'',
    brief:'Explore the floating research walkway. Pause at both marked stations to record observations, then return to base.',
    objective:{kind:'survey',stations:[1,4]},budget:80,parBudget:80,parBlocks:7,loopUnlocked:true,waitUnlocked:true,
    starterChassis:[[null,null,null],['thrusters',null,'laser'],['wheels',null,null]],
    track:[{type:'start',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:false},{type:'gap',crystal:false},{type:'normal',crystal:false},{type:'normal',crystal:false},{type:'gate',crystal:false}],
    circuit:makeCircuit([])
  }
];
export function getMissionPrototype(id:number):LevelDef|undefined {
 return MISSION_PROTOTYPES.find(level=>level.id===id);
}
