// Private, development-only MCP Streamable HTTP JSON server. Production ChatGPT
// plugins must use OAuth 2.1 and a public HTTPS endpoint, not this shared-key adapter.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {projectId,fileName} from './core/validation.js';
import {listLocalModels} from './core/local-models.js';
import {publicTask,BRAND} from './core/fezi-router.js';
const schemas={
  list_projects:{type:'object',properties:{}},
  list_local_models:{type:'object',properties:{}},
  academy_catalog:{type:'object',properties:{}},
  academy_get_task:{type:'object',properties:{task_id:{type:'string'}},required:['task_id']},
  academy_recommend_model:{type:'object',properties:{task_id:{type:'string'},offline_only:{type:'boolean'}},required:['task_id']},
  academy_progress:{type:'object',properties:{}},
  start_agent_task:{type:'object',properties:{project_id:{type:'string'},goal:{type:'string'}},required:['project_id','goal']},
  get_agent_task:{type:'object',properties:{task_id:{type:'string'}},required:['task_id']},
  list_agent_tasks:{type:'object',properties:{project_id:{type:'string'}},required:['project_id']},
  read_project:{type:'object',properties:{project_id:{type:'string'}},required:['project_id']},
  propose_file_change:{type:'object',properties:{project_id:{type:'string'},path:{type:'string'},content:{type:'string'}},required:['project_id','path','content']},
  apply_file_change:{type:'object',properties:{project_id:{type:'string'},path:{type:'string'},content:{type:'string'},confirm:{type:'boolean',description:'Explicit user confirmation required'}},required:['project_id','path','content','confirm']}
};
function secure(a,b){const x=crypto.createHash('sha256').update(String(a)).digest();const y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y);}
function error(message){throw new Error(message);}
const textResult=obj=>({content:[{type:'text',text:JSON.stringify(obj)}]});
export async function handleMcp(req,res,{dataRoot,readBody,agent,metadata,scanFiles,saveFiles,getCatalog,getTask,listTasks,recommendTaskModel,academyProgress}){
  if(!process.env.MCP_DEV_TOKEN ||process.env.MCP_DEV_TOKEN.length<25){res.writeHead(503);res.end('MCP development endpoint is disabled');return;}
  const token=(req.headers.authorization||'').replace(/^Bearer /i,'');
  if(!secure(token,process.env.MCP_DEV_TOKEN)){res.writeHead(401,{'www-authenticate':'Bearer realm="FEZI local development"'});res.end('Unauthorized');return;}
  if(req.method!=='POST'){res.writeHead(405);res.end();return;}
  const body=await readBody(req);
  const send=payload=>{res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
  if(!body || body.jsonrpc!=='2.0')return send({jsonrpc:'2.0',id:body?.id??null,error:{code:-32600,message:'Invalid JSON-RPC request'}});
  if(body.id===undefined)return send({jsonrpc:'2.0',id:null,result:{}});
  try{
    let result;
    if(body.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'fezi-agent-dev',version:'1.0.0'}};
    else if(body.method==='ping')result={};
    else if(body.method==='tools/list')result={tools:Object.entries(schemas).map(([name,inputSchema])=>({name,title:name.replaceAll('_',' '),description:'FEZI AGENT local workspace operation',inputSchema,annotations:{destructiveHint:['apply_file_change','start_agent_task'].includes(name),readOnlyHint:!['apply_file_change','start_agent_task'].includes(name)}}))};
    else if(body.method==='tools/call'){
      const name=body.params?.name,args=body.params?.arguments||{};
      if(!Object.hasOwn(schemas,name))error('Unknown tool');
      const root=path.join(dataRoot,'projects');
      if(name==='list_local_models'){result=textResult({engine:BRAND,ready:(await listLocalModels()).some(x=>x.installed)});}
      else if(name==='academy_catalog'){
        const m=await getCatalog();result=textResult({total:m.total_tasks,categories:m.categories.map(x=>({id:x.id,title:x.title_fa,count:x.count})),notice:m.warning});
      }else if(name==='academy_get_task')result=textResult({task:await getTask(args.task_id)});
      else if(name==='academy_recommend_model')result=textResult({engine:BRAND,selection:'automatic',taskId:args.task_id,capability:(await recommendTaskModel({taskId:args.task_id,offlineOnly:args.offline_only===true})).capability});
      else if(name==='academy_progress')result=textResult(await academyProgress.summary());
      else if(name==='start_agent_task'){
        if(!agent)error('Agent service unavailable');
        const job=await agent.start({projectId:args.project_id,goal:args.goal,provider:'auto',maxSteps:6,approveExternalBridges:false});
        result=textResult({task:job,notice:'Changes are local and checkpointed. Publishing requires separate confirmation.'});
      }else if(name==='get_agent_task'){
        if(!agent)error('Agent service unavailable');
        const task=await agent.load(args.task_id);result=textResult({task:publicTask(task)});
      }else if(name==='list_agent_tasks'){
        if(!agent)error('Agent service unavailable');
        result=textResult({tasks:(await agent.list(args.project_id)).map(publicTask)});
      }else if(name==='list_projects'){
        const ids=await fs.readdir(root).catch(()=>[]);
        const projects=[];
        for(const id of ids)if(/^[a-f0-9]{16}$/.test(id))try{projects.push(JSON.parse(await fs.readFile(path.join(root,id,'meta.json'),'utf8')));}catch{}
        result=textResult({projects});
      }else{
        const id=args.project_id;
        if(!/^[a-f0-9]{16}$/.test(String(id)))error('Invalid project ID');
        const dir=path.join(root,id);
        await metadata(id);
        if(name==='read_project'){
          result=textResult({project_id:id,files:await scanFiles(projectId(id))});
        }else{
          const safeName=fileName(args.path);
          if(typeof args.content!=='string'||Buffer.byteLength(args.content)>240_000)error('Invalid content');
          const files=await scanFiles(id);
          const previous=files[safeName]||'';
          if(name==='propose_file_change')result=textResult({path:safeName,previousLength:previous.length,newLength:args.content.length,preview:args.content.slice(0,4500),requiresConfirmation:true});
          else {
            if(args.confirm!==true)error('Explicit confirmation required');
            // Shared saveFiles enforces batch/file/count/path constraints and updates project metadata.
            const backupDir=path.join(dataRoot,'mcp-backups',id);await fs.mkdir(backupDir,{recursive:true});
            await fs.writeFile(path.join(backupDir,crypto.randomBytes(8).toString('hex')+'.json'),JSON.stringify({path:safeName,previous,at:new Date().toISOString()}));
            await saveFiles(id,[{path:safeName,content:args.content}]);
            result=textResult({saved:true,path:safeName,backup:true});
          }
        }
      }
    } else return send({jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'Method not found'}});
    return send({jsonrpc:'2.0',id:body.id,result});
  }catch(ex){return send({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:ex.message}],isError:true}});}
}
