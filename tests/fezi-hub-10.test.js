import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hub=path.join(root,'public','fezi-hub');
const pages=['home','chat','arina','image','video','models','bots','bot-maker','fezipay','admin'];
const read=(f)=>fs.readFileSync(f,'utf8');
for(const page of pages)test('FEZI hub page '+page+' has real navigation and responsive identity',()=>{
 const html=read(path.join(hub,page+'.html'));
 assert.match(html,/lang="fa" dir="rtl"/);
 assert.match(html,/<meta name="viewport"/);
 assert.match(html,/fezi-site-f\.png/);
 assert.match(html,/<nav id="primary-nav"/);
 assert.match(html,new RegExp('href="/fezi-hub/'+page+'"'));
 assert.ok(html.includes('/fezi-hub/hub.css'));
});
test('all ten pages exist and share a mobile-responsive style',()=>{
 const css=read(path.join(hub,'hub.css'));
 assert.match(css,/@media\(max-width:610px\)/);
 assert.match(css,/\.video-drawer/);
 assert.equal(pages.length,10);
});
test('the home shows a closed-by-default drawer containing nine looping silent video samples',()=>{
 const home=read(path.join(hub,'home.html'));
 assert.match(home,/<details class="video-drawer"/);
 assert.doesNotMatch(home,/<details class="video-drawer"[^>]*open/);
 assert.equal((home.match(/<video autoplay muted playsinline/g)||[]).length,9);
 assert.equal((home.match(/loop preload="metadata"/g)||[]).length,9);
});
test('every preview is labeled as sample, not output verified from adjacent AI provider',()=>{
 const v=JSON.parse(read(path.join(hub,'media','media-provenance.json')));
 assert.equal(v.length,9);
 for(const x of v){assert.equal(x.model_attribution,'not verified');assert.ok(fs.statSync(path.join(root,'public',x.preview_mp4)).size>1000)}
});
test('Bot Maker forwards the prepared idea to the existing Telegram builder form',()=>{
 assert.match(read(path.join(hub,'hub.js')),/sessionStorage\.setItem\('fezi_bot_idea'/);
 assert.match(read(path.join(root,'public','telegram-builder.html')),/sessionStorage\.getItem\('fezi_bot_idea'/);
});
test('new admin view does not include a key, token, or password input',()=>{
 const admin=read(path.join(hub,'admin.html'));
 assert.doesNotMatch(admin,/<input|<textarea|github_pat_|sk-or-v1-|GOCSPX-/i);
 assert.match(admin,/\/admin\/operations/);
});
