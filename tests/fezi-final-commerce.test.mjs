import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {createModelCatalog,createCredits,decimalUnits,markup,estimateHeld,exactUsageCost} from '../core/fezi-billing-2026.mjs';
const fakeModels=[{id:'openrouter/example-free:free',name:'Free Model',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['text']}},{id:'openai/test-premium',name:'Premium Model',pricing:{prompt:'0.000001',completion:'0.000002'},architecture:{output_modalities:['text']}}];
const user='a'.repeat(32);
test('20% applies exactly to input and output token rates',()=>{
 assert.equal(decimalUnits('0.000001').toString(),'1000000');assert.equal(markup(decimalUnits('0.000001')).toString(),'1200000');assert.equal(decimalUnits('1e-7').toString(),'100000');
});
test('dynamic catalog fetches full models and labels free/paid correctly',async()=>{
 const c=createModelCatalog({fetchFn:async()=>({ok:true,json:async()=>({data:fakeModels})})});
 const s=await c.refresh();assert.equal(s.total,2);assert.equal(c.find(fakeModels[0].id).free,true);assert.equal(c.find(fakeModels[1].id).free,false);assert.equal(c.find(fakeModels[1].id).customerPerMillionUSD.prompt,'1.20000000');assert.equal(c.status({type:'paid'}).matches,1);assert.ok(c.find(fakeModels[1].id).iconUrl.startsWith('/model-assets/'));
});
test('paid wallet: invoice alone never credits user; operator verification gated',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fezi-money-'));const file=path.join(dir,'sqlite','credits.sqlite');try{
  const env={FEZI_TOMAN_PER_USD:'100000',FEZI_MANUAL_CREDIT_CONFIRM_ENABLED:'false'};
  const d=createCredits({dbFile:file,env});const order=d.createOrder(user,'starter');assert.equal(order.status,'pending');assert.equal(d.state(user).balanceUSD,'0.00000000');assert.throws(()=>d.confirmManual(order.id,{proofRef:'verified-proof-uuid-100',verifiedByOperator:true}),/disabled/);
  env.FEZI_MANUAL_CREDIT_CONFIRM_ENABLED='true';assert.throws(()=>d.confirmManual(order.id,{proofRef:'x'}),/Operator/);
  assert.equal(d.confirmManual(order.id,{proofRef:'verified-proof-uuid-100',verifiedByOperator:true}).creditedUSD,'10.00000000');
  assert.equal(d.confirmManual(order.id,{proofRef:'verified-proof-uuid-100',verifiedByOperator:true}).duplicate,true);
  const priced={upstream:{prompt:'0.000001',completion:'0.000002'}};
  const reservation=d.reserve(user,'openai/test-premium',estimateHeld(priced,1000,200));assert.ok(Number(d.state(user).reservedUSD)>0);
  const done=d.settle(reservation,exactUsageCost(priced,{prompt_tokens:100,completion_tokens:80}),{});
  assert.equal(done.chargedUSD,'0.00031200');assert.equal(d.state(user).reservedUSD,'0.00000000');
  assert.equal(d.settle(reservation,0n,{}).duplicate,true);const second=d.reserve(user,'openai/test-premium',estimateHeld(priced,100,100));d.cancel(second);assert.equal(d.state(user).reservedUSD,'0.00000000');d.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('catalog offline never invents live models',async()=>{
 const c=createModelCatalog({fetchFn:async()=>{throw new Error('network not available')}});const s=await c.refresh();assert.equal(s.total,0);assert.equal(s.stale,true);assert.ok(s.error);
});
test('unverified exchange rate cannot create invoices',()=>{
 const ddir=fs.mkdtempSync(path.join(os.tmpdir(),'fezi-credit-'));try{const d=createCredits({dbFile:path.join(ddir,'db.sqlite'),env:{}});assert.throws(()=>d.createOrder(user,'starter'),/rate/);d.close()}finally{fs.rmSync(ddir,{recursive:true,force:true})}
});
test('usage accounting honors actual provider cost including caching and extra charges',()=>{
 const priced={upstream:{prompt:'0.000001',completion:'0.000002'}};
 assert.equal(exactUsageCost(priced,{cost:0.004,prompt_tokens:1,completion_tokens:1}).toString(),'4800000000');
});
test('paid image generation is never mislabeled as a free text-chat model',async()=>{
 const c=createModelCatalog({fetchFn:async()=>({ok:true,json:async()=>({data:[{id:'images/test',name:'Image',pricing:{prompt:'0',completion:'0',image_output:'0.02'},architecture:{output_modalities:['image']}}]})})});
 await c.refresh();const model=c.find('images/test');assert.equal(model.free,false);assert.equal(model.billingSupported,false);
});
