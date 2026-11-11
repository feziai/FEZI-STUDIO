import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTelegramFactory,FACTORY_COMMANDS} from '../core/fezi-telegram-factory.mjs';
const plugins=JSON.parse(fs.readFileSync(new URL('../public/plugins/registry.json', import.meta.url))).plugins;
const base={baseUrl:'https://fezi.test',token:'not-shared',secret:'abc123abc123abc123abc123',allowedIds:'12345',plugins,skillStats:{uniqueSkillNames:3732,fullTextSkills:3493}};
async function send(id,text){const calls=[];const f=createTelegramFactory({...base,api:async(method,payload)=>calls.push({method,payload})});await f.onUpdate(base.secret,{update_id:Math.floor(Math.random()*10000),message:{chat:{id,type:'private'},from:{id},text}});return calls[0].payload;}
test('all 26 private plugin names are shown only to authorized owner',async()=>{
 assert.equal(plugins.length,26);
 const owner=await send(12345,'/plugins');assert.match(owner.text,/26\. /);assert.match(owner.text,/FEZI Agent/);assert.match(owner.text,/FEZI Telegram Bot Maker/);
 const guest=await send(99999,'/plugins');assert.doesNotMatch(guest.text,/FEZI Telegram Bot Maker/);assert.match(guest.text,/خصوصی/);
});
test('new creator, skills and agent menus point to FEZI Studio',async()=>{
 for(const name of ['createplugin','skills','agent']) assert.ok(FACTORY_COMMANDS.some(x=>x.command===name));
 const skill=await send(12345,'/skills');assert.match(skill.text,/3,732/);assert.match(skill.text,/3,493/);
 const create=await send(12345,'/createplugin');assert.match(create.text,/Plugin Creator/);
 assert.ok(create.reply_markup.inline_keyboard.flat().some(x=>x.url?.endsWith('/plugins/chatgpt-builder')));
});
test('factory rejects unauthenticated updates',async()=>{
 const f=createTelegramFactory({...base,api:async()=>{}});
 await assert.rejects(f.onUpdate('wrong',{update_id:1,message:{chat:{id:12345,type:'private'},from:{id:12345},text:'/plugins'}}),{status:403});
});
