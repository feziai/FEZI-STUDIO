(async()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const list=$('cards'),search=$('search'),cat=$('category'),filter=$('status-filter');
  const count=$('count'),stats=$('statistics'),detail=$('plugin-detail'),directory=$('directory');
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validLocal=s=>typeof s==='string'&&/^\/[a-z0-9/?=&-]+$/i.test(s);
  const validSlug=s=>typeof s==='string'&&/^[a-z0-9-]+$/.test(s);
  const validChatLink=p=>{
    const pid=p?.chatgpt?.pluginId;
    return typeof pid==='string'&&/^plugin[a-z0-9_]+$/i.test(pid)&&p?.chatgpt?.url==='https://chatgpt.com/plugins/'+pid;
  };
  const categories={studio:'فضی استودیو',developer:'توسعه و سرور',creative:'رسانه و خلاقیت',finance:'پرداخت',communication:'ارتباطات'};
  let plugins=[],roadmap=[];
  try{
    const res=await fetch('/api/plugins/public',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    plugins=Array.isArray(data.plugins)?data.plugins.filter(p=>validSlug(p.slug)):[];
    roadmap=Array.isArray(data.roadmap)?data.roadmap.filter(p=>validSlug(p.slug)):[];
  }catch(error){list.textContent='دریافت فهرست از سرور موفق نبود. تنظیمات /api/plugins/public را بررسی کنید.';return;}
  const all=()=>[...plugins,...roadmap.map(x=>({...x,planned:true,version:'—'}))];
  const badge=p=>p.planned?'در برنامه':p.chatgpt?.access==='public'&&p.chatgpt?.publicReady===true?'منتشرشده':'خصوصی در ChatGPT';
  const mcpStatus=p=>p.planned?'هنوز ساخته نشده':'اتصال MCP روی این هاست تأیید نشده';
  const linkFor=p=>'/plugins/?plugin='+encodeURIComponent(p.slug);
  function actions(p,insideDetail=false){
    const links=[`<a class="detail-link" href="${safe(linkFor(p))}">جزئیات پلاگین</a>`];
    if(insideDetail)links.length=0;
    if(validLocal(p.relatedWebTool))links.push(`<a class="web" href="${safe(p.relatedWebTool)}">ابزار مرتبط در سایت</a>`);
    if(!p.planned&&validChatLink(p))links.push(`<a class="docs" rel="noopener noreferrer" target="_blank" href="${safe(p.chatgpt.url)}">مشاهده در ChatGPT (فقط افراد مجاز)</a>`);
    return links.join('');
  }
  function card(p){
    return `<article class="plugin" id="${safe(p.slug)}">
      <div class="meta"><span class="tag ${p.planned?'tag-planned':''}">${safe(categories[p.category]||p.category||'سایر')}</span><span class="private ${p.planned?'planned':''}">${safe(badge(p))}</span></div>
      <h2>${safe(p.name)}</h2><div class="name-en">${safe(p.nameEn||p.name)}${p.planned?'':' · v'+safe(p.version)}</div>
      <p class="desc">${safe(p.description)}</p><div class="mcp-line">${safe(mcpStatus(p))}</div>
      <div class="actions">${actions(p)}</div></article>`;
  }
  function render(){
    const query=search.value.trim().toLocaleLowerCase();
    const status=filter.value;
    const rows=all().filter(p=>
      (cat.value==='all'||cat.value===p.category)&&
      (status==='all'||status==='planned'&&p.planned||status==='private'&&!p.planned&&p.chatgpt?.access==='private'||status==='public'&&!p.planned&&p.chatgpt?.access==='public'&&p.chatgpt?.publicReady)&&
      [p.name,p.nameEn,p.slug,p.description,p.descriptionEn].join(' ').toLocaleLowerCase().includes(query)
    );
    count.textContent=`${rows.length} نتیجه از ${plugins.length} پلاگین ساخته‌شده و ${roadmap.length} ایده در برنامه`;
    list.innerHTML=rows.map(card).join('')||'<p class="empty">موردی با این جست‌وجو پیدا نشد.</p>';
  }
  function showDetail(p){
    const isPlanned=Boolean(p.planned);
    const pid=p.chatgpt?.pluginId||'—';
    const note=isPlanned?
      'این مورد در برنامه توسعه است و هنوز وجود پلاگین مستقل با این نام در حساب تأیید نشده است.':
      'این پلاگین در حساب مالک خصوصی است. نمایش این صفحه آن را عمومی یا به MCP زنده متصل نمی‌کند. اجرای عملیات واقعی به نصب، مجوزهای کاربر و سرور معتبر نیاز دارد.';
    directory.hidden=true;detail.hidden=false;
    for(const el of document.querySelectorAll('.telegram-hub-entry'))el.hidden=true;
    document.title=`${p.name} | پلاگین‌های فضی استودیو`;
    detail.innerHTML=`<a class="detail-back" href="/plugins/">← بازگشت به تمام پلاگین‌ها</a>
      <div class="detail-panel"><div class="eyebrow">FEZI STUDIO · PLUGIN PROFILE</div>
      <div class="meta"><span class="tag">${safe(categories[p.category]||'سایر')}</span><span class="private">${safe(badge(p))}</span></div>
      <h1 class="detail-title">${safe(p.name)}</h1><div class="detail-en">${safe(p.nameEn||p.name)}</div>
      <p class="detail-description">${safe(p.description)}</p>
      <div class="detail-grid">
       <div class="detail-field"><strong>وضعیت در ChatGPT</strong><span>${safe(badge(p))}</span></div>
       <div class="detail-field"><strong>وضعیت MCP</strong><span>${safe(mcpStatus(p))}</span></div>
       <div class="detail-field"><strong>نسخهٔ شناسایی‌شده</strong><span>${safe(isPlanned?'هنوز منتشر نشده':p.version)}</span></div>
       <div class="detail-field"><strong>شناسهٔ پلاگین</strong><span dir="ltr">${safe(isPlanned?'—':pid)}</span></div>
      </div>
      <div class="detail-warning">${safe(note)}</div>
      <div class="detail-buttons">${actions(p,true)}</div>
      </div>`;
  }
  const pluginSlug=new URLSearchParams(location.search).get('plugin');
  const selected=validSlug(pluginSlug)?all().find(p=>p.slug===pluginSlug):null;
  if(selected){showDetail(selected)}else if(pluginSlug){
    directory.hidden=true;detail.hidden=false;
    detail.innerHTML='<a class="detail-back" href="/plugins/">← بازگشت به فهرست</a><p>پلاگین موردنظر در فهرست وجود ندارد.</p>';
  }else{
    stats.innerHTML=`<span>${plugins.length} پلاگین ساخته‌شده</span><span>${plugins.filter(p=>p.chatgpt?.access==='private').length} خصوصی</span><span>${roadmap.length} مورد در برنامه</span>`;
    search.addEventListener('input',render);cat.addEventListener('change',render);filter.addEventListener('change',render);render();
  }
})();
