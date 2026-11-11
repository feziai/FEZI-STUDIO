import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const exec=promisify(execFile);
const actions=Object.freeze({
  'node-version':{cmd:process.execPath,args:['--version']},
  'git-status':{cmd:'git',args:['status','--short']},
  'agent-tests':{cmd:process.execPath,args:['--test','tests/fezi-agent-skills.test.mjs']},
  'telegram-tests':{cmd:process.execPath,args:['--test','tests/telegram-plugin-hub.test.mjs','tests/fezi-factory.test.mjs']},
  'catalog-tests':{cmd:process.execPath,args:['--test','tests/fezi-discovery.test.mjs']}
});
export function allowedAgentShellActions(){return Object.keys(actions)}
export async function runAgentShell(action,{root,enabled=false,executor=exec}={}){
 if(!enabled)throw Object.assign(new Error('Shell diagnostics disabled by owner'),{status:403});
 if(!Object.hasOwn(actions,action))throw Object.assign(new Error('Command is not allowlisted'),{status:400});
 const {cmd,args}=actions[action],cwd=path.resolve(root);
 const start=Date.now();
 try{const {stdout,stderr}=await executor(cmd,args,{cwd,timeout:18000,maxBuffer:64*1024,env:{...process.env,NODE_OPTIONS:''},shell:false});
  return {action,ok:true,exitCode:0,durationMs:Date.now()-start,output:String(stdout||'').slice(0,5000),warnings:String(stderr||'').slice(0,1500)};
 }catch(e){return {action,ok:false,exitCode:typeof e.code==='number'?e.code:null,durationMs:Date.now()-start,output:String(e.stdout||'').slice(0,5000),warnings:String(e.stderr||'').slice(0,1500)};}
}
