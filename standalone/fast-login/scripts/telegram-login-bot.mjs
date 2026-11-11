#!/usr/bin/env node
/** Third standalone Telegram Bot: one-time FEZI login approvals. No Telegram bot login grants credentials by itself. */
import fs from 'node:fs/promises';import path from 'node:path';
import {TelegramApi} from '../core/telegram-runtime.js';
import {callFeziBridge} from '../core/telegram-bot-bridge-client.js';
const token=process.env.TELEGRAM_LOGIN_BOT_TOKEN||'';
if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Configure TELEGRAM_LOGIN_BOT_TOKEN privately');
const api=new TelegramApi(token),dir=path.resolve(process.env.DATA_DIR||'./data','telegram-login');await fs.mkdir(dir,{recursive:true,mode:0o700});
const file=path.join(dir,'offset.json');let offset=0;try{offset=JSON.parse(await fs.readFile(file,'utf8')).offset||0}catch{}
const me=await api.call('getMe');await api.call('deleteWebhook',{drop_pending_updates:false});
await api.call('setMyCommands',{commands:[{command:'start',description:'Approve a FEZI login'},{command:'help',description:'How secure sign-in works'}]});
let run=true;process.on('SIGTERM',()=>run=false);process.on('SIGINT',()=>run=false);console.log('FEZI secure login bot started @'+me.username);
while(run){try{const updates=await api.call('getUpdates',{offset,timeout:25,limit:20,allowed_updates:['message']},{timeout:35000});for(const u of updates){if(u.update_id<offset)continue;offset=u.update_id+1;await fs.writeFile(file,JSON.stringify({offset}),{mode:0o600});const m=u.message;if(!m||m.chat?.type!=='private'||m.from?.is_bot||!m.from?.id)continue;
 const value=String(m.text||'').trim(),match=/^\/start(?:@\w+)?\s+login_([A-Za-z0-9_-]{20,100})$/.exec(value);
 let text='🔐 FEZI Secure Login\nOpen your FEZI website and choose Sign in with Telegram. After approving here, return to the same browser to finish sign-in.\nDo not send screenshots or codes to anyone.';
 if(match){try{await callFeziBridge('/api/telegram/internal/confirm',{kind:'login',code:match[1],telegramId:String(m.from.id)});text='✅ Telegram identity approved. Return to the FEZI website and press Finish sign-in. No password was sent to Telegram.'}catch(e){text='⛔ Login not approved: '+e.message}}
 await api.call('sendMessage',{chat_id:m.chat.id,text});
}}catch(e){console.error('Secure login polling error:',String(e.message).replaceAll(token,'[REDACTED]').slice(0,150));await new Promise(r=>setTimeout(r,5000))}}
