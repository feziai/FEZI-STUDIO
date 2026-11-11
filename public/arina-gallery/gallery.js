(()=>{'use strict';
const $=id=>document.getElementById(id), root=$('photos'), showMore=$('showMore');
let photos=[],account={},expanded=false,filter='all';
const modal=$('photoModal');
async function req(url,body){const opt=body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{};const r=await fetch(url,opt);const j=await r.json();if(!r.ok)throw Error(j.error||'خطا در ارتباط با سرور');return j;}
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){const d=await req('/api/arina/gallery');photos=d.photos;account=d.account;paint();}
function paint(){let list=photos.filter(p=>filter==='premium'?p.premium:filter==='free'?!p.premium:filter==='saved'?p.saved:true);const n=list.length;
  if(filter==='all'&&!expanded)list=list.slice(0,3);
  root.innerHTML=list.map(p=>`<article class="photoCard"><button class="photo-image" data-view="${p.id}" aria-label="نمایش ${e(p.title)}"><img src="${p.preview}" alt="${e(p.description)}" loading="lazy"><span class="${p.premium?'lock':'public'}">${p.premium?'🔒 ویژه · $1':'♡ عمومی'}</span></button><div class="info"><div class="photo-head"><div><h3>${e(p.title)}</h3><p>${e(p.description)}</p></div></div><div class="likeActions"><button class="heart ${p.liked?'active':''}" data-like="${p.id}">♥ ${p.demoLikes} <span class="sample">نمایشی · ${p.likes} واقعی</span></button><button class="save ${p.saved?'active':''}" data-save="${p.id}" title="ذخیره">${p.saved?'▣':'▢'} ذخیره</button><button class="view" data-view="${p.id}">مشاهده ↗</button></div></div></article>`).join('')||'<p class="empty">هنوز عکسی در این دسته وجود ندارد.</p>';
  showMore.hidden=filter!=='all'||expanded||n<=3;
}
async function toggle(id,action){try{await req('/api/arina/gallery/'+action,{id});await load();}catch(x){alert(x.message)}}
function open(id){const p=photos.find(x=>x.id===id);if(!p)return;
  $('lightbox').src=p.full||p.preview;$('lightbox').alt=p.description;$('modalTitle').textContent=p.title;$('modalDesc').textContent=p.description;
  $('lockedBanner').hidden=!p.premium||p.unlocked;
  $('modalActions').innerHTML=p.unlocked?'این عکس باز است.':`<p>برای باز کردن این عکس ۱ دلار اعتبار تأییدشده نیاز است.</p><a href="/arina-wallet">کیف پول و شارژ</a><button id="unlockPhoto" ${!account.canCharge?'disabled':''}>باز کردن با $1 اعتبار</button>`;
  $('modalNote').textContent=p.unlocked?'تصویر اصلی قابل مشاهده است.':(account.canCharge?'مبلغ فقط پس از تأیید واقعی پرداخت قابل خرج است.':'پرداخت خودکار هنوز فعال نشده؛ فعلاً پولی ارسال نکنید.');
  if(!p.unlocked){const b=$('unlockPhoto');if(b)b.onclick=async()=>{try{await req('/api/arina/gallery/unlock',{id});await load();open(id)}catch(x){alert(x.message)}}}
  modal.classList.add('active');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
root.addEventListener('click',e=>{const v=e.target.closest('[data-view]'),l=e.target.closest('[data-like]'),s=e.target.closest('[data-save]');if(v)open(v.dataset.view);if(l)toggle(l.dataset.like,'like');if(s)toggle(s.dataset.save,'save')});
showMore.addEventListener('click',()=>{expanded=true;paint()});document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;expanded=filter!=='all';document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));paint()}));
modal.addEventListener('click',event=>{if(event.target.closest('[data-close]'))close()});document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});function close(){modal.classList.remove('active');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';$('lightbox').src=''}
load().catch(x=>{root.textContent='خطا در بارگذاری گالری: '+x.message});
})();
