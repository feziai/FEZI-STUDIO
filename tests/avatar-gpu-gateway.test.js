import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {createServer} from 'node:http';import net from 'node:net';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function getPort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function wait(base){for(let i=0;i<90;i++){try{if((await fetch(base+'/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('not running');}
test('GPU avatar video route requires login, consent, valid files and a real MP4 Worker response',async t=>{
  const image=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const audio=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WAVEfmt '),Buffer.alloc(12)]);
  const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(16)]);
  let calls=0,auth='';
  const worker=createServer(async(req,res)=>{calls++;auth=req.headers.authorization;for await(const _ of req){}res.writeHead(200,{'content-type':'video/mp4','content-length':mp4.length});res.end(mp4);});
  const wp=await getPort();await new Promise(r=>worker.listen(wp,'127.0.0.1',r));t.after(()=>worker.close());
  const data=await mkdtemp(path.join(os.tmpdir(),'fezi-avatar-bridge-'));const p=await getPort();const base=`http://127.0.0.1:${p}`;
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,APP_PASSWORD:'verystrong-bridge-pass',SESSION_SECRET:'unique-avatar-secret-long-7777-8888',DATA_DIR:data,HOST:'127.0.0.1',PORT:String(p),AVATAR_WORKER_URL:`http://127.0.0.1:${wp}`,AVATAR_WORKER_TOKEN:'test-avatar-token-7777'},stdio:'ignore'});
  t.after(async()=>{child.kill();await rm(data,{force:true,recursive:true});});await wait(base);
  const payload={consent:true,image:image.toString('base64'),imageType:'image/png',audio:audio.toString('base64'),audioType:'audio/wav'};
  const request=(body,cookie='')=>fetch(base+'/api/avatar/render',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await request(payload)).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'verystrong-bridge-pass'})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const status=await (await fetch(base+'/api/avatar/render/status',{headers:{cookie}})).json();assert.equal(status.configured,true);assert.equal(status.realtimeStreaming,false);
  assert.equal((await request({...payload,consent:false},cookie)).status,400);
  assert.equal((await request({...payload,image:'@#$%'},cookie)).status,400);
  assert.equal((await request({...payload,imageType:'application/octet-stream'},cookie)).status,400);
  assert.equal(calls,0);
  const result=await request(payload,cookie);assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'video/mp4');
  assert.deepEqual(Buffer.from(await result.arrayBuffer()),mp4);assert.equal(auth,'Bearer test-avatar-token-7777');assert.equal(calls,1);
});
