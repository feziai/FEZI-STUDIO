import rawModels from '../config/open-models.json' with {type:'json'};

// Metadata is public, but selection and execution must be done on the server.
export const FREE_OPEN_MODELS = Object.freeze(rawModels.map(m => Object.freeze({...m})));
const byId = new Map(FREE_OPEN_MODELS.map(m => [m.id, m]));
const TASK_ALIASES = Object.freeze({chat:new Set(['text','code']),image:new Set(['image','image-edit']),video:new Set(['video','animate']),vision:new Set(['vision']),audio:new Set(['audio'])});
function httpError(msg,status){return Object.assign(new Error(msg),{status});}
function normalizeEndpoint(raw){
  if (!raw) return '';
  let url;
  try{url=new URL(raw);}catch{throw httpError('Invalid local runtime URL',412)}
  const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol==='http:')) throw httpError('External inference worker must use HTTPS',412);
  if (url.username||url.password||url.search||url.hash) throw httpError('Worker URL must not include credentials or query',412);
  return url.origin + url.pathname.replace(/\/$/,'');
}
function textField(v,max=4000){if(typeof v!=='string'||!v.trim()||v.length>max)throw httpError('Invalid prompt',400);return v.trim();}
export function modelById(id){return byId.get(String(id))??null;}
export function freeModelCatalog({env=process.env}={}){
  const ollama=Boolean(env.OLLAMA_BASE_URL); // Default localhost may be available even when not explicitly configured; status is still unverified.
  const gpu=!!env.FEZI_GPU_WORKER_URL;
  return FREE_OPEN_MODELS.map(m=>({...m, installed:undefined, ready:false, connectionConfigured:m.runtime==='gpu'?gpu:m.runtime==='local-llm'?ollama:false,
     status:m.runtime==='gpu'?(gpu?'worker-configured-unverified':'requires-gpu-worker'):(m.runtime==='local-llm'?'requires-ollama-model':'requires-compatible-runtime')}));
}
export function generationPolicy(env=process.env){
  return { ownerDailyQuota: env.FEZI_OWNER_UNLIMITED==='true'?null:'not-configured', arbitraryBuiltInLimit:false,
    externalProviderLimitsRemain:true,hardwareQueueStillApplies:true,licenseRestrictionsRemain:true};
}
export async function runLocalOpenChat({modelId,prompt,env=process.env,request=fetch}){
  const m=modelById(modelId);if(!m||!['text','code'].includes(m.task)||!m.ollamaTag)throw httpError('Selected local chat model is not supported',400);
  const base=normalizeEndpoint(env.OLLAMA_BASE_URL||'http://127.0.0.1:11434');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),90000);
  try{
    const response=await request(base+'/api/chat',{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json'},body:JSON.stringify({model:m.ollamaTag,stream:false,messages:[{role:'system',content:'You are FEZI Agent, a helpful bilingual assistant for building apps and creative media. Never claim to have rendered or executed something you did not.'},{role:'user',content:textField(prompt)}]})});
    if(!response.ok)throw httpError('Local Ollama not ready or model not pulled (HTTP '+response.status+')',503);
    const output=await response.json();const reply=output?.message?.content;
    if(typeof reply!=='string')throw httpError('Invalid Ollama response',502);
    return {modelId,answer:reply,execution:'local-ollama'};
  }catch(error){if(error.name==='AbortError')throw httpError('Local model request timed out',504);throw error}finally{clearTimeout(timer)}
}
function validReference(v){return v===undefined||v===null||(/^arina\/[a-zA-Z0-9_.\/-]{1,160}$/.test(v)&&!v.includes('..'));}
function checkRequest(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw httpError('JSON object required',400);
  const model=modelById(input.modelId);
  if(!model)throw httpError('Unknown or not verified open model',400);
  const category=String(input.kind||'');
  if(!(TASK_ALIASES[category]?.has(model.task)))throw httpError('This model does not support the selected task',400);
  const prompt=textField(input.prompt);
  const durationSec=input.durationSec===undefined?8:input.durationSec;
  if(category==='video'&&(!Number.isInteger(durationSec)||durationSec<2||durationSec>120))throw httpError('Video duration must be 2 to 120 seconds (GPU workflow may impose lower limits)',400);
  const width=input.width===undefined?1024:input.width, height=input.height===undefined?1024:input.height;
  if(category==='image' && (!Number.isInteger(width)||!Number.isInteger(height)||width<256||height<256||width>2048||height>2048))throw httpError('Image dimensions must be 256..2048',400);
  if(!validReference(input.referenceAsset))throw httpError('Reference asset path must be an approved arina/ relative path',400);
  if(input.loraId!==undefined&& !/^[a-z0-9][a-z0-9_.-]{0,63}$/i.test(input.loraId))throw httpError('Invalid LoRA adapter id',400);
  return {model,category,prompt,durationSec,width,height,referenceAsset:input.referenceAsset??null,loraId:input.loraId??null};
}
async function readBoundedJSON(response){
  let size=0, chunks=[];
  for await (const part of response.body||[]){size+=part.length;if(size>131072)throw httpError('GPU worker response too large',502);chunks.push(part)}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw httpError('GPU worker returned invalid JSON',502)}
}
export async function createOpenGenerationJob(input,{env=process.env,request=fetch}={}){
  const x=checkRequest(input);
  if(!['image','video'].includes(x.category))throw httpError('Only image/video jobs are supported by the GPU worker; use chat endpoint for text',400);
  if(!env.FEZI_GPU_WORKER_URL)throw httpError('No GPU worker configured. Install and start your own licensed model worker first',503);
  const base=normalizeEndpoint(env.FEZI_GPU_WORKER_URL);
  const timeout=AbortSignal.timeout(20000);
  const response=await request(base+'/jobs',{method:'POST',signal:timeout,headers:{'content-type':'application/json',...(env.FEZI_GPU_WORKER_TOKEN?{authorization:'Bearer '+env.FEZI_GPU_WORKER_TOKEN}:{})},body:JSON.stringify({task:x.category,modelId:x.model.id,modelRepo:x.model.hfRepo,prompt:x.prompt,referenceAsset:x.referenceAsset,loraId:x.loraId,...(x.category==='video'?{durationSec:x.durationSec}:{width:x.width,height:x.height})})});
  if(!response.ok)throw httpError('GPU worker rejected the job (HTTP '+response.status+')',502);
  const data=await readBoundedJSON(response);
  if(!/^[a-zA-Z0-9_-]{6,100}$/.test(String(data?.jobId||'')))throw httpError('GPU worker returned an invalid job id',502);
  return {jobId:data.jobId,state:'submitted',modelId:x.model.id,actualVideoGenerated:false,workerReportedState:data.state||'queued'};
}
export async function getOpenGenerationJob(id,{env=process.env,request=fetch}={}){
  if(!/^[a-zA-Z0-9_-]{6,100}$/.test(String(id||'')))throw httpError('Invalid job id',400);
  if(!env.FEZI_GPU_WORKER_URL)throw httpError('GPU worker not configured',503);
  const base=normalizeEndpoint(env.FEZI_GPU_WORKER_URL);
  const response=await request(base+'/jobs/'+encodeURIComponent(id),{method:'GET',signal:AbortSignal.timeout(15000),headers:{...(env.FEZI_GPU_WORKER_TOKEN?{authorization:'Bearer '+env.FEZI_GPU_WORKER_TOKEN}:{})}});
  if(!response.ok)throw httpError('GPU job not found or worker unavailable',response.status===404?404:502);
  const data=await readBoundedJSON(response);
  return {jobId:id,state:String(data.state||'unknown').slice(0,30),outputReady:data.state==='completed'&&Array.isArray(data.outputs)&&data.outputs.length>0,
    outputs:Array.isArray(data.outputs)?data.outputs.slice(0,8).map(o=>({name:String(o.name||'').slice(0,160),mime:String(o.mime||''),approved:o.approved===true})):[],message:String(data.message||'').slice(0,500)};
}
