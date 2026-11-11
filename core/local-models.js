// Offline inference via optional node-llama-cpp; no API key or external model service required.
// Install the dependency on a machine with supported native binaries. The server never
// downloads model files implicitly. All model paths are fixed to the local models folder.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

export const CATALOG = Object.freeze({
  'smollm2-135m': Object.freeze({id:'smollm2-135m',name:'SmolLM2 135M Instruct Q4_K_M',file:'SmolLM2-135M-Instruct-Q4_K_M.gguf',repo:'bartowski/SmolLM2-135M-Instruct-GGUF',sizeMB:105,license:'Apache-2.0',purpose:'tiny English text and lightweight summaries; weak Persian',smallModel:true}),
  'smollm2-360m': Object.freeze({id:'smollm2-360m',name:'SmolLM2 360M Instruct Q4_K_M',file:'SmolLM2-360M-Instruct-Q4_K_M.gguf',repo:'bartowski/SmolLM2-360M-Instruct-GGUF',sizeMB:271,license:'Apache-2.0',purpose:'small English chat and short drafting; Persian limited',smallModel:true}),
  'coder-mini': Object.freeze({id:'coder-mini',name:'Qwen2.5 Coder 0.5B Q4_K_M',file:'qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',repo:'Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF',sizeMB:491,license:'Apache-2.0',purpose:'quick code edits'}),
  'persian-mini':Object.freeze({id:'persian-mini',name:'Qwen3 0.6B Q8_0',file:'Qwen3-0.6B-Q8_0.gguf',repo:'Qwen/Qwen3-0.6B-GGUF',sizeMB:639,license:'Apache-2.0',purpose:'multilingual requests'}),
  'coder-plus':Object.freeze({id:'coder-plus',name:'Qwen2.5 Coder 1.5B Q4_K_M',file:'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',repo:'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',sizeMB:1120,license:'Apache-2.0',purpose:'better local code generation'})
});
export function adapterFile(name){
  if(typeof name!=='string'|| !/^[a-zA-Z0-9_-]{1,70}\.gguf$/.test(name))throw Object.assign(new Error('Invalid LoRA adapter filename'),{status:400});
  return path.join(MODEL_ROOT,'adapters',name);
}
export const MODEL_ROOT = path.resolve(process.env.LOCAL_MODEL_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)),'../models'));
export function modelInfo(id) {
  if (!Object.hasOwn(CATALOG,id)) throw Object.assign(new Error('Unknown local model ID'),{status:400});
  return CATALOG[id];
}
export function modelPath(id) {return path.join(MODEL_ROOT,modelInfo(id).file);}
export async function listLocalModels() {
  return await Promise.all(Object.values(CATALOG).map(async m=>{
    const stat=await fs.stat(modelPath(m.id)).catch(()=>null);
    let valid=false;
    if(stat?.isFile()&&stat.size>5_000_000){const f=await fs.open(modelPath(m.id),'r');try{const bytes=Buffer.alloc(4);await f.read(bytes,0,4,0);valid=bytes.toString('ascii')==='GGUF';}finally{await f.close();}}
    return {...m,installed:!!valid,bytes:valid?stat.size:0,downloadUrl:`https://huggingface.co/${m.repo}/resolve/main/${m.file}`};
  }));
}
let active=null;
let queue=Promise.resolve();
const CAP_THREADS=Math.min(4,Math.max(1,os.availableParallelism?.()||2));
async function prepare(id){
  const filename=modelPath(id),stat=await fs.stat(filename).catch(()=>null);
  if(!stat?.isFile()||stat.size<5_000_000) throw Object.assign(new Error(`Model ${id} not installed. Run: npm run model:download -- ${id}`),{status:412});
  const handle=await fs.open(filename,'r');const magic=Buffer.alloc(4);try{await handle.read(magic,0,4,0);}finally{await handle.close();}
  if(magic.toString('ascii')!=='GGUF')throw Object.assign(new Error('Local model has an invalid GGUF header'),{status:412});
  if(active?.id===id)return active;
  let mod;try{mod=await import('node-llama-cpp');}catch{throw Object.assign(new Error('Install optional runtime first: npm install --no-save node-llama-cpp; your host must support native binaries'),{status:412});}
  if(active){await active.context?.dispose?.();await active.model?.dispose?.();active=null;}
  const llama=await mod.getLlama({gpu:false});
  const model=await llama.loadModel({modelPath:filename});
  const contextOptions={contextSize:Number(process.env.LOCAL_CONTEXT_TOKENS||2048),threads:CAP_THREADS};
  if(process.env.LOCAL_LORA_FILE){
    const adapter=adapterFile(process.env.LOCAL_LORA_FILE);
    if(!(await fs.stat(adapter).catch(()=>null)))throw Object.assign(new Error('LoRA adapter missing at '+adapter),{status:412});
    contextOptions.lora=adapter;
  }
  const context=await model.createContext(contextOptions);
  active={id,model,context,api:mod};
  return active;
}
export async function generateLocal({model='coder-mini',system='',user=''}){
  if(process.env.LOCAL_AI_ENABLED!=='true') throw Object.assign(new Error('LOCAL_AI_ENABLED must be true to enable local inference'),{status:412});
  modelInfo(model);
  if(typeof user!=='string'||user.length>45000)throw Object.assign(new Error('Prompt too large'),{status:413});
  const work=async()=>{
    const {context,api}=await prepare(model);
    const session=new api.LlamaChatSession({contextSequence:context.getSequence()});
    try{return await session.prompt(`${String(system).slice(0,12000)}\n\nUSER REQUEST:\n${user}`, {maxTokens:Math.min(2048,Number(process.env.LOCAL_MAX_TOKENS)||768),temperature:0.15});}
    finally{await session.dispose?.();}
  };
  // Queue requests to avoid allocating a fresh context for each concurrent request.
  const result=queue.then(work,work);queue=result.catch(()=>{});
  return result;
}
