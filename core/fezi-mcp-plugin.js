import crypto from 'node:crypto';
import {listToolbox,toolboxSummary,toolboxHostDoctor} from './fezi-toolbox.js';
import {freeModelCatalog} from './open-model-hub.js';

const tools=[
  {name:'fezi_list_tools',title:'FEZI Studio tool catalog',description:'Browse open-source and optional creative/dev/security tools and their installation and license statuses. Does NOT install or run them.',inputSchema:{type:'object',properties:{category:{type:'string',description:'3d/game/app/code/text/prompt/image/video/video-edit/stream/security/optional/all'},search:{type:'string',maxLength:120}}},annotations:{readOnlyHint:true,destructiveHint:false}},
  {name:'fezi_list_models',title:'FEZI local model registry',description:'List supported self-hosted model IDs and their unverified readiness. Models are not automatically installed.',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true,destructiveHint:false}},
  {name:'fezi_toolbox_summary',title:'FEZI toolbox capabilities',description:'Read available capability areas without taking actions.',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true,destructiveHint:false}},
  {name:'fezi_host_status',title:'FEZI installation diagnostic',description:'Check which optional program binaries are found on the FEZI server. Does not prove model readiness.',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true,destructiveHint:false}}
];
export const MCP_PLUGIN_TOOLS=Object.freeze(tools);
function constantTimeToken(provided,expected){const a=crypto.createHash('sha256').update(String(provided)).digest();const b=crypto.createHash('sha256').update(String(expected)).digest();return crypto.timingSafeEqual(a,b);}
function reply(res,status,obj){const s=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':Buffer.byteLength(s)});res.end(s);}
function rpc(id,result){return {jsonrpc:'2.0',id,result};}
function rpcError(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
const content=x=>({content:[{type:'text',text:JSON.stringify(x)}],isError:false});
export async function handlePluginMcp(req,res,{readBody,env=process.env,diagnostics=toolboxHostDoctor}={}){
  // This Bearer token is for PRIVATE testing only. Public directory submission needs OAuth.
  const expected=env.FEZI_MCP_READ_TOKEN;
  if(typeof expected!=='string'||expected.length<32)return reply(res,503,{error:'MCP plugin preview disabled (set FEZI_MCP_READ_TOKEN >= 32 chars). OAuth required for public use.'});
  if(!constantTimeToken(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''),expected)){
    res.setHeader('WWW-Authenticate','Bearer realm="FEZI private MCP preview"');return reply(res,401,{error:'Unauthorized'});
  }
  if(req.method!=='POST')return reply(res,405,{error:'Only JSON-RPC POST available. No server-sent notifications implemented in this preview.'});
  const b=await readBody(req);
  if(b?.jsonrpc!=='2.0'||typeof b.method!=='string')return reply(res,400,rpcError(b?.id??null,-32600,'Invalid JSON-RPC'));
  if(b.id===undefined){res.writeHead(202,{'Cache-Control':'no-store'});return res.end();}
  try{
    if(b.method==='initialize')return reply(res,200,rpc(b.id,{protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'fezi-studio-private-preview',version:'1.3.0'}}));
    if(b.method==='ping')return reply(res,200,rpc(b.id,{}));
    if(b.method==='tools/list')return reply(res,200,rpc(b.id,{tools}));
    if(b.method==='tools/call'){
      const name=b.params?.name,args=b.params?.arguments||{};
      if(!tools.some(t=>t.name===name))return reply(res,200,rpcError(b.id,-32602,'Unknown or unapproved MCP tool'));
      if(!args||typeof args!=='object'||Array.isArray(args))return reply(res,200,rpcError(b.id,-32602,'Arguments must be an object'));
      let result;
      if(name==='fezi_list_tools'){
        const category=String(args.category||'all');const allowed=new Set(['all','3d','game','app','code','text','prompt','image','video','video-edit','stream','security','optional']);
        if(!allowed.has(category))return reply(res,200,rpcError(b.id,-32602,'Invalid category'));
        result={tools:listToolbox({category,search:args.search||''}).slice(0,90),notice:'Catalog only; no runtimes were installed by this call.'};
      }else if(name==='fezi_list_models')result={models:freeModelCatalog(),notice:'Status is unverified until an actual model is tested on the connected host.'};
      else if(name==='fezi_host_status')result=await diagnostics({env});
      else result=toolboxSummary();
      return reply(res,200,rpc(b.id,content(result)));
    }
    return reply(res,200,rpcError(b.id,-32601,'Method not found'));
  }catch{return reply(res,200,rpcError(b.id,-32603,'Internal processing error'));}
}
