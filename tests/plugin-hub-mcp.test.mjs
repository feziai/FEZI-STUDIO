import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {handlePluginHubMcp,gatewayStatus} from '../core/fezi-plugin-hub-mcp.mjs';
const plugin={slug:'easygit',nameEn:'EasyGit',version:'0.1.0',relatedWebTool:'/builder'};
const registry={plugins:[plugin]};
async function body(req){let t='';for await(const chunk of req)t+=chunk;if(t.length>1024*1024)throw Error('too large');return JSON.parse(t);}
async function withServer(fn){
 const s=createServer((req,res)=>handlePluginHubMcp(req,res,{readBody:body,registry,slug:decodeURI(req.url.slice(1))}));
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 try{return await fn(`http://127.0.0.1:${s.address().port}/easygit`);}finally{await new Promise(resolve=>s.close(resolve));}
}
const token='test-only-token-at-least-32-characters-123456';
const rpc=(id,method,params)=>JSON.stringify({jsonrpc:'2.0',id,method,params});
test('gateway reports disabled without secret',()=>{const old=process.env.FEZI_PLUGIN_HUB_TOKEN;delete process.env.FEZI_PLUGIN_HUB_TOKEN;assert.equal(gatewayStatus(registry).gatewayConfigured,false);if(old!==undefined)process.env.FEZI_PLUGIN_HUB_TOKEN=old;});
test('missing secret denies requests', async()=>{const old=process.env.FEZI_PLUGIN_HUB_TOKEN;delete process.env.FEZI_PLUGIN_HUB_TOKEN;try{await withServer(async u=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:rpc(1,'initialize')});assert.equal(r.status,503)});}finally{if(old!==undefined)process.env.FEZI_PLUGIN_HUB_TOKEN=old}});
test('unauthorized call rejected',async()=>{const old=process.env.FEZI_PLUGIN_HUB_TOKEN;process.env.FEZI_PLUGIN_HUB_TOKEN=token;try{await withServer(async u=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:rpc(1,'initialize')});assert.equal(r.status,401)});}finally{if(old===undefined)delete process.env.FEZI_PLUGIN_HUB_TOKEN;else process.env.FEZI_PLUGIN_HUB_TOKEN=old}});
test('initialize and tools work with token',async()=>{const old=process.env.FEZI_PLUGIN_HUB_TOKEN;process.env.FEZI_PLUGIN_HUB_TOKEN=token;delete process.env.FEZI_PLUGIN_UPSTREAMS_JSON;try{await withServer(async u=>{const hdr={'content-type':'application/json',authorization:`Bearer ${token}`};let r=await fetch(u,{method:'POST',headers:hdr,body:rpc(1,'initialize')});assert.equal(r.status,200);let j=await r.json();assert.equal(j.result.serverInfo.name,'fezi-easygit');r=await fetch(u,{method:'POST',headers:hdr,body:rpc(2,'tools/list')});j=await r.json();assert.equal(j.result.tools.length,3);r=await fetch(u,{method:'POST',headers:hdr,body:rpc(3,'tools/call',{name:'fezi_plugin_details',arguments:{}})});j=await r.json();assert.equal(JSON.parse(j.result.content[0].text).slug,'easygit');});}finally{if(old===undefined)delete process.env.FEZI_PLUGIN_HUB_TOKEN;else process.env.FEZI_PLUGIN_HUB_TOKEN=old}});
