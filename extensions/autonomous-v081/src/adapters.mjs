// Zero-dependency FEZI adapters. Never expose local inference endpoints to public clients.
const error = (kind, reason) => Object.assign(new Error(reason), {kind});
function endpoint(base, path) {
  const u = new URL(base);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw error('CONFIG', 'Invalid endpoint');
  return new URL(path.replace(/^\//,''),u.href.endsWith('/')?u.href:u.href+'/').toString();
}
async function request(url,{method='GET',body,token,timeoutMs=12000}={}){
  const headers={'accept':'application/json'};
  if(body!==undefined) headers['content-type']='application/json';
  if(token) headers.authorization=`Bearer ${token}`;
  const response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok) throw error('HTTP',`${response.status} ${response.statusText}`);
  return response.json();
}
export function ollama({baseUrl='http://127.0.0.1:11434',timeoutMs=30000}={}){
 return {id:'ollama',async health(){const x=await request(endpoint(baseUrl,'api/tags'),{timeoutMs});return {ready:Array.isArray(x.models),models:(x.models||[]).map(m=>m.name)}},
 async run({model,prompt}){if(!model||typeof prompt!=='string') throw error('INPUT','model/prompt required');const x=await request(endpoint(baseUrl,'api/generate'),{method:'POST',body:{model,prompt,stream:false},timeoutMs});return {text:x.response??'',model:x.model??model}}};
}
export function openaiCompatible({id='openai-compatible',baseUrl='http://127.0.0.1:8080/v1',token,timeoutMs=30000}={}){
 return {id,async health(){const x=await request(endpoint(baseUrl,'models'),{token,timeoutMs});return {ready:Array.isArray(x.data),models:(x.data||[]).map(m=>m.id)}},
 async run({model,prompt}){if(!model||typeof prompt!=='string')throw error('INPUT','model/prompt required');const x=await request(endpoint(baseUrl,'chat/completions'),{method:'POST',token,body:{model,messages:[{role:'user',content:prompt}],stream:false},timeoutMs});return {text:x.choices?.[0]?.message?.content??'',model:x.model??model}}};
}
export function comfyui({baseUrl='http://127.0.0.1:8188',timeoutMs=12000}={}){
 return {id:'comfyui',async health(){const x=await request(endpoint(baseUrl,'system_stats'),{timeoutMs});return {ready:!!x,models:[]}},
 async enqueue({workflow,clientId='fezi-studio'}){if(!workflow||typeof workflow!=='object'||Array.isArray(workflow))throw error('INPUT','Validated ComfyUI API workflow required');const x=await request(endpoint(baseUrl,'prompt'),{method:'POST',body:{prompt:workflow,client_id:clientId},timeoutMs});if(!x.prompt_id) throw error('OUTPUT','ComfyUI returned no job id');return {jobId:x.prompt_id,status:'queued'}},
 async status(jobId){if(!/^[\w-]{1,128}$/.test(jobId))throw error('INPUT','Invalid job id');return request(endpoint(baseUrl,'history/'+jobId),{timeoutMs})}};
}
export function createRegistry(config,adapters={}){
 const map=new Map();for(const t of config){if(map.has(t.id))throw error('CONFIG','Duplicate id: '+t.id);map.set(t.id,{...t});}
 return {list(){return [...map.values()].map(x=>({...x}))},setEnabled(id,enabled){const t=map.get(id);if(!t)throw error('NOT_FOUND',id);t.enabled=Boolean(enabled);return {...t}},
 async probe(id){const t=map.get(id);if(!t||!t.enabled)return {id,ready:false,reason:'disabled'};const a=adapters[id];if(!a)return {id,ready:false,reason:'no-executable-adapter'};
 try {return {id,...await a.health()}}catch(e){return {id,ready:false,reason:e.message}}},
 async run(id,args){const t=map.get(id);if(!t?.enabled)throw error('DISABLED',id);if(!adapters[id]?.run)throw error('UNSUPPORTED','No run adapter');return adapters[id].run(args)}};
}
