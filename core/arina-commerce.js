import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import wallets from './arina-wallets.json' with {type:'json'};
const SOURCE_DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(SOURCE_DIR,'..');
const MIN_CENTS=100, PRIVATE_CENTS=900, PRIVATE_MILLIS=40*60*1000;
const PREMIUM=new Set([4,5,6,7]);
export const GIFTS=Object.freeze([{id:'rose',title:'گل رز',cents:50,icon:'🌹'},{id:'heart',title:'قلب صورتی',cents:100,icon:'💗'},{id:'plush',title:'خرگوش',cents:300,icon:'🐰'},{id:'star',title:'ستاره',cents:500,icon:'⭐'}]);
const CAPTIONS=[
  ['خرگوش صورتی','کلاه خرگوشی و خندهٔ آرینا'],
  ['توت‌فرنگی','میان‌وعدهٔ توت‌فرنگی در اتاق استریم'],
  ['قلب کوچولو','چشمک و قلب برای بیننده‌ها'],
  ['گیمینگ استایل','عکسی از فضای استریم'],
  ['لحظهٔ استراحت','عکس اختصاصی آرینا'],
  ['حالت آرام','آرینا در اتاق صورتی'],
  ['پرترهٔ نزدیک','نمای خصوصی از آرینا'],
  ['آرامش','پرترهٔ آرینا'],
  ['میلک‌شیک صورتی','آرینا و نوشیدنی توت‌فرنگی'],
  ['چشمک و صلح','آرینا با هدفون و ژست V']
];
export const PHOTOS=CAPTIONS.map(([title,description],i)=>({
  id:`arina-${String(i+1).padStart(2,'0')}`,title,description,
  premium:PREMIUM.has(i+1),preview:`/arina-gallery/thumb/arina-${String(i+1).padStart(2,'0')}.webp`,
  // These are DEMO seed counts, not real likes; client MUST identify them as previews.
  demoLikes:27+(crypto.createHash('sha256').update('fezi-arina-photo-'+i).digest()[0]%22)
}));
const byId=new Map(PHOTOS.map(x=>[x.id,x]));
const byWalletId=new Map(wallets.map(x=>[x.id,x]));
const clone=x=>JSON.parse(JSON.stringify(x));
function requirePhoto(id){const x=byId.get(id);if(!x)throw Object.assign(new Error('Photo not found'),{status:404});return x;}
function bad(message,status=400){return Object.assign(new Error(message),{status});}
function floorInt(n){return Number.isSafeInteger(n)&&n>=0?n:0;}
export function createArinaCommerce({dataDir,webhookSecret='',paymentsReady=false,privateVideoReady=false,now=()=>Date.now()}){
 let state={users:{},invoices:{},processedTransactions:{}};
 const location=path.join(dataDir,'arina-gallery-commerce.json');
 let write=Promise.resolve();
 const enabled=Boolean(paymentsReady && webhookSecret.length>=32);
 async function init(){await fs.mkdir(dataDir,{recursive:true});try{state=JSON.parse(await fs.readFile(location,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
 function user(id){if(!/^[a-f0-9]{32}$/.test(String(id||'')))throw bad('Valid visitor session required',401);
   return state.users[id]??(state.users[id]={likes:[],saved:[],unlocked:[],balanceCents:0,privateUntil:0});}
 function save(){const snapshot=JSON.stringify(state);write=write.then(async()=>{const target=location+'.tmp-'+process.pid;await fs.writeFile(target,snapshot,{mode:0o600});await fs.rename(target,location);});return write;}
 function summary(id){const u=user(id);return {balanceCents:floorInt(u.balanceCents),unlocked:u.unlocked,privateUntil:u.privateUntil||0,canCharge:enabled,privateVideoReady:privateVideoReady&&enabled,ageVerificationRequired:true,accountRequiredForLivePayments:true};}
 function list(id){const u=user(id);return PHOTOS.map(p=>({
   ...p,likes:Object.values(state.users).reduce((n,x)=>n+((x.likes||[]).includes(p.id)?1:0),0),
   liked:u.likes.includes(p.id),saved:u.saved.includes(p.id),unlocked:!p.premium||u.unlocked.includes(p.id),
   full:!p.premium||u.unlocked.includes(p.id)?`/arina-gallery/media/${p.id}.webp`:null
 }));}
 async function toggle(id,photoId,field){requirePhoto(photoId);const u=user(id),arr=u[field];const idx=arr.indexOf(photoId);if(idx<0)arr.push(photoId);else arr.splice(idx,1);await save();return {value:idx<0,photoId,...(field==='likes'?{likes:list(id).find(x=>x.id===photoId).likes}: {})};}
 function photoAccess(id,photoId){const photo=requirePhoto(photoId),u=user(id);
   if(photo.premium&&!u.unlocked.includes(photoId))throw bad('Premium photo requires verified credit',402);
   const directory=photo.premium?'private/arina-gallery':'public/arina-gallery/full';
   return path.join(ROOT,directory,photoId+'.webp');
 }
 function allWallets(){return wallets.map(({id,label,network,address})=>({id,label,network,address,qr:`/arina-gallery/qr/${id}.png`}))}
 async function createInvoice(id,assetId,amountCents){const wallet=byWalletId.get(assetId);if(!wallet)throw bad('Unknown asset/network',400);
   if(!Number.isSafeInteger(amountCents)||amountCents<MIN_CENTS||amountCents>10000000)throw bad('USD credit amount must be between $1 and $100,000');
   if(!enabled)return {enabled:false,status:'configuration_required',wallet:{...wallet,qr:`/arina-gallery/qr/${wallet.id}.png`},note:'No automatic credit or payment instruction until trusted chain verification, per-user attribution and login are configured. Do not transfer funds yet.'};
   // Never accept a bare tx hash as proof. This requires a trusted provider to
   // independently attribute the deposit to the user and invoice.
   const key=crypto.randomUUID();state.invoices[key]={id:key,userId:id,assetId,network:wallet.network,address:wallet.address,amountCents,status:'pending',createdAt:now()};await save();
   return {enabled:true,invoiceId:key,status:'pending',assetId,network:wallet.network,address:wallet.address,qr:`/arina-gallery/qr/${wallet.id}.png`,amountCents,note:'Await network-specific verified invoice and trusted confirmations; do not send cryptocurrency before quote/attribution is ready.'};
 }
 function verifySignature(timestamp,raw,sig){if(!webhookSecret||!/^[0-9]{10,13}$/.test(timestamp)||!/^[a-f0-9]{64}$/i.test(sig))return false;
   const sec=Number(timestamp)<1e12?Number(timestamp)*1000:Number(timestamp);
   if(Math.abs(now()-sec)>300000)return false;
   const expected=crypto.createHmac('sha256',webhookSecret).update(timestamp+'.').update(raw).digest('hex');
   return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig.toLowerCase()));}
 async function confirmedWebhook(timestamp,raw,sig){if(!enabled)throw bad('Payment provider not configured',503);
   if(!verifySignature(timestamp,raw,sig))throw bad('Signature verification failed',401);
   let e;try{e=JSON.parse(raw.toString('utf8'));}catch{throw bad('Invalid JSON');}
   if(e.type!=='payment.confirmed'||e.confirmed!==true||e.attributed===false)throw bad('Unconfirmed payment',409);
   if(typeof e.transactionId!=='string'||e.transactionId.length<12||e.transactionId.length>256)throw bad('Invalid transaction ID');
   const inv=state.invoices[e.invoiceId];if(!inv)throw bad('Unknown invoice',404);
   if(state.processedTransactions[e.transactionId])return {ok:true,duplicate:true};
   if(inv.status!=='pending')throw bad('Invoice already settled',409);
   if(e.network!==inv.network||e.assetId!==inv.assetId||e.receivingAddress!==inv.address||e.userId!==inv.userId)throw bad('Network/token/address/recipient mismatch',409);
   if(e.usdCents!==inv.amountCents||!Number.isSafeInteger(e.usdCents))throw bad('Verified credit amount mismatch',409);
   if(!Number.isSafeInteger(e.confirmations)||e.confirmations<1||e.finalityVerified!==true||e.invoiceAttributed!==true)throw bad('Not finalized/attributed to invoice',409);
   const u=user(inv.userId);u.balanceCents=floorInt(u.balanceCents)+inv.amountCents;
   inv.status='paid';inv.transactionId=e.transactionId;state.processedTransactions[e.transactionId]=inv.id;
   await save();return {ok:true,creditedCents:inv.amountCents};
 }
 async function buyPhoto(id,photoId){const p=requirePhoto(photoId),u=user(id);if(!p.premium)return {ok:true,alreadyFree:true};if(u.unlocked.includes(photoId))return {ok:true,alreadyOwned:true};
   if(!enabled)throw bad('Payments are not active. No credits can be spent.',503);
   if(u.balanceCents<MIN_CENTS)throw bad('Insufficient verified credit',402);
   u.balanceCents-=MIN_CENTS;u.unlocked.push(photoId);await save();return {ok:true,balanceCents:u.balanceCents,photoId};}
 async function sendGift(id,giftId){const u=user(id),g=GIFTS.find(x=>x.id===giftId);if(!g)throw bad('Unknown gift');if(!enabled)throw bad('Verified payment service is not active',503);if(u.balanceCents<g.cents)throw bad('Insufficient verified credit',402);u.balanceCents-=g.cents;await save();return {ok:true,gift:{id:g.id,title:g.title,icon:g.icon},balanceCents:u.balanceCents};}
 async function privateStart(id){const u=user(id);if(!enabled||!privateVideoReady)throw bad('Real private video service not connected; no charge was made',503);
   if(u.balanceCents<PRIVATE_CENTS)throw bad('Insufficient verified credit',402);
   u.balanceCents-=PRIVATE_CENTS;u.privateUntil=Math.max(u.privateUntil||0,now())+PRIVATE_MILLIS;await save();
   return {ok:true,privateUntil:u.privateUntil,balanceCents:u.balanceCents};}
 return {init,list,summary,toggle,photoAccess,allWallets,createInvoice,confirmedWebhook,buyPhoto,sendGift,privateStart,enabled,PHOTOS,GIFTS};
}
