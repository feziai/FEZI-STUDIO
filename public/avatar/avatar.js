import {DEFAULT_PROFILE,clamp,validateProfile,transition,smoothEnergy,mouthOpen,blinkAmount,poseAt,validateImageHeader,dialogueStatus,normalizedAmplitude} from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('avatarCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const stage=$('stage');let profile={...DEFAULT_PROFILE},photo=null,portraitFile=null,objectUrl=null,mediaUrl=null,audioEl=null,audioContext=null,analyser=null,micStream=null,sourceNode=null,state='idle',paused=false,ttsActive=false,energy=0,displayEnergy=0,photoWidth=0,photoHeight=0,startTime=performance.now(),frameCount=0,frameStart=performance.now(),speechTimeout=null;
const setStatus=(s)=>{$('info').textContent=s;};
function setState(next){state=transition(state,next);$('modeLabel').textContent={idle:'IDLE / آماده',listening:'LISTENING / شنیدن',thinking:'THINKING / فکر کردن',speaking:'SPEAKING / صحبت',paused:'PAUSED / توقف'}[state];}
function saveSettings(){localStorage.setItem('fezi-avatar-profile-v1',JSON.stringify(profile));}
function updateSliders(){for(const k of ['mouthX','mouthY','eyesY','motion','lipGain']){$(k).value=String(profile[k]);$(k+'Value').value=String(Math.round(profile[k]*100))+'%';} $('blink').checked=profile.blink;}
try {const p=JSON.parse(localStorage.getItem('fezi-avatar-profile-v1')||'{}');profile=validateProfile(p);}catch{} updateSliders();
for(const k of ['mouthX','mouthY','eyesY','motion','lipGain']) $(k).addEventListener('input',()=>{profile=validateProfile({...profile,[k]:Number($(k).value)});updateSliders();saveSettings();});
$('blink').addEventListener('change',()=>{profile.blink=$('blink').checked;saveSettings();});
$('resetTune').addEventListener('click',()=>{profile={...DEFAULT_PROFILE};updateSliders();saveSettings();setStatus('تنظیمات پیش‌فرض بازگردانی شد.');});
for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>{for(const q of document.querySelectorAll('.tab'))q.classList.toggle('active',q===b);for(const key of ['chat','tune','render','save'])$('tab-'+key).classList.toggle('hidden',b.dataset.tab!==key);});
async function readImage(file){
  if(!file||file.size>8_000_000){setStatus('حجم تصویر باید کمتر از ۸ مگابایت باشد.');return;}
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  // Header validation uses first 16 bytes, total file size is checked separately.
  if(!validateImageHeader(new Uint8Array([...bytes,...new Uint8Array(0)]),file.type)) {setStatus('فایل تصویر معتبر PNG/JPG/WEBP نیست.');return;}
  const newUrl=URL.createObjectURL(file),im=new Image();
  try {await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=newUrl;});
    if(im.naturalWidth<160||im.naturalHeight<160)throw new Error('Picture too small');
    const oldUrl=objectUrl;photo=im;portraitFile=file;objectUrl=newUrl;photoWidth=im.naturalWidth;photoHeight=im.naturalHeight;
    if(oldUrl)URL.revokeObjectURL(oldUrl);
    $('portraitHint').classList.add('hidden');setStatus(`تصویر ${photoWidth} × ${photoHeight} آماده است. محل دهان را در تب «حرکت چهره» تنظیم کن.`);
  }catch{URL.revokeObjectURL(newUrl);setStatus('تصویر قابل خواندن نیست یا رزولوشن کافی ندارد.');}
}
async function selectPresetAvatar(name){
  if(!['arina','manika','elara','adrian'].includes(name))return;
  const ext=(name==='arina'||name==='elara')?'png':'jpg';
  try{const response=await fetch('/brand/'+name+'.'+ext,{credentials:'same-origin'});if(!response.ok)throw new Error('Image not available');
    const blob=await response.blob();const file=new File([blob],name+'.'+ext,{type:ext==='png'?'image/png':'image/jpeg'});
    await readImage(file);for(const button of document.querySelectorAll('[data-preset]'))button.classList.toggle('active',button.dataset.preset===name);
  }catch{setStatus('بارگذاری مدل پیش‌فرض موفق نبود.');}
}
for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>selectPresetAvatar(button.dataset.preset));
selectPresetAvatar(new URLSearchParams(location.search).get('model')||'arina').catch(()=>{});
$('portraitInput').addEventListener('change',e=>{readImage(e.target.files?.[0]).catch(()=>setStatus('خطا در بارگذاری تصویر'));});
function stopMedia(){if(audioEl){audioEl.pause();audioEl.src='';audioEl=null;} if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}if(micStream){for(const t of micStream.getTracks())t.stop();micStream=null;}if(sourceNode){try{sourceNode.disconnect();}catch{}sourceNode=null;}analyser=null;if(audioContext){audioContext.close().catch(()=>{});audioContext=null;} }
function resumeIfPaused(){if(paused){paused=false;setState('idle');$('pauseBtn').textContent='⏸ توقف حرکت';}}
function stopEverything(){window.speechSynthesis?.cancel();ttsActive=false;if(speechTimeout){clearTimeout(speechTimeout);speechTimeout=null;}stopMedia();energy=0;displayEnergy=0;setState(paused?'paused':'idle');$('voiceStatus').textContent='صدا آماده';}
$('stopBtn').addEventListener('click',stopEverything);
function availableVoices(){const voices=window.speechSynthesis?.getVoices()||[];let index=$('voiceSelect').value;
$('voiceSelect').replaceChildren(new Option('صدای پیش‌فرض دستگاه',''));
for(const v of [...voices].sort((a,b)=>Number(b.lang?.startsWith('fa'))-Number(a.lang?.startsWith('fa'))))$('voiceSelect').add(new Option(`${v.name} — ${v.lang}`,v.voiceURI));
$('voiceSelect').value=[...$('voiceSelect').options].some(x=>x.value===index)?index:'';
}
if('speechSynthesis' in window){availableVoices();window.speechSynthesis.onvoiceschanged=availableVoices;}
function speak(text){
  if(!('speechSynthesis' in window)){setStatus('این مرورگر تبدیل متن به گفتار ندارد؛ از فایل صوتی استفاده کن.');return;}
  const v=dialogueStatus(text);if(!v.valid){setStatus('متن صحبت باید بین ۲ تا ۳۰۰۰ نویسه باشد.');return;}
  resumeIfPaused();stopEverything();const utterance=new SpeechSynthesisUtterance(text);
  const voices=window.speechSynthesis.getVoices(),selected=voices.find(v=>v.voiceURI===$('voiceSelect').value);
  if(selected){utterance.voice=selected;utterance.lang=selected.lang;}else utterance.lang=/[\u0600-\u06FF]/.test(text)?'fa-IR':'en-US';
  utterance.rate=0.94;utterance.pitch=1.02;
  utterance.onstart=()=>{ttsActive=true;setState('speaking');$('voiceStatus').textContent='گفتار دستگاه فعال';};
  utterance.onend=()=>{ttsActive=false;setState('idle');$('voiceStatus').textContent='پایان گفتار';};
  utterance.onerror=(e)=>{ttsActive=false;setState('idle');setStatus('صدای زبان انتخابی در مرورگر در دسترس نیست؛ می‌توانی فایل صوتی بارگذاری کنی.');};
  window.speechSynthesis.speak(utterance);
  // Browser speechSynthesis output cannot be analysed via WebAudio: motion is heuristic here.
}
$('speakBtn').addEventListener('click',()=>speak($('sayText').value));
$('chatBtn').addEventListener('click',async()=>{
  const message=$('sayText').value.trim();if(!dialogueStatus(message).valid){setStatus('ابتدا یک جمله وارد کن.');return;}
  resumeIfPaused();stopEverything();setState('thinking');$('chatBtn').disabled=true;setStatus('FEZI AGENT در حال آماده‌کردن پاسخ...');
  try {const reply=await fetch('/api/fezi/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({message})});
    if(reply.status===401)throw Error('برای گفت‌وگوی AI ابتدا از صفحه اصلی FEZI AGENT وارد شو.');
    if(!reply.ok)throw Error('موتور گفتگو متصل نیست یا پاسخ نمی‌دهد.');
    const data=await reply.json();const answer=String(data.answer||'').slice(0,3000);
    if(!answer)throw Error('پاسخ خالی دریافت شد.');$('sayText').value=answer;setStatus('پاسخ دریافت شد. در حال خواندن...');speak(answer);
  }catch(e){setState('idle');setStatus(e.message||'خطای اتصال');}
  finally {$('chatBtn').disabled=false;}
});
async function getAudio(){if(!audioContext||audioContext.state==='closed')audioContext=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();analyser=audioContext.createAnalyser();analyser.fftSize=1024;return analyser;}
$('audioFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('audio/')||file.size>25_000_000){setStatus('فایل صوتی معتبر تا ۲۵ مگابایت انتخاب کن.');return;}
  resumeIfPaused();stopEverything();
  try{const meter=await getAudio();mediaUrl=URL.createObjectURL(file);audioEl=new Audio(mediaUrl);audioEl.preload='auto';sourceNode=audioContext.createMediaElementSource(audioEl);sourceNode.connect(meter);meter.connect(audioContext.destination);
  audioEl.onended=()=>{setState('idle');$('voiceStatus').textContent='صوت پایان یافت';};audioEl.onerror=()=>{setState('idle');setStatus('پخش این فرمت صوتی پشتیبانی نمی‌شود.');};
  await audioEl.play();setState('speaking');$('voiceStatus').textContent='لب‌زدن متناسب با صدای فایل';
  }catch(e){stopMedia();setState('idle');setStatus('پخش صدا توسط مرورگر انجام نشد.');}
});
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognizer=null;
$('voiceTalkBtn').addEventListener('click',()=>{
  if(!Recognition){setStatus('این مرورگر تشخیص صوتی مکالمه ندارد. می‌توانی متن را تایپ کنی یا از موتور ASR جداگانه استفاده کنی.');return;}
  if(recognizer){recognizer.stop();recognizer=null;return;}
  resumeIfPaused();stopEverything();const r=new Recognition();recognizer=r;r.lang='fa-IR';r.interimResults=false;r.maxAlternatives=1;
  r.onstart=()=>{setState('listening');setStatus('به فارسی صحبت کن. تشخیص صدا ممکن است توسط سرویس مرورگر انجام شود.');};
  r.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript?.trim();if(text){$('sayText').value=text;setState('thinking');$('chatBtn').click();}};
  r.onerror=e=>{setState('idle');setStatus('تشخیص صدا در مرورگر در دسترس نیست یا مجوز داده نشد.');};
  r.onend=()=>{recognizer=null;if(state==='listening')setState('idle');};
  try{r.start();}catch{recognizer=null;setState('idle');setStatus('آغاز شنیدن صدا ممکن نشد.');}
});
// GPU gateway: only forwards an explicitly consented portrait and audio after server login.
let gpuReady=false,gpuVideoUrl=null;
async function checkGpu(){try{const r=await fetch('/api/avatar/render/status',{credentials:'same-origin'});if(!r.ok)throw Error('در ابتدا وارد FEZI AGENT شو.');const x=await r.json();gpuReady=x.configured===true;$('gpuStatus').textContent=gpuReady?'Worker آماده دریافت درخواست است؛ رندر واقعی هنوز به مدل نصب‌شده وابسته است.':'هیچ GPU Worker متصل نیست. رندر واقع‌گرایانه غیرفعال است.';}catch{$('gpuStatus').textContent='برای بررسی GPU ابتدا وارد حساب FEZI AGENT شو.';} updateGpuButton();}
function updateGpuButton(){$('gpuRenderBtn').disabled=!gpuReady||!portraitFile||!$('gpuAudio').files?.[0]||!$('gpuConsent').checked;}
$('gpuAudio').addEventListener('change',updateGpuButton);$('gpuConsent').addEventListener('change',updateGpuButton);
$('portraitInput').addEventListener('change',()=>setTimeout(updateGpuButton,200));
checkGpu();
function fileToBase64(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(f);});}
$('gpuRenderBtn').addEventListener('click',async()=>{
  const f=$('gpuAudio').files?.[0];if(!gpuReady||!portraitFile||!f||!$('gpuConsent').checked)return;
  if(f.size>6_000_000||portraitFile.size>8_000_000){setStatus('برای رندر، صوت باید کمتر از ۶ و تصویر کمتر از ۸ مگابایت باشد.');return;}
  $('gpuRenderBtn').disabled=true;$('gpuStatus').textContent='در حال ارسال فایل به GPU Worker و رندر...';
  try{const [image,audio]=await Promise.all([fileToBase64(portraitFile),fileToBase64(f)]);
    const audioType=f.type==='audio/x-wav'?'audio/wav':f.type==='audio/mp3'?'audio/mpeg':f.type;
    const r=await fetch('/api/avatar/render',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({image,imageType:portraitFile.type,audio,audioType,consent:true})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.error||'GPU Worker failed');}
    const blob=await r.blob();if(blob.type!=='video/mp4')throw Error('فرمت پاسخ Worker معتبر نیست.');
    if(gpuVideoUrl)URL.revokeObjectURL(gpuVideoUrl);gpuVideoUrl=URL.createObjectURL(blob);
    $('gpuVideo').src=gpuVideoUrl;$('gpuVideo').classList.remove('hidden');$('gpuDownload').href=gpuVideoUrl;$('gpuDownload').classList.remove('hidden');$('gpuStatus').textContent='ویدیوی واقعی آماده است.';
  }catch(e){$('gpuStatus').textContent='ساخت ویدیو انجام نشد: '+e.message;}
  finally{updateGpuButton();}
});
$('micBtn').addEventListener('click',async()=>{
  resumeIfPaused();stopEverything();if(!navigator.mediaDevices?.getUserMedia){setStatus('دسترسی میکروفون فقط روی HTTPS یا localhost فعال است.');return;}
  try {micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});const meter=await getAudio();sourceNode=audioContext.createMediaStreamSource(micStream);sourceNode.connect(meter);setState('listening');$('voiceStatus').textContent='میکروفون فعال — صدای محیط';}
  catch{stopMedia();setState('idle');setStatus('اجازه دسترسی میکروفون داده نشد یا دستگاهی پیدا نشد.');}
});
$('pauseBtn').addEventListener('click',()=>{paused=!paused;if(paused){stopEverything();setState('paused');$('pauseBtn').textContent='▶ ادامه حرکت';}else{setState('idle');$('pauseBtn').textContent='⏸ توقف حرکت';}});
$('saveProfile').addEventListener('click',()=>{saveSettings();setStatus('تنظیمات حرکت ذخیره شد.');});
$('exportProfile').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'FEZI-AVATAR-1',profile},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='fezi-avatar-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);});
$('importProfile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file||file.size>50_000)return;try{const x=JSON.parse(await file.text());if(x.format!=='FEZI-AVATAR-1')throw Error();profile=validateProfile(x.profile);updateSliders();saveSettings();setStatus('تنظیمات وارد شد.');}catch{setStatus('فرمت فایل تنظیمات معتبر نیست.');}});
function render(now){
 const t=Math.max(0,now-startTime),dt=Math.min(0.1,(now-(render.last||now))/1000);render.last=now;
 const w=canvas.width,h=canvas.height;ctx.fillStyle='#3d3946';ctx.fillRect(0,0,w,h);
 const gradient=ctx.createRadialGradient(w*.5,h*.35,20,w*.5,h*.5,w*.75);gradient.addColorStop(0,'#746673');gradient.addColorStop(1,'#252b35');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(photo){
   let p=poseAt(t,profile.motion,state),ratio=Math.max(w/photoWidth,h/photoHeight);let pw=photoWidth*ratio,ph=photoHeight*ratio;
   const expand=1.045;pw*=expand;ph*=expand;
   ctx.save();ctx.translate(w/2+p.x,h/2+p.y);ctx.rotate(p.angle*Math.PI/180);ctx.scale(p.scale,p.scale);
   ctx.drawImage(photo,-pw/2,-ph/2,pw,ph);
   // Approximate calibrated face coordinates measured relative to the displayed, cropped photo.
   const mx=(profile.mouthX-.5)*pw,my=(profile.mouthY-.5)*ph;
   const eyeY=(profile.eyesY-.5)*ph,blink=blinkAmount(t,profile.blink&&state!=='paused');
   if(ttsActive){energy=.22+.42*Math.abs(Math.sin(t*.013))+.12*Math.sin(t*.029);}else if(analyser){const samples=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(samples);energy=normalizedAmplitude(samples);}else energy=0;
   displayEnergy=smoothEnergy(displayEnergy,energy);
   const mouth=mouthOpen({energy:displayEnergy,phase:state,time:t,gain:profile.lipGain});
   if(mouth>0.025){const mw=clamp(pw*.07,17,67),mh=clamp(mouth*ph*.065,3,48);const fade=ctx.createRadialGradient(mx,my,1,mx,my,mw*1.2);fade.addColorStop(0,'#221720de');fade.addColorStop(.54,'#6b3b4db6');fade.addColorStop(1,'#80576800');ctx.save();ctx.translate(mx,my);ctx.scale(1,Math.max(.15,mh/mw));ctx.translate(-mx,-my);ctx.fillStyle=fade;ctx.beginPath();ctx.ellipse(mx,my,mw,mw*.72,0,0,Math.PI*2);ctx.fill();ctx.restore();}
   if(blink>0.04){const ew=clamp(pw*.07,15,60),eh=clamp(blink*13,1,13);ctx.fillStyle=`rgba(45,33,42,${.52*blink})`;for(const x of [-pw*.12,pw*.12]){ctx.beginPath();ctx.ellipse(x,eyeY,ew,eh,0,0,Math.PI*2);ctx.fill();}}
   ctx.restore();
 }
 if(now-frameStart>=1000){$('fps').textContent=String(Math.round(frameCount*1000/(now-frameStart)));frameStart=now;frameCount=0;}frameCount++;
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
window.addEventListener('pagehide',()=>{stopEverything();if(objectUrl)URL.revokeObjectURL(objectUrl);});
