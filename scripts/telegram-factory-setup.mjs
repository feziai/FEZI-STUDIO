import {FACTORY_COMMANDS} from '../core/fezi-telegram-factory.mjs';
const token=process.env.TELEGRAM_FACTORY_BOT_TOKEN||'';
const secret=process.env.TELEGRAM_FACTORY_WEBHOOK_SECRET||'';
const base=process.env.PUBLIC_BASE_URL||'';
function check(){
 if(!/^\d{5,15}:[A-Za-z0-9_-]{25,}$/.test(token))throw Error('Set a fresh TELEGRAM_FACTORY_BOT_TOKEN in server secret storage');
 if(!/^[A-Za-z0-9_-]{16,256}$/.test(secret))throw Error('Set TELEGRAM_FACTORY_WEBHOOK_SECRET to a random 24+ character value');
 const u=new URL(base);
 if(u.protocol!=='https:'||!u.hostname||u.hostname.endsWith('.example')||u.hostname==='localhost')throw Error('PUBLIC_BASE_URL must be a real HTTPS domain');
 return u.origin;
}
async function main(){
 const site=check();
 if(!process.argv.includes('--apply')){console.log('Dry run: factory bot setup validated. Use --apply after HTTPS is deployed.');return}
 async function tg(method,body={}){
  const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok||!data.ok)throw Error('Bot API action '+method+' failed');return data.result;
 }
 const me=await tg('getMe');
 await tg('setMyCommands',{commands:FACTORY_COMMANDS});
 await tg('setChatMenuButton',{menu_button:{type:'web_app',text:'FEZI Studio',web_app:{url:site+'/plugins/telegram-builder'}}});
 await tg('setWebhook',{url:site+'/api/plugins/telegram/factory/webhook',secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false,max_connections:10});
 const info=await tg('getWebhookInfo');
 console.log(JSON.stringify({ok:true,username:me.username,commands:FACTORY_COMMANDS.map(x=>x.command),webhookConfigured:info.url===site+'/api/plugins/telegram/factory/webhook'},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
