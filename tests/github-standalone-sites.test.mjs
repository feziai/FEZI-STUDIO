import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reg=JSON.parse(fs.readFileSync(path.join(root,'public/plugins/registry.json'),'utf8'));
test('26 standalone GitHub Pages site sources exist',()=>{
 const base=path.join(root,'exports/individual-plugin-sites');
 const dirs=fs.readdirSync(base,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 assert.deepEqual(dirs,reg.plugins.map(x=>x.slug).sort());
});
test('each standalone site has safe branding, plugin ID and a Pages workflow',()=>{
 for(const p of reg.plugins){
  const base=path.join(root,'exports/individual-plugin-sites',p.slug);
  const text=fs.readFileSync(path.join(base,'index.html'),'utf8');
  assert.match(text,/PRIVATE/);
  assert.ok(text.includes(p.chatgpt.url));
  assert.ok(text.includes('assets/logo.png'));
  assert.ok(fs.existsSync(path.join(base,'.github/workflows/deploy-pages.yml')));
  assert.ok(fs.existsSync(path.join(base,'assets/logo.png')));
 }
});
