// One-time helper; never commit TELEGRAM_BOT_TOKEN to Git.
const token=process.env.TELEGRAM_BOT_TOKEN;
const webapp=process.env.TELEGRAM_WEBAPP_URL;
const publicServer=process.env.TELEGRAM_PUBLIC_SERVER;
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
if(!token||!secret||!/^https:\/\//.test(webapp||'')||!/^https:\/\//.test(publicServer||'')){
  console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBAPP_URL, TELEGRAM_PUBLIC_SERVER, TELEGRAM_WEBHOOK_SECRET');process.exit(1);
}
async function call(method,body){const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!data.ok)throw Error(method+': '+data.description);return data;}
await call('setWebhook',{url:publicServer.replace(/\/$/,'')+'/api/telegram/webhook',secret_token:secret,allowed_updates:['message']});
await call('setChatMenuButton',{menu_button:{type:'web_app',text:'FEZI AGENT',web_app:{url:webapp}}});
console.log('Telegram webhook and Mini App menu configured. Restrict TELEGRAM_ALLOWED_USER_IDS on the server.');
