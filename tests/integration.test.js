import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.join(here,'..');
const mock=createServer(async(req,res)=>{
  if(req.url==='/api/tags') {res.setHeader('content-type','application/json');res.end(JSON.stringify({models:[{name:'gemma3:4b'},{name:'qwen2.5-coder:7b'}]}));return;}
  if(req.url==='/api/chat') {let body='';for await(const x of req)body+=x;const prompt=JSON.parse(body);assert.equal(prompt.stream,false);res.setHeader('content-type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify({summary:'Added a feature',files:[{path:'script.js',content:'document.body.dataset.test="success";'}]})}}));return;}
  res.writeHead(404).end();
});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return server.address().port;}
async function retry(baseUrl){for(let i=0;i<60;i++){try{const response=await fetch(baseUrl+'/health');if(response.ok)return;}catch{}await new Promise(r=>setTimeout(r,70));}throw Error('server failed to start');}
test('login, project, files, export and AI proposal', async t=>{
  const mockPort=await listen(mock);
  const data=await mkdtemp(path.join(os.tmpdir(),'fezi-studio-test-'));
  const port=35000+Math.floor(Math.random()*10000);
  const proc=spawn('node',['server.js'],{cwd:base,env:{...process.env,APP_PASSWORD:'test-strong-passphrase',SESSION_SECRET:'test-another-long-session-secret',PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,BASE_DOMAIN:'example.test',PUBLISHED_ROOT:path.join(data,'published'),MCP_DEV_TOKEN:'test-mcp-credential-0123456789-strong',OLLAMA_BASE_URL:'http://127.0.0.1:'+mockPort},stdio:['ignore','pipe','pipe']});
  let stderr='';proc.stderr.on('data',d=>stderr+=d);
  t.after(async()=>{proc.kill();mock.close();await rm(data,{recursive:true,force:true});});
  const url='http://127.0.0.1:'+port;
  await retry(url);
  const rq=async(endpoint,method='GET',body,cookie='')=>fetch(url+endpoint,{method,headers:{'content-type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
  let r=await rq('/api/projects');assert.equal(r.status,401);
  r=await rq('/api/login','POST',{password:'bad'});assert.equal(r.status,401);
  r=await rq('/api/login','POST',{password:'test-strong-passphrase'});assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('bg_session='));
  r=await rq('/api/me','GET',null,cookie);{const info=await r.json();assert.deepEqual(info.providers.map(x=>x.id),['auto']);assert.equal(info.brand,'FEZI AGENT');assert.ok(!('defaultModel' in info));}
  r=await rq('/api/fezi/status','GET',null,cookie);assert.equal(r.status,200);{const info=await r.json();assert.equal(info.engine,'FEZI AGENT');assert.equal(info.ready,true);assert.ok(!('models' in info));}
  r=await rq('/api/projects','POST',{name:'Demo',template:'landing'},cookie);assert.equal(r.status,201,stderr);
  const {project}=await r.json();assert.match(project.id,/^[a-f0-9]{16}$/);
  r=await rq('/api/project?id='+project.id,'GET',null,cookie);assert.equal(r.status,200);
  const obj=await r.json();assert.ok(obj.files['index.html'].includes('FEZI AGENT'));
  r=await rq('/api/desktop/tools','GET',null,cookie);assert.equal(r.status,200);{const tools=(await r.json()).tools;assert.equal(tools.length,10);}
  r=await rq('/api/desktop/export?id='+project.id,'GET',null,cookie);assert.equal(r.status,200);
  {const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.includes(Buffer.from('AGENTS.md')));assert.ok(bytes.includes(Buffer.from('.vscode/settings.json')));}
  r=await rq('/api/save','POST',{id:project.id,files:[{path:'../bad.js',content:'x'}]},cookie);assert.equal(r.status,400);
  r=await rq('/api/save','POST',{id:project.id,files:[{path:'assets/info.txt',content:'some data'}]},cookie);assert.equal(r.status,200);
  r=await rq('/api/export?id='+project.id,'GET',null,cookie);assert.equal(r.status,200);const zip=Buffer.from(await r.arrayBuffer());assert.equal(zip.readUInt32LE(0),0x04034b50);assert.ok(zip.includes(Buffer.from('assets/info.txt')));
  r=await rq('/api/build/export','POST',{id:project.id,kind:'pwa'},cookie);assert.equal(r.status,200,stderr);
  let pwaZip=Buffer.from(await r.arrayBuffer());assert.ok(pwaZip.includes(Buffer.from('manifest.webmanifest')));
  r=await rq('/api/build/export','POST',{id:project.id,kind:'mobile',appId:'ai.fezi.demo'},cookie);assert.equal(r.status,200,stderr);
  const mobileZip=Buffer.from(await r.arrayBuffer());assert.ok(mobileZip.includes(Buffer.from('capacitor.config.json')));
  assert.ok(mobileZip.includes(Buffer.from('build-android-apk.yml')));
  r=await rq('/api/build/export','POST',{id:project.id,kind:'ios',appId:'not-a-package-id'},cookie);assert.equal(r.status,400);
  r=await rq('/api/models','GET',null,cookie);const mods=await r.json();assert.equal(mods.connected,true);assert.equal(mods.models.length,2);
  r=await rq('/api/ai','POST',{id:project.id,prompt:'Add a simple test function',model:'gemma3:4b',provider:'ollama'},cookie);assert.equal(r.status,200,stderr);const proposal=await r.json();assert.equal(proposal.files[0].path,'script.js');
  r=await rq('/api/fezi/ai','POST',{id:project.id,prompt:'Add JavaScript event handling',provider:'anthropic',model:'other-model'},cookie);assert.equal(r.status,200,stderr);{const whiteLabel=await r.json();assert.equal(whiteLabel.engine,'FEZI AGENT');assert.ok(!('provider' in whiteLabel)&&!('model' in whiteLabel));assert.equal(whiteLabel.files[0].path,'script.js');}
  r=await rq('/api/project?id='+project.id,'GET',null,cookie);const before=await r.json();assert.ok(!before.files['script.js'].includes('dataset.test'));
  r=await rq('/api/save','POST',{id:project.id,files:proposal.files},cookie);assert.equal(r.status,200);
  r=await rq('/api/project?id='+project.id,'GET',null,cookie);const after=await r.json();assert.ok(after.files['script.js'].includes('dataset.test'));
  r=await rq('/api/providers','GET',null,cookie);assert.equal(r.status,200);const allProviders=(await r.json()).providers;assert.ok(allProviders.some(p=>p.id==='gemini'));assert.ok(allProviders.some(p=>p.id==='anthropic'));
  r=await rq('/api/publish','POST',{id:project.id,slug:'demo'},cookie);assert.equal(r.status,400); // explicit confirmation
  r=await rq('/api/publish','POST',{id:project.id,slug:'demo',confirm:true},cookie);assert.equal(r.status,200,stderr);assert.equal((await r.json()).published.url,'https://demo.example.test');
  r=await fetch(url+'/',{headers:{host:'demo.example.test'}});assert.equal(r.status,200);assert.ok((await r.text()).includes('FEZI AGENT'));
  const mcp=async body=>fetch(url+'/mcp',{method:'POST',headers:{'authorization':'Bearer test-mcp-credential-0123456789-strong','content-type':'application/json','accept':'application/json, text/event-stream'},body:JSON.stringify(body)});
  r=await mcp({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}});assert.equal(r.status,200);assert.equal((await r.json()).result.serverInfo.name,'fezi-agent-dev');
  r=await mcp({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_projects',arguments:{}}});assert.equal(r.status,200);assert.ok(JSON.stringify(await r.json()).includes(project.id));
  r=await mcp({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'apply_file_change',arguments:{project_id:project.id,path:'script.js',content:'new',confirm:false}}});assert.equal((await r.json()).result.isError,true);
  // v0.4: autonomous task writes files, logs progress and creates checkpoint.
  r=await rq('/api/tasks','POST',{id:project.id,goal:'Improve the interactive landing page',provider:'ollama',model:'gemma3:4b',maxSteps:4},cookie);
  assert.equal(r.status,202,stderr);
  const taskId=(await r.json()).task.id;assert.match(taskId,/^[a-f0-9]{20}$/);
  let task;
  for(let i=0;i<100;i++){
    r=await rq('/api/task?taskId='+taskId,'GET',null,cookie);
    assert.equal(r.status,200);
    task=(await r.json()).task;
    if(['completed','failed','incomplete'].includes(task.status))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  r=await rq('/api/fezi/task?taskId='+taskId,'GET',null,cookie);{const publicStatus=(await r.json()).task;assert.equal(publicStatus.engine,'FEZI AGENT');assert.ok(!('model' in publicStatus)&&!('provider' in publicStatus));}
  // The mocked provider repeats the same edit forever; the agent must report INCOMPLETE, not a false success.
  assert.equal(task.status,'incomplete',stderr+JSON.stringify(task));
  assert.ok(task.checkpointId);
  assert.ok(task.events.some(x=>x.type==='edit'));
  r=await rq('/api/snapshots?id='+project.id,'GET',null,cookie);
  assert.ok((await r.json()).snapshots.some(x=>x.id===task.checkpointId));
  r=await rq('/api/snapshots/restore','POST',{id:project.id,snapshotId:task.checkpointId,confirm:false},cookie);
  assert.equal(r.status,400);
  r=await rq('/api/snapshots/restore','POST',{id:project.id,snapshotId:task.checkpointId,confirm:true},cookie);
  assert.equal(r.status,200,stderr);
  r=await rq('/api/projects','POST',{name:'JS API',template:'node'},cookie);assert.equal(r.status,201);
  const nodeProject=(await r.json()).project;
  r=await rq('/api/project?id='+nodeProject.id,'GET',null,cookie);
  assert.ok((await r.json()).files['server.js'].includes('createServer'));
  r=await rq('/api/projects','POST',{name:'UI',template:'react'},cookie);assert.equal(r.status,201);
  r=await rq('/api/website/import','POST',{id:project.id,url:'http://127.0.0.1:3000',confirm:true},cookie);assert.equal(r.status,403);
  r=await mcp({jsonrpc:'2.0',id:7,method:'tools/list',params:{}});
  const mcpTools=(await r.json()).result.tools.map(x=>x.name);
  assert.ok(mcpTools.includes('start_agent_task'));
  assert.ok(mcpTools.includes('get_agent_task'));
  r=await rq('/api/save','POST',{id:project.id,files:[{path:'.env',content:'secret'}]},cookie);
  assert.equal(r.status,400);
  r=await rq('/api/logout','POST',null,cookie);assert.equal(r.status,200);
  r=await rq('/','GET');assert.equal(r.status,200);assert.ok((await r.text()).includes('FEZI AGENT'));
});
