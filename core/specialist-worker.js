/** Explicit opt-in specialist inference. This adapter never promises that an
 * image/video/speech file exists unless a configured worker returns success.
 * A worker may reside on a separately managed server, not on shared cPanel.
 */
import {SPECIALISTS} from './model-registry.js';
import {publicSummary} from './fezi-router.js';
const bad=(message,status=412)=>Object.assign(new Error(message),{status});
const ALLOWED=new Set(['ocr','embedding','rerank','speech_to_text','text_to_speech','image','video']);
export function workerConfig(){
  const raw=process.env.FEZI_WORKER_URL||'';
  if(!raw)return null;
  let url;try{url=new URL(raw);}catch{throw bad('Invalid FEZI_WORKER_URL',400);}
  const local=['127.0.0.1','localhost','::1','[::1]'].includes(url.hostname);
  if(url.username||url.password||url.hash||(!local&&url.protocol!=='https:')||!['https:','http:'].includes(url.protocol))throw bad('Worker must use HTTPS (except localhost), no embedded credentials',400);
  if(!local&&!process.env.FEZI_WORKER_TOKEN)throw bad('FEZI_WORKER_TOKEN required for remote worker',400);
  return {url:url.toString(),token:process.env.FEZI_WORKER_TOKEN||''};
}
export async function runSpecialist({role,prompt,inputs={},fetchImpl=fetch}={}){
  if(!ALLOWED.has(role))throw bad('Not a supported specialist execution role',400);
  if(typeof prompt!=='string'||prompt.length<3||prompt.length>12000)throw bad('Invalid specialist prompt',400);
  if(!inputs||typeof inputs!=='object'||Array.isArray(inputs))throw bad('Invalid inputs',400);
  const json=JSON.stringify(inputs);
  if(json.length>500_000)throw bad('Worker input too large',413);
  const cfg=workerConfig();if(!cfg)throw bad('Specialist worker not connected. Configure FEZI_WORKER_URL before requesting rendered files.');
  const model=SPECIALISTS.find(x=>x.role===role&&x.runtime==='worker');
  if(!model)throw bad('No specialist model for this role');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.min(120000,Math.max(1000,Number(process.env.FEZI_WORKER_TIMEOUT_MS)||60000)));
  try{
    const res=await fetchImpl(cfg.url,{method:'POST',redirect:'error',signal:controller.signal,headers:{'content-type':'application/json',...(cfg.token?{'authorization':'Bearer '+cfg.token}:{})},body:JSON.stringify({role,model:model.repository,prompt,inputs})});
    if(!res.ok)throw bad('FEZI AGENT specialist worker is unavailable',502);
    const size=Number(res.headers?.get?.('content-length')||0);
    if(size>1024*1024)throw bad('Specialist worker response too large',502);
    const decoder=new TextDecoder('utf-8',{fatal:true});let data='',bytes=0;
    for await (const part of res.body||[]) {bytes+=part.byteLength;if(bytes>1024*1024)throw bad('Specialist worker response too large',502);data+=decoder.decode(part,{stream:true});}
    data+=decoder.decode();
    let result;try{result=JSON.parse(data);}catch{throw bad('Invalid worker response',502);}
    if(!result || result.ok!==true || typeof result.summary!=='string')throw bad('Worker did not confirm a completed output',502);
    // Do not return internal model identities or secrets to the public client.
    let artifact=null;
    if(typeof result.artifact==='string'&&result.artifact.length<4000){try{const u=new URL(result.artifact);if(u.protocol==='https:'&&!u.username&&!u.password)artifact=u.toString();}catch{}}
    return {brand:'FEZI AGENT',status:'completed',role,summary:publicSummary(result.summary.slice(0,4000)),artifact};
  }finally{clearTimeout(timeout);}
}
