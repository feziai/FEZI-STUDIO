/** Telegram Mini App binding; does not authenticate a FEZI account. */
import crypto from 'node:crypto';
const TOKEN=/^\d{5,12}:[A-Za-z0-9_-]{20,}$/;
export function normalizeSiteOrigin(value) {
  if (!value || typeof value !== 'string') throw Error('PUBLIC_BASE_URL must be configured');
  const url=new URL(value);
  if (url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !url.hostname || url.pathname!=='/') throw Error('Mini App requires a clean HTTPS site origin');
  return url.origin;
}
export function miniAppUrls(env=process.env) {
  const origin=normalizeSiteOrigin(env.PUBLIC_BASE_URL || env.TELEGRAM_WEBAPP_URL || '');
  return {studio:origin+'/studio',arina:origin+'/arina-live',wallet:origin+'/arina-wallet',gallery:origin+'/arina-gallery'};
}
export function miniAppMenu(kind, urls) {
  if (!['fezi','arina'].includes(kind)) throw Error('Invalid bot kind');
  return {type:'web_app',text:kind==='fezi'?'Open FEZI Studio':'Watch Arina Live',web_app:{url:kind==='fezi'?urls.studio:urls.arina}};
}
export function miniAppKeyboard(kind,urls,{arinaBotUsername=''}={}) {
  if(kind==='fezi') {
    const rows=[[{text:'✨ Open FEZI Studio',web_app:{url:urls.studio}}]];
    if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(arinaBotUsername)) rows.push([{text:'💗 Arina Live Bot',url:'https://t.me/'+arinaBotUsername+'?start'}]);
    return {inline_keyboard:rows};
  }
  if(kind==='arina')return {inline_keyboard:[[{text:'🎥 Watch Arina Live',web_app:{url:urls.arina}}],[{text:'🍬 Gifts & Tips',url:urls.wallet},{text:'📸 Arina Album',url:urls.gallery}],[{text:'💬 Private Room',url:urls.arina.replace(/\/arina-live$/,'/arina-private')},{text:'✨ FEZI Studio',url:urls.studio}]]};
  throw Error('Invalid bot kind');
}
/** Verifies Telegram.WebApp.initData with HMAC. Does NOT create a FEZI login. */
export function verifyTelegramInitData(raw,token,{now=Date.now(),maxAgeSeconds=600}={}) {
  if(!TOKEN.test(token||'')||typeof raw!=='string'||raw.length<30||raw.length>8192)throw Error('Invalid Mini App identity');
  const q=new URLSearchParams(raw),seen=new Set();
  for(const [key] of q){if(seen.has(key))throw Error('Duplicate Telegram field');seen.add(key)}
  const received=q.get('hash')||'';
  if(!/^[a-f0-9]{64}$/.test(received))throw Error('Invalid Telegram signature');
  const data=[...q.entries()].filter(([key])=>key!=='hash' && key!=='signature').sort((a,b)=>a[0].localeCompare(b[0],'en')).map(([key,value])=>key+'='+value).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  const computed=crypto.createHmac('sha256',secret).update(data).digest();
  if(!crypto.timingSafeEqual(Buffer.from(received,'hex'),computed))throw Error('Telegram signature mismatch');
  const date=Number(q.get('auth_date'));
  if(!Number.isSafeInteger(date)||date<1||date>Math.floor(now/1000)+60||Math.floor(now/1000)-date>maxAgeSeconds)throw Error('Telegram identity expired');
  let user=null;
  if(q.has('user')){try{user=JSON.parse(q.get('user'))}catch{throw Error('Invalid Telegram user')}if(typeof user!=='object'||!user||!Number.isSafeInteger(user.id))throw Error('Invalid Telegram user')}
  return {verified:true,telegramId:user?.id||null,firstName:String(user?.first_name||'').slice(0,100),username:String(user?.username||'').slice(0,50),authDate:date};
}
