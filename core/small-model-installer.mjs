// Fixed-repository, small-GGUF installer. Server owner only. Never fetches an arbitrary URL.
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import crypto from 'node:crypto';
import {CATALOG,MODEL_ROOT,modelInfo,modelPath} from './local-models.js';
const active=new Map();
const MAX_BYTES=320_000_000;
export function smallModelIds(){return Object.keys(CATALOG).filter(id=>CATALOG[id].smallModel===true)}
export function getSmallModelJobs(){return [...active.values()].map(({id,status,startedAt,bytes,error,sha256})=>({id,status,startedAt,bytes,error,sha256}));}
export async function installSmallModel(id,{request=fetch,root=MODEL_ROOT}={}){
 if(!smallModelIds().includes(id))throw Object.assign(new Error('Not an allowlisted small model'),{status:400});
 const m=modelInfo(id),dest=modelPath(id);
 // Same model cannot launch concurrent download jobs.
 if(active.get(id)?.status==='downloading')throw Object.assign(new Error('Download is already running'),{status:409});
 await fs.mkdir(root,{recursive:true});
 const existing=await fs.stat(dest).catch(()=>null);
 if(existing?.isFile() && existing.size>10_000_000){const fh=await fs.open(dest,'r');try{let b=Buffer.alloc(4);await fh.read(b,0,4,0);if(b.toString()==='GGUF')return {id,status:'installed',bytes:existing.size};}finally{await fh.close()}}
 const stat=await fs.statfs(root).catch(()=>null);
 if(stat && stat.bavail*stat.bsize < (m.sizeMB*1024*1024+512_000_000))throw Object.assign(new Error('Not enough free disk space'),{status:507});
 const url=`https://huggingface.co/${m.repo}/resolve/main/${encodeURIComponent(m.file)}`;
 const job={id,status:'downloading',startedAt:new Date().toISOString(),bytes:0};active.set(id,job);
 const tmp=dest+'.'+crypto.randomBytes(6).toString('hex')+'.partial';
 try{
  const signal=AbortSignal.timeout(20*60*1000);
  const res=await request(url,{signal,headers:{'user-agent':'FEZI-Studio/1.01 trusted-model-downloader'}});
  if(!res.ok||!res.body)throw Error(`Hugging Face download HTTP ${res.status}`);
  const size=Number(res.headers.get('content-length')||0);
  if(size>MAX_BYTES)throw Error('Model exceeds 320 MB download ceiling');
  let bytes=0;const sha=crypto.createHash('sha256');
  const meter=new Transform({transform(chunk,enc,callback){
    bytes+=chunk.length;job.bytes=bytes;
    if(bytes>MAX_BYTES)return callback(Error('Download exceeded size limit'));
    sha.update(chunk);callback(null,chunk);
  }});
  await pipeline(Readable.fromWeb(res.body),meter,createWriteStream(tmp,{flags:'wx',mode:0o600}));
  if(bytes<10_000_000)throw Error('Model file suspiciously small');
  const f=await fs.open(tmp,'r');try{let b=Buffer.alloc(4);await f.read(b,0,4,0);if(b.toString()!=='GGUF')throw Error('Invalid GGUF magic')}finally{await f.close()}
  await fs.rename(tmp,dest);job.status='installed';job.sha256=sha.digest('hex');return {id,status:'installed',bytes,sha256:job.sha256};
 }catch(e){await fs.unlink(tmp).catch(()=>{});job.status='failed';job.error=String(e.message).slice(0,260);throw e}
}
export function startSmallModelInstall(id){
 const result=installSmallModel(id);
 result.catch(()=>{}); // Background job status accessible via getSmallModelJobs.
 return {id,status:'download-started'};
}
