#!/usr/bin/env node
/** Safe GitHub publisher. Defaults to private, refuses mismatched accounts and nonempty repos. */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);
const option=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:'';
const repo=option('--repo')||'feziai/FEZI-AGENT';
const dry=argv.includes('--dry-run');
const vis=argv.includes('--public')?'--public':'--private';
function run(program,args,{quiet=false,ok=false}={}){
  const r=spawnSync(program,args,{cwd:root,encoding:'utf8',stdio:quiet?'pipe':'inherit',timeout:120000});
  if(r.error && !ok)throw Error(`Missing ${program}; install it first`);
  if(r.status!==0&&!ok)throw Error(`${program} ${args[0]} failed (${r.status})`);
  return r;
}
if(argv.includes('--help')){
  console.log('Usage: node scripts/publish-github.mjs --repo feziai/FEZI-AGENT --private --confirm');
  console.log('Dry-run: node scripts/publish-github.mjs --repo feziai/FEZI-AGENT --dry-run');
  console.log('Requires local gh auth login as owner; supports creating repo or using EXISTING EMPTY repo.');
  process.exit(0);
}
if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/.test(repo))throw Error('Invalid OWNER/REPO');
const required=['server.js','telegram.js','package.json','.env.example','.gitignore','.github/workflows/ci.yml','scripts/telegram-poll.mjs','core/telegram-runtime.js'];
const missing=required.filter(f=>!fs.statSync(path.join(root,f),{throwIfNoEntry:false})?.isFile());
if(missing.length)throw Error('Release incomplete: '+missing.join(', '));
if(dry){console.log(JSON.stringify({ready:true,target:repo,visibility:vis.slice(2),files:required.length,remoteWrites:false},null,2));process.exit(0);}
if(!argv.includes('--confirm'))throw Error('Pass --confirm only when ready to publish');
// Auth is handled by gh on the owner's machine; never ask for a token in chat.
run('gh',['auth','status']);
const owner=repo.split('/')[0];
const login=run('gh',['api','user','--jq','.login'],{quiet:true}).stdout.trim();
if(owner.toLowerCase()!==login.toLowerCase())throw Error(`GitHub logged in as ${login}; expected ${owner}`);
run('gh',['auth','setup-git']);
if(!fs.existsSync(path.join(root,'.git')))run('git',['init','-b','main']);
const remote=run('git',['remote','get-url','origin'],{quiet:true,ok:true});
const expected=`https://github.com/${repo}.git`;
if(remote.status===0 && !remote.stdout.trim().toLowerCase().endsWith(`/${repo.toLowerCase()}.git`))throw Error('Existing origin belongs to another repository; refusing to overwrite it');
// Never stage secrets or model weights; .gitignore is the first defense.
run('git',['add','.']);
const staged=run('git',['diff','--cached','--name-only'],{quiet:true}).stdout;
const unsafe=staged.split('\n').filter(x=>/(^|\/)(\.env$|\.env\.(?!example$)|node_modules\/|data\/|.*\.(gguf|pem|key|p12|keystore)$)/i.test(x));
if(unsafe.length)throw Error('Private files staged: '+unsafe.join(', '));
if(staged.trim()){
  // Explicit author is local to this repo; does not modify global git settings.
  run('git',['-c','user.name=FEZI AGENT Release','-c','user.email=fezi-agent@users.noreply.github.com','commit','-m','FEZI AGENT 0.77: Telegram, desktop and GitHub deployment']);
}
const existing=run('gh',['repo','view',repo,'--json','name'],{quiet:true,ok:true});
if(existing.status===0){
  // The existing repository must be empty; do not merge into unrelated code or force-push.
  const refs=run('git',['ls-remote','--heads',expected],{quiet:true,ok:true});
  if(refs.status!==0||refs.stdout.trim())throw Error('Existing repository is not empty or cannot be checked; manual review required');
  if(remote.status!==0)run('git',['remote','add','origin',expected]);
  run('git',['push','-u','origin','main']);
}else{
  run('gh',['repo','create',repo,vis,'--source=.','--remote=origin','--push']);
}
console.log('Published: https://github.com/'+repo);
