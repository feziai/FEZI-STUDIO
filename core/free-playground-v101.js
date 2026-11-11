/** Public discovery plus verified-free text routing. Never sends keys to browsers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import models from '../config/hf-playground-curated-v101.json' with {type:'json'};
import {askProvider} from '../integrations.js';
import {getOllamaModels} from './fezi-router.js';

export const HF_CURATED = Object.freeze(models.map(x=>Object.freeze({...x})));
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const safeId=id=>/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.:-]{1,180}$/.test(String(id||''));
const cache=new Map();
async function cached(key,fn,{ms=600_000,clock=Date.now}={}){
 const t=clock();const c=cache.get(key);if(c&&c.expires>t)return c.value;
 const value=await fn();cache.set(key,{expires:t+ms,value});return value;
}
export function curatedCatalog({mature=false}={}){return HF_CURATED.filter(m=>mature||!m.adultCatalog).map(m=>({...m,execution:'catalog-only',runnable:false,priceStatus:'Weights may be accessible without a charge; API inference is not guaranteed free',licenseVerified:false}));}
export function normalizeHFResults(list,task,{mature=false}={}){
 if(!Array.isArray(list))throw fail('Hugging Face returned an invalid catalog',502);
 return list.filter(x=>x&&!x.private&&!x.gated&&safeId(x.id)).slice(0,80).filter(x=>mature||!/(?:uncensored|nsfw|porn|adult|erotic|nude)/i.test(String(x.id)+' '+(x.tags||[]).join(' ')))
   .map(x=>({id:x.id,name:x.id.split('/').pop(),task,adultCatalog:/(?:uncensored|nsfw|adult|erotic)/i.test(x.id),source:'Hugging Face',sourceUrl:'https://huggingface.co/'+x.id,weightAccess:'public-model-listing',inferenceProviderListed:true,verifiedInference:false,execution:'provider-listed-not-activated',runnable:false,paid:false,licenseStatus:String(x.cardData?.license||x.license||'License requires verification').slice(0,100),notes:'Check actual inference provider, quota, license and commercial permissions before enabling',requestedDurationOptionsSec:task==='video'?[5]:null}));
}
export async function discoverHF(task,{mature=false,fetchImpl=fetch}={}){
 if(!['image','video','chat'].includes(task))throw fail('Unknown task');
 const tag={image:'text-to-image',video:'text-to-video',chat:'text-generation'}[task];
 const endpoint='https://huggingface.co/api/models?'+new URLSearchParams({inference_provider:'all',pipeline_tag:tag,sort:'downloads',direction:'-1',limit:'60'});
 return cached('hf-'+task+'-'+(mature?'18':'safe'),async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{const r=await fetchImpl(endpoint,{headers:{accept:'application/json','user-agent':'FEZI-Studio/1.01'},signal:controller.signal,redirect:'error'});
   if(!r.ok)throw fail('Hugging Face catalog temporarily unavailable',502);
   const raw=await r.json();return normalizeHFResults(raw,task,{mature});
  }catch(e){if(e.name==='AbortError')throw fail('Hugging Face request timed out',504);throw e}finally{clearTimeout(timer)}
 },{ms:600_000});
}
const isZero=x=>{const n=Number(x);return x!==null&&x!==undefined&&x!==''&&Number.isFinite(n)&&n===0};
export function normalizeOpenRouterFree(data){
 if(!Array.isArray(data?.data))throw fail('OpenRouter catalog invalid',502);
 return data.data.filter(x=>x&&/^[A-Za-z0-9_.:/-]{3,180}$/.test(String(x.id||''))&&x.id.endsWith(':free')&&isZero(x.pricing?.prompt)&&isZero(x.pricing?.completion))
  .slice(0,60).map(x=>({id:x.id,name:String(x.name||x.id).slice(0,140),task:'chat',source:'OpenRouter',sourceUrl:'https://openrouter.ai/'+x.id,execution:'free-api-rate-limited',runnable:false,paid:false,verifiedInference:false,notes:'Advertised $0 model with free rate limits; availability may vary'}));
}
export async function listOpenRouterFree({fetchImpl=fetch}={}){
 return cached('or-free',async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{
  const r=await fetchImpl('https://openrouter.ai/api/v1/models',{headers:{accept:'application/json'},signal:controller.signal,redirect:'error'});
  if(!r.ok)throw fail('Free model discovery unavailable',502);return normalizeOpenRouterFree(await r.json());
 }catch(e){if(e.name==='AbortError')throw fail('Free model catalog timed out',504);throw e}finally{clearTimeout(timer)}},{ms:600_000});
}
function response(res,status,data){const b=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':b.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b);return true}
async function readJson(req){let size=0,parts=[];for await(const c of req){size+=c.length;if(size>50000)throw fail('Request too large',413);parts.push(c)}try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw fail('Invalid JSON',400)}}

/** Optional, explicitly authorized Hugging Face Spaces embeds; no scraping or hidden GPU access. */
export function allowedHfSpaces(env=process.env){
 let items=[];try{items=JSON.parse(env.FEZI_APPROVED_HF_SPACES_JSON||'[]')}catch{return []}
 if(!Array.isArray(items))return [];
 return items.slice(0,8).flatMap(x=>{
  if(!x||typeof x!=='object'||!['video','image','chat'].includes(x.task))return [];
  try{const u=new URL(x.url);
   if(u.protocol!=='https:'||!u.hostname.endsWith('.hf.space')||u.username||u.password||u.search||u.hash||u.pathname!=='/')return [];
   if(!/^[a-z0-9-]+\.hf\.space$/.test(u.hostname))return [];
   return [{id:String(x.id||u.hostname).slice(0,60),name:String(x.name||u.hostname).slice(0,120),task:x.task,url:u.href,operatorApproved:true,externalHosting:true}]
  }catch{return []}
 });
}

export function createFreePlayground({studio,dataDir,env=process.env,fetchImpl=fetch,ask=askProvider,clock=Date.now,agentRun=null,installedModels=getOllamaModels}={}){
 const freeConfigured=()=>Boolean(env.OPENROUTER_API_KEY&&env.FEZI_FREE_ROUTING_ENABLED==='true');
 const file=path.join(dataDir,'free-playground-v101','quota.json');let usage={};let serial=Promise.resolve();
 const recentRequests=new Map();
 function rateAgent(user){
  const key=String(user.id),now=clock();const recent=(recentRequests.get(key)||[]).filter(t=>now-t<60000);
  if(recent.length>=12)throw fail('Too many requests. Try again shortly.',429);
  recent.push(now);recentRequests.set(key,recent);if(recentRequests.size>5000)recentRequests.clear();
 }
 function premiumModels(){
  let data=[];try{data=JSON.parse(env.FEZI_PAID_MODELS_JSON||JSON.stringify([{id:'paid:openai',name:'OpenAI · مدل‌های پیشرفته',task:'chat'},{id:'paid:gemini',name:'Google Gemini · مدل‌های پولی',task:'chat'},{id:'paid:grok',name:'Grok · مدل‌های پولی',task:'chat'},{id:'paid:mistral',name:'Mistral · مدل‌های پولی',task:'chat'},{id:'paid:video',name:'مدل‌های ویدیوساز تجاری',task:'video'},{id:'paid:image',name:'مدل‌های تصویر تجاری',task:'image'}]))}catch{return []}
  if(!Array.isArray(data))return [];return data.slice(0,60).filter(x=>x&&['chat','code','image','video'].includes(x.task)&&typeof x.name==='string'&&typeof x.id==='string'&&x.id.length<150).map(x=>({id:x.id,name:x.name.slice(0,100),task:x.task,kind:'premium',free:false,configured:false,note:'نیاز به خرید اعتبار و فعال‌سازی اتصال مجاز'}));
 }
 async function init(){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});try{usage=JSON.parse(await fs.readFile(file,'utf8'));if(!usage||Array.isArray(usage)||typeof usage!=='object')throw Error('Invalid data')}catch(e){if(e.code!=='ENOENT')throw e} }
 async function debit(user){
  const dailyLimit=Math.min(10,Math.max(1,Number(env.FEZI_FREE_CHAT_PER_USER_DAY)||3));
  const globalLimit=Math.min(40,Math.max(1,Number(env.FEZI_FREE_CHAT_GLOBAL_DAY)||20));
  const today=new Date(clock()).toISOString().slice(0,10),userKey=today+':'+String(user.id),globalKey=today+':global';
  const run=serial.then(async()=>{
   if((usage[userKey]||0)>=dailyLimit|| (usage[globalKey]||0)>=globalLimit)throw fail('Free daily request quota reached',429);
   usage[userKey]=(usage[userKey]||0)+1;usage[globalKey]=(usage[globalKey]||0)+1;
   for(const k of Object.keys(usage))if(!k.startsWith(today+':'))delete usage[k];
   const temp=file+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(usage),{mode:0o600});await fs.rename(temp,file);
  });serial=run.catch(()=>{});await run;
  return {dailyLimit,globalLimit,remaining:Math.max(0,dailyLimit-usage[userKey])};
 }
 async function handle(req,res,url,search=''){
  if(req.method==='GET'&&url==='/api/fezi-playground/readiness'){
   let installed=[];try{installed=await installedModels()}catch{}
   if(!Array.isArray(installed))installed=[];
   const ollamaConnected=installed.length>0;
   const freeProviderConfigured=freeConfigured();
   return response(res,200,{
    localOllama:{connectedWithModels:ollamaConnected,installedModels:installed.slice(0,30),modelCount:installed.length,readyForRequests:ollamaConnected},
    freeApi:{configured:freeProviderConfigured,liveVerified:false,quotaEnforced:true},
    imageGeneration:{configured:Boolean(env.FEZI_GPU_WORKER_URL),liveVerified:false},
    videoGeneration:{configured:Boolean(env.FEZI_GPU_WORKER_URL),liveVerified:false},
    codeAgent:{catalogInstalled:false,note:'Cline/OpenCode/OpenHands require a separate installed runtime or authorized worker'},
    freeAgentReady:ollamaConnected||freeProviderConfigured,
    limits:'Catalog means listed, not installed. Configured does not mean live-tested; check real execution before release.'
   });
  }
  if(req.method==='GET'&&url==='/api/fezi-playground/options'){
   let local=[];try{local=await installedModels()}catch{}
   if(!Array.isArray(local))local=[];
   const free=[...local.slice(0,25).filter(m=>/^[a-zA-Z0-9_.:/-]{2,160}$/.test(m)).map(m=>({id:m,name:'Ollama · '+m,task:'chat',kind:'ollama',free:true,configured:true,note:'مدل محلی نصب‌شده؛ بدون پرداخت API'})),
    {id:'tool:image',name:'استودیو تصویر رایگان',task:'image',kind:'tool',free:true,configured:false,note:'ورود به استودیو؛ تولید واقعی به GPU Worker متصل نیاز دارد'},
    {id:'tool:video',name:'ویدیو استودیو رایگان',task:'video',kind:'tool',free:true,configured:false,note:'ورود به ویدیو استودیو؛ اجرای واقعی نیازمند Worker است'},
    {id:'tool:code',name:'FEZI Agent · ساخت برنامه',task:'code',kind:'tool',free:true,configured:false,note:'ورود به Builder؛ عامل کدنویس به runtime متصل نیاز دارد'}];
   return response(res,200,{free,paid:premiumModels(),defaultModel:'auto',billingAutomatic:false,policy:'FEZI Agent and configured local models never call paid APIs without explicit separate authorization. Free cloud providers may have quotas.'});
  }
  if(req.method==='POST'&&url==='/api/fezi-playground/agent-chat'){
   const u=studio.getAccount(req);if(!u)throw fail('Sign in to FEZI Studio with Google or your FEZI account',401);
   const b=await readJson(req),prompt=String(b?.prompt||'').trim(),model=String(b?.model||'auto');
   if(prompt.length<2||prompt.length>32000)throw fail('Prompt must be 2–32000 characters');
   rateAgent(u);
   if(model!=='auto'){
    const registered=await installedModels().catch(()=>[]);
    if(!Array.isArray(registered)||!registered.includes(model))throw fail('Model is not installed and available locally',422);
    const answer=await ask({provider:'ollama',model,system:'You are FEZI Agent. Answer in user language, do not invent actions. Provide helpful answers.',user:prompt,responseFormat:'text'});
    if(!answer?.trim())throw fail('Installed local model did not respond',502);
    return response(res,200,{answer,free:true,billed:false,route:'local'});
   }
   if(agentRun){
    try{const result=await agentRun({system:'FEZI Studio Playground free-first assistant. Give accurate answers. Do not claim tools or media you did not run.',user:prompt,prompt,offlineOnly:true});
     if(typeof result?.text==='string'&&result.text.trim())return response(res,200,{answer:result.text,free:true,billed:false,route:'local'});
    }catch(e){if(!freeConfigured())throw fail('No working local free model. Install Ollama or configure approved free provider.',503)}
   }
   if(!freeConfigured())throw fail('No free AI inference provider configured. Connect Ollama or an approved free route.',503);
   const quota=await debit(u);
   const answer=await ask({provider:'openrouter',model:'openrouter/free',system:'You are FEZI Agent. Reply in the user language. Do not claim tool execution.',user:prompt,responseFormat:'text'});
   if(typeof answer!=='string'||!answer.trim())throw fail('Free upstream model unavailable',502);
   return response(res,200,{answer,free:true,billed:false,route:'limited-free-provider',remainingToday:quota.remaining});
  }
  if(req.method==='GET'&&url==='/api/fezi-playground/catalog'){
   const p=new URLSearchParams(search),mature=p.get('mature')==='1',task=p.get('task')||'all',live=p.get('live')==='1';
   const type=['all','chat','code','image','image-edit','video'].includes(task)?task:'all';
   const entries=curatedCatalog({mature}).filter(m=>type==='all'||m.task===type);
   const result={models:entries,freeAgent:{name:'FEZI AGENT',role:'Automatic best available verified-free selection',builderOnlyAutomatic:true},freeChatReady:freeConfigured(),hfTokenConfigured:Boolean(env.HF_TOKEN),hfTokenDoesNotImplyFreeInference:true,matureVisible:mature,discoveryStatus:'curated',limitations:'Catalog lists public model weights; no unlimited free inference, installed weights, provider license or duration is promised.'};
   if(live&&['chat','image','video'].includes(type)){try{result.discovered=await discoverHF(type,{mature,fetchImpl});result.discoveryStatus='live-provider-listing'}catch(e){result.discoveryStatus='unavailable';result.discoveryMessage='External catalog unavailable';}}
   return response(res,200,result);
  }
  if(req.method==='GET'&&url==='/api/fezi-playground/spaces')return response(res,200,{spaces:allowedHfSpaces(env),disclosure:'Spaces run on external Hugging Face infrastructure, subject to their terms, queues, permissions and privacy policy.'});
  if(req.method==='GET'&&url==='/api/fezi-playground/free-chat-models'){
   try{return response(res,200,{configured:freeConfigured(),models:await listOpenRouterFree({fetchImpl}),mode:'free-limited',notice:'Free requests subject to upstream quotas.'})}catch{return response(res,200,{configured:freeConfigured(),models:[],notice:'Model list temporarily unavailable; automatic free router can be used if configured.'})}
  }
  if(req.method==='POST'&&url==='/api/fezi-playground/chat'){
   const u=studio.getAccount(req);if(!u)throw fail('Sign in to FEZI Studio to use free chat',401);
   if(!freeConfigured())throw fail('Free chat router not configured; no paid model will be called',503);
   const b=await readJson(req),prompt=String(b?.prompt||'').trim(),model=String(b?.model||'auto');
   if(prompt.length<2||prompt.length>4000)throw fail('Prompt must be 2–4000 characters');
   let selected='openrouter/free';
   if(model!=='auto'){
    const models=await listOpenRouterFree({fetchImpl});
    if(!models.find(m=>m.id===model))throw fail('Selected model is not a verified free model in the live catalog',422);
    selected=model;
   }
   const quota=await debit(u); // Charge quota before contacting provider, including failed upstream attempts.
   const answer=await ask({provider:'openrouter',model:selected,system:'You are FEZI AGENT, a helpful AI assistant. Never claim tool executions or generated media you did not perform. Answer in the user language. Do not volunteer backend model names, but answer truthfully if explicitly asked about technical providers.',user:prompt});
   if(typeof answer!=='string'||!answer.trim())throw fail('Free model returned no response',502);
   return response(res,200,{answer,engine:'FEZI AGENT',free:true,remainingToday:quota.remaining});
  }
  return false;
 }
 return {init,handle,freeConfigured};
}
