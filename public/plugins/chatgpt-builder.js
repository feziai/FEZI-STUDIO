(()=>{'use strict';const $=id=>document.getElementById(id);
const presets={
 support:['FEZI Support','Answer customers based on documented support policies and reference links.','1. Understand the request.\n2. Find verified answers in authorized support documents.\n3. Ask before making any account changes.'],
 code:['FEZI Code Helper','Review and improve code with clear tests and explanations.','1. Inspect only authorized repositories.\n2. Propose a small safe code change.\n3. Run tests and summarize the result.\n4. Ask permission before pushing.'],
 telegram:['FEZI Telegram Assistant','Help authorized users build and manage Telegram bots.','1. Confirm BotFather token is stored privately.\n2. Review commands and bot permissions.\n3. Generate runnable code and test locally.\n4. Connect to Telegram only after user authorization.'],
 blank:['My FEZI Plugin','','']};
document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{const [n,p,w]=presets[btn.dataset.preset];$('name').value=n;$('purpose').value=p;$('workflow').value=w;});
$('make-plugin').onsubmit=async e=>{e.preventDefault();$('status').textContent='در حال آماده‌سازی بسته...';const spec={name:$('name').value,purpose:$('purpose').value,workflow:$('workflow').value};try{
 const res=await fetch('/api/plugins/chatgpt/export',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({spec})});
 if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.error||'خطای ایجاد بسته')}
 const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='FEZI-ChatGPT-Plugin-Creator.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);$('status').textContent='بسته آماده است؛ آن را به Plugin Creator بده.';
 }catch(err){$('status').textContent=err.message}};
$('copy-prompt').onclick=async()=>{const prompt=`@plugin-creator لطفاً با ZIP ساخته‌شدهٔ FEZI Studio یک پلاگین خصوصی جدید ایجاد کن. نام: ${$('name').value||'My FEZI Plugin'}. ابتدا فایل‌های plugin.json و skills/*/SKILL.md را بررسی کن، سپس یک نسخه آزمایشی بساز. هیچ سرویس یا مجوز خارجی را بدون اتصال رسمی فعال اعلام نکن.`;try{await navigator.clipboard.writeText(prompt);$('status').textContent='متن درخواست کپی شد'}catch{$('status').textContent=prompt}};
})();
