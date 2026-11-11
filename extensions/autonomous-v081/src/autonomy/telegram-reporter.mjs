import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
function requireSettings({token,chatId}){
  if(!token||!chatId)throw new Error('Telegram is not configured');
  if(!/^\d+:[A-Za-z0-9_-]+$/.test(token))throw new Error('Invalid Telegram token');
  if(!/^-?\d+$/.test(String(chatId)))throw new Error('Invalid Telegram chat id');
}
async function post(botUrl,form,fetcher=fetch){
  const res=await fetcher(botUrl,{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error('Telegram status '+res.status);
  const json=await res.json();if(!json.ok)throw new Error('Telegram rejected request');return json.result;
}
export function telegramReporter({token=process.env.FEZI_TELEGRAM_BOT_TOKEN,chatId=process.env.FEZI_TELEGRAM_ADMIN_CHAT_ID,fetcher=fetch}={}){
  const endpoint=m=>{requireSettings({token,chatId});return `https://api.telegram.org/bot${token}/${m}`};
  return {
    async sendSummary({type='test-report',summary,counts={}}){
      if(typeof summary!=='string'||summary.length>2000)throw new Error('summary required, max 2000 characters');
      const f=new FormData();f.set('chat_id',String(chatId));
      // Never include user prompts or sensitive files. Counts and test summaries only.
      f.set('text',`FEZI Studio | ${String(type).slice(0,40)}\n${summary}\n${JSON.stringify(counts).slice(0,1000)}`);
      return post(endpoint('sendMessage'),f,fetcher);
    },
    async sendOwnedArtifact({path,ownedByAdmin=false,permissionGranted=false}){
      if(!(ownedByAdmin||permissionGranted))throw new Error('Private user files require explicit opt-in');
      const meta=await stat(path);if(meta.size>45*1024*1024)throw new Error('File exceeds safe upload limit');
      const f=new FormData();f.set('chat_id',String(chatId));f.set('document',new Blob([await readFile(path)]),basename(path));
      return post(endpoint('sendDocument'),f,fetcher);
    }
  };
}
