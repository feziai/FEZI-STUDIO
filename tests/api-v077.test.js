import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('0.77 real HTTP branded model catalog, protected diagnostics and no fake image render',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fezi-077-'));
 const p=await port(),base=`http://127.0.0.1:${p}`;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,APP_PASSWORD:'verysecurepassword-077',SESSION_SECRET:'unique-session-secret-077-lots-of-entropy',FEZI_WORKER_URL:'',DATA_DIR:dir,HOST:'127.0.0.1',PORT:String(p)},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=x.toString());
 t.after(async()=>{child.kill();await rm(dir,{recursive:true,force:true});});
 let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(base+'/health');if(r.ok){ready=true;break;}}catch{}await sleep(60);}
 assert.ok(ready,stderr);
 const h=await (await fetch(base+'/health')).json();assert.equal(h.version,'0.77.0');
 const publicR=await fetch(base+'/api/fezi/capabilities');assert.equal(publicR.status,200);
 const pub=await publicR.json();assert.equal(pub.registeredModels,18);assert.equal(pub.newModels,15);assert.equal(pub.existingModels,3);
 assert.ok(!JSON.stringify(pub).includes('Qwen'));
 assert.equal((await fetch(base+'/api/fezi/admin/models')).status,401);
 assert.equal((await fetch(base+'/api/fezi/specialist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'image',prompt:'create a picture'})})).status,401);
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'verysecurepassword-077'})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const priv=await fetch(base+'/api/fezi/admin/models',{headers:{cookie}});assert.equal(priv.status,200);
 const inventory=await priv.json();assert.equal(inventory.models.length,18);
 assert.equal(inventory.models.filter(x=>x.workerConfigured).length,0);
 const image=await fetch(base+'/api/fezi/specialist',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({role:'image',prompt:'create a picture'})});
 assert.equal(image.status,412);assert.ok((await image.json()).error.includes('not connected'));
});
