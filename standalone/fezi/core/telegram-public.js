import {callFeziBridge} from './telegram-bot-bridge-client.js';
/** Public FEZI Telegram mode: opt-in daily motivation, bilingual chat and web links.
 * This is separate from the existing owner-only Telegram agent.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const FA=[
'پروژه بزرگ با یک قدم کوچک شروع می‌شود. امروز فقط یک بخش را بساز؛ فردا از امروزت جلوتر خواهی بود. 💪',
'منتظر انگیزه نباش. کار را شروع کن تا انگیزه خودش دنبالت بیاید. امروز یک نتیجه ثبت کن. 🔥',
'ایده‌ها وقتی ارزشمند می‌شوند که اجرا شوند. امروز یک فایل، یک طراحی یا یک ویژگی بساز. 🚀',
'اگر امروز فقط ۳۰ دقیقه تلاش کنی، از کسی که تمام روز منتظر فرصت مانده جلوتر هستی. ✨',
'هیچ کدی از اولین تلاش بی‌نقص نیست. بساز، تست کن، بهترش کن. همین چرخه تو را جلو می‌برد. 🧠',
'انرژی امروز را روی یک کار مهم بگذار، نه ده کار نصفه. یک پیروزی واقعی کافی است. ⭐',
'یک قدم کوچک امروز از صد برنامه بزرگ فردا بهتر است. پروژه‌ات را باز کن. ⚡',
'هر خط کد می‌تواند شروع یک محصول واقعی باشد. امروز چیزی منتشر کن، حتی نسخه اولیه را. 💻',
'ساختن مهارت است، انتظار کشیدن نه. یک مسئله انتخاب کن و حلش کن. 🛠️',
'شکستِ یک تست، راهنمای تست بعدی است. به جای کنار گذاشتن پروژه، دلیلش را پیدا کن. 🎯'];
const EN=[
'Your next big project starts with one small step. Ship one meaningful improvement today. 💪',
'Don’t wait for motivation. Start building, and motivation will follow your progress. 🔥',
'Ideas become valuable when you execute. Create one feature, design, or file today. 🚀',
'Thirty focused minutes beat a whole day waiting for the perfect opportunity. ✨',
'Your first implementation does not need to be perfect. Build, test, and improve. 🧠',
'Choose one high-impact task instead of ten half-finished ones. Finish it today. ⭐',
'A small action today is worth more than a giant plan for tomorrow. Open your project. ⚡',
'Every line of code can become a real product. Publish a first version. 💻',
'Building is a skill. Waiting is not. Pick one problem and solve it today. 🛠️',
'A failed test is feedback. Learn from it, fix the issue, and keep going. 🎯'];
export function motivationalMessage(locale='en',date='2026-11-02'){
 const messages=locale==='fa'?FA:EN,day=Math.floor(Date.parse(date.slice(0,10)+'T00:00:00Z')/86400000);
 return messages[((day%messages.length)+messages.length)%messages.length]+'\n\nFEZI Studio: '+(locale==='fa'?'برگرد و بساز!':'Come back and build!');
}
export function languageFromTelegram(user){return String(user?.language_code||'').toLowerCase().startsWith('fa')?'fa':'en'}
export function createPublicBot({api,storeFile,webAppUrl,botSecret,studioAppUrl='',arinaBotUsername='',loginBotUsername='',imageWorker=null,maxDailyImages=3,fetchImpl=fetch}){
 let state={users:{}};let queue=Promise.resolve();
 async function init(){await fs.mkdir(path.dirname(storeFile),{recursive:true,mode:0o700});try{state=JSON.parse(await fs.readFile(storeFile,'utf8'));if(!state.users)state={users:{}}}catch(e){if(e.code!=='ENOENT')throw e;}}
 async function save(){const p=storeFile+'.tmp';await fs.writeFile(p,JSON.stringify(state),{mode:0o600});await fs.rename(p,storeFile)}
 function mutate(fn){const work=queue.then(async()=>{const value=fn();await save();return value});queue=work.catch(()=>{});return work}
 const link=path=>webAppUrl?webAppUrl.replace(/\/$/,'')+path:'The FEZI website URL has not been configured.';
 const text=(locale,en,fa)=>locale==='fa'?fa:en;
 async function processUpdate(update){const msg=update?.message,uid=String(msg?.from?.id||''),chat=msg?.chat?.id;
  const privateChat=msg?.chat?.type==='private',groupChat=['group','supergroup'].includes(msg?.chat?.type);
  if(!/^\d{1,20}$/.test(uid)||!Number.isSafeInteger(chat)||(!privateChat&&!groupChat)||msg.from.is_bot)return {ignored:true};
  const input=String(msg.text||'').trim().slice(0,4200);if(!input)return {ignored:true};
  // In groups, only explicit commands are processed. The bot never reads arbitrary members' messages.
  if(groupChat&&!/^\/(?:help|start|chat|ask|studio|arina)(?:@\w+)?(?:\s|$)/i.test(input))return {ignored:true};
  let user=state.users[uid];if(!user){user={id:uid,chat,locale:languageFromTelegram(msg.from),subscribed:false,lastSent:'',lastChat:0};await mutate(()=>{state.users[uid]=user})}const cmd=input.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/s);const action=cmd?.[1]?.toLowerCase()||'chat';const arg=(cmd?cmd[2]||'':input).trim();const lang=user.locale;
  let output='';if(groupChat&&['start','help'].includes(action))output=text(lang,'FEZI Studio group helper: /chat your question (linked accounts only), /studio, /arina. No private account information is shown in groups.','راهنمای گروه FEZI: /chat سؤال (فقط حساب متصل)، /studio و /arina. اطلاعات خصوصی در گروه نمایش داده نمی‌شود.');
  else if(['start','help'].includes(action))output=text(lang,`Welcome to FEZI Studio! 💙\n/chat your question — chat with FEZI AI\n/link CODE — link your FEZI account\n/account — view linked account & verified credit\n/motivate on — opt in to one daily message\n/motivate off — unsubscribe\n/lang fa or /lang en — language\n/image PROMPT — up to three verified images per day when a worker is connected\n/quota — remaining image quota\n/studio — open FEZI Studio\n/arina — Arina Live Bot\n/share — share approved work\n/login — secure Telegram sign-in\n/video — generate video on the website\n/app — build projects on the website\n/telegram — build a custom Telegram bot\nWebsite: ${link('')}\nOpen FEZI Studio in the blue button below.\nArina Bot: ${arinaBotUsername?'https://t.me/'+arinaBotUsername:'Not configured yet'}`,`به FEZI Studio خوش آمدی 💗\n/chat سؤال — گفتگو با هوش مصنوعی\n/link CODE — اتصال حساب FEZI\n/account — وضعیت حساب و اعتبار تأییدشده\n/motivate on — دریافت پیام انگیزشی روزانه\n/motivate off — توقف پیام‌ها\n/lang fa یا /lang en — انتخاب زبان\n/image توضیح — سه عکس روزانه پس از اتصال موتور\n/quota — سهمیه باقی‌مانده\n/studio — ورود به استودیو\n/arina — ربات لایو آرینا\n/share — اشتراک‌گذاری آثار تأییدشده\n/login — ورود امن با تلگرام\n/video — ساخت ویدیو در سایت\n/app — ساخت برنامه در سایت\n/telegram — ساخت ربات تلگرام\nوب‌سایت: ${link('')}\nاستودیو را با دکمه پایین باز کن.\nربات آرینا: ${arinaBotUsername?'https://t.me/'+arinaBotUsername:'هنوز تنظیم نشده'}`);
  else if(action==='link'){
   try{if(!/^[A-Za-z0-9_-]{20,100}$/.test(arg))throw Error('Open your FEZI profile and generate a one-time link code first.');await callFeziBridge('/api/telegram/internal/confirm',{kind:'link',code:arg,telegramId:uid},{secret:botSecret,fetchImpl});output=text(lang,'✅ Telegram is linked to your FEZI account. /account to view status.','✅ تلگرام به حساب FEZI متصل شد. برای مشاهده وضعیت /account را بزن.')}catch(e){output=text(lang,'Link failed: '+e.message,'اتصال انجام نشد: '+e.message)}
  }
  else if((action==='account'||action==='wallet')&&groupChat){output=text(lang,'For account details, use the bot in a private chat.','برای اطلاعات حساب، در چت خصوصی ربات پیام بده.')}
  else if(action==='account'||action==='wallet'){
   try{const s=await callFeziBridge('/api/telegram/internal/summary',{telegramId:uid},{secret:botSecret,fetchImpl});output=s.linked?text(lang,`👤 ${s.name} (@${s.username})\nArina verified credit: $${(s.arina.balanceCents/100).toFixed(2)}\nAPI credits: not connected.\nManage account: ${link('/profile')}`,`👤 ${s.name} (@${s.username})\nاعتبار تأییدشده آرینا: ${s.arina.balanceCents/100} دلار\nاعتبار API: هنوز متصل نیست.\nپروفایل: ${link('/profile')}`):text(lang,'Link a registered FEZI account first: '+link('/telegram-connect'),'ابتدا حساب ثبت‌نام‌شده FEZI را متصل کن: '+link('/telegram-connect'))}catch(e){output=text(lang,'Account service unavailable.','سرویس حساب در دسترس نیست.')}
  }
  else if(action==='lang'){if(!['fa','en'].includes(arg))output='Usage: /lang fa | /lang en';else {await mutate(()=>{user.locale=arg});output=arg==='fa'?'زبان فارسی انتخاب شد.':'English selected.'}}
  else if(action==='motivate'&&groupChat)output=text(lang,'Daily motivation is a private opt-in feature.','پیام انگیزشی روزانه فقط در چت خصوصی و با رضایت کاربر فعال می‌شود.');
  else if(action==='motivate'){if(!['on','off'].includes(arg))output=text(lang,'Use /motivate on or /motivate off','از /motivate on یا /motivate off استفاده کن.');else{await mutate(()=>{user.subscribed=arg==='on'});output=text(lang,arg==='on'?'Daily motivation enabled (09:00 UTC).':'Daily motivation disabled.',arg==='on'?'پیام روزانه فعال شد (۹ صبح به وقت UTC).':'پیام روزانه غیرفعال شد.')}}
  else if(action==='studio')output=text(lang,'Open FEZI Studio: '+link('/studio'),'ورود به استودیو: '+link('/studio'));
  else if(action==='arina')output=arinaBotUsername?'💗 https://t.me/'+arinaBotUsername:text(lang,'Arina bot is not yet configured.','ربات آرینا هنوز تنظیم نشده است.');
  else if(action==='login')output=loginBotUsername?'🔐 https://t.me/'+loginBotUsername:text(lang,'The secure-login bot is not yet configured.','ربات ورود امن هنوز تنظیم نشده است.');
  else if(action==='share')output=text(lang,'Share only your approved public FEZI posts: '+link('/community'),'فقط آثار عمومی تأییدشده را از صفحه انجمن به اشتراک بگذار: '+link('/community'));
  else if(action==='quota'){const today=new Date().toISOString().slice(0,10),used=user.images?.date===today?user.images.count:0;output=text(lang,`Images remaining today: ${Math.max(0,maxDailyImages-used)}/${maxDailyImages}. Generation requires a configured image worker and a linked FEZI account.`,`سهمیه عکس امروز: ${Math.max(0,maxDailyImages-used)} از ${maxDailyImages}؛ نیازمند حساب متصل و موتور تولید تصویر.`)}
  else if(action==='image'&&arg){
   if(groupChat)output=text(lang,'Image generation is available in private bot chat only.','ساخت عکس فقط در چت خصوصی ربات ممکن است.');
   else if(arg.length<3||arg.length>1000)output=text(lang,'Image prompt must contain 3–1000 characters.','متن درخواست تصویر باید ۳ تا ۱۰۰۰ کاراکتر باشد.');
   else if(botSecret.length<32)output=text(lang,'FEZI account connection is not configured.','اتصال حساب FEZI تنظیم نشده است.');
   else {
    let account;
    try{account=await callFeziBridge('/api/telegram/internal/summary',{telegramId:uid},{secret:botSecret,fetchImpl})}catch{}
    if(!account?.linked)output=text(lang,'Register and link your FEZI account: '+link('/telegram-connect'),'ابتدا در سایت ثبت‌نام کن و تلگرام را متصل کن: '+link('/telegram-connect'));
    else if(!imageWorker)output=text(lang,'Image worker is not connected. You can use the website when image generation is available: '+link('/studio?category=image'),'موتور ساخت عکس هنوز متصل نیست. صفحه عکس سایت: '+link('/studio?category=image'));
    else {
     const today=new Date().toISOString().slice(0,10);
     const result=await mutate(()=>{let current=user.images?.date===today?user.images:{date:today,count:0};if(current.count>=maxDailyImages)return false;user.images={date:today,count:current.count+1};return true});
     if(!result)output=text(lang,'You have reached your three-image daily quota.','سهمیه سه تصویر روزانه تمام شده است.');
     else {
      try{const image=await imageWorker.generate(arg,{telegramId:uid,userId:account.userId});
       if(!/^https:\/\/[^\s]+$/.test(image.imageUrl||'')&&!/^[A-Za-z0-9_-]{20,500}$/.test(image.fileId||''))throw Error('Image worker returned no valid image');
       await api.call('sendPhoto',{chat_id:chat,photo:image.imageUrl||image.fileId,caption:text(lang,'Generated with FEZI Studio','ساخته‌شده با FEZI Studio')});
       output=text(lang,'Image sent. Use /quota to check your remaining quota.','عکس ارسال شد. برای سهمیه باقی‌مانده /quota را بزن.');
      }catch{await mutate(()=>{if(user.images?.date===today)user.images.count=Math.max(0,user.images.count-1)});output=text(lang,'Image generation is unavailable; quota was not deducted.','ساخت تصویر انجام نشد؛ سهمیه کسر نشد.');}
     }
    }
   }
  }
  else if(['image','video','app','telegram','website'].includes(action)){const routes={image:'/studio?category=image',video:'/studio?category=video',app:'/studio?category=coding',telegram:'/studio?category=coding',website:'/studio?category=coding'};output=text(lang,`Open the FEZI website to create your ${action}:\n${link(routes[action])}`,`برای ساخت ${action} به وب‌سایت FEZI برو:\n${link(routes[action])}`)}
  else if(action==='chat'||action==='ask'){
   if(arg.length<2||arg.length>4000)output=text(lang,'Send a question (2–4000 characters).','یک سؤال با طول ۲ تا ۴۰۰۰ کاراکتر بفرست.');
   else if(Date.now()-user.lastChat<12000)output=text(lang,'Please wait 12 seconds between requests.','لطفاً بین پیام‌ها ۱۲ ثانیه فاصله بگذار.');
   else if(botSecret.length<32)output=text(lang,'The AI runtime has not been configured.','موتور هوش مصنوعی هنوز تنظیم نشده است.');
   else{
    let linked=false;try{const check=await callFeziBridge('/api/telegram/internal/summary',{telegramId:uid},{secret:botSecret,fetchImpl});linked=check.linked===true}catch{}
    if(!linked)output=text(lang,'Register at FEZI Studio and link your Telegram first: '+link('/telegram-connect'),'ابتدا ثبت‌نام کن و تلگرام را به حساب FEZI وصل کن: '+link('/telegram-connect'));
    else {await mutate(()=>{user.lastChat=Date.now()});try{const r=await fetchImpl('http://127.0.0.1:'+Number(process.env.PORT||3000)+'/api/studio/bot-chat',{method:'POST',headers:{'content-type':'application/json','x-fezi-bot-secret':botSecret},body:JSON.stringify({prompt:arg}),signal:AbortSignal.timeout(80000)});const data=await r.json();output=r.ok?String(data.answer||'').slice(0,3800):text(lang,'Model unavailable; please try later.','مدل در دسترس نیست؛ بعداً دوباره امتحان کن.')}catch{output=text(lang,'Model connection unavailable.','اتصال مدل برقرار نیست.')}}
  }}else output=text(lang,'Unknown command. /help','دستور نامشخص است. /help');
  await api.sendText(chat,output,privateChat?(studioAppUrl||((/^https:\/\//.test(webAppUrl||''))?webAppUrl.replace(/\/$/,'')+'/studio':'')):'');return {ok:true,kind:action};
 }
 async function sendDaily(now=new Date()){
  const day=now.toISOString().slice(0,10);let sent=0,failed=0;
  for(const u of Object.values(state.users)){
   if(!u.subscribed||u.lastSent===day)continue;
   try{await api.sendText(u.chat,motivationalMessage(u.locale,day),webAppUrl);await mutate(()=>{u.lastSent=day});sent++}catch{failed++}
  }return {sent,failed,day};
 }
 return {init,processUpdate,sendDaily,subscribers:()=>Object.values(state.users).filter(x=>x.subscribed).length};
}
