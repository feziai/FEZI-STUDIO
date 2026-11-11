import { skills } from './catalog.mjs';
import { cfg } from './config.mjs';
export function localAnswer(text,agent){
  const q=String(text||'').trim();
  if (!q) return 'درخواست خودت را بنویس. برای دیدن مهارت‌ها /skills را بزن.';
  const relevant=skills.filter(s=>(q+' '+agent.role).toLowerCase().includes(s.trigger.toLowerCase())).slice(0,3);
  return `سلام! من ${agent.name}، یکی از ایجنت‌های Fezi Studio هستم.\nتخصص: ${agent.role}\n\n`+
    `درخواست دریافت شد: «${q.slice(0,140)}»\n`+
    (relevant.length?'مهارت‌های مرتبط: '+relevant.map(s=>s.title).join('، ')+'\n':'')+
    '\nپاسخ هوشمند زنده هنوز متصل نیست. برای فعال‌کردن AI، کلید OPENAI_API_KEY را در سرور تنظیم کن. هیچ اقدامی در سرویس خارجی انجام نشده است.';
}
export async function agentAnswer(text,agent,fetchImpl=fetch){
  const input=String(text||'').trim().slice(0,2000);
  if(!cfg.apiKey) return localAnswer(input,agent);
  const instruction=`You are ${agent.name}, an AI assistant in Fezi Studio. Specialty: ${agent.role}. `+
    `Respond in Persian by default. Tell the truth about actual tool access; you cannot publish, transfer funds, open accounts, or access live websites from this chat. `+
    `Do not invent actions, income, sources or deployments. Help with lawful, consensual work. Stay concise.`;
  const res=await fetchImpl('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${cfg.apiKey}`},
    body:JSON.stringify({model:cfg.model,temperature:0.4,messages:[
      {role:'system',content:instruction},{role:'user',content:input}
    ]}),
    signal:AbortSignal.timeout(30000)
  });
  if(!res.ok) throw new Error(`AI provider HTTP ${res.status}`);
  const body=await res.json();
  return String(body?.choices?.[0]?.message?.content||'پاسخی از مدل دریافت نشد.').slice(0,3900);
}
