import fs from 'node:fs';
import path from 'node:path';
const envPath=path.resolve(process.cwd(),'.env');
if (fs.existsSync(envPath)){
  for (const ln of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){
    const m=ln.match(/^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if(!m)continue;
    let v=m[2].trim().replace(/^["']|["']$/g,'');
    if(process.env[m[1]]===undefined)process.env[m[1]]=v;
  }
}
export const splitIds=(s)=>new Set((s||'').split(',').map(v=>v.trim()).filter(Boolean));
export const cfg={
  port:Number(process.env.PORT||10000),
  host:process.env.HOST||'0.0.0.0',
  apiKey:process.env.OPENAI_API_KEY||'',
  model:process.env.OPENAI_MODEL||'gpt-4o-mini',
  dashboardToken:process.env.DASHBOARD_TOKEN||'',
  adminIds:splitIds(process.env.TELEGRAM_ADMIN_IDS),
  allowedUserIds:splitIds(process.env.BOT_ALLOWED_USER_IDS),
  privateOnly:process.env.TELEGRAM_PRIVATE_ONLY!=='false',
  clearWebhooks:process.env.TELEGRAM_CLEAR_WEBHOOKS==='true',
  polling:process.env.TELEGRAM_POLLING!=='false',
  pollTimeout:Math.min(40,Math.max(5,Number(process.env.TELEGRAM_POLLING_TIMEOUT_S)||25)),
  maxActiveBots:Math.min(33,Math.max(1,Number(process.env.MAX_ACTIVE_BOTS)||33))
};
