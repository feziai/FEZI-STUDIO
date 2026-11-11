import fs from 'node:fs/promises';
import path from 'node:path';

const BAD=message=>Object.assign(new Error(message),{status:400});
const ONE_DAY=24*60*60*1000;
const DEFAULT_URLS={openrouter:'https://openrouter.ai/api/v1/models',huggingface:'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=80',github:'https://api.github.com/search/repositories?q=ai+agent+mcp+telegram+in:name,description&sort=updated&per_page=30'};
const nonnegative=x=>Number.isFinite(Number(x))&&Number(x)>=0;
const zero=x=>nonnegative(x)&&Number(x)===0;
const text=x=>String(x??'').slice(0,240);
function safeLink(url){try{const u=new URL(url);return u.protocol==='https:'?u.toString().slice(0,500):''}catch{return ''}}
function entriesOpenRouter(raw){
 const entries=Array.isArray(raw?.data)?raw.data:[];
 return entries.filter(x=>typeof x?.id==='string'&&(x.id==='openrouter/free'||x.id.endsWith(':free'))&&zero(x.pricing?.prompt)&&zero(x.pricing?.completion))
  .slice(0,180).map(x=>({source:'openrouter',id:text(x.id),name:text(x.name||x.id),kind:'api-model',free:true,live:false,license:'provider-terms',url:safeLink('https://openrouter.ai/'+x.id),description:text(x.description),context_length:Number(x.context_length)||null}));
}
function entriesHF(raw){
 return (Array.isArray(raw)?raw:[]).filter(x=>typeof x?.id==='string'&&!x.gated).slice(0,80).map(x=>({source:'huggingface',id:text(x.id),name:text(x.id.split('/').at(-1)),kind:'model-weights',free:!!x.id,live:false,license:text(x.cardData?.license||x.license||'verify'),url:safeLink('https://huggingface.co/'+x.id),task:text(x.pipeline_tag),updated:text(x.lastModified),downloads:Number(x.downloads)||0,versions:'see-model-repo'}));
}
function entriesGithub(raw){
 return (Array.isArray(raw?.items)?raw.items:[]).filter(x=>x.full_name&&x.license?.spdx_id && x.license.spdx_id!=='NOASSERTION'&&!x.archived)
 .slice(0,40).map(x=>({source:'github',id:text(x.full_name),name:text(x.name||x.full_name),kind:'source-repo',free:true,live:false,license:text(x.license.spdx_id),url:safeLink(x.html_url),description:text(x.description),updated:text(x.pushed_at),stars:Number(x.stargazers_count)||0}));
}
export function parseCatalog(source,raw){if(source==='openrouter')return entriesOpenRouter(raw);if(source==='huggingface')return entriesHF(raw);if(source==='github')return entriesGithub(raw);throw BAD('Unsupported catalog source')}
export function createFeziDiscovery({dataDir,fetchImpl=fetch,now=()=>Date.now(),sources=DEFAULT_URLS}={}){
 const saveTo=path.join(dataDir,'model-discovery','catalog.json');let snapshot={updatedAt:null,providers:{},entries:[],stale:true};let running=null;
 async function init(){try{const old=JSON.parse(await fs.readFile(saveTo,'utf8'));if(Array.isArray(old.entries))snapshot=old}catch(e){if(e.code!=='ENOENT')throw e}}
 async function readSource(source){
  const headers={'Accept':'application/json','User-Agent':'FEZIStudio-Catalog/1.0'};
  if(source==='github'&&process.env.GITHUB_DISCOVERY_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_DISCOVERY_TOKEN;
  const response=await fetchImpl(sources[source],{headers,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error(source+' HTTP '+response.status);
  const body=await response.json();return parseCatalog(source,body);
 }
 async function refresh(){if(running)return running;running=(async()=>{
  const updatedAt=new Date(now()).toISOString(),providers={},entries=[];
  for(const source of ['openrouter','huggingface','github']){
   try{const arr=await readSource(source);providers[source]={status:'ok',count:arr.length};entries.push(...arr)}
   catch(error){providers[source]={status:'error',message:String(error.message||'unavailable').slice(0,100)};
    entries.push(...snapshot.entries.filter(x=>x.source===source));}
  }
  snapshot={updatedAt,providers,entries,stale:false};await fs.mkdir(path.dirname(saveTo),{recursive:true});const tmp=saveTo+'.tmp';await fs.writeFile(tmp,JSON.stringify(snapshot,null,2),{mode:0o600});await fs.rename(tmp,saveTo);
  return view();
 })().finally(()=>{running=null});return running}
 function view({source,query='',limit=80}={}){
   const q=String(query).toLowerCase().slice(0,100);const max=Math.max(1,Math.min(250,Number(limit)||80));const rows=snapshot.entries.filter(x=>(!source||x.source===source)&&(!q||[x.id,x.name,x.description,x.task].some(v=>String(v||'').toLowerCase().includes(q))));
   return {updatedAt:snapshot.updatedAt,stale:!snapshot.updatedAt||now()-Date.parse(snapshot.updatedAt)>ONE_DAY,providers:snapshot.providers,count:rows.length,entries:rows.slice(0,max),note:'Discovered metadata only; these models are NOT installed or runtime-verified.'};
 }
 function start({enabled=false}={}){if(!enabled)return {enabled:false};const timer=setInterval(()=>refresh().catch(()=>{}),ONE_DAY);timer.unref?.();setTimeout(()=>refresh().catch(()=>{}),10000).unref?.();return {enabled:true,intervalHours:24}}
 return {init,refresh,view,start};
}
