import {ARINA_RUNTIME_SYSTEM} from './arina-persona.js';
/** Standalone Arina Telegram personality on a verified-free OpenRouter route.
 * No FEZI website required for text replies. No paid provider models, no paid
 * reseller key, no unsolicited messages. Does not pretend to be a real person.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const positive=(x,d,max)=>{const v=Number(x);return Number.isInteger(v)&&v>0?Math.min(v,max):d};
export function configuredArinaFreeModel(env=process.env){
 const model=String(env.ARINA_FREE_MODEL||'openrouter/free');
 return model==='openrouter/free'||(/^[A-Za-z0-9._:/-]{3,160}:free$/.test(model))?model:null;
}
export function createArinaStandaloneChat({dataDir,env=process.env,fetchImpl=fetch,now=Date.now}={}){
 if(!dataDir)throw Error('dataDir required');
 const token=env.OPENROUTER_API_KEY||'',model=configuredArinaFreeModel(env),enabled=env.ARINA_STANDALONE_CHAT_ENABLED==='true'&&!!token&&!!model;
 const userLimit=positive(env.ARINA_FREE_CHAT_PER_USER_DAY,5,30),globalLimit=positive(env.ARINA_FREE_CHAT_GLOBAL_DAY,20,200);
 const dir=path.join(dataDir,'arina-standalone-chat'),file=path.join(dir,'sessions.json');
 let state={sessions:{},counts:{}};let serial=Promise.resolve();const lastSent=new Map();
 async function init(){await fs.mkdir(dir,{recursive:true,mode:0o700});try{const x=JSON.parse(await fs.readFile(file,'utf8'));if(x&&x.sessions&&x.counts)state=x}catch(e){if(e.code!=='ENOENT')throw e}}
 async function save(){serial=serial.then(async()=>{const tmp=file+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify(state),{mode:0o600});await fs.rename(tmp,file)});await serial}
 async function reply({telegramId,content,language='fa'}){
  if(!enabled)throw fail('Arina independent free chat is not configured',503);
  const id=String(telegramId||''),message=String(content||'').trim();
  if(!/^\d{2,20}$/.test(id))throw fail('Invalid Telegram user');
  if(message.length<2||message.length>600)throw fail('Message must have 2–600 characters');
  if(now()-(lastSent.get(id)||0)<8000)throw fail('Please wait between messages',429);
  const date=new Date(now()).toISOString().slice(0,10),userKey=date+':'+id,globalKey=date+':global';
  if((state.counts[userKey]||0)>=userLimit||(state.counts[globalKey]||0)>=globalLimit)throw fail('Daily free chat limit reached',429);
  const recent=(state.sessions[id]?.history||[]).slice(-6);
  const instructions=ARINA_RUNTIME_SYSTEM;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
  try{
   const r=await fetchImpl('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','X-Title':'FEZI Arina Chat'},body:JSON.stringify({model,messages:[{role:'system',content:instructions},...recent,{role:'user',content:message}],max_tokens:250,temperature:.75,stream:false}),signal:controller.signal,redirect:'error'});
   if(!r.ok)throw fail(r.status===429?'Free provider quota reached':'Free model service unavailable',r.status===429?429:502);
   const raw=await r.json(),answer=String(raw?.choices?.[0]?.message?.content||'').trim().slice(0,1400);
   if(!answer)throw fail('Free model returned no answer',502);
   const history=[...recent,{role:'user',content:message},{role:'assistant',content:answer}].slice(-6);
   state.sessions[id]={history,updatedAt:new Date(now()).toISOString()};state.counts[userKey]=(state.counts[userKey]||0)+1;state.counts[globalKey]=(state.counts[globalKey]||0)+1;
   for(const key of Object.keys(state.counts))if(!key.startsWith(date+':'))delete state.counts[key];
   await save();lastSent.set(id,now());
   return {answer,character:'Arina',remaining:Math.max(0,userLimit-state.counts[userKey])};
  }catch(e){if(e.name==='AbortError')throw fail('Free provider timeout',504);throw e}finally{clearTimeout(timer)}
 }
 return {init,reply,ready:enabled,model,quota:{userLimit,globalLimit}};
}
