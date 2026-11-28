// Design-time contract only. Not a live campaign catalog or save migration.
export type AdventureMechanic = 'build'|'explore'|'rescue'|'transport'|'swim'|'fly'|'automate'|'resource'|'zeroGravity'|'shield'|'restore';
export interface AdventureBand {
  from:number; to:number; world:string; signature:AdventureMechanic;
  areas:readonly [number,number]; minutes:readonly [number,number];
  decisions:readonly [number,number]; coding:string;
}
// Slots are FUTURE design positions, not persisted legacy mission IDs.
export const ADVENTURE_BANDS:readonly AdventureBand[] = [
 {from:1,to:10,world:'Robot Workshop',signature:'build',areas:[1,2],minutes:[1,3],decisions:[1,2],coding:'sequence'},
 {from:11,to:20,world:'Lost Forest',signature:'rescue',areas:[2,3],minutes:[3,5],decisions:[2,4],coding:'conditions'},
 {from:21,to:30,world:'Mountain Valley',signature:'transport',areas:[3,4],minutes:[4,6],decisions:[3,5],coding:'loops and equipment'},
 {from:31,to:40,world:'Ocean Kingdom',signature:'swim',areas:[3,5],minutes:[4,7],decisions:[3,6],coding:'sensors and timing'},
 {from:41,to:50,world:'Sky Islands',signature:'fly',areas:[3,5],minutes:[5,8],decisions:[4,6],coding:'direction and energy'},
 {from:51,to:60,world:'Future City',signature:'automate',areas:[4,6],minutes:[5,9],decisions:[4,7],coding:'functions'},
 {from:61,to:70,world:'Crystal Planet',signature:'resource',areas:[4,6],minutes:[6,10],decisions:[5,8],coding:'resource planning'},
 {from:71,to:80,world:'Space Expedition',signature:'zeroGravity',areas:[4,7],minutes:[6,10],decisions:[5,8],coding:'relative direction'},
 {from:81,to:90,world:'Galactic Guardians',signature:'shield',areas:[5,8],minutes:[8,12],decisions:[6,9],coding:'multi-condition strategy'},
 {from:91,to:100,world:'Universe Restoration',signature:'restore',areas:[5,9],minutes:[10,15],decisions:[6,10],coding:'integrated systems'},
];
export const ADVENTURE_DESIGN_POLICY = {
  status:'DESIGN_ONLY', legacyMissionCount:24, legacyActivities:7,
  plannedSlots:100, mandatoryTimer:false, mandatoryQuiz:false,
  checkpointForMultiArea:true, experimentalIntegration:'HOLD', production:'HOLD',
} as const;

export type RescueSite = 'base'|'workshop'|'cave'|'crystal'|'bridge'|'station'|'robot';
export type RescuePrerequisite = 'bridgeRepaired'|'stationPowered';
export interface PlannedRoute { from:RescueSite; to:RescueSite; requires?:RescuePrerequisite; }
// Candidate mission design: the old mission 13 remains playable and unchanged.
export const LEVEL_13_RESCUE_DESIGN = {
  key:'lost-robot-rescue-v1', legacyReference:13, status:'DESIGN_ONLY',
  title:'The Lost Robot Rescue', goal:'Find the stranded robot and bring it safely home.',
  sites:['base','workshop','cave','crystal','bridge','station','robot'] as readonly RescueSite[],
  areas:['base camp','forest crossing','rescue ridge'],
  routes:[
    {from:'base',to:'workshop'}, {from:'workshop',to:'cave'},
    {from:'cave',to:'crystal'}, {from:'crystal',to:'station'},
    {from:'workshop',to:'bridge'}, {from:'bridge',to:'robot',requires:'bridgeRepaired'},
    {from:'station',to:'robot',requires:'stationPowered'},
  ] as readonly PlannedRoute[],
  checkpoints:['workshop','robot'] as readonly RescueSite[],
  mechanics:['explore','build','automate','rescue'] as readonly AdventureMechanic[],
  interactions:[
    {site:'workshop',action:'collect repair kit or energy module'},
    {site:'bridge',action:'repair bridge, then use a short repeat routine to test it'},
    {site:'station',action:'restore lift power using a sensor or guided switch'},
    {site:'robot',action:'rescue companion'},
    {site:'base',action:'return safely with companion'},
  ],
  requiredOutcomes:['companionRescued','returnedToBase'],
  optionalDiscoveries:['crystal'],
  targetMinutes:[3,5], mandatoryTimer:false, checkpointSave:'FUTURE_VERSIONED_MIGRATION',
} as const;

// Topology check for authored design data only; not movement, interaction or save logic.
export function reachableDesignSites(start:RescueSite, unlocked:ReadonlySet<RescuePrerequisite>, routes:readonly PlannedRoute[]=LEVEL_13_RESCUE_DESIGN.routes):Set<RescueSite>{
 const visited=new Set<RescueSite>([start]);const queue=[start];
 for(let i=0;i<queue.length;i++){
  const at=queue[i];
  for(const edge of routes){
   if(edge.requires&&!unlocked.has(edge.requires))continue;
   const next=edge.from===at?edge.to:edge.to===at?edge.from:undefined;
   if(next&&!visited.has(next)){visited.add(next);queue.push(next);}
  }
 }
 return visited;
}
