import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const widget=fs.readFileSync(path.join(root,'public/assets/fezi-agent-global.js'),'utf8');
const content=fs.readFileSync(path.join(root,'public/fezi-agent/skill-creator.html'),'utf8');
test('global FEZI Agent widget is injected into HTML response body without editing headers',()=>{
  assert.match(server,/if\(String\(contentType\)\.startsWith\('text\/html'\)/);
  assert.match(server,/replace\(\/<\\\/body>\/i/);
  assert.match(server,/\/assets\/fezi-agent-global\.js/);
  assert.doesNotMatch(server,/replace\(\/<header>/);
});
test('global widget links to the existing website builder and tools',()=>{
  assert.match(widget,/\/builder\?source=global-agent/);assert.match(widget,/\/fezi-agent\/tools/);assert.match(widget,/\/fezi-agent\/skill-creator/);assert.match(widget,/\/api\/fezi\/chat/);
  assert.match(widget,/sessionStorage\.setItem\('fezi_global_task'/);
});
test('skill factory routes require owner authentication for writes',()=>{
  assert.match(server,/url==='\/api\/fezi\/agent\/skill-factory\/draft'/);
  assert.match(server,/Owner login required to save skill drafts/);
});
test('skill creation UI shows realistic counts and draft status',()=>{
  assert.match(content,/۵٬۰۰۰٬۰۰۰/);assert.match(content,/DRAFT/);
  assert.match(content,/دریافت SKILL\.md/);
});
test('49 distinct original FEZI Agent skill files exist',()=>{
 const base=path.join(root,'agent-skills/library/fezi-agent-builder');
 const names=fs.readdirSync(base).filter(x=>fs.existsSync(path.join(base,x,'SKILL.md')));
 assert.equal(names.length,49);assert.equal(new Set(names).size,49);
 for(const name of names){const txt=fs.readFileSync(path.join(base,name,'SKILL.md'),'utf8');assert.match(txt,/## Verification and deliverable/);}
});
