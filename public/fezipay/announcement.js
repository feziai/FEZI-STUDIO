const $=id=>document.getElementById(id);let draft;
async function call(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'خطا');return j}
const report=err=>{$('status').textContent=err.message};
$('login').onsubmit=async e=>{e.preventDefault();try{await call('/api/login',{password:$('password').value});$('password').value='';$('status').textContent='وارد شدید'}catch(e){report(e)}};
$('bot').onsubmit=async e=>{e.preventDefault();const token=$('token').value;$('token').value='';try{$('status').textContent=JSON.stringify(await call('/api/announcement/bots',{token}))}catch(e){report(e)}};
$('destination').onsubmit=async e=>{e.preventDefault();try{await call('/api/announcement/destinations',{bot:$('botid').value,chat:$('chatid').value,consent:$('consent').checked});$('status').textContent='مقصد ثبت شد'}catch(e){report(e)}};
$('broadcast').onsubmit=async e=>{e.preventDefault();try{draft=await call('/api/announcement/preview',{text:$('message').value});$('preview').textContent=`${draft.recipients} مقصد یکتا\n${draft.text}`;$('confirm').disabled=false}catch(e){report(e)}};
$('message').oninput=()=>{$('confirm').disabled=true;draft=null};
$('confirm').onclick=async()=>{$('confirm').disabled=true;try{$('status').textContent=JSON.stringify(await call('/api/announcement/confirm',{id:draft.id}),null,2)}catch(e){report(e)}};
$('refresh').onclick=async()=>{try{$('status').textContent=JSON.stringify(await call('/api/announcement/status'),null,2)}catch(e){report(e)}};

$('assign').onsubmit=async e=>{e.preventDefault();try{const task=await call('/api/announcement/task',{bot:$('targetBot').value,prompt:$('taskPrompt').value});$('status').textContent=`مأموریت ${task.id} در صف ${task.username} ثبت شد. اجرای واقعی نیازمند اتصال عامل ربات است.`; $('taskPrompt').value=''}catch(err){report(err)}};
