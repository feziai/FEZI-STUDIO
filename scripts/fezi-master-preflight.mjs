#!/usr/bin/env node
// FEZI Studio source-level readiness audit. This script deliberately never prints secrets.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root=path.resolve(import.meta.dirname,'..');
const exists=(p)=>fs.existsSync(path.join(root,p));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'config/fezi-master-manifest.json'),'utf8'));
const env=process.env;
const checks=[];
const entry=(id,requiredFiles=[],requiredEnvs=[],note='', planned=false)=>{
 const missingFiles=requiredFiles.filter(p=>!exists(p));
 const missingEnvironment=requiredEnvs.filter(k=>!env[k]);
 const status=planned?'PLANNED':missingFiles.length?'PLANNED':missingEnvironment.length?'CONFIG REQUIRED':'READY';
 checks.push({id,status,sourcePresent:missingFiles.length===0,missingFiles,missingEnvironment,note});
};
entry('node22',[],[],`Node ${process.versions.node} (requires >=22)`, Number(process.versions.node.split('.')[0])<22);
entry('single_site_node',['server.js','package.json','public/index.html','Dockerfile','compose.api-first.yaml'],[],'Source files present. Live server/HTTPS not tested.');
entry('fezi_website_agent',['core/agent.js','public/fezi-agent'],[],'Source present only. End-to-end AI build/edit/deploy needs API + deployment tests.');
entry('agent_skills',['core/agent-skills.mjs','agent-skills/library'],[],'Local skills are not executable cloud permissions.');
entry('agent_mcp',['core/fezi-agent-mcp.mjs'],['FEZI_AGENT_MCP_TOKEN'],'Requires authentication and deployment security review.');
entry('agent_shell',['core/fezi-agent-shell.mjs'],[], 'Sandboxing and explicit permission required; source alone does not prove it is safe.');
entry('telegram_factory',['core/fezi-telegram-factory.mjs','public/plugins/telegram-builder.html'],['TELEGRAM_FACTORY_BOT_TOKEN'],'BotFather token and public HTTPS webhook required.');
entry('plugins_hub',['public/plugins/index.html'],[],'Plugin discovery pages work locally; ChatGPT plugins may still be private.');
entry('free_model_chat',['core/agent.js'],['OPENROUTER_API_KEY'],'Configured API key does not prove inference. Test :free or openrouter/free against real endpoint.');
entry('daily_catalog',['.github/workflows/fezi-daily-audit.yml'],[],'Daily source checks exist; a continuously deployed scheduler must be verified separately.');
entry('github_publish',['scripts/publish-github.mjs'],['GITHUB_TOKEN'],'Requires GitHub App or token with repository write permissions.');
entry('google_login',['public/index.html'],['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],'Production OAuth requires configured callback and valid origin.');
entry('mongodb_database',['server.js'],['MONGODB_URI'],'Connectivity is not tested by environment presence alone.');
entry('external_ai_frameworks',[],[],'Transformers/smolagents/LangChain/LiteLLM/Flowise/n8n/Open WebUI not verified as working runtime integrations.',true);
const statusOrder={'PLANNED':2,'CONFIG REQUIRED':1,'READY':0};
const summary={project:manifest.project,command:'npm run master:check',isDeployed:false,meaningOfReady:'Source and static prerequisites only; no guarantee of live provider operation.',checks,overall:checks.reduce((a,c)=>statusOrder[c.status]>statusOrder[a]?c.status:a,'READY')};
if(process.argv.includes('--json')) console.log(JSON.stringify(summary,null,2));
else {
 console.log('FEZI STUDIO MASTER PREFLIGHT — NO SECRETS SHOWN');
 for(const c of checks)console.log(`${c.status.padEnd(15)} ${c.id}${c.missingEnvironment.length?' (missing env: '+c.missingEnvironment.join(', ')+')':''}`);
 console.log('READY means file-level prerequisites only; run live tests before publishing.');
}
if(process.versions.node.split('.')[0]<22)process.exitCode=1;
