/** FEZI AGENT Telegram adapter. Local-only backend connection; never place APP_PASSWORD in Telegram. */
import fs from 'node:fs/promises';
import path from 'node:path';

const USER_ID = /^\d{1,20}$/;
const PROJECT_ID = /^[0-9a-f]{16}$/;
const TASK_ID = /^[0-9a-f]{20}$/;
const MAX_MESSAGE=4000;

function httpError(message,status=502){return Object.assign(new Error(message),{status});}
export function parseTelegramConfig(env=process.env){
  const token=String(env.TELEGRAM_BOT_TOKEN||'').trim();
  const ids=String(env.TELEGRAM_ALLOWED_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw httpError('TELEGRAM_BOT_TOKEN is not configured or malformed',412);
  if(!ids.length||ids.some(x=>!USER_ID.test(x)))throw httpError('Set TELEGRAM_ALLOWED_USER_IDS to trusted numeric Telegram user IDs',412);
  const backend=env.TELEGRAM_BACKEND_URL||`http://127.0.0.1:${env.PORT||3000}`;
  const url=new URL(backend);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash)
    throw httpError('Telegram backend must be a local HTTP service; do not expose APP_PASSWORD remotely',412);
  return {token,ids:new Set(ids),backend:url.origin,webAppUrl:/^https:\/\/[^\s]+$/.test(env.TELEGRAM_WEBAPP_URL||'')?env.TELEGRAM_WEBAPP_URL:''};
}
export class TelegramApi {
  constructor(token,{fetchImpl=fetch}={}){this.url=`https://api.telegram.org/bot${token}/`;this.fetchImpl=fetchImpl;}
  async call(method,data={},opts={}){
    const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),opts.timeout||20000);
    try{
      const url=this.url+method;
      const r=await this.fetchImpl(url,{method:'POST',headers:opts.multipart?{}:{'content-type':'application/json'},body:opts.multipart?data:JSON.stringify(data),signal:ctl.signal});
      const txt=await r.text();let parsed;try{parsed=JSON.parse(txt);}catch{throw httpError('Telegram returned invalid JSON');}
      if(!r.ok||!parsed.ok)throw httpError('Telegram rejected '+method+': '+String(parsed.description||r.status).slice(0,160));
      return parsed.result;
    }finally{clearTimeout(timeout);}
  }
  async sendText(chatId,text,webAppUrl=''){
    const str=String(text||'');
    // Avoid Telegram's 4096-character cap; split safely by Unicode code points.
    const chars=Array.from(str); let last;
    for(let i=0;i<chars.length;i+=MAX_MESSAGE){
      const data={chat_id:chatId,text:chars.slice(i,i+MAX_MESSAGE).join(''),disable_web_page_preview:true};
      if(i===0 && webAppUrl)data.reply_markup={inline_keyboard:[[{text:'FEZI AGENT',web_app:{url:webAppUrl}}]]};
      last=await this.call('sendMessage',data);
    }
    return last;
  }
  async sendZip(chatId,bytes,name){
    const form=new FormData();form.append('chat_id',String(chatId));form.append('document',new Blob([bytes],{type:'application/zip'}),name);
    return this.call('sendDocument',form,{multipart:true,timeout:60000});
  }
}
export class FeziBackend {
  constructor(url,password,{fetchImpl=fetch}={}){this.url=url;this.password=password;this.fetchImpl=fetchImpl;this.cookie='';}
  async request(route,{method='GET',body,download=false}={}){
    if(!/^\/[A-Za-z0-9_/?&=%.-]+$/.test(route))throw httpError('Invalid backend route',400);
    const request=async()=>this.fetchImpl(this.url+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(this.cookie?{cookie:this.cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
    if(!this.cookie)await this.login();
    let response=await request();
    if(response.status===401){await this.login();response=await request();}
    if(!response.ok){let message;try{const json=await response.json();message=json.error;}catch{}throw httpError(String(message||`FEZI server returned ${response.status}`).slice(0,200),response.status);}
    if(download)return Buffer.from(await response.arrayBuffer());
    return response.json();
  }
  async login(){
    if(!this.password)throw httpError('APP_PASSWORD missing',412);
    const response=await this.fetchImpl(this.url+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:this.password}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw httpError('FEZI local login failed: '+response.status);
    this.cookie=String(response.headers.get('set-cookie')||'').split(';')[0];
    if(!this.cookie.startsWith('bg_session='))throw httpError('FEZI server did not provide session cookie');
  }
}
export class TelegramSelectionStore {
  constructor(directory){this.directory=directory;}
  file(user){if(!USER_ID.test(String(user)))throw httpError('Invalid user ID',400);return path.join(this.directory,String(user)+'.json');}
  async get(user){try{return JSON.parse(await fs.readFile(this.file(user),'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
  async patch(user,value){
    const previous=await this.get(user);const next={...previous,...value};await fs.mkdir(this.directory,{recursive:true,mode:0o700});
    const file=this.file(user),tmp=file+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify(next),{mode:0o600});await fs.rename(tmp,file);return next;
  }
}
const help=`FEZI AGENT 🐐\n\n/new نام پروژه — ساخت پروژه\n/projects — فهرست پروژه‌ها\n/use شناسه — انتخاب پروژه\n/build درخواست — ساخت یا ویرایش پروژه انتخاب‌شده\n/status شناسه — وضعیت ساخت\n/cancel شناسه — توقف وظیفه\n/export — دریافت ZIP پروژه\n/ask سوال — گفت‌وگو با FEZI AGENT\n/ping — بررسی سرور\n/id — شناسه تلگرام شما\n\nمی‌توانی به‌جای /ask متن عادی هم بفرستی.`;
export function makeTelegramProcessor({api,backend,store,allowedIds,webAppUrl='',logger=console}){
  if(!api||!backend||!store||!allowedIds)throw Error('Telegram dependencies missing');
  return async(update)=>{
    const msg=update?.message;const user=msg?.from?.id;const chat=msg?.chat?.id;
    if(!USER_ID.test(String(user||''))||!Number.isSafeInteger(chat)||msg.chat.type!=='private'||msg.from.is_bot===true)return {ignored:true};
    const input=typeof msg.text==='string'?msg.text.trim():'';
    if(!input)return {ignored:true};
    if(/^\/id(?:@\w+)?(?:\s|$)/i.test(input)){await api.sendText(chat,`Telegram ID: ${user}`);return {ok:true,kind:'id'};}
    if(!allowedIds.has(String(user)))return {ignored:true,unauthorized:true};
    const state=await store.get(user);
    const cmd=input.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
    const action=(cmd?.[1]||'ask').toLowerCase();const arg=(cmd?cmd[2]||'':input).trim();
    let output='';let document;
    try {
      if(action==='start'||action==='help')output=help;
      else if(action==='ping'){
        const response=await backend.request('/health');output=response.ok?'FEZI AGENT آنلاین است ✅':'سرور در دسترس نیست';
      } else if(action==='new'){
        if(!arg||arg.length>65)output='مثال: /new فروشگاه من';
        else {const response=await backend.request('/api/projects',{method:'POST',body:{name:arg,template:'landing'}});await store.patch(user,{project:response.project.id});output=`پروژه «${response.project.name}» ساخته شد.\nشناسه: ${response.project.id}\nاکنون /build درخواستت را بفرست.`;}
      }else if(action==='projects'){
        const r=await backend.request('/api/projects');const items=r.projects.slice(0,15);
        output=items.length?'پروژه‌ها:\n'+items.map(p=>`${p.name}: ${p.id}${state.project===p.id?' ✓':''}`).join('\n'):'هنوز پروژه‌ای نداری. /new نام';
      }else if(action==='use'){
        if(!PROJECT_ID.test(arg))output='شناسه ۱۶ کاراکتری پروژه را وارد کن.';
        else {await backend.request('/api/project?id='+arg);await store.patch(user,{project:arg});output='پروژه انتخاب شد ✅\n'+arg;}
      }else if(action==='build'){
        const old=arg.match(/^([a-f0-9]{16})\s+([\s\S]+)$/i);
        const project=old?.[1]||state.project,goal=old?.[2]||arg;
        if(!PROJECT_ID.test(project||''))output='اول /new نام پروژه یا /use شناسه را بفرست.';
        else if(goal.length<4||goal.length>6500)output='درخواست ساخت باید بین ۴ تا ۶۵۰۰ کاراکتر باشد.';
        else {const r=await backend.request('/api/fezi/tasks',{method:'POST',body:{id:project,goal,maxSteps:6}});await store.patch(user,{project,lastTask:r.task.id});output=`FEZI AGENT ساخت را شروع کرد.\nشناسه کار: ${r.task.id}\n/status ${r.task.id}`;}
      }else if(action==='status'){
        const task=arg||state.lastTask;
        if(!TASK_ID.test(task||''))output='مثال: /status TASK_ID';
        else {const response=await backend.request('/api/fezi/task?taskId='+task);const j=response.task;output=`وضعیت: ${j.status}\nگام: ${j.step||0}/${j.maxSteps||0}\n${j.result?.summary||j.events?.at(-1)?.summary||''}`;}
      }else if(action==='cancel'){
        if(!TASK_ID.test(arg))output='مثال: /cancel TASK_ID';
        else{await backend.request('/api/task/cancel',{method:'POST',body:{taskId:arg}});output='درخواست توقف ثبت شد.';}
      }else if(action==='export'){
        const id=arg||state.project;
        if(!PROJECT_ID.test(id||''))output='اول یک پروژه را انتخاب کن: /use شناسه';
        else {document=await backend.request('/api/export?id='+id,{download:true});if(document.length>45_000_000)throw Error('ZIP exceeds Telegram upload limit');output='فایل پروژه آماده است.';}
      }else if(action==='ask'||action==='chat'){
        if(arg.length<2||arg.length>6000)output='سؤال باید بین ۲ تا ۶۰۰۰ کاراکتر باشد.';
        else {const r=await backend.request('/api/fezi/chat',{method:'POST',body:{message:arg}});output=r.answer||'پاسخی دریافت نشد.';}
      }else output='دستور ناشناخته است. /help';
      if(document)await api.sendZip(chat,document,'fezi-'+(arg||state.project)+'.zip');
      await api.sendText(chat,output,webAppUrl);
      return {ok:true,kind:action};
    }catch(e){
      logger.error('Telegram command failed:',action,String(e?.message||e).slice(0,200));
      const expected=e?.status>=400&&e?.status<500;
      await api.sendText(chat,expected?`انجام نشد: ${String(e.message).slice(0,180)}`:'درخواست انجام نشد. تنظیمات سرور یا مدل هوش مصنوعی را بررسی کن.');
      return {ok:false,kind:action};
    }
  };
}
