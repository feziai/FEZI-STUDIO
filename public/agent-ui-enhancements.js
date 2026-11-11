/* v1.4 public UX layer on top of v1.3 builder; no provider/internal model details. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const safeStore=(key,val)=>{try{localStorage.setItem(key,val)}catch{}};
const focusBtn=$('focusMode');
function focus(enabled){document.body.classList.toggle('focus-chat',enabled);focusBtn?.setAttribute('aria-pressed',String(enabled));if(focusBtn)focusBtn.textContent=enabled?'◫ حالت پیشرفته':'◉ چت ساده';safeStore('fezi-focus-chat',String(enabled));}
focus(new URLSearchParams(location.search).get('chat')==='1'||localStorage.getItem('fezi-focus-chat')==='true');
focusBtn?.addEventListener('click',()=>focus(!document.body.classList.contains('focus-chat')));
const container=$('messages');if(!container)return;
function textOf(el){return (el.querySelector('.fezi-message-body')?.textContent||el.firstChild?.textContent||el.textContent||'').trim().slice(0,12000)}
function say(text){if(!('speechSynthesis' in window)){alert('مرورگر از خواندن متن پشتیبانی نمی‌کند');return}speechSynthesis.cancel();const utt=new SpeechSynthesisUtterance(text.slice(0,4000));utt.lang=/[\u0600-\u06ff]/.test(text)?'fa-IR':'en-US';speechSynthesis.speak(utt)}
function copy(text){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text).catch(()=>{window.prompt('برای کپی، متن را انتخاب کن:',text)});window.prompt('برای کپی، متن را انتخاب کن:',text)}
function rate(el,positive){const value=textOf(el),key='fezi-msg-feedback:'+value.slice(0,120);const old=JSON.parse(localStorage.getItem(key)||'{}');old.rating=positive?'like':'dislike';if(!positive){const comment=window.prompt('کدام بخش پاسخ مشکل داشت؟ (اختیاری)');if(comment===null)return;old.comment=comment.slice(0,500)}safeStore(key,JSON.stringify(old));el.querySelectorAll('.feedback-btn').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.rate===old.rating)));alert('بازخورد در مرورگر خودت ثبت شد؛ ارسال به سرور فعلاً فعال نیست.')}
function reAsk(){const last=[...container.querySelectorAll('.user-msg')].at(-1)?.textContent?.trim();if(!last){alert('درخواستی برای تکرار پیدا نشد.');return}const prompt=$('prompt');prompt.value=last;prompt.focus();$('promptForm')?.requestSubmit()}
function addActions(el){if(el.dataset.feziEnhanced==='1')return;el.dataset.feziEnhanced='1';const text=textOf(el);if(!text)return;
 const actions=document.createElement('div');actions.className='fezi-answer-actions';actions.setAttribute('aria-label','عملیات پاسخ');
 const make=(label,fn,className)=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(className)b.className=className;b.addEventListener('click',fn);actions.append(b);return b};
 make('⧉ کپی',()=>copy(textOf(el)));
 make('👍',()=>rate(el,true),'feedback-btn').dataset.rate='like';
 make('👎',()=>rate(el,false),'feedback-btn').dataset.rate='dislike';
 make('🔊 خواندن',()=>say(textOf(el)));
 make('⇧ اشتراک',()=>{const t=textOf(el);if(navigator.share)navigator.share({text:t}).catch(()=>{});else copy(t)});
 const menu=document.createElement('div');menu.className='fezi-actions-more';menu.hidden=true;
 const more=make('⋯ بیشتر',()=>{menu.hidden=!menu.hidden});
 function item(label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{menu.hidden=true;handler()});menu.append(b)}
 item('↻ تکرار درخواست',reAsk);
 item('⌕ جست‌وجوی وب',()=>{const q=[...container.querySelectorAll('.user-msg')].at(-1)?.textContent||textOf(el).slice(0,250);window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank','noopener,noreferrer')});
 item('✎ ثبت علت ایراد',()=>rate(el,false));
 actions.append(menu);el.append(actions);
}
function augment(){for(const el of container.querySelectorAll('.assistant-msg,.result-msg'))addActions(el)}
let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;augment()})});observer.observe(container,{childList:true,subtree:true,characterData:true});augment();
})();
