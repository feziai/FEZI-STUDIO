import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createProgressStore,getCatalog,getTask,listTasks,recommendTaskModel} from '../core/academy.js';

// Exhaustively read every shard: this validates all 103,017 generated task records
// without falsely counting those records as LLM inference or model training.
test('academy integrity: every generated task in every category is parseable, unique and correctly indexed',async()=>{
  const catalog=await getCatalog();assert.equal(catalog.total_tasks,103017);assert.equal(catalog.categories.length,23);
  const hashes=new Set();let count=0;
  for(const c of catalog.categories){
    let seen=0;
    for(let page=1;page<=Math.ceil(c.count/50);page++){
      const batch=await listTasks({category:c.id,page,limit:50});
      for(const t of batch.items){
        assert.equal(t.category,c.id);assert.ok(t.task.length>75);assert.equal(t.acceptance_criteria.length,5);
        assert.equal(t.id,`${c.id}-${String(++seen).padStart(5,'0')}`);
        assert.ok(!hashes.has(t.task),'Duplicate task text');hashes.add(t.task);
        assert.ok(t.acceptance_criteria.every(x=>typeof x==='string'&&x.length>15));
        if(c.id==='adult_content')assert.match(t.safety_scope,/بزرگسالان/);
        if(c.id==='site_recreation')assert.match(t.safety_scope,/مجوز/);
      }
    }
    assert.equal(seen,c.count);count+=seen;
  }
  assert.equal(count,103017);
  assert.equal((await getTask('deployment-00001')).category,'deployment');
  assert.equal((await getTask('self_learning-00850')).category,'self_learning');
});

test('academy rejects traversal, invalid categories and oversized pages',async()=>{
  for(const id of ['../secret','site_security-00000','site_security-99999','adult_content-%2e%2e','']){
    await assert.rejects(()=>getTask(id));
  }
  await assert.rejects(()=>listTasks({category:'../../etc/passwd'}));
  await assert.rejects(()=>listTasks({category:'deployment',page:-1}));
  await assert.rejects(()=>listTasks({category:'deployment',limit:51}));
});

test('model recommendations are candid heuristics with offline filter',async()=>{
  const out=await recommendTaskModel({taskId:'model_routing-00001',offlineOnly:true});
  assert.equal(out.benchmarkVerified,false);assert.equal(out.capability,'reasoning');
  assert.ok(out.candidates.every(x=>x.provider!=='openai'&&x.provider!=='gemini'));
  await assert.rejects(()=>recommendTaskModel({taskId:'bad-task'}));
});

test('progress is persisted and accurately labeled self-reported',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fezi-academy-'));
  try{
    const store=createProgressStore(dir);
    await assert.rejects(()=>store.record({taskId:'deployment-00001',status:'hacked'}));
    await assert.rejects(()=>store.record({taskId:'deployment-00001',status:'passed',score:7}));
    await Promise.all(Array.from({length:20},(_,i)=>store.record({taskId:`conversation-${String(i+1).padStart(5,'0')}`,status:i%2?'passed':'needs_review',score:i%2?4:1})));
    await store.record({taskId:'conversation-00001',status:'passed',notes:'fixed issue',score:5});
    const summary=await store.summary();assert.equal(summary.uniqueTasks,20);assert.equal(summary.counts.passed,11);
    assert.equal(summary.verifiedByModel,false);
    const contents=await readFile(path.join(dir,'academy','progress.jsonl'),'utf8');assert.equal(contents.trim().split('\n').length,21);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('academy HTTP endpoints require login and MCP bearer auth',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fezi-academy-server-'));
  const port=40000+Math.floor(Math.random()*10000);
  const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',APP_PASSWORD:'academy-test-password-strong',SESSION_SECRET:'academy-test-session-secret-0123456789',DATA_DIR:dir,MCP_DEV_TOKEN:'academy-test-mcp-strong-0123456789'},stdio:['ignore','pipe','pipe']});
  let stderr='';app.stderr.on('data',x=>stderr+=x);
  t.after(async()=>{app.kill();await rm(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${port}`;
  let running=false;
  for(let i=0;i<100;i++){try{const r=await fetch(base+'/health');if(r.ok){running=true;break;}}catch{}await new Promise(r=>setTimeout(r,75));}
  assert.ok(running,stderr);
  const req=(p,m='GET',body,cookie='',token='')=>fetch(base+p,{method:m,headers:{'content-type':'application/json',...(cookie?{cookie}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  let r=await req('/api/academy/catalog');assert.equal(r.status,401);
  r=await req('/api/login','POST',{password:'academy-test-password-strong'});assert.equal(r.status,200,stderr);const cookie=r.headers.get('set-cookie').split(';')[0];
  r=await req('/api/academy/catalog','GET',null,cookie);assert.equal(r.status,200);const cat=await r.json();assert.equal(cat.total_tasks,103017);
  r=await req('/api/academy/tasks?category=chatgpt_mcp&page=2&limit=3','GET',null,cookie);assert.equal(r.status,200);assert.equal((await r.json()).items[0].id,'chatgpt_mcp-00004');
  r=await req('/api/academy/task?id=adult_content-00001','GET',null,cookie);assert.equal(r.status,200);assert.match((await r.json()).task.safety_scope,/رضایتمند/);
  r=await req('/api/academy/progress','POST',{taskId:'deployment-00001',status:'started'},cookie);assert.equal(r.status,201,stderr);
  r=await req('/api/academy/progress','GET',null,cookie);assert.equal((await r.json()).counts.started,1);
  r=await req('/api/academy/attempt','POST',{taskId:'deployment-00001',provider:'unconfigured'},cookie);assert.equal(r.status,412);
  r=await req('/api/academy/recommend?id=deployment-00001','GET',null,cookie);assert.equal((await r.json()).benchmarkVerified,false);
  const rpc={jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'academy_get_task',arguments:{task_id:'deployment-00001'}}};
  r=await req('/mcp','POST',rpc);assert.equal(r.status,401);
  r=await req('/mcp','POST',rpc,'','academy-test-mcp-strong-0123456789');assert.equal(r.status,200,stderr);assert.match(JSON.stringify(await r.json()),/deployment-00001/);
  r=await req('/mcp','POST',{jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'academy_catalog',arguments:{}}},'','academy-test-mcp-strong-0123456789');assert.equal(r.status,200);assert.match(JSON.stringify(await r.json()),/103017/);
});

test('academy attempt sends a real HTTP request to configured provider and marks it unreviewed',async t=>{
  const {createServer}=await import('node:http');
  let requests=0;
  const mock=createServer(async(req,res)=>{
    if(req.url!=='/api/chat'){res.writeHead(404).end();return;}
    requests++;let raw='';for await(const c of req)raw+=c;
    assert.match(JSON.parse(raw).messages[1].content,/GitHub Actions/);
    res.setHeader('content-type','application/json');res.end(JSON.stringify({message:{content:'{"result":"checked","steps":["plan","test"]}'}}));
  });
  await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
  const dir=await mkdtemp(path.join(os.tmpdir(),'fezi-academy-inference-'));
  const port=39000+Math.floor(Math.random()*9000);
  const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',APP_PASSWORD:'academy-test-password-strong',SESSION_SECRET:'academy-test-session-secret-0123456789',DATA_DIR:dir,OLLAMA_BASE_URL:'http://127.0.0.1:'+mock.address().port},stdio:['ignore','pipe','pipe']});
  let stderr='';app.stderr.on('data',c=>stderr+=c);
  t.after(async()=>{app.kill();mock.close();await rm(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${port}`;
  let ready=false;
  for(let i=0;i<70;i++){try{const r=await fetch(base+'/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,60));}
  assert.ok(ready,stderr);
  let r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'academy-test-password-strong'})});
  const cookie=r.headers.get('set-cookie').split(';')[0];
  r=await fetch(base+'/api/academy/attempt',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({taskId:'deployment-00001',provider:'ollama',model:'fezi-test'})});
  assert.equal(r.status,200,stderr);const data=await r.json();assert.equal(data.reviewed,false);assert.equal(data.executionPerformed,false);assert.equal(data.mediaFileGenerated,false);assert.match(data.text,/checked/);assert.equal(requests,1);
  r=await fetch(base+'/api/academy/progress',{headers:{cookie}});assert.equal((await r.json()).counts.submitted,1);
});
