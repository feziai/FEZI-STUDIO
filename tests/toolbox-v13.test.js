import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TOOLBOX,CATEGORIES,listToolbox,toolboxHostDoctor} from '../core/fezi-toolbox.js';
import {handlePluginMcp} from '../core/fezi-mcp-plugin.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fakeRes(){return {status:0,headers:{},value:'',writeHead(status,headers){this.status=status;Object.assign(this.headers,headers||{});return this;},setHeader(key,value){this.headers[key]=value;},end(str=''){this.value=String(str||'');}}}
async function call(body,token='a'.repeat(40),envToken='a'.repeat(40)){
  const req={method:'POST',headers:{authorization:'Bearer '+token}};const res=fakeRes();
  await handlePluginMcp(req,res,{env:{FEZI_MCP_READ_TOKEN:envToken},readBody:async()=>body,diagnostics:async()=>({test:true})});
  return {status:res.status,body:JSON.parse(res.value)};
}
test('Rabbit-F logo original asset is available without image re-generation',async()=>{
  const output=await fs.readFile(root+'/public/brand/fezi-rabbit-f.png');
  assert.ok(output.byteLength>1024); assert.equal(output.toString('latin1',1,4),'PNG');
  const site=await fs.readFile(root+'/public/showcase.html','utf8');
  assert.match(site,/fezi-rabbit-f\.png/); assert.match(site,/FEZI STUDIO/);
});
test('81 curated tools unique with valid links, licenses and no fake install',()=>{
  assert.equal(TOOLBOX.length,81);
  assert.equal(new Set(TOOLBOX.map(t=>t.id)).size,TOOLBOX.length);
  assert.equal(CATEGORIES.length,13);
  for(const t of TOOLBOX){assert.match(t.website,/^https:\/\//);assert.equal(t.installed,false);assert.ok(t.license);assert.ok(t.connection);}
  assert.ok(listToolbox({category:'security'}).some(t=>t.name==='ClamAV'));
  assert.ok(listToolbox({category:'app',search:'bolt'}).some(t=>t.name==='bolt.diy'));
  assert.ok(listToolbox({category:'3d'}).some(t=>t.name==='TRELLIS.2'));
});
test('doctor checks PATH only and does not assert any GPU model is installed',async()=>{
  const x=await toolboxHostDoctor({env:{PATH:'/nonexistent'}});
  assert.ok(Object.values(x.available).every(x=>x===false));
  assert.equal(x.gpuModelWeightsVerified,false);
  assert.equal(x.llmReady,false);
});
test('MCP private plugin requires long token and exact bearer authentication',async()=>{
  const p=await call({jsonrpc:'2.0',id:1,method:'tools/list'},'wrong');assert.equal(p.status,401);
  const u=await call({jsonrpc:'2.0',id:1,method:'tools/list'},'','short');assert.equal(u.status,503);
});
test('MCP implements initialization and 4 read-only tools',async()=>{
  const init=await call({jsonrpc:'2.0',id:'i',method:'initialize'});
  assert.equal(init.status,200);assert.equal(init.body.result.serverInfo.name,'fezi-studio-private-preview');
  const r=await call({jsonrpc:'2.0',id:2,method:'tools/list'});
  assert.equal(r.body.result.tools.length,4);
  assert.ok(r.body.result.tools.every(t=>t.annotations.readOnlyHint===true));
  assert.ok(r.body.result.tools.every(t=>t.annotations.destructiveHint===false));
});
test('MCP search returns tool data without shell/file operations',async()=>{
  const r=await call({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'fezi_list_tools',arguments:{category:'game',search:'godot'}}});
  const x=JSON.parse(r.body.result.content[0].text);
  assert.equal(x.tools.length,1);assert.equal(x.tools[0].name,'Godot');assert.equal(x.tools[0].installed,false);
  const fail=await call({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'execute_shell',arguments:{command:'rm -rf /'}}});
  assert.equal(fail.body.error.code,-32602);
});
