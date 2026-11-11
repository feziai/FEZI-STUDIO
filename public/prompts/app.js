/** FEZI v1.7 — interactive categorised, copy-ready prompt collection. No external dependencies. */
const library=JSON.parse(document.getElementById('data').textContent);
const cards=document.getElementById('cards');
const search=document.getElementById('search-input');
const category=document.getElementById('category');
const kind=document.getElementById('kind');
const empty=document.getElementById('empty');
const chips=document.getElementById('category-chips');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={video:'▶ Video',writing:'✍ Writing',code:'⌘ Code',image:'▧ Image'};
const itemsBySlug=new Map(library.items.map(x=>[x.slug,x]));
const isPaged=Boolean(library.paged);let currentPage=1,totalFound=library.total||library.items.length;const pageSize=library.pageSize||48;let activeRequest=0;
const byCategory=xs=>Object.groupBy?Object.groupBy(xs,x=>x.category):xs.reduce((a,x)=>((a[x.category]??=[]).push(x),a),{});
function card(p){
 const m=(p.media||[]).find(x=>x.type==='image'&&x.url)||(p.media||[]).find(x=>x.type==='video'&&x.url);
 const media=m?.type==='image'?`<img src="${escapeHtml(m.url)}" loading="lazy" decoding="async" alt="Concept preview for ${escapeHtml(p.title)}">`:m?.type==='video'?`<video muted playsinline preload="none" src="${escapeHtml(m.url)}"></video>`:'<div class="visual-blank">✦</div>';
 return `<article class="prompt-card"><a href="/prompts/${encodeURIComponent(p.slug)}" class="visual" aria-label="Open ${escapeHtml(p.title)}">${media}<span class="type-badge">${kinds[p.kind]||'✦'}</span>${(p.media||[]).length>1?`<span class="media-count">▧ ${p.media.length} previews</span>`:''}</a><div class="card-body"><div class="tag">${escapeHtml(p.category)}</div><h3><a href="/prompts/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h3><p class="card-desc">${escapeHtml(p.description)}</p><div class="card-actions"><button type="button" class="card-copy" data-slug="${escapeHtml(p.slug)}" aria-label="Copy ${escapeHtml(p.title)}">⧉ Copy prompt</button><button type="button" class="card-use" data-slug="${escapeHtml(p.slug)}">Use in Studio ↗</button></div></div></article>`;
}
function renderLocal(){
 const q=search.value.trim().toLocaleLowerCase(),cat=category.value,k=kind.value;
 const matched=library.items.filter(p=>(!cat||p.category===cat)&&(!k||p.kind===k)&&(!q||[p.title,p.titleFa,p.description,p.category,p.kind,p.prompt,...(p.tags||[])].join(' ').toLocaleLowerCase().includes(q)));
 const grouped=byCategory(matched);
 cards.innerHTML=Object.keys(grouped).sort((a,b)=>a.localeCompare(b)).map(cat=>`<section class="category-section"><div class="sectionhead category-title"><h2>${escapeHtml(cat)} <span>${grouped[cat].length}</span></h2><button class="category-jump" data-cat="${escapeHtml(cat)}">Show category only →</button></div><div class="cards">${grouped[cat].map(card).join('')}</div></section>`).join('');
 empty.hidden=matched.length!==0;
 chips.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
}
async function copy(text){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}
 const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';ta.setAttribute('readonly','');document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();return ok;
}
function use(p){try{sessionStorage.setItem('fezi_prompt_to_studio',p.prompt)}catch{}location.href='/studio?category='+encodeURIComponent(p.kind==='writing'?'writing':p.kind==='code'?'coding':p.kind)}
async function renderServer(reset=true){
 if(reset)currentPage=1;const seq=++activeRequest;const params=new URLSearchParams({limit:String(pageSize),page:String(currentPage)});if(search.value.trim())params.set('q',search.value.trim());if(category.value)params.set('category',category.value);if(kind.value)params.set('kind',kind.value);const button=document.getElementById('load-more');if(button)button.disabled=true;
 try{const res=await fetch('/api/prompts?'+params);if(!res.ok)throw Error('Search unavailable');const json=await res.json();if(seq!==activeRequest)return;totalFound=json.total;const by=byCategory(json.items);const html=Object.keys(by).sort((a,b)=>a.localeCompare(b)).map(cat=>`<section class="category-section"><div class="sectionhead category-title"><h2>${escapeHtml(cat)} <span>${by[cat].length}</span></h2></div><div class="cards">${by[cat].map(card).join('')}</div></section>`).join('');if(reset)cards.innerHTML=html;else cards.insertAdjacentHTML('beforeend',html);json.items.forEach(x=>itemsBySlug.set(x.slug,x));empty.hidden=totalFound!==0;if(button){button.hidden=currentPage*pageSize>=totalFound;button.disabled=false;}const info=document.getElementById('page-info');if(info)info.textContent=`Showing ${Math.min(currentPage*pageSize,totalFound)} of ${totalFound} prompts`;chips.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('active',b.dataset.cat===category.value));
 }catch(e){if(seq!==activeRequest)return;if(button)button.disabled=false;const info=document.getElementById('page-info');if(info)info.textContent='Could not load prompts; retry.';}
}
let wait;function rerender(){if(!isPaged)return renderLocal();clearTimeout(wait);wait=setTimeout(()=>renderServer(true),search===document.activeElement?230:0)}
for(const el of [search,category,kind])el.addEventListener(el===search?'input':'change',rerender);
const more=document.getElementById('load-more');if(more)more.addEventListener('click',()=>{currentPage++;renderServer(false)});
chips.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;category.value=b.dataset.cat;rerender()});
cards.addEventListener('click',async e=>{
 const c=e.target.closest('.card-copy,.card-use,.category-jump');if(!c)return;
 if(c.classList.contains('category-jump')){category.value=c.dataset.cat;rerender();document.getElementById('search').scrollIntoView({behavior:'smooth'});return}
 const p=itemsBySlug.get(c.dataset.slug);if(!p||!p.prompt)return;
 if(c.classList.contains('card-use'))return use(p);
 const ok=await copy(p.prompt);const original=c.textContent;c.textContent=ok?'✓ Copied':'Open to copy';if(!ok)location.href='/prompts/'+encodeURIComponent(p.slug);else setTimeout(()=>{if(c.isConnected)c.textContent=original},1700);
});
if(isPaged){const info=document.getElementById('page-info');if(info)info.textContent=`Showing ${Math.min(pageSize,totalFound)} of ${totalFound} prompts`;if(more)more.hidden=totalFound<=pageSize;}else renderLocal();
