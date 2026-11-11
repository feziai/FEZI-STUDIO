import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {createPromptLibrary} from '../core/prompt-library-v16.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary=()=>mkdtemp(path.join(tmpdir(),'fezi-prompt-test-'));
async function mock(lib,url,method='GET',body=null,auth=false){const input=body===null?[]:[Buffer.from(JSON.stringify(body))];const req=Readable.from(input);req.method=method;req.url=url;req.headers={host:'localhost:3000'};req.ownerAuth=auth;const response={status:0,headers:{},body:'',writeHead(n,h){this.status=n;this.headers=h},end(b){this.body=Buffer.from(b||'').toString('utf8')}};return {handled:await lib.handle(req,response,new URL(url,'http://localhost').pathname),...response};}
async function fixture(){const dataDir=await temporary(),lib=createPromptLibrary({root,dataDir,authenticatedOwner:r=>r.ownerAuth});await lib.init();return {lib,dataDir}}
const item=()=>({slug:'test-safe-transfer',title:'An original creative prompt',category:'Portrait',kind:'image',prompt:'Original studio portrait of an adult character with a warm glow and natural face details.',rights:'original',transferAllowed:true,media:[]});
test('v1.6 seeds include authorized copy-ready entries and external links only',async()=>{const f=await fixture();try{const r=await mock(f.lib,'/api/prompts');assert.equal(r.status,200);const body=JSON.parse(r.body);assert.equal(body.total,4091);assert.equal(body.summary.copyReady,4091);assert.equal(body.summary.linkedOnly,0);assert.ok(body.items.every(x=>x.prompt&&x.media?.length));assert.ok(body.summary.categories.Fashion>=4);}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.6 source records do not pretend redistribution is authorized',async()=>{const f=await fixture();try{const r=await mock(f.lib,'/api/prompts/sources');assert.equal(r.status,200);const s=JSON.parse(r.body).sources;assert.equal(s.length,6);assert.ok(s.every(x=>x.importStatus==='source-reference-only'));}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.6 owner import rejects unauthenticated request',async()=>{const f=await fixture();try{await assert.rejects(()=>mock(f.lib,'/api/admin/prompts/import','POST',{ownerConfirmedTransferRights:true,records:[item()]}),{status:401});}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.6 owner import rejects missing explicit transfer rights',async()=>{const f=await fixture();try{await assert.rejects(()=>mock(f.lib,'/api/admin/prompts/import','POST',{ownerConfirmedTransferRights:true,records:[{...item(),transferAllowed:false}]},true),/permission required/);}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.6 owner import rejects media without hotlink permission',async()=>{const f=await fixture();try{await assert.rejects(()=>mock(f.lib,'/api/admin/prompts/import','POST',{ownerConfirmedTransferRights:true,records:[{...item(),media:[{type:'image',url:'https://example.com/example.jpg'}]}]},true),/Media transfer/);}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.6 approved import creates copyable canonical prompt and sitemap entry',async()=>{const f=await fixture();try{const r=await mock(f.lib,'/api/admin/prompts/import','POST',{ownerConfirmedTransferRights:true,records:[item()]},true);assert.equal(r.status,201);const detail=await mock(f.lib,'/prompts/test-safe-transfer');assert.equal(detail.status,200);assert.match(detail.body,/Copy prompt/);assert.ok(f.lib.sitemapPaths().includes('/prompts/test-safe-transfer'));}finally{await rm(f.dataDir,{recursive:true,force:true})}});
test('v1.7 has images, visible categories, and copy buttons on public cards',async()=>{
 const f=await fixture();try{
  const r=await mock(f.lib,'/prompts');assert.equal(r.status,200);assert.match(r.body,/Copy prompt/);assert.match(r.body,/category-chips/);assert.match(r.body,/prompt-card/);assert.match(r.body,/\/prompts\/media\/a-/);
  const d=await mock(f.lib,'/prompts/fezi-fashion-1-pearl-atelier-runway');assert.equal(d.status,200);assert.match(d.body,/Ready-to-use prompt/);assert.match(d.body,/detail-data/);assert.match(d.body,/Use in AI Studio/);
 }finally{await rm(f.dataDir,{recursive:true,force:true})}
});
test('v1.7 serves original preview images, client script, and supports category search',async()=>{
 const f=await fixture();try{
  const media=await mock(f.lib,'/prompts/media/a-01.webp');assert.equal(media.status,200);assert.equal(media.headers['content-type'],'image/webp');
  const script=await mock(f.lib,'/prompts/detail.js');assert.equal(script.status,200);assert.match(script.body,/fezi_prompt_to_studio/);
  const api=await mock(f.lib,'/api/prompts?category=Fashion');assert.equal(api.status,200);const d=JSON.parse(api.body);assert.ok(d.items.length>=4);assert.ok(d.items.every(x=>x.category==='Fashion'));
 }finally{await rm(f.dataDir,{recursive:true,force:true})}
});
