(async()=>{
 'use strict';
 const box=document.getElementById('models');
 async function refresh(){
  try{
   const r=await fetch('/api/plugins/local-model-status',{credentials:'same-origin'});
   if(!r.ok)throw Error('Model inventory unavailable');
   const data=await r.json();
   const auth=await fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
   box.textContent='';
   for(const m of data.models){
    const row=document.createElement('section');row.style.cssText='padding:12px;border-bottom:1px solid #45567e';
    const name=document.createElement('strong');name.textContent=m.name;
    const desc=document.createElement('p');desc.textContent=`${m.sizeMB} MB · ${m.installed?'دانلود شده':'نیازمند دانلود'} · ${data.enabled?'اجرا پیکربندی شده':'اجرا خاموش'} — ${m.purpose}`;
    const link=document.createElement('a');link.href='https://huggingface.co/'+m.repo;link.target='_blank';link.rel='noopener noreferrer';link.textContent='مشاهده در Hugging Face';
    row.append(name,desc,link);
    if(auth.authenticated && !m.installed){
     const btn=document.createElement('button');btn.type='button';btn.textContent='درخواست نصب روی سرور من';btn.style.marginInlineStart='16px';
     btn.onclick=async()=>{
      if(!confirm(`این عملیات حدود ${m.sizeMB} MB حجم سرور مصرف می‌کند و ممکن است هزینه پهنای باند داشته باشد. دانلود ${m.name} روی سرور تحت مدیریت شما انجام شود؟`))return;
      btn.disabled=true;btn.textContent='درخواست در حال ارسال...';
      try{
       const r=await fetch('/api/local/small-model-install',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:m.id})});
       const body=await r.json().catch(()=>({}));
       if(!r.ok)throw Error(body.error||body.message||`HTTP ${r.status}`);
       btn.textContent='شروع دانلود ثبت شد؛ پس از اتمام صفحه را تازه‌سازی کنید';
      }catch(e){btn.textContent=e.message;btn.disabled=false}
     };row.append(btn);
    }
    box.append(row);
   }
   if(!box.children.length)box.textContent='مدل سبکی تعریف نشده';
  }catch(e){box.textContent=e.message}
 }
 await refresh();
})();
