import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {agents,skills,publicAgents,getAgent} from './catalog.mjs';
import { cfg } from './config.mjs';
import { agentAnswer } from './brain.mjs';
import {createFleet} from './telegram.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
const pluginsDir=path.join(root,'..','plugins');
const json=(res,code,value)=>{
  res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff','access-control-allow-origin':'none'});
  res.end(JSON.stringify(value));
};
function authorized(req){
  const given=req.headers.authorization||'';
  return !!cfg.dashboardToken && given===`Bearer ${cfg.dashboardToken}`;
}
function safePublicPath(url){
  let decoded;
  try{decoded=decodeURIComponent(url.split('?')[0]);}catch{return null;}
  const isPlugins=decoded==='/plugins'||decoded.startsWith('/plugins/');
  const base=isPlugins?pluginsDir:publicDir;
  const relative=isPlugins?decoded.replace(/^\/plugins\/?/,'/'):decoded;
  const candidate=path.resolve(base, '.'+relative);
  if(candidate!==base&&!candidate.startsWith(base+path.sep))return null;
  return candidate;
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon',
 '.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.webp':'image/webp'};
async function serveStatic(res,requestPath){
  if(requestPath==='/plugins'){
    res.writeHead(301,{location:'/plugins/','cache-control':'no-store'});res.end();return;
  }
  const target=safePublicPath(requestPath==='/'?'/index.html':requestPath==='/plugins/'?'/plugins/index.html':requestPath);
  if(!target){res.writeHead(403);res.end('Forbidden');return;}
  try{
    const data=await fs.readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream',
      'x-content-type-options':'nosniff','cache-control':'public, max-age=3600'});
    res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}
async function readBody(req){
  let buffer='';
  for await (const chunk of req){
    buffer+=chunk.toString('utf8');
    if(Buffer.byteLength(buffer)>10000)throw new Error('Body too large');
  }
  return JSON.parse(buffer||'{}');
}
export function createApp({fleet=createFleet()}={}){
  const server=http.createServer(async(req,res)=>{
    const pathName=new URL(req.url||'/', 'http://localhost').pathname;
    try{
      if(req.method==='GET'&&pathName==='/health'){
        return json(res,200,{ok:true,service:'FEZI Agent Fleet',configured:agents.length});
      }
      if(req.method==='GET'&&pathName==='/api/agents')
        return json(res,200,{agents:publicAgents(fleet.statuses)});
      if(req.method==='GET'&&pathName==='/api/skills')
        return json(res,200,{skills});
      if(req.method==='GET'&&pathName==='/api/status')
        return json(res,200,{online:Object.values(fleet.statuses).filter(s=>s.status==='online').length,
          total:agents.length,aiConnected:Boolean(cfg.apiKey),chatEnabled:Boolean(cfg.dashboardToken)});
      if(req.method==='POST'&&pathName==='/api/chat'){
        if(!cfg.dashboardToken)return json(res,503,{error:'Chat access is not configured (DASHBOARD_TOKEN).'});
        if(!authorized(req))return json(res,401,{error:'Authentication required'});
        const body=await readBody(req);
        if(typeof body.message!=='string'||!body.message.trim())
          return json(res,400,{error:'Message required'});
        const agent=getAgent(String(body.agentId||'general_bot'));
        if(!agent)return json(res,404,{error:'Unknown agent'});
        const answer=await agentAnswer(body.message,agent);
        return json(res,200,{agentId:agent.id,answer,mode:cfg.apiKey?'AI':'setup'});
      }
      if(req.method==='GET')return serveStatic(res,pathName);
      return json(res,404,{error:'Not found'});
    }catch(e){
      console.error('Request failed:',String(e.message).slice(0,160));
      return json(res,500,{error:'Request failed'});
    }
  });
  return {server,fleet};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server,fleet}=createApp();
  server.listen(cfg.port,cfg.host,async()=>{
    console.log(`FEZI Agent running on port ${cfg.port}; online bots require configured tokens`);
    await fleet.start();
  });
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
    fleet.stop().finally(()=>server.close(()=>process.exit(0)));
  });
}
