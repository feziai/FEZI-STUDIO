import {alternateBotFiles} from './fezi-telegram-adapters.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const bad=(status,message)=>Object.assign(new Error(message),{status});
const commandRe=/^[a-z][a-z0-9_]{0,31}$/;
export function validateTelegramPlugin(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw bad(400,'Invalid Telegram plugin');
  const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
  const name=clean(raw.name,80),description=clean(raw.description,300),welcome=clean(raw.welcome,3000),fallback=clean(raw.fallback,1200)||'از /help برای دیدن دستورها استفاده کن.';
  if(name.length<3||!welcome)throw bad(400,'Bot name and welcome message are required');
  if(!Array.isArray(raw.commands)||raw.commands.length>20)throw bad(400,'Up to 20 commands are supported');
  const seen=new Set(['start','help']);
  const commands=raw.commands.map(x=>{
    if(!x||typeof x!=='object')throw bad(400,'Invalid command');
    const command=clean(x.command,32).replace(/^\//,''),reply=clean(x.reply,3000),label=clean(x.description,180)||command;
    if(!commandRe.test(command)||seen.has(command)||!reply)throw bad(400,'Invalid/duplicate command or missing reply: '+command);
    seen.add(command);
    return {command,description:(label.length>=3?label:command+' command').slice(0,256),reply};
  });
  let website='';
  if(raw.website){
    try{const url=new URL(raw.website);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error();website=url.toString().slice(0,500)}
    catch{throw bad(400,'Website must be a valid public HTTPS URL');}
  }
  return {schemaVersion:2,name,description,welcome,fallback,website,visibility:raw.visibility==='public'?'public':'private',engine:['native','grammy','telegraf','aiogram'].includes(raw.engine)?raw.engine:'native',commands};
}
export function telegramReply(spec, text, firstName=''){ 
  const command=String(text||'').trim().split(/\s+/)[0].split('@')[0].replace(/^\//,'').toLowerCase();
  let result='';
  if(String(text||'').startsWith('/')){
    if(command==='start')result=spec.welcome;
    else if(command==='help')result=['دستورهای '+spec.name, '/start — شروع', '/help — راهنما',...spec.commands.map(x=>'/'+x.command+' — '+x.description)].join('\n');
    else result=spec.commands.find(x=>x.command===command)?.reply||spec.fallback;
  }else result=spec.fallback;
  return result.replaceAll('{{first_name}}',String(firstName).slice(0,80)).slice(0,4000);
}
export function brandedTelegramText(text,brandUrl=''){
 const u=String(brandUrl||'').trim();const valid=/^https:\/\/[A-Za-z0-9.-]+(?::\d{2,5})?(?:\/[^\s]*)?$/.test(u);
 const brand='ساخته‌شده با FEZI Studio'+(valid?' · '+u:'');
 return (String(text||'').slice(0,3850)+'\n\n'+brand).slice(0,4000);
}
function sampleFiles(spec){
  const data=JSON.stringify(spec,null,2);
  const source=`import fs from 'node:fs/promises';\nimport {setTimeout as delay} from 'node:timers/promises';\nconst token=process.env.TELEGRAM_BOT_TOKEN;\nif(!token||!/^\\d{5,15}:[A-Za-z0-9_-]{25,}$/.test(token)){console.error('Set TELEGRAM_BOT_TOKEN in environment');process.exit(1)}\nconst plugin=JSON.parse(await fs.readFile(new URL('./plugin.json',import.meta.url),'utf8'));\nasync function api(method,body={}){const res=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok||!data.ok)throw Error('Telegram '+method+' failed: '+(data.description||res.status));return data.result}\nfunction reply(text,firstName=''){const command=String(text||'').trim().split(/\\s+/)[0].split('@')[0].replace(/^\\//,'').toLowerCase();const c=plugin.commands.find(x=>x.command===command);const output=String(text||'').startsWith('/')?(command==='start'?plugin.welcome:command==='help'?['دستورهای '+plugin.name,'/start — شروع','/help — راهنما',...plugin.commands.map(x=>'/'+x.command+' — '+x.description)].join('\\n'):c?c.reply:plugin.fallback):plugin.fallback;return (output.replaceAll('{{first_name}}',String(firstName).slice(0,80)).slice(0,3800)+'\\n\\nساخته‌شده با FEZI Studio'+((process.env.FEZI_BRAND_URL||plugin.website)?' · '+(process.env.FEZI_BRAND_URL||plugin.website):'')).slice(0,4000)}\nconst commands=[{command:'start',description:'شروع'},{command:'help',description:'راهنما'},...plugin.commands.map(x=>({command:x.command,description:x.description.slice(0,256)}))];\nawait api('getMe');await api('setMyCommands',{commands});\nlet offset=0;console.log('Bot connected. Stop with Ctrl+C.');\nwhile(true){try{const updates=await api('getUpdates',{offset,timeout:25,allowed_updates:['message']});for(const u of updates){offset=Math.max(offset,u.update_id+1);const m=u.message;if(!m||m.chat?.type!=='private'||typeof m.text!=='string')continue;let text=reply(m.text,m.from?.first_name);const payload={chat_id:m.chat.id,text};if(plugin.website&&m.text.trim().startsWith('/start'))payload.reply_markup={inline_keyboard:[[{text:'وب‌سایت',url:plugin.website}]]};await api('sendMessage',payload)}}catch(error){console.error(String(error.message).slice(0,160));await delay(2500)}}\n`;
  const docs=`# ${spec.name} — Telegram plugin ساخته‌شده با فضی استودیو\n\nاین خروجی یک ربات تلگرامی واقعی با پاسخ‌های قابل ویرایش است، نه پلاگین قابل نصب داخل اپ رسمی تلگرام.\n\n## راه‌اندازی\n1. با @BotFather در تلگرام یک ربات بسازید و توکن خصوصی آن را بگیرید.\n2. روی کامپیوتر یا VPS دارای Node.js 22+، فایل‌های بسته را استخراج کنید.\n3. با متغیر محیطی TELEGRAM_BOT_TOKEN توکن را تنظیم کنید؛ هرگز آن را داخل کد یا GitHub قرار ندهید.\n4. اجرا: npm start\n5. با آدرس t.me/USERNAME_BOT وارد ربات شوید و /start و دیگر دستورها را امتحان کنید.\n\nاین نسخه از getUpdates استفاده می‌کند و بنابراین همزمان با یک Webhook فعال برای همین ربات قابل اجرا نیست. در صورت نیاز با BotFather /deletebot نزنید؛ فقط اتصال قبلی webhook را از طرف صاحب ربات تنظیم کنید.\nهیچ پیام انبوه، ارسال خودکار ناخواسته یا اجرای کد ناشناس انجام نمی‌شود.\n`;
  return {'plugin.json':data,'bot.mjs':source,'package.json':JSON.stringify({name:'fezi-telegram-plugin',version:'1.0.0',type:'module',private:true,scripts:{start:'node bot.mjs'},engines:{node:'>=22'}},null,2),'README_FA.md':docs,'.gitignore':'.env\nnode_modules/\n','.env.example':'TELEGRAM_BOT_TOKEN=YOUR_PRIVATE_BOTFATHER_TOKEN\nFEZI_BRAND_URL=https://your-real-domain.example\n'};
}
export function makeTelegramPluginFiles(raw){const spec=validateTelegramPlugin(raw);const files=sampleFiles(spec);const alt=alternateBotFiles(spec);return alt?{...files,...alt,'README_ENGINE_FA.md':(alt['README_ENGINE_FA.md']||'انتخاب چارچوب: '+spec.engine+'\nنصب بسته‌های وابسته فقط روی سرور صاحب ربات انجام می‌شود.\n')}:files;}

function safeEq(a,b){const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)}
export function createTelegramPluginHub({dataDir,sessionSecret,publicBaseUrl='',fetchImpl=fetch}){
  const file=path.join(dataDir,'telegram-plugin-hub','bots.json');
  const key=crypto.createHash('sha256').update(String(sessionSecret)+'|fezi-telegram-hub-v1').digest();
  const site=String(publicBaseUrl).replace(/\/$/,'');
  const bots=new Map(),lastUpdates=new Map(),chatRate=new Map();
  let write=Promise.resolve();
  const encrypt=plain=>{const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),ct=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ct:ct.toString('base64')}};
  const decrypt=enc=>{const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(enc.iv,'base64'));decipher.setAuthTag(Buffer.from(enc.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(enc.ct,'base64')),decipher.final()]).toString('utf8')};
  async function init(){await fs.mkdir(path.dirname(file),{recursive:true});try{const data=JSON.parse(await fs.readFile(file,'utf8'));for(const b of data.bots||[])bots.set(b.id,b)}catch(e){if(e.code!=='ENOENT')throw e}}
  async function save(){write=write.catch(()=>{}).then(async()=>{const tmp=file+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';await fs.writeFile(tmp,JSON.stringify({version:1,bots:[...bots.values()]},null,2),{mode:0o600,flag:'wx'});await fs.rename(tmp,file)});return write}
  async function api(token,method,params={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const res=await fetchImpl('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params),signal:controller.signal});const j=await res.json();if(!res.ok||j.ok!==true)throw bad(502,'Telegram rejected '+method);return j.result;}catch(e){if(e.status)throw e;throw bad(502,'Telegram API is unavailable')}finally{clearTimeout(timer)}}
  function list(){return [...bots.values()].map(x=>({id:x.id,name:x.spec.name,username:x.username,commands:x.spec.commands.length,visibility:x.spec.visibility||'private',active:true,createdAt:x.createdAt,url:'https://t.me/'+x.username}))}
  function listPublic(){return list().filter(x=>x.visibility==='public').map(({id,createdAt,...publicInfo})=>publicInfo)}
  async function connect(input){
    if(!/^https:\/\/[A-Za-z0-9.-]+(?::(?:443|8443))?$/.test(site)||site.includes('localhost')||site.includes('example.'))throw bad(503,'Set PUBLIC_BASE_URL to an actual HTTPS domain before connecting a bot');
    const spec=validateTelegramPlugin(input.spec),token=String(input.token||'').trim();
    if(!/^\d{5,15}:[A-Za-z0-9_-]{25,}$/.test(token))throw bad(400,'Invalid BotFather token format');
    const me=await api(token,'getMe');if(!me?.is_bot||!/^\w{5,32}$/.test(me.username||''))throw bad(502,'Bot identity invalid');
    if([...bots.values()].some(x=>x.botId===String(me.id)))throw bad(409,'This Telegram bot is already connected');
    const id=crypto.randomBytes(12).toString('hex'),webhookSecret=crypto.randomBytes(30).toString('base64url');
    // Only authenticated owner can reach this function via server routes.
    await api(token,'setWebhook',{url:site+'/api/plugins/telegram/webhook/'+id,secret_token:webhookSecret,allowed_updates:['message'],drop_pending_updates:false,max_connections:10});
    try{
      await api(token,'setMyCommands',{commands:[{command:'start',description:'شروع'},{command:'help',description:'راهنما'},...spec.commands.map(c=>({command:c.command,description:c.description.slice(0,256)}))]});
      await api(token,'setChatMenuButton',{menu_button:{type:'web_app',text:'FEZI Studio',web_app:{url:site+'/plugins/telegram-builder'}}});
      bots.set(id,{id,botId:String(me.id),username:me.username,spec,encryptedToken:encrypt(token),webhookSecret:encrypt(webhookSecret),createdAt:new Date().toISOString()});await save();
    }catch(e){bots.delete(id);await api(token,'deleteWebhook').catch(()=>{});throw e}
    return {id,username:me.username,url:'https://t.me/'+me.username,active:true};
  }
  async function disconnect(id){const b=bots.get(id);if(!b)throw bad(404,'Bot not found');const token=decrypt(b.encryptedToken);await api(token,'deleteWebhook',{drop_pending_updates:false});bots.delete(id);await save();return {ok:true}}
  async function webhook(id,header,update){const b=bots.get(id);if(!b)throw bad(404,'Bot not found');if(!header||!safeEq(header,decrypt(b.webhookSecret)))throw bad(403,'Forbidden');
    if(!update||!Number.isSafeInteger(update.update_id))throw bad(400,'Invalid update');
    const m=update.message;if(!m||m.chat?.type!=='private'||typeof m.text!=='string')return {ok:true,skipped:true};
    const k=id+':'+m.chat.id,now=Date.now();const rate=chatRate.get(k)||{at:now,count:0};if(now-rate.at>60000){rate.at=now;rate.count=0}if(rate.count>=30)return {ok:true,rateLimited:true};rate.count++;chatRate.set(k,rate);
    const last=lastUpdates.get(id)||0;if(update.update_id<=last)return {ok:true,duplicate:true};
    const text=brandedTelegramText(telegramReply(b.spec,m.text,m.from?.first_name),site);
    const params={chat_id:m.chat.id,text};if(b.spec.website&&m.text.trim().startsWith('/start'))params.reply_markup={inline_keyboard:[[{text:'بازکردن وب‌سایت',url:b.spec.website}]]};
    await api(decrypt(b.encryptedToken),'sendMessage',params);lastUpdates.set(id,update.update_id);
    if(lastUpdates.size>300)lastUpdates.clear();if(chatRate.size>2000)chatRate.clear();
    return {ok:true,sent:true};
  }
  async function update(id,input){const b=bots.get(id);if(!b)throw bad(404,'Bot not found');const spec=validateTelegramPlugin(input.spec);const token=decrypt(b.encryptedToken);
    await api(token,'setMyCommands',{commands:[{command:'start',description:'شروع'},{command:'help',description:'راهنما'},...spec.commands.map(c=>({command:c.command,description:c.description.slice(0,256)}))]});
    await api(token,'setChatMenuButton',{menu_button:{type:'web_app',text:'FEZI Studio',web_app:{url:site+'/plugins/telegram-builder'}}});
    b.spec=spec;await save();return {id,updated:true,visibility:spec.visibility,commands:spec.commands.length};}
  async function inspect(id){const b=bots.get(id);if(!b)throw bad(404,'Bot not found');const info=await api(decrypt(b.encryptedToken),'getWebhookInfo');return {id,username:b.username,pending_update_count:info?.pending_update_count??null,last_error_date:info?.last_error_date??null,configured:true};}
  return {init,list,listPublic,connect,disconnect,webhook,update,inspect};
}
