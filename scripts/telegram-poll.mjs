#!/usr/bin/env node
import {announcementSubscription} from '../modules/announcement/subscriptions.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {TelegramApi,FeziBackend,TelegramSelectionStore,makeTelegramProcessor,parseTelegramConfig} from '../core/telegram-runtime.js';

if(process.env.TELEGRAM_MODE!=='polling'){console.error('Set TELEGRAM_MODE=polling to run the polling bot. Do not run it together with Webhook.');process.exit(1);}
const {token,ids,backend,webAppUrl}=parseTelegramConfig();
const api=new TelegramApi(token);
const self=await api.call('getMe');
const backendClient=new FeziBackend(backend,process.env.APP_PASSWORD);
await backendClient.request('/health');
const dir=path.resolve(process.env.DATA_DIR||'./data','telegram');
await fs.mkdir(dir,{recursive:true,mode:0o700});
const offsetPath=path.join(dir,'polling-offset.json');
let offset=0;try{const obj=JSON.parse(await fs.readFile(offsetPath,'utf8'));offset=Number.isSafeInteger(obj.offset)?obj.offset:0;}catch(e){if(e.code!=='ENOENT')throw e;}
const store=new TelegramSelectionStore(path.join(dir,'users'));
const processUpdate=makeTelegramProcessor({api,backend:backendClient,store,allowedIds:ids,webAppUrl});
// Long polling and webhook are mutually exclusive per Telegram Bot API.
await api.call('deleteWebhook',{drop_pending_updates:false});
await api.call('setMyCommands',{commands:[{command:'start',description:'Start FEZI AGENT'},{command:'new',description:'Create a project'},{command:'projects',description:'List projects'},{command:'use',description:'Choose a project'},{command:'build',description:'Build or edit project'},{command:'status',description:'Check a task'},{command:'cancel',description:'Cancel task'},{command:'ask',description:'Chat with FEZI AGENT'},{command:'export',description:'Download project ZIP'},{command:'id',description:'Show your Telegram ID'},{command:'help',description:'Show commands'}]});
console.log(`FEZI AGENT Telegram polling started (@${self.username||'bot'}). Allowed users: ${ids.size}.`);
let running=true;for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>{running=false;});
let errors=0;
while(running){
  try{
    const updates=await api.call('getUpdates',{offset,timeout:25,limit:20,allowed_updates:['message']},{timeout:35000});
    for(const item of updates){
      if(!Number.isSafeInteger(item.update_id))continue;
      if(item.update_id<offset)continue;
try{if(!await announcementSubscription(item,token,p=>api.call('sendMessage',p)))await processUpdate(item);}catch(e){console.error('Telegram update error:',String(e.message).slice(0,180));}
      offset=item.update_id+1;
      const tmp=offsetPath+'.tmp';await fs.writeFile(tmp,JSON.stringify({offset}),{mode:0o600});await fs.rename(tmp,offsetPath);
    }
    errors=0;
  }catch(e){
    errors++;
    console.error('Telegram polling issue:',String(e.message).replace(token,'[REDACTED]').slice(0,180));
    if(!running)break;
    await new Promise(r=>setTimeout(r,Math.min(2000*errors,30000)));
  }
}
console.log('FEZI AGENT Telegram polling stopped.');
