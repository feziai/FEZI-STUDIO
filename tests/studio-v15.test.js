import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createStudioV15} from '../core/studio-v15.js';
import models from '../config/studio-models-v15.json' with {type:'json'};
import wallets from '../core/arina-wallets.json' with {type:'json'};
import {motivationalMessage,languageFromTelegram,createPublicBot} from '../core/telegram-public.js';
const ROOT=path.resolve('.');
class Response{
 constructor(){this.headers={};this.status=0;this.data='';this.finished=false;}
 writeHead(status,headers){this.status=status;this.headers={...this.headers,...headers}}
 setHeader(k,v){this.headers[k]=v}
 end(bytes){this.data=typeof bytes==='string'?bytes:bytes?bytes.toString():'';this.finished=true}
 json(){return JSON.parse(this.data)}
}
function request(method,url,body,headers={}){const raw=Buffer.from(JSON.stringify(body||{}));return {method,url,headers, socket:{remoteAddress:'127.0.0.1',encrypted:false},async *[Symbol.asyncIterator](){yield raw}}}
function cookie(res){return String(res.headers['Set-Cookie']||'').split(';')[0]}
const boot=async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-v15-'));const studio=createStudioV15({root:ROOT,dataDir:dir,sessionSecret:'X'.repeat(70),authenticatedOwner:req=>req.headers['x-owner']==='owner',runText:async({prompt})=>'Genuine adapter: '+prompt});await studio.init();return {dir,studio}};
test('model catalog has unique slugs and declared unknown constraints, adult source clearly labeled',()=>{assert.ok(models.length>100);assert.equal(new Set(models.map(m=>m.slug)).size,models.length);assert.ok(models.some(m=>m.adultCatalog));assert.ok(models.filter(m=>m.category==='video').length>12);assert.ok(models.every(m=>m.installed===false&&m.available===false));assert.ok(models.filter(m=>m.category==='video').some(m=>m.capabilities.imageInputs===null));});
test('wallet list is preserved bit for bit and logo original is unchanged',async()=>{assert.equal(wallets.length,22);const actual=await fs.readFile(path.join(ROOT,'public/brand/fezi-rabbit-f.png'));assert.equal(crypto.createHash('sha256').update(actual).digest('hex'),'79f9e735e2798f622b031b1ec5ceda59af44c7fdca386e7e8290ff71d99cadc7');assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT,'core/arina-wallets.json'))).digest('hex'),'4e28b52f6e2e5185a6cbd3ecf2b6cdbba28f4263a686edecfadd8b14e662b1d2');});
test('account registration, signed session, profile changes and no auto credits',async()=>{const {dir,studio}=await boot();try{const req=request('POST','/api/account/register',{name:'Test User',email:'test@example.com',password:'SuperPassword0123',agreeTerms:true});const res=new Response();await studio.handle(req,res,req.url);assert.equal(res.status,201);assert.equal(res.json().user.creditsUsd,0);const ck=cookie(res);const get=request('GET','/api/account/me',null,{cookie:ck});const me=new Response();await studio.handle(get,me,get.url);assert.equal(me.json().authenticated,true);const p=request('POST','/api/account/profile',{name:'My Avatar',avatar:'pink'},{cookie:ck});const r=new Response();await studio.handle(p,r,p.url);assert.equal(r.status,200);assert.equal(r.json().user.avatar,'pink')}finally{await fs.rm(dir,{recursive:true,force:true})}});
test('community is private before review, can be approved only by owner, likes and remix consent',async()=>{const {dir,studio}=await boot();try{
 let r=new Response();let req=request('POST','/api/account/register',{name:'Uploader',email:'upload@example.com',password:'UniquePassword987',agreeTerms:true});await studio.handle(req,r,req.url);const ck=cookie(r);
 req=request('POST','/api/community/posts',{kind:'text',title:'A writing creation',prompt:'A sunny morning',rightsConfirmed:true,publishConsent:true,remixAllowed:true,downloadAllowed:true},{cookie:ck});r=new Response();await studio.handle(req,r,req.url);assert.equal(r.status,202);const id=r.json().postId;
 req=request('GET','/api/community/posts');r=new Response();await studio.handle(req,r,req.url);assert.equal(r.json().posts.length,0);
 req=request('POST','/api/admin/community/review',{id,action:'approve'});r=new Response();await assert.rejects(studio.handle(req,r,req.url),{status:401});
 req=request('POST','/api/admin/community/review',{id,action:'approve'},{'x-owner':'owner'});r=new Response();await studio.handle(req,r,req.url);assert.equal(r.status,200);
 req=request('GET','/api/community/posts');r=new Response();await studio.handle(req,r,req.url);assert.equal(r.json().posts.length,1);
 req=request('GET','/api/community/remix/'+id);r=new Response();await studio.handle(req,r,req.url);assert.equal(r.json().prompt,'A sunny morning');
 req=request('POST','/api/community/like',{id},{cookie:ck});r=new Response();await studio.handle(req,r,req.url);assert.equal(r.json().likes,1);
}finally{await fs.rm(dir,{recursive:true,force:true})}});
test('public landing assets, SEO and model details route through same server',async()=>{const {dir,studio}=await boot();try{for(const route of ['/studio','/writing','/profile','/community','/playground','/studio/ui.css','/studio/app.js','/ai/qwen3-8b','/sitemap.xml','/robots.txt']){const req=request('GET',route);const res=new Response();await studio.handle(req,res,route);assert.equal(res.status,200,route)}const r=new Response();await studio.handle(request('GET','/sitemap.xml'),r,'/sitemap.xml');assert.ok(r.data.includes('/ai/qwen3-8b'));}finally{await fs.rm(dir,{recursive:true,force:true})}});
test('pending media is private but owner can inspect content before approving',async()=>{const {dir,studio}=await boot();try{
 let req=request('POST','/api/account/register',{name:'Media User',email:'media@example.com',password:'SecurePassword123',agreeTerms:true});let res=new Response();await studio.handle(req,res,req.url);const ck=cookie(res);
 const tinyPng=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
 req=request('POST','/api/community/posts',{title:'Original public artwork',kind:'image',mime:'image/png',base64:tinyPng.toString('base64'),prompt:'A colorful flower',publishConsent:true,rightsConfirmed:true,downloadAllowed:false},{cookie:ck});res=new Response();await studio.handle(req,res,req.url);assert.equal(res.status,202);const id=res.json().postId;
 req=request('GET','/api/admin/community/preview/'+id);res=new Response();await assert.rejects(studio.handle(req,res,req.url),{status:401});
 req=request('GET','/api/admin/community/preview/'+id,null,{'x-owner':'owner'});res=new Response();await studio.handle(req,res,req.url);assert.equal(res.status,200);assert.equal(res.headers['content-type'],'image/png');
 req=request('GET','/api/community/media/'+id);res=new Response();await assert.rejects(studio.handle(req,res,req.url),{status:404});
}finally{await fs.rm(dir,{recursive:true,force:true})}});
test('Telegram motivation opt-in, language and correct message scheduling',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-tg-v15-'));try{const sent=[];const api={sendText:async(id,message)=>{sent.push([id,message])}};const bot=createPublicBot({api,storeFile:path.join(dir,'users.json'),webAppUrl:'https://fezix.ir',botSecret:''});await bot.init();const update=x=>({message:{from:{id:100,language_code:'fa'},chat:{id:100,type:'private'},text:x}});await bot.processUpdate(update('/start'));assert.equal(bot.subscribers(),0);await bot.processUpdate(update('/motivate on'));assert.equal(bot.subscribers(),1);const once=await bot.sendDaily(new Date('2026-11-02T11:00:00Z'));assert.equal(once.sent,1);const twice=await bot.sendDaily(new Date('2026-11-02T14:00:00Z'));assert.equal(twice.sent,0);assert.ok(sent.at(-1)[1].includes('FEZI'));assert.equal(languageFromTelegram({language_code:'fa-IR'}),'fa');assert.ok(motivationalMessage('en','2026-11-02').length>20)}finally{await fs.rm(dir,{recursive:true,force:true})}})
