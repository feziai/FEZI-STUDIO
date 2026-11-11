import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createFreePlayground} from '../core/free-playground-v101.js';
const request=(method='GET',payload)=>({method,async *[Symbol.asyncIterator](){if(payload)yield Buffer.from(JSON.stringify(payload))}});
const reply=()=>({writeHead(status){this.statusCode=status},end(value){this.body=JSON.parse(value)}});
const make=async opt=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-playground-'));const pg=createFreePlayground({dataDir:dir,studio:{getAccount:()=>({id:'test-user'})},...opt});await pg.init();return {dir,pg}};
test('free-first list shows installed Ollama, free studio shortcuts, paid models only after free models',async()=>{
 const {dir,pg}=await make({installedModels:async()=>['qwen3.5:9b'],env:{}});try{
 const res=reply();await pg.handle(request(),res,'/api/fezi-playground/options');assert.equal(res.statusCode,200);
 assert.equal(res.body.free[0].kind,'ollama');assert.equal(res.body.free[0].id,'qwen3.5:9b');
 assert.ok(res.body.paid.length>0);assert.ok(res.body.paid.every(x=>x.free===false&&x.configured===false));
 assert.ok(res.body.free.every(x=>x.free===true));assert.equal(res.body.billingAutomatic,false);
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
test('FEZI Agent free local request never calls a premium provider and does not require money',async()=>{
 const calls=[];const {dir,pg}=await make({env:{},installedModels:async()=>['qwen:local'],agentRun:async x=>{calls.push(x);return {text:'جواب رایگان'}}});try{
 const out=reply();await pg.handle(request('POST',{prompt:'سلام آرینا',model:'auto'}),out,'/api/fezi-playground/agent-chat');assert.equal(out.statusCode,200);
 assert.equal(out.body.answer,'جواب رایگان');assert.equal(out.body.free,true);assert.equal(out.body.billed,false);
 assert.equal(calls.length,1);assert.equal(calls[0].offlineOnly,true);
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
test('Direct premium model cannot be passed to free endpoint',async()=>{
 const {dir,pg}=await make({env:{},installedModels:async()=>['qwen:local'],agentRun:async()=>({text:'no'})});try{
 await assert.rejects(pg.handle(request('POST',{prompt:'سلام',model:'paid:openai'}),reply(),'/api/fezi-playground/agent-chat'),e=>e.status===422);
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
test('Unconnected FEZI Agent responds with real 503, not fabricated answers or paid requests',async()=>{
 const {dir,pg}=await make({env:{},installedModels:async()=>[],agentRun:async()=>{throw Error('No local engine')}});try{
 await assert.rejects(pg.handle(request('POST',{prompt:'سلام',model:'auto'}),reply(),'/api/fezi-playground/agent-chat'),e=>e.status===503);
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
test('Paid API credentials are never included in options payload',async()=>{
 const {dir,pg}=await make({env:{OPENROUTER_API_KEY:'secret-custom-abc',FEZI_PAID_MODELS_JSON:'[{"id":"paid:gpt","name":"Paid GPT","task":"chat"}]'},installedModels:async()=>[]});try{
 const out=reply();await pg.handle(request(),out,'/api/fezi-playground/options');
 assert.equal(out.body.paid.length,1);assert.ok(!JSON.stringify(out.body).includes('secret-custom-abc'));
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
