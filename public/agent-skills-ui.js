(()=>{
  const button=document.getElementById('agentSkillsBtn');if(!button)return;
  let dlg=document.getElementById('feziSkillsDialog');
  if(!dlg){dlg=document.createElement('dialog');dlg.id='feziSkillsDialog';dlg.dir='rtl';dlg.style.cssText='width:min(700px,92vw);max-height:86vh;overflow:auto;border:1px solid #53687b;border-radius:16px;background:#111e2f;color:#eef7ff;padding:20px;box-shadow:0 20px 70px #0008';document.body.append(dlg);}
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function update(q=''){
    const result=dlg.querySelector('#feziSkillsList');result.textContent='در حال بارگذاری…';
    try{
      const r=await fetch('/api/fezi/skills?limit=30&q='+encodeURIComponent(q),{credentials:'same-origin'});
      if(!r.ok)throw Error('وارد حساب مدیریت FEZI Agent شوید.');
      const data=await r.json();
      dlg.querySelector('#feziSkillsTotal').textContent=`${data.count} اسکیل مرجع در کتابخانه محلی`;
      result.innerHTML=(data.results||[]).map(x=>`<article style="padding:10px;border-bottom:1px solid #40576b"><b>${esc(x.title)}</b><small style="display:block;opacity:.7">${esc(x.source)} · ${esc(x.readiness)}</small><p style="font-size:13px;opacity:.85;white-space:pre-wrap">${esc(x.excerpt.slice(0,340))}</p></article>`).join('')||'<p>نتیجه‌ای پیدا نشد.</p>';
    }catch(e){result.textContent=e.message;}
  }
  button.addEventListener('click',()=>{
    dlg.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h3 style="margin:0">مهارت‌های FEZI Agent — ساخت، نصب و ادیت وب‌سایت</h3><button id="feziSkillsClose" type="button">✕</button></div><p id="feziSkillsTotal"></p><p style="opacity:.7">این اسکیل‌ها راهنما هستند؛ اجازه دسترسی به GitHub، سرور یا پلاگین‌های دیگر ایجاد نمی‌کنند.</p><input id="feziSkillsSearch" type="search" placeholder="جستجو: سایت، نصب، deploy، GitHub…" style="width:100%;padding:12px;border-radius:8px"><div id="feziSkillsList"></div>`;
    dlg.querySelector('#feziSkillsClose').addEventListener('click',()=>dlg.close());
    dlg.querySelector('#feziSkillsSearch').addEventListener('input',e=>update(e.target.value));
    dlg.showModal();void update('website');
  });
})();
