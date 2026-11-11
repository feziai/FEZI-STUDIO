/** FEZI AGENT - automatic model selection. Provider identities remain server-side.
 * Rules are heuristics, not benchmark guarantees. No hidden cost incurrence without
 * explicitly configuring external API credentials in the server environment.
 */
import {providers,askProvider} from '../integrations.js';
import {listLocalModels} from './local-models.js';
import {validateModelName} from './validation.js';
import {roleForRequest,chooseInstalledSpecialist} from './model-registry.js';

const failure=(message,status=412)=>Object.assign(new Error(message),{status});
export const BRAND='FEZI AGENT';
export const PERSONALITY=`You are FEZI AGENT, a bilingual Persian/English software-building assistant. Present yourself as FEZI AGENT. Choose the right tools internally. Do not volunteer internal orchestration or backend model names in ordinary responses. If the user asks directly how the system works or what services are used, be truthful that local or third-party models may be involved and refer to technical disclosures. Never alter or omit required third-party license notices or falsely claim independently trained model weights. Do not claim actions, tests, deployments or files were completed unless a tool actually confirms them.`;
export function classifyTask(prompt=''){
  const s=String(prompt).toLowerCase();
  if(/(عکس|تصویر|پوستر|گرافیک|image|photo|illustrat|poster|design an image)/i.test(s))return 'image';
  if(/(ویدیو|فیلم|video|animation|movie)/i.test(s))return 'video';
  if(/(ترجمه|ترجمه کن|translate|translation|زبان)/i.test(s))return 'translation';
  if(/(کد|برنامه|وب|سایت|اندروید|اپلیکیشن|ارور|خطا|code|bug|debug|python|javascript|react|website|app|program|deploy|api|server|github)/i.test(s))return 'code';
  if(/(تحلیل|استدلال|پژوهش|مقایسه|reason|analy|research|compare)/i.test(s))return 'reasoning';
  return 'general';
}
const has=(m,s)=>new RegExp(s,'i').test(m);
const idScore=(id,kind)=>{
  const s=String(id).toLowerCase();let score=0;
  if(kind==='code')score+=(has(s,'coder|code|devstral')?40:0)+(has(s,'qwen|deepseek')?10:0);
  if(kind==='translation')score+=(has(s,'qwen|gemma|aya|mistral')?12:0);
  if(kind==='reasoning')score+=(has(s,'reason|r1|thinking|sonnet|o[1-9]')?15:0);
  if(kind==='image'||kind==='video')score-=25; // Text providers can plan, NOT render media.
  if(has(s,'30b|32b|70b|72b|large|pro|sonnet'))score+=7;
  if(has(s,'0\.5b|0\.6b|1\.5b|mini|flash'))score-=3;
  return score;
};
/** Pure deterministic ranker. Pass only verified-local model inventory to avoid fake availability. */
export function rankCandidates({prompt='',kind=classifyTask(prompt),providerList=[],localModels=[],ollamaModels=[],offlineOnly=false,preference='local-first'}={}){
  const results=[];
  for(const p of providerList){
    if(!p?.configured)continue;
    if(p.id==='local'){
      for(const m of localModels.filter(x=>x?.installed===true))results.push({provider:'local',model:m.id,kind,score:idScore(m.id,kind)+((preference==='local-first')?110:15),local:true});
    }else if(p.id==='ollama'){
      const specialist=chooseInstalledSpecialist(roleForRequest(prompt),ollamaModels);
      for(const m of ollamaModels)results.push({provider:'ollama',model:m,kind,score:idScore(m,kind)+((preference==='local-first')?100:12)+(specialist?.localId===m?45:0),local:true});
    }else if(!offlineOnly){
      const model=p.model;
      if(typeof model==='string'&&model.length)results.push({provider:p.id,model,kind,score:idScore(model,kind)+(preference==='quality-first'?90:5),local:false});
    }
  }
  const unique=new Set();return results.filter(x=>{
    try{validateModelName(x.model);}catch{return false;}
    const key=x.provider+'/'+x.model;if(unique.has(key))return false;unique.add(key);return true;
  }).sort((a,b)=>b.score-a.score||a.provider.localeCompare(b.provider)||a.model.localeCompare(b.model));
}
let ollamaCache={expires:0,models:[]};
export async function getOllamaModels({fetchImpl=fetch,now=Date.now()}={}){
  if(now<ollamaCache.expires)return [...ollamaCache.models];
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),1250);
  try{
    const base=(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
    const res=await fetchImpl(base+'/api/tags',{signal:ctl.signal});
    if(!res.ok)throw Error('unavailable');
    const payload=await res.json();
    const models=(Array.isArray(payload.models)?payload.models:[]).map(x=>x.name).filter(x=>typeof x==='string'&&x.length<160).slice(0,75);
    ollamaCache={expires:now+20000,models};return [...models];
  }catch {ollamaCache={expires:now+5000,models:[]};return [];}finally{clearTimeout(timer);}
}
export async function automaticCandidates(prompt,{offlineOnly=false,preference=process.env.FEZI_ROUTING_PREFERENCE||'local-first'}={}){
  // Public free-first routing; no accidental paid OpenRouter calls.
  const freeOnly=process.env.FEZI_AGENT_FREE_ONLY!=='false';
  const configured=providers().filter(p=>!freeOnly||p.id==='local'||p.id==='ollama'||(p.id==='openrouter'&&Boolean(process.env.OPENROUTER_API_KEY)&&process.env.FEZI_FREE_ROUTING_ENABLED!=='false')||(p.id==='compatible'&&process.env.FEZI_FREE_COMPATIBLE_PROVIDER==='true')).map(p=>p.id==='openrouter'&&freeOnly?{...p,model:'openrouter/free'}:p);
  const [local,ollama]=await Promise.all([process.env.LOCAL_AI_ENABLED==='true'?listLocalModels().catch(()=>[]):[],getOllamaModels()]);
  return rankCandidates({prompt,providerList:configured,localModels:local,ollamaModels:ollama,offlineOnly,preference});
}
export async function selectAutomatic(prompt,options={}){
  const optionsList=await automaticCandidates(prompt,options);
  if(!optionsList.length)throw failure('FEZI AGENT needs a connected or installed AI engine. Configure a local engine or server connection.');
  return optionsList[0];
}
export async function runAutomatic({system,user,prompt=user,offlineOnly=false,call=askProvider,preference}={}){
  const choices=await automaticCandidates(prompt,{offlineOnly,preference});
  if(!choices.length)throw failure('FEZI AGENT has no available AI engine. Install a local model or configure a server connection.');
  let last;
  for(const candidate of choices.slice(0,4)){
    try{
      const text=await call({provider:candidate.provider,model:candidate.model,system:PERSONALITY+'\n'+system,user});
      if(typeof text!=='string'||!text.trim())throw failure('Empty AI response',502);
      return {text,kind:candidate.kind,internal:{provider:candidate.provider,model:candidate.model}};
    }catch(error){last=error;console.warn('[FEZI AGENT internal model failure]',candidate.provider,candidate.model,String(error.message).slice(0,160));}
  }
  throw failure('FEZI AGENT could not complete the request with available models. Check server logs and model connections.',502);
}
export function publicTask(job){
  if(!job)return job;
  const {provider,model,instanceId,...rest}=job;
  const tidy=s=>String(s||'').replace(/\b(?:Ollama|Anthropic|Claude|Gemini|Google Gemini|OpenRouter|OpenAI|ChatGPT|Hugging Face|Qwen|Gemma|GGUF|OpenHands|OpenCode|Cline|Goose|Aider|Dyad|bolt\.diy)\b/gi,BRAND).replace(/\b(?:local|compatible|custom):[a-z0-9_-]+\b/gi,BRAND);
  return {...rest,engine:BRAND,...(rest.result?{result:{...rest.result,summary:tidy(rest.result.summary),...(rest.result.review?{review:tidy(rest.result.review)}:{})}}:{}),events:Array.isArray(rest.events)?rest.events.map(({detail,...e})=>({...e,summary:tidy(e.summary)})):[],...(rest.error?{error:'FEZI AGENT was unable to complete this task. See server logs.'}:{})};
}

/** Use only on agent-written summaries, never on source code, user prompts or license notices. */
export function publicSummary(value){
  return String(value||'').replace(/\b(?:Ollama|Anthropic|Claude|Gemini|Google Gemini|OpenRouter|OpenAI|ChatGPT|Hugging Face|Qwen(?:3|2\.5)?|Gemma|DeepSeek|FLUX(?:\.1)?|Wan(?:2\.1)?|Kokoro|Whisper|PaddleOCR|SmolLM3|Granite|BGE|OpenHands|OpenCode|Cline|Goose|Aider|Dyad|bolt\.diy)\b/gi,BRAND);
}
