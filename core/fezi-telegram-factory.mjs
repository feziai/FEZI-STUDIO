import crypto from 'node:crypto';

export const FACTORY_COMMANDS=[
 {command:'start',description:'شروع و منوی فضی استودیو'},
 {command:'newbot',description:'ساخت ربات جدید با BotFather'},
 {command:'mybots',description:'لیست ربات‌های متصل (فقط مدیر)'},
 {command:'status',description:'وضعیت هاست و سرویس‌های FEZI'},
 {command:'projects',description:'لیست پروژه‌های FEZI Agent'},
 {command:'jobs',description:'وضعیت تسک‌های یک پروژه'},
 {command:'run',description:'درخواست ویرایش پروژه با تأیید دومرحله‌ای'},
 {command:'confirm',description:'تأیید کد اجرای پروژه'},
 {command:'checkpoint',description:'تهیه نسخه پشتیبان پروژه'},
 {command:'plugins',description:'فهرست پلاگین‌های فضی استودیو'},
 {command:'createplugin',description:'ساخت پلاگین ChatGPT'},
 {command:'skills',description:'بانک مشترک اسکیل‌ها'},
 {command:'agent',description:'سایت‌ساز FEZI Agent'},
 {command:'models',description:'فهرست مدل‌های رایگان و پریمیوم'},
 {command:'pricing',description:'بسته‌ها و شارژ حساب'},
 {command:'fezipay',description:'FeziPay و وضعیت پرداخت'},
 {command:'help',description:'راهنما و قوانین امنیتی'}
];
const safeEq=(a,b)=>{
 const aa=crypto.createHash('sha256').update(String(a||'')).digest();
 const bb=crypto.createHash('sha256').update(String(b||'')).digest();
 return crypto.timingSafeEqual(aa,bb);
};
const ID=/^\d{3,20}$/;
function url(s){try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1'].includes(u.hostname)&&!u.hostname.endsWith('.example'))return u.origin}catch{}return ''}
export function createTelegramFactory({baseUrl='',token='',secret='',allowedIds='',listBots=()=>[],plugins=[],skillStats={},api=async()=>{},remote=async()=>{throw Error('Remote action unavailable')},enabled=true}={}){
 const site=url(baseUrl),admins=new Set(String(allowedIds).split(',').map(x=>x.trim()).filter(x=>ID.test(x)));
 const valid=(!!token&&!!secret&&site&&enabled);
 const pending=new Map(),maxPending=40;
 function menu(){return {inline_keyboard:[
  [{text:'🤖 ساخت ربات / Telegram Builder',url:site+'/plugins/telegram-builder'}],
  [{text:'🧩 همه پلاگین‌ها',url:site+'/plugins'},{text:'🛠️ ساخت پلاگین',url:site+'/plugins/chatgpt-builder'}],
  [{text:'🧠 FEZI Agent',url:site+'/builder'},{text:'📚 Skill Creator',url:site+'/fezi-agent/skill-creator'}],
  [{text:'🤖 مدیریت ربات‌ها',url:site+'/plugins/telegram-manager'},{text:'🧠 انتخاب مدل AI',url:site+'/ai-chat'}],
  [{text:'★ بسته‌های پریمیوم',url:site+'/pricing'},{text:'◈ FeziPay',url:site+'/fezipay/'}],
  [{text:'🌐 همه ابزارها',url:site+'/ecosystem'}]
 ]};}
 async function onUpdate(header,update){
  if(!valid)throw Object.assign(new Error('Factory bot not configured'),{status:503});
  if(!safeEq(header,secret))throw Object.assign(new Error('Unauthorized telegram webhook'),{status:403});
  if(!update||!Number.isSafeInteger(update.update_id))throw Object.assign(new Error('Invalid Telegram update'),{status:400});
  const msg=update.message||update.callback_query?.message;
  const from=update.message?.from||update.callback_query?.from;
  if(!msg?.chat?.id||msg.chat.type!=='private'||!from?.id)return {ok:true,skipped:true};
  const fullText=String(update.message?.text||'/start').trim();
  const command=fullText.split(/\s+/)[0].split('@')[0].toLowerCase();
  const owner=admins.has(String(from.id));
  let body='🤖 فضی استودیو · مرکز ساخت و مدیریت ربات‌های تلگرام\n\n';
  if(['/status','/projects','/jobs','/run','/confirm','/checkpoint'].includes(command)){
    if(!owner){body+='این فرمان فقط برای مدیر تأییدشده در تنظیمات سرور فعال است.\n';}
    else try {
      if(command==='/status'){
        const result=await remote('status',{});body+='وضعیت کنترل از راه دور:\n'+JSON.stringify(result.services,null,2)+'\n';
      }else if(command==='/projects'){
        const result=await remote('projects',{});
        body+='پروژه‌های موجود:\n'+(result.projects.slice(0,15).map(p=>'• '+p.id+' — '+p.name).join('\n')||'هنوز پروژه‌ای ثبت نشده')+'\n';
      }else if(command==='/jobs'){
        const id=fullText.split(/\s+/)[1]||'';
        const result=await remote('jobs',{projectId:id});
        body+='کارهای پروژه:\n'+(result.jobs.map(x=>'• '+x.id+' — '+x.status).join('\n')||'هیچ کاری ثبت نشده')+'\n';
      }else if(command==='/run'){
        const match=/^\/run\s+([a-f0-9]{16})\s+([\s\S]{4,1800})$/i.exec(fullText);
        if(!match)body+='روش استفاده: /run PROJECT_ID شرح تغییرات\n';
        else{
          const code=crypto.randomBytes(4).toString('hex').toUpperCase();
          if(pending.size>=maxPending)pending.clear();
          pending.set(String(from.id),{code,projectId:match[1],goal:match[2],expiry:Date.now()+300000});
          body+='درخواست ویرایش ثبت شد (هنوز اجرا نشده).\nپروژه: '+match[1]+'\nدرخواست: '+match[2].slice(0,340)+'\nبرای تأیید در ۵ دقیقه: /confirm '+code+'\n';
        }
      }else if(command==='/confirm'){
        const code=fullText.split(/\s+/)[1]||'';const item=pending.get(String(from.id));
        pending.delete(String(from.id));
        if(!item||Date.now()>item.expiry||!safeEq(code,item.code))body+='کد نامعتبر یا منقضی است. دوباره /run را اجرا کن.\n';
        else{const result=await remote('start-agent',{projectId:item.projectId,goal:item.goal,confirm:true});body+='تسک برای اجرای تأییدشده ثبت شد: '+result.task.id+'\nوضعیت: '+result.task.status+'\n';}
      }else if(command==='/checkpoint'){
        const id=fullText.split(/\s+/)[1]||'';
        const result=await remote('checkpoint',{projectId:id,confirm:true});
        body+='نسخه پشتیبان ایجاد شد: '+result.checkpoint.id+'\n';
      }
    }catch(e){body+='انجام نشد: '+String(e.message||e).slice(0,240)+'\n';}
    body+='\nFEZI Studio · '+site;
    await api('sendMessage',{chat_id:msg.chat.id,text:body.slice(0,3990),reply_markup:menu()});
    if(update.callback_query?.id)await api('answerCallbackQuery',{callback_query_id:update.callback_query.id}).catch(()=>{});
    return {ok:true,sent:true};
  }
  if(command==='/newbot'||command==='/create')body+='۱. از @BotFather یک ربات با /newbot بساز.\n۲. در سایت تنظیمات، منو و دستورهایش را ایجاد کن.\n۳. توکن را *فقط در فرم HTTPS سایت* وارد کن؛ هرگز در گفتگوی تلگرام نفرست.\n\n';
  else if(command==='/mybots'){
   if(!owner)body+='برای مشاهده ربات‌های متصل باید مدیر تأییدشده باشی.\n\n';
   else {const bots=listBots().slice(0,25);body+=bots.length?bots.map(b=>'• @'+String(b.username||'').slice(0,32)+' — '+String(b.name||'').slice(0,80)).join('\n')+'\n\n':'هنوز رباتی متصل نشده است.\n\n';}
  }else if(command==='/models')body+='فهرست مدل‌های رایگانِ کشف‌شده را در سایت ببین. موجودبودن در فهرست به معنای فعال‌بودن سرویس نیست.\n\n';
  else if(command==='/plugins'){
   if(owner){
    body+='فهرست پلاگین‌های خصوصی ChatGPT در حساب مالک (نمایهٔ ذخیره‌شده؛ وضعیت زنده نیست):\n';
    body+=plugins.slice(0,40).map((p,i)=>`${i+1}. ${String(p.nameEn||p.name||'Plugin').slice(0,65)} — ${String(p.version||'?').slice(0,20)}`).join('\n')+'\n';
   }else body+='فهرست عمومی ابزارهای سایت در دکمه «همه پلاگین‌ها» قرار دارد. دسترسی پلاگین‌های خصوصی ChatGPT نیازمند مجوز همان حساب است.\n';
   body+='\nبرای ساخت پلاگین: /createplugin\n\n';
  }
  else if(command==='/createplugin')body+='از دکمه «ساخت پلاگین» در وب‌سایت استفاده کن. فایل قابل واردکردن به Plugin Creator رسمی ایجاد می‌شود؛ ثبت و نصب داخل ChatGPT خودکار نیست.\n\n';
  else if(command==='/skills')body+=`بانک مرجع مشترک FEZI\n• نام مهارت‌های بازیابی‌شده: ${Number(skillStats.uniqueSkillNames||0).toLocaleString('en-US')}\n• دارای متن کامل: ${Number(skillStats.fullTextSkills||0).toLocaleString('en-US')}\n• تعداد هدف با تعداد نصب‌شده فرق دارد.\n\n`;
  else if(command==='/agent')body+='FEZI Agent برای ساخت، ادیت، ادغام و تست وب‌سایت و برنامه است. دکمه FEZI Agent را لمس کن. استقرار فقط با مجوز دسترسی سرور انجام می‌شود.\n\n';
  else body+='منوی ساخت ربات، فهرست ربات‌های مدیر، پلاگین‌ها و مدل‌های رایگان در دسترس است.\nدستورها: /newbot /mybots /plugins /createplugin /skills /agent /models /pricing /fezipay /help\n\n';
  body+='FEZI Studio · '+site;
  await api('sendMessage',{chat_id:msg.chat.id,text:body.slice(0,3990),reply_markup:menu()});
  if(update.callback_query?.id)await api('answerCallbackQuery',{callback_query_id:update.callback_query.id}).catch(()=>{});
  return {ok:true,sent:true};
 }
 return {onUpdate,enabled:!!valid,commands:FACTORY_COMMANDS,site};
}
