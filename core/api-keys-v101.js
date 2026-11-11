/** FEZI API Keys storefront / user key management. Safe prelaunch; billing and API proxy disabled until verified settlement. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import localModels from '../config/studio-models-v15.json' with {type:'json'};
import wallets from './arina-wallets.json' with {type:'json'};

function invalid(message,status=400){return Object.assign(new Error(message),{status})}
function respond(res,status,data){const b=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':b.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function body(req,max=12000){const cs=[];let n=0;for await(const c of req){n+=c.length;if(n>max)throw invalid('Request too large',413);cs.push(c)}try{const v=JSON.parse(Buffer.concat(cs).toString());if(!v||Array.isArray(v)||typeof v!=='object')throw 0;return v}catch{throw invalid('Invalid JSON')}}
// Uses decimal-string integer arithmetic to avoid hiding tiny prices with float rounding.
export function markup20(value){const text=String(value??'');if(!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(text))return null;
 const [whole,fraction='']=text.split('.');const scale=Math.max(fraction.length,12);const n=BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0'));
 const extra=(n*120n+50n)/100n;const all=extra.toString().padStart(scale+1,'0');return (scale?all.slice(0,-scale)+'.'+all.slice(-scale).replace(/0+$/,''):all).replace(/\.$/,'');
}
const adult=localModels.filter(x=>x.adultCatalog).map(x=>({id:x.id,title:x.name,category:x.category,sourceUrl:x.sourceUrl||null,licenseVerified:Boolean(x.licenseVerified),status:'catalog-review',priceNote:'Premium; quote pending provider/license validation',paid:true,available:false}));
export const PREMIUM_CATALOG=Object.freeze(adult);
const dateNow=()=>new Date().toISOString();
export function createApiKeysStore({dataDir,studio,env=process.env,fetchImpl=fetch,now=()=>Date.now()}={}){
 const dir=path.join(dataDir,'fezi-api-keys'),file=path.join(dir,'accounts.json');let state={keys:[],orders:[]};let pending=Promise.resolve();
 let catalog={list:[],at:0,error:null};const clientEnabled=Boolean(env.FEZI_API_BILLING_VERIFIED==='true'&&env.FEZI_API_SETTLEMENT_VERIFIED==='true'&&env.FEZI_API_METERING_VERIFIED==='true');
 async function init(){await fs.mkdir(dir,{recursive:true,mode:0o700});try{state=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(state.keys)||!Array.isArray(state.orders))throw 0}catch(e){if(e.code!=='ENOENT')throw e}}
 function save(){pending=pending.then(async()=>{const tmp=file+'.tmp-'+process.pid;await fs.writeFile(tmp,JSON.stringify(state),{mode:0o600});await fs.rename(tmp,file)});return pending}
 function user(req){const u=studio.getAccount(req);if(!u)throw invalid('FEZI Studio login required',401);return u}
 async function refresh(){if(now()-catalog.at<600000)return catalog; // Ten minute cache with stale fallback
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{const r=await fetchImpl('https://openrouter.ai/api/v1/models',{headers:{accept:'application/json'},signal:controller.signal,redirect:'error'});
   if(!r.ok)throw Error('Provider status '+r.status);
   const v=await r.json();if(!Array.isArray(v.data))throw Error('Invalid provider catalog');
   const models=v.data.filter(x=>x&&/^[\w.\-:/]{3,160}$/.test(String(x.id||''))).slice(0,5000).map(x=>({id:x.id,name:String(x.name||x.id).slice(0,150),description:String(x.description||'').slice(0,300),architecture:x.architecture||null,contextLength:x.context_length||null,pricing:{prompt:markup20(x.pricing?.prompt),completion:markup20(x.pricing?.completion),image:markup20(x.pricing?.image),request:markup20(x.pricing?.request)},upstream:'OpenRouter',source:'live-provider',activeEndpoint:'provider-reported'}));
   catalog={list:models,at:now(),error:null};return catalog;
  }catch(e){catalog.at=now();catalog.error='Provider catalog temporarily unavailable';return catalog}finally{clearTimeout(timeout)}
 }
 async function hf(q){const search=String(q||'').trim().slice(0,70);if(search.length<2)return [];
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{const r=await fetchImpl('https://huggingface.co/api/models?search='+encodeURIComponent(search)+'&limit=30&full=false',{headers:{accept:'application/json'},signal:controller.signal,redirect:'error'});
   if(!r.ok)throw Error('HF unavailable');const list=await r.json();if(!Array.isArray(list))return [];
   return list.filter(x=>typeof x.id==='string').map(x=>({id:x.id,sourceUrl:'https://huggingface.co/'+encodeURI(x.id),downloads:x.downloads||0,task:x.pipeline_tag||null,inferenceAvailable:'unverified',paidApiAvailable:false,note:'Public model listing does not prove free hosted inference.'}));
  }catch{return []}finally{clearTimeout(timeout)}
 }
 function keyView(k){return {id:k.id,prefix:k.prefix,createdAt:k.createdAt,revoked:k.revoked,name:k.name,hasFunds:false,gatewayEnabled:clientEnabled}}
 async function route(req,res,url){
  if(req.method==='GET'&&url==='/api/api-keys/models'){
   const filter=String(new URL(req.url,'http://localhost').searchParams.get('q')||'').toLowerCase().slice(0,100);
   const c=await refresh();return respond(res,200,{models:c.list.filter(x=>!filter||(x.id+' '+x.name).toLowerCase().includes(filter)).slice(0,150),total:c.list.length,premiumCount:adult.length,pricingMarkupPercent:20,updatedAt:c.at?new Date(c.at).toISOString():null,error:c.error,liveApiSales:false,notice:'Prices are display quotes, not an offer of available access.'}),true;
  }
  if(req.method==='GET'&&url==='/api/api-keys/premium')return respond(res,200,{models:adult,checkoutEnabled:false}),true;
  if(req.method==='GET'&&url==='/api/api-keys/hf'){
   const q=new URL(req.url,'http://localhost').searchParams.get('q');return respond(res,200,{models:await hf(q)}),true;
  }
  if(req.method==='GET'&&/^\/api-keys\/models\/[a-zA-Z0-9._~%\-/]{3,240}$/.test(url)){
   let id;try{id=decodeURIComponent(url.slice('/api-keys/models/'.length))}catch{throw invalid('Invalid model URL',400)}
   const c=await refresh(),m=c.list.find(x=>x.id===id),prem=adult.find(x=>x.id===id);
   if(!m&&!prem)throw invalid('Model not currently indexed',404);
   const name=escapeHtml((m?.name||prem?.title)),desc=escapeHtml((m?.description||prem?.priceNote||'Model catalog'));const origin=/^https:\/\/[^/]+$/i.test(env.PUBLIC_BASE_URL||'')?env.PUBLIC_BASE_URL:'https://example.invalid';
   const html=`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${name} | FEZI Studio API Keys</title><meta name="description" content="${desc}"><link rel="canonical" href="${origin}/api-keys/models/${encodeURIComponent(id)}"><link rel="icon" href="/brand/fezi-site-f.png"></head><body style="font:16px system-ui;background:#f5faff;color:#17315f;margin:0;padding:3rem"><a href="/api-keys">← FEZI API Keys</a><h1>${name}</h1><p>${desc}</p><p>مدل: <code>${escapeHtml(id)}</code></p><p>وضعیت فروش: نیازمند بررسی پرداخت، مجوز و سرویس پردازش</p><a href="/api-keys">بازگشت به کاتالوگ</a></body></html>`;
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=300'});res.end(html);return true;
  }
  if(req.method==='GET'&&url==='/api-keys/sitemap.xml'){
   const c=await refresh(),base=/^https:\/\/[^/]+$/i.test(env.PUBLIC_BASE_URL||'')?env.PUBLIC_BASE_URL:'https://example.invalid';
   const paths=['/api-keys','/api-keys/docs',...c.list.filter(x=>x.description.length>=40).slice(0,1000).map(x=>'/api-keys/models/'+encodeURIComponent(x.id))];
   const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(x=>'<url><loc>'+escapeHtml(base+x)+'</loc></url>').join('')+'</urlset>';
   res.writeHead(200,{'content-type':'application/xml; charset=utf-8'});res.end(xml);return true;
  }
  if(req.method==='GET'&&url==='/api/api-keys/account'){
   const u=user(req);return respond(res,200,{keys:state.keys.filter(x=>x.userId===u.id).map(keyView),orders:state.orders.filter(x=>x.userId===u.id),balanceUsd:0,verifiedSettlement:false,liveGatewayEnabled:clientEnabled, wallets:wallets.map(x=>({id:x.id,label:x.label,network:x.network,address:x.address,qr:x.id?'/arina-gallery/qr/'+x.id+'.png':null}))}),true;
  }
  if(req.method==='POST'&&url==='/api/api-keys/keys'){
   const u=user(req),b=await body(req);const name=String(b.name||'FEZI API key').trim().slice(0,60);
   const raw='fezi_live_'+crypto.randomBytes(32).toString('base64url');const id=crypto.randomBytes(10).toString('hex');
   state.keys.push({id,userId:u.id,hash:crypto.createHash('sha256').update(raw).digest('hex'),prefix:raw.slice(0,17),name,createdAt:dateNow(),revoked:false});await save();return respond(res,201,{key:raw,id,notice:'Store this key securely. Without verified funding/metering, API inference is disabled.'}),true;
  }
  if(req.method==='POST'&&url==='/api/api-keys/revoke'){
   const u=user(req),b=await body(req);const k=state.keys.find(x=>x.id===b.id&&x.userId===u.id);
   if(!k)throw invalid('Key not found',404);k.revoked=true;await save();return respond(res,200,{ok:true,revoked:true}),true;
  }
  if(req.method==='POST'&&url==='/api/api-keys/topup'){
   const u=user(req),b=await body(req);const amount=Number(b.amountUsd);
   if(!Number.isInteger(amount)||amount<10||amount>100000)throw invalid('Top-up must be a whole dollar amount between $10 and $100,000');
   const id=crypto.randomBytes(12).toString('hex');const order={id,userId:u.id,amountUsd:amount,status:'awaiting_verified_provider',createdAt:dateNow(),settled:false};
   state.orders.push(order);await save();return respond(res,202,{order,checkoutEnabled:false,notice:'No automatic settlement is installed. Do not transfer funds for this order.'}),true;
  }
  if(req.method==='POST'&&url==='/api/v1/chat/completions')return respond(res,503,{error:{message:'API Gateway not activated. Verified billing and metering required before inference is available.',type:'service_unavailable'}}),true;
  return false;
 }
 return {init,handle:route,refresh,premiumCount:adult.length,liveGatewayEnabled:clientEnabled};
}
