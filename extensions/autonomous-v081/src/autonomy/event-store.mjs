import { mkdir, appendFile, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// Store only privacy-safe operational events. Never store raw chat, prompts, files or secrets.
const allowed = new Set(['code','debug','web','android','game','chat','image','video','motion','voice','deployment','arina','other']);
const finite = (n, d=0) => Number.isFinite(Number(n)) ? Number(n) : d;
const sane = s => String(s ?? '').slice(0,100).replace(/[^a-zA-Z0-9_./:-]/g,'');
export function sanitizeEvent(e={}) {
  if(!allowed.has(e.task)) throw new Error('Unrecognized task');
  if(typeof e.success!=='boolean') throw new Error('success must be boolean');
  return {
    id:randomUUID(), at:new Date().toISOString(), task:e.task, model:sane(e.model),
    adapter:sane(e.adapter), success:e.success, latencyMs:Math.max(0,Math.min(3600000,finite(e.latencyMs))),
    quality:Math.max(0,Math.min(1,finite(e.quality,0.5))), errorCode:sane(e.errorCode),
    evaluation:sane(e.evaluation), consentedToTraining:false
  };
}
export async function recordEvent(file,event){
  const row=sanitizeEvent(event);
  await mkdir(dirname(file),{recursive:true});
  await appendFile(file,JSON.stringify(row)+'\n',{encoding:'utf8',mode:0o600});
  return row;
}
export async function readEvents(file,max=10000){
  try {
    const raw=await readFile(file,'utf8');
    return raw.trim().split('\n').filter(Boolean).slice(-max).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
  }catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export async function atomicJSON(file,value){
  await mkdir(dirname(file),{recursive:true});
  const tmp=file+'.'+randomUUID()+'.tmp';
  await writeFile(tmp,JSON.stringify(value,null,2),{encoding:'utf8',mode:0o600});
  await rename(tmp,file);
}
export async function readJSON(file,fallback){
  try{return JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw e;}
}
