/** FEZI-branded video studio. Computes on an operator-owned/licensed worker; NEVER scrapes public demos.
 * Worker protocol: POST /jobs -> {id,status}; GET /jobs/:id -> {status, progress?, videoBase64?}.
 * No silent upstream proxying, no false free-inference promises, no output until actual processing succeeds.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const VIDEO_MODELS=Object.freeze([
 {id:'wan2.2-t2v',name:'Wan 2.2 · Text to Video',type:'text',source:'https://github.com/Wan-Video/Wan2.2',openWeights:true},
 {id:'wan2.2-i2v',name:'Wan 2.2 · Image to Video',type:'image',source:'https://github.com/Wan-Video/Wan2.2',openWeights:true},
 {id:'ltx-video',name:'LTX Video · Text/Image',type:'both',source:'https://github.com/Lightricks/LTX-Video',openWeights:true},
 {id:'hunyuan-video',name:'HunyuanVideo',type:'text',source:'https://github.com/Tencent-Hunyuan/HunyuanVideo',openWeights:true},
 {id:'skyreels-v2',name:'SkyReels V2',type:'both',source:'https://github.com/SkyworkAI/SkyReels-V2',openWeights:true}
]);
const CODES=new Set(VIDEO_MODELS.map(x=>x.id));
function fault(message,status=400){return Object.assign(new Error(message),{status});}
function fixedJson(res,status,data){const b=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':b.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b);}
async function body(req,max=5_800_000){let size=0;const parts=[];for await(const c of req){size+=c.length;if(size>max)throw fault('Request too large',413);parts.push(c)}try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw fault('Invalid JSON',400)}}
export function validVideoWorkerURL(value){
 if(!value)return null;
 try{const u=new URL(String(value));if(u.username||u.password||u.search||u.hash||!['https:','http:'].includes(u.protocol))return null;
  if(u.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(u.hostname))return null;
  if(!['/',''].includes(u.pathname))return null;return u.origin;
 }catch{return null}
}
export function createVideoStudio({dataDir,studio,env=process.env,fetchImpl=fetch,now=()=>Date.now()}={}){
 const worker=validVideoWorkerURL(env.FEZI_VIDEO_WORKER_URL),token=env.FEZI_VIDEO_WORKER_TOKEN||'';
 const active=Boolean(worker&&token.length>=24);
 const store=path.join(dataDir,'video-studio-v101'),file=path.join(store,'jobs.json');let state={jobs:{}};
 let pending=Promise.resolve();const cooldown=new Map();
 const findUser=req=>studio.getAccount(req);
 async function init(){await fs.mkdir(store,{recursive:true,mode:0o700});try{state=JSON.parse(await fs.readFile(file,'utf8'));if(!state.jobs)throw Error('Bad jobs store')}catch(e){if(e.code!=='ENOENT')throw e}}
 function save(){pending=pending.then(async()=>{const t=file+'.'+process.pid+'.tmp';await fs.writeFile(t,JSON.stringify(state),{mode:0o600});await fs.rename(t,file)});return pending}
 function jobView(j){return {id:j.id,model:j.model,status:j.status,progress:j.progress||0,createdAt:j.createdAt,updatedAt:j.updatedAt,error:j.error||null,result:j.status==='completed'?'/api/video-studio/result/'+j.id:null}}
 async function workerCall(method,endpoint,payload){if(!active)throw fault('Video GPU worker not configured; generation disabled',503);
  const ctr=new AbortController();const t=setTimeout(()=>ctr.abort(),method==='POST'?30000:20000);
  try{const r=await fetchImpl(worker+endpoint,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:ctr.signal,redirect:'error'});
    if(!r.ok)throw fault('Video worker unavailable ('+r.status+')',502);
    const text=await r.text();if(text.length>105_000_000)throw fault('Worker response too large',502);
    let answer;try{answer=JSON.parse(text)}catch{throw fault('Worker returned invalid JSON',502)}return answer;
  }catch(e){if(e.name==='AbortError')throw fault('Video worker timed out',504);throw e}finally{clearTimeout(t)}
 }
 async function submit(req,res){const user=findUser(req);if(!user)throw fault('FEZI Studio sign-in required',401);if(!active)throw fault('Video generation needs a licensed/self-hosted GPU worker',503);
  const b=await body(req);const prompt=String(b?.prompt||'').trim();const model=String(b?.model||'wan2.2-t2v');
  if(prompt.length<5||prompt.length>2200)throw fault('Describe your video in 5–2200 characters');
  if(!CODES.has(model))throw fault('Unknown video model');
  const type=VIDEO_MODELS.find(m=>m.id===model).type;
  let inputImage=null;
  if(b.imageBase64){if(type==='text')throw fault('Selected model does not support image input');
   const source=String(b.imageBase64);if(source.length>5_600_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(source))throw fault('Unsupported image or size',413);
   inputImage=source;
  }else if(type==='image')throw fault('This model requires an input image');
  const aspect=String(b.aspect||'16:9');if(!['16:9','9:16','1:1'].includes(aspect))throw fault('Unsupported aspect ratio');
  const uid=String(user.id);if(now()-(cooldown.get(uid)||0)<20000)throw fault('Please wait before generating again',429);
  const running=Object.values(state.jobs).filter(x=>x.userId===uid&&['queued','running'].includes(x.status)).length;
  if(running>=2)throw fault('Maximum 2 active video jobs per account',429);
  const result=await workerCall('POST','/jobs',{prompt,model,aspect,inputImage});
  if(!result||typeof result.id!=='string'||!/^[A-Za-z0-9_-]{5,100}$/.test(result.id))throw fault('Invalid worker job id',502);
  const id=crypto.randomBytes(16).toString('hex');const j={id,userId:uid,remoteId:result.id,model,status:'queued',progress:0,createdAt:new Date(now()).toISOString(),updatedAt:new Date(now()).toISOString(),error:null};
  state.jobs[id]=j;cooldown.set(uid,now());await save();return fixedJson(res,202,jobView(j));
 }
 async function updateJob(j){if(!['queued','running'].includes(j.status))return;
  const x=await workerCall('GET','/jobs/'+encodeURIComponent(j.remoteId));
  if(!x||!['queued','running','completed','failed'].includes(x.status))throw fault('Invalid worker status',502);
  j.status=x.status;j.progress=Math.min(100,Math.max(0,Math.floor(Number(x.progress)||0)));j.updatedAt=new Date(now()).toISOString();
  if(x.status==='failed')j.error=String(x.error||'Generation failed').slice(0,200);
  if(x.status==='completed'){
    const base=String(x.videoBase64||'');
    if(!base||base.length>85_000_000||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base))throw fault('Worker did not return a valid video artifact',502);
    const bytes=Buffer.from(base,'base64');if(bytes.length<128||bytes.length>60_000_000||bytes.toString('ascii',4,8)!=='ftyp')throw fault('Worker returned an invalid or oversized MP4',502);
    const out=path.join(store,j.id+'.mp4');await fs.writeFile(out,bytes,{mode:0o600});j.progress=100;
  }
  await save();
 }
 async function handle(req,res,url){
   if(req.method==='GET'&&url==='/api/video-studio/models')return fixedJson(res,200,{models:VIDEO_MODELS,workerReady:active,mode:active?'licensed-or-self-hosted-worker':'preview-only',publicFreeQueue:false,notice:'Wan2.Video public Gradio queues are not a licensed FEZI API. A self-hosted/authorized video worker is required.'}),true;
   if(req.method==='POST'&&url==='/api/video-studio/jobs'){await submit(req,res);return true}
   if(req.method==='GET'&&/^\/api\/video-studio\/jobs\/[a-f0-9]{32}$/.test(url)){
    const user=findUser(req);if(!user)throw fault('Sign-in required',401);
    const j=state.jobs[url.split('/').pop()];if(!j||j.userId!==String(user.id))throw fault('Job not found',404);
    if(['queued','running'].includes(j.status))await updateJob(j);fixedJson(res,200,jobView(j));return true;
   }
   if(req.method==='GET'&&/^\/api\/video-studio\/result\/[a-f0-9]{32}$/.test(url)){
    const user=findUser(req);if(!user)throw fault('Sign-in required',401);
    const j=state.jobs[url.split('/').pop()];if(!j||j.userId!==String(user.id)||j.status!=='completed')throw fault('Video not available',404);
    const file=path.join(store,j.id+'.mp4');const st=await fs.stat(file);res.writeHead(200,{'content-type':'video/mp4','content-length':st.size,'cache-control':'private,no-store','x-content-type-options':'nosniff','content-disposition':'inline; filename="fezi-video.mp4"'});
    (await import('node:fs')).createReadStream(file).pipe(res);return true;
   }
   return false;
 }
 return {init,handle,models:VIDEO_MODELS,ready:active};
}
