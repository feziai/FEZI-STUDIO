import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {HF_CURATED,curatedCatalog,normalizeHFResults,normalizeOpenRouterFree,createFreePlayground} from '../core/free-playground-v101.js';

const request=(path,method='GET',payload=null)=>({method,url:path,async *[Symbol.asyncIterator](){if(payload)yield Buffer.from(JSON.stringify(payload));}});
function response(){return {statusCode:0,body:null,headers:null,writeHead(code,h){this.statusCode=code;this.headers=h},end(b){this.body=JSON.parse(b)}}}
test('catalog has image and video with suggested video time, not promised inference',()=>{
 assert.ok(HF_CURATED.length>=20);assert.ok(curatedCatalog().some(x=>x.task==='video'&&x.requestedDurationOptionsSec.includes(5)));
 assert.ok(curatedCatalog().every(x=>x.runnable===false&&x.verifiedInference===false));
 assert.ok(curatedCatalog().every(x=>!x.adultCatalog));assert.ok(curatedCatalog({mature:true}).some(x=>x.adultCatalog));
});
test('external HF discovery filters private/gated and unsafe labels by default',()=>{
 const arr=[{id:'Qwen/Qwen-Image'},{id:'xyz/secret',private:true},{id:'abc/gated',gated:'auto'},{id:'foo/nsfw-image'}];
 const result=normalizeHFResults(arr,'image');assert.deepEqual(result.map(x=>x.id),['Qwen/Qwen-Image']);
 assert.ok(normalizeHFResults(arr,'image',{mature:true}).some(x=>x.adultCatalog));
});
test('OpenRouter free catalog rejects paid prices and non-free suffix',()=>{
 const free=normalizeOpenRouterFree({data:[{id:'test/a:free',name:'Free',pricing:{prompt:'0',completion:'0'}},{id:'test/b:free',pricing:{prompt:'1',completion:'0'}},{id:'test/c',pricing:{prompt:'0',completion:'0'}},{id:'test/d:free',pricing:{prompt:'0',completion:'0.1'}}]});
 assert.deepEqual(free.map(x=>x.id),['test/a:free']);
});
test('free chat disabled without explicit opt-in, even with API key configured',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-free-'));try{
 const pg=createFreePlayground({studio:{getAccount:()=>({id:'one'})},dataDir:dir,env:{OPENROUTER_API_KEY:'SECRET'}});await pg.init();
 const out=response();await assert.rejects(pg.handle(request('/api/fezi-playground/chat','POST',{prompt:'Hello'}),out,'/api/fezi-playground/chat'),e=>e.status===503);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('free router never accepts a paid model and caps attempts before provider use',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-free-'));let called=[];
 try{const env={OPENROUTER_API_KEY:'secret',FEZI_FREE_ROUTING_ENABLED:'true',FEZI_FREE_CHAT_PER_USER_DAY:'2',FEZI_FREE_CHAT_GLOBAL_DAY:'2'};
 const fetchImpl=async()=>({ok:true,async json(){return {data:[{id:'my/free:free',name:'Free',pricing:{prompt:'0',completion:'0'}},{id:'my/paid',name:'Paid',pricing:{prompt:'1',completion:'2'}}]}}});
 const pg=createFreePlayground({studio:{getAccount:()=>({id:'u1'})},dataDir:dir,env,fetchImpl,ask:async x=>{called.push(x);return 'Answered'}});await pg.init();
 let out=response();await assert.rejects(pg.handle(request('','POST',{prompt:'hi',model:'my/paid'}),out,'/api/fezi-playground/chat'),e=>e.status===422);
 for(let n=0;n<2;n++){out=response();await pg.handle(request('','POST',{prompt:'hi',model:'my/free:free'}),out,'/api/fezi-playground/chat');assert.equal(out.statusCode,200)}
 assert.deepEqual(called.map(x=>x.model),['my/free:free','my/free:free']);
 await assert.rejects(pg.handle(request('','POST',{prompt:'hi'}),response(),'/api/fezi-playground/chat'),e=>e.status===429);
 const pg2=createFreePlayground({studio:{getAccount:()=>({id:'u1'})},dataDir:dir,env,fetchImpl,ask:async()=>{throw Error('should not run')}});await pg2.init();
 await assert.rejects(pg2.handle(request('','POST',{prompt:'hi'}),response(),'/api/fezi-playground/chat'),e=>e.status===429);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('curated catalog endpoint excludes 🍌 without explicit toggle, no secrets sent',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-free-'));try{
 const pg=createFreePlayground({studio:{getAccount:()=>null},dataDir:dir,env:{HF_TOKEN:'real-hf-secret'}});await pg.init();
 const out=response();await pg.handle(request(''),out,'/api/fezi-playground/catalog','?task=video');
 assert.equal(out.statusCode,200);assert.ok(out.body.models.every(x=>x.task==='video'));
 assert.ok(!JSON.stringify(out.body).includes('real-hf-secret'));
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
