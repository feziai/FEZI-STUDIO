#!/usr/bin/env node
/** Controlled sequential task runner. Does not pretend to train or score models. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {getCatalog,getTask} from '../core/academy.js';
import {askProvider,providers} from '../integrations.js';

const args={};
for(let i=2;i<process.argv.length;i++){
  const token=process.argv[i];
  if(token==='--dry-run'||token==='--allow-paid')args[token.slice(2)]=true;
  else if(token.startsWith('--'))args[token.slice(2)]=process.argv[++i];
  else throw Error('Unexpected positional argument: '+token);
}
const catalog=await getCatalog();
const category=String(args.category||'deployment');
const item=catalog.categories.find(x=>x.id===category);
if(!item)throw Error('Unknown category: '+category);
const limit=Number(args.limit??5),start=Number(args.start??1);
if(!Number.isSafeInteger(start)||start<1||start>item.count||!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('start must be within category and limit must be 1..100');
const end=Math.min(start+limit-1,item.count);
const provider=String(args.provider||'local');
if(!/^[a-z][a-z0-9:_-]{0,65}$/.test(provider))throw Error('Invalid provider');
if(!args['dry-run']&&!['local','ollama'].includes(provider)&&!args['allow-paid'])throw Error('External AI service might cost money: add --allow-paid explicitly');
const defined=providers().find(x=>x.id===provider);
if(!defined)throw Error('Unknown AI provider');
if(!args['dry-run']&&!defined.configured)throw Error('AI provider not configured');
const model=String(args.model||defined.model||'');
const dataDir=path.resolve(process.env.DATA_DIR||path.join(process.cwd(),'data'));
const resultDir=path.join(dataDir,'academy','runs');
const file=path.join(resultDir,category+'-'+provider.replaceAll(':','-')+'-'+model.replace(/[^\w.-]/g,'-')+'.jsonl');
let seen=new Set();
if(!args['dry-run']){
  await fs.mkdir(resultDir,{recursive:true,mode:0o700});
  const previous=await fs.readFile(file,'utf8').catch(e=>e.code==='ENOENT'?'':Promise.reject(e));
  for(const line of previous.split('\n').filter(Boolean)){
    try{const row=JSON.parse(line);if(row.ok)seen.add(row.taskId);}catch{}
  }
}
let successes=0,skipped=0,failures=0;
for(let n=start;n<=end;n++){
  const task=await getTask(`${category}-${String(n).padStart(5,'0')}`);
  if(seen.has(task.id)){skipped++;continue;}
  if(args['dry-run']){console.log(`[dry run] ${task.id} | ${task.topic}`);continue;}
  const began=Date.now();
  try{
    const system='You are participating in a FEZI Studio guided evaluation. Provide an actionable, truthful response in Persian. State when a tool, model, deployment or media creation has NOT actually been executed. Only describe authorized and consensual actions. Include how the output should be evaluated. Maximum 3500 characters.';
    const response=await askProvider({provider,model,system,user:JSON.stringify({task:task.task,acceptance_criteria:task.acceptance_criteria,expected_format:task.expected_format})});
    const record={taskId:task.id,provider,model,ok:true,elapsedMs:Date.now()-began,reviewed:false,answer:String(response).slice(0,10000)};
    await fs.appendFile(file,JSON.stringify(record)+'\n',{encoding:'utf8',mode:0o600});successes++;
    console.log(`generated ${task.id}; not graded`);
  }catch(e){
    failures++;
    await fs.appendFile(file,JSON.stringify({taskId:task.id,provider,model,ok:false,elapsedMs:Date.now()-began,error:String(e.message).slice(0,400)})+'\n',{encoding:'utf8',mode:0o600});
    console.error(`stopped after ${task.id}: ${e.message}`);
    break;
  }
}
console.log(JSON.stringify({dryRun:!!args['dry-run'],planned:end-start+1,generated:successes,skipped,failures,file:args['dry-run']?null:file}));
if(failures)process.exitCode=1;
