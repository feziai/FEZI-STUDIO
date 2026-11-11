import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/plugins/registry.json'),'utf8'));
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const home=fs.readFileSync(path.join(root,'public/fezi-hub/home.html'),'utf8');
const landing=fs.readFileSync(path.join(root,'public/landing/index.html'),'utf8');
test('dedicated FEZI Agent is included in public list without granting private plugin access',()=>{
  assert.equal(registry.plugins.length,26);
  assert.equal(new Set(registry.plugins.map(x=>x.slug)).size,26);
  assert.ok(registry.plugins.some(x=>x.slug==='fezi-agent-builder'));
  for(const p of registry.plugins){assert.equal(p.listingPublic,true);assert.equal(p.chatgpt.access,'private');assert.equal(p.chatgpt.publicReady,false);assert.match(p.chatgpt.pluginId,/^plugin/);}
});
test('directory routes are public read-only GET routes',()=>{
  assert.match(server,/url==='\/plugins'/);
  assert.match(server,/url==='\/api\/plugins\/public'/);
  assert.match(server,/servePublic\(res,'plugins\/index\.html'/);
});
test('site body has directory links; no special auth or cookie required',()=>{
  assert.match(home, /href="\/plugins"/);assert.match(landing, /href="\/plugins"/);
});
test('public registry contains no wallet values or secrets',()=>{
  const raw=JSON.stringify(registry);
  assert.doesNotMatch(raw,/BEGIN (RSA|OPENSSH|PRIVATE) KEY|hf_[A-Za-z0-9]{25,}|ghp_[A-Za-z0-9]{25,}|0x50e30db8199d/i);
});

test('newly registered plugins have unique IDs and remain private',()=>{
  for(const slug of ['fezi-ai','easygit','persian-type-studio','replit-websites-deployer','fezi-site-control','fezi-ai-command-center','wan2-free']){
    assert.ok(registry.plugins.find(p=>p.slug===slug),slug);
  }
  assert.equal(new Set(registry.plugins.map(p=>p.chatgpt.pluginId)).size,26);
  assert.ok(registry.roadmap.every(p=>!registry.plugins.some(x=>x.slug===p.slug)));
  assert.equal(registry.mcpGatewayDeploymentVerified,false);
});
