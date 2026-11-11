/** FEZI Studio managed AI catalog, prepaid credits and safe payment intents.
 * OpenRouter is a third-party service, NOT ChatGPT's source. Money moves only
 * after explicitly verified operator reconciliation; never from user receipts.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
const SCALE=1_000_000_000_000n; // picoUSD
const PACKAGE_VALUES=Object.freeze([1000000,5000000,7000000,10000000,20000000]);
export const MARKUP_BPS=2000;
const statusError=(message,status=400)=>Object.assign(new Error(message),{status});
export function decimalUnits(value){
 const s=String(value??'').trim();
 if(!/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s))throw statusError('Invalid provider price');
 const match=/^([\d.]+)(?:e([+-]?\d+))?$/i.exec(s);const exp=Number(match[2]||0);if(exp<-24||exp>12)throw statusError('Unsupported price exponent');
 const [whole,frac='']=match[1].split('.');const digits=(whole+frac).replace(/^0+/,'')||'0';const shift=12+exp-frac.length;const n=BigInt(digits);
 if(shift>=0)return n*10n**BigInt(shift);
 const divisor=10n**BigInt(-shift);return (n+divisor-1n)/divisor; // round positive price up
}
export const markup=(pico)=> (BigInt(pico)*12000n+9999n)/10000n;
export const usd=(pico)=>{const v=BigInt(pico),digits=(v%SCALE).toString().padStart(12,'0').slice(0,8);return `${v/SCALE}.${digits}`};
export function getPlanOptions(tomanPerUsd){
 const rate=Number(tomanPerUsd);return PACKAGE_VALUES.map((price,i)=>({id:['starter','growth','advanced','pro','enterprise'][i],priceToman:price,paidModels:true,creditsUSD:Number.isSafeInteger(rate)&&rate>0?Number((BigInt(price)*SCALE)/BigInt(rate))/Number(SCALE):null}));
}
const ICONS={openai:'openai',anthropic:'generic',google:'gemini',meta:'llama',mistralai:'mistral',mistral:'mistral',qwen:'qwen',deepseek:'deepseek',xai:'grok',cohere:'generic',nvidia:'generic',microsoft:'generic',amazon:'generic',nousresearch:'generic',minimax:'generic',zai:'generic',moonshotai:'generic',perplexity:'generic',googleai:'gemini',openrouter:'openrouter'};
function normalizeModel(m){
 const id=String(m?.id||'');if(!/^[\w.\-/+:]{2,200}$/.test(id))return null;
 const prices=m.pricing||{};const prompt=String(prices.prompt??'0'),completion=String(prices.completion??'0');
 let p,c;try{p=decimalUnits(prompt);c=decimalUnits(completion)}catch{return null}
 const extraBillable=Object.entries(prices).some(([k,v])=>!['prompt','completion','discount'].includes(k)&&v!==null&&v!==''&&(()=>{try{return decimalUnits(v)>0n}catch{return false}})());
 const free=p===0n&&c===0n&&!extraBillable&&prices.prompt!==undefined&&prices.completion!==undefined;const provider=id.split('/')[0].toLowerCase();const icon=ICONS[provider]||'generic';
 const formatPerMillion=units=>usd(units*1_000_000n);
 return {id,name:String(m.name||id).slice(0,170),provider,description:String(m.description||'').slice(0,360),iconUrl:`/model-assets/icons/${icon}.svg`,free,contextLength:Number(m.context_length)||null,modality:String(m.architecture?.modality||''),supportedParameters:Array.isArray(m.supported_parameters)?m.supported_parameters.filter(x=>typeof x==='string').slice(0,25):[],upstream:{prompt,completion},customerPerMillionUSD:{prompt:formatPerMillion(markup(p)),completion:formatPerMillion(markup(c))},billingSupported:!extraBillable&&prices.prompt!==undefined&&prices.completion!==undefined&&(!m.architecture?.output_modalities||m.architecture.output_modalities.includes('text'))};
}
export function createModelCatalog({fetchFn=fetch,ttl=30*60*1000,endpoint='https://openrouter.ai/api/v1/models?output_modalities=all'}={}){
 let snapshot=[],updatedAt=null,expires=0,loading=null,error='not-yet-loaded';
 async function refresh(force=false){
  if(!force&&Date.now()<expires)return status();if(loading)return loading;
  loading=(async()=>{try{
   const r=await fetchFn(endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
   if(!r.ok)throw Error('Catalog upstream HTTP '+r.status);
   const data=await r.json();if(!Array.isArray(data.data)||data.data.length<1||data.data.length>20000)throw Error('Invalid upstream catalog');
   snapshot=data.data.map(normalizeModel).filter(Boolean);updatedAt=new Date().toISOString();error='';
  }catch(e){error=String(e.message||e).slice(0,170)}finally{expires=Date.now()+(error?Math.min(ttl,60000):ttl);loading=null}
   return status()})();return loading;
 }
 function status({query='',type='all',offset=0,limit=100}={}){
  const q=String(query).trim().toLowerCase().slice(0,100);
  const filtered=snapshot.filter(m=>(type==='all'||(type==='free'?m.free:!m.free))&&(!q||`${m.id} ${m.name} ${m.provider}`.toLowerCase().includes(q)));
  return {source:'openrouter',updatedAt,providerOnline:!!updatedAt&&error==='',stale:!!error,error:(!updatedAt?error:'')||null,total:snapshot.length,matches:filtered.length,models:filtered.slice(Math.max(0,Math.min(Number(offset)||0,20000)),Math.max(0,Math.min(Number(offset)||0,20000))+Math.min(Math.max(1,Number(limit)||100),200)),note:'Prices are a catalog snapshot. Actual billed tokens are charged at the frozen displayed price plus 20% markup. Other OpenRouter/top-up fees and taxes may apply.'};
 }
 return {refresh,status,find:id=>snapshot.find(m=>m.id===id)||null};
}
export function createCredits({dbFile,env=process.env}={}){
 if(!dbFile)throw Error('dbFile required');fs.mkdirSync(path.dirname(dbFile),{recursive:true});
 const db=new DatabaseSync(dbFile);db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS accounts(user_id TEXT PRIMARY KEY,available TEXT NOT NULL DEFAULT '0',reserved TEXT NOT NULL DEFAULT '0',paid_unlocked INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,package_id TEXT NOT NULL,toman INTEGER NOT NULL,rate INTEGER NOT NULL,credit TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created INTEGER NOT NULL,expires INTEGER NOT NULL,proof_ref TEXT);
 CREATE TABLE IF NOT EXISTS inference(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,model TEXT NOT NULL,held TEXT NOT NULL,cost TEXT NOT NULL DEFAULT '0',state TEXT NOT NULL,created INTEGER NOT NULL,usage_json TEXT);
 CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_proof ON orders(proof_ref) WHERE proof_ref IS NOT NULL;`);
 const ensure=id=>{if(!/^[a-f0-9]{32}$/.test(String(id)))throw statusError('Signed-in FEZI account required',401);db.prepare('INSERT OR IGNORE INTO accounts(user_id) VALUES(?)').run(id)};
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}};
 const state=id=>{ensure(id);const a=db.prepare('SELECT * FROM accounts WHERE user_id=?').get(id);return {balanceUSD:usd(BigInt(a.available)),reservedUSD:usd(BigInt(a.reserved)),paidUnlocked:!!a.paid_unlocked}};
 function createOrder(id,plan,customToman){ensure(id);const rate=Number(env.FEZI_TOMAN_PER_USD||0);if(!Number.isSafeInteger(rate)||rate<1000)throw statusError('Real exchange-rate setting required before creating invoice',503);
  let toman;if(plan==='custom')toman=Number(customToman);else toman=getPlanOptions(rate).find(x=>x.id===plan)?.priceToman;
  if(!Number.isSafeInteger(toman)||toman<100000||toman>100000000)throw statusError('Invalid package amount');
  const credit=BigInt(toman)*SCALE/BigInt(rate);const order={id:crypto.randomUUID(),userId:id,plan:plan==='custom'?'custom':plan,toman,creditUSD:usd(credit),status:'pending',expires:Date.now()+30*60*1000};
  db.prepare('INSERT INTO orders(id,user_id,package_id,toman,rate,credit,status,created,expires) VALUES(?,?,?,?,?,?,?, ?,?)').run(order.id,id,order.plan,toman,rate,String(credit),'pending',Date.now(),order.expires);
  return {...order,paymentEnabled:false,feziPayUrl:'/fezipay/',notice:'Invoice is pending. No automatic payment confirmation or credit without independent operator verification.'};
 }
 function listOrders(id){ensure(id);return db.prepare('SELECT id,package_id,toman,rate,status,created,expires,proof_ref FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 50').all(id)}
 function confirmManual(orderId,{proofRef,verifiedByOperator=false}={}){
  if(env.FEZI_MANUAL_CREDIT_CONFIRM_ENABLED!=='true')throw statusError('Manual reconciliation disabled',503);
  if(verifiedByOperator!==true||typeof proofRef!=='string'||proofRef.length<12||proofRef.length>200)throw statusError('Operator attestation and unique proof reference required');
  return tx(()=>{const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);if(!order)throw statusError('Order not found',404);if(order.status==='credited')return {ok:true,duplicate:true};if(order.status!=='pending'||order.expires<Date.now())throw statusError('Order expired or already closed',409);
   ensure(order.user_id);const a=db.prepare('SELECT available FROM accounts WHERE user_id=?').get(order.user_id);
   db.prepare('UPDATE accounts SET available=?,paid_unlocked=1 WHERE user_id=?').run(String(BigInt(a.available)+BigInt(order.credit)),order.user_id);
   db.prepare('UPDATE orders SET status=?,proof_ref=? WHERE id=?').run('credited',proofRef,orderId);return {ok:true,orderId,creditedUSD:usd(BigInt(order.credit)),verifiedBy:'operator_manual_attestation'};
  });
 }
 function reserve(userId,model,units){ensure(userId);const n=BigInt(units);if(n<=0n)throw statusError('Invalid reservation');return tx(()=>{const a=db.prepare('SELECT available,reserved,paid_unlocked FROM accounts WHERE user_id=?').get(userId);if(!a.paid_unlocked||BigInt(a.available)<n)throw statusError('Insufficient verified prepaid credits',402);
   db.prepare('UPDATE accounts SET available=?,reserved=? WHERE user_id=?').run(String(BigInt(a.available)-n),String(BigInt(a.reserved)+n),userId);const id=crypto.randomUUID();db.prepare('INSERT INTO inference(id,user_id,model,held,state,created) VALUES(?,?,?,?,?,?)').run(id,userId,model,String(n),'pending',Date.now());return id;
  });}
 function settle(id,cost,usage){return tx(()=>{const v=db.prepare('SELECT * FROM inference WHERE id=?').get(id);if(!v)throw statusError('Usage not found',404);if(v.state!=='pending')return {duplicate:true};let charged=BigInt(cost),held=BigInt(v.held);if(charged<0n)throw statusError('Invalid usage cost');if(charged>held)charged=held;
   const a=db.prepare('SELECT available,reserved FROM accounts WHERE user_id=?').get(v.user_id);
   db.prepare('UPDATE accounts SET available=?,reserved=? WHERE user_id=?').run(String(BigInt(a.available)+held-charged),String(BigInt(a.reserved)-held),v.user_id);
   db.prepare('UPDATE inference SET cost=?,state=?,usage_json=? WHERE id=?').run(String(charged),'settled',JSON.stringify(usage??{}).slice(0,5000),id);
   return {chargedUSD:usd(charged),refundUSD:usd(held-charged)};
  });}
 function cancel(id){return tx(()=>{const v=db.prepare('SELECT * FROM inference WHERE id=?').get(id);if(!v||v.state!=='pending')return {ok:true};const a=db.prepare('SELECT available,reserved FROM accounts WHERE user_id=?').get(v.user_id),held=BigInt(v.held);db.prepare('UPDATE accounts SET available=?,reserved=? WHERE user_id=?').run(String(BigInt(a.available)+held),String(BigInt(a.reserved)-held),v.user_id);db.prepare('UPDATE inference SET state=? WHERE id=?').run('cancelled',id);return {ok:true}})}
 return {state,createOrder,listOrders,confirmManual,reserve,settle,cancel,close:()=>db.close()};
}
export function estimateHeld(model,characterCount,maxTokens=512){const p=markup(decimalUnits(model.upstream.prompt)),c=markup(decimalUnits(model.upstream.completion));return (p*BigInt(characterCount+2000)+c*BigInt(maxTokens))*2n+1n}
export function exactUsageCost(model,usage){if(usage?.cost!==undefined&&usage?.cost!==null){return markup(decimalUnits(usage.cost))}const input=Number(usage?.prompt_tokens),output=Number(usage?.completion_tokens);if(!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input<0||output<0)throw statusError('Upstream did not return verifiable token usage',502);return markup(decimalUnits(model.upstream.prompt))*BigInt(input)+markup(decimalUnits(model.upstream.completion))*BigInt(output)}
