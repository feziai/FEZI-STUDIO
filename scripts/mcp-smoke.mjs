// Tests only development MCP endpoint; run with configured MCP_DEV_TOKEN.
const key=process.env.MCP_DEV_TOKEN;
if(!key||key.length<25){console.error('Set MCP_DEV_TOKEN to a local secret (at least 25 characters)');process.exit(1);}
const base=process.env.MCP_TEST_URL||'http://127.0.0.1:3000/mcp';
for(const [i,method,params] of [[1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'fezi-smoke',version:'1.0'}}],[2,'tools/list',{}],[3,'tools/call',{name:'list_local_models',arguments:{}}]]){
 const r=await fetch(base,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json','accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:i,method,params})});
 if(!r.ok){console.error('MCP returned '+r.status+' for '+method);process.exitCode=1;break;}
 const data=await r.json();if(data.error||data.result?.isError){console.error(method,data);process.exitCode=1;break;}
 console.log(method,'OK',method==='tools/list'?data.result.tools.map(t=>t.name):JSON.stringify(data.result).slice(0,350));
}
