#!/usr/bin/env node
import {TelegramApi} from '../core/telegram-runtime.js';
const token=process.env.TELEGRAM_BOT_TOKEN;
if(!token||!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Configure TELEGRAM_BOT_TOKEN in the environment first.');
const api=new TelegramApi(token);
const me=await api.call('getMe');
console.log('Telegram bot connected: @'+me.username);
if(process.argv.includes('--webhook')){
  const origin=process.env.TELEGRAM_PUBLIC_URL||'';
  const secret=process.env.TELEGRAM_WEBHOOK_SECRET||'';
  const target=new URL('/api/telegram/webhook',origin);
  if(target.protocol!=='https:'||!origin.startsWith('https://')||!origin)throw Error('TELEGRAM_PUBLIC_URL must be a public HTTPS origin');
  if(!/^[A-Za-z0-9_-]{16,256}$/.test(secret))throw Error('TELEGRAM_WEBHOOK_SECRET must be 16-256 A-Z a-z 0-9 _ - characters.');
  if(!process.env.TELEGRAM_ALLOWED_USER_IDS)throw Error('Set TELEGRAM_ALLOWED_USER_IDS');
  await api.call('setWebhook',{url:target.href,secret_token:secret,allowed_updates:['message'],max_connections:3,drop_pending_updates:false});
  console.log('Webhook configured at:',target.href);
}else if(process.argv.includes('--status')){
  const info=await api.call('getWebhookInfo');
  console.log(JSON.stringify({url:info.url,pending_update_count:info.pending_update_count,last_error_message:info.last_error_message||''},null,2));
}else{
  console.log('Use --webhook to enable HTTPS webhook, --status to inspect, or npm run telegram:poll for local polling.');
}
