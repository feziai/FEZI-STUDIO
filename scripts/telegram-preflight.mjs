#!/usr/bin/env node
/** Readiness diagnostics only; does not change bot configuration or expose credentials. */
import {TelegramApi} from '../core/telegram-runtime.js';
const env=process.env;
const token=env.TELEGRAM_BOT_TOKEN||'';
const valid=/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token);
const ids=String(env.TELEGRAM_ALLOWED_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const mode=env.TELEGRAM_MODE||'polling';
const report={product:'FEZI AGENT',botTokenConfigured:valid,allowedUsers:ids.length,mode,backendUrl:env.TELEGRAM_BACKEND_URL||`http://127.0.0.1:${env.PORT||3000}`,telegramConnected:false,backendConnected:false};
if(valid&&process.argv.includes('--online')){
  try{
    const api=new TelegramApi(token);
    const me=await api.call('getMe');
    report.telegramConnected=true;report.botUsername='@'+me.username;
    const wh=await api.call('getWebhookInfo');
    report.webhookConfigured=Boolean(wh.url);
    report.pendingUpdateCount=wh.pending_update_count||0;
  }catch(e){report.telegramError=String(e.message||e).replaceAll(token,'[REDACTED]').slice(0,160);}
}
if(process.argv.includes('--online')){
  const url=report.backendUrl;
  try{
    const u=new URL(url);
    if(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)){
      const response=await fetch(url+'/health',{signal:AbortSignal.timeout(5000)});
      report.backendConnected=response.ok;
    }else{report.backendError='Backend must be localhost';}
  }catch(e){report.backendError=String(e.message||e).slice(0,120);}
}
report.readyForPolling=valid&&ids.length>0&&mode==='polling'&&(!process.argv.includes('--online')||(report.telegramConnected&&report.backendConnected&&!report.webhookConfigured));
report.readyForWebhook=valid&&ids.length>0&&mode==='webhook'&&/^https:\/\//.test(env.TELEGRAM_PUBLIC_URL||'')&&String(env.TELEGRAM_WEBHOOK_SECRET||'').length>=16;
console.log(JSON.stringify(report,null,2));
if(!valid||!ids.length||!['polling','webhook'].includes(mode))process.exitCode=2;
if(process.argv.includes('--online')&&(!report.telegramConnected||!report.backendConnected))process.exitCode=3;
