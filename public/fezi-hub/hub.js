(() => {
  const menu=document.querySelector('#mobile-menu');const nav=document.querySelector('#primary-nav');
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
  nav?.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('open');menu?.setAttribute('aria-expanded','false')}});
  const drawer=document.querySelector('#video-drawer');
  const kick=()=>{drawer?.querySelectorAll('video').forEach(v=>{v.muted=true;v.defaultMuted=true;v.loop=true;v.playsInline=true;const p=v.play();if(p&&p.catch)p.catch(()=>{})})};
  drawer?.addEventListener('toggle',()=>{if(drawer.open)kick()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&drawer?.open)kick()});
  const f=document.querySelector('#bot-builder-handoff');f?.addEventListener('submit',e=>{e.preventDefault();const idea=f.elements.idea?.value.trim();if(!idea)return;try{sessionStorage.setItem('fezi_bot_idea',idea)}catch{}location.assign('/telegram-builder')});
})();