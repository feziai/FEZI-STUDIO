import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {WALLETS,WALLET_APPS,createFeziWalletCheckout} from '../core/fezi-wallet-checkout-v101.js';
import {markup20,createApiKeysStore} from '../core/api-keys-v101.js';

async function response(fn,url){let status=0,data='',headers={};const res={writeHead:(s,h)=>{status=s;headers=h},end:x=>data=x};const ok=fn({method:'GET'},res,url);assert.equal(ok,true);return {status,json:JSON.parse(data),headers}}

test('wallet checkout lists multiple verified format networks and remains non-settling',async()=>{
 const r=await response(createFeziWalletCheckout({env:{FEZI_WALLET_ADDRESSES_REVIEWED:'false'}}).handle,'/api/fezi/wallet-checkout/options');
 assert.equal(r.status,200);assert.ok(r.json.assets.length>=15);assert.equal(r.json.apps.length,8);
 assert.equal(r.json.paymentsEnabled,false);assert.equal(r.json.autoCreditEnabled,false);assert.equal(r.json.addressReviewed,false);
 for(const a of r.json.assets){assert.equal(a.canAutoSettle,false);if(!a.addressFormatValid)assert.equal(a.qr,null)}
 for(const a of r.json.apps){assert.ok(a.site.startsWith('https://'))}
 assert.equal(Object.prototype.hasOwnProperty.call(r.json,'secret'),false);
});
test('markup is always exactly 20 percent on integer and decimal upstream prices',()=>{
 assert.equal(markup20('0.000001'),'0.0000012');assert.equal(markup20('12.5'),'15');assert.equal(markup20('0'),'0');
 assert.equal(markup20('250'),'300');assert.equal(markup20('NaN'),null);
});
test('API paid catalog key issuance and topup are never unverified credit',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-api-keys-test-'));
 try{const studio={getAccount:()=>({id:'demo-studio-user'})};const store=createApiKeysStore({dataDir:dir,studio,fetchImpl:async()=>({ok:true,json:async()=>({data:[]})})});await store.init();
 let n=0,result='',code=0;
 async function call(method,url,data){const req={method,url,async *[Symbol.asyncIterator](){if(data)yield Buffer.from(JSON.stringify(data))}};const res={writeHead(s){code=s},end(x){result=String(x||'')}};await store.handle(req,res,url);return JSON.parse(result)}
 let a=await call('POST','/api/api-keys/topup',{amountUsd:25});assert.equal(code,202);assert.equal(a.order.settled,false);assert.equal(a.checkoutEnabled,false);
 a=await call('GET','/api/api-keys/account');assert.equal(a.balanceUsd,0);assert.equal(a.verifiedSettlement,false);assert.equal(a.orders[0].amountUsd,25);
 a=await call('POST','/api/api-keys/keys',{name:'Demo'});assert.equal(code,201);assert.ok(a.key.startsWith('fezi_live_'));
 a=await call('POST','/api/v1/chat/completions',{});assert.equal(code,503);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('purchase page does not claim an automated payment',async()=>{
 const root=new URL('../public/purchase/index.html',import.meta.url);
 const html=await fs.readFile(root,'utf8');
 assert.match(html,/خرید و شارژ/);assert.match(html,/FEZI Agent/);assert.match(html,/QR/);assert.match(html,/Wallet/);
 assert.match(html,/وجه ارسال نکن/);
});
