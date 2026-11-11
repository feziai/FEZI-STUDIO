import test from 'node:test';
import assert from 'node:assert/strict';
import {agents,skills,publicAgents,getAgent} from '../src/catalog.mjs';
import {commandReply,telegramRequest,createFleet} from '../src/telegram.mjs';
import {localAnswer} from '../src/brain.mjs';
import {createApp} from '../src/server.mjs';

test('33 different agent profiles have a unique token env name',()=>{
 assert.equal(agents.length,33);
 assert.equal(new Set(agents.map(a=>a.id)).size,33);
 assert.equal(new Set(agents.map(a=>a.requiresToken)).size,33);
 assert.ok(agents.every(a=>a.avatar.startsWith('/assets/avatars/')));
});
test('skills are valid and all agents are discoverable',()=>{
 assert.ok(skills.length>=10);
 assert.equal(new Set(skills.map(s=>s.id)).size,skills.length);
 assert.equal(getAgent('arina').name,'Arina');
});
test('no token is shown by the public catalog',()=>{
 let statuses={arina:{status:'online',username:'demo_robot',token:'never_disclose'}};
 assert.equal(JSON.stringify(publicAgents(statuses)).includes('never_disclose'),false);
});
test('bot command menus and goals are truthful',()=>{
 assert.match(commandReply('help',getAgent('arina')),/Fezi Studio/);
 assert.match(commandReply('challenge',getAgent('arina')),/۶٬۰۰۰٬۰۰۰/);
 assert.match(commandReply('status',getAgent('arina')),/خودکار/);
});
test('without an AI key, local answer discloses demo mode',()=>{
 assert.match(localAnswer('سلام',getAgent('arina')),/متصل نیست/);
});
test('Telegram requests support mocked HTTP without revealing token in results',async()=>{
 let called=0;
 const f=async(url,opt)=>{
  called++;
  assert.ok(String(url).includes('abc:secret/getMe'));
  assert.equal(opt.method,'POST');
  return {ok:true,json:async()=>({ok:true,result:{is_bot:true,username:'sample'}})};
 };
 assert.equal((await telegramRequest('abc:secret','getMe',{},f)).username,'sample');
 assert.equal(called,1);
});
test('HTTP API and health work without network calls',async()=>{
 const {server}=createApp({fleet:{statuses:{},start:async()=>{},stop:async()=>{}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const [h,a,s,p,c]=await Promise.all([
    fetch(base+'/health'),fetch(base+'/api/agents'),fetch(base+'/api/skills'),
    fetch(base+'/api/status'),fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
  ]);
  assert.equal((await h.json()).ok,true);
  assert.equal((await a.json()).agents.length,33);
  assert.ok((await s.json()).skills.length>=10);
  assert.equal((await p.json()).online,0);
  assert.ok(c.status===503||c.status===401);
  const page=await fetch(base+'/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/Fezi Studio/);
  const plugins=await fetch(base+'/plugins/');
  assert.equal(plugins.status,200);
  assert.match(await plugins.text(),/FEZI Studio Plugins/);
  const registry=await fetch(base+'/plugins/registry.json');
  assert.equal(registry.status,200);
  assert.equal((await registry.json()).plugins.length,25);
 }finally{await new Promise(r=>server.close(r));}
});
test('empty bot configuration starts without claiming online bots',async()=>{
 const fleet=createFleet({logger:{info:()=>{},error:()=>{}}});
 await fleet.start();
 assert.ok(Object.values(fleet.statuses).every(s=>s.status==='awaiting_token'||s.status==='error'||s.status==='duplicate_token'));
 await fleet.stop();
});

test('a configured Telegram handler answers /start with a keyboard (mock transport)',async()=>{
 const sent=[];
 const mock=async(url,opts)=>{sent.push({url:String(url).split('/').pop(),body:JSON.parse(opts.body)});
   return {ok:true,json:async()=>({ok:true,result:{}})};
 };
 const fleet=createFleet({fetchImpl:mock,logger:{info:()=>{},error:()=>{}}});
 const a=getAgent('arina');
 await fleet.handleUpdate(a,'fake-token',{
   update_id:1,message:{message_id:10,chat:{id:1,type:'private'},from:{id:1,is_bot:false},text:'/start'}
 });
 assert.equal(sent.length,1);
 assert.equal(sent[0].url,'sendMessage');
 assert.match(sent[0].body.text,/Arina/);
 assert.ok(sent[0].body.reply_markup.inline_keyboard.length>0);
});
