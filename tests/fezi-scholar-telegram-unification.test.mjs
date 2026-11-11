import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFeziUnifiedKnowledge,feziUnifiedReadiness} from '../core/fezi-unified-knowledge.mjs';
import {handleFeziAgentMcp} from '../core/fezi-agent-mcp.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const knowledge=createFeziUnifiedKnowledge({root});
const token='a-strong-owner-token-1234567890-xyz';
function mockResponse(){return{status:null,value:null,writeHead(status){this.status=status},end(payload){this.value=JSON.parse(payload)}}}
async function mcp(method,params,authorization=`Bearer ${token}`){const req={method:'POST',headers:{authorization}},res=mockResponse();await handleFeziAgentMcp(req,res,{token,readBody:async()=>({jsonrpc:'2.0',id:7,method,params}),knowledge,skills:{list:()=>[]},discovery:{view:()=>({})},bots:{list:()=>[]}});return res;}
test('bundle contains Scholar, five second video and Telegram bot knowledge',async()=>{const s=knowledge.sources();assert.ok(s.documents.some(d=>d.kind==='scholar'));assert.ok(s.documents.some(d=>d.kind==='video'));assert.ok(s.documents.some(d=>d.kind==='telegram'));});
test('knowledge search retrieves grounded Telegram instructions',async()=>{const r=await knowledge.search({query:'BotFather',kind:'telegram'});assert.ok(r.results.length>0);assert.ok(r.results.every(v=>v.kind==='telegram'));});
test('knowledge search retrieves scholarly DOI workflow',async()=>{const r=await knowledge.search({query:'Crossref',kind:'scholar'});assert.ok(r.results.length>0);});
test('invalid category and undersized query rejected',async()=>{await assert.rejects(()=>knowledge.search({query:'x'}),/at least 2/);await assert.rejects(()=>knowledge.search({query:'bot',kind:'../../secrets'}),/Unsupported/);});
test('MCP tools list includes Scholar knowledge search and readiness',async()=>{const res=await mcp('tools/list',{});assert.equal(res.status,200);const tools=res.value.result.tools.map(x=>x.name);for(const n of ['fezi_site_read','fezi_site_preview_replace','fezi_site_apply_replace','fezi_knowledge_search','fezi_unified_readiness'])assert.ok(tools.includes(n),n);});
test('authenticated private MCP performs read-only grounded knowledge search',async()=>{const res=await mcp('tools/call',{name:'fezi_knowledge_search',arguments:{query:'webhook',kind:'telegram'}});assert.equal(res.status,200);assert.match(res.value.result.content[0].text,/telegram/);});
test('private MCP rejects missing or incorrect bearer token',async()=>{const res=await mcp('tools/list',{},'Bearer incorrect');assert.equal(res.status,401);assert.match(res.value.error,/Unauthorized/);});
test('MCP without token config returns 503',async()=>{const req={method:'POST',headers:{authorization:'Bearer something'}},res=mockResponse();await handleFeziAgentMcp(req,res,{token:'',readBody:async()=>({})});assert.equal(res.status,503);});
test('readiness labels external services unverified rather than ready',()=>{const p=feziUnifiedReadiness({FEZI_AGENT_MCP_TOKEN:token,PUBLIC_BASE_URL:'https://studio.example.org',TELEGRAM_FACTORY_BOT_TOKEN:'123456789:FAKE_TEST_TOKEN_ABCDEFGHIJKLMNOPQRSTUVWXYZ',TELEGRAM_FACTORY_WEBHOOK_SECRET:'FAKE_TEST_WEBHOOK_SECRET_12345'});assert.equal(p.services.websiteControllerMcp.status,'CONFIGURED_UNVERIFIED');assert.equal(p.services.telegramFactory.status,'CONFIGURED_UNVERIFIED');assert.equal(p.services.scholarResearch.status,'BUNDLED_KNOWLEDGE');assert.equal(p.noSecretsReturned,true);assert.doesNotMatch(JSON.stringify(p),/FAKE_TEST_TOKEN/);});
