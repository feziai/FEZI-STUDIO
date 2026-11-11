#!/usr/bin/env node
// Initial setup: send /id to your bot, then run this to obtain your numeric user ID.
import {TelegramApi} from '../core/telegram-runtime.js';
const token=process.env.TELEGRAM_BOT_TOKEN;
if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token||''))throw Error('Set TELEGRAM_BOT_TOKEN first');
const api=new TelegramApi(token);
const status=await api.call('getWebhookInfo');
if(status.url)throw Error('Webhook is active. Use /id with webhook mode or disable webhook before initial polling setup.');
const updates=await api.call('getUpdates',{timeout:0,limit:50,allowed_updates:['message']});
for(const u of updates){if(u.message?.chat?.type==='private'&&u.message?.from?.id)console.log('Telegram ID:',u.message.from.id,'message:',String(u.message.text||'').slice(0,30));}
if(updates.length===0)console.log('No messages: send /start to the bot in Telegram and run this script again.');
