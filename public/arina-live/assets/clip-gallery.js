// The player previews local published clips only; never changes the shared room state.
const clips=[['رقص ملایم آرینا · لوپ طبیعی و یک‌دست','arina-approved-natural-loop.mp4'],['ریورس نرم تدوین‌شده توسط کاربر · ۶۳ ثانیه (اصل فایل)','arina-smooth-reverse-loop.mp4'],['رقص آرام آرینا · ۳ دقیقه همراه موسیقی اختصاصی','arina-gentle-dance-3min.mp4'],['حلقهٔ اصلی آرینا · ۸٫۲۷ ثانیه (بدون تغییر)','arina-idle-loop-8s-original.mp4'],['ویدیوی آزمایشی کامل · ۲:۵۸ (بدون ادیت)','arina-three-minute-unedited.mp4'],['حالت طبیعی جدید · ۱۵٫۱۷ ثانیه','arina-natural-idle-15s.mp4'],['حالت عادی · ۷٫۲۹ ثانیه','arina-idle-user.mp4'],['تایپ · ۱۰ ثانیه','arina-typing-user.mp4'],['آرام · نسخهٔ دوم','arina-idle-new.mp4'],['حضور آرام · ۱۰ ثانیه','arina-quiet-presence.mp4'],['نسخهٔ ثابت CPU','cpu-photo-preview-idle.mp4'],['نسخهٔ محوشده · ۱','arina-idle-blurred.mp4'],['نسخهٔ محوشده · ۲ (تکراری)','arina-typing-blurred.mp4']];
const host=document.getElementById('arinaClipsList');if(host){for(const [title,name] of clips){const card=document.createElement('div');const video=document.createElement('video');video.controls=true;video.muted=!name.endsWith('-3min.mp4');video.playsInline=true;video.preload='none';video.src='/arina-live/assets/video/'+name;const label=document.createElement('small');label.textContent=title;card.append(video,label);host.append(card)}}

// Exclusive audio: pause the selected radio and any other preview while a dance video is playing.
const clipsVideos=[...document.querySelectorAll('#arinaClipsList video')];
const radio=document.getElementById('bgMusic');
let radioWasPlaying=false;
for(const clip of clipsVideos){
  clip.addEventListener('play',()=>{
    clipsVideos.forEach(other=>{if(other!==clip&&!other.paused)other.pause();});
    if(radio&&!radio.paused){radioWasPlaying=true;radio.pause();}
  });
  clip.addEventListener('pause',()=>{
    if(!clipsVideos.some(other=>!other.paused)&&radioWasPlaying&&radio){radioWasPlaying=false;radio.play().catch(()=>{});}
  });
}
document.getElementById('arinaClipsLibrary')?.addEventListener('toggle',(event)=>{
  if(!event.target.open) clipsVideos.forEach(clip=>clip.pause());
});
