import test from 'node:test';
import assert from 'node:assert/strict';
import {FREE_OPEN_MODELS,modelById,freeModelCatalog,generationPolicy,runLocalOpenChat,createOpenGenerationJob,getOpenGenerationJob} from '../core/open-model-hub.js';
const errStatus=async (p,status)=>assert.rejects(p,e=>e.status===status);
test('every default model has an explicit Apache 2.0 weight license and source',()=>{
  assert.ok(FREE_OPEN_MODELS.length>=15);
  assert.equal(new Set(FREE_OPEN_MODELS.map(x=>x.id)).size,FREE_OPEN_MODELS.length);
  for(const m of FREE_OPEN_MODELS){assert.equal(m.license,'Apache-2.0');assert.match(m.sourceUrl,/^https:\/\/huggingface\.co\//);assert.equal(m.freeWeights,true)}
});
test('catalog does not lie about installed weights or live inference',()=>{
  const all=freeModelCatalog({env:{FEZI_GPU_WORKER_URL:'https://gpu.example'}});
  assert.ok(all.every(x=>x.ready===false));assert.equal(all.find(x=>x.id==='wan22-i2v-14b').status,'worker-configured-unverified');
  assert.equal(generationPolicy({FEZI_OWNER_UNLIMITED:'true'}).ownerDailyQuota,null);
});
test('local chat calls an actual Ollama endpoint with the licensed model tag',async()=>{
  let url, body;
  const request=async (u,init)=>{url=u;body=JSON.parse(init.body);return new Response(JSON.stringify({message:{content:'سلام!'}}),{status:200})};
  const answer=await runLocalOpenChat({modelId:'qwen3-8b',prompt:'سلام',env:{OLLAMA_BASE_URL:'http://127.0.0.1:11434'},request});
  assert.equal(answer.answer,'سلام!');assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(body.model,'qwen3:8b');
});
test('no external requests or pretend generated media when GPU worker is unconfigured',async()=>{
  await errStatus(createOpenGenerationJob({kind:'video',modelId:'wan22-i2v-14b',prompt:'Dance naturally'},{env:{}}),503);
});
test('worker call sends actual job and reports pending, not generated',async()=>{
  let data,headers,url;
  const request=async(u,init)=>{url=u;headers=init.headers;data=JSON.parse(init.body);return new Response(JSON.stringify({jobId:'12345678-1234-4abc-8ac3-123456789abc',state:'queued'}),{status:202})};
  const result=await createOpenGenerationJob({kind:'video',modelId:'wan22-animate2-14b',prompt:'Arina moves her arms smoothly',durationSec:10},{env:{FEZI_GPU_WORKER_URL:'https://worker.example.com',FEZI_GPU_WORKER_TOKEN:'testtoken'},request});
  assert.equal(result.actualVideoGenerated,false);assert.equal(data.modelRepo,'Wan-AI/Wan2.2-Animate-2-14B-Diffusers');assert.equal(url,'https://worker.example.com/jobs');assert.equal(headers.authorization,'Bearer testtoken');
});
test('worker output is unapproved unless verified',async()=>{
  const request=async()=>new Response(JSON.stringify({state:'completed',outputs:[{name:'clip.mp4',mime:'video/mp4',approved:false}]}));
  const x=await getOpenGenerationJob('123456789abc',{env:{FEZI_GPU_WORKER_URL:'https://gpu.example'},request});
  assert.equal(x.outputReady,true);assert.equal(x.outputs[0].approved,false);
});
test('block arbitrary worker endpoints, unverified model IDs, unsafe references and unauthorized tasks',async()=>{
  const input={kind:'video',modelId:'wan22-animate2-14b',prompt:'Smooth stream motion'};
  await errStatus(createOpenGenerationJob({...input,referenceAsset:'arina/../../secrets'},{env:{FEZI_GPU_WORKER_URL:'https://worker.example'}}),400);
  await errStatus(createOpenGenerationJob({...input,modelId:'flux1-dev'},{env:{FEZI_GPU_WORKER_URL:'https://worker.example'}}),400);
  await errStatus(createOpenGenerationJob({...input,durationSec:999},{env:{FEZI_GPU_WORKER_URL:'https://worker.example'}}),400);
  await errStatus(createOpenGenerationJob({...input},{env:{FEZI_GPU_WORKER_URL:'http://remote.example'}}),412);
  assert.equal(modelById('flux1-dev'),null);
});
