import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('PDH standalone page and old importer are absent',()=>{
 for(const f of [
 'public/persian-dark-horse/index.html',
 'scripts/import-pdh-source.py',
 'PERSIAN_DARK_HORSE_INTEGRATION_FA.md',
 'PERSIAN_DARK_HORSE_RELEASE_MANIFEST.json'
 ]) assert.equal(fs.existsSync(path.join(root,f)),false,f);
});
test('PDH standalone route and status API are absent',()=>{
 const src=read('server.js');
 assert.doesNotMatch(src,/\/api\/persian-dark-horse\/status/);
 assert.doesNotMatch(src,/\['\/persian-dark-horse'/);
});
test('new PDH navigation has been removed from main user pages',()=>{
 const files=['public/model-playground/index.html','public/landing/index.html','public/landing/index-fa.html',...['home','arina','chat','image','video','bots','bot-maker','models','admin','fezipay'].map(name=>`public/fezi-hub/${name}.html`)];
 for(const file of files) assert.doesNotMatch(read(file),/href=["']\/persian-dark-horse["']/i,file);
});
test('Arina and FEZI Agent routes are preserved',()=>{
 const src=read('server.js');
 assert.match(src,/\/arina-live/);
 assert.match(src,/\/model-playground/);
 assert.match(src,/\/api\/arina/);
 assert.match(src,/\/api\/fezi\/chat/);
});
