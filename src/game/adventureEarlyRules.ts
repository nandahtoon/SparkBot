import type {Site,SliceState,SliceAction,Command} from './adventureRuleSlice';
export type EarlyId=1|2|3|4|5|6|7|8;
export type EarlyAction='fit-wheels'|'fit-treads'|'load-cargo'|'deliver'|'jump-short'|'jump-long'|'place-plank'|'lock-plank'|'test-bridge'|'pattern-move'|'pattern-turn'|'trace-loop'|'clear-pattern'|'boost'|'lower-lift'|'wait'|'hop'|'charge'|'rotate-wire'|'energize';
const site=(id:string,name:string,icon:string,links:string[]):Site=>({id,name,icon,links});
export const EARLY_MISSIONS:Readonly<Record<EarlyId,{id:EarlyId;goal:string;sites:readonly Site[]}>>={
 1:{id:1,goal:'Fit wheels, pick up the parcel, and deliver it to the charging dock.',sites:[site('home','Workshop','🔧',['dock']),site('dock','Charging dock','📦',['home'])]},
 2:{id:2,goal:'Jump a short gap to the island, then a long gap to the safe bank.',sites:[site('home','Start bank','🏁',['island']),site('island','Rest island','🏝️',['home','finish']),site('finish','Safe bank','🚩',['island'])]},
 3:{id:3,goal:'Place and lock a bridge plank, test it, then cross to the far bank.',sites:[site('home','Construction yard','🪵',['bridge']),site('bridge','Bridge frame','🌉',['home','finish']),site('finish','Far bank','🚩',['bridge'])]},
 4:{id:4,goal:'Choose treads for mud, or wheels for the dry trail. At camp, make a MOVE then TURN pattern and repeat it.',sites:[site('home','Parts station','🔧',['mud','dry']),site('mud','Muddy trail','🌱',['home','camp']),site('dry','Dry trail','☀️',['home','camp']),site('camp','Loop camp','🏕️',['mud','dry'])]},
 5:{id:5,goal:'Load cargo at the valley. Boost the lift twice to climb to the summit, then deliver.',sites:[site('home','Valley cargo','📦',['lift']),site('lift','Lift platform','⬆️',['home','summit']),site('summit','Summit station','🏔️',['lift'])]},
 6:{id:6,goal:'Watch the platforms. Hop only when the next platform is aligned. Wait safely if needed.',sites:[site('home','First island','🏝️',['middle']),site('middle','Moving island','🌊',['home','finish']),site('finish','Last island','🚩',['middle'])]},
 7:{id:7,goal:'Reach the destination using battery power. Choose a charging stop before crossing the long trail.',sites:[site('home','Battery base','🔋',['short','charger']),site('short','Long trail entrance','🪨',['home','finish','charger']),site('charger','Solar charger','☀️',['home','short','finish']),site('finish','Research station','🏁',['short','charger'])]},
 8:{id:8,goal:'Rotate both network switches to connect their cores. Energize the reactor when both routes are ready.',sites:[site('home','Reactor hub','⚙️',['a','b']),site('a','Core A switch','💡',['home','b','reactor']),site('b','Core B switch','💡',['home','a','reactor']),site('reactor','Main reactor','⚡',['a','b'])]}
};
export function isEarlyId(id:number):id is EarlyId{return Number.isInteger(id)&&id>=1&&id<=8;}
export function earlyActions(id:EarlyId,at:string):readonly EarlyAction[]{
 switch(id){
  case 1:return at==='home'?['fit-wheels','load-cargo']:at==='dock'?['deliver']:[];
  case 2:return at==='home'||at==='island'?['jump-short','jump-long']:[];
  case 3:return at==='bridge'?['place-plank','lock-plank','test-bridge']:[];
  case 4:return at==='home'?['fit-wheels','fit-treads']:at==='camp'?['pattern-move','pattern-turn','trace-loop','clear-pattern']:[];
  case 5:return at==='home'?['load-cargo']:at==='lift'?['boost','lower-lift']:at==='summit'?['deliver']:[];
  case 6:return at==='home'||at==='middle'?['wait','hop']:[];
  case 7:return at==='charger'||at==='home'?['charge']:[];
  case 8:return at==='a'||at==='b'?['rotate-wire']:at==='reactor'?['energize']:[];
 }
}
export function stepEarly(id:EarlyId,s:SliceState,c:Command):SliceState{
 if(s.won)return s;
 const has=(f:string)=>s.flags.includes(f);
 const say=(message:string):SliceState=>({...s,message});
 const mark=(f:string,message:string):SliceState=>has(f)?say('Already done.'):{...s,flags:[...s.flags,f],message};
 const win=(message:string):SliceState=>({...s,won:true,message});
 const val=(key:string,initial=0)=>s.power[key]??initial;
 const set=(key:string,value:number,message:string):SliceState=>({...s,power:{...s.power,[key]:value},message});
 if(c.kind==='move'){
  if(!EARLY_MISSIONS[id].sites.find(n=>n.id===s.at)?.links.includes(c.to))return say('Choose a connected location.');
  if(id===1&&(!has('wheels')||!has('cargo')))return say('Fit wheels and load the parcel first.');
  if(id===2||id===6)return say('Use a jump or hop to cross.');
  if(id===3&&c.to==='finish'&&!has('tested'))return say('Test the locked bridge first.');
  if(id===4&&c.to==='mud'&&!has('treads'))return say('Mud needs treads. Try the dry trail or change parts.');
  if(id===4&&c.to==='dry'&&!has('wheels')&&!has('treads'))return say('Fit wheels or treads first.');
  if(id===5&&c.to==='summit'&&(val('height')!==2||!has('cargo')))return say('Load cargo and lift to the summit first.');
  if(id===7){
   const cost=(s.at==='short'&&c.to==='finish')||(s.at==='finish'&&c.to==='short')?3:1;
   const energy=val('battery',2);
   if(energy<cost)return say('Not enough energy. Choose the solar charger.');
   return {...s,at:c.to,power:{...s.power,battery:energy-cost},won:c.to==='finish',message:c.to==='finish'?'Station reached!':'Travel used '+cost+' energy.'};
  }
  return {...s,at:c.to,won:id===3&&c.to==='finish',message:id===3&&c.to==='finish'?'Bridge crossing complete!':'Arrived.'};
 }
 if(!earlyActions(id,s.at).includes(c.action as EarlyAction))return say('That action is not available here.');
 switch(c.action){
  case 'fit-wheels':case 'fit-treads':return {...s,flags:[...s.flags.filter(f=>f!=='wheels'&&f!=='treads'),c.action==='fit-wheels'?'wheels':'treads'],message:'Parts fitted.'};
  case 'load-cargo':return id===1&&!has('wheels')?say('Fit wheels first.'):mark('cargo','Cargo loaded.');
  case 'deliver':return has('cargo')?win('Delivery complete!'):say('Collect cargo first.');
  case 'jump-short':case 'jump-long':{
   const correct=s.at==='home'?'jump-short':'jump-long';
   if(c.action!==correct)return say('That jump is the wrong length. Try again safely.');
   const at=s.at==='home'?'island':'finish';return {...s,at,won:at==='finish',message:at==='finish'?'Safe crossing!':'Landed safely.'};
  }
  case 'place-plank':return mark('plank','Plank placed.');
  case 'lock-plank':return has('plank')?mark('locked','Plank locked.'):say('Place the plank first.');
  case 'test-bridge':return has('locked')?mark('tested','Bridge is ready!'):say('Lock the plank first.');
  case 'pattern-move':return val('pattern')===0?set('pattern',1,'MOVE added.'):say('Start a new pattern or add TURN.');
  case 'pattern-turn':return val('pattern')===1?set('pattern',2,'TURN added.'):say('Add MOVE first.');
  case 'clear-pattern':return set('pattern',0,'Pattern cleared.');
  case 'trace-loop':return val('pattern')===2?win('MOVE, TURN repeated twice. Trail pattern complete!'):say('Build a MOVE, TURN pattern first.');
  case 'boost':return !has('cargo')?say('Load cargo first.'):set('height',Math.min(2,val('height')+1),'Lift rises.');
  case 'lower-lift':return set('height',Math.max(0,val('height')-1),'Lift lowers.');
  case 'wait':return set('phase',1-val('phase'),'Platform position changed.');
  case 'hop':{
   const aligned=s.at==='home'?val('phase')===1:val('phase')===0;
   if(!aligned)return say('Wait for the platform to align.');
   const at=s.at==='home'?'middle':'finish';return {...s,at,won:at==='finish',message:at==='finish'?'Island crossing complete!':'Safe landing.'};
  }
  case 'charge':return set('battery',3,'Battery charged.');
  case 'rotate-wire':return set(s.at,1-val(s.at),'Switch rotated.');
  case 'energize':return val('a')===1&&val('b')===1?win('Both cores powered!'):say('Connect both core switches first.');
  default:return say('That action is not available here.');
 }
}
export function earlyStatus(id:EarlyId,s:SliceState):string{
 switch(id){
  case 1:return 'Wheels '+(s.flags.includes('wheels')?'✓':'○')+' · Cargo '+(s.flags.includes('cargo')?'✓':'○');
  case 2:return s.at==='home'?'Short gap · choose jump length':s.at==='island'?'Long gap · choose jump length':'Safe bank';
  case 3:return ['plank','locked','tested'].map(f=>f+' '+(s.flags.includes(f)?'✓':'○')).join(' · ');
  case 4:return 'Equipment: '+(s.flags.includes('treads')?'Treads':s.flags.includes('wheels')?'Wheels':'None')+' · Pattern: '+((s.power.pattern??0)===2?'MOVE → TURN':s.power.pattern===1?'MOVE':'Empty');
  case 5:return 'Cargo '+(s.flags.includes('cargo')?'✓':'○')+' · Lift height '+(s.power.height??0)+'/2';
  case 6:return 'Next platform: '+((s.power.phase??0)===(s.at==='home'?1:0)?'Aligned ✓':'Not aligned');
  case 7:return 'Battery '+(s.power.battery??2)+'/3';
  case 8:return 'Core A '+(s.power.a?'Connected':'Open')+' · Core B '+(s.power.b?'Connected':'Open');
 }
}
