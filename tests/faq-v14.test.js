import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {officialFaq,createFaqCommunity} from '../core/faq-community.js';
test('v1.4 keeps exactly 40 curated official FAQs in six categories',()=>{
  assert.equal(officialFaq.length,40);
  assert.equal(new Set(officialFaq.map(x=>x.id)).size,40);
  assert.ok(new Set(officialFaq.map(x=>x.category)).size>=6);
});
test('Community FAQ is moderated, persisted and does not reveal pending questions',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-faq-'));
  try{
    const a=createFaqCommunity({dataDir:dir});await a.init();
    assert.equal(a.published().length,40);
    const q=await a.ask({nickname:'Guest',question:'How do I deploy this to my Node.js hosting?'},'127.0.0.1');
    assert.equal(q.status,'pending');assert.equal(a.published().length,40);
    assert.equal(a.pending().length,1);
    await assert.rejects(a.review(q.id,'approve',''),/Answer/);
    await a.review(q.id,'approve','Please set your hosting environment variables first.');
    assert.equal(a.published().length,41);
    await a.rate('faq-01',5,'test-session-number-0001');
    await a.rate('faq-01',2,'test-session-number-0001');
    assert.equal(a.published()[0].ratings.count,1);
    assert.equal(a.published()[0].ratings.avg,2);
    assert.equal((await (async()=>{const b=createFaqCommunity({dataDir:dir});await b.init();return b.published()})()).length,41);
  }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('FAQ input rejects short questions, overlong nicknames, invalid ratings and unknown ids',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-faq-'));
  try{
    const a=createFaqCommunity({dataDir:dir});await a.init();
    await assert.rejects(a.ask({question:'short'},'10.1.2.3'));
    await assert.rejects(a.ask({nickname:'a'.repeat(70),question:'This question is long enough to accept.'},'10.1.2.4'));
    await assert.rejects(a.rate('faq-01',6,'test-session-number-0002'));
    await assert.rejects(a.rate('does-not-exist',1,'test-session-number-0002'));
  }finally{await fs.rm(dir,{recursive:true,force:true})}
});
