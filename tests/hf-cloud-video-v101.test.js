import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createHfCloudVideo,HF_CLOUD_VIDEO_MODELS} from '../core/hf-cloud-video-v101.js';
class FakeRes{
  headers={};code=0;data=Buffer.alloc(0);
  writeHead(status,headers){this.code=status;this.headers=headers}
  end(bytes){this.data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes||'')}
  get json(){return JSON.parse(this.data.toString('utf8'))}
}
function request(method,url,body,userId='u1'){
  const r=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
  Object.assign(r,{method,url,userId});return r;
}
async function call(s,method,url,body,user='u1'){
  const req=request(method,url,body,user),res=new FakeRes();
  await s.handle(req,res,url);return res;
}
const goodMp4=()=>{const b=Buffer.alloc(256);b.write('ftyp',4,'ascii');return b};
const env={HF_TOKEN:'hf_test_not_real',FEZI_HF_VIDEO_ENABLED:'true',FEZI_HF_VIDEO_COST_APPROVED:'true',FEZI_HF_VIDEO_ALLOWED_MODELS:'wan22',FEZI_HF_VIDEO_GLOBAL_DAILY_LIMIT:'2',FEZI_HF_VIDEO_USER_DAILY_LIMIT:'1'};
const studio={getAccount:r=>r.userId?{id:r.userId}:null};
const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
async function setup(options={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-cloud-'));const service=createHfCloudVideo({dataDir:dir,studio,env:{...env,...options.env},generate:options.generate|| (async()=>goodMp4()),now:()=>Date.parse('2026-11-04T12:00:00Z')});await service.init();return {service,dir}}
test('catalog contains official Wan 2.2 model, with no Wan2.Video scraper',()=>{
 assert.ok(HF_CLOUD_VIDEO_MODELS.some(m=>m.hfModel==='Wan-AI/Wan2.2-TI2V-5B'));
 assert.ok(!HF_CLOUD_VIDEO_MODELS.some(m=>m.provider==='wan2.video'));
});
test('provider is disabled unless both authorization gates are explicit',async()=>{
 for(const extra of [{FEZI_HF_VIDEO_ENABLED:'false'},{FEZI_HF_VIDEO_COST_APPROVED:'false'},{HF_TOKEN:''}]){
   const {service,dir}=await setup({env:extra});
   const r=await call(service,'GET','/api/fezi-cloud-video/status');assert.equal(r.json.ready,false);
   await assert.rejects(()=>call(service,'POST','/api/fezi-cloud-video/jobs',{prompt:'a cinematic video prompt'}),/not yet enabled/);
   await fs.rm(dir,{recursive:true,force:true});
 }
});
test('approved provider returns exact status, no secrets',async()=>{
 const {service,dir}=await setup();const r=await call(service,'GET','/api/fezi-cloud-video/status');
 assert.equal(r.json.ready,true);assert.equal(r.json.maxUserDaily,1);assert.equal(r.json.providerCostPossible,true);assert.equal(r.json.models.find(m=>m.id==='wan22').ready,true);
 assert.equal(r.data.toString().includes(env.HF_TOKEN),false);await fs.rm(dir,{recursive:true,force:true});
});
test('unauthenticated user cannot queue generation',async()=>{
 const {service,dir}=await setup();await assert.rejects(()=>call(service,'POST','/api/fezi-cloud-video/jobs',{model:'wan22',prompt:'A realistic blue futuristic scene'},null),e=>e.status===401);await fs.rm(dir,{recursive:true,force:true});
});
test('queued video becomes a real private MP4; model and provider fixed',async()=>{
 let args;const {service,dir}=await setup({generate:async (x)=>{args=x;await wait(15);return goodMp4()}});
 const response=await call(service,'POST','/api/fezi-cloud-video/jobs',{model:'wan22',prompt:'A tranquil sky with soft sunlight',duration:5});
 assert.equal(response.code,202);const id=response.json.id;assert.match(id,/^[a-f0-9]{32}$/);
 assert.equal(response.json.videoUrl,null);
 await wait(75);
 const status=await call(service,'GET','/api/fezi-cloud-video/jobs/'+id);assert.equal(status.json.status,'completed');assert.equal(args.model.hfModel,'Wan-AI/Wan2.2-TI2V-5B');
 const out=await call(service,'GET','/api/fezi-cloud-video/result/'+id);assert.equal(out.code,200);assert.equal(out.headers['content-type'],'video/mp4');assert.equal(out.data.toString('ascii',4,8),'ftyp');
 assert.match(out.headers['content-disposition'],/^inline/);
 await assert.rejects(()=>call(service,'GET','/api/fezi-cloud-video/result/'+id,undefined,'other'),e=>e.status===404);
 await fs.rm(dir,{recursive:true,force:true});
});
test('per-user quota enforced after an accepted job',async()=>{
 const {service,dir}=await setup();const b={model:'wan22',prompt:'An astronaut in a cinematic sequence'};
 const a=await call(service,'POST','/api/fezi-cloud-video/jobs',b);assert.equal(a.code,202);await wait(50);
 await assert.rejects(()=>call(service,'POST','/api/fezi-cloud-video/jobs',b),e=>e.status===429);
 await fs.rm(dir,{recursive:true,force:true});
});
test('global quota enforced even across users',async()=>{
 const {service,dir}=await setup();const b={model:'wan22',prompt:'An astronaut in a cinematic sequence'};
 await call(service,'POST','/api/fezi-cloud-video/jobs',b,'u1');await wait(50);
 await call(service,'POST','/api/fezi-cloud-video/jobs',b,'u2');await wait(50);
 await assert.rejects(()=>call(service,'POST','/api/fezi-cloud-video/jobs',b,'u3'),e=>e.status===429);
 await fs.rm(dir,{recursive:true,force:true});
});
test('unapproved model rejected, no upstream call made',async()=>{
 let used=false;const {service,dir}=await setup({generate:async()=>{used=true;return goodMp4()}});
 await assert.rejects(()=>call(service,'POST','/api/fezi-cloud-video/jobs',{model:'ltx',prompt:'A beautiful nature sequence'}),e=>e.status===422);
 assert.equal(used,false);await fs.rm(dir,{recursive:true,force:true});
});
test('provider failure cannot fabricate success and leaks no error details',async()=>{
 const {service,dir}=await setup({generate:async()=>{throw Error('private token and provider debug')}});
 const r=await call(service,'POST','/api/fezi-cloud-video/jobs',{model:'wan22',prompt:'A cinematic blue screen animation'});
 await wait(55);const state=await call(service,'GET','/api/fezi-cloud-video/jobs/'+r.json.id);
 assert.equal(state.json.status,'failed');assert.ok(!JSON.stringify(state.json).includes('private token'));await fs.rm(dir,{recursive:true,force:true});
});
test('after restart orphan jobs are interrupted instead of auto-retried',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-cloud-restart-'));const folder=path.join(dir,'hf-cloud-video-v101');await fs.mkdir(folder,{recursive:true});
 const id='a'.repeat(32);await fs.writeFile(path.join(folder,'jobs.json'),JSON.stringify({jobs:{[id]:{id,userId:'u1',model:'wan22',status:'running',createdAt:'2026-11-04T12:00:00.000Z',updatedAt:'2026-11-04T12:00:00.000Z'}}}));
 const s=createHfCloudVideo({dataDir:dir,studio,env});await s.init();const r=await call(s,'GET','/api/fezi-cloud-video/jobs/'+id);assert.equal(r.json.status,'interrupted');await fs.rm(dir,{recursive:true,force:true});
});
