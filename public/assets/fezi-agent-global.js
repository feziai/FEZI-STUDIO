/* FEZI Agent across the FEZI Studio website. Does not change the existing header. */
(()=>{
 'use strict';
 if(window.__feziGlobalAgent||document.querySelector('[data-fezi-agent-global]'))return;
 window.__feziGlobalAgent=true;
 const host=document.createElement('div');host.dataset.feziAgentGlobal='true';
 host.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483000';
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<style>
 :host{direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#15243f}
 button,a,textarea{font:inherit}button{cursor:pointer}
 .toggle{border:0;background:linear-gradient(125deg,#148fd8,#9e5be9);color:#fff;padding:12px 18px;border-radius:99px;box-shadow:0 7px 25px #15395755;font-weight:800;display:flex;align-items:center;gap:8px;min-height:50px}
 .toggle img{width:30px;height:30px;object-fit:contain}
 .panel{position:absolute;bottom:62px;left:0;width:min(375px,calc(100vw - 24px));max-height:min(660px,calc(100vh - 90px));overflow:auto;background:#fff;border:1px solid #c8e1f4;border-radius:22px;box-shadow:0 20px 65px #16315755;padding:16px;box-sizing:border-box;text-align:right;line-height:1.6}
 .panel[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:8px}
 h2{margin:0;font-size:19px;color:#172e57}.subtitle{color:#4b6683;font-size:12px;margin:5px 0 12px}.close{border:0;background:#eaf4fc;border-radius:10px;padding:5px 10px}
 .shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:7px}.shortcuts a{border:1px solid #cfe5f6;border-radius:11px;background:#f5faff;color:#20508d;text-decoration:none;font-size:12px;padding:7px;text-align:center;font-weight:700}
 label{font-size:13px;font-weight:700;display:block;margin:12px 0 6px}textarea{width:100%;min-height:86px;box-sizing:border-box;border:1px solid #afcde5;border-radius:12px;padding:10px;resize:vertical;background:#fff;color:#1c2945}
 .actions{display:flex;gap:7px;margin-top:9px}.actions button{flex:1;border:0;background:#147ed4;color:#fff;border-radius:12px;padding:9px 7px;font-weight:700}.actions .outline{background:#eaf6ff;color:#1464a5}
 .result{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.8;background:#f4f9fd;padding:10px;border-radius:12px;margin-top:10px;max-height:180px;overflow:auto}
 .status{font-size:12px;color:#526b7f;margin:5px 0}.links{margin-top:10px;font-size:11px;color:#536a83}.links a{color:#1768b5}
 @media(max-width:450px){:host{max-width:100%}.panel{width:calc(100vw - 24px)}.toggle{padding:10px 12px}}
 </style><button class="toggle" type="button" aria-expanded="false" aria-controls="fezi-panel"><img src="/brand/fezi-official-rabbit-f-2026.png" alt="">FEZI Agent · بساز</button>
 <section id="fezi-panel" class="panel" hidden role="dialog" aria-label="FEZI Agent دستیار سراسری">
   <div class="head"><h2>FEZI Agent</h2><button class="close" type="button" aria-label="بستن">✕</button></div>
   <p class="subtitle">دستیار ساخت، ویرایش، تست و انتشار وب‌سایت و اپلیکیشن</p>
   <div class="shortcuts"><a href="/builder">🛠️ ساخت وب‌سایت</a><a href="/fezi-agent/tools">⚙️ ابزارها و MCP</a><a href="/fezi-agent/skill-creator">✦ ساخت اسکیل</a><a href="/plugins">🔌 پلاگین‌ها</a></div>
   <label for="fezi-task">چه چیزی بسازم یا تغییر بدهم؟</label><textarea id="fezi-task" maxlength="6000" placeholder="مثلاً یک وب‌سایت مدرن بساز، فایل‌های پروژه را اصلاح کن یا یک API طراحی کن..."></textarea>
   <div class="actions"><button class="outline" id="go-build" type="button">رفتن به ویرایشگر</button><button id="ask-fezi" type="button">گفتگو با AI</button></div>
   <p class="status" id="fezi-ready">بررسی اتصال مدل...</p><div class="result" id="fezi-output" hidden role="status" aria-live="polite"></div>
   <p class="links">این پنل بدون اجازه تو فایل یا سایت را تغییر نمی‌دهد. <a href="/builder">ویرایشگر اصلی FEZI Agent</a></p>
 </section>`;
 document.body.appendChild(host);
 const toggle=root.querySelector('.toggle'),panel=root.querySelector('.panel'),task=root.querySelector('#fezi-task'),output=root.querySelector('#fezi-output'),state=root.querySelector('#fezi-ready');
 const show=val=>{panel.hidden=!val;toggle.setAttribute('aria-expanded',String(val));if(val)task.focus()};
 toggle.addEventListener('click',()=>show(panel.hidden));root.querySelector('.close').addEventListener('click',()=>show(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false)});
 // Preserve the task across a same-origin navigation. No automatic code edits or privileged API calls.
 root.querySelector('#go-build').addEventListener('click',()=>{
   const value=task.value.trim();if(value){try{sessionStorage.setItem('fezi_global_task',value)}catch{}}
   window.location.assign('/builder?source=global-agent');
 });
 const render=text=>{output.hidden=false;output.textContent=String(text).slice(0,10000)};
 root.querySelector('#ask-fezi').addEventListener('click',async()=>{
   const value=task.value.trim();if(value.length<2){render('درخواست را بنویس.');return}
   state.textContent='در حال دریافت پاسخ از مدل متصل...';
   try{const r=await fetch('/api/fezi/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:value})});const j=await r.json();
     if(!r.ok)throw Error(j.error||j.message||'No AI provider available');
     render(j.answer||'پاسخی دریافت نشد');state.textContent='پاسخ مدل دریافت شد؛ برای تغییر فایل‌ها از ویرایشگر استفاده کن.';
   }catch(e){state.textContent='این گفتگو نیازمند ورود به حساب و اتصال API معتبر است.';render('پاسخ AI دریافت نشد. وضعیت اتصال مدل را در تنظیمات بررسی کن. '+String(e.message||''));}
 });
 fetch('/api/fezi/status').then(r=>r.ok?r.json():Promise.reject()).then(j=>{state.textContent=j.ready?'● مدل متصل — آماده چت':'○ مدل AI متصل نیست؛ ویرایشگر و راهنمای ساخت در دسترس‌اند.'}).catch(()=>{state.textContent='برای بررسی مدل و گفتگو، ورود به حساب یا اتصال API لازم است.'});
 // Read a task sent from another page into the existing builder textarea.
 if(location.pathname.replace(/\/$/,'')==='/builder'){
   try{const pending=sessionStorage.getItem('fezi_global_task');const editor=document.querySelector('#prompt');if(pending&&editor){editor.value=pending;editor.dispatchEvent(new Event('input',{bubbles:true}));sessionStorage.removeItem('fezi_global_task')}}catch{}
 }
})();
