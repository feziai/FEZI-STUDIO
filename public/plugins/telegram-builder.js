(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const templates={
  support:{name:'FEZI Support Bot',description:'پشتیبانی و سؤالات پرتکرار',welcome:'سلام {{first_name}}! به پشتیبانی خوش آمدید. /help',fallback:'برای مشاهده راهنما /help را بفرست.',commands:[{command:'faq',description:'سؤالات متداول',reply:'سؤالت را برای پشتیبانی ارسال کن.'},{command:'hours',description:'ساعات کاری',reply:'از شنبه تا پنجشنبه پاسخ‌گوی شما هستیم.'}]},
  shop:{name:'My Shop Bot',description:'اطلاع‌رسانی فروشگاه',welcome:'سلام! برای خدمات فروشگاه /help را بزن.',fallback:'دستورهای فروشگاه را از /help ببین.',commands:[{command:'products',description:'محصولات',reply:'فهرست محصولات به‌زودی اضافه می‌شود.'},{command:'contact',description:'تماس با فروشگاه',reply:'لطفاً از سایت ما استفاده کنید.'}]},
  community:{name:'My Community Bot',description:'راهنمای انجمن',welcome:'سلام {{first_name}}! به انجمن خوش آمدی.',fallback:'برای قوانین و راهنما /help',commands:[{command:'rules',description:'قوانین گروه',reply:'احترام به دیگران و پرهیز از تبلیغات ناخواسته الزامی است.'}]},
  blank:{name:'My Telegram Plugin',description:'پلاگین سفارشی تلگرام',welcome:'سلام {{first_name}}! به ربات من خوش آمدید.',fallback:'از /help برای دیدن دستورات استفاده کنید.',commands:[]}
 };
 function addCommand(c={}){
  if($('command-rows').children.length>=20){status('حداکثر ۲۰ دستور قابل افزودن است',true);return;}
  const row=document.createElement('div');row.className='command-row';
  const line=document.createElement('div');line.className='command-line';
  const command=document.createElement('input');command.placeholder='نام: price';command.setAttribute('aria-label','نام فرمان');command.value=c.command||'';command.maxLength=32;command.pattern='[a-z][a-z0-9_]*';command.required=true;
  const desc=document.createElement('input');desc.placeholder='توضیح فرمان';desc.setAttribute('aria-label','توضیح فرمان');desc.value=c.description||'';desc.maxLength=180;
  const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='حذف';remove.onclick=()=>{row.remove();persist()};
  line.append(command,desc,remove);
  const reply=document.createElement('textarea');reply.rows=2;reply.placeholder='متن پاسخ به این فرمان';reply.setAttribute('aria-label','پاسخ فرمان');reply.value=c.reply||'';reply.maxLength=3000;reply.required=true;
  row.append(line,reply);$('command-rows').append(row);
  [command,desc,reply].forEach(x=>x.addEventListener('input',persist));
 }
 function data(){return {engine:$('engine').value,name:$('bot-name').value.trim(),description:$('description').value.trim(),welcome:$('welcome').value.trim(),fallback:$('fallback').value.trim(),website:$('website').value.trim(),visibility:$('visibility').value,commands:[...$('command-rows').children].map(row=>({command:row.querySelector('input').value.trim().replace(/^\//,''),description:row.querySelectorAll('input')[1].value.trim(),reply:row.querySelector('textarea').value.trim()}))}}
 function apply(d){$('engine').value=d.engine||'native';$('bot-name').value=d.name||'';$('description').value=d.description||'';$('welcome').value=d.welcome||'';$('fallback').value=d.fallback||'';$('website').value=d.website||'';$('visibility').value=d.visibility==='public'?'public':'private';$('command-rows').replaceChildren();(d.commands||[]).forEach(addCommand);persist()}
 function status(text,error=false,container='builder-status'){const el=$(container);el.textContent=text;el.classList.toggle('error',error)}
 function persist(){try{localStorage.setItem('fezi-telegram-plugin-draft-v2',JSON.stringify(data()))}catch{}}
 const chat=$('preview-chat');
 function bubble(message,mine=false){const div=document.createElement('div');div.className='chat-message'+(mine?' mine':' bot');div.textContent=message;chat.append(div);chat.scrollTop=chat.scrollHeight}
 function reply(spec,input){let cmd=input.trim().split(/\s+/)[0].split('@')[0].replace(/^\//,'').toLowerCase();let text=input.startsWith('/')?(cmd==='start'?spec.welcome:cmd==='help'?['دستورات '+spec.name,'/start — شروع','/help — راهنما',...spec.commands.map(c=>'/'+c.command+' — '+(c.description||c.command))].join('\n'):spec.commands.find(c=>c.command===cmd)?.reply||spec.fallback):spec.fallback;return (text||'از /help استفاده کنید').replaceAll('{{first_name}}','دوست من')}
 function runPreview(input){const spec=data();bubble(input,true);bubble(reply(spec,input))}
 $('chat-form').addEventListener('submit',e=>{e.preventDefault();const t=$('chat-text').value.trim();if(t){runPreview(t);$('chat-text').value=''}});
 $('preview').onclick=()=>runPreview('/start');$('add-command').onclick=()=>{addCommand();persist()};$('visibility').addEventListener('change',persist);$('engine').addEventListener('change',persist);
 $('templates').addEventListener('click',e=>{const t=e.target.closest('[data-template]');if(t)apply(templates[t.dataset.template])});
 document.querySelectorAll('#plugin-form input,#plugin-form textarea').forEach(x=>x.addEventListener('input',persist));
 async function request(url,body){const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const message=await r.json().catch(()=>({}));throw Error(message.error||'HTTP '+r.status)}return r}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
 $('plugin-form').addEventListener('submit',async e=>{e.preventDefault();status('در حال تولید ZIP...');try{const r=await request('/api/plugins/telegram/export',{spec:data()});download(await r.blob(),'FEZI-Telegram-Plugin.zip');status('سورس قابل اجرا ساخته شد. هنوز روی تلگرام منتشر نشده است؛ راهنمای نصب داخل ZIP است.')}catch(err){status(err.message,true)}});
 $('download-json').onclick=()=>{download(new Blob([JSON.stringify(data(),null,2)],{type:'application/json'}),'FEZI-Telegram-Plugin.json');status('JSON پلاگین ذخیره شد.')};
 $('import-json').onclick=()=>$('upload-json').click();$('upload-json').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f||f.size>50000)throw Error('فایل نامعتبر یا بیش از حد بزرگ است');const obj=JSON.parse(await f.text());if(!obj||!Array.isArray(obj.commands))throw Error('ساختار پلاگین نامعتبر است');apply(obj);status('پلاگین وارد شد.')}catch(err){status(err.message,true)}finally{e.target.value=''}});
 $('connect').addEventListener('click',async()=>{const token=$('secret-token').value.trim();if(!token){status('توکن BotFather لازم است.',true,'connection-status');return}status('در حال بررسی BotFather و تنظیم Webhook...',false,'connection-status');try{const r=await request('/api/plugins/telegram/connect',{spec:data(),token});const result=await r.json();$('secret-token').value='';status('ربات متصل شد: '+result.url,false,'connection-status');refreshBots()}catch(err){status(err.message,true,'connection-status')}});
 async function refreshBots(){try{const r=await fetch('/api/plugins/telegram/hosted',{credentials:'same-origin',cache:'no-store'});if(!r.ok){$('bots').textContent=r.status===401?'لیست ربات‌های سرور فقط برای مدیر واردشده قابل نمایش است.':'وضعیت ربات‌ها دریافت نشد.';return}const j=await r.json();const container=$('bots');container.replaceChildren();for(const bot of j.bots){const row=document.createElement('div');row.className='bot-entry';const a=document.createElement('a');a.href=bot.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='@'+bot.username+' — '+bot.name;const small=document.createElement('small');small.textContent=bot.commands+' دستور · '+(bot.visibility==='public'?'عمومی':'خصوصی');const edit=document.createElement('button');edit.textContent='اعمال تغییرات و منوی جدید';edit.onclick=async()=>{try{await request('/api/plugins/telegram/update',{id:bot.id,spec:data()});status('منوی ربات بروزرسانی شد.');refreshBots()}catch(e){status(e.message,true,'connection-status')}};const remove=document.createElement('button');remove.textContent='قطع اتصال';remove.onclick=async()=>{if(!confirm('Webhook این ربات قطع شود؟'))return;try{await request('/api/plugins/telegram/disconnect',{id:bot.id});refreshBots()}catch(e){status(e.message,true,'connection-status')}};row.append(a,small,edit,remove);container.append(row)}if(!j.bots.length)container.textContent='هنوز رباتی روی این سرور متصل نشده است.'}catch{$('bots').textContent='دریافت فهرست ممکن نشد.'}}
 $('refresh-bots').onclick=refreshBots;
 try{const draft=JSON.parse(localStorage.getItem('fezi-telegram-plugin-draft-v2')||'null');apply(draft?.name?draft:templates.support)}catch{apply(templates.support)}
 refreshBots();
})();
