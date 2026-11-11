/** FEZI Scholar + Telegram bot knowledge: fixed, read-only local sources. */
import fs from 'node:fs/promises';
import path from 'node:path';

const DOCS=Object.freeze([
 {id:'scholar',label:'FEZI Scholar research workflow',kind:'scholar',file:'scholar-research-SKILL.md'},
 {id:'scholar-registry',label:'Scholar/Video5 catalog',kind:'scholar',file:'scholar-video-registry.json'},
 {id:'video5',label:'Five-second video workflow',kind:'video',file:'video5-SKILL.md'},
 {id:'telegram-knowledge',label:'Telegram Knowledge for Custom GPT (FA)',kind:'telegram',file:'telegram-knowledge-fa.md'},
 {id:'telegram-foundation',label:'Telegram Bot Maker foundational skill',kind:'telegram',file:'telegram-bot-maker-foundation-SKILL.md'},
 {id:'telegram-history',label:'Telegram plugin archive status',kind:'telegram',file:'telegram-plugins-status-fa.md'},
 {id:'scholar-rollout',label:'Scholar/Video5 source rollout',kind:'scholar',file:'scholar-video-rollout.md'},
 {id:'mcp-ui-40',label:'MCP Apps UI 40 source catalog',kind:'mcp',file:'mcp-ui-40-catalog.json'},
 {id:'mcp-ui-runbook',label:'MCP UI 40 integration skill',kind:'mcp',file:'mcp-ui-40-SKILL.md'},
]);
function normalizeQuery(q){return String(q??'').trim().slice(0,120).toLocaleLowerCase();}
function documentExcerpt(content,index,length=280){return content.slice(Math.max(0,index-75),Math.min(content.length,index+length)).replace(/\s+/g,' ').trim();}
export function createFeziUnifiedKnowledge({root}={}){
 if(typeof root!=='string'||!root)throw Error('root required');
 const directory=path.join(root,'references','fezi-scholar-telegram');
 return {
  sources(){return {status:'BUNDLED',documents:DOCS.map(({id,label,kind})=>({id,label,kind})),note:'Local verified reference text; live scholarly APIs, third-party bot services and video generation are NOT connected by this registry.'};},
  async search({query='',kind='all',limit=6}={}){
   const q=normalizeQuery(query);
   if(q.length<2)throw Object.assign(new Error('Query must have at least 2 characters'),{status:400});
   if(!['all','scholar','telegram','video','mcp'].includes(kind))throw Object.assign(new Error('Unsupported source category'),{status:400});
   const cap=Math.max(1,Math.min(12,Math.floor(Number(limit)||6))),matches=[];
   for(const doc of DOCS){
    if(kind!=='all'&&kind!==doc.kind)continue;
    const content=await fs.readFile(path.join(directory,doc.file),'utf8');
    const index=content.toLocaleLowerCase().indexOf(q);
    if(index>=0)matches.push({id:doc.id,source:doc.label,kind:doc.kind,excerpt:documentExcerpt(content,index),file:`references/fezi-scholar-telegram/${doc.file}`});
    if(matches.length>=cap)break;
   }
   return {query:String(query).trim().slice(0,120),results:matches,totalMatchesInFiles:matches.length,source:'bundled_knowledge_only',note:'Use authorized provider tools for actual paper search, Telegram bot deployment, or video generation.'};
  }
 };
}

export function feziUnifiedReadiness(env={}){
 const https=(()=>{try{return new URL(String(env.PUBLIC_BASE_URL||'')).protocol==='https:'}catch{return false}})();
 const mcp=typeof env.FEZI_AGENT_MCP_TOKEN==='string'&&env.FEZI_AGENT_MCP_TOKEN.length>=32;
 const bot=/^\d{5,15}:[A-Za-z0-9_-]{25,}$/.test(String(env.TELEGRAM_FACTORY_BOT_TOKEN||'')) && /^[A-Za-z0-9_-]{16,256}$/.test(String(env.TELEGRAM_FACTORY_WEBHOOK_SECRET||''));
 const model=!!(env.OPENROUTER_API_KEY||env.AI_API_KEY||env.OPENAI_API_KEY||env.MISTRAL_API_KEY);
 const service=(status,reason)=>({status,reason});
 return {
  installation:'FEZI Studio one-site Node.js 22',
  services:{
   website:service('READY','Node server routes are registered when process starts; public availability requires deployment verification'),
   websiteControllerMcp:service(mcp?'CONFIGURED_UNVERIFIED':'CONFIG_REQUIRED',mcp?'Private token configured; remote OAuth/gateway and an authenticated live call remain unverified':'Create a fresh FEZI_AGENT_MCP_TOKEN (32+ chars) before using the private MCP'),
   telegramFactory:service(bot&&https?'CONFIGURED_UNVERIFIED':'CONFIG_REQUIRED',bot&&https?'Bot token and HTTPS base URL configured; webhook must be registered and tested':'Requires new BotFather token, webhook secret, HTTPS domain and Telegram webhook setup'),
   modelApi:service(model?'CONFIGURED_UNVERIFIED':'CONFIG_REQUIRED',model?'Provider key configured; inference and quotas not verified':'Requires permitted API credentials and provider testing'),
   scholarResearch:service('BUNDLED_KNOWLEDGE','Workflow and references included; live Crossref/OpenAlex/Semantic Scholar calls need connected runtime'),
   video5:service('BUNDLED_KNOWLEDGE','Video five-second workflow included; no video engine or credits proven'),
   telegramBotKnowledge:service('BUNDLED_KNOWLEDGE','Telegram development knowledge bundled; no Telegram account access from text alone'),
   mcpAppsUi40:service('BUNDLED_KNOWLEDGE','Forty MCP Apps examples/catalog references; app registration and host UI support must be implemented separately'),
   chatgptPrivatePlugin:service('CONFIG_REQUIRED','Plugin Creator registration is separate from connecting the deployed MCP with supported ChatGPT authentication'),
   pluginHub:service('READY','Local registry routes available; external ChatGPT plugins do not start as server processes'),
   githubDeployment:service('CONFIG_REQUIRED','Requires GitHub write grant and explicit repo-to-host deployment configuration')
  },
  publicHttpsConfigured:https,
  noSecretsReturned:true
 };
}
