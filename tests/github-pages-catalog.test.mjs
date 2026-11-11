import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/plugins/registry.json'),'utf8'));
const dist=path.join(root,'_github_pages');
const read=rel=>fs.readFileSync(path.join(dist,rel),'utf8');
test('all 26 plugin profiles are sourced from the latest snapshot',()=>{
 assert.equal(manifest.plugins.length,26);
 assert.equal(manifest.verifiedPrivatePluginCount,26);
 assert.equal(new Set(manifest.plugins.map(p=>p.slug)).size,26);
});
test('only authorized ChatGPT plugin reference URLs appear',()=>{
 for(const p of manifest.plugins){
  assert.match(p.slug,/^[a-z0-9-]+$/);
  assert.equal(p.chatgpt.url,`https://chatgpt.com/plugins/${p.chatgpt.pluginId}`);
  assert.equal(p.chatgpt.access,'private');
  assert.equal(p.chatgpt.publicReady,false);
  assert.match(p.version,/^\d+\.\d+\.\d+$/);
 }
});
test('static index and individual pages exist',()=>{
 const html=read('index.html');
 assert.match(html,/26/);
 assert.match(html,/GitHub Pages/);
 for(const p of manifest.plugins){
  const content=read(`plugins/${p.slug}/index.html`);
  assert.ok(content.includes(p.chatgpt.url));
  assert.ok(content.includes(p.version));
  assert.ok(content.includes('Private'));
 }
});
test('sitemap contains 26 plugin URLs plus home',()=>{
 const siteMap=read('sitemap.xml');
 assert.equal((siteMap.match(/<url>/g)||[]).length,27);
});
test('GitHub Pages assets are static and credential-free',()=>{
 const names=fs.readdirSync(dist,{recursive:true});
 assert.ok(names.includes('assets/fezi-rabbit-f.png'));
 assert.ok(!names.some(p=>p.endsWith('.env')||p.endsWith('.sqlite')||p.endsWith('.key')));
 assert.match(read('index.html'),/backend/i);
});
test('GitHub Actions publishes only _github_pages and does not claim backend activation',()=>{
 const yaml=fs.readFileSync(path.join(root,'.github/workflows/deploy-fezi-plugin-pages.yml'),'utf8');
 assert.match(yaml,/path: _github_pages/);
 assert.match(yaml,/deploy-pages@v4/);
 assert.doesNotMatch(yaml,/OPENROUTER_API_KEY|TELEGRAM_FACTORY_BOT_TOKEN/);
});
