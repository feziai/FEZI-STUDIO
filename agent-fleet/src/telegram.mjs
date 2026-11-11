import { agents,skills } from './catalog.mjs';
import { agentAnswer } from './brain.mjs';
import { cfg } from './config.mjs';

const API='https://api.telegram.org/bot';
export async function telegramRequest(token,method,payload={},fetchImpl=fetch){
  const resp=await fetchImpl(`${API}${token}/${method}`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(method==='getUpdates'? (cfg.pollTimeout+15)*1000:16000)
  });
  if(!resp.ok) throw new Error(`Telegram ${method} HTTP ${resp.status}`);
  const data=await resp.json();
  if(!data.ok)throw new Error(`Telegram ${method}: API rejected request`);
  return data.result;
}
const menu={inline_keyboard:[
  [{text:'🧠 مهارت‌ها',callback_data:'skills'},{text:'🤖 ربات‌ها',callback_data:'agents'}],
  [{text:'🏆 The Challenge',callback_data:'challenge'},{text:'ℹ️ راهنما',callback_data:'help'}]
]};
function summary(agentsCount){
 return `FEZI Studio — ${agentsCount} شخصیت تعریف‌شده\n`+
   `آنلاین‌بودن هر ربات تنها پس از اتصال و تأیید توکن واقعی است.\n`+
   `هدف رقابتی ۶٬۰۰۰٬۰۰۰ دلار صرفاً یک هدف است؛ درآمد و موجودی واقعی در این سامانه تأیید نشده‌اند.`;
}
export function commandReply(cmd,agent){
  if(cmd==='start'||cmd==='help')return `سلام! من ${agent.name} هستم، دستیار هوش مصنوعی Fezi Studio.\n`+
    `حوزه: ${agent.role}\n\n/skills مهارت‌ها\n/agents ایجنت‌ها\n/challenge هدف پروژه\n/status وضعیت\n/help راهنما\n\nمی‌توانی پیام فارسی بفرستی.`;
  if(cmd==='skills')return 'نمونه مهارت‌ها:\n'+skills.map(s=>'• '+s.title).join('\n').slice(0,3000);
  if(cmd==='agents')return 'ایجنت‌های ثبت‌شده:\n'+agents.map(a=>'• '+a.name).join('\n').slice(0,3500);
  if(cmd==='challenge')return summary(agents.length);
  if(cmd==='status')return `${agent.name}\nاتصال این ربات فعال است. مدل AI: ${cfg.apiKey?'کلید تنظیم‌شده':'غیرفعال (پاسخ راهنما)'}.\nخودکار هیچ پرداخت، انتشار یا ساخت حسابی انجام نمی‌شود.`;
  return null;
}
export function createFleet({fetchImpl=fetch, logger=console}={}){
  const statuses={};
  const loops=[];
  let running=false;
  const recent=new Map();
  function approved(update){
    const msg=update.message||update.callback_query?.message;
    const user=update.message?.from||update.callback_query?.from;
    if(!msg||!user||user.is_bot)return false;
    if(cfg.privateOnly && msg.chat?.type!=='private')return false;
    if(cfg.allowedUserIds.size && !cfg.allowedUserIds.has(String(user.id)))return false;
    const key=`${msg.chat?.id}:${user.id}`;
    const now=Date.now();const arr=(recent.get(key)||[]).filter(t=>now-t<60000);
    if(arr.length>=20)return false;
    arr.push(now);recent.set(key,arr);
    return true;
  }
  async function reply(token,chatId,text,withMenu=false){
    return telegramRequest(token,'sendMessage',{chat_id:chatId,text:String(text).slice(0,3900),
      ...(withMenu?{reply_markup:menu}:{})},fetchImpl);
  }
  async function onUpdate(agent,token,update){
    if(!approved(update))return;
    const callback=update.callback_query;
    const msg=update.message||callback?.message;
    if(!msg||!msg.chat)return;
    if(callback){
      await telegramRequest(token,'answerCallbackQuery',{callback_query_id:callback.id},fetchImpl);
      const response=commandReply(callback.data,agent);
      if(response)await reply(token,msg.chat.id,response,true);
      return;
    }
    const input=String(msg.text||'').trim();
    if(!input)return;
    const command=input.startsWith('/')?input.split(/\s/)[0].slice(1).split('@')[0].toLowerCase():null;
    const response=command?commandReply(command,agent):null;
    if(response){await reply(token,msg.chat.id,response,true);return;}
    if(command){await reply(token,msg.chat.id,'دستور شناخته نشد. /help را بزن.',true);return;}
    try{
      const result=await agentAnswer(input,agent,fetchImpl);
      await reply(token,msg.chat.id,result);
    }catch(err){
      logger.error(`[${agent.id}] AI error: ${String(err.message).slice(0,120)}`);
      await reply(token,msg.chat.id,'در پاسخ‌گویی مشکلی رخ داد. لطفاً دوباره امتحان کن.');
    }
  }
  async function run(agent,token){
    let offset=0,backoff=1500;
    while(running){
      try{
        const updates=await telegramRequest(token,'getUpdates',{
          offset,timeout:cfg.pollTimeout,limit:50,allowed_updates:['message','callback_query']
        },fetchImpl);
        backoff=1500;
        statuses[agent.id]={...statuses[agent.id],status:'online'};
        for(const u of updates){
          if(!running)break;
          offset=Math.max(offset,Number(u.update_id)+1);
          try{await onUpdate(agent,token,u);}catch(e){
            logger.error(`[${agent.id}] Update error: ${String(e.message).slice(0,120)}`);
          }
        }
      }catch(e){
        if(!running)break;
        statuses[agent.id]={...statuses[agent.id],status:'error',lastError:'Telegram polling failed'};
        logger.error(`[${agent.id}] Polling failed (check webhook/token/connection).`);
        await new Promise(resolve=>setTimeout(resolve,backoff));
        backoff=Math.min(30000,backoff*2);
      }
    }
  }
  async function start(){
    if(running)return;
    running=true;
    const seen=new Set();
    const configured=agents.map(a=>({...a,token:process.env[a.requiresToken]||''}))
      .filter(a=>a.token).slice(0,cfg.maxActiveBots);
    for(const a of agents)statuses[a.id]={status:'awaiting_token'};
    for(const a of configured){
      if(seen.has(a.token)){statuses[a.id]={status:'duplicate_token'};continue;}
      seen.add(a.token);
      try{
        const me=await telegramRequest(a.token,'getMe',{},fetchImpl);
        if(!me?.is_bot)throw new Error('Invalid bot identity');
        if(cfg.clearWebhooks)await telegramRequest(a.token,'deleteWebhook',{drop_pending_updates:false},fetchImpl);
        statuses[a.id]={status:'online',username:me.username||null};
        if(cfg.polling)loops.push(run(a,a.token));
        logger.info(`[${a.id}] connected as @${me.username||'unknown'}`);
      }catch(e){
        statuses[a.id]={status:'error',lastError:'Connection failed'};
        logger.error(`[${a.id}] invalid token or Telegram unavailable.`);
      }
    }
    if(!configured.length)logger.info('No Telegram bot tokens configured; dashboard is in setup mode.');
  }
  async function stop(){running=false;await Promise.race([Promise.allSettled(loops),new Promise(r=>setTimeout(r,3000))]);}
  return {start,stop,statuses,handleUpdate:onUpdate};
}
