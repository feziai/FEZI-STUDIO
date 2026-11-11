/** Only bot processes use this internal bridge. Secrets are not shipped in frontend or Telegram messages. */
export async function callFeziBridge(route,body,{secret=process.env.TELEGRAM_INTERNAL_TOKEN,fetchImpl=fetch,port=process.env.PORT||3000}={}){
 if(typeof secret!=='string'||secret.length<32)throw Error('Internal bot authentication is not configured');
 if(!['/api/telegram/internal/confirm','/api/telegram/internal/summary','/api/telegram/internal/arina-chat'].includes(route))throw Error('Internal bridge route not allowlisted');
 const r=await fetchImpl('http://127.0.0.1:'+Number(port)+route,{method:'POST',headers:{'content-type':'application/json','x-fezi-bot-secret':secret},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const x=await r.json();if(!r.ok)throw Error(String(x.error||'FEZI account service rejected request').slice(0,150));return x;
}
