(()=>{
 const $=s=>document.querySelector(s),form=$('#creator'),status=$('#feedback'),result=$('#result'),download=$('#download'),save=$('#save');let content='', lastData=null;
 const safeLine=(value,max=750)=>String(value||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max).replace(/[`<>\\#{}]/g,'');
 const slug=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,70);
 form.addEventListener('submit',async e=>{
   e.preventDefault();status.textContent='در حال آماده‌سازی پیش‌نویس...';
   const info={name:$('#name').value,domain:$('#domain').value,goal:$('#goal').value,steps:$('#steps').value.split('\n').filter(x=>x.trim()),tests:$('#tests').value.split('\n').filter(x=>x.trim())};
   if(info.steps.length<2||info.tests.length<1||info.goal.trim().length<18){status.textContent='هدف باید دقیق، دارای حداقل دو مرحله و یک تست پذیرش باشد.';return}
   // A local preview works without admin rights; authenticated server can persist a draft.
   lastData=info;const id='fezi-'+slug(info.domain)+'-'+slug(info.name);
   content=`---\nname: ${id}\ndescription: ${safeLine(info.goal,220)}\ncategory: ${slug(info.domain)}\nsource: FEZI Agent Skill Creator (DRAFT)\n---\n# ${safeLine(info.name,100)}\n\n## Goal\n${safeLine(info.goal,750)}\n\n## Procedure\n${info.steps.slice(0,12).map((v,i)=>`${i+1}. ${safeLine(v,320)}`).join('\n')}\n\n## Acceptance tests\n${info.tests.slice(0,12).map((v,i)=>`${i+1}. ${safeLine(v,320)}`).join('\n')}\n\n## Verification\nThis is a DRAFT and requires review, source verification and a real test before activation. No API credential or permission is granted by this document.\n`;
   result.hidden=false;result.textContent=content;download.hidden=false;save.hidden=false;status.textContent='پیش‌نویس آماده شد. برای ذخیره روی سرور، ورود مدیر لازم است.';
 });
 save.addEventListener('click',async()=>{if(!lastData)return;status.textContent='در حال ذخیره پیش‌نویس...';try{const r=await fetch('/api/fezi/agent/skill-factory/draft',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(lastData)});const j=await r.json();if(!r.ok)throw Error(j.error||j.message||'Login required');status.textContent='اسکیل پیش‌نویس با شناسه '+j.draftId+' ذخیره شد (هنوز فعال نیست).'}catch(e){status.textContent='برای ذخیره روی سرور ورود مدیر لازم است. نسخه دانلودی همچنان در دسترس است.'}});
 download.addEventListener('click',()=>{if(!content)return;const b=new Blob([content],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='SKILL.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
})();
