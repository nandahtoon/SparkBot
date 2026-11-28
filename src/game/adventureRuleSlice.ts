// Isolated rules prototype for campaign IDs 13–16. No save writes or experiment imports.
export type SliceId=13|14|15|16;
export type Site={id:string;name:string;links:readonly string[];icon:string};
export type SliceAction='collect'|'repair'|'rescue'|'signal'|'allocate'|'reclaim'|'scan'|'align'|'restart';
export type Command={kind:'move';to:string}|{kind:'act';action:SliceAction};
export type SliceState={at:string;flags:readonly string[];power:Readonly<Record<string,number>>;won:boolean;message:string};
export type SliceMission={id:SliceId;sites:readonly Site[];goal:string};
export const SLICE_MISSIONS:Readonly<Record<SliceId,SliceMission>>={
 13:{id:13,goal:'Find a tool, repair the bridge, rescue the lost robot and bring it home.',sites:[
 {id:'home',name:'Base',icon:'🏠',links:['tools','lookout']},{id:'tools',name:'Tool cache',icon:'🔧',links:['home','lookout','bridge']},{id:'lookout',name:'Lookout',icon:'🌲',links:['home','tools','bridge']},{id:'bridge',name:'Broken bridge',icon:'🌉',links:['tools','lookout','robot']},{id:'robot',name:'Lost robot',icon:'🤖',links:['bridge']}]},
 14:{id:14,goal:'Switch both waiting convoy signals to safe, then reach the terminal.',sites:[
 {id:'home',name:'Dispatch',icon:'🏠',links:['north','south']},{id:'north',name:'North signal',icon:'🚦',links:['home','junction']},{id:'south',name:'South signal',icon:'🚦',links:['home','junction']},{id:'junction',name:'Rail junction',icon:'🔀',links:['north','south','terminal']},{id:'terminal',name:'Arrival',icon:'🏁',links:['junction']}]},
 15:{id:15,goal:'Share three energy units: one for the shelter, two for the lift. Return to the station.',sites:[
 {id:'home',name:'Power station',icon:'🔋',links:['shelter','hub']},{id:'shelter',name:'Shelter',icon:'🏡',links:['home','hub']},{id:'hub',name:'Energy junction',icon:'🔀',links:['home','shelter','lift']},{id:'lift',name:'Rescue lift',icon:'⚡',links:['hub']}]},
 16:{id:16,goal:'Scan the guardian fault, align both switches, then restart the guardian.',sites:[
 {id:'home',name:'Citadel entrance',icon:'🏰',links:['scanner','east']},{id:'scanner',name:'Diagnostic console',icon:'🔍',links:['home','west','east']},{id:'west',name:'West switch',icon:'🔌',links:['scanner','east','guardian']},{id:'east',name:'East switch',icon:'🔌',links:['home','scanner','west','guardian']},{id:'guardian',name:'Guardian',icon:'🤖',links:['west','east']}]}
};
export const startSlice=():SliceState=>({at:'home',flags:[],power:{shelter:0,lift:0},won:false,message:'Choose a route.'});
const has=(s:SliceState,k:string)=>s.flags.includes(k);
export function sliceActions(id:SliceId,at:string):readonly SliceAction[]{
 if(id===13)return at==='tools'?['collect']:at==='bridge'?['repair']:at==='robot'?['rescue']:[];
 if(id===14)return at==='north'||at==='south'?['signal']:[];
 if(id===15)return at==='shelter'||at==='lift'?['allocate','reclaim']:[];
 return at==='scanner'?['scan']:at==='east'||at==='west'?['align']:at==='guardian'?['restart']:[];
}
export function stepSlice(id:SliceId,s:SliceState,c:Command):SliceState{
 if(s.won)return s;
 const say=(message:string):SliceState=>({...s,message});
 const mark=(flag:string,message:string):SliceState=>has(s,flag)?say('Already done.'):({...s,flags:[...s.flags,flag],message});
 if(c.kind==='move'){
   const site=SLICE_MISSIONS[id].sites.find(n=>n.id===s.at);
   if(!site?.links.includes(c.to))return say('Choose a connected location.');
   if(id===13&&c.to==='robot'&&!has(s,'bridge'))return say('Repair the bridge first.');
   const won=id===13&&c.to==='home'&&has(s,'robot')||id===14&&c.to==='terminal'&&has(s,'north')&&has(s,'south')||id===15&&c.to==='home'&&s.power.shelter===1&&s.power.lift===2;
   return {...s,at:c.to,won,message:won?'Mission complete!':'Arrived. Look for your next goal.'};
 }
 if(!sliceActions(id,s.at).includes(c.action))return say('That action is not available here.');
 switch(c.action){
  case 'collect':return mark('tool','Tool collected!');
  case 'repair':return has(s,'tool')?mark('bridge','Bridge repaired!'):say('Find the tool first.');
  case 'rescue':return has(s,'bridge')?mark('robot','Robot rescued. Bring it home!'):say('Repair the bridge first.');
  case 'signal':return mark(s.at,'Safe signal sent.');
  case 'allocate':{
   if(s.power.shelter+s.power.lift>=3)return say('No energy left. Reclaim a unit if needed.');
   return {...s,power:{...s.power,[s.at]:s.power[s.at]+1},message:'Energy delivered.'};
  }
  case 'reclaim':return s.power[s.at]>0?{...s,power:{...s.power,[s.at]:s.power[s.at]-1},message:'Energy reclaimed.'}:say('No energy here.');
  case 'scan':return mark('scan','Fault found: align both switches.');
  case 'align':return has(s,'scan')?mark(s.at,'Switch aligned.'):say('Scan the fault first.');
  case 'restart':return has(s,'scan')&&has(s,'west')&&has(s,'east')?{...s,won:true,message:'Guardian restored!'}:say('Scan and align both switches first.');
 }
}
