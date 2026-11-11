import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rankCandidates,classifyTask,publicTask,BRAND,PERSONALITY} from '../core/fezi-router.js';

const entries=[
  {id:'local',model:'coder-mini',configured:true},
  {id:'ollama',model:'qwen2.5-coder:7b',configured:true},
  {id:'gemini',model:'gemini-2.5-flash',configured:true},
  {id:'openai',model:'gpt-4.1-mini',configured:true},
];
const input={providerList:entries,localModels:[{id:'coder-mini',installed:true},{id:'coder-plus',installed:false}],ollamaModels:['gemma3:4b','qwen2.5-coder:7b']};
test('branded frontend does not offer model or provider selection or show orchestration names',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(html.includes('FEZI <strong>AGENT</strong>'));
  assert.ok(html.includes('<select id="provider" hidden'));
  for(const text of ['Ollama','Claude','Gemini','OpenRouter','OpenHands']){
    assert.ok(!html.includes(text),`Rendered HTML includes ${text}`);
    assert.ok(!js.includes(text),`Client JavaScript includes ${text}`);
  }
  assert.ok(js.includes('/api/fezi/ai'));
  assert.ok(js.includes('/api/fezi/tasks'));
  assert.ok(js.includes('/api/fezi/status'));
});
test('classifies Persian and English tasks deterministically',()=>{
  assert.equal(classifyTask('برایم سایت بساز و کد بنویس'),'code');
  assert.equal(classifyTask('debug this Python code'),'code');
  assert.equal(classifyTask('تصویر یک گربه طراحی کن'),'image');
  assert.equal(classifyTask('translate Persian to German'),'translation');
  assert.equal(classifyTask('تحلیل عمیق و مقایسه کن'),'reasoning');
});
test('offline-only route excludes cloud and unavailable models',()=>{
  const out=rankCandidates({...input,prompt:'Build a web app',offlineOnly:true});
  assert.ok(out.length>=2);
  assert.ok(out.every(x=>x.local));
  assert.ok(!out.some(x=>x.model==='coder-plus'));
  assert.ok(!out.some(x=>x.provider==='gemini'||x.provider==='openai'));
});
test('local-first prefers installed or reachable local code model',()=>{
  const out=rankCandidates({...input,prompt:'write code',preference:'local-first'});
  assert.ok(out[0].local);
  assert.equal(out[0].model,'qwen2.5-coder:7b'); // stronger configured local coding model beats a tiny one
});
test('quality-first allows configured remote models to rank before small local',()=>{
  const out=rankCandidates({...input,prompt:'write code',preference:'quality-first'});
  assert.ok(!out[0].local);
});
test('no engine configured returns no fabricated candidates',()=>{
  assert.deepEqual(rankCandidates({prompt:'test',providerList:[{id:'ollama',configured:false}],localModels:[],ollamaModels:[]}),[]);
});
test('end-user job view cannot show internal provider, model, or diagnostics',()=>{
  const publicJob=publicTask({id:'test',provider:'anthropic',model:'claude-test',instanceId:'secret',status:'running',events:[{type:'model_fallback',summary:'Ollama switched to Claude',detail:'API secret'}],result:{summary:'Processed by Gemini',review:'Reviewed with OpenAI'}});
  assert.equal(publicJob.engine,BRAND);
  assert.ok(!('provider' in publicJob)&&!('model' in publicJob)&&!('instanceId' in publicJob));
  assert.ok(!JSON.stringify(publicJob).includes('anthropic'));
  assert.ok(!JSON.stringify(publicJob).includes('API secret'));
  assert.equal(publicJob.events[0].summary,'FEZI AGENT switched to FEZI AGENT');
});
test('branding instructions preserve truthful disclosure and required attribution',()=>{
  assert.ok(PERSONALITY.includes('be truthful'));
  assert.ok(PERSONALITY.includes('license notices'));
});
