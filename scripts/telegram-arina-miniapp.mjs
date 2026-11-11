#!/usr/bin/env node
import {announcementSubscription} from '../modules/announcement/subscriptions.mjs';
/** Independent Arina Telegram bot: launches existing Arina Live Mini App. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {TelegramApi} from '../core/telegram-runtime.js';
import {miniAppUrls,miniAppKeyboard,miniAppMenu} from '../core/telegram-miniapps.js';
import {ARINA_BOT_COMMANDS} from '../core/arina-telegram-channel.js';
import {callFeziBridge} from '../core/telegram-bot-bridge-client.js';
import {createArinaStandaloneChat} from '../core/arina-standalone-free-chat.js';
const token=process.env.TELEGRAM_ARINA_BOT_TOKEN||'';
if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Configure TELEGRAM_ARINA_BOT_TOKEN in the private environment');
let urls=null;try{urls=miniAppUrls()}catch{}
const api=new TelegramApi(token);
const directChat=createArinaStandaloneChat({dataDir:path.resolve(process.env.DATA_DIR||'./data')});
await directChat.init();
const store=path.resolve(process.env.DATA_DIR||'./data','telegram-arina-miniapp');await fs.mkdir(store,{recursive:true,mode:0o700});
const offsetFile=path.join(store,'offset.json');let offset=0;try{offset=(JSON.parse(await fs.readFile(offsetFile,'utf8')).offset)||0}catch{}
const me=await api.call('getMe');
const webhook=await api.call('getWebhookInfo');
if(webhook.url){
  if(process.env.ARINA_ALLOW_REMOVE_WEBHOOK!=='true')throw Error('Arina bot already has an active webhook. Stop the other worker or explicitly authorize transition via ARINA_ALLOW_REMOVE_WEBHOOK=true');
  await api.call('deleteWebhook',{drop_pending_updates:false});
}
await api.call('setMyCommands',{commands:ARINA_BOT_COMMANDS});
if(urls){await api.call('setChatMenuButton',{menu_button:miniAppMenu('arina',urls)});}
await api.call('setMyShortDescription',{short_description:'آرینا، شخصیت مجازی FEZI Studio | چت، ویدیوهای حلقه‌ای، رادیو و گالری'});
let run=true;process.on('SIGTERM',()=>run=false);process.on('SIGINT',()=>run=false);
console.log('Arina bot started @'+me.username);
while(run){try{
 const updates=await api.call('getUpdates',{offset,timeout:25,limit:20,allowed_updates:['message']},{timeout:35000});
 for(const u of updates){if(u.update_id<offset)continue;offset=u.update_id+1;await fs.writeFile(offsetFile,JSON.stringify({offset}),{mode:0o600});
if(await announcementSubscription(u,token,p=>api.call('sendMessage',p)))continue;
 const m=u.message;if(!m||m.chat?.type!=='private'||m.from?.is_bot)continue;
 const text=String(m.text||'').trim();if(!text)continue;const command=(text.match(/^\/(\w+)/)||[])[1]?.toLowerCase()||'chat';
 let response='💗 Welcome to Arina! Send /chat followed by your message to talk. Live and gifts require the FEZI Mini App.';
 if(command==='account'){try{const x=await callFeziBridge('/api/telegram/internal/summary',{telegramId:String(m.from.id)});response=x.linked?`👤 @${x.username}\nVerified Arina balance: $${(x.arina.balanceCents/100).toFixed(2)}\nPayments enabled: ${x.arina.verifiedPaymentsActive?'yes':'no'}`:'Please register on FEZI Studio, then connect Telegram at /telegram-connect.'}catch{response='Account bridge is not connected.'}}
 if(command==='tip')response='🍬 Open Gifts & Tips in the Arina Mini App. For digital services inside Telegram, Stars payments must be used where required. No transfer is credited before server-side verification.';
 if(command==='album')response='📸 آلبوم تصاویر آرینا با دکمهٔ زیر باز می‌شود.';
 if(command==='radio')response=urls?'📻 رادیوی آرینا در همان مینی‌اپ لایو است. ایستگاه را انتخاب کن و برای شنیدن موسیقی روی پخش بزن: '+urls.arina:'برای رادیوی آرینا باید آدرس HTTPS سایت تنظیم شود.';
 if(command==='clips')response=urls?'🎬 ویدیوهای کوتاه و نمونهٔ کامل آرینا: '+urls.arina+'#arinaClipsLibrary':'برای دیدن کلیپ‌ها باید آدرس HTTPS سایت تنظیم شود.';
 if(command==='live')response=urls?'🎥 آرینا در اتاق ویدیویی سایت با کلیپ‌های ضبط‌شده به‌صورت پیوسته پخش می‌شود: '+urls.arina:'برای لایو باید آدرس HTTPS سایت تنظیم شود.';
 if(command==='private')response=urls?'💗 Private room: '+urls.arina.replace(/\/arina-live$/,'/arina-private')+'\nThis is only an access link, not a promise of live voice/video availability.':'Private room requires a FEZI Mini App URL.';
 if(command==='fezi')response=urls?'✨ Open FEZI Studio: '+urls.studio:'FEZI Studio site has not been configured.';
 if(command==='status')response='🎥 '+(urls?'لایو حلقه‌ای آرینا: '+urls.arina:'آدرس مینی‌اپ تنظیم نشده است.')+'\nپخش درون صفحه هنگام باز بودن مینی‌اپ ادامه دارد؛ استریم واقعی تلگرام نیازمند انکودر و سرور دائمی است.';
 if(command==='help')response='💗 راهنمای ربات آرینا:\n/live — اتاق لایو\n/chat پیام — چت با شخصیت آرینا\n/radio — رادیو\n/clips — ویدیوها\n/album — عکس‌ها\n/tip — گیفت\n/private — اتاق خصوصی\n/account — حساب متصل FEZI\n/status — وضعیت لایو\n/fezi — FEZI Studio';
 if(command==='chat'){
  const userText=text.replace(/^\/chat(?:@\w+)?\s*/i,'').trim();
  if(!userText||userText.length>600)response='Send a short message (up to 600 characters).';
  else try{const answer=await callFeziBridge('/api/telegram/internal/arina-chat',{telegramId:String(m.from.id),text:userText});response=answer.answer;}catch(e){
   if(directChat.ready){try{const output=await directChat.reply({telegramId:String(m.from.id),content:userText,language:m.from.language_code||'fa'});response=output.answer;
      // Telegram reactions are optional and may not be permitted in all chats.
      try{await api.call('setMessageReaction',{chat_id:m.chat.id,message_id:m.message_id,reaction:[{type:'emoji',emoji:'❤️'}],is_big:false})}catch{}
     }catch(x){response='💗 Arina is temporarily unavailable: '+(Number(x.status)===429?'Daily free chat quota reached':'Please try again later.')}}
   else response='Arina chat needs the FEZI bridge or explicitly configured standalone free model. Open the Mini App for live-room status.'
  }
 }

 await api.call('sendMessage',{chat_id:m.chat.id,text:response,...(urls?{reply_markup:miniAppKeyboard('arina',urls)}:{}),disable_web_page_preview:true});
 }
 }catch(e){console.error('Arina bot error:',String(e?.message||e).replaceAll(token,'[REDACTED]').slice(0,180));await new Promise(r=>setTimeout(r,5000))}}
