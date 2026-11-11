import test from 'node:test';import assert from 'node:assert/strict';
import {createTelegramFactory} from '../core/fezi-telegram-factory.mjs';
test('rejects webhook without verified Telegram header and without configuration',async()=>{
 const f=createTelegramFactory({baseUrl:'https://fezi.test',token:'dummy',secret:'abcdefghijklmnopqrstuvwx',allowedIds:'1234',api:async()=>{}});
 await assert.rejects(f.onUpdate('wrong',{update_id:1,message:{chat:{id:1234,type:'private'},from:{id:1234},text:'/start'}}),{status:403});
 const disabled=createTelegramFactory({baseUrl:'http://localhost:3000',token:'x',secret:'s'});assert.equal(disabled.enabled,false);
});
test('admin can read bot list, other users cannot; builder and brand links supplied',async()=>{
 const calls=[];const f=createTelegramFactory({baseUrl:'https://fezi.test',token:'dummy',secret:'abcdefghijklmnopqrstuvwxyz',allowedIds:'1234',listBots:()=>[{name:'Test bot',username:'examplebot'}],api:async(method,body)=>calls.push({method,body})});
 await f.onUpdate('abcdefghijklmnopqrstuvwxyz',{update_id:2,message:{chat:{id:1234,type:'private'},from:{id:1234},text:'/mybots'}});
 assert.match(calls[0].body.text,/@examplebot/);assert.match(calls[0].body.text,/FEZI Studio/);
 assert.ok(calls[0].body.reply_markup.inline_keyboard[0][0].url.includes('/plugins/telegram-builder'));
 calls.length=0;await f.onUpdate('abcdefghijklmnopqrstuvwxyz',{update_id:3,message:{chat:{id:9999,type:'private'},from:{id:9999},text:'/mybots'}});
 assert.doesNotMatch(calls[0].body.text,/@examplebot/);
});
