/** FEZI v1.01: one-time verified Telegram linking & website sign-in.
 * All commands from bots are authenticated at the FEZI server using an internal secret.
 * Pending login requests NEVER create accounts; only registered users can sign in.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const fail=(s,status=400)=>Object.assign(new Error(s),{status});
const tgId=id=>/^\d{1,19}$/.test(String(id||''));
const fresh=()=>crypto.randomBytes(18).toString('base64url');
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
export function createTelegramAccountBridge({dataDir,studio,internalSecret,now=()=>Date.now()}) {
 const file=path.join(dataDir,'telegram-account-bridge','pending.json');
 let state={pending:{}};let queue=Promise.resolve();
 const mutate=fn=>{const job=queue.then(async()=>{const ret=await fn();await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const tmp=file+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify(state),{mode:0o600});await fs.rename(tmp,file);return ret});queue=job.catch(()=>{});return job};
 async function init(){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});try{state=JSON.parse(await fs.readFile(file,'utf8'));if(!state.pending||typeof state.pending!=='object')throw Error('Malformed bridge state')}catch(e){if(e.code!=='ENOENT')throw e;}}
 function gc(){for(const [k,v] of Object.entries(state.pending))if(v.expiresAt<=now()||v.used)delete state.pending[k]}
 function authorizeSecret(provided){if(typeof internalSecret!=='string'||internalSecret.length<32||typeof provided!=='string')throw fail('Bot bridge is not configured',503);const a=Buffer.from(digest(provided),'hex'),b=Buffer.from(digest(internalSecret),'hex');if(!crypto.timingSafeEqual(a,b))throw fail('Unauthorized bot bridge',401)}
 async function beginLink(userId){return mutate(()=>{gc();for(const [key,v] of Object.entries(state.pending))if(v.kind==='link'&&v.userId===userId)delete state.pending[key];const code=fresh();state.pending[digest(code)]={kind:'link',userId,expiresAt:now()+10*60_000,used:false};return {code,expiresSeconds:600}})}
 async function beginLogin(){return mutate(()=>{gc();if(Object.keys(state.pending).length>2500)throw fail('Too many pending login requests',429);const code=fresh(),browserSecret=fresh();state.pending[digest(code)]={kind:'login',browserDigest:digest(browserSecret),expiresAt:now()+5*60_000,used:false,telegramId:null};return {code,browserSecret,expiresSeconds:300}})}
 async function confirm({code,telegramId,kind}){
  if(typeof code!=='string'||code.length<15||code.length>100||!tgId(telegramId)||!['link','login'].includes(kind))throw fail('Invalid Telegram confirmation');
  return mutate(async()=>{
   gc();const key=digest(code),p=state.pending[key];if(!p||p.kind!==kind||p.expiresAt<=now()||p.used)throw fail('Code expired or invalid',404);
   if(kind==='link'){
    const existing=studio.findByTelegramId(String(telegramId));if(existing&&existing.id!==p.userId)throw fail('Telegram account is already linked to another FEZI account',409);
    await studio.linkTelegram(p.userId,String(telegramId));p.used=true;return {ok:true,kind:'link'};
   }
   const linked=studio.findByTelegramId(String(telegramId));if(!linked)throw fail('Register at FEZI and link your Telegram account first',403);
   if(p.telegramId && p.telegramId!==String(telegramId))throw fail('Login request was already approved by another identity',409);
   p.telegramId=String(telegramId);p.userId=linked.id;return {ok:true,kind:'login',note:'Confirm website login in the original browser'};
  });
 }
 async function finishLogin({code,browserSecret}){if(typeof code!=='string'||typeof browserSecret!=='string')throw fail('Invalid browser login request');return mutate(()=>{gc();const p=state.pending[digest(code)];if(!p||p.kind!=='login'||!p.telegramId||p.expiresAt<=now()||p.used||!crypto.timingSafeEqual(Buffer.from(digest(browserSecret),'hex'),Buffer.from(p.browserDigest,'hex')))throw fail('Login not confirmed, expired, or invalid',403);p.used=true;return {userId:p.userId}})}
 function summaryByTelegram(telegramId){if(!tgId(telegramId))throw fail('Invalid Telegram account');const u=studio.findByTelegramId(String(telegramId));if(!u)return {linked:false,registrationRequired:true};return {linked:true,userId:u.id,name:u.name,username:u.username,emailVerified:!!u.emailVerified,creatorPayoutWalletsConfigured:Object.keys(u.payoutWallets||{}).length,creditsAvailable:false};}
 return {init,beginLink,beginLogin,confirm,finishLogin,summaryByTelegram,authorizeSecret};
}
