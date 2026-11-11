import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {createArinaAttachments,validateAttachmentName} from '../core/arina-attachments.mjs';
import {AnnouncementStore} from '../modules/announcement/store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const owner='a'.repeat(32);
const mk=(b)=>Readable.from([b]);
test('Arina attachment store uploads private JPEG, reads metadata, validates ownership and expiry',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-attachments-'));
 let t=1000000;const store=createArinaAttachments({root:dir,now:()=>t});
 try{
 const bytes=Buffer.from([0xff,0xd8,0xff,0xe0,0,1,2,3,4]);
 const data=await store.upload(mk(bytes),{filename:'photo.jpg',type:'image/jpeg',owner});
 assert.match(data.id,/^[a-f0-9]{32}$/);assert.equal(data.size,bytes.length);
 assert.equal((await store.get(data.id)).owner,owner);
 assert.deepEqual(await store.resolve([data.id],owner),[data]);
 await assert.rejects(()=>store.resolve([data.id],'b'.repeat(32)),{status:403});
 t+=8*24*3600*1000;await assert.rejects(()=>store.get(data.id),{status:410});
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('Arina attachment store rejects filename type mismatch and disguised files',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-attachments-'));
 const store=createArinaAttachments({root:dir});
 try{assert.throws(()=>validateAttachmentName('bad.exe','image/jpeg'),{status:415});
 await assert.rejects(()=>store.upload(mk(Buffer.from('Not a JPEG')),{filename:'fake.jpg',type:'image/jpeg',owner}),{status:415});
 assert.throws(()=>validateAttachmentName('fake.htm','text/plain'),{status:415});
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('Announcement task queue requires a known enabled bot, and never leaks the token',()=>{
 const store=new AnnouncementStore(':memory:','a'.repeat(64));
 const secret='123456:abcdefghijklmnopqrstuvwxyz123456';store.addBot('123456','fezi_test',secret);
 try{
 const task=store.queueTask('@fezi_test','Create a welcome message for our help bot');
 assert.equal(task.bot,'123456');assert.equal(task.state,'queued');
 assert.equal(store.listBotTasks(1)[0].id,task.id);
 assert.throws(()=>store.queueTask('999999','Wrong bot'));
 assert.throws(()=>store.queueTask('123456','x'.repeat(1501)));
 assert.equal(JSON.stringify(store.status()).includes(secret),false);
 }finally{store.close()}
});
test('Bot directory has unique pages, bios, local icons, and no secrets',async()=>{
 const profiles=JSON.parse(await fs.readFile(path.join(root,'config/telegram-bot-profiles.json'),'utf8'));
 assert(profiles.length>=10);assert.equal(new Set(profiles.map(p=>p.id)).size,profiles.length);
 const maker=profiles.find(p=>p.id==='maker');assert.equal(maker.path,'/telegram-builder');assert.equal(maker.name,'Telegram Bot Maker');
 for(const bot of profiles){assert(bot.name&&bot.bio&&bot.path.startsWith('/'));await fs.access(path.join(root,'public',bot.icon))}
 const html=await fs.readFile(path.join(root,'public/telegram-apps/index.html'),'utf8');assert.match(html,/Telegram Bot Maker/);assert.doesNotMatch(html,/github_pat_|sk-or-v1-/);
});
