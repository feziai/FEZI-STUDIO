import crypto from 'node:crypto';

// The FEZI Gateway is a real, private, JSON-RPC-over-HTTP MCP entrypoint. It does
// not grant access to private ChatGPT plugins or make upstream tools exist by itself.
const VERSION = '2025-06-18';
const MAX_REMOTE_RESPONSE = 1024 * 1024;
function send(res, code, data, headers = {}) {
  res.writeHead(code, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store','x-content-type-options': 'nosniff', ...headers});
  res.end(JSON.stringify(data));
}
function same(a,b){
  const x=crypto.createHash('sha256').update(a).digest();
  const y=crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x,y);
}
function response(id,result){return {jsonrpc:'2.0',id,result};}
function rpcError(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
const infoTools=[
 {name:'fezi_plugin_details',description:'Get verified catalog metadata for this plugin (no private source or secrets)',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'fezi_plugin_connection_status',description:'Get MCP upstream configuration status (not an online health guarantee)',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'fezi_plugin_setup_guide',description:'List prerequisites for connecting this plugin to its own MCP server',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
];
const plainText = (x)=>({content:[{type:'text',text:JSON.stringify(x)}]});
function configFromEnvironment(slug){
  let entries={};
  try{entries=JSON.parse(process.env.FEZI_PLUGIN_UPSTREAMS_JSON||'{}');}catch{return null;}
  const entry=entries?.[slug];
  if(!entry || typeof entry.url!=='string')return null;
  let u;
  try{u=new URL(entry.url);}catch{return null;}
  if(u.username||u.password||u.hash || (u.protocol!=='https:' && !(process.env.FEZI_MCP_ALLOW_HTTP_LOCAL==='true' && u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))))return null;
  const tokenEnv=String(entry.tokenEnv||'');
  if(!/^[A-Z][A-Z0-9_]{2,100}$/.test(tokenEnv)||!process.env[tokenEnv])return null;
  return {url:u.toString(), token:process.env[tokenEnv]};
}
async function remoteRequest(cfg,method,params={},timeout=12000){
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeout);
  try{
    const req={jsonrpc:'2.0',id:crypto.randomUUID(),method,params};
    const out=await fetch(cfg.url,{method:'POST',headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':VERSION},body:JSON.stringify(req),signal:ac.signal,redirect:'error'});
    if(!out.ok)return null;
    const ct=out.headers.get('content-type')||'';
    if(!ct.includes('application/json'))return null; // SSE requires a separate adapter; never falsely claim success.
    const len=Number(out.headers.get('content-length')||'0');
    if(len>MAX_REMOTE_RESPONSE)return null;
    const body=await out.text();
    if(body.length>MAX_REMOTE_RESPONSE)return null;
    const parsed=JSON.parse(body);
    return parsed?.result||null;
  } catch {return null;} finally{clearTimeout(timer);}
}
export function gatewayStatus(registry){
 const plugins=registry.plugins||[];
 const upstreamSlugs=plugins.filter(p=>Boolean(configFromEnvironment(p.slug))).map(p=>p.slug);
 return {service:'FEZI Plugin MCP Gateway',registeredPlugins:plugins.length,gatewayConfigured:typeof process.env.FEZI_PLUGIN_HUB_TOKEN==='string'&&process.env.FEZI_PLUGIN_HUB_TOKEN.length>=32,upstreamsConfigured:upstreamSlugs.length,upstreamHealthVerified:false,realPluginActionsRequireUpstream:true,githubHostingOnly:false};
}
export async function handlePluginHubMcp(req,res,{readBody,registry,slug}){
 const plugin=registry.plugins.find(p=>p.slug===slug);
 if(!plugin){send(res,404,{error:'Unknown plugin'});return;}
 const secret=process.env.FEZI_PLUGIN_HUB_TOKEN||'';
 if(secret.length<32){send(res,503,{error:'MCP Gateway disabled; configure FEZI_PLUGIN_HUB_TOKEN on the server'});return;}
 const got=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!same(got,secret)){send(res,401,{error:'Unauthorized'},{'www-authenticate':'Bearer realm="FEZI Plugin Hub"'});return;}
 if(req.method!=='POST'){send(res,405,{error:'MCP Streamable HTTP POST required'},{'allow':'POST'});return;}
 let body;
 try{body=await readBody(req);}catch{send(res,400,{error:'Invalid JSON body'});return;}
 if(body?.jsonrpc!=='2.0'||typeof body.method!=='string') {send(res,400,rpcError(body?.id??null,-32600,'Invalid Request'));return;}
 if(body.id===undefined){res.writeHead(202);res.end();return;}
 const id=body.id;
 if(body.method==='initialize')return send(res,200,response(id,{protocolVersion:VERSION,capabilities:{tools:{}},serverInfo:{name:`fezi-${slug}`,version:'1.0.0'},instructions:'Local info tools work; upstream actions require a separately deployed authenticated MCP server.'}));
 if(body.method==='ping')return send(res,200,response(id,{}));
 const cfg=configFromEnvironment(slug);
 if(body.method==='tools/list'){
  const upstream=cfg?await remoteRequest(cfg,'tools/list',{}):null;
  const remoteTools=Array.isArray(upstream?.tools)?upstream.tools.filter(t=>/^[a-zA-Z0-9_\-]{1,100}$/.test(t.name||'')).map(t=>({name:'remote__'+t.name,description:`Connected upstream: ${String(t.description||'').slice(0,300)}`,inputSchema:t.inputSchema||{type:'object',properties:{}},annotations:t.annotations||{}})):[];
  return send(res,200,response(id,{tools:[...infoTools,...remoteTools]}));
 }
 if(body.method==='tools/call'){
  const args=body.params?.arguments||{};
  const name=body.params?.name;
  if(name==='fezi_plugin_details')return send(res,200,response(id,plainText({slug:plugin.slug,name:plugin.nameEn,version:plugin.version,chatgptVisibility:'PRIVATE',webTool:plugin.relatedWebTool,mcpUrlPath:`/mcp/hub/${slug}`})));
  if(name==='fezi_plugin_connection_status')return send(res,200,response(id,plainText({gatewayRunning:true,upstreamConfigured:Boolean(cfg),upstreamHealthVerified:false,chatgptPluginInstalledByGithub:false,providerOperationsAvailable:'Only when remote__ tools appear in tools/list'})));
  if(name==='fezi_plugin_setup_guide')return send(res,200,response(id,plainText({steps:['Deploy FEZI Studio Node.js on an HTTPS server','Set FEZI_PLUGIN_HUB_TOKEN (32+ random characters) in host secrets','Deploy a compatible upstream MCP server for this specific plugin','Set FEZI_PLUGIN_UPSTREAMS_JSON with https URL and tokenEnv','Connect authorized ChatGPT client to this MCP endpoint; verify tools/list and tool call'],endpoint:`/mcp/hub/${slug}`})));
  if(typeof name==='string'&&name.startsWith('remote__')&&cfg){
    const realName=name.slice(8);
    const listed=await remoteRequest(cfg,'tools/list',{});
    if(!Array.isArray(listed?.tools)||!listed.tools.some(t=>t.name===realName))return send(res,200,rpcError(id,-32601,'Upstream tool not available'));
    const result=await remoteRequest(cfg,'tools/call',{name:realName,arguments:args},25000);
    if(result===null)return send(res,200,rpcError(id,-32000,'Upstream call failed or needs a different transport'));
    return send(res,200,response(id,result));
  }
  return send(res,200,rpcError(id,-32601,'Tool not found or upstream not connected'));
 }
 return send(res,200,rpcError(id,-32601,'Method not found'));
}
