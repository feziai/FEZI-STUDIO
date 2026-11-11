import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createPublicBot} from '../core/telegram-public.js';
import {createTelegramImageWorker} from '../core/telegram-image-worker-v101.js';
const secret='fezi-telegram-test-bridge-secret-32chars';
const update=(message,group=false)=>({message:{from:{id:4411,language_code:'fa',is_bot:false},chat:{id:group?-100777:4411,type:group?'supergroup':'private'},text:message}});
async function fixture(t,{imageWorker=null,linked=true}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-bot-new-'));
 t.after(()=>fs.rm(dir,{force:true,recursive:true}));
 const sent=[],images=[],calls=[];
 const api={sendText:async(chatId,text,webAppUrl)=>sent.push({chatId,text,webAppUrl}),call:async(method,body)=>{images.push({method,body});return {ok:true}}};
 const fetchImpl=async(url,options)=>{
   calls.push({url,options});
   if(url.endsWith('/api/telegram/internal/summary'))return {ok:true,json:async()=>({linked,userId:'u1',name:'Example',username:'example',arina:{balanceCents:0}})};
   if(url.endsWith('/api/studio/bot-chat'))return {ok:true,json:async()=>({answer:'پاسخ مدل'})};
   throw Error('Unexpected '+url);
 };
 const bot=createPublicBot({api,storeFile:path.join(dir,'users.json'),webAppUrl:'https://fezi.test',studioAppUrl:'https://fezi.test/studio',arinaBotUsername:'ArinaTesterBot',loginBotUsername:'SecureTesterBot',botSecret:secret,imageWorker,fetchImpl});
 await bot.init();return {bot,sent,images,calls};
}
test('private bot can launch both miniapps, secure login bot and share approved posts',async t=>{
 const {bot,sent}=await fixture(t);
 for(const action of ['/studio','/arina','/login','/share'])await bot.processUpdate(update(action));
 assert.match(sent[0].text,/\/studio/);assert.match(sent[1].text,/t.me\/ArinaTesterBot/);
 assert.match(sent[2].text,/t.me\/SecureTesterBot/);assert.match(sent[3].text,/\/community/);
});
test('group mode ignores unaddressed messages and keeps account details private',async t=>{
 const {bot,sent,calls}=await fixture(t);
 assert.equal((await bot.processUpdate(update('سلام',true))).ignored,true);
 await bot.processUpdate(update('/help',true));await bot.processUpdate(update('/account',true));
 assert.equal(sent.length,1);assert.match(sent[0].text,/راهنمای گروه/);
 assert.equal(calls.length,0);
 await bot.processUpdate(update('/chat یک سوال واقعی',true));
 assert.equal(sent.length,2);assert.equal(sent[1].chatId,-100777);
 assert.equal(sent[1].webAppUrl,'');
 assert.equal(sent[1].text,'پاسخ مدل');
});
test('three daily generated images require verified account and are charged after success',async t=>{
 const imageWorker={generate:async(prompt)=>({imageUrl:'https://assets.fezi.test/test.webp'})};
 const {bot,sent,images}=await fixture(t,{imageWorker});
 for(let i=0;i<4;i++)await bot.processUpdate(update('/image عکس منظره با کیفیت بالا'));
 assert.equal(images.filter(x=>x.method==='sendPhoto').length,3);
 assert.match(sent.at(-1).text,/سهمیه/);
 await bot.processUpdate(update('/quota'));
 assert.match(sent.at(-1).text,/۰ از ۳|0 از 3/);
});
test('failed image delivery restores daily quota and refuses to claim generation',async t=>{
 const worker={generate:async()=>{throw Error('not ready')}};
 const {bot,sent,images}=await fixture(t,{imageWorker:worker});
 await bot.processUpdate(update('/image یک پرتره طبیعی'));
 await bot.processUpdate(update('/quota'));
 assert.equal(images.length,0);assert.match(sent.at(-1).text,/۳ از ۳|3 از 3/);
});
test('unlinked FEZI users cannot generate images',async t=>{
 const {bot,images,sent}=await fixture(t,{imageWorker:{generate:async()=>({imageUrl:'https://fezi.test/result.png'})},linked:false});
 await bot.processUpdate(update('/image تصویر حرفه ای'));
 assert.equal(images.length,0);assert.match(sent.at(-1).text,/ثبت‌نام/);
});
test('motivation is opt-in, idempotent daily and group commands cannot opt users in',async t=>{
 const {bot,sent}=await fixture(t);
 await bot.processUpdate(update('/motivate on',true));assert.equal(bot.subscribers(),0);
 await bot.processUpdate(update('/motivate on'));assert.equal(bot.subscribers(),1);
 await bot.sendDaily(new Date('2026-11-04T10:00:00Z'));const n=sent.length;
 await bot.sendDaily(new Date('2026-11-04T11:00:00Z'));assert.equal(sent.length,n);
 await bot.processUpdate(update('/motivate off'));assert.equal(bot.subscribers(),0);
});
test('image adapter accepts only trusted configured endpoint and secret',async()=>{
 assert.equal(createTelegramImageWorker({url:''}),null);
 assert.throws(()=>createTelegramImageWorker({url:'http://evil.test/generate-image',secret}),/HTTPS/);
 assert.throws(()=>createTelegramImageWorker({url:'https://fezi.test/private',secret}),/generate-image/);
 let calls=0;
 const worker=createTelegramImageWorker({url:'https://worker.fezi.test/generate-image',secret,fetchImpl:async(url,opts)=>{calls++;assert.match(opts.headers.authorization,/^Bearer /);assert.equal(JSON.parse(opts.body).prompt,'A photo');return {ok:true,json:async()=>({imageUrl:'https://cdn.fezi.test/file.webp'})}}});
 assert.equal((await worker.generate('A photo',{telegramId:'4411',userId:'u1'})).imageUrl,'https://cdn.fezi.test/file.webp');
 assert.equal(calls,1);
});
