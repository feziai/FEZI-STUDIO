import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateTelegramPlugin,telegramReply,makeTelegramPluginFiles,createTelegramPluginHub} from '../core/telegram-plugin-hub.mjs';
const spec={name:'My FEZI Support',description:'Support',welcome:'سلام {{first_name}}',fallback:'برای راهنما /help',website:'https://fezi.example.org/help',commands:[{command:'price',description:'قیمت',reply:'قیمت امروز را در سایت ببینید.'},{command:'hours',description:'زمان کار',reply:'۲۴ ساعته'}]};
test('validates a useful Telegram plugin and blocks invalid command names',()=>{
 const v=validateTelegramPlugin(spec);assert.equal(v.commands.length,2);assert.match(telegramReply(v,'/start','کاربر'),/کاربر/);assert.match(telegramReply(v,'/help'),/\/price/);assert.match(telegramReply(v,'/price'),/قیمت/);
 assert.throws(()=>validateTelegramPlugin({...spec,commands:[{command:'../../etc',reply:'bad'}]}),/Invalid/);
 assert.throws(()=>validateTelegramPlugin({...spec,commands:[{command:'help',reply:'duplicate'}]}),/Invalid/);
 assert.throws(()=>validateTelegramPlugin({...spec,website:'javascript:alert(1)'}),/HTTPS/);
});
test('exports a runnable Node.js Telegram package without any token',()=>{
 const files=makeTelegramPluginFiles(spec);assert.ok(files['bot.mjs'].includes("getUpdates"));assert.ok(files['package.json'].includes('node bot.mjs'));assert.ok(files['README_FA.md'].includes('BotFather'));assert.ok(!files['bot.mjs'].includes('123456789:secret'));
});
test('server hosted bot validates API, encrypts token, replies in Telegram and disconnects',async t=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-telegram-plugin-'));t.after(()=>fs.rm(dataDir,{recursive:true,force:true}));
 const calls=[],fetchImpl=async (url,opt)=>{
   const method=url.split('/').pop(),body=JSON.parse(opt.body);calls.push({method,body});
   let result=method==='getMe'?{id:451,is_bot:true,username:'FeziTestBot'}:true;
   return {ok:true,json:async()=>({ok:true,result})};
 };
 const hub=createTelegramPluginHub({dataDir,sessionSecret:'testing-secret-very-strong-123456',publicBaseUrl:'https://fezi.test',fetchImpl});await hub.init();
 const token='123456789:ABCDEFGHIJKLMNOPQRSTUVWXY123456789';
 const connected=await hub.connect({spec,token});assert.equal(connected.username,'FeziTestBot');assert.ok(hub.list().length===1);
 const file=await fs.readFile(path.join(dataDir,'telegram-plugin-hub','bots.json'),'utf8');assert.ok(!file.includes(token));assert.ok(!file.includes('تست توکن'));
 const webhookToken=calls.find(x=>x.method==='setWebhook').body.secret_token;
 await assert.rejects(()=>hub.webhook(connected.id,'wrong',{update_id:1,message:{text:'/start',chat:{id:99,type:'private'},from:{first_name:'آرمان'}}}),{status:403});
 const result=await hub.webhook(connected.id,webhookToken,{update_id:1,message:{text:'/start',chat:{id:99,type:'private'},from:{first_name:'آرمان'}}});assert.equal(result.sent,true);
 assert.equal(calls.at(-1).method,'sendMessage');assert.match(calls.at(-1).body.text,/آرمان/);
 const replay=await hub.webhook(connected.id,webhookToken,{update_id:1,message:{text:'/start',chat:{id:99,type:'private'}}});assert.equal(replay.duplicate,true);
 await hub.disconnect(connected.id);assert.equal(hub.list().length,0);assert.ok(calls.some(x=>x.method==='deleteWebhook'));
});
test('prevents activation without HTTPS domain or with duplicate bot id',async t=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-bot-domain-'));t.after(()=>fs.rm(dataDir,{recursive:true,force:true}));
 const hub=createTelegramPluginHub({dataDir,sessionSecret:'123456789012345678901234567890',publicBaseUrl:'http://localhost:3000'});await hub.init();
 await assert.rejects(()=>hub.connect({spec,token:'123456789:ABCDEFGHIJKLMNOPQRSTUVWXY123456789'}),{status:503});
});
