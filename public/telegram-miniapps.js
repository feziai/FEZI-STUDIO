/** FEZI Telegram Mini App progressive enhancement; no trust in initDataUnsafe. */
(()=>{
  const tg=window.Telegram?.WebApp;
  if(!tg || !tg.initData) return;
  try{tg.ready();tg.expand();}catch{}
  document.documentElement.classList.add('telegram-miniapp');
  const style=document.createElement('style');style.textContent=`html.telegram-miniapp{scroll-padding-top:env(safe-area-inset-top)}html.telegram-miniapp body{padding-bottom:env(safe-area-inset-bottom,0px)}html.telegram-miniapp button,html.telegram-miniapp a{touch-action:manipulation}`;
  document.head.append(style);
  // This is ONLY an interface enhancement; Telegram identity is not FEZI login.
})();
