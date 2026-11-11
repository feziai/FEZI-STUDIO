// FEZI AGENT shared-room Arina player. All sessions follow one server timeline.
// Uses supplied storyboard images unless the administrator publishes verified 1080p MP4 clips.
const $=id=>document.getElementById(id);
const sceneTitle=$('sceneTitle'),desc=$('sceneDescription'),frame=$('stageFrame'),previous=$('stagePrevious');
const names={idle:['وقت گپ و گفت با آرینا','آرینا منتظر پیام‌های شماست'],reading:['در حال خواندن چت','به پیام‌های تازه نگاه می‌کند'],typing:['در حال نوشتن پاسخ','جواب آرینا به‌زودی در چت دیده می‌شود'],thinking:['داره فکر می‌کنه','بهترین جواب را پیدا می‌کند'],happy:['خوشحال و خندان','یک واکنش صمیمی به چت'],thanks:['تشکر از حمایت','مرسی که اینجایی!'],heart:['یک قلب برای شما','با عشق از بیننده‌ها تشکر می‌کند'],wink:['چشمک و لبخند','لحظه‌ای بامزه'],kiss:['بوس هوایی دوستانه','یک واکنش دوستانه'],return:['بازگشت به حالت عادی','در حال برگشت به چت']};
for(const key of ['dance','dance-freestyle','dance-rhythm','dance-cute','dance-sway','dance-pose','dance-iranian','dance-wave','dance-party','dance-elegant','dance-chill','dance-fun','dance-pop','dance-energetic'])names[key]=['اجرای رقص آرینا · ۶۰ ثانیه','همه بیننده‌ها همین اجرای مشترک را می‌بینند'];
let sequences={},scene=null,serverOffset=0,renderTimer=null,lastImage='',english=false,streaming=false,known=new Set(),pending=false,activeProposal=null,lastVideoScene=null;
const video=$('stageVideo'),music=$('bgMusic');let musicEnabled=false;
// User-edited reverse loop is a separate original clip; never alter its playback rate.
names['dance-sway']=['رقص آرام آرینا · حدود یک دقیقه','رقص ملایم با کات طبیعی و بدون افکت نور'];
names['dance-chill']=['رقص آرام آرینا · حدود یک دقیقه','اتصال طبیعی و پیوستهٔ حرکت'];
let userNickname='Visitor';try{userNickname=localStorage.getItem('fezi-arina-nickname')||'Visitor'+Math.floor(Math.random()*900+100);localStorage.setItem('fezi-arina-nickname',userNickname)}catch{}
const now=()=>Date.now()+serverOffset;
const frameFor=(motion,index)=>{const list=sequences[motion]||sequences.dance||sequences.idle||[];return list.length?list[index%list.length]:null};
function setLabels(motion){const display=names[motion]||names.idle;$('movementLabel').textContent=motion.replaceAll('-',' ').toUpperCase();$('movementHint').textContent='اتاق مشترک · '+(scene?.mode==='video'?'ویدیوی واقعی':'پیش‌نمایش ثابت');sceneTitle.textContent=display[0];desc.textContent=display[1];}
function showImage(src){if(!src||src===lastImage)return;previous.src=frame.src;previous.style.opacity='1';frame.style.opacity='0';frame.src=src;lastImage=src;requestAnimationFrame(()=>{frame.style.opacity='1';previous.style.opacity='0';});}
// The station is selected by the server for every viewer; the audio mute button
// controls *only this device*. Paid or earned switches must be approved server-side.
let actualMusicVolume=0,selectedRadio='zeno',fallbackCount=0,radioWatchdog=null;
let radioStations=[],radioState=null,radioWallet=null,radioLoaded=false;
const radioSelect=$('radioStation');
const stationFor=id=>radioStations.find(s=>s.id===id)||radioStations[0]||{id:'zeno',name:'Zeno FM',src:'https://stream.zeno.fm/ak8z3nnzq8rvv',site:'https://zeno.fm/'};
const isLiveRadio=id=>!stationFor(id).local;
function radioNotice(message){const el=$('musicNotice');if(el)el.textContent=message;}
function radioSiteLink(){const link=$('radioStationLink');if(!link)return;link.href=stationFor(selectedRadio).site||'https://loveradio.app/';link.textContent='صفحهٔ ایستگاه ↗';}
function stopWatchdog(){if(radioWatchdog){clearTimeout(radioWatchdog);radioWatchdog=null;}}
function radioWalletLabel(){if(!radioWallet)return;const summary=`🎟 ${radioWallet.tokens} ژتون · ${radioWallet.remainingSwitches} بار تغییر · تا ژتون بعدی ${Math.ceil(radioWallet.nextTokenInMs/60000)} دقیقه`;for(const id of ['radioWallet','radioWalletChat']){const el=$(id);if(el)el.textContent=summary;}}
function setRadioButton(){const btn=$('musicToggle');if(btn){btn.textContent=musicEnabled?'♫ توقف صدا':'♫ روشن‌کردن صدا';btn.setAttribute('aria-pressed',String(musicEnabled));}}
function selectRadio(id){
 selectedRadio=id;if(radioSelect)radioSelect.value=id;
 const station=stationFor(id);radioSiteLink();stopWatchdog();
 music.pause();
 if(location.protocol==='https:'&&station.httpOnly){radioNotice('ایستگاه فعلی HTTP است و روی این دستگاه با HTTPS پخش نمی‌شود.');return;}
 music.src=station.src;music.dataset.track=station.src;music.loop=!isLiveRadio(id);music.load();
 if(musicEnabled){
  music.play().catch(()=>radioNotice('این ایستگاه روی دستگاه شما پخش نشد. برای ادامه، دکمهٔ پخش را لمس کنید.'));
  radioWatchdog=setTimeout(()=>{if(musicEnabled&&music.readyState<2)radioNotice('اتصال این ایستگاه کند یا قطع است؛ انتخاب رادیو همچنان برای همه مشترک می‌ماند.')},12000);
 }
 setRadioButton();
 radioNotice('رادیوی مشترک آرینا · '+station.name+(musicEnabled?'':' · برای شنیدن دکمهٔ پخش را بزنید'));
}
function renderRadioChoices(){
 const root=$('radioChoices');if(!root)return;root.replaceChildren();
 for(const station of radioStations){
  const btn=document.createElement('button');btn.type='button';btn.textContent=(station.id===selectedRadio?'◉ ':'♫ ')+station.name;
  btn.className=station.id===selectedRadio?'is-current':'';
  if(station.httpOnly&&location.protocol==='https:'){btn.disabled=true;btn.title='روی HTTPS قابل پخش نیست'}
  btn.addEventListener('click',()=>requestSwitch(station.id));root.append(btn);
 }
}
function applyRadio(data){
 if(!data)return;
 const r=data.radio||data;
 if(!r?.stationId)return;
 if(Array.isArray(r.stations)&&r.stations.length){
  radioStations=r.stations;
  if(radioSelect){radioSelect.replaceChildren();for(const item of radioStations){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.name+(item.httpOnly?' ⚠':'' );radioSelect.append(opt)}}
 }
 const changed=selectedRadio!==r.stationId || !radioLoaded;
 radioState=r;radioLoaded=true;
 if(changed)selectRadio(r.stationId);
 renderRadioChoices();
 if(data.wallet){radioWallet=data.wallet;radioWalletLabel();}
}
async function requestSwitch(id){
 if(!radioLoaded)return radioNotice('در حال دریافت وضعیت رادیوی مشترک…');
 const previous=selectedRadio;
 if(id===previous)return;
 try{
  const res=await fetch('/api/arina/radio/switch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({stationId:id})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'اجازهٔ تغییر رادیو وجود ندارد');
  applyRadio(data);
  radioNotice('آرینا و همهٔ بینندگان: '+stationFor(selectedRadio).name);
 }catch(e){if(radioSelect)radioSelect.value=previous;radioNotice('تغییر انجام نشد: '+e.message)}
}
radioSelect?.addEventListener('change',()=>requestSwitch(radioSelect.value));
$('radioNext')?.addEventListener('click',()=>{
 const eligible=radioStations.filter(s=>!(location.protocol==='https:'&&s.httpOnly));
 const n=eligible.findIndex(s=>s.id===selectedRadio);if(eligible.length)requestSwitch(eligible[(n+1)%eligible.length].id);
});
$('radioCountryBrowse')?.addEventListener('click',()=>window.open('https://loveradio.app/','_blank','noopener,noreferrer'));
$('musicToggle')?.addEventListener('click',()=>{
 musicEnabled=!musicEnabled;
 if(musicEnabled){if(radioLoaded)selectRadio(selectedRadio);else radioNotice('در حال اتصال به رادیو…');}
 else{stopWatchdog();music.pause();setRadioButton();radioNotice('صدای رادیو فقط روی دستگاه شما قطع شد.');}
});
music?.addEventListener('error',()=>{if(musicEnabled)radioNotice('این ایستگاه فعلاً روی دستگاه شما در دسترس نیست؛ انتخاب رادیوی جمع تغییر نکرد.')});
music?.addEventListener('playing',()=>{stopWatchdog();radioNotice('♪ در حال پخش برای شما: '+stationFor(selectedRadio).name)});
function updateMusic(){
 if(!music)return;
 video.muted=true;video.volume=0;
 if(!radioLoaded)return;
 if(music.dataset.track!==stationFor(selectedRadio).src){selectRadio(selectedRadio);return;}
 if(musicEnabled&&music.paused)music.play().catch(()=>{});
 setRadioButton();
}
setInterval(()=>{if(!music)return;const dancing=scene?.motion?.startsWith('dance')&&scene?.mode==='video';const target=musicEnabled?(dancing?0.45:scene?.motion==='idle'?0.22:0.11):0;actualMusicVolume+=(target-actualMusicVolume)*0.16;music.volume=Math.max(0,Math.min(1,actualMusicVolume));},150);
async function radioHeartbeat(){
 if(document.hidden||!streaming)return;
 try{const res=await fetch('/api/arina/radio/heartbeat',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(!res.ok)return;radioWallet=await res.json();radioWalletLabel();}catch{}
}
setInterval(radioHeartbeat,30000);
fetch('/api/arina/radio').then(r=>r.ok?r.json():null).then(applyRadio).catch(()=>{});
function acceptScene(next,remoteNow){if(!next||!next.id)return;if(Number.isFinite(remoteNow))serverOffset=remoteNow-Date.now();const changed=next.id!==scene?.id;scene=next;if(changed){setLabels(scene.motion);updateMusic()};if(scene.mode==='video'&&scene.video?.startsWith('/arina-live/assets/video/')){
  frame.hidden=true;previous.hidden=true;video.hidden=false;
  const src=scene.video;if(video.dataset.clip!==src){video.dataset.clip=src;video.src=src;video.load()}lastVideoScene=scene.id;
  const position=Math.max(0,(now()-scene.startedAt)/1000);video.loop=scene.motion!=='typing';const syncTarget=video.loop&&Number.isFinite(video.duration)&&video.duration>0?position%video.duration:position;if(video.readyState>=1&&Math.abs(video.currentTime-syncTarget)>1.75)try{video.currentTime=syncTarget}catch{}
  video.play().catch(()=>{$('musicNotice').textContent='برای شروع ویدیو یک‌بار صفحه را لمس کنید.'});
  $('qualityLabel').textContent='شخصیت مجازی · ویدیوی ضبط‌شده و تکرارشونده';
}else{video.pause();video.hidden=true;frame.hidden=false;previous.hidden=true;frame.src='/arina-live/assets/arina-master.webp';$('qualityLabel').textContent='تصویر مرجع؛ ویدیوی AI هنوز تولید نشده'}render();}
function render(){
 if(!scene)return;
 frame.classList.remove('arina-rest-motion');
 if(scene.mode==='video'){
  const t=Math.max(0,(now()-scene.startedAt)/1000),target=video.loop&&Number.isFinite(video.duration)&&video.duration>0?t%video.duration:t;
  if(video.readyState>=2&&Math.abs(video.currentTime-target)>1.75)try{video.currentTime=target}catch{}
 }
}

function setPresence(value){$('viewerCount').textContent=Number.isInteger(value)?value:'—';$('roomHint').textContent=value>1?'درخواست حرکت با رأی‌گیری جمعی اجرا می‌شود':'با پیام خودت درخواست حرکت بده';}
function setProposal(p){activeProposal=p;$('votePanel').hidden=!p;if(!p)return;$('voteTitle').textContent='آرینا برقصه؟ · '+p.motion.replaceAll('dance-','');$('voteDetail').textContent=`${p.yes} موافق · ${p.no} مخالف · حداقل ${p.required} رأی مثبت لازم است`;}
async function vote(choice){if(!activeProposal)return;try{const res=await fetch('/api/arina/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposalId:activeProposal.id,vote:choice})});if(!res.ok)throw Error('رأی‌گیری تمام شده است');}catch(e){$('voteDetail').textContent=e.message}}
$('voteYes').addEventListener('click',()=>vote('yes'));$('voteNo').addEventListener('click',()=>vote('no'));
$('fullScreen').addEventListener('click',()=>{const el=$('stage');if(document.fullscreenElement)document.exitFullscreen?.();else el.requestFullscreen?.()});
$('langToggle').addEventListener('click',()=>{english=!english;document.documentElement.lang=english?'en':'fa';for(const el of document.querySelectorAll('[data-fa][data-en]'))el.textContent=el.dataset[english?'en':'fa'];$('chatInput').placeholder=english?'Type a message or request...':'در چت پیام بده یا درخواستت را بنویس...'});
function safeTime(v){try{return new Date(v).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}catch{return ''}}
function addMessage(item){if(!item?.id||known.has(item.id))return;known.add(item.id);if(known.size>400)known.clear();const msg=document.createElement('div');msg.className='message '+(item.kind==='arina'?'from-arina':'from-viewer');const pic=document.createElement('div');pic.className='message-avatar';if(item.kind==='arina'){const img=document.createElement('img');img.src='/arina-live/assets/arina-master.webp';img.alt='Arina';pic.append(img)}else pic.textContent=String(item.name||'V').slice(0,1).toUpperCase();const content=document.createElement('div'),meta=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small'),bubble=document.createElement('div');meta.className='message-meta';name.textContent=item.kind==='arina'?'Arina · AI':item.kind==='system'?'Room':item.name||'Visitor';time.textContent=safeTime(item.timestamp);bubble.className='bubble';bubble.textContent=item.text||'';if(Array.isArray(item.attachments)){const group=document.createElement('div');group.className='message-attachments';for(const attachment of item.attachments.slice(0,6)){if(!/^[a-f0-9]{32}$/.test(attachment?.id||''))continue;const link=document.createElement('a');link.className='message-attachment';link.href='/api/arina/attachments/'+attachment.id;link.download=String(attachment.name||'attachment');link.rel='noopener';if(String(attachment.type||'').startsWith('image/')){const image=document.createElement('img');image.loading='lazy';image.src=link.href;image.alt=attachment.name||'Image';link.append(image)}else if(String(attachment.type||'').startsWith('video/')){const video=document.createElement('video');video.controls=true;video.preload='none';video.src=link.href;link.append(video)}else if(String(attachment.type||'').startsWith('audio/')){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=link.href;link.append(audio)}const label=document.createElement('span');label.textContent='⬇ '+String(attachment.name||'File').slice(0,90);link.append(label);group.append(link)}bubble.append(group)}meta.append(name,time);content.append(meta,bubble);msg.append(pic,content);$('chatMessages').append(msg);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
async function postMessage(text,attachments=[]){if(pending)return;text=String(text||'').trim();if(!text&&!attachments.length)return;pending=true;$('sendMessage').disabled=true;try{const r=await fetch('/api/arina/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text||'📎 پیوست ارسال شد (محتوای آن به‌طور خودکار تحلیل نمی‌شود).',nickname:userNickname,attachments})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');$('chatInput').value='';if(!streaming){await refresh()}$('chatFootnote').textContent=data.ai?'پاسخ متنی AI فعال است.':data.action?.kind==='video-unavailable'?'این رقص فقط بعد از ساخت و تأیید ویدیوی واقعی اجرا می‌شود.':'پاسخ نمایشی؛ برای هوش مصنوعی واقعی مدل سرور را متصل کنید.';}catch(e){$('chatFootnote').textContent='خطا: '+e.message;return false;}finally{pending=false;$('sendMessage').disabled=false;$('chatInput').focus()}return true}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();if(window.feziArinaMedia?.submit)window.feziArinaMedia.submit(postMessage);else postMessage($('chatInput').value)});
for(const btn of document.querySelectorAll('[data-suggest]'))btn.addEventListener('click',()=>postMessage(btn.dataset.suggest));
async function refresh(){const r=await fetch('/api/arina/status');if(!r.ok)throw Error('Offline');const data=await r.json();if(data.now)serverOffset=data.now-Date.now();setPresence(data.viewers);setProposal(data.proposal);applyRadio(data.radio);acceptScene(data.scene,data.now);for(const msg of data.messages||[])addMessage(msg);$('connectionLabel').textContent=data.aiEnabled?'چت با موتور AI متصل':'چت متصل · پاسخ‌های نمایشی';$('chatFootnote').textContent=data.aiEnabled?'پاسخ‌ها با AI تولید می‌شوند.':'گفت‌وگو در حالت دمو است؛ چت واقعی نیازمند مدل فعال است.'}
async function connect(){try{await refresh();renderTimer=setInterval(render,500);if(typeof EventSource!=='undefined'){
const feed=new EventSource('/api/arina/stream');feed.onopen=()=>{streaming=true;$('connectionDot').style.background='#27cf91'};feed.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='snapshot'){setPresence(data.viewers);setProposal(data.proposal);applyRadio(data.radio);acceptScene(data.scene,data.now);for(const msg of data.messages||[])addMessage(msg)}else if(data.type==='message')addMessage(data.message);else if(data.type==='scene')acceptScene(data.scene,data.now);else if(data.type==='presence')setPresence(data.viewers);else if(data.type==='radio')applyRadio(data.radio);else if(data.type==='proposal')setProposal(data.proposal)}catch(err){console.warn(err)}};feed.onerror=()=>{streaming=false;$('connectionDot').style.background='#f0aa52';$('connectionLabel').textContent='در حال اتصال مجدد…'};}
// Heartbeat can also reconcile with HTTP after transient reverse-proxy errors.
setInterval(()=>refresh().catch(()=>{}),30000);
}catch(err){$('connectionLabel').textContent='در حال حاضر اتصال در دسترس نیست';console.error(err)}}
try { const pendingArinaText=sessionStorage.getItem('arina-pending-text'); if(pendingArinaText){$('chatInput').value=pendingArinaText.slice(0,600); sessionStorage.removeItem('arina-pending-text');} } catch {}
connect();

// Muted video may autoplay; music starts after a user gesture.
video.muted=true;
// Browsers that block autoplay can unlock muted video on the first gesture.
// Never auto-start background music while the avatar is quietly waiting.
document.addEventListener('pointerdown',()=>{if(!video.hidden&&video.paused)video.play().catch(()=>{})},{once:true});

// Recover video after intermittent mobile buffering or a background-tab resume.
video.addEventListener('stalled',()=>{ if(!video.hidden&&video.paused) video.play().catch(()=>{}); });
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden && !video.hidden){render();video.play().catch(()=>{});}
});
// One station clock, independent of video loops and chat scenes.
function syncRadio(){if(isLiveRadio(selectedRadio)||!musicEnabled||!Number.isFinite(music.duration)||music.duration<=0)return;const t=((now()-(radioState?.changedAt||0))/1000)%music.duration;if(Math.abs(music.currentTime-t)>2)music.currentTime=t;}
music.addEventListener('loadedmetadata',syncRadio);music.addEventListener('play',syncRadio);setInterval(syncRadio,15000);
