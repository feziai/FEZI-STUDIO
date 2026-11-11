(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const avatars=[...document.querySelectorAll('.avatar-card')];
const hero=byId('heroPhoto');
const heroImage=hero.querySelector(':scope > img');
let selected='arina';
function selectAvatar(button){
 selected=button.dataset.avatar;
 for(const a of avatars){a.classList.toggle('selected',a===button);const tick=a.querySelector('.avatar-active');if(tick&&a!==button)tick.remove();}
 if(!button.querySelector('.avatar-active')){let badge=document.createElement('span');badge.className='avatar-active';badge.textContent='✓';button.append(badge)}
 heroImage.src=button.dataset.image;
 heroImage.alt=`تصویر آواتار ${button.dataset.name}`;
 hero.querySelector('.hero-caption strong').textContent=button.dataset.name+' ';
 hero.querySelector('.hero-caption small').textContent='آواتار آماده برای شخصی‌سازی';
 hero.querySelector('.on-air').lastChild.textContent=' '+selected.toUpperCase()+' · AVATAR PREVIEW';
 hero.querySelector('.photo-actions a').href='/avatar?model='+encodeURIComponent(selected);
}
for(const a of avatars)a.addEventListener('click',()=>selectAvatar(a));
const prompt=byId('projectPrompt');
for(const a of document.querySelectorAll('[data-prompt]'))a.addEventListener('click',()=>{prompt.value=a.dataset.prompt;prompt.focus()});
byId('buildForm').addEventListener('submit',e=>{e.preventDefault();const message=prompt.value.trim();if(!message){prompt.focus();return}try{sessionStorage.setItem('fezi-pending-prompt',message)}catch{}location.assign('/builder')});
const motion=byId('switchMotion');motion.addEventListener('click',()=>{const reduce=document.body.classList.toggle('reduce-motion');motion.setAttribute('aria-pressed',String(!reduce));motion.querySelector('span').textContent=reduce?'حرکت خاموش':'حرکت روشن'});
})();
