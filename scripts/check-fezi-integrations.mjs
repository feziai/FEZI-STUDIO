import {providers} from '../integrations.js';
// Safe preflight: no network requests, no credential values, no external side effects.
const entries=providers();
const checks=[
  ['GitHub upload',Boolean(process.env.GITHUB_TOKEN)&&Boolean(process.env.GITHUB_ALLOWED_REPOS)],
  ['Telegram main',Boolean(process.env.TELEGRAM_BOT_TOKEN||process.env.TELEGRAM_FEZI_STUDIO_TOKEN)],
  ['Telegram Arina',Boolean(process.env.TELEGRAM_ARINA_TOKEN)],
  ['Telegram fast login',Boolean(process.env.TELEGRAM_FAST_LOGIN_TOKEN)],
  ['Google OAuth',Boolean(process.env.GOOGLE_CLIENT_ID)&&Boolean(process.env.GOOGLE_CLIENT_SECRET)],
  ['MongoDB',Boolean(process.env.MONGODB_URI)],
  ['Voice browser STT (client dependent)',true],
  ['Whisper.cpp tiny CPU',Boolean(process.env.WHISPER_CPP_EXECUTABLE)&&Boolean(process.env.WHISPER_CPP_MODEL)]
];
const report={site:'FEZI Studio',oneNodeServer:true,gpuRequiredForApiChat:false,freeOnly:process.env.FEZI_AGENT_FREE_ONLY!=='false',providers:entries.map(x=>({id:x.id,configured:x.configured===true,model:x.model})),services:checks.map(([name,configured])=>({name,configured})),notice:'Configured means environment fields are present. It does not mean tokens are valid or live service tests passed.'};
console.log(JSON.stringify(report,null,2));
