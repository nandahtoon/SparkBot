import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const state=JSON.parse(read('docs/PROJECT_STATE.json'));
const errors=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg)};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const canonical='nandahtoon/SparkBot';
check(state.schemaVersion===1,'Unsupported state schema');
check(state.repository?.fullName===canonical&&state.repository?.id===1467911889&&state.repository?.url==='https://github.com/'+canonical,'Wrong repository identity');
check(state.branches?.stable==='main'&&state.branches?.integration==='integration/sb-08r'&&state.branches?.topicPrefix==='sb-','Unexpected branch contract; review and update checker together');
check(state.release?.production==='HOLD'&&state.release?.commercial==='HOLD'&&state.release?.native==='HOLD','Release hold changed; explicit reviewed policy update required');
check(state.product?.campaignMissions===24&&state.product?.gameRoomActivities===7,'Baseline content changed; review and update contract');
check(Array.isArray(state.requiredReads)&&state.requiredReads.length>=6,'Missing required reading');
for(const p of state.requiredReads??[]){
 const safe=typeof p==='string'&&!path.isAbsolute(p)&&!p.split('/').includes('..');
 check(safe&&fs.existsSync(path.join(root,safe?p:'__invalid__')),'Missing/invalid required file: '+p);
}
check(typeof state.work?.stage==='string'&&typeof state.work?.nextGate==='string'&&state.work?.nextGate.length>0,'Missing active work or gate');
for(const p of ['AGENTS.md','docs/START_HERE.md','docs/AI_START_PROMPT.md']){
 const s=read(p);check(s.includes(canonical)&&s.includes(state.branches.integration),'Handoff identity/branch drift in '+p);
}
if(process.env.GITHUB_REPOSITORY)check(process.env.GITHUB_REPOSITORY.toLowerCase()===canonical.toLowerCase(),'CI running in wrong repository');
if(process.argv.includes('--preflight')){
 try{
  const remote=git('remote','get-url','origin').replace(/\.git$/,'');
  check(['https://github.com/nandahtoon/SparkBot','git@github.com:nandahtoon/SparkBot','ssh://git@github.com/nandahtoon/SparkBot'].some(x=>x.toLowerCase()===remote.toLowerCase()),'origin is not canonical SparkBot');
  const branch=git('branch','--show-current');
  check(branch.startsWith(state.branches.topicPrefix)&&branch.length>state.branches.topicPrefix.length,'Use a scoped topic branch, not main/integration/detached HEAD');
  const ref='refs/remotes/origin/'+state.branches.integration;
  git('merge-base','--is-ancestor',ref,'HEAD');
 }catch{errors.push('Git preflight failed: fetch origin and reconcile current integration head; do not discard changes.');}
}
if(errors.length){for(const e of errors)console.error('FAIL: '+e);process.exitCode=1;}
else console.log('SparkBot context PASS: '+state.work.stage+' / '+state.work.status+' / release HOLD');
