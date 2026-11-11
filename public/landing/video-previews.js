// FEZI Studio looping previews: autoplay, muted, playsInline, loop. Never auto-pause offscreen.
// Intentionally do not call video.pause on scroll, hover, page blur or viewport changes.
(()=>{
  const media=[...document.querySelectorAll('#fezi-video-models video')];
  function startAll(){
    for(const video of media){
      video.muted=true; video.defaultMuted=true; video.loop=true; video.playsInline=true;
      if(video.paused){try{const r=video.play();if(r&&typeof r.catch==='function')r.catch(()=>{});}catch{}}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startAll,{once:true});else startAll();
  // Some mobile browsers only permit playback once the page becomes visible.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)startAll();});
})();
