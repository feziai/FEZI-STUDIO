import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseCatalog,createFeziDiscovery} from '../core/fezi-discovery.mjs';

test('OpenRouter catalog includes ONLY explicitly :free zero-priced models',()=>{
 const a=parseCatalog('openrouter',{data:[{id:'openrouter/free',pricing:{prompt:'0',completion:'0'}},{id:'example/small:free',pricing:{prompt:'0',completion:'0'}},{id:'example/paid',pricing:{prompt:'0.01',completion:'0'}},{id:'example/paid:free',pricing:{prompt:'0',completion:'0.01'}}]});
 assert.deepEqual(a.map(x=>x.id),['openrouter/free','example/small:free']);
});
test('HuggingFace gated weights and unlicensed GitHub projects filtered',()=>{
 assert.equal(parseCatalog('huggingface',[{id:'test/free',gated:false},{id:'test/private',gated:'auto'}]).length,1);
 assert.equal(parseCatalog('github',{items:[{full_name:'owner/good',name:'good',license:{spdx_id:'MIT'},html_url:'https://github.com/owner/good'},{full_name:'owner/unknown',license:null}]}).length,1);
});
test('Daily catalog refresh persists and reuses stale data if a provider fails',async t=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-discovery-'));t.after(()=>fs.rm(dataDir,{recursive:true,force:true}));
 let fail=false;const fetchImpl=async url=>{if(fail)throw Error('network down');const data=url.includes('openrouter')?{data:[{id:'openrouter/free',pricing:{prompt:'0',completion:'0'}}]}:url.includes('huggingface')?[{id:'test/model',gated:false}]:{items:[]};return {ok:true,json:async()=>data}};
 const c=createFeziDiscovery({dataDir,fetchImpl,now:()=>Date.UTC(2026,10,8)});await c.init();const v=await c.refresh();assert.equal(v.count,2);assert.equal(v.providers.openrouter.status,'ok');fail=true;await c.refresh();assert.equal(c.view().entries.length,2);assert.equal(c.view().providers.github.status,'error');
 const c2=createFeziDiscovery({dataDir,fetchImpl});await c2.init();assert.equal(c2.view().entries.length,2);
});
