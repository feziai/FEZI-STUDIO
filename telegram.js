import crypto from 'node:crypto';
import path from 'node:path';
import {TelegramApi,FeziBackend,TelegramSelectionStore,makeTelegramProcessor,parseTelegramConfig} from './core/telegram-runtime.js';
let runtime;
function prepare(){
  if(runtime)return runtime;
  const config=parseTelegramConfig();
  const backend=new FeziBackend(config.backend,process.env.APP_PASSWORD);
  const api=new TelegramApi(config.token);
  const store=new TelegramSelectionStore(path.resolve(process.env.DATA_DIR||'./data','telegram','users'));
  runtime=makeTelegramProcessor({api,backend,store,allowedIds:config.ids,webAppUrl:config.webAppUrl});
  return runtime;
}
export async function telegramWebhook(req,res,readBody){
  const secret=process.env.TELEGRAM_WEBHOOK_SECRET||'';
  const token=process.env.TELEGRAM_BOT_TOKEN||'';
  if(!token||secret.length<16||!process.env.TELEGRAM_ALLOWED_USER_IDS){res.writeHead(503);res.end();return;}
  const sent=String(req.headers['x-telegram-bot-api-secret-token']||'');
  const digest=x=>crypto.createHash('sha256').update(x).digest();
  if(!crypto.timingSafeEqual(digest(secret),digest(sent))){res.writeHead(401);res.end();return;}
  const update=await readBody(req);
  res.writeHead(200,{'content-type':'text/plain'});res.end('OK');
  // Acknowledge to Telegram promptly. The persistent server processes asynchronously.
  Promise.resolve().then(()=>prepare()(update)).catch(e=>console.error('Telegram webhook failed:',e.message));
}
