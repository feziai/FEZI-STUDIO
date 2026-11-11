import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function ready(url){for(let i=0;i<75;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,70));}throw Error('Server not ready');}
test('live avatar route, independent assets, live template and ZIP export are functional',async t=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'fezi-live-avatar-'));
 const port=await freePort(),url='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,APP_PASSWORD:'strongpassword-live-avatar',SESSION_SECRET:'strong-secret-live-avatar-1111111111111',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data},stdio:'ignore'});
 t.after(async()=>{child.kill();await rm(data,{recursive:true,force:true});});await ready(url);
 for(const [endpoint,type,needle] of [['/avatar','text/html','FEZI AGENT'],['/avatar/assets/avatar.css','text/css','stage-panel'],['/avatar/assets/avatar.js','application/javascript','speechSynthesis'],['/avatar/assets/engine.js','application/javascript','smoothEnergy']]){
  const r=await fetch(url+endpoint);assert.equal(r.status,200,endpoint);assert.ok(r.headers.get('content-type').includes(type));assert.ok((await r.text()).includes(needle));
 }
 assert.equal((await fetch(url+'/avatar/assets/../../.env')).status,401);
 const login=await fetch(url+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'strongpassword-live-avatar'})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const p=await fetch(url+'/api/projects',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({name:'Live Arina',template:'live_avatar'})});assert.equal(p.status,201);
 const id=(await p.json()).project.id;
 const project=await (await fetch(url+'/api/project?id='+id,{headers:{cookie}})).json();
 assert.deepEqual(Object.keys(project.files).sort(),['README.md','engine.js','index.html','script.js','style.css']);
 assert.ok(project.files['index.html'].includes('./script.js'));
 assert.ok(!project.files['index.html'].includes('/avatar/assets/'));
 const exp=await fetch(url+'/api/export?id='+id,{headers:{cookie}});assert.equal(exp.status,200);
 const zip=Buffer.from(await exp.arrayBuffer());assert.equal(zip.readUInt32LE(0),0x04034b50); assert.ok(zip.length>1000);
});
