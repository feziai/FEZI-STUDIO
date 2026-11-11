import {AnnouncementStore,telegram,deliverOne} from './store.mjs';
const store=new AnnouncementStore(process.env.ANNOUNCEMENT_DB||'data/announcement.sqlite',process.env.ANNOUNCEMENT_MASTER_KEY);
const bot=process.env.ANNOUNCEMENT_BOT_ID,admins=new Set((process.env.ANNOUNCEMENT_ADMIN_IDS||'').split(',').filter(Boolean));
if(!bot||!admins.size)throw Error('Set ANNOUNCEMENT_BOT_ID and ANNOUNCEMENT_ADMIN_IDS before starting');
const token=store.token(bot),info=await telegram(token,'getWebhookInfo',{});if(info.url)throw Error('Central bot already has a webhook. Do not start a second consumer.');
store.db.prepare("UPDATE deliveries SET state='uncertain' WHERE state='sending'").run();
let stopped=false;process.on('SIGTERM',()=>{stopped=true});process.on('SIGINT',()=>{stopped=true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const sender=(async()=>{while(!stopped){await deliverOne(store);await delay(3100)}})();
while(!stopped){try{
 const updates=await telegram(token,'getUpdates',{offset:Number(store.get('offset')||0),timeout:25,allowed_updates:['message','channel_post']});
 for(const u of updates){const m=u.message||u.channel_post;try{if(m){const text=m.text||'',chat=String(m.chat.id),actor=String(m.from?.id||'');
 if(m.chat.type==='private'&&text==='/subscribe'){store.subscribe(bot,chat,'private','User explicitly requested /subscribe');await telegram(token,'sendMessage',{chat_id:chat,text:'عضویت در اطلاعیه‌ها فعال شد. لغو: /unsubscribe'});}
 else if(text==='/unsubscribe'){store.unsubscribe(bot,chat);await telegram(token,'sendMessage',{chat_id:chat,text:'دریافت اطلاعیه لغو شد.'});}
 else if(admins.has(actor)&&m.chat.type==='private'){
 let answer='مرکز خصوصی FEZI: /broadcast پیام، /confirm شناسه، /status، /task bot_id متن مأموریت، /tasks.\nپرامپت مأموریت به صف می‌رود؛ اجرای خودکار فقط پس از اتصال Agent مجاز. توکن را در چت نفرستید.';
 if(text.startsWith('/broadcast ')){const p=store.preview(text.slice(11));answer=`پیش‌نمایش برای ${p.recipients} مقصد یکتا:\n${p.text}\n\nارسال نهایی: /confirm ${p.id}`;}
 else if(text.startsWith('/confirm ')){store.confirm(text.slice(9).trim());answer='پیام به صف ارسال اضافه شد.';}
 else if(text.startsWith('/task ')){const match=/^\/task\s+(\S+)\s+([\s\S]{1,1500})$/.exec(text);if(!match)answer='راهنما: /task 123456 شرح کار';else{const task=store.queueTask(match[1],match[2]);answer=`مأموریت ${task.id} برای ${task.username} ثبت شد. وضعیت: queued (در انتظار عامل مجاز).`}}
 else if(text==='/tasks')answer=JSON.stringify(store.listBotTasks(8).map(({id,bot,state})=>({id,bot,state})),null,2).slice(0,4000);
 else if(text==='/status')answer=JSON.stringify(store.status(),null,2).slice(0,4000);
 await telegram(token,'sendMessage',{chat_id:chat,text:answer});
 }
 }}catch{console.error('Update could not be processed; no secrets logged',u.update_id)}store.set('offset',u.update_id+1)}
 }catch{console.error('Announcement connection unavailable');await delay(5000)}}await sender;store.close();
