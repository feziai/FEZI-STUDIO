/** Optional remote image generation provider; not a free or built-in model.
 * Requires a trusted private worker. Never forwards FEZI bot tokens.
 */
const endpoint=value=>{const u=new URL(value);if(u.username||u.password||u.hash||u.search||u.pathname!=='/generate-image'||!(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname))))throw Error('Image worker must be a HTTPS /generate-image URL or local HTTP /generate-image');return u.href};
export function createTelegramImageWorker({url=process.env.FEZI_TELEGRAM_IMAGE_WORKER_URL,secret=process.env.FEZI_TELEGRAM_IMAGE_WORKER_TOKEN,fetchImpl=fetch}={}){
 if(!url)return null;
 const target=endpoint(url);
 if(typeof secret!=='string'||secret.length<32)throw Error('Configure a strong private image worker token');
 return {async generate(prompt,{telegramId,userId}){
  if(typeof prompt!=='string'||prompt.length<3||prompt.length>1000||!/^\d{1,19}$/.test(String(telegramId))||!userId)throw Error('Invalid image request');
  const res=await fetchImpl(target,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret},body:JSON.stringify({prompt,telegramId:String(telegramId),userId}),signal:AbortSignal.timeout(90000)});
  if(!res.ok)throw Error('Image worker unavailable');
  const body=await res.json();const imageUrl=String(body.imageUrl||'');const fileId=String(body.fileId||'');
  if(imageUrl&&/^https:\/\/[^\s]+$/.test(imageUrl))return {imageUrl};
  if(fileId&&/^[A-Za-z0-9_-]{20,500}$/.test(fileId))return {fileId};
  throw Error('Image worker returned no Telegram-compatible media');
 }};
}
