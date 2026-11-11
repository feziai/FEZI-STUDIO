import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeziRemoteControl} from '../core/fezi-remote-control.mjs';
import {createTelegramFactory} from '../core/fezi-telegram-factory.mjs';
import {handleFeziAgentMcp} from '../core/fezi-agent-mcp.mjs';

const ID='0123456789abcdef';
function stub(){
 const changes=[];
 const remote=createFeziRemoteControl({projects:async()=>[{id:ID,name:'Website',updatedAt:'2026-11-08T00:00:00.000Z'}],
  agent:{list:async()=>[{id:'aa',status:'completed',goal:'Update site',updatedAt:'today'}],checkpoint:async()=>({id:'checkpoint1'}),start:async x=>{changes.push(x);return {id:'job1',status:'queued'}}},
  bots:{list:()=>[{id:'bot1',name:'FEZI',username:'FEZIBOT'}]},plugins:[{nameEn:'FEZI Agent'}],clock:()=>new Date('2026-11-08T00:00:00.000Z')});
 return {remote,changes};
}
test('remote control reads status/projects/bots/plugins and limits fields',async()=>{
 const {remote}=stub();assert.equal((await remote.dispatch('status')).serverTime,'2026-11-08T00:00:00.000Z');
 assert.equal((await remote.dispatch('projects')).projects[0].name,'Website');
 assert.equal((await remote.dispatch('bots')).bots[0].username,'FEZIBOT');
 assert.equal((await remote.dispatch('plugins')).plugins[0].name,'FEZI Agent');
});
test('remote edits require explicit confirmation and allowlisted actions',async()=>{
 const {remote,changes}=stub();
 await assert.rejects(remote.dispatch('start-agent',{projectId:ID,goal:'Create a new homepage'}),{status:409});
 await assert.rejects(remote.dispatch('checkpoint',{projectId:ID}),{status:409});
 await assert.rejects(remote.dispatch('raw-shell',{command:'rm -rf /'}),{status:404});
 const job=await remote.dispatch('start-agent',{projectId:ID,goal:'Create a new homepage',confirm:true,maxSteps:20});
 assert.equal(job.task.id,'job1');assert.equal(changes.length,1);
 assert.equal(changes[0].maxSteps,8);assert.equal(changes[0].approveExternalBridges,false);
});
test('telegram admin remote operations require verified webhook and two-stage /run confirmation',async()=>{
 const {remote,changes}=stub();const sent=[];
 const bot=createTelegramFactory({baseUrl:'https://fezi.test',secret:'long-secret-secret-123456789',token:'dummy',allowedIds:'222',api:async(method,body)=>{if(method==='sendMessage')sent.push(body)},remote:remote.dispatch});
 async function msg(text,id=222,header='long-secret-secret-123456789'){
  return bot.onUpdate(header,{update_id:sent.length+1,message:{chat:{type:'private',id},from:{id},text}});
 }
 await assert.rejects(msg('/projects',222,'wrong'),{status:403});
 await msg('/projects',333);assert.doesNotMatch(sent.at(-1).text,/0123456789abcdef/);
 await msg('/projects');assert.match(sent.at(-1).text,/0123456789abcdef/);
 await msg('/run '+ID+' Improve the website');assert.equal(changes.length,0);
 const code=sent.at(-1).text.match(/\/confirm\s+([A-F0-9]{8})/)[1];
 await msg('/confirm '+code);assert.equal(changes.length,1);assert.match(sent.at(-1).text,/job1/);
 await msg('/confirm '+code);assert.equal(changes.length,1);
});
test('private MCP rejects missing token or wrong bearer and lists guarded remote tools',async()=>{
 const {remote}=stub();
 async function invoke(authorization,token='A'.repeat(44),body={jsonrpc:'2.0',id:1,method:'tools/list'}){
  let status,content;const req={method:'POST',headers:{authorization}};
  const res={writeHead:(s)=>status=s,end:(d)=>content=JSON.parse(d)};
  await handleFeziAgentMcp(req,res,{token,readBody:async()=>body,skills:{},discovery:{},bots:{},remoteControl:remote});
  return {status,content};
 }
 assert.equal((await invoke('Bearer bad')).status,401);
 assert.equal((await invoke('Bearer '+('A'.repeat(44)),'short')).status,503);
 let r=await invoke('Bearer '+('A'.repeat(44)));
 assert.equal(r.status,200);assert.ok(r.content.result.tools.some(t=>t.name==='fezi_remote_start_agent'));
 r=await invoke('Bearer '+('A'.repeat(44)),'A'.repeat(44),{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'fezi_remote_start_agent',arguments:{projectId:ID,goal:'New landing page'}}});
 assert.match(r.content.error.message,/confirmation/i);
});
