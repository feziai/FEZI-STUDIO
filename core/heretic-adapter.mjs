// FEZI Studio: optional on-prem Heretic integration.
// No cloud-provider bypass; no image/video diffusion filter modification.
// AGPL-3.0 upstream remains a separately installed Python program.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {constants} from 'node:fs';

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,90}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$/;
const MAX_MS = 8 * 60 * 60 * 1000;
const CAPABILITY = Object.freeze({
  source:'https://github.com/p-e-w/heretic',
  license:'AGPL-3.0-or-later',
  categories:['local-language-model','supported-multimodal-llm'],
  notSupported:['external API safety bypass','hosted image generators','hosted video generators','diffusion model filters'],
  note:'Heretic modifies compatible model weights. It is not a universal image/video filter-removal extension.'
});

export function modelIdValid(v){return typeof v==='string'&&MODEL_ID.test(v)&&!v.split('/').some(x=>x==='.'||x==='..');}

export function createHereticAdapter({env=process.env,spawnProcess=spawn,access=fs.access}={}){
 const enabled=env.HERETIC_ENABLED==='true';
 const executable=String(env.HERETIC_CLI_PATH||'');
 const allowed=[...new Set(String(env.HERETIC_ALLOWED_MODELS||'').split(',').map(x=>x.trim()).filter(modelIdValid))];
 const maxMs=Math.min(MAX_MS,Math.max(60_000,Number(env.HERETIC_MAX_RUNTIME_MS)||MAX_MS));
 let current=null;
 let child=null;
 let timer=null;
 let history=null;
 const snapshot=()=>current?{
    id:current.id,modelId:current.modelId,state:current.state,
    startedAt:current.startedAt,endedAt:current.endedAt,exitCode:current.exitCode,
    error:current.error
  }:null;
 async function installed(){
   if(!path.isAbsolute(executable))return false;
   try{await access(executable,constants.X_OK);return true}catch{return false}
 }
 async function status(){
   const ok=await installed();
   return {name:'Heretic',enabled,installed:ok,ready:enabled&&ok&&allowed.length>0,
     allowedModels:allowed,capability:CAPABILITY,job:snapshot(),lastJob:history};
 }
 async function launch(modelId){
   if(!modelIdValid(modelId)||!allowed.includes(modelId))throw Object.assign(new Error('Model is not on server allowlist'),{status:400});
   if(!enabled||!await installed())throw Object.assign(new Error('Heretic CLI is not installed/enabled on private GPU host'),{status:503});
   if(current?.state==='running')throw Object.assign(new Error('A Heretic job is already running'),{status:409});
   const job={id:'heretic-'+Date.now().toString(36),modelId,state:'running',startedAt:new Date().toISOString(),endedAt:null,exitCode:null,error:null};
   current=job;
   const safeEnv={PATH:env.PATH||'',HOME:env.HOME||'',CUDA_VISIBLE_DEVICES:env.CUDA_VISIBLE_DEVICES||'',HF_HOME:env.HF_HOME||'',HF_TOKEN:env.HF_TOKEN||''};
   try{
     child=spawnProcess(executable,[modelId],{shell:false,windowsHide:true,env:safeEnv,stdio:['ignore','ignore','ignore']});
   }catch(e){job.state='failed';job.error='process could not start';job.endedAt=new Date().toISOString();throw Object.assign(new Error('Failed to start Heretic'),{status:503});}
   const launched=child;
   let finished=false;
   function finish(state,code,reason){if(finished)return;finished=true;clearTimeout(timer);timer=null;job.state=state;job.exitCode=Number.isInteger(code)?code:null;job.error=reason||null;job.endedAt=new Date().toISOString();history={...job};if(child===launched)child=null;}
   launched.once('error',()=>finish('failed',null,'process could not start'));
   launched.once('close',code=>finish(code===0?'completed':'failed',code,code===0?null:'CLI exited nonzero or requested interactive input'));
   timer=setTimeout(()=>{if(launched.exitCode===null){launched.kill('SIGTERM');finish('stopped',null,'runtime limit reached')}},maxMs);
   timer.unref?.();
   return snapshot();
 }
 function stop(){
   if(!child||current?.state!=='running')throw Object.assign(new Error('No running job'),{status:409});
   child.kill('SIGTERM');
   return {stopping:true,jobId:current.id};
 }
 return {status,launch,stop,capability:CAPABILITY};
}
