import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createStudioV15} from '../core/studio-v15.js';
import {createFreePlayground} from '../core/free-playground-v101.js';
const root=process.cwd();
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v},writeHead(n,h){this.code=n;this.headers={...this.headers,...h}},end(t){this.raw=t?String(t):''}});
const request=(url='/api/auth/google/status')=>({method:'GET',url,headers:{host:'localhost:3000'},socket:{remoteAddress:'127.0.0.1',encrypted:false},async *[Symbol.asyncIterator](){}});
test('google status uses legacy alias, never leaks client secret',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-oauth-audit-'));
 const prev={GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET,GOOGLE_OAUTH_CLIENT_ID:process.env.GOOGLE_OAUTH_CLIENT_ID,GOOGLE_OAUTH_CLIENT_SECRET:process.env.GOOGLE_OAUTH_CLIENT_SECRET,PUBLIC_BASE_URL:process.env.PUBLIC_BASE_URL};
 try{delete process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_SECRET;process.env.GOOGLE_OAUTH_CLIENT_ID='test.apps.googleusercontent.com';process.env.GOOGLE_OAUTH_CLIENT_SECRET='TEST_SECRET_NEVER_IN_OUTPUT';delete process.env.PUBLIC_BASE_URL;
 const app=createStudioV15({root,dataDir:dir,sessionSecret:'z'.repeat(80),authenticatedOwner:()=>false,runText:async()=>''});await app.init();const result=res();await app.handle(request(),result,'/api/auth/google/status');const body=JSON.parse(result.raw);assert.equal(result.code,200);assert.equal(body.configured,true);assert.equal(body.redirectUri,'http://localhost:3000/auth/google/callback');assert.ok(!result.raw.includes('TEST_SECRET_NEVER_IN_OUTPUT'));
 }finally{for(const [k,v] of Object.entries(prev))if(v===undefined)delete process.env[k];else process.env[k]=v;await fs.rm(dir,{force:true,recursive:true})}
});
test('real local runtime inventory is reported as installed; tools not implied executable',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-runtime-audit-'));
 try{const pg=createFreePlayground({dataDir:dir,studio:{getAccount:()=>null},env:{},installedModels:async()=>['qwen2.5:3b']});await pg.init();
 const r=res();await pg.handle(request(),r,'/api/fezi-playground/readiness');const obj=JSON.parse(r.raw);assert.equal(obj.localOllama.modelCount,1);assert.equal(obj.freeAgentReady,true);assert.equal(obj.codeAgent.catalogInstalled,false);
 const o=res();await pg.handle(request(),o,'/api/fezi-playground/options');const d=JSON.parse(o.raw);assert.equal(d.free.find(x=>x.id==='tool:video').configured,false);
 }finally{await fs.rm(dir,{force:true,recursive:true})}
});
test('icons are local and expected routing exists',async()=>{
 const js=await fs.readFile('public/model-assets/provider-logos.js','utf8');assert.match(js,/iconForModel/);
 for(const f of ['fezi','ollama','openrouter','mistral','gemini','grok','cline','qwen','generic'])assert.match(await fs.readFile(`public/model-assets/icons/${f}.svg`,'utf8'),/<svg/);
 for(const file of ['public/model-playground/app.js','public/studio/app.js'])assert.match(await fs.readFile(file,'utf8'),/makeModelIcon/);
 assert.match(await fs.readFile('server.js','utf8'),/model-assets\\\/icons/);
});
