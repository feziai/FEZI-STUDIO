import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {generateLocal} from './core/local-models.js';
import {validateModelName} from './core/validation.js';

const e = process.env;
const MAX_OUTPUT = 850_000;
function bad(message, status=400) { const x=new Error(message);x.status=status;return x; }
function apiError(name,response,body) { throw bad(`${name} returned HTTP ${response.status}: ${body.slice(0,220)}`,502); }
function cleanModel(model) { return validateModelName(model); }
function urlBase(raw) {return String(raw||'').replace(/\/$/,'');}
export function customProviderConfigs(){
  let configs=[];
  try{configs=JSON.parse(e.AI_PROVIDERS_JSON||'[]');}catch{throw bad('AI_PROVIDERS_JSON must be a JSON array');}
  if(!Array.isArray(configs)||configs.length>20)throw bad('AI_PROVIDERS_JSON must contain at most 20 providers');
  return configs.filter(x=>x && /^[a-z][a-z0-9_-]{1,30}$/.test(x.id||'') && /^https:\/\//.test(x.baseUrl||'') && /^[_A-Z][A-Z0-9_]*$/.test(x.keyEnv||'') && typeof x.model==='string');
}
export function providers() {
  const customs=customProviderConfigs().map(c=>({id:'custom:'+c.id,label:c.label||c.id,configured:!!e[c.keyEnv],model:c.model,custom:true}));
  return [
    {id:'local',label:'GGUF inside FEZI AGENT · no API key',configured:e.LOCAL_AI_ENABLED==='true',freeLocal:true,model:e.LOCAL_DEFAULT_MODEL||'coder-mini'},
    {id:'ollama',label:'Ollama · local',configured:true,freeLocal:true,model:e.DEFAULT_MODEL||'gemma3:4b'},
    {id:'compatible',label:'OpenAI-compatible',configured:!!e.AI_BASE_URL,model:e.COMPATIBLE_MODEL||'qwen2.5-coder:7b'},
    {id:'openai',label:'OpenAI · API',configured:!!e.OPENAI_API_KEY,model:e.OPENAI_MODEL||'gpt-4.1-mini'},
    {id:'anthropic',label:'Claude · API',configured:!!e.ANTHROPIC_API_KEY,model:e.ANTHROPIC_MODEL||'claude-sonnet-4-5'},
    {id:'gemini',label:'Google Gemini · API',configured:!!e.GEMINI_API_KEY,model:e.GEMINI_MODEL||'gemini-2.5-flash'},
    {id:'openrouter',label:'OpenRouter · free models only',configured:!!e.OPENROUTER_API_KEY,model:(e.OPENROUTER_MODEL==='openrouter/free'||String(e.OPENROUTER_MODEL||'').endsWith(':free'))?e.OPENROUTER_MODEL:'openrouter/free'},
    {id:'ollama-cloud',label:'Ollama · hosted API (explicit opt-in)',configured:e.OLLAMA_CLOUD_ENABLED==='true'&&!!e.OLLAMA_API_KEY&&!!e.OLLAMA_CLOUD_MODEL,model:e.OLLAMA_CLOUD_MODEL||'gemma4:31b'},
    ...customs
  ];
}
export async function askProvider({provider,model,system,user,responseFormat='json'}) {
  model=cleanModel(model);
  const ctl = new AbortController(); const timer=setTimeout(()=>ctl.abort(),115000);
  const post=async (url,headers,body)=>{
    const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
    const chunks=[];let size=0;
    for await(const chunk of r.body||[]){size+=chunk.length;if(size>MAX_OUTPUT)throw bad(`${provider} returned an oversized response`,502);chunks.push(chunk);}
    const txt=Buffer.concat(chunks).toString('utf8');
    if(!r.ok) apiError(provider,r,txt);
    try{return JSON.parse(txt);}catch{throw bad(`${provider} gave invalid JSON`,502);}
  };
  try {
    let data;
    if(provider==='local') return await generateLocal({model,system,user});
    if(provider==='ollama-cloud') {
      if(e.OLLAMA_CLOUD_ENABLED!=='true'||!e.OLLAMA_API_KEY||!e.OLLAMA_CLOUD_MODEL)throw bad('Ollama Cloud is not configured or opted in',412);
      data=await post('https://ollama.com/api/chat', {Authorization:'Bearer '+e.OLLAMA_API_KEY},
        {model,messages:[{role:'system',content:system},{role:'user',content:user}],stream:false,...(responseFormat==='json'?{format:'json'}:{})});
      return data.message?.content||'';
    }
    if(provider==='ollama') {
      data=await post(urlBase(e.OLLAMA_BASE_URL||'http://127.0.0.1:11434')+'/api/chat',{},
        {model,messages:[{role:'system',content:system},{role:'user',content:user}],stream:false,...(responseFormat==='json'?{format:'json'}:{}),options:{temperature:responseFormat==='json'?0.2:0.8,num_predict:responseFormat==='json'?8192:320}});
      return data.message?.content||'';
    }
    if(provider==='openai'||provider==='compatible'||provider==='openrouter'||provider.startsWith('custom:')) {
      let base,key;
      if(provider==='openai'){base='https://api.openai.com/v1';key=e.OPENAI_API_KEY;}
      else if(provider==='openrouter'){
        // FEZI Studio public chat must NEVER silently route to a paid model.
        if(model!=='openrouter/free'&&!model.endsWith(':free'))throw bad('Paid OpenRouter models are disabled. Choose openrouter/free or a :free model.',403);
        base='https://openrouter.ai/api/v1';key=e.OPENROUTER_API_KEY;
      }
      else if(provider.startsWith('custom:')){
        const c=customProviderConfigs().find(x=>'custom:'+x.id===provider);
        if(!c)throw bad('Unknown custom provider');
        base=c.baseUrl;key=e[c.keyEnv];
      }else {base=e.AI_BASE_URL;key=e.AI_API_KEY;}
      if(!base||(!key&&provider!=='compatible')) throw bad(`${provider} is not configured`,412);
      base=urlBase(base);
      const url=base.endsWith('/chat/completions')?base:base+'/chat/completions';
      data=await post(url,key?{Authorization:'Bearer '+key}:{},{model,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:0.2});
      return data.choices?.[0]?.message?.content||'';
    }
    if(provider==='anthropic') {
      if(!e.ANTHROPIC_API_KEY) throw bad('ANTHROPIC_API_KEY missing',412);
      data=await post('https://api.anthropic.com/v1/messages',{'x-api-key':e.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        {model,max_tokens:8000,system,messages:[{role:'user',content:user}]});
      return (data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
    }
    if(provider==='gemini') {
      if(!e.GEMINI_API_KEY) throw bad('GEMINI_API_KEY missing',412);
      data=await post('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',
        {'x-goog-api-key':e.GEMINI_API_KEY},{systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{temperature:0.2,maxOutputTokens:8192}});
      return (data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
    }
    throw bad('Unsupported provider');
  } finally {clearTimeout(timer);}
}
export const providerModel=(provider)=>providers().find(p=>p.id===provider)?.model;
const validSlug = slug => {if(!/^[a-z0-9][a-z0-9-]{0,34}$/.test(String(slug))||String(slug).endsWith('-'))throw bad('Use a lowercase subdomain slug (letters, digits, hyphens)');return slug;};
const safeStatic = name => /^[\w./@()+ -]{1,150}$/.test(name) && !name.startsWith('/') && !name.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.')) && /\.(html|css|js|mjs|json|txt|md|svg|xml|webmanifest)$/i.test(name);
export async function publishStatic({slug,files,id,root,baseDomain}) {
  slug=validSlug(slug);
  if(!root) throw bad('PUBLISHED_ROOT not configured',412);
  if(!files['index.html'])throw bad('Project requires index.html');
  const entries=Object.entries(files);
  if(entries.length>80||entries.some(([name,body])=>!safeStatic(name)||typeof body!=='string'||Buffer.byteLength(body)>240_000))throw bad('Only supported static text files can be published');
  await fs.mkdir(root,{recursive:true});
  const target=path.join(root,slug), temp=path.join(root,'.build-'+crypto.randomBytes(10).toString('hex'));
  await fs.mkdir(temp,{recursive:true});
  for(const [name,content] of entries){const f=path.join(temp,name);await fs.mkdir(path.dirname(f),{recursive:true});await fs.writeFile(f,content,'utf8');}
  const backups=path.join(path.dirname(root),'fezi-backups');
  let backup=null;
  try {await fs.access(target);await fs.mkdir(backups,{recursive:true});backup=path.join(backups,slug+'-'+Date.now());await fs.rename(target,backup);}catch(err){if(err.code!=='ENOENT')throw err;}
  try{await fs.rename(temp,target);}catch(err){if(backup)await fs.rename(backup,target);throw err;}
  const manifest={projectId:id,slug,url:baseDomain?`https://${slug}.${baseDomain}`:null,publishedAt:new Date().toISOString(),files:entries.length,backup};
  await fs.writeFile(path.join(root,'.fezi-'+slug+'.json'),JSON.stringify(manifest,null,2));
  return manifest;
}
export async function servePublished(req,res,{root,baseDomain}){
  if(!root||!baseDomain)return false;
  const hostname=(req.headers.host||'').toLowerCase().split(':')[0];
  if(!hostname.endsWith('.'+baseDomain.toLowerCase()))return false;
  const slug=hostname.slice(0,-(baseDomain.length+1));
  if(!/^[a-z0-9][a-z0-9-]{0,34}$/.test(slug))return false;
  const pathname=new URL(req.url,'http://example.test').pathname;
  let name;try{name=decodeURIComponent(pathname).replace(/^\/+/, '')||'index.html';}catch{res.writeHead(400);res.end();return true;}
  if(!safeStatic(name)){res.writeHead(404);res.end();return true;}
  try{
    const data=await fs.readFile(path.join(root,slug,name));
    if(data.length>240_000){res.writeHead(413);res.end();return true;}
    const ext=path.extname(name).toLowerCase();
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.txt':'text/plain','.md':'text/plain','.svg':'image/svg+xml','.xml':'application/xml','.webmanifest':'application/manifest+json'};
    res.writeHead(200,{'Content-Type':(types[ext]||'text/plain')+'; charset=utf-8','Content-Security-Policy':"default-src 'self' data: blob: https:; object-src 'none'; base-uri 'self'",'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=60'});
    res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
  return true;
}
const GH='https://api.github.com';
async function github(method,uri,body){
  if(!e.GITHUB_TOKEN)throw bad('GITHUB_TOKEN missing',412);
  const r=await fetch(GH+uri,{method,headers:{Authorization:'Bearer '+e.GITHUB_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','content-type':'application/json','User-Agent':'FEZI-Studio'},body:body===undefined?undefined:JSON.stringify(body)});
  let data;try{data=await r.json();}catch{data={};}
  if(!r.ok) throw bad(`GitHub API HTTP ${r.status}: ${String(data.message||'unknown').slice(0,180)}`,502);
  return data;
}
export async function githubPublish({repo,projectName,files,subdomain,baseDomain}) {
  if(typeof repo!=='string'||!/^[-\w.]{1,45}\/[-\w.]{1,90}$/.test(repo))throw bad('Repo must be owner/name');
  const allow=(e.GITHUB_ALLOWED_REPOS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!allow.includes(repo))throw bad('Repository not in GITHUB_ALLOWED_REPOS allowlist',403);
  if(Object.keys(files).length>80||Object.entries(files).some(([f,c])=>!safeStatic(f)||typeof c!=='string'))throw bad('Only static files supported');
  const meta=await github('GET',`/repos/${repo}`);
  const base=meta.default_branch;
  const ref=await github('GET',`/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
  const parent=ref.object.sha;
  const commit=await github('GET',`/repos/${repo}/git/commits/${parent}`);
  const timestamp=Date.now().toString(36);
  const branch='fezi/'+timestamp+'-'+crypto.randomBytes(3).toString('hex');
  const working={...files};
  if(subdomain&&baseDomain){validSlug(subdomain);working.CNAME=subdomain+'.'+baseDomain;}
  const tree=await github('POST',`/repos/${repo}/git/trees`,{base_tree:commit.tree.sha,tree:Object.entries(working).map(([p,c])=>({path:p,mode:'100644',type:'blob',content:c}))});
  const newCommit=await github('POST',`/repos/${repo}/git/commits`,{message:`FEZI AGENT: ${String(projectName||'Publish').slice(0,70)}`,tree:tree.sha,parents:[parent]});
  await github('POST',`/repos/${repo}/git/refs`,{ref:`refs/heads/${branch}`,sha:newCommit.sha});
  try{
    const pr=await github('POST',`/repos/${repo}/pulls`,{title:`FEZI AGENT: ${String(projectName||'site').slice(0,70)}`,head:branch,base,body:'Generated by FEZI AGENT. Review changes, merge and configure hosting/Pages before publishing.'});
    return {repo,branch,commit:newCommit.sha,pullRequest:pr.html_url,reviewRequired:true};
  }catch(error){return {repo,branch,commit:newCommit.sha,branchUrl:`https://github.com/${repo}/tree/${branch}`,reviewRequired:true,warning:'Branch created; pull request could not be opened: '+error.message};}
}
export async function webhookDeploy({id,files,slug}) {
  const endpoint=e.DEPLOY_WEBHOOK_URL;
  if(!endpoint)throw bad('DEPLOY_WEBHOOK_URL not configured',412);
  const url=new URL(endpoint);
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw bad('Deployment webhook must use HTTPS');
  if(!e.DEPLOY_WEBHOOK_SECRET||e.DEPLOY_WEBHOOK_SECRET.length<20)throw bad('DEPLOY_WEBHOOK_SECRET must be 20+ chars',412);
  validSlug(slug);
  const payload=JSON.stringify({projectId:id,slug,files,at:new Date().toISOString()});
  const sig=crypto.createHmac('sha256',e.DEPLOY_WEBHOOK_SECRET).update(payload).digest('hex');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
  try {const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-fezi-signature':'sha256='+sig},body:payload});
    if(!r.ok)throw bad('Remote deployment rejected: HTTP '+r.status,502);return {ok:true,status:r.status};
  }finally{clearTimeout(timer);}
}
