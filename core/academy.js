/** FEZI AGENT Academy - server-side task library and feedback, not weight training. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {providers} from '../integrations.js';
import {listLocalModels} from './local-models.js';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../academy');
const manifestPath=path.join(base,'catalog.json');
let catalog;
const cache=new Map(),CACHE_MAX=4;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function getCatalog(){
  if(!catalog){
    const json=JSON.parse(await fs.readFile(manifestPath,'utf8'));
    if(!Number.isInteger(json.total_tasks) || json.categories?.length!==23)throw fail('Academy catalog is corrupt',503);
    catalog=json;
  }
  return catalog;
}
async function cat(name){
  const item=(await getCatalog()).categories.find(x=>x.id===name);
  if(!item)throw fail('Unknown academy category');
  return item;
}
async function shard(name,index){
  const info=await cat(name);
  if(!Number.isInteger(index)||index<0||index>=info.shards.length)throw fail('Invalid shard index');
  const key=name+'/'+index;if(cache.has(key))return cache.get(key);
  const p=path.join(base,'shards',info.id,info.shards[index].name);
  const compressed=await fs.readFile(p);
  if(compressed.length>350_000)throw fail('Academy shard too large',503);
  const checksum=crypto.createHash('sha256').update(compressed).digest('hex');
  if(checksum!==info.shards[index].sha256)throw fail('Academy shard integrity check failed',503);
  const buf=zlib.gunzipSync(compressed,{maxOutputLength:3_000_000});
  const items=buf.toString('utf8').trimEnd().split('\n').map(x=>JSON.parse(x));
  if(items.length!==info.shards[index].count)throw fail('Academy shard count mismatch',503);
  cache.set(key,items);while(cache.size>CACHE_MAX)cache.delete(cache.keys().next().value);
  return items;
}
export async function getTask(taskId){
  const m=/^([a-z][a-z0-9_]*)-(\d{5})$/.exec(String(taskId));
  if(!m)throw fail('Invalid task ID');
  const c=await cat(m[1]);const n=Number(m[2]);
  if(n<1||n>c.count)throw fail('Unknown task');
  return (await shard(c.id,Math.floor((n-1)/250)))[(n-1)%250];
}
export async function listTasks({category,page=1,limit=10}={}){
  const c=await cat(category);
  const p=Number(page),l=Number(limit);
  if(!Number.isInteger(p)||p<1||p>10000||!Number.isInteger(l)||l<1||l>50)throw fail('page or limit out of range');
  const start=(p-1)*l;
  if(start>=c.count)return {category:c.id,total:c.count,page:p,items:[]};
  const result=[];
  for(let n=start;n<Math.min(start+l,c.count);){
    const chunk=await shard(c.id,Math.floor(n/250));
    const offset=n%250;
    const part=chunk.slice(offset,Math.min(offset+l-result.length,chunk.length));
    result.push(...part);n+=part.length;
  }
  return {category:c.id,total:c.count,page:p,items:result};
}
export async function recommendTaskModel({taskId,offlineOnly=false}={}){
  const task=await getTask(taskId);
  const cap=task.recommended_capability;
  const settings=providers();
  let local=[];
  try{local=await listLocalModels();}catch{}
  // Recommendation is heuristic, NOT a tested model benchmark.
  const options=[];
  if(cap==='code'||cap==='reasoning'){
    const order=cap==='code'?['coder-plus','coder-mini','persian-mini']:['persian-mini','coder-plus','coder-mini'];
    for(const id of order){const m=local.find(x=>x.id===id&&x.installed);if(m&&process.env.LOCAL_AI_ENABLED==='true')options.push({provider:'local',model:id,available:true,why:'Installed local GGUF; no per-token API charges; performance unverified'});}
    options.push({provider:'ollama',model:cap==='code'?'qwen2.5-coder:7b':'gemma3:4b',available:false,why:'Requires checking actual Ollama service/models; this is an illustrative candidate'});
  }
  if(!offlineOnly){
    for(const p of settings.filter(x=>x.configured&&!['local','ollama'].includes(x.id))){options.push({provider:p.id,model:p.model,available:true,why:'Provider is configured; task-specific quality and cost NOT benchmarked'});}
  }
  return {taskId,capability:cap,offlineOnly,benchmarkVerified:false,candidates:options,disclaimer:'Model suggestions are heuristic; test on rubric before treating a candidate as best.'};
}
export function createProgressStore(dataRoot){
  const folder=path.join(dataRoot,'academy');
  const file=path.join(folder,'progress.jsonl');
  let tail=Promise.resolve();
  async function record({taskId,status,notes='',score=null}){
    await getTask(taskId);
    if(!['started','submitted','passed','failed','needs_review'].includes(status))throw fail('Invalid progress status');
    if(typeof notes!=='string'||notes.length>2000)throw fail('Notes are limited to 2000 characters');
    if(score!==null&&(!Number.isInteger(score)||score<0||score>5))throw fail('Score must be an integer between 0 and 5');
    // This is a user/reviewer reported result, not an automatic verified grade.
    const entry={taskId,status,notes,score,source:'user_or_reviewer_reported',createdAt:new Date().toISOString()};
    const work=tail.catch(()=>{}).then(async()=>{
      await fs.mkdir(folder,{recursive:true,mode:0o700});
      await fs.appendFile(file,JSON.stringify(entry)+'\n',{encoding:'utf8',mode:0o600});
    });tail=work.catch(()=>{});await work;
    return entry;
  }
  async function summary(){
    const text=await fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    if(Buffer.byteLength(text)>20_000_000)throw fail('Progress log too large; archive before reading',413);
    const latest=new Map();
    for(const line of text.trim().split('\n').filter(Boolean)){
      try{const v=JSON.parse(line);if(typeof v.taskId==='string')latest.set(v.taskId,v);}catch{}
    }
    const counts={started:0,submitted:0,passed:0,failed:0,needs_review:0};
    for(const x of latest.values())if(Object.hasOwn(counts,x.status))counts[x.status]++;
    return {uniqueTasks:latest.size,counts,verifiedByModel:false,latest:Array.from(latest.values()).slice(-20)};
  }
  return {record,summary};
}
