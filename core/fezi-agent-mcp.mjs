/** A private scoped MCP preview for FEZI Agent. Do not expose as an OAuth-less public MCP. */
import crypto from 'node:crypto';
import {runAgentShell,allowedAgentShellActions} from './fezi-agent-shell.mjs';
import {feziUnifiedReadiness} from './fezi-unified-knowledge.mjs';
const schema={type:'object',properties:{}};
const tools=[
 {name:'fezi_agent_skill_catalog',title:'FEZI website builder skills',inputSchema:{type:'object',properties:{q:{type:'string'},limit:{type:'integer'}}},annotations:{readOnlyHint:true}},
 {name:'fezi_free_model_catalog',title:'FEZI free model discovery',inputSchema:{type:'object',properties:{q:{type:'string'},source:{type:'string'}}},annotations:{readOnlyHint:true}},
 {name:'fezi_telegram_bots',title:'Connected Telegram bot registry',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_remote_status',title:'Remote FEZI Studio health and availability',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_remote_projects',title:'List FEZI Studio projects',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_remote_plugins',title:'Installed FEZI Studio plugin catalog',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_remote_jobs',title:'List recent FEZI Agent tasks',inputSchema:{type:'object',properties:{projectId:{type:'string'}},required:['projectId']},annotations:{readOnlyHint:true}},
 {name:'fezi_remote_start_agent',title:'Start a confirmed FEZI Agent editing task',inputSchema:{type:'object',properties:{projectId:{type:'string'},goal:{type:'string'},confirm:{type:'boolean',description:'Explicit owner confirmation'},maxSteps:{type:'integer'}},required:['projectId','goal','confirm']},annotations:{readOnlyHint:false,destructiveHint:true}},
 {name:'fezi_remote_checkpoint',title:'Save a project checkpoint before edits',inputSchema:{type:'object',properties:{projectId:{type:'string'},confirm:{type:'boolean'}},required:['projectId','confirm']},annotations:{readOnlyHint:false}},
 {name:'fezi_site_read',title:'Read a FEZI Studio project text file or list files',inputSchema:{type:'object',properties:{projectId:{type:'string'},path:{type:'string'}},required:['projectId']},annotations:{readOnlyHint:true}},
 {name:'fezi_site_preview_replace',title:'Preview an exact website file edit without saving',inputSchema:{type:'object',properties:{projectId:{type:'string'},path:{type:'string'},find:{type:'string'},replace:{type:'string'}},required:['projectId','path','find','replace']},annotations:{readOnlyHint:true}},
 {name:'fezi_site_apply_replace',title:'Apply a confirmed website file edit after checkpoint',inputSchema:{type:'object',properties:{projectId:{type:'string'},path:{type:'string'},find:{type:'string'},replace:{type:'string'},expectedSha256:{type:'string'},confirm:{type:'boolean'}},required:['projectId','path','find','replace','expectedSha256','confirm']},annotations:{readOnlyHint:false,destructiveHint:true}},
 {name:'fezi_unified_readiness',title:'FEZI Studio module connection and launch readiness (no credentials)',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_knowledge_sources',title:'Scholar and Telegram bot development source catalog',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'fezi_knowledge_search',title:'Search FEZI Scholar, Telegram and Video5 archived knowledge',inputSchema:{type:'object',properties:{query:{type:'string'},kind:{type:'string',enum:['all','scholar','telegram','video','mcp']},limit:{type:'integer'}},required:['query']},annotations:{readOnlyHint:true}},
 {name:'fezi_safe_diagnostic',title:'Owner-only allowlisted host diagnostic',inputSchema:{type:'object',properties:{action:{type:'string',enum:allowedAgentShellActions()}},required:['action']},annotations:{readOnlyHint:false,destructiveHint:false}}
];
function eq(a,b){const aa=crypto.createHash('sha256').update(String(a||'')).digest(),bb=crypto.createHash('sha256').update(String(b||'')).digest();return crypto.timingSafeEqual(aa,bb)}
const send=(res,status,value)=>{const text=JSON.stringify(value);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-length':Buffer.byteLength(text)});res.end(text)};
export async function handleFeziAgentMcp(req,res,{token='',readBody,skills,discovery,bots,remoteControl,websiteEditor,knowledge,root,shellEnabled=false}={}){
 if(!token||token.length<32)return send(res,503,{error:'Private MCP not configured; public exposure requires OAuth'});
 const provided=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!eq(provided,token))return send(res,401,{error:'Unauthorized'});
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 const body=await readBody(req);
 const reply=(result)=>send(res,200,{jsonrpc:'2.0',id:body.id,result});
 const error=(code,message)=>send(res,200,{jsonrpc:'2.0',id:body.id,error:{code,message}});
 if(body.jsonrpc!=='2.0')return error(-32600,'Invalid JSON-RPC');
 if(body.method==='initialize')return reply({protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'fezi-agent-private',version:'1.0.0'}});
 if(body.method==='ping')return reply({});
 if(body.method==='tools/list')return reply({tools});
 if(body.method==='tools/call'){
  const name=body.params?.name,args=body.params?.arguments||{};
  if(!tools.some(x=>x.name===name))return error(-32602,'Unknown tool');
  if(!args||typeof args!=='object'||Array.isArray(args))return error(-32602,'Invalid arguments');
  let result;
  if(name==='fezi_agent_skill_catalog')result=skills.list(String(args.q||'').slice(0,160),Math.min(30,Number(args.limit)||20));
  if(name==='fezi_free_model_catalog')result=discovery.view({query:String(args.q||'').slice(0,120),source:args.source,limit:30});
  if(name==='fezi_telegram_bots')result={bots:bots.list().map(({id,name,username,commands,visibility})=>({id,name,username,commands,visibility}))};
  const commands={fezi_remote_status:'status',fezi_remote_projects:'projects',fezi_remote_plugins:'plugins',fezi_remote_jobs:'jobs',fezi_remote_start_agent:'start-agent',fezi_remote_checkpoint:'checkpoint'};
  if(Object.hasOwn(commands,name)){
   if(!remoteControl)return error(-32000,'Remote control not installed');
   try{result=await remoteControl.dispatch(commands[name],args)}catch(ex){return error(-32001,String(ex.message||ex).slice(0,260));}
  }
  if(name.startsWith('fezi_site_')){
   if(!websiteEditor)return error(-32000,'FEZI website editor not installed');
   try{
    if(name==='fezi_site_read')result=await websiteEditor.read(args);
    if(name==='fezi_site_preview_replace')result=await websiteEditor.preview(args);
    if(name==='fezi_site_apply_replace')result=await websiteEditor.apply(args);
   }catch(ex){return error(-32001,String(ex.message||ex).slice(0,260));}
  }
  if(name==='fezi_unified_readiness')result=feziUnifiedReadiness(process.env);
  if(name==='fezi_knowledge_sources')result=knowledge?.sources()??{error:'Knowledge module is unavailable'};
  if(name==='fezi_knowledge_search'){try{result=knowledge?await knowledge.search(args):{error:'Knowledge module unavailable'}}catch(e){return error(-32602,String(e.message||e).slice(0,180))}}
  if(name==='fezi_safe_diagnostic')result=await runAgentShell(String(args.action||''),{root,enabled:shellEnabled});
  return reply({content:[{type:'text',text:JSON.stringify(result)}],isError:false});
 }
 return error(-32601,'Method not found');
}
