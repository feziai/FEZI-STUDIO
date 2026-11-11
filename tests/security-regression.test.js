import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startServer(env){
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',d=>errors+=d);
  let ready=false;
  const url=`http://127.0.0.1:${env.PORT}`;
  for(let i=0;i<100;i++){
    if(child.exitCode!==null||child.signalCode)break;
    try{const r=await fetch(url+'/health');if(r.ok){ready=true;break;}}catch{}
    await sleep(40);
  }
  if(!ready){child.kill();throw new Error('Server startup failed: '+errors);}
  return {child,url,get errors(){return errors;}};
}
test('security, MCP, file batching and session HTTP regressions',async t=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'fezi-security-'));
  t.after(()=>rm(tmp,{recursive:true,force:true}));
  const port=40000+Math.floor(Math.random()*15000);
  const instance=await startServer({APP_PASSWORD:'fezi-test-password-strong',SESSION_SECRET:'a-very-different-test-session-secret-that-is-long',DATA_DIR:tmp,PORT:String(port),HOST:'127.0.0.1',MCP_DEV_TOKEN:'fezi-test-mcp-secret-strong-token-2026',COOKIE_SECURE:'false'});
  t.after(()=>instance.child.kill());
  const rq=async(path,{method='GET',body,cookie,headers={}}={})=>fetch(instance.url+path,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  await t.test('Reject non-JSON login mutations',async()=>{const r=await rq('/api/login',{method:'POST',headers:{'content-type':'text/plain'},body:{password:'wrong'}});assert.equal(r.status,415);});
  await t.test('Reject cross-site mutations',async()=>{const r=await rq('/api/login',{method:'POST',headers:{origin:'https://evil.example'},body:{password:'wrong'}});assert.equal(r.status,403);});
  await t.test('Reject invalid browser Origin',async()=>{const r=await rq('/api/login',{method:'POST',headers:{origin:'null'},body:{password:'wrong'}});assert.equal(r.status,403);});
  await t.test('Reject absent admin cookie',async()=>{const r=await rq('/api/projects');assert.equal(r.status,401);});
  let cookie;
  await t.test('Set an HttpOnly host-only session cookie',async()=>{const r=await rq('/api/login',{method:'POST',body:{password:'fezi-test-password-strong'}});assert.equal(r.status,200);const raw=r.headers.get('set-cookie');assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/);cookie=raw.split(';')[0];});
  await t.test('Do not trust spoofed forwarded TLS headers',async()=>{const r=await rq('/api/login',{method:'POST',body:{password:'fezi-test-password-strong'},headers:{'x-forwarded-proto':'https'}});assert.equal(r.status,200);assert.doesNotMatch(r.headers.get('set-cookie'),/; Secure/);});
  await t.test('Reject tampered session cookie',async()=>{const r=await rq('/api/projects',{cookie:cookie.slice(0,-1)+(cookie.endsWith('f')?'e':'f')});assert.equal(r.status,401);});
  let id;
  await t.test('Create a project using the authenticated session',async()=>{const r=await rq('/api/projects',{method:'POST',body:{name:'QA Security',template:'blank'},cookie});assert.equal(r.status,201);id=(await r.json()).project.id;});
  await t.test('Reject absolute file paths via main API',async()=>{const r=await rq('/api/save',{method:'POST',body:{id,files:[{path:'/tmp/hack.js',content:'x'}]},cookie});assert.equal(r.status,400);});
  await t.test('Reject nested credential files via main API',async()=>{const r=await rq('/api/save',{method:'POST',body:{id,files:[{path:'nested/.env',content:'token'}]},cookie});assert.equal(r.status,400);});
  await t.test('Accept a batch of 24 valid edited files',async()=>{const files=Array.from({length:24},(_,i)=>({path:'components/card-'+i+'.js',content:`export const n=${i};`}));const r=await rq('/api/save',{method:'POST',body:{id,files},cookie});assert.equal(r.status,200);});
  await t.test('Accept the second batch of remaining edits',async()=>{const files=Array.from({length:12},(_,i)=>({path:'styles/theme-'+i+'.css',content:`body{--i:${i}}`}));const r=await rq('/api/save',{method:'POST',body:{id,files},cookie});assert.equal(r.status,200);const read=await rq('/api/project?id='+id,{cookie});assert.equal(Object.keys((await read.json()).files).length,39);});
  const mcp=async(name,args,token='fezi-test-mcp-secret-strong-token-2026')=>fetch(instance.url+'/mcp',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
  await t.test('Reject wrong MCP bearer credential',async()=>{const r=await mcp('list_projects',{},'wrong-secret');assert.equal(r.status,401);});
  await t.test('Reject MCP writes to dotfiles',async()=>{const r=await mcp('apply_file_change',{project_id:id,path:'.env',content:'secret',confirm:true});assert.equal((await r.json()).result.isError,true);});
  await t.test('Reject MCP path traversal',async()=>{const r=await mcp('apply_file_change',{project_id:id,path:'../outside.txt',content:'no',confirm:true});assert.equal((await r.json()).result.isError,true);});
  await t.test('Reject MCP writes without confirmation',async()=>{const r=await mcp('apply_file_change',{project_id:id,path:'scripts/test.js',content:'yes',confirm:false});assert.equal((await r.json()).result.isError,true);});
  await t.test('MCP valid write uses shared storage and updates file',async()=>{const r=await mcp('apply_file_change',{project_id:id,path:'scripts/test.js',content:'export const safe=true;',confirm:true});assert.equal((await r.json()).result.isError,undefined);const read=await rq('/api/project?id='+id,{cookie});assert.equal((await read.json()).files['scripts/test.js'],'export const safe=true;');});
  await t.test('MCP read and main API see exactly the same files',async()=>{const r=await mcp('read_project',{project_id:id});const result=JSON.parse((await r.json()).result.content[0].text);assert.equal(Object.keys(result.files).length,40);});
  await t.test('Reject invalid AI model name without contacting a provider',async()=>{const r=await rq('/api/ai',{method:'POST',body:{id,provider:'ollama',model:'../../etc/passwd',prompt:'Build a new dashboard'},cookie});assert.equal(r.status,400);});
  await t.test('Reject unknown API path',async()=>{const r=await rq('/api/does-not-exist',{cookie});assert.equal(r.status,404);});
  await t.test('Logout invalidates the current browser cookie',async()=>{const r=await rq('/api/logout',{method:'POST',body:{},cookie});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);});
});

test('server rejects reused or missing session secrets',async t=>{
  for (const secret of ['', 'same-password-long-enough']){
    await t.test(secret?'reuse of APP_PASSWORD':'missing SESSION_SECRET',async()=>{
      const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,APP_PASSWORD:'same-password-long-enough',SESSION_SECRET:secret,PORT:'0',DATA_DIR:path.join(os.tmpdir(),'fezi-secret-check-'+process.pid)}});
      let output='';proc.stderr.on('data',b=>output+=b);const code=await new Promise(r=>proc.on('exit',r));assert.equal(code,1);assert.match(output,/SESSION_SECRET/);
    });
  }
});
