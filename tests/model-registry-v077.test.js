import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_MODELS,ALL_MODELS,SPECIALISTS,catalogSummary,roleForRequest,chooseInstalledSpecialist} from '../core/model-registry.js';
import {workerConfig,runSpecialist} from '../core/specialist-worker.js';
import {rankCandidates} from '../core/fezi-router.js';
const old={FEZI_WORKER_URL:process.env.FEZI_WORKER_URL,FEZI_WORKER_TOKEN:process.env.FEZI_WORKER_TOKEN};
test('0.77 registry includes exactly 15 distinct licensed upstream models',()=>{
  assert.equal(SPECIALISTS.length,15);
  assert.equal(BASE_MODELS.length,3);assert.equal(ALL_MODELS.length,18);
  assert.equal(new Set(ALL_MODELS.map(x=>x.repository)).size,18);
  assert.equal(catalogSummary().newModels,15);
  for(const m of SPECIALISTS){assert.match(m.url,/^https:\/\/huggingface.co\//);assert.ok(['MIT','Apache-2.0'].includes(m.license));assert.ok(['worker','ollama'].includes(m.runtime));assert.ok(m.role&&m.requirements);}
  assert.equal(catalogSummary().version,'0.77.0');assert.equal(catalogSummary().modelWeightsBundled,false);
});
test('task classification distinguishes models by capability, not one universal text model',()=>{
  const data=[['یک برنامه ساده بنویس','general'],['لطفا ترجمه کن','translation'],['پوستر بساز','image'],['فیلم بساز','video'],['استخراج متن از عکس','ocr'],['صدا به متن','speech_to_text'],['متن به گفتار','text_to_speech'],['لطفا خطا را رفع کن','code_edit'],['ساخت سایت کامل','code_complex']];
  for(const [text,role] of data)assert.equal(roleForRequest(text),role,text);
});
test('model registry does not imply available model and installed selector requires exact name',()=>{
  assert.equal(chooseInstalledSpecialist('image',['qwen3:4b']),null);
  assert.equal(chooseInstalledSpecialist('code_edit',[]),null);
  assert.equal(chooseInstalledSpecialist('code_edit',['not-a-model']),null);
  assert.equal(chooseInstalledSpecialist('code_edit',['qwen2.5-coder:1.5b']).id,'code-editor');
  assert.equal(chooseInstalledSpecialist('code_complex',['qwen2.5-coder:0.5b']).id,'quick-code');
});
test('task routing prefers explicitly installed coding specialist',()=>{
  const c=rankCandidates({prompt:'رفع خطا و اصلاح باگ',providerList:[{id:'ollama',configured:true}],ollamaModels:['qwen3:0.6b','qwen2.5-coder:1.5b']});
  assert.equal(c[0].model,'qwen2.5-coder:1.5b');
});
test('worker refuses to pretend media generation exists without endpoint',async()=>{
  delete process.env.FEZI_WORKER_URL;
  await assert.rejects(runSpecialist({role:'image',prompt:'تصویر یک گربه بساز'}),e=>e.status===412);
  await assert.rejects(runSpecialist({role:'video',prompt:'create video'}),e=>e.status===412);
  await assert.rejects(runSpecialist({role:'image',prompt:'',inputs:{}}),e=>e.status===400);
});
test('reject remote worker without HTTPS and auth',()=>{
  for(const url of ['http://example.org/worker','https://user:pass@example.org/worker','file:///etc/passwd']){
    process.env.FEZI_WORKER_URL=url;
    assert.throws(()=>workerConfig());
  }
});
test('mock worker request has configured model internally, public response only FEZI AGENT',async()=>{
  process.env.FEZI_WORKER_URL='http://127.0.0.1:51990/infer';
  process.env.FEZI_WORKER_TOKEN='unit-test-secret';
  let called=0;
  const fetchImpl=async(url,options)=>{
    called++;assert.equal(url,'http://127.0.0.1:51990/infer');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.authorization,'Bearer unit-test-secret');
    const payload=JSON.parse(options.body);assert.equal(payload.model,'black-forest-labs/FLUX.1-schnell');
    return new Response(JSON.stringify({ok:true,summary:'Image created with FLUX',artifact:'https://example.org/artifact.png'}),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await runSpecialist({role:'image',prompt:'create a forest image',fetchImpl});
  assert.equal(called,1);assert.equal(result.brand,'FEZI AGENT');
  assert.ok(!JSON.stringify(result).includes('black-forest-labs'));
  assert.equal(result.status,'completed');
});
test('worker UTF-8 response split across byte boundaries remains valid Persian',async()=>{
  process.env.FEZI_WORKER_URL='http://127.0.0.1:12340/infer';
  const body=new TextEncoder().encode(JSON.stringify({ok:true,summary:'تصویر ساخته شد',artifact:'javascript:alert(1)'}));
  const fetchImpl=async()=>new Response(new ReadableStream({start(c){for(const v of body)c.enqueue(new Uint8Array([v]));c.close();}}),{status:200});
  const result=await runSpecialist({role:'image',prompt:'تصویر بساز',fetchImpl});
  assert.equal(result.summary,'تصویر ساخته شد');
  assert.equal(result.artifact,null,'Do not pass unsafe URI schemes to browser');
});
test('worker must confirm completed output, HTTP 200 alone insufficient',async()=>{
  process.env.FEZI_WORKER_URL='http://localhost:12340/';
  await assert.rejects(runSpecialist({role:'image',prompt:'draw a car',fetchImpl:async()=>new Response(JSON.stringify({ok:false,summary:'Queued'}))}),e=>e.status===502);
});
test.after(()=>{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
