(async()=>{
 const root=document.querySelector('.fezi-social-login');if(!root)return;
 const status=document.getElementById('social-auth-status');
 try{
  const r=await fetch('/api/auth/providers',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('Endpoint not available');
  const data=await r.json();
  root.querySelectorAll('a[data-auth-provider]').forEach(a=>{
   const info=data.providers?.[a.dataset.authProvider];if(!info)return;
   a.dataset.ready=info.configured?'yes':'no';
   if(!info.configured){a.removeAttribute('href');a.tabIndex=0;a.setAttribute('role','button');a.setAttribute('aria-disabled','true');a.title='Admin must configure '+a.dataset.authProvider+' credentials on the server';}
  });
  const enabled=Object.entries(data.providers).filter(([k,v])=>v.configured&&k!=='chatgpt').map(([k])=>k);
  status.textContent=enabled.length?'سرویس‌های دارای تنظیمات: '+enabled.join('، ')+' — ورود واقعی باید جداگانه تست شود.':'برای فعال‌سازی ورود سریع، ابتدا OAuth را در تنظیمات خصوصی سرور پیکربندی کنید.';
 }catch{status.textContent='اتصال وضعیت سرویس‌های ورود در دسترس نیست؛ برای بررسی به مدیر سایت اطلاع دهید.'}
})();