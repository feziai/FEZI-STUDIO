/** FEZI Studio v1.5: modular public catalog, accounts, moderated community, SEO.
 * Security: user-created work stays private until explicit publish consent AND owner approval.
 * Existing owner login, model router, all previous APIs remain unchanged.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {providerCredentials,flowCookie,checkFlowCookie,challenge,githubIdentity,facebookIdentity,telegramDiscovery,telegramIdentity,googleIdentity} from './social-oauth-v102.js';
import models from '../config/studio-models-v15.json' with {type:'json'};
import wallets from './arina-wallets.json' with {type:'json'};
import legacyModels from '../config/open-models.json' with {type:'json'};

const bySlug=new Map(models.map(x=>[x.slug,x]));
const legacyById=new Map(legacyModels.map(x=>[x.id,x]));
function googleOAuthConfig(){
 const clientId=process.env.GOOGLE_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID||'';
 const clientSecret=process.env.GOOGLE_CLIENT_SECRET||process.env.GOOGLE_OAUTH_CLIENT_SECRET||'';
 return {clientId,clientSecret};
}
function modelIconKey(m){
 const v=String(m?.name||'')+' '+String(m?.id||'');
 const map=[['qwen',/qwen/i],['deepseek',/deepseek/i],['llama',/llama/i],['gemma',/gemma/i],['mistral',/mistral|mixtral/i],['wan',/wan[0-9 .]/i],['ltx',/ltx/i],['flux',/flux/i],['stable',/stable.diffusion|sdxl/i],['cline',/cline/i],['comfyui',/comfyui/i],['whisper',/whisper/i],['openai',/openai|gpt/i],['gemini',/gemini/i],['grok',/grok/i]];
 return map.find(([_,re])=>re.test(v))?.[0]||({video:'video',image:'image',coding:'code'})[m.category]||'generic';
}
function enabledModel(m){const ids=new Set(String(process.env.STUDIO_ENABLED_MODELS||'').split(',').map(x=>x.trim()).filter(Boolean));const legacy=legacyById.get(m.id);return Boolean(legacy&&ids.has(m.id)&&(legacy.runtime==='gpu'?process.env.FEZI_GPU_WORKER_URL:(process.env.OLLAMA_BASE_URL||process.env.AI_BASE_URL)));}
const registered=new Map(), rate=new Map();
const MAX_LOGIN_ATTEMPTS=10;
const invalid=(s,code=400)=>Object.assign(new Error(s),{status:code});
const human=x=>typeof x==='string'?x.trim():'';
const clean=x=>String(x||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
function checkRate(key,max=20,interval=3600000){const t=Date.now(),r=rate.get(key)||[];const s=r.filter(n=>n>t-interval);if(s.length>=max)throw invalid('Rate limit exceeded',429);s.push(t);rate.set(key,s);if(rate.size>25000)rate.clear();}
function reply(res,code,value,ctype='application/json; charset=utf-8'){
 const buf=Buffer.from(ctype.startsWith('application/json')?JSON.stringify(value):value);
 res.writeHead(code,{'content-type':ctype,'content-length':buf.length,'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin'});res.end(buf);return true;
}
function mimeFor(f){return f.endsWith('.js')?'application/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':f.endsWith('.webmanifest')?'application/manifest+json':'text/html; charset=utf-8';}
const shortModel=m=>({id:m.id,slug:m.slug,name:m.name,category:m.category,kind:m.kind,adultCatalog:m.adultCatalog,license:m.license,licenseVerified:m.licenseVerified,source:m.source,sourceUrl:m.sourceUrl,installed:false,available:enabledModel(m),connectionStatus:enabledModel(m)?'configured-unverified':'not-configured',notes:m.notes,capabilities:m.capabilities,capabilitiesSource:m.capabilitiesSource||null});
function credentials(pass,salt){return crypto.scryptSync(pass,salt,64).toString('hex')}
function decodeCookie(req,key){return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1)||'';}
function xSafe(a,b){const A=Buffer.from(a),B=Buffer.from(b);return A.length===B.length&&crypto.timingSafeEqual(A,B)}
function contentPolicy(text){
 const v=human(text).toLowerCase();
 // A limited text prefilter is no substitute for a deployed image/video moderation service.
 if(/(?:child|minor|underage|kid|کودک|نابالغ).{0,90}(?:sex|nude|porn|برهنه|جنسی)|(?:sex|nude|porn|برهنه|جنسی).{0,90}(?:child|minor|underage|kid|کودک|نابالغ)/i.test(v))throw invalid('This request is prohibited',422);
 if(/(?:nonconsensual|deepfake|بدون رضایت|دیپ فیک).{0,80}(?:nude|porn|sexual|برهنه|جنسی)/i.test(v))throw invalid('Unconsented sexual deepfakes are prohibited',422);
}
export function createStudioV15({root,dataDir,sessionSecret,authenticatedOwner,runText,runGeneration,getGenerationStatus,extraSitemapPaths=()=>[],verifyCaptcha=null}){
 const FILE=path.join(dataDir,'studio-v15','state.json');
 const MEDIA=path.join(dataDir,'studio-v15','media');
 let state={users:[],posts:[],jobs:[]};let lock=Promise.resolve();
 async function init(){await fs.mkdir(MEDIA,{recursive:true,mode:0o700});try{state=JSON.parse(await fs.readFile(FILE,'utf8'));if(!Array.isArray(state.users)||!Array.isArray(state.posts))throw Error('Invalid state');if(!Array.isArray(state.jobs))state.jobs=[]}catch(e){if(e.code!=='ENOENT')throw e;}}
 function mutate(fn){const task=lock.then(async()=>{const ret=await fn();await fs.mkdir(path.dirname(FILE),{recursive:true,mode:0o700});const p=FILE+'.tmp';await fs.writeFile(p,JSON.stringify(state),{mode:0o600});await fs.rename(p,FILE);return ret});lock=task.catch(()=>{});return task}
 function makeCookie(user){const expires=Date.now()+30*86400000,payload=`${user.id}.${user.nonce}.${expires}`,sign=crypto.createHmac('sha256',sessionSecret).update(payload).digest('hex');return payload+'.'+sign}
 function account(req){const raw=decodeCookie(req,'fezi_user');const match=/^([a-f0-9]{32})\.([a-f0-9]{24})\.(\d{13})\.([a-f0-9]{64})$/.exec(raw);if(!match||+match[3]<Date.now())return null;const msg=match.slice(1,4).join('.');if(!xSafe(match[4],crypto.createHmac('sha256',sessionSecret).update(msg).digest('hex')))return null;return state.users.find(u=>u.id===match[1]&&u.nonce===match[2])||null}
 function publicUser(u){return {providers:{google:!!u.googleSub,github:!!u.githubSub,facebook:!!u.facebookSub,telegram:!!u.telegramSub},id:u.id,name:u.name,username:u.username||null,email:u.email,avatar:u.avatar,avatarUrl:u.avatar==='uploaded'?'/api/account/avatar/me':null,joinedAt:u.createdAt,emailVerified:!!u.emailVerified,hasRecoveryCodes:!!(u.recoveryHashes?.length),creditsUsd:0,paymentsEnabled:false, walletNote:'Balance is updated only by a verified payment processor. No automatic credit from manual receipts.'}}
 function setCookie(req,res,token){res.setHeader('Set-Cookie',`fezi_user=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${req.socket.encrypted||process.env.COOKIE_SECURE==='true'||siteHost(req).startsWith('https://')?'; Secure':''}`)}
 function clearCookie(req,res){res.setHeader('Set-Cookie',`fezi_user=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${req.socket.encrypted||process.env.COOKIE_SECURE==='true'||siteHost(req).startsWith('https://')?'; Secure':''}`)}
 async function readJSON(req,max=21000000){let size=0,arr=[];for await(const part of req){size+=part.length;if(size>max)throw invalid('Payload too large',413);arr.push(part)}let data;try{data=JSON.parse(Buffer.concat(arr).toString('utf8'))}catch{throw invalid('Invalid JSON')}if(!data||typeof data!=='object'||Array.isArray(data))throw invalid('Object required');return data}
 function requireUser(req){const u=account(req);if(!u)throw invalid('Please sign in',401);return u}
 async function file(res,rel){const bytes=await fs.readFile(path.join(root,'public',rel));res.writeHead(200,{'content-type':mimeFor(rel),'content-length':bytes.length,'cache-control':'no-cache','x-content-type-options':'nosniff','x-frame-options':'DENY'});res.end(bytes);return true}
 function siteHost(req){const configured=String(process.env.PUBLIC_BASE_URL||'').trim();if(/^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(configured))return configured;const host=String(req.headers.host||'').toLowerCase();return /^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host)?'http://'+host:'https://example.com'}
 function makeSitemap(req){let entries=['/','/fa/','/studio','/playground','/writing','/community','/faq','/arina-live','/arina-gallery','/toolbox','/avatar','/free-ai','/prompt-creator','/telegram-builder',...extraSitemapPaths(),...models.flatMap(x=>['/ai/'+encodeURIComponent(x.slug),'/fa/ai/'+encodeURIComponent(x.slug)])];return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.map(u=>`<url><loc>${clean(siteHost(req)+u)}</loc></url>`).join('\n')+'\n</urlset>'}
 function modelPage(m,req,locale='en'){const title=clean(m.name)+' — FEZI Studio AI Models';const faCategory=({video:'ساخت ویدیو',image:'ساخت عکس',coding:'کدنویسی',writing:'نوشتن و متن',avatar:'آواتار و انیمیشن',runtime:'موتور اجرا',voice:'صدا و گفتار'})[m.category]||'هوش مصنوعی';const intro=m.category==='video'?'Video generation model':m.category==='image'?'Image generation model':m.category==='coding'?'AI coding model':m.category==='writing'?'AI writing and roleplay model':'AI tool and model';const caps=m.capabilities;const faqItems=[{q:`Is ${m.name} completely free?`,a:'The catalog does not promise free hosting. Self-hosting may need significant hardware and licensing checks.'},{q:`How many images and seconds does ${m.name} support?`,a:caps.imageInputs===null?'Reference image count is not verified for this exact model variant.':`Verified reference image count: ${caps.imageInputs}. Duration options: ${caps.durationOptionsSec?.join(', ')||'Not verified'} seconds.`},{q:`Can I run ${m.name} on FEZI Studio now?`,a:'This catalog record is not installed. Configure a compatible permitted inference worker first.'}];const faqHtml=faqItems.map(x=>`<details><summary>${clean(x.q)}</summary><p>${clean(x.a)}</p></details>`).join('');const rows=[['Task / کاربرد',m.category],['License / مجوز',m.license],['Status / وضعیت','Catalog entry — not installed'],['Images / تعداد تصویر',caps.imageInputs===null?'Unverified / نامشخص':String(caps.imageInputs)],['Durations / زمان ویدیو',caps.durationOptionsSec?.join(', ')+' s'||'Unverified / نامشخص'],['Original source / منبع',m.source]].map(([k,v])=>`<tr><th>${clean(k)}</th><td>${clean(v)}</td></tr>`).join('');const safeSource=m.sourceUrl?.startsWith('https://')?`<a href="${clean(m.sourceUrl)}" rel="noopener noreferrer" target="_blank">Official model page</a>`:'<span>Source link not yet verified</span>';
 return `<!doctype html><html lang="${locale}" dir="${locale==='fa'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${locale==='fa'?'مدل هوش مصنوعی '+clean(m.name)+' — فزی استودیو':title}</title><meta name="description" content="${clean(intro)} — model details, input limits, license and self-hosting requirements. Not advertised as free hosted inference."><link rel="canonical" href="${clean(siteHost(req)+(locale==='fa'?'/fa':'')+'/ai/'+m.slug)}"><link rel="alternate" hreflang="en" href="${clean(siteHost(req)+'/ai/'+m.slug)}"><link rel="alternate" hreflang="fa" href="${clean(siteHost(req)+'/fa/ai/'+m.slug)}"><link rel="stylesheet" href="/studio/ui.css"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'SoftwareApplication',name:m.name,applicationCategory:intro,operatingSystem:'Self-hosted',url:'/ai/'+m.slug}).replace(/</g,'\\u003c')}</script></head><body><header class="top"><a class="brand" href="/"><img src="/brand/fezi-rabbit-f.png" alt="FEZI logo">FEZI STUDIO</a><nav><a href="/studio">AI Studio</a><a href="/writing">Writing</a><a href="/playground">Playground</a></nav></header><main class="wrap"><div class="surface"><p class="eyebrow">AI MODEL DIRECTORY • ${clean(m.category.toUpperCase())}</p><h1 style="display:flex;gap:12px;align-items:center"><img src="/model-assets/icons/${modelIconKey(m)}.svg" width="48" height="48" alt="Model icon" loading="lazy">${clean(m.name)}</h1><p>${clean(intro)} · ${clean(m.notes)}</p><p lang="fa" dir="rtl">مدل یا ابزار «${clean(m.name)}» در دسته «${clean(faCategory)}» قرار دارد. ثبت در کاتالوگ به معنای نصب روی سرور یا رایگان بودن سرویس اجرا نیست. تعداد عکس ورودی، زمان ویدیو و شرایط مجوز باید برای نسخه دقیق مدل بررسی شوند.</p>${m.adultCatalog?'<p class="pill">Listed in adult-oriented community catalog · 18+ entry · restrictions still apply</p>':''}<table>${rows}</table><p>${safeSource}</p><h2>Model FAQ / پرسش‌های مدل</h2>${faqHtml}<details lang="fa" dir="rtl"><summary>آیا ${clean(m.name)} روی سرور FEZI نصب شده است؟</summary><p>خیر، این صفحه در حال حاضر معرفی مدل است. اجرای واقعی به نصب مدل و اتصال GPU یا موتور مناسب نیاز دارد.</p></details><details lang="fa" dir="rtl"><summary>آیا استفاده از ${clean(m.name)} کاملاً رایگان است؟</summary><p>دانلود وزن بعضی مدل‌ها رایگان است، ولی پردازش، سرور و مجوز تجاری لزوماً رایگان نیستند.</p></details><p class="soft">This entry is informational. Runtime, license and model availability must be verified. FEZI does not provide an unlimited free hosted API.</p><a class="btn" href="/studio?model=${m.slug}">Open AI Studio</a><a class="secondary" href="/faq">Questions &amp; FAQ</a></div></main></body></html>`}
 const videoMime=(m,b)=>m==='image/png'&&b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||m==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255||m==='image/webp'&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'||m==='video/mp4'&&b.toString('ascii',4,8)==='ftyp';
 async function socialSignIn(req,res,provider,info,flow){
  if(!/^[a-z0-9_-]{2,150}$/i.test(String(info.sub||'')))throw invalid('Invalid verified external identity',401);
  const field=provider+'Sub';let user;
  await mutate(()=>{
   const owner=state.users.find(u=>u[field]===info.sub);
   if(flow.uid){const current=account(req);if(!current||current.id!==flow.uid)throw invalid('Sign in to your existing FEZI account to link it',401);
    if(owner&&owner.id!==current.id)throw invalid('This external account is already connected',409);
    current[field]=info.sub;user=current;
   }else{
    user=owner;
    if(!user){const email=info.emailVerified?String(info.email||'').toLowerCase():'';
     if(email&&state.users.some(u=>u.email===email))throw invalid('An account with this email already exists. Sign in with its original method and link the external account.',409);
     const salt=crypto.randomBytes(16).toString('hex');user={id:crypto.randomBytes(16).toString('hex'),[field]:info.sub,email,emailVerified:!!email,name:String(info.name||provider+' user').slice(0,50),username:provider.slice(0,2)+'_'+crypto.randomBytes(8).toString('hex'),salt,hash:credentials(crypto.randomBytes(32).toString('hex'),salt),nonce:crypto.randomBytes(12).toString('hex'),avatar:'rabbit',createdAt:new Date().toISOString()};
     state.users.push(user);
    }
   }
  });
  setCookie(req,res,makeCookie(user));
  const cookies=res.getHeader('Set-Cookie');
  const name='fezi_'+provider+'_flow';
  res.setHeader('Set-Cookie',[cookies,`${name}=; HttpOnly; ${siteHost(req).startsWith('https://')?'Secure; ':''}SameSite=Lax; Path=/auth/${provider}; Max-Age=0`]);
  res.writeHead(302,{Location:'/profile'});res.end();return true;
 }
 async function socialOAuth(req,res,provider,isCallback){
  const config=providerCredentials()[provider];if(!config?.id||!config?.secret)throw invalid(provider+' sign-in not configured on server',503);
  const origin=siteHost(req);if(origin==='https://example.com')throw invalid('Set PUBLIC_BASE_URL to your real HTTPS website domain',503);
  const redirect=origin+'/auth/'+provider+'/callback',name='fezi_'+provider+'_flow';
  const query=new URL(req.url,origin).searchParams;
  if(!isCallback){
   checkRate('oauth-start-'+provider+'-'+req.socket.remoteAddress,20,900000);
   const linked=query.get('link')==='1'?requireUser(req).id:'';
   const flow=flowCookie(provider,sessionSecret,{userId:linked});
   res.setHeader('Set-Cookie',`${name}=${flow.value}; HttpOnly; ${origin.startsWith('https://')?'Secure; ':''}SameSite=Lax; Path=/auth/${provider}; Max-Age=600`);
   let authorize;
   if(provider==='github'){
    authorize=new URL('https://github.com/login/oauth/authorize');
    for(const [k,v] of Object.entries({client_id:config.id,redirect_uri:redirect,scope:'read:user user:email',state:flow.state,code_challenge:challenge(flow.verifier),code_challenge_method:'S256'}))authorize.searchParams.set(k,v);
   }else if(provider==='facebook'){
    authorize=new URL('https://www.facebook.com/'+(process.env.FACEBOOK_GRAPH_VERSION||'v24.0')+'/dialog/oauth');
    for(const [k,v] of Object.entries({client_id:config.id,redirect_uri:redirect,scope:'public_profile,email',state:flow.state,response_type:'code'}))authorize.searchParams.set(k,v);
   }else if(provider==='telegram'){
    const d=await telegramDiscovery();authorize=new URL(d.authorization_endpoint);
    for(const [k,v] of Object.entries({client_id:config.id,redirect_uri:redirect,response_type:'code',scope:'openid profile',state:flow.state,nonce:flow.nonce,code_challenge:challenge(flow.verifier),code_challenge_method:'S256'}))authorize.searchParams.set(k,v);
   }
   res.writeHead(302,{Location:authorize.toString(),'cache-control':'no-store'});res.end();return true;
  }
  checkRate('oauth-callback-'+provider+'-'+req.socket.remoteAddress,20,900000);
  if(query.get('error'))throw invalid(provider+' authorization was cancelled or denied',401);
  const stateParam=query.get('state')||'',code=query.get('code')||'';
  if(!code||!stateParam)throw invalid('Missing OAuth callback parameters',400);
  let flow;try{flow=checkFlowCookie(decodeCookie(req,name),sessionSecret,provider,stateParam)}catch{throw invalid('OAuth CSRF state missing, invalid, or expired',400)}
  let identity;
  if(provider==='github')identity=await githubIdentity(code,redirect,config,flow.verifier);
  else if(provider==='facebook')identity=await facebookIdentity(code,redirect,config,process.env.FACEBOOK_GRAPH_VERSION||'v24.0');
  else identity=await telegramIdentity(code,redirect,config,flow,await telegramDiscovery());
  return socialSignIn(req,res,provider,identity,flow);
 }
 async function handle(req,res,url){
  if(req.method==='GET'&&url==='/api/auth/providers'){
   const origin=siteHost(req),x=providerCredentials(),g=googleOAuthConfig();
   const providers={};for(const n of ['google','github','telegram','facebook']){
    const configured=n==='google'?!!(g.clientId&&g.clientSecret):!!(x[n].id&&x[n].secret);
    providers[n]={configured,available:configured,loginUrl:'/auth/'+n,redirectUri:origin+'/auth/'+n+'/callback',setup:configured?'credentials-set-not-live-verified':'requires-provider-oauth-credentials'};
   }
   providers.chatgpt={configured:false,available:false,status:'limited-partner-access-not-a-public-self-service-oauth'};
   return reply(res,200,{providers,origin,secure:origin.startsWith('https://'),notice:'Configured does not mean provider login verified. Never expose secrets in frontend.'});
  }
  if(req.method==='GET'&&/^\/auth\/(github|facebook|telegram)(\/callback)?$/.test(url)){
   const matched=/^\/auth\/(github|facebook|telegram)(\/callback)?$/.exec(url);
   return socialOAuth(req,res,matched[1],!!matched[2]);
  }
  if(req.method==='GET'&&url==='/auth/chatgpt')return reply(res,501,{error:'Sign in with ChatGPT is partner-gated; no OAuth credentials are available for FEZI Studio.',docs:'https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt'});
  if(req.method==='GET'&&url==='/api/auth/google/status'){
   const {clientId,clientSecret}=googleOAuthConfig();const configured=Boolean(clientId&&clientSecret);
   return reply(res,200,{configured,redirectUri:siteHost(req)+'/auth/google/callback',origin:siteHost(req),status:configured?'credentials-configured-not-live-tested':'missing-google-oauth-credentials',requiresHttps:!/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(siteHost(req))});
  }
  if(req.method==='GET'&&url==='/auth/google'){
   const config=googleOAuthConfig();if(!config.clientId||!config.clientSecret)throw invalid('Google sign-in not configured',503);
   const origin=siteHost(req),flow=flowCookie('google',sessionSecret,{userId:new URL(req.url,origin).searchParams.get('link')==='1'?requireUser(req).id:''});
   res.setHeader('Set-Cookie',`fezi_google_flow=${flow.value}; HttpOnly; ${origin.startsWith('https://')?'Secure; ':''}SameSite=Lax; Path=/auth/google; Max-Age=600`);
   const authorize=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [k,v] of Object.entries({client_id:config.clientId,redirect_uri:origin+'/auth/google/callback',response_type:'code',scope:'openid email profile',state:flow.state,nonce:flow.nonce,code_challenge:challenge(flow.verifier),code_challenge_method:'S256'}))authorize.searchParams.set(k,v);
   res.writeHead(302,{Location:authorize.toString(),'cache-control':'no-store'});res.end();return true;
  }
  if(req.method==='GET'&&url==='/auth/google/callback'){
   const config=googleOAuthConfig();if(!config.clientId||!config.clientSecret)throw invalid('Google sign-in not configured',503);
   checkRate('google-'+req.socket.remoteAddress,20,900000);
   const origin=siteHost(req),query=new URL(req.url,origin).searchParams;
   if(query.get('error'))throw invalid('Google authorization cancelled',401);
   if(!query.get('code')||!query.get('state'))throw invalid('Invalid Google callback',400);
   let flow;try{flow=checkFlowCookie(decodeCookie(req,'fezi_google_flow'),sessionSecret,'google',query.get('state'))}catch{throw invalid('Invalid or expired Google OAuth state',400)}
   const identity=await googleIdentity(query.get('code'),origin+'/auth/google/callback',{id:config.clientId,secret:config.clientSecret},flow);
   const user=await socialSignIn(req,res,'google',identity,flow);return user;
  }


  if(req.method==='GET'&&['/studio','/writing','/playground','/community','/profile'].includes(url))return file(res,'studio/index.html');
  if(req.method==='GET'&&url==='/admin/community')return file(res,'admin/community-v15.html');
  if(req.method==='GET'&&url==='/terms')return file(res,'studio/terms.html');
  if(req.method==='GET'&&url==='/privacy')return file(res,'studio/privacy.html');
  if(req.method==='GET'&&['/studio/ui.css','/studio/app.js'].includes(url))return file(res,url.slice(1));
  if(req.method==='GET'&&url==='/sitemap.xml')return reply(res,200,makeSitemap(req),'application/xml; charset=utf-8');
  if(req.method==='GET'&&url==='/robots.txt')return reply(res,200,'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: '+siteHost(req)+'/sitemap.xml\n','text/plain; charset=utf-8');
  const match=/^\/(fa\/)?ai\/([a-z0-9-]{2,120})$/.exec(url);if(req.method==='GET'&&match){const m=bySlug.get(match[2]);return m?reply(res,200,modelPage(m,req,match[1]?'fa':'en'),'text/html; charset=utf-8'):reply(res,404,{error:'Unknown model'})}
  if(req.method==='GET'&&url==='/api/studio/models')return reply(res,200,{models:models.map(shortModel),total:models.length,notice:'Catalog listings are not installed models; some sources are adult-oriented, version-specific limits are shown only when verified.'});
  if(req.method==='GET'&&url==='/api/studio/wallets')return reply(res,200,{wallets:wallets.map(w=>({...w,qr:`/arina-gallery/qr/${w.id}.png`})),verifiedPaymentProcessor:false,notice:'Do not send funds until the operator enables verified checkout, network confirmation and user attribution.'});
  if(req.method==='GET'&&url==='/api/studio/status')return reply(res,200,{server:true,defaultLanguage:'en',nodeVersion:process.version,publicAccounts:true,publicGallery:'moderated, opt-in',inferenceConfigured:Boolean(process.env.FEZI_GPU_WORKER_URL||process.env.AI_BASE_URL||process.env.OLLAMA_BASE_URL),publicVideoGeneration:false,telegramPublicMode:process.env.TELEGRAM_MODE==='public-polling'});
  if(req.method==='POST'&&url==='/api/account/register'){
   checkRate('signup-'+req.socket.remoteAddress,8);const b=await readJSON(req,12000),name=human(b.name),email=human(b.email).toLowerCase(),username=human(b.username || (!verifyCaptcha ? (email.split('@')[0].replace(/[^a-z0-9_]/g,'_').slice(0,30)||'legacy_user') : '')).toLowerCase(),password=b.password;
   if(name.length<2||name.length>50||!(/^[a-z0-9_]{3,30}$/.test(username)&&/[a-z]/.test(username))|| (email && (!/^\S+@\S+\.\S+$/.test(email)||email.length>190)) ||typeof password!=='string'||password.length<10||password.length>200||!/[0-9]/.test(password)||!/[a-z]/i.test(password))throw invalid('Use a unique username (3–30 letters, digits, underscores), optional valid email, and password (10+ letters and numbers)');
   if(typeof verifyCaptcha==='function' && process.env.CAPTCHA_REQUIRED!=='false')verifyCaptcha(b.captchaToken,b.captchaAnswer,String(req.socket.remoteAddress||''));
   if(b.agreeTerms!==true)throw invalid('Accept terms first');
   if(state.users.some(u=>(email && u.email===email)||(u.username&&u.username.toLowerCase()===username)))throw invalid('Email or username already registered',409);
   const salt=crypto.randomBytes(16).toString('hex');
   const u={id:crypto.randomBytes(16).toString('hex'),name,username,email,salt,hash:credentials(password,salt),nonce:crypto.randomBytes(12).toString('hex'),avatar:'rabbit',createdAt:new Date().toISOString()};
   await mutate(()=>{if(state.users.some(x=>(email&&x.email===email)||(x.username&&x.username.toLowerCase()===username)))throw invalid('Email or username already registered',409);state.users.push(u)});setCookie(req,res,makeCookie(u));return reply(res,201,{user:publicUser(u)});
  }
  if(req.method==='POST'&&url==='/api/account/login'){
   checkRate('login-'+req.socket.remoteAddress,25,900000);const b=await readJSON(req,6000),identifier=human(b.identifier||b.username||b.email).toLowerCase();const u=state.users.find(x=>x.email===identifier||x.username?.toLowerCase()===identifier);const password=typeof b.password==='string'?b.password:'';
   const correct=u&&password.length<=200&&xSafe(u.hash,credentials(password,u.salt));if(!correct)throw invalid('Invalid email or password',401);setCookie(req,res,makeCookie(u));return reply(res,200,{user:publicUser(u)});
  }
  if(req.method==='POST'&&url==='/api/account/logout'){clearCookie(req,res);return reply(res,200,{ok:true})}
  if(req.method==='GET'&&url==='/api/account/me'){const u=account(req);return reply(res,200,{authenticated:!!u,user:u?publicUser(u):null})}
  if(req.method==='GET'&&/^\/api\/creator\/avatar\/[a-z0-9_]{3,30}$/.test(url)){
   const username=url.split('/').pop(),u=state.users.find(x=>x.username?.toLowerCase()===username);
   if(!u||u.avatar!=='uploaded'||!u.avatarMime)throw invalid('Public avatar not found',404);
   const ext=u.avatarMime==='image/png'?'.png':u.avatarMime==='image/webp'?'.webp':'.jpg';
   const bytes=await fs.readFile(path.join(MEDIA,'profile-'+u.id+ext));
   res.writeHead(200,{'content-type':u.avatarMime,'content-length':bytes.length,'cache-control':'public,max-age=300','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; sandbox"});res.end(bytes);return true;
  }
  if(req.method==='GET'&&url==='/api/account/avatar/me'){const u=requireUser(req);if(u.avatar!=='uploaded'||!u.avatarMime)throw invalid('No uploaded avatar',404);const ext=u.avatarMime==='image/png'?'.png':u.avatarMime==='image/webp'?'.webp':'.jpg';const bytes=await fs.readFile(path.join(MEDIA,'profile-'+u.id+ext));res.writeHead(200,{'content-type':u.avatarMime,'content-length':bytes.length,'cache-control':'private,no-store','x-content-type-options':'nosniff'});res.end(bytes);return true}
  if(req.method==='POST'&&url==='/api/account/avatar'){const u=requireUser(req);checkRate('avatar-'+u.id,20);const b=await readJSON(req,550000);const mime=human(b.mime),base64=human(b.base64);if(!['image/png','image/jpeg','image/webp'].includes(mime)||!base64||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw invalid('Unsupported avatar upload');const bytes=Buffer.from(base64,'base64');if(bytes.length>320000||bytes.length<16||!videoMime(mime,bytes))throw invalid('Invalid image (max 320 KB)');const ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg';const target=path.join(MEDIA,'profile-'+u.id+ext);await fs.writeFile(target,bytes,{mode:0o600});await mutate(()=>{u.avatar='uploaded';u.avatarMime=mime});return reply(res,200,{user:publicUser(u)})}
  if(req.method==='POST'&&url==='/api/account/profile'){
   const u=requireUser(req);const b=await readJSON(req,7000);const name=human(b.name);if(name.length<2||name.length>50)throw invalid('Invalid name');const avatar=String(b.avatar||u.avatar);if(!['rabbit','flower','blue','pink','star','user',...(u.avatarMime?['uploaded']:[])].includes(avatar))throw invalid('Unknown avatar');await mutate(()=>{u.name=name;u.avatar=avatar});return reply(res,200,{user:publicUser(u)})
  }
  // v1.01 user-controlled account security: passwords, one-time recovery codes, verified email.
  if(req.method==='POST'&&url==='/api/account/password/change'){
   const u=requireUser(req);checkRate('change-password-'+u.id,8,3600000);const b=await readJSON(req,4000);
   if(typeof b.currentPassword!=='string'||!xSafe(u.hash,credentials(b.currentPassword,u.salt)))throw invalid('Current password is incorrect',403);
   if(typeof b.newPassword!=='string'||b.newPassword.length<10||b.newPassword.length>200||!/[a-z]/i.test(b.newPassword)||!/\d/.test(b.newPassword))throw invalid('New password must include letters and digits, 10+ chars');
   const salt=crypto.randomBytes(16).toString('hex');await mutate(()=>{u.salt=salt;u.hash=credentials(b.newPassword,salt);u.nonce=crypto.randomBytes(12).toString('hex')});setCookie(req,res,makeCookie(u));return reply(res,200,{ok:true,sessionsRevoked:true});
  }
  if(req.method==='POST'&&url==='/api/account/recovery/generate'){
   const u=requireUser(req);checkRate('recovery-regen-'+u.id,3,86400000);const b=await readJSON(req,3000);
   if(typeof b.password!=='string'||!xSafe(u.hash,credentials(b.password,u.salt)))throw invalid('Re-enter your current password',403);
   const codes=Array.from({length:8},()=>crypto.randomBytes(12).toString('hex'));
   const hashed=codes.map(code=>crypto.createHash('sha256').update(sessionSecret+':'+u.id+':'+code).digest('hex'));
   await mutate(()=>{u.recoveryHashes=hashed});return reply(res,200,{codes,notice:'Save offline. Shown only once. Creating new codes invalidates previous codes.'});
  }
  if(req.method==='POST'&&url==='/api/account/recovery/reset'){
   checkRate('recovery-try-'+req.socket.remoteAddress,5,3600000);const b=await readJSON(req,4000),email=human(b.email).toLowerCase(),code=human(b.code).toLowerCase(),pw=b.newPassword;
   const u=state.users.find(x=>x.email===email||x.username?.toLowerCase()===email);
   if(!u||!Array.isArray(u.recoveryHashes)||!u.recoveryHashes.length||!/^[a-f0-9]{24}$/.test(code))throw invalid('Invalid email or recovery code',403);
   const hash=crypto.createHash('sha256').update(sessionSecret+':'+u.id+':'+code).digest('hex');const idx=u.recoveryHashes.findIndex(v=>xSafe(v,hash));
   if(idx<0)throw invalid('Invalid email or recovery code',403);
   if(typeof pw!=='string'||pw.length<10||pw.length>200||!/[a-z]/i.test(pw)||!/\d/.test(pw))throw invalid('Password must contain letters and digits, 10+ chars');
   const salt=crypto.randomBytes(16).toString('hex');await mutate(()=>{u.recoveryHashes.splice(idx,1);u.salt=salt;u.hash=credentials(pw,salt);u.nonce=crypto.randomBytes(12).toString('hex')});return reply(res,200,{ok:true,notice:'Password reset. Sign in with your new password.'});
  }
  if(req.method==='POST'&&url==='/api/account/email/set'){
   const u=requireUser(req);checkRate('email-set-'+u.id,5,3600000);const b=await readJSON(req,4000);
   const newEmail=human(b.email).toLowerCase();
   if(!/^\S+@\S+\.\S+$/.test(newEmail)||newEmail.length>190)throw invalid('Valid email address required');
   if(typeof b.password!=='string'||!xSafe(u.hash,credentials(b.password,u.salt)))throw invalid('Current password required to change email',403);
   if(state.users.some(other=>other.id!==u.id&&other.email===newEmail))throw invalid('Email already used',409);
   await mutate(()=>{if(state.users.some(other=>other.id!==u.id&&other.email===newEmail))throw invalid('Email already used',409);u.email=newEmail;u.emailVerified=false;delete u.emailOtpHash;delete u.emailOtpExpiry;delete u.emailOtpAttempts;u.nonce=crypto.randomBytes(12).toString('hex')});
   setCookie(req,res,makeCookie(u));return reply(res,200,{user:publicUser(u),notice:'Email updated but unverified. Request a verification code next.'});
  }
  if(req.method==='POST'&&url==='/api/account/email/request'){
   const u=requireUser(req);checkRate('email-request-'+u.id,3,3600000);
   if(!u.email)throw invalid('Add an email address to your profile before requesting verification',422);if(u.emailVerified)return reply(res,200,{ok:true,alreadyVerified:true});
   const key=String(process.env.RESEND_API_KEY||''),from=String(process.env.EMAIL_FROM||'');
   if(key.length<20||!/^\S+@\S+\.\S+$/.test(from))throw invalid('Email delivery is not yet configured. Configure RESEND_API_KEY and verified EMAIL_FROM on server.',503);
   const code=String(crypto.randomInt(100000,1000000));const digest=crypto.createHash('sha256').update(sessionSecret+':'+u.id+':'+code).digest('hex');
   const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),12000);
   try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},signal:ctrl.signal,body:JSON.stringify({from,to:[u.email],subject:'Verify your FEZI Studio email',text:'Your one-time verification code is '+code+'. It expires in 15 minutes. If you did not request this, ignore the message.'})});if(!r.ok)throw invalid('Email provider rejected delivery',503);await mutate(()=>{u.emailOtpHash=digest;u.emailOtpExpiry=Date.now()+15*60_000;u.emailOtpAttempts=0});return reply(res,200,{ok:true,expiresMinutes:15,notice:'Email submitted to the configured provider. Check delivery.'});}
   finally{clearTimeout(timeout)}
  }
  if(req.method==='POST'&&url==='/api/account/email/confirm'){
   const u=requireUser(req);checkRate('email-confirm-'+u.id,9,3600000);const b=await readJSON(req,2000),code=String(b.code||'');
   const digest=crypto.createHash('sha256').update(sessionSecret+':'+u.id+':'+code).digest('hex');
   if(!/^\d{6}$/.test(code)||!u.emailOtpHash||Date.now()>Number(u.emailOtpExpiry)||Number(u.emailOtpAttempts||0)>=5||!xSafe(u.emailOtpHash,digest)){
    await mutate(()=>{u.emailOtpAttempts=(u.emailOtpAttempts||0)+1});throw invalid('Invalid or expired verification code',403);
   }
   await mutate(()=>{u.emailVerified=true;delete u.emailOtpHash;delete u.emailOtpExpiry;delete u.emailOtpAttempts});return reply(res,200,{ok:true,user:publicUser(u)});
  }
  if(req.method==='POST'&&url==='/api/studio/chat'){
   const u=requireUser(req);checkRate('chat-'+u.id,50);const b=await readJSON(req,20000);const prompt=human(b.prompt);if(prompt.length<2||prompt.length>8000)throw invalid('Prompt must be 2–8000 characters');contentPolicy(prompt);
   if(typeof runText!=='function')throw invalid('Chat runtime has not been installed',503);
   const answer=await runText({prompt,modelId:human(b.modelId)});return reply(res,200,{answer,notice:'Provider identity is shown in deployment logs. No result is faked.'})
  }
  if(req.method==='POST'&&url==='/api/studio/bot-chat'){
   const secret=String(process.env.TELEGRAM_INTERNAL_TOKEN||'');const supplied=String(req.headers['x-fezi-bot-secret']||'');if(secret.length<24||!xSafe(secret,supplied))throw invalid('Bot not configured',403);
   checkRate('bot-'+String(req.socket.remoteAddress||''),150);const b=await readJSON(req,12000);const prompt=human(b.prompt);if(prompt.length<2||prompt.length>4000)throw invalid('Invalid prompt');contentPolicy(prompt);if(!runText)throw invalid('Model not connected',503);return reply(res,200,{answer:await runText({prompt,modelId:human(b.modelId)})})
  }
  if(req.method==='POST'&&url==='/api/studio/generate'){
   const u=requireUser(req);if(process.env.STUDIO_PUBLIC_GPU_ENABLED!=='true')throw invalid('Public GPU generation is disabled until the operator configures licensed GPU and quotas',503);
   checkRate('gpu-'+u.id,12,86400000);const b=await readJSON(req,14000),m=models.find(x=>x.id===b.modelId);if(!m||!enabledModel(m)||!['video','image'].includes(m.category))throw invalid('Model not enabled for this runtime',412);
   const prompt=human(b.prompt);if(prompt.length<3||prompt.length>4000)throw invalid('Invalid generation prompt');contentPolicy(prompt);
   if(b.rightsConfirmed!==true)throw invalid('Confirm your rights to references and output first');if(!runGeneration)throw invalid('GPU worker not connected',503);
   const kind=m.category==='video'?'video':'image';
   if(kind==='video'){
    if(!Array.isArray(m.capabilities.durationOptionsSec)||!m.capabilities.durationOptionsSec.length)throw invalid('Duration unverified: enable this video model only after exact workflow is validated',412);
    if(!m.capabilities.durationOptionsSec.includes(Number(b.durationSec)))throw invalid('Unsupported duration for selected video model',422);
    if(m.capabilities.supportsTextToVideo!==true)throw invalid('Selected workflow requires reference uploads; server-side transfer has not been connected',501);
   }
   const ratios={'1:1':[1024,1024],'16:9':[1024,576],'9:16':[576,1024],'4:3':[1024,768],'3:4':[768,1024]};
   const [width,height]=ratios[b.aspectRatio]||ratios['1:1'];
   const output=await runGeneration({modelId:m.id,kind,prompt,...(kind==='video'?{durationSec:Number(b.durationSec)}:{width,height})});
   await mutate(()=>state.jobs.push({userId:u.id,jobId:output.jobId,modelId:m.id,createdAt:new Date().toISOString()}));return reply(res,202,{jobId:output.jobId,state:output.state||'submitted',notice:'Job submitted to configured private GPU worker, not yet generated.'});
  }
  if(req.method==='GET'&&/^\/api\/studio\/job\/[a-zA-Z0-9_-]{6,100}$/.test(url)){
   const u=requireUser(req),id=url.split('/').pop(),record=state.jobs.find(x=>x.jobId===id&&x.userId===u.id);if(!record)throw invalid('No such user job',404);if(!getGenerationStatus)throw invalid('GPU worker not connected',503);return reply(res,200,await getGenerationStatus(id));
  }
  if(req.method==='GET'&&url==='/api/community/posts'){
   const approved=state.posts.filter(p=>p.status==='approved').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100).map(({file,...rest})=>rest);
   return reply(res,200,{posts:approved,moderated:true,automaticPublishing:false});
  }
  if(req.method==='GET'&&url==='/api/community/mine'){const u=requireUser(req);return reply(res,200,{posts:state.posts.filter(p=>p.userId===u.id).map(({file,...rest})=>rest)})}
  if(req.method==='POST'&&url==='/api/community/posts'){
   const u=requireUser(req);checkRate('upload-'+u.id,8,3600000);const b=await readJSON(req,14000000);const title=human(b.title),prompt=human(b.prompt),kind=human(b.kind),mime=human(b.mime),base64=human(b.base64);
   if(!['image','video','code','text'].includes(kind)||title.length<3||title.length>120||prompt.length>4000||typeof b.publishConsent!=='boolean'||b.publishConsent!==true||b.rightsConfirmed!==true)throw invalid('Valid title, explicit publication consent and rights confirmation required');
   contentPolicy(title+' '+prompt);if(b.adultContent===true)throw invalid('Adult uploads require separate restricted storage and review not enabled here',422);
   let file=null,mediaUrl=null;
   if(kind==='image'||kind==='video'){
    if(!['image/png','image/jpeg','image/webp','video/mp4'].includes(mime)||(kind==='video')!==(mime==='video/mp4'))throw invalid('Unsupported media MIME');
    if(!base64||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)||base64.length>13500000)throw invalid('Invalid media encoding',400);
    const buffer=Buffer.from(base64,'base64');if(buffer.length>10000000||buffer.length<16||!videoMime(mime,buffer))throw invalid('Invalid media or file too large',400);
    const ext={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','video/mp4':'.mp4'}[mime];file=crypto.randomBytes(20).toString('hex')+ext;await fs.writeFile(path.join(MEDIA,file),buffer,{flag:'wx',mode:0o600});
   }
   const post={id:crypto.randomBytes(12).toString('hex'),userId:u.id,author:u.name,title,prompt,kind,mime,file,modelSlug:bySlug.has(b.modelSlug)?b.modelSlug:null,createdAt:new Date().toISOString(),status:'pending',likes:[],remixAllowed:b.remixAllowed===true,downloadAllowed:b.downloadAllowed===true};
   await mutate(()=>state.posts.push(post));return reply(res,202,{postId:post.id,status:'pending',notice:'Never auto-public. Owner review is mandatory.'});
  }
  if(req.method==='POST'&&url==='/api/community/like'){
   const u=requireUser(req);checkRate('like-'+u.id,80);const b=await readJSON(req,1500);const p=state.posts.find(p=>p.id===b.id&&p.status==='approved');if(!p)throw invalid('Post not found',404);await mutate(()=>{const i=p.likes.indexOf(u.id);i<0?p.likes.push(u.id):p.likes.splice(i,1)});return reply(res,200,{likes:p.likes.length,liked:p.likes.includes(u.id)});
  }
  if(req.method==='GET'&&/^\/api\/admin\/community\/preview\/[a-f0-9]{24}$/.test(url)){
   if(!authenticatedOwner(req))throw invalid('Owner login required',401);
   const p=state.posts.find(p=>p.id===url.split('/').pop()&&p.file&&p.status==='pending');
   if(!p)throw invalid('Pending media not found',404);
   const bytes=await fs.readFile(path.join(MEDIA,p.file));res.writeHead(200,{'content-type':p.mime,'content-length':bytes.length,'cache-control':'private,no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; sandbox"});res.end(bytes);return true;
  }
  if(req.method==='GET'&&/^\/api\/community\/media\/[a-f0-9]{24}$/.test(url)){
   const id=url.split('/').pop(),p=state.posts.find(p=>p.id===id&&p.file&&p.status==='approved');if(!p)throw invalid('Media unavailable',404);
   const bytes=await fs.readFile(path.join(MEDIA,p.file));res.writeHead(200,{'content-type':p.mime,'content-length':bytes.length,'cache-control':'public,max-age=300','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});res.end(bytes);return true;
  }
  if(req.method==='GET'&&/^\/api\/community\/download\/[a-f0-9]{24}$/.test(url)){
   const p=state.posts.find(p=>p.id===url.split('/').pop()&&p.file&&p.status==='approved'&&p.downloadAllowed);if(!p)throw invalid('Download not allowed',404);const bytes=await fs.readFile(path.join(MEDIA,p.file));res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':`attachment; filename="fezi-${p.id}${path.extname(p.file)}"`,'content-length':bytes.length,'x-content-type-options':'nosniff'});res.end(bytes);return true;
  }
  if(req.method==='GET'&&/^\/api\/community\/remix\/[a-f0-9]{24}$/.test(url)){
   const p=state.posts.find(p=>p.id===url.split('/').pop()&&p.status==='approved'&&p.remixAllowed);if(!p)throw invalid('Remix not allowed',404);return reply(res,200,{prompt:p.prompt,kind:p.kind,modelSlug:p.modelSlug,sourcePostId:p.id,remix:'Prompt copy only; no unauthorized model work or copyrighted media is copied.'});
  }
  if(req.method==='GET'&&url==='/api/admin/community/pending'){
   if(!authenticatedOwner(req))throw invalid('Owner login required',401);return reply(res,200,{posts:state.posts.filter(p=>p.status==='pending').map(({file,...r})=>r)});
  }
  if(req.method==='POST'&&url==='/api/admin/community/review'){
   if(!authenticatedOwner(req))throw invalid('Owner login required',401);const b=await readJSON(req,2500);if(!['approve','reject'].includes(b.action))throw invalid('Invalid action');const p=state.posts.find(p=>p.id===b.id);if(!p)throw invalid('Post not found',404);
   await mutate(()=>{p.status=b.action==='approve'?'approved':'rejected';p.reviewedAt=new Date().toISOString()});return reply(res,200,{ok:true,id:p.id,status:p.status});
  }
  return false;
 }
 return {init,handle,isSignedIn:req=>Boolean(account(req)),getAccount:account,publicUser,findByTelegramId:telegramId=>state.users.find(u=>u.telegramId===String(telegramId)),linkTelegram:(userId,telegramId)=>mutate(()=>{const u=state.users.find(x=>x.id===userId);if(!u)throw invalid('FEZI account not found',404);if(state.users.some(x=>x.id!==userId&&x.telegramId===telegramId))throw invalid('Telegram linked to another user',409);u.telegramId=telegramId;return {ok:true}}),issueTelegramSession:(req,res,userId)=>{const u=state.users.find(x=>x.id===userId);if(!u)throw invalid('Account not found',404);setCookie(req,res,makeCookie(u));return {user:publicUser(u)}},approvedPostsFor:(id)=>state.posts.filter(p=>p.userId===id&&p.status==='approved').map(({file,...rest})=>rest),findUsername:(username)=>state.users.find(u=>u.username?.toLowerCase()===String(username).toLowerCase()),updateAccount:(id,fn)=>mutate(()=>{const u=state.users.find(x=>x.id===id);if(!u)throw invalid('User not found',404);return fn(u)}),accountCount:()=>state.users.length,modelCount:models.length,modelBySlug:s=>bySlug.get(s)};
}
