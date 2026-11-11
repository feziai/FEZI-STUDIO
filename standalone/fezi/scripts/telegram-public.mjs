#!/usr/bin/env node
/** Public opt-in Telegram mode. Run separately from the existing owner-only mode. */
import path from 'node:path';
import fs from 'node:fs/promises';
import {TelegramApi} from '../core/telegram-runtime.js';
import {createPublicBot} from '../core/telegram-public.js';
import {miniAppUrls} from '../core/telegram-miniapps.js';
import {createTelegramImageWorker} from '../core/telegram-image-worker-v101.js';
if(process.env.TELEGRAM_MODE!=='public-polling')throw Error('Set TELEGRAM_MODE=public-polling');
const token=process.env.TELEGRAM_FEZI_BOT_TOKEN||process.env.TELEGRAM_BOT_TOKEN||'';if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Configure TELEGRAM_BOT_TOKEN in a private .env');
const url=process.env.TELEGRAM_WEBAPP_URL||process.env.PUBLIC_BASE_URL||'';if(url&&!/^https:\/\//.test(url))throw Error('Public Telegram WebApp URL must be HTTPS');
const studioAppUrl=(/^https:\/\//.test(process.env.PUBLIC_BASE_URL||''))?miniAppUrls().studio:(url?url.replace(/\/$/,'')+'/studio':'');
const api=new TelegramApi(token),dir=path.resolve(process.env.DATA_DIR||'./data','telegram-public');await fs.mkdir(dir,{recursive:true,mode:0o700});const bot=createPublicBot({api,storeFile:path.join(dir,'users.json'),webAppUrl:url,studioAppUrl,arinaBotUsername:process.env.TELEGRAM_ARINA_BOT_USERNAME||'',loginBotUsername:process.env.TELEGRAM_LOGIN_BOT_USERNAME||'',imageWorker:createTelegramImageWorker(),botSecret:process.env.TELEGRAM_INTERNAL_TOKEN||''});await bot.init();
const me=await api.call('getMe');await api.call('deleteWebhook',{drop_pending_updates:false});await api.call('setMyCommands',{commands:[{command:'start',description:'Start FEZI Studio'},{command:'chat',description:'Chat with AI'},{command:'motivate',description:'Enable / disable daily motivation'},{command:'lang',description:'Choose English or Persian'},{command:'image',description:'Generate a photo (3 per day, if connected)'} ,{command:'quota',description:'Remaining image requests'},{command:'studio',description:'Launch FEZI Studio'},{command:'arina',description:'Arina Live bot'},{command:'login',description:'Secure login bot'},{command:'share',description:'Share approved work'},{command:'video',description:'Open video studio'},{command:'app',description:'Open app builder'},{command:'help',description:'Show help'}]});
let offset=0;try{offset=JSON.parse(await fs.readFile(path.join(dir,'offset.json'))).offset||0}catch{}let active=true;process.on('SIGINT',()=>active=false);process.on('SIGTERM',()=>active=false);
console.log('FEZI public Telegram mode started:',me.username);
let latestDate='';while(active){
 try{const date=new Date().toISOString().slice(0,10);const hour=new Date().getUTCHours();if(hour>=9&&date!==latestDate){await bot.sendDaily();latestDate=date}
 const updates=await api.call('getUpdates',{offset,timeout:25,limit:20,allowed_updates:['message']},{timeout:35000});for(const u of updates){if(u.update_id<offset)continue;await bot.processUpdate(u);offset=u.update_id+1;await fs.writeFile(path.join(dir,'offset.json'),JSON.stringify({offset}),{mode:0o600})}
 }catch(e){console.error('Telegram polling issue',String(e.message).replace(token,'[REDACTED]').slice(0,120));await new Promise(r=>setTimeout(r,5000))}
}
