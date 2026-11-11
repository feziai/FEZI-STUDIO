import test from 'node:test';
import assert from 'node:assert/strict';
import {askProvider,providers} from '../integrations.js';
import {automaticCandidates} from '../core/fezi-router.js';

test('OpenRouter always defaults to free without allowing auto/paid', async()=>{
  process.env.OPENROUTER_API_KEY='TEST_ONLY_NOT_A_REAL_TOKEN';
  process.env.OPENROUTER_MODEL='openrouter/auto';
  assert.equal(providers().find(p=>p.id==='openrouter').model,'openrouter/free');
  await assert.rejects(askProvider({provider:'openrouter',model:'openai/gpt-4.1',system:'',user:'hello'}),/Paid OpenRouter models/);
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
});
test('free-only auto candidates include OpenRouter after setting key, without local GPU',async()=>{
  process.env.OPENROUTER_API_KEY='TEST_ONLY_NOT_A_REAL_TOKEN';
  process.env.FEZI_AGENT_FREE_ONLY='true';
  delete process.env.FEZI_FREE_ROUTING_ENABLED;
  const c=await automaticCandidates('Build a website');
  assert.ok(c.some(x=>x.provider==='openrouter'&&x.model==='openrouter/free'));
  assert.ok(!c.some(x=>x.provider==='ollama-cloud'));
  delete process.env.OPENROUTER_API_KEY;
});
test('cloud Ollama is opt-in and never silently configured',()=>{
  process.env.OLLAMA_API_KEY='TEST_ONLY_NOT_A_REAL_TOKEN';
  process.env.OLLAMA_CLOUD_MODEL='gemma4:31b';
  process.env.OLLAMA_CLOUD_ENABLED='false';
  assert.equal(providers().find(x=>x.id==='ollama-cloud').configured,false);
  delete process.env.OLLAMA_API_KEY;
  delete process.env.OLLAMA_CLOUD_MODEL;
  delete process.env.OLLAMA_CLOUD_ENABLED;
});
