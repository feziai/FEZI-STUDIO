import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,rm,mkdir,symlink,readFile,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicIp} from '../core/web.js';
import {createBuildExport} from '../core/build-export.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function availablePort(){
  const s=createServer(); await new Promise((ok,fail)=>s.once('error',fail).listen(0,'127.0.0.1',ok));
  const p=s.address().port;await new Promise(ok=>s.close(ok));return p;
}
const delay=ms=>new Promise(done=>setTimeout(done,ms));

test('v0.8 real HTTP regression: symlinks, invalid JSON and concurrency',async t=>{
  const rootData=await mkdtemp(path.join(os.tmpdir(),'fezi-v08-'));
  t.after(()=>rm(rootData,{recursive:true,force:true}));
  const port=await availablePort();
  const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,
    APP_PASSWORD:'secure-testing-password',SESSION_SECRET:'separate-long-and-random-test-session-secret',
    DATA_DIR:rootData,PORT:String(port),HOST:'127.0.0.1',MCP_DEV_TOKEN:'private-development-mcp-secret-token-test',LOCAL_AI_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
  let errors='';proc.stderr.on('data',d=>errors+=d);
  t.after(()=>{proc.kill();});
  const base=`http://127.0.0.1:${port}`;
  let ready=false;for(let i=0;i<120;i++){if(proc.exitCode!==null)break;try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await delay(50);}
  assert.ok(ready,'Server failed to start: '+errors);
  const req=async(url,body,cookie)=>fetch(base+url,{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
  await t.test('null/array/scalar JSON rejected with 400 instead of server error',async()=>{
    for(const value of [null,[],4,'hello',true]){
      const r=await req('/api/login',value);assert.equal(r.status,400,`JSON ${JSON.stringify(value)}`);
    }
  });
  const login=await req('/api/login',{password:'secure-testing-password'});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  await t.test('authenticated mutation rejects invalid JSON primitive',async()=>{
    for(const v of [null,[],42])assert.equal((await req('/api/save',v,cookie)).status,400);
  });
  let project;
  await t.test('create isolated workspace',async()=>{
    const r=await req('/api/projects',{name:'QA 5000',template:'blank'},cookie);
    assert.equal(r.status,201,errors);project=(await r.json()).project;
  });
  await t.test('refuse symlinked directory and keep external file untouched',async()=>{
    const outside=path.join(rootData,'external');await mkdir(outside);
    const files=path.join(rootData,'projects',project.id,'files');
    await symlink(outside,path.join(files,'pivot'));
    const attempt=await req('/api/save',{id:project.id,files:[{path:'pivot/stolen.js',content:'outside changed'}]},cookie);
    assert.equal(attempt.status,400,await attempt.text());
    await assert.rejects(access(path.join(outside,'stolen.js')));
    // MCP invokes the same storage boundary policy.
    const mcp=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer private-development-mcp-secret-token-test'},body:JSON.stringify({jsonrpc:'2.0',id:10,method:'tools/call',params:{name:'apply_file_change',arguments:{project_id:project.id,path:'pivot/pwn.js',content:'not written',confirm:true}}})});
    assert.equal(mcp.status,200);assert.equal((await mcp.json()).result.isError,true);
    await assert.rejects(access(path.join(outside,'pwn.js')));
  });
  await t.test('refuse symlinked existing file target',async()=>{
    const outside=path.join(rootData,'external','outside.txt');
    await (await import('node:fs/promises')).writeFile(outside,'SAFE CONTENT');
    const files=path.join(rootData,'projects',project.id,'files');
    await symlink(outside,path.join(files,'linked.js'));
    const r=await req('/api/save',{id:project.id,files:[{path:'linked.js',content:'OVERRIDDEN'}]},cookie);
    assert.equal(r.status,400);assert.equal(await readFile(outside,'utf8'),'SAFE CONTENT');
  });
  await t.test('concurrent saves are serialized and never exceed 120 files',async()=>{
    const check=await fetch(base+'/api/project?id='+project.id,{headers:{cookie}});
    const count=Object.keys((await check.json()).files).length;
    const extra=119-count;
    for(let i=0;i<extra;i+=20){
      const changes=Array.from({length:Math.min(20,extra-i)},(_,k)=>({path:`load/file_${i+k}.js`,content:`export default ${i+k};`}));
      const r=await req('/api/save',{id:project.id,files:changes},cookie);
      assert.equal(r.status,200,await r.text());
    }
    const [a,b]=await Promise.all([
      req('/api/save',{id:project.id,files:[{path:'raced_1.js',content:'one'}]},cookie),
      req('/api/save',{id:project.id,files:[{path:'raced_2.js',content:'two'}]},cookie)]);
    assert.deepEqual([a.status,b.status].sort((x,y)=>x-y),[200,400]);
    const final=await fetch(base+'/api/project?id='+project.id,{headers:{cookie}});
    assert.equal(Object.keys((await final.json()).files).length,120);
  });
});

test('v0.8 exported package must exclude hidden source files',()=>{
  const starter={'index.html':'<!doctype html><html><head></head><body>Hello</body></html>'};
  for(const hidden of ['.env','.git/config','.npmrc','assets/.secret.js']){
    assert.throws(()=>createBuildExport({...starter,[hidden]:'SECRET'},{kind:'android',appId:'ai.fezi.demo'}));
  }
});
test('v0.8 IPv6 global/public checks must reject tunnel and documentation ranges',()=>{
  for(const ip of ['2001:db8::8','2001::8','2002:c0a8:101::','3fff::1234','2001:10::55','2001:20::1234'])assert.equal(publicIp(ip),false,ip);
  for(const ip of ['2606:4700:4700::1111','2001:4860:4860::8888','2a00:1450:4001::200e'])assert.equal(publicIp(ip),true,ip);
});

test('v0.8 agent concurrent starts reserve one task per project',async t=>{
  const {createAgentService}=await import('../core/agent.js');
  const tmp=await mkdtemp(path.join(os.tmpdir(),'fezi-agent-race-'));
  t.after(()=>rm(tmp,{recursive:true,force:true}));
  const projectId='1234567890abcdef';
  const agent=createAgentService({
    dataRoot:tmp,
    metadata:async()=>({name:'Concurrency QA'}),
    scanFiles:async()=>({'index.html':'<html><body>QA</body></html>'}),
    saveFiles:async()=>{},
    validatePath:x=>x
  });
  const responses=await Promise.allSettled(Array.from({length:5},()=>agent.start({projectId,goal:'Improve the QA landing page',provider:'ollama',maxSteps:1})));
  const successes=responses.filter(x=>x.status==='fulfilled');
  const failures=responses.filter(x=>x.status==='rejected');
  assert.equal(successes.length,1);
  assert.equal(failures.length,4);
  for(const f of failures)assert.equal(f.reason.status,409);
  // The accepted agent continues asynchronously; let it settle before removing its workspace.
  const jobId=successes[0].value.id;
  let settled=false;
  for(let i=0;i<80;i++){
    const job=await agent.load(jobId);
    if(['failed','incomplete','completed','cancelled','interrupted'].includes(job.status)){settled=true;break;}
    await delay(40);
  }
  assert.equal(settled,true,'The short-lived test agent should settle');
});
