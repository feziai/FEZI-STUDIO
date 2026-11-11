/**
 * FEZI v1.01 additive cloud video connector.
 * Uses ONLY officially supported Hugging Face Inference Providers via the
 * @huggingface/inference SDK. Never connects to or scrapes Wan2.Video's public
 * queues, never exposes HF_TOKEN, and never makes a paid request by default.
 *
 * State is per Node.js process; use one dedicated Node instance, persistent
 * DATA_DIR and a single process for this service. In-flight work interrupted
 * by restart is marked failed, not re-billed/retried without consent.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const HF_CLOUD_VIDEO_MODELS=Object.freeze([
  {id:'wan22',name:'Wan 2.2 · Cloud',hfModel:'Wan-AI/Wan2.2-TI2V-5B',provider:'fal-ai',task:'text-to-video',durationSuggestions:[5,8],note:'Model/provider availability and actual duration depend on the linked account.'},
  {id:'ltx',name:'LTX Video · Cloud',hfModel:'Lightricks/LTX-Video-0.9.8-13B-distilled',provider:'auto',task:'text-to-video',durationSuggestions:[5],note:'Catalog candidate; requires live provider verification.'},
  {id:'hunyuan',name:'HunyuanVideo · Cloud',hfModel:'tencent/HunyuanVideo',provider:'auto',task:'text-to-video',durationSuggestions:[5],note:'Catalog candidate; requires live provider verification.'}
]);
const MODEL_BY_ID=new Map(HF_CLOUD_VIDEO_MODELS.map(m=>[m.id,m]));
const httpError=(message,status=400)=>Object.assign(new Error(message),{status});
const safeInt=(x,fallback,max)=>{const n=Number(x);return Number.isInteger(n)&&n>0?Math.min(max,n):fallback};
const mp4=bytes=>bytes.length>128&&bytes.length<=45_000_000&&bytes.toString('ascii',4,8)==='ftyp';
const jobResponse=j=>({id:j.id,model:j.model,status:j.status,createdAt:j.createdAt,updatedAt:j.updatedAt,error:j.error||null,videoUrl:j.status==='completed'?'/api/fezi-cloud-video/result/'+j.id:null});
function sendJson(res,status,payload){const b=Buffer.from(JSON.stringify(payload));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':b.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b);return true}
async function readJson(req){const chunks=[];let total=0;for await(const c of req){total+=c.length;if(total>9000)throw httpError('Request too large',413);chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw httpError('Invalid JSON',400)}}
export async function hfVideoGenerate({model,prompt,duration,token}){
  // The optional SDK is installed in production with npm install.
  let Client;try{({InferenceClient:Client}=await import('@huggingface/inference'))}catch{throw httpError('Hugging Face SDK missing: npm install @huggingface/inference',503)}
  const sdk=new Client(token);
  const options={model:model.hfModel,provider:model.provider,inputs:prompt};
  // Inference providers may ignore num_frames; requested length is not guaranteed.
  if(duration===5)options.parameters={num_frames:81};
  const blob=await sdk.textToVideo(options);
  if(!blob||typeof blob.arrayBuffer!=='function')throw httpError('Provider did not produce video bytes',502);
  if(blob.size>45_000_000)throw httpError('Provider output too large',502);
  const buffer=Buffer.from(await blob.arrayBuffer());if(!mp4(buffer))throw httpError('Provider returned an unsupported or invalid MP4',502);
  return buffer;
}
export function createHfCloudVideo({dataDir,studio,env=process.env,now=Date.now,generate=hfVideoGenerate}={}){
  if(!dataDir||!studio)throw new Error('dataDir and studio required');
  const folder=path.join(dataDir,'hf-cloud-video-v101'),stateFile=path.join(folder,'jobs.json');
  const enabled=env.FEZI_HF_VIDEO_ENABLED==='true'&&env.FEZI_HF_VIDEO_COST_APPROVED==='true'&&Boolean(env.HF_TOKEN);
  const maxGlobal=safeInt(env.FEZI_HF_VIDEO_GLOBAL_DAILY_LIMIT,2,30);
  const maxUser=safeInt(env.FEZI_HF_VIDEO_USER_DAILY_LIMIT,1,5);
  const models=String(env.FEZI_HF_VIDEO_ALLOWED_MODELS||'wan22').split(',').map(s=>s.trim()).filter(x=>MODEL_BY_ID.has(x));
  const approved=[...new Set(models)];
  const jobs={};let serialized=Promise.resolve(),running=0;
  const lockedModel=id=>MODEL_BY_ID.get(id)&&approved.includes(id);
  const userFrom=req=>studio.getAccount(req);
  function serialize(){serialized=serialized.then(async()=>{const tmp=stateFile+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify({jobs}),{mode:0o600});await fs.rename(tmp,stateFile)});return serialized}
  async function init(){await fs.mkdir(folder,{recursive:true,mode:0o700});try{
   const data=JSON.parse(await fs.readFile(stateFile,'utf8'));
   for(const j of Object.values(data.jobs||{})){if(j&&typeof j.id==='string'&&/^[a-f0-9]{32}$/.test(j.id)){
     if(['queued','running'].includes(j.status)){j.status='interrupted';j.error='Host restarted; job will not be automatically retried to avoid duplicate upstream charges.';j.updatedAt=new Date(now()).toISOString()}
     jobs[j.id]=j;
   }}
  }catch(e){if(e.code!=='ENOENT')throw e}await serialize()}
  function counts(userId){const today=new Date(now()).toISOString().slice(0,10);
    const all=Object.values(jobs).filter(j=>j.createdAt?.startsWith(today));
    return {global:all.length,user:all.filter(j=>j.userId===String(userId)).length};}
  async function execute(job,prompt,model,duration){running++;
    try{job.status='running';job.updatedAt=new Date(now()).toISOString();await serialize();
      const result=await generate({model,prompt,duration,token:env.HF_TOKEN});
      const b=Buffer.isBuffer(result)?result:Buffer.from(result||[]);if(!mp4(b))throw httpError('Invalid MP4 produced by provider',502);
      const filename=path.join(folder,job.id+'.mp4');const temp=filename+'.'+process.pid+'.tmp';await fs.writeFile(temp,b,{mode:0o600});await fs.rename(temp,filename);
      job.status='completed';job.error=null;
    }catch(e){job.status='failed';const code=Number(e?.status||e?.statusCode);job.error=code===402?'Provider balance is insufficient':code===429?'Provider quota or rate limit reached':'Cloud video generation failed. Check provider status and server logs.';
      // Never persist raw upstream errors, request payloads, or tokens.
    }finally{job.updatedAt=new Date(now()).toISOString();await serialize();running--}
  }
  async function handle(req,res,url){
    if(req.method==='GET'&&url==='/api/fezi-cloud-video/status'){
      return sendJson(res,200,{ready:enabled&&approved.length>0,provider:'Hugging Face Inference Providers',source:'licensed API; not wan2.video public queues',freeToUsers:true,providerCostPossible:true,maxGlobalDaily:maxGlobal,maxUserDaily:maxUser,models:HF_CLOUD_VIDEO_MODELS.map(m=>({...m,approved:approved.includes(m.id),ready:enabled&&approved.includes(m.id),providerAvailability:'unverified-until-request'})),notice:'FEZI Studio remains free. Operator must explicitly approve third-party inference costs; daily count caps are not financial spend caps.'});
    }
    if(req.method==='POST'&&url==='/api/fezi-cloud-video/jobs'){
      const u=userFrom(req);if(!u)throw httpError('Sign in required',401);
      if(!enabled)throw httpError('Cloud video provider is not yet enabled by the owner',503);
      if(running+Object.values(jobs).filter(j=>j.status==='queued').length>=1)throw httpError('Video processing is busy; retry later',429);
      const b=await readJson(req),prompt=String(b?.prompt||'').trim(),model=MODEL_BY_ID.get(String(b?.model||'wan22')),duration=Number(b?.duration||5);
      if(prompt.length<8||prompt.length>1800)throw httpError('Prompt must have 8–1800 characters');
      if(!model||!lockedModel(model.id))throw httpError('Model is not enabled',422);
      if(!model.durationSuggestions.includes(duration))throw httpError('Unsupported duration selection',422);
      const count=counts(u.id);if(count.user>=maxUser||count.global>=maxGlobal)throw httpError('Daily cloud-video quota reached',429);
      const id=crypto.randomBytes(16).toString('hex');const timestamp=new Date(now()).toISOString();
      const job={id,userId:String(u.id),model:model.id,status:'queued',createdAt:timestamp,updatedAt:timestamp,error:null};jobs[id]=job;await serialize();
      // Do not block HTTP response while the provider generates. One Node instance required.
      setImmediate(()=>{void execute(job,prompt,model,duration)});
      return sendJson(res,202,jobResponse(job));
    }
    const detail=/^\/api\/fezi-cloud-video\/jobs\/([a-f0-9]{32})$/.exec(url);
    if(req.method==='GET'&&detail){const u=userFrom(req);if(!u)throw httpError('Sign in required',401);
      const j=jobs[detail[1]];if(!j||j.userId!==String(u.id))throw httpError('Job not found',404);return sendJson(res,200,jobResponse(j));}
    const result=/^\/api\/fezi-cloud-video\/result\/([a-f0-9]{32})$/.exec(url);
    if(req.method==='GET'&&result){const u=userFrom(req);if(!u)throw httpError('Sign in required',401);
      const j=jobs[result[1]];if(!j||j.userId!==String(u.id)||j.status!=='completed')throw httpError('Video unavailable',404);
      const file=path.join(folder,j.id+'.mp4');const stat=await fs.stat(file);if(stat.size>45_000_000)throw httpError('Video too large',413);
      const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':'video/mp4','content-length':bytes.length,'content-disposition':'inline; filename="fezi-'+j.id+'.mp4"','cache-control':'private, no-store','x-content-type-options':'nosniff'});res.end(bytes);return true;}
    return false;
  }
  return {init,handle,ready:enabled,approvedModels:approved,counts};
}
