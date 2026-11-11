import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createArinaStandaloneChat,configuredArinaFreeModel} from '../core/arina-standalone-free-chat.js';
const base={ARINA_STANDALONE_CHAT_ENABLED:'true',OPENROUTER_API_KEY:'sk-test-only',ARINA_FREE_MODEL:'openrouter/free',ARINA_FREE_CHAT_PER_USER_DAY:'2',ARINA_FREE_CHAT_GLOBAL_DAY:'3'};
const time=()=>Date.parse('2026-11-04T14:00:00Z');
async function setup(env={},fetchImpl=async(url,req)=>({ok:true,json:async()=>({choices:[{message:{content:'سلام! من آرینا هستم 💗'}}]})})){
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-arina-'));
 const chat=createArinaStandaloneChat({dataDir,env:{...base,...env},now:time,fetchImpl});await chat.init();return {chat,dataDir};
}
test('Arina model must be openrouter/free or a :free variant',()=>{
 assert.equal(configuredArinaFreeModel({ARINA_FREE_MODEL:'openrouter/free'}),'openrouter/free');
 assert.equal(configuredArinaFreeModel({ARINA_FREE_MODEL:'provider/model:free'}),'provider/model:free');
 assert.equal(configuredArinaFreeModel({ARINA_FREE_MODEL:'openrouter/auto'}),null);
});
test('independent Arina requires explicit activation and a key',async()=>{
 const {chat,dataDir}=await setup({ARINA_STANDALONE_CHAT_ENABLED:'false'});
 assert.equal(chat.ready,false);await assert.rejects(()=>chat.reply({telegramId:'123456',content:'سلام آرینا'}),e=>e.status===503);await fs.rm(dataDir,{recursive:true,force:true});
});
test('standalone AI chat sends verified-free model, saves short context and returns persona',async()=>{
 const calls=[];const {chat,dataDir}=await setup({},async(url,req)=>{calls.push({url,headers:req.headers,body:JSON.parse(req.body)});return {ok:true,json:async()=>({choices:[{message:{content:'سلام! من آرینا هستم 💗'}}]})}});
 const r=await chat.reply({telegramId:'123456',content:'سلام آرینا'});assert.equal(r.remaining,1);assert.match(r.answer,/آرینا/);
 assert.equal(calls[0].url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(calls[0].body.model,'openrouter/free');
 assert.ok(calls[0].body.messages[0].content.includes('fictional ADULT'));
 const text=JSON.stringify(r);assert.ok(!text.includes(base.OPENROUTER_API_KEY));await fs.rm(dataDir,{recursive:true,force:true});
});
test('free quotas persist on disk',async()=>{
 const {chat,dataDir}=await setup();await chat.reply({telegramId:'123456',content:'سلام آرینا'});
 const other=createArinaStandaloneChat({dataDir,env:base,now:time,fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'💗'}}]})})});await other.init();
 const out=await other.reply({telegramId:'123456',content:'امروز چطوری؟'});assert.equal(out.remaining,0);
 await assert.rejects(()=>other.reply({telegramId:'123456',content:'سلام مجدد'}),e=>e.status===429);await fs.rm(dataDir,{recursive:true,force:true});
});
test('provider errors are not masqueraded as successful chats',async()=>{
 const {chat,dataDir}=await setup({},async()=>({ok:false,status:429}));
 await assert.rejects(()=>chat.reply({telegramId:'123456',content:'سلام آرینا'}),e=>e.status===429);
 await fs.rm(dataDir,{recursive:true,force:true});
});
