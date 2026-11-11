/**
 * FEZI Studio shared remote control plane, used by Telegram owner bot and
 * private ChatGPT-compatible MCP. No unrestricted shell or secret read paths.
 * Every command acts on the local host instance that received the request.
 */
export function createFeziRemoteControl({projects,agent,bots,plugins=[],clock=()=>new Date()}={}){
  const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
  const idOk=id=>typeof id==='string'&&/^[a-f0-9]{16}$/.test(id);
  async function dispatch(command,args={}){
    if(!args||typeof args!=='object'||Array.isArray(args))throw invalid('Invalid arguments');
    const id=String(args.projectId||'');
    switch(command){
      case 'status':
        return {ok:true,serverTime:clock().toISOString(),mode:'remote-control',access:'owner-authenticated',services:{website:'running',telegramFactory:!!process.env.TELEGRAM_FACTORY_BOT_TOKEN,modelApi:!!(process.env.AI_API_KEY||process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY),githubPush:'not-verified',chatgptMcp:!!(process.env.FEZI_AGENT_MCP_TOKEN?.length>=32)},note:'Configured does not prove the external service is operational.'};
      case 'projects':{
        const p=await projects();return {projects:p.slice(0,50).map(x=>({id:x.id,name:x.name,template:x.template,updatedAt:x.updatedAt})),total:p.length};
      }
      case 'bots':return {bots:bots.list().slice(0,50).map(x=>({id:x.id,name:x.name,username:x.username,active:x.active,visibility:x.visibility})),source:'local FEZI Studio installation'};
      case 'plugins':return {plugins:plugins.map(x=>({name:x.nameEn||x.name||x.slug,version:x.version||null,slug:x.slug||null})),note:'Catalog only; ChatGPT plugin activation requires separate installation and permissions.'};
      case 'jobs':{
        if(!idOk(id))throw invalid('Valid projectId required');
        const j=await agent.list(id);
        return {jobs:j.slice(0,12).map(x=>({id:x.id,status:x.status,goal:String(x.goal||'').slice(0,100),updatedAt:x.updatedAt})),projectId:id};
      }
      case 'checkpoint':{
        if(!idOk(id))throw invalid('Valid projectId required');
        if(args.confirm!==true)throw invalid('Explicit confirmation required',409);
        const cp=await agent.checkpoint(id,'remote checkpoint');return {ok:true,checkpoint:cp};
      }
      case 'start-agent':{
        if(!idOk(id))throw invalid('Valid projectId required');
        const goal=String(args.goal||'').trim();
        if(goal.length<4||goal.length>1800)throw invalid('Goal must be 4 to 1800 characters');
        if(args.confirm!==true)throw invalid('Explicit confirmation required',409);
        // No external bridges or deployment grants from text commands.
        const task=await agent.start({projectId:id,goal,provider:'auto',maxSteps:Math.min(8,Math.max(1,Number(args.maxSteps)||6)),collaborate:false,approveExternalBridges:false});
        return {ok:true,task,note:'Task queued; completion and any actual code changes must be verified from task status.'};
      }
      default:throw invalid('Unknown remote command',404);
    }
  }
  return {dispatch};
}
