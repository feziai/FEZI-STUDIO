import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createArinaSharedRadio,RADIO_STATIONS} from '../core/arina-shared-radio.js';
const alice='s_'+'a'.repeat(32),bob='s_'+'b'.repeat(32);
const setup=async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-arina-shared-radio-'));
 let clock=1_000_000_000;
 const events=[];
 const radio=createArinaSharedRadio({dataDir:dir,now:()=>clock,onChange:r=>events.push(r)});
 await radio.init();
 return {dir,radio,events,advance:ms=>clock+=ms,getTime:()=>clock};
};
test('every viewer sees one global station; private balance is not public',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 assert.equal(x.radio.publicState().stationId,'zeno');
 assert.equal((await x.radio.register(alice)).wallet.tokens,2);
 assert.equal((await x.radio.register(bob)).wallet.tokens,2);
 let changed=await x.radio.switchStation(alice,'swr3');
 assert.equal(changed.payment,'earned_token');
 assert.equal(changed.wallet.remainingSwitches,5);
 assert.equal(x.radio.snapshot(bob).radio.stationId,'swr3');
 assert.equal(x.events.length,1);
 assert.equal(JSON.stringify(x.radio.publicState()).includes('tokens'),false);
});
test('one token per five connected minutes, worth exactly three switches',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 await x.radio.register(alice);
 let earned=0;
 for(let i=0;i<11;i++){x.advance(30_000);earned+=(await x.radio.attendance(alice,{connected:true})).earned;}
 assert.equal(earned,1);assert.equal(x.radio.privateState(alice).tokens,3);
 assert.equal(x.radio.privateState(alice).remainingSwitches,9);
 x.advance(7*60_000);
 assert.equal((await x.radio.attendance(alice,{connected:true})).earned,0,'no background windfall');
 await x.radio.attendance(alice,{connected:false});
});
test('global cooldown and personal cooldown cannot be bypassed',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 await x.radio.register(alice);await x.radio.register(bob);
 await x.radio.switchStation(alice,'kiss');
 await assert.rejects(()=>x.radio.switchStation(bob,'swr3'),e=>e.status===429);
 x.advance(21_000);
 await assert.rejects(()=>x.radio.switchStation(alice,'swr3'),e=>e.status===429);
 await x.radio.switchStation(bob,'swr3');
 assert.equal(x.radio.publicState().stationId,'swr3');
});
test('unverified gift is rejected, verified gift grants three station changes',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 await assert.rejects(()=>x.radio.verifiedGift(alice,{ok:false,gift:{id:'rose'}}),e=>e.status===403);
 const status=await x.radio.verifiedGift(alice,{ok:true,gift:{id:'rose'}});
 assert.equal(status.giftPasses,3);
 const res=await x.radio.switchStation(alice,'pop');assert.equal(res.payment,'verified_gift');
 assert.equal(res.wallet.giftPasses,2);
});
test('reject unknown or insecure station and persist choice and privileges',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 await assert.rejects(()=>x.radio.switchStation(alice,'not-a-station'),e=>e.status===422);
 await assert.rejects(()=>x.radio.switchStation(alice,'faaz-http',{securePage:true}),e=>e.status===422);
 await x.radio.register(alice);await x.radio.switchStation(alice,'calm');
 const radio2=createArinaSharedRadio({dataDir:x.dir,now:x.getTime});await radio2.init();
 assert.equal(radio2.publicState().stationId,'calm');
 assert.equal(radio2.privateState(alice).remainingSwitches,5);
 assert.equal(RADIO_STATIONS.length,10);
});
test('paid access requires the trusted server boolean, never client-provided plan',async t=>{
 const x=await setup();t.after(()=>fs.rm(x.dir,{recursive:true,force:true}));
 await x.radio.register(alice);await x.radio.switchStation(alice,'swr3',{hasVerifiedPurchase:true});
 const balance=x.radio.privateState(alice);
 assert.equal(balance.tokens,2,'paid daily allowance is separate from earned tokens');
 x.advance(50_000);const r=await x.radio.switchStation(alice,'kiss',{hasVerifiedPurchase:false});
 assert.equal(r.payment,'earned_token','no privilege without verified paid state');
});
