import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTelegramProcessor,parseTelegramConfig,TelegramApi} from '../core/telegram-runtime.js';

test('Telegram configuration requires allowlisted IDs and valid token, blocks remote backend passwords',()=>{
 const valid={TELEGRAM_BOT_TOKEN:'123456789:AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPp',TELEGRAM_ALLOWED_USER_IDS:'1234,5678',TELEGRAM_BACKEND_URL:'http://127.0.0.1:3000'};
 const conf=parseTelegramConfig(valid);assert.equal(conf.ids.size,2);assert.equal(conf.backend,'http://127.0.0.1:3000');
 assert.throws(()=>parseTelegramConfig({...valid,TELEGRAM_ALLOWED_USER_IDS:''}),/Set TELEGRAM_ALLOWED_USER_IDS/);
 assert.throws(()=>parseTelegramConfig({...valid,TELEGRAM_BACKEND_URL:'https://example.com'}),/local HTTP/);
 assert.throws(()=>parseTelegramConfig({...valid,TELEGRAM_BACKEND_URL:'http://127.0.0.1.evil.com'}),/local HTTP/);
});
test('Telegram commands create/edit/status/export and block unauthorized users',async()=>{
 const sent=[],documents=[],calls=[];
 const state=new Map();
 const store={get:async id=>state.get(id)||{},patch:async(id,add)=>{const obj={...state.get(id),...add};state.set(id,obj);return obj;}};
 const api={sendText:async(chat,text)=>{sent.push({chat,text});},sendZip:async(chat,zip,name)=>{documents.push({chat,zip,name});}};
 const backend={request:async(route,{method,body,download}={})=>{
  calls.push({route,method,body,download});
  if(route==='/health')return {ok:true};
  if(route==='/api/projects'&&method==='POST')return {project:{id:'1234567890abcdef',name:body.name}};
  if(route==='/api/projects')return {projects:[{id:'1234567890abcdef',name:'Demo'}]};
  if(route.startsWith('/api/project?'))return {project:{id:'1234567890abcdef'}};
  if(route==='/api/fezi/tasks')return {task:{id:'0123456789abcdef1234'}};
  if(route.startsWith('/api/fezi/task?'))return {task:{status:'completed',step:2,maxSteps:2,result:{summary:'موفق'}}};
  if(route.startsWith('/api/export?'))return Buffer.from('ZIP');
  if(route==='/api/fezi/chat')return {answer:'جواب آزمایشی'};
  throw Error('Unexpected backend route '+route);
 }};
 const processor=makeTelegramProcessor({api,backend,store,allowedIds:new Set(['1234']),logger:{error:()=>{}}});
 const update=(id,text)=>({message:{from:{id,is_bot:false},chat:{id,type:'private'},text}});
 assert.equal((await processor(update(9999,'/new هک'))).unauthorized,true);
 assert.equal(calls.length,0);
 assert.equal((await processor(update(1234,'/new سایت من'))).ok,true);
 assert.equal(state.get(1234).project,'1234567890abcdef');
 await processor(update(1234,'/build یک سایت راست‌چین بساز'));
 assert.equal(state.get(1234).lastTask,'0123456789abcdef1234');
 assert.ok(calls.some(x=>x.route==='/api/fezi/tasks'&&x.body.goal==='یک سایت راست‌چین بساز'));
 await processor(update(1234,'/status'));
 assert.ok(sent.some(x=>x.text.includes('completed')));
 await processor(update(1234,'/export'));
 assert.equal(documents.length,1);assert.equal(documents[0].zip.toString(),'ZIP');
 await processor(update(1234,'سلام FEZI AGENT'));
 assert.ok(sent.some(x=>x.text==='جواب آزمایشی'));
 await processor(update(1234,'/id'));
 assert.ok(sent.some(x=>x.text.includes('1234')));
});
test('Telegram transport rejects non-JSON error responses without sending secrets',async()=>{
 const api=new TelegramApi('123456789:AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPp',{fetchImpl:async()=>new Response('error',{status:502})});
 await assert.rejects(()=>api.call('getMe'),/invalid JSON/);
});
