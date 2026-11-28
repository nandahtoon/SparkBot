// Cancelled or disposed frame callbacks must never restart a render chain.
export function createRescueFrameChain(request:(cb:(time:number)=>void)=>number,cancel:(id:number)=>void){
 let generation=0,pending:number|null=null,disposed=false;
 function stop(){generation++;if(pending!==null)cancel(pending);pending=null;}
 function start(step:(time:number)=>boolean){
  stop();if(disposed)return;
  const token=generation;
  const tick=(time:number)=>{
   if(disposed||token!==generation)return;
   pending=null;
   const more=step(time);
   if(more&&!disposed&&token===generation)pending=request(tick);
  };
  pending=request(tick);
 }
 return {start,stop,dispose(){disposed=true;stop();},isPending:()=>pending!==null};
}
